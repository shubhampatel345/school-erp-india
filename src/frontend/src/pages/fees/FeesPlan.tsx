import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useApp } from "../../context/AppContext";
import type { ClassSection, FeeHeading, FeesPlan } from "../../types";
import { CLASSES, generateId } from "../../utils/localStorage";

function safeArray<T>(v: T[] | string | undefined): T[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v) {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default function FeesPlanPage() {
  const {
    getData,
    saveData,
    updateData,
    deleteData,
    currentUser,
    isReadOnly,
    addNotification,
  } = useApp();

  const [selectedClass, setSelectedClass] = useState<string>("");
  const [editValues, setEditValues] = useState<
    Record<string, Record<string, string>>
  >({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Allow superadmin, admin, and accountant to edit fee plans
  const canEdit =
    currentUser?.role === "superadmin" ||
    currentUser?.role === "admin" ||
    currentUser?.role === "accountant";

  // Read from context (already loaded from server)
  const rawHeadings = getData("feeHeadings") as FeeHeading[];
  const headings = rawHeadings.map((h) => ({
    ...h,
    months: safeArray<string>(h.months as unknown as string[]),
    applicableClasses: h.applicableClasses
      ? safeArray<string>(h.applicableClasses as unknown as string[])
      : undefined,
  }));

  const plans = getData("feesPlans") as FeesPlan[];

  // Class sections: prefer context/server using "classes" collection (same as other modules)
  const classSections: ClassSection[] = (() => {
    const cs = getData("classes") as ClassSection[];
    if (cs.length > 0) return cs;
    return CLASSES.map((c) => ({
      id: c,
      className: c,
      sections: ["A", "B", "C"],
    }));
  })();

  // When class changes, initialize edit values from existing plans
  useEffect(() => {
    if (!selectedClass || headings.length === 0) return;
    const cs = classSections.find(
      (c) =>
        (c.className ?? (c as unknown as { name?: string }).name ?? "") ===
        selectedClass,
    );
    if (!cs) return;

    const applicableHeadings = headings.filter(
      (h) =>
        !h.applicableClasses ||
        h.applicableClasses.length === 0 ||
        h.applicableClasses.includes(selectedClass),
    );

    const vals: Record<string, Record<string, string>> = {};
    const sectionList = safeArray<string>(cs.sections as unknown as string[]);
    for (const section of sectionList) {
      vals[section] = {};
      for (const heading of applicableHeadings) {
        const plan = plans.find(
          (p) =>
            p.classId === selectedClass &&
            p.sectionId === section &&
            p.headingId === heading.id,
        );
        vals[section][heading.id] = plan ? String(plan.amount) : "";
      }
    }
    setEditValues(vals);
    setSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, headings, plans, classSections]);

  function handleAmountChange(
    section: string,
    headingId: string,
    value: string,
  ) {
    if (!canEdit) return;
    setEditValues((prev) => ({
      ...prev,
      [section]: { ...prev[section], [headingId]: value },
    }));
  }

  async function handleSave() {
    if (!selectedClass || !canEdit) return;
    setSaving(true);
    const cs = classSections.find((c) => c.className === selectedClass);
    if (!cs) {
      setSaving(false);
      return;
    }

    const applicableHeadings = headings.filter(
      (h) =>
        !h.applicableClasses ||
        h.applicableClasses.length === 0 ||
        h.applicableClasses.includes(selectedClass),
    );

    const sectionList = safeArray<string>(cs.sections as unknown as string[]);
    const savePromises: Promise<unknown>[] = [];

    for (const section of sectionList) {
      for (const heading of applicableHeadings) {
        const rawVal = editValues[section]?.[heading.id] ?? "";
        const amount = rawVal === "" ? 0 : Number(rawVal);
        const existingPlan = plans.find(
          (p) =>
            p.classId === selectedClass &&
            p.sectionId === section &&
            p.headingId === heading.id,
        );

        if (existingPlan) {
          if (amount > 0) {
            savePromises.push(
              updateData("feesPlans", existingPlan.id, { amount }),
            );
          } else {
            savePromises.push(deleteData("feesPlans", existingPlan.id));
          }
        } else if (amount > 0) {
          const newPlan: FeesPlan = {
            id: generateId(),
            classId: selectedClass,
            sectionId: section,
            headingId: heading.id,
            headingName: heading.name,
            amount,
          };
          savePromises.push(
            saveData(
              "feesPlans",
              newPlan as unknown as Record<string, unknown>,
            ),
          );
        }
      }
    }

    await Promise.allSettled(savePromises);
    setSaving(false);
    setSaved(true);
    addNotification(`Fee plan saved for Class ${selectedClass}`, "success");
    setTimeout(() => setSaved(false), 2500);
  }

  const activeSections = (() => {
    const cs = classSections.find(
      (c) =>
        (c.className ?? (c as unknown as { name?: string }).name ?? "") ===
        selectedClass,
    );
    if (!cs) return [];
    return safeArray<string>(cs.sections as unknown as string[]);
  })();

  const activeHeadings = selectedClass
    ? headings.filter(
        (h) =>
          !h.applicableClasses ||
          h.applicableClasses.length === 0 ||
          h.applicableClasses.includes(selectedClass),
      )
    : headings;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-foreground">Fees Plan</h3>
        <p className="text-sm text-muted-foreground">
          Set section-wise fee amounts per heading. Admin and above only.
        </p>
      </div>

      {headings.length === 0 ? (
        <div
          className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground"
          data-ocid="fees-plan.empty_state"
        >
          <p>
            No fee headings found. Add headings in "Fee Headings" tab first.
          </p>
        </div>
      ) : (
        <>
          {/* Class selector — show configured classes from context, fallback to static list */}
          <div className="flex gap-2 flex-wrap">
            {(classSections.length > 0
              ? classSections
                  .map(
                    (c) =>
                      (c.className ??
                        (c as unknown as { name?: string }).name ??
                        "") as string,
                  )
                  .filter(Boolean)
              : CLASSES
            ).map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => setSelectedClass(cls)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  selectedClass === cls
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border bg-card hover:bg-muted/50"
                }`}
                data-ocid="fees-plan-class-tab"
              >
                {cls}
              </button>
            ))}
          </div>

          {selectedClass && activeSections.length > 0 ? (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">
                    Class {selectedClass} — Section-wise Amounts
                  </h4>
                  {activeHeadings.length === 0 && (
                    <p className="text-sm text-amber-600 mt-0.5">
                      No fee headings configured for Class {selectedClass}.
                    </p>
                  )}
                </div>
                {canEdit && !isReadOnly && activeHeadings.length > 0 && (
                  <Button
                    onClick={() => void handleSave()}
                    disabled={saving}
                    variant={saved ? "outline" : "default"}
                    data-ocid="save-fees-plan-btn"
                  >
                    {saved ? "✓ Saved" : saving ? "Saving…" : "Save Plan"}
                  </Button>
                )}
              </div>

              {activeHeadings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">
                          Section
                        </th>
                        {activeHeadings.map((h) => (
                          <th
                            key={h.id}
                            className="px-3 py-3 text-center font-semibold min-w-[110px]"
                          >
                            {h.name}
                            <div className="text-xs text-muted-foreground font-normal">
                              ({h.months.length} months)
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeSections.map((section) => (
                        <tr
                          key={section}
                          className="border-t border-border hover:bg-muted/20"
                        >
                          <td className="px-4 py-3 font-semibold">
                            {selectedClass} - {section}
                          </td>
                          {activeHeadings.map((h) => (
                            <td key={h.id} className="px-3 py-2 text-center">
                              <div className="flex items-center gap-1 justify-center">
                                <span className="text-muted-foreground text-xs">
                                  ₹
                                </span>
                                <Input
                                  type="number"
                                  min="0"
                                  value={editValues[section]?.[h.id] ?? ""}
                                  onChange={(e) =>
                                    handleAmountChange(
                                      section,
                                      h.id,
                                      e.target.value,
                                    )
                                  }
                                  disabled={!canEdit || isReadOnly}
                                  className="h-8 text-center text-sm w-20"
                                  placeholder="0"
                                  data-ocid="fees-plan-amount-input"
                                />
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No fee headings apply to Class {selectedClass}.
                </div>
              )}

              {!canEdit && (
                <div className="p-3 bg-amber-50 border-t border-amber-200 text-amber-700 text-sm text-center">
                  Only Super Admin, Admin, or Accountant can edit fee amounts.
                </div>
              )}
            </div>
          ) : selectedClass ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
              No sections configured for Class {selectedClass}.
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
              Select a class above to view and edit fee amounts.
            </div>
          )}
        </>
      )}
    </div>
  );
}
