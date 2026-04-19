import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Skeleton } from "../../components/ui/skeleton";
import { useApp } from "../../context/AppContext";
import type { ClassSection, FeeHeading, FeesPlan } from "../../types";
import { dataService } from "../../utils/dataService";
import { CLASSES, generateId, ls } from "../../utils/localStorage";

export default function FeesPlanPage() {
  const { currentUser, isReadOnly } = useApp();
  const [classSections, setClassSections] = useState<ClassSection[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [editValues, setEditValues] = useState<
    Record<string, Record<string, string>>
  >({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingHeadings, setLoadingHeadings] = useState(true);
  const [headings, setHeadings] = useState<FeeHeading[]>([]);
  const [plans, setPlans] = useState<FeesPlan[]>([]);

  const isSuperAdmin = currentUser?.role === "superadmin";

  // ── Fetch headings and plans from server on mount ──────────────────────────
  useEffect(() => {
    async function loadData() {
      setLoadingHeadings(true);
      try {
        // Load in parallel
        const [fetchedHeadings, fetchedPlans] = await Promise.all([
          dataService.getAsync<FeeHeading>("fee_headings"),
          dataService.getAsync<FeesPlan>("fees_plan"),
        ]);

        // If fee_headings is empty, try fee_heads alias
        if (fetchedHeadings.length === 0) {
          const alt = await dataService.getAsync<FeeHeading>("fee_heads");
          setHeadings(alt);
        } else {
          setHeadings(fetchedHeadings);
        }
        setPlans(fetchedPlans);
      } catch {
        // Fall back to cached data
        setHeadings(dataService.get<FeeHeading>("fee_headings"));
        setPlans(dataService.get<FeesPlan>("fees_plan"));
      } finally {
        setLoadingHeadings(false);
      }

      // Load class sections
      const cs = ls.get<ClassSection[]>("class_sections", []);
      if (cs.length > 0) {
        setClassSections(cs);
      } else {
        const built: ClassSection[] = CLASSES.map((c) => ({
          id: c,
          className: c,
          sections: ["A", "B", "C"],
        }));
        setClassSections(built);
      }
    }
    void loadData();
  }, []);

  // When class changes, initialize edit values from plans
  useEffect(() => {
    if (!selectedClass || headings.length === 0) return;
    const cs = classSections.find((c) => c.className === selectedClass);
    if (!cs) return;

    // Normalize months field — may be JSON string from MySQL
    const normalizeHeading = (h: FeeHeading): FeeHeading => ({
      ...h,
      months: Array.isArray(h.months)
        ? h.months
        : typeof h.months === "string"
          ? (() => {
              try {
                return JSON.parse(h.months as unknown as string);
              } catch {
                return [];
              }
            })()
          : [],
      applicableClasses: Array.isArray(h.applicableClasses)
        ? h.applicableClasses
        : typeof h.applicableClasses === "string" && h.applicableClasses
          ? (() => {
              try {
                return JSON.parse(h.applicableClasses as unknown as string);
              } catch {
                return [];
              }
            })()
          : undefined,
    });

    const normalizedHeadings = headings.map(normalizeHeading);

    // Filter headings applicable to this class
    const applicableHeadings = normalizedHeadings.filter(
      (h) =>
        !h.applicableClasses ||
        h.applicableClasses.length === 0 ||
        h.applicableClasses.includes(selectedClass),
    );

    const vals: Record<string, Record<string, string>> = {};
    for (const section of cs.sections) {
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
  }, [selectedClass, headings, plans, classSections]);

  function handleAmountChange(
    section: string,
    headingId: string,
    value: string,
  ) {
    if (!isSuperAdmin) return;
    setEditValues((prev) => ({
      ...prev,
      [section]: { ...prev[section], [headingId]: value },
    }));
  }

  async function handleSave() {
    if (!selectedClass || !isSuperAdmin) return;
    setSaving(true);
    const cs = classSections.find((c) => c.className === selectedClass);
    if (!cs) {
      setSaving(false);
      return;
    }

    // Normalize headings for comparison
    const normalizeHeading = (h: FeeHeading): FeeHeading => ({
      ...h,
      months: Array.isArray(h.months) ? h.months : [],
      applicableClasses: Array.isArray(h.applicableClasses)
        ? h.applicableClasses
        : typeof h.applicableClasses === "string" && h.applicableClasses
          ? (() => {
              try {
                return JSON.parse(h.applicableClasses as unknown as string);
              } catch {
                return [];
              }
            })()
          : undefined,
    });

    const applicableHeadings = headings
      .map(normalizeHeading)
      .filter(
        (h) =>
          !h.applicableClasses ||
          h.applicableClasses.length === 0 ||
          h.applicableClasses.includes(selectedClass),
      );

    let allPlans = ls.get<FeesPlan[]>("fees_plan", []);
    const savePromises: Promise<unknown>[] = [];

    for (const section of cs.sections) {
      for (const heading of applicableHeadings) {
        const rawVal = editValues[section]?.[heading.id] ?? "";
        const amount = rawVal === "" ? 0 : Number(rawVal);
        const existingIdx = allPlans.findIndex(
          (p) =>
            p.classId === selectedClass &&
            p.sectionId === section &&
            p.headingId === heading.id,
        );
        if (existingIdx >= 0) {
          if (amount > 0) {
            const updated = { ...allPlans[existingIdx], amount };
            allPlans[existingIdx] = updated;
            savePromises.push(
              dataService.update(
                "fees_plan",
                updated.id,
                updated as unknown as Record<string, unknown>,
              ),
            );
          } else {
            const id = allPlans[existingIdx].id;
            allPlans.splice(existingIdx, 1);
            savePromises.push(dataService.delete("fees_plan", id));
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
          allPlans.push(newPlan);
          savePromises.push(
            dataService.save(
              "fees_plan",
              newPlan as unknown as Record<string, unknown>,
            ),
          );
        }
      }
    }

    ls.set("fees_plan", allPlans);

    // Await all server saves (not fire-and-forget)
    await Promise.allSettled(savePromises);

    // Re-fetch plans from server to confirm saved state
    const freshPlans = await dataService.getAsync<FeesPlan>("fees_plan");
    setPlans(freshPlans);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const activeSections =
    classSections.find((c) => c.className === selectedClass)?.sections ?? [];

  // Normalize headings for display
  const normalizeHeading = (h: FeeHeading): FeeHeading => ({
    ...h,
    months: Array.isArray(h.months) ? h.months : [],
    applicableClasses: Array.isArray(h.applicableClasses)
      ? h.applicableClasses
      : typeof h.applicableClasses === "string" && h.applicableClasses
        ? (() => {
            try {
              return JSON.parse(h.applicableClasses as unknown as string);
            } catch {
              return [];
            }
          })()
        : undefined,
  });

  // Filter headings applicable to selected class
  const activeHeadings = selectedClass
    ? headings
        .map(normalizeHeading)
        .filter(
          (h) =>
            !h.applicableClasses ||
            h.applicableClasses.length === 0 ||
            h.applicableClasses.includes(selectedClass),
        )
    : headings.map(normalizeHeading);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-foreground">Fees Plan</h3>
        <p className="text-sm text-muted-foreground">
          Set section-wise fee amounts per heading. Super Admin only.
        </p>
      </div>

      {loadingHeadings ? (
        <div className="bg-card border border-border rounded-xl p-6 space-y-3">
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-lg" />
            ))}
          </div>
        </div>
      ) : headings.length === 0 ? (
        <div
          className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground"
          data-ocid="fees-plan.empty_state"
        >
          <p>No fee headings found. Add headings in "Fee Heading" tab first.</p>
        </div>
      ) : (
        <>
          {/* Class selector */}
          <div className="flex gap-2 flex-wrap">
            {CLASSES.map((cls) => (
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
                Class {cls}
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
                      No fee headings configured for Class {selectedClass}. Add
                      applicable headings in Fee Heading tab.
                    </p>
                  )}
                </div>
                {isSuperAdmin && !isReadOnly && activeHeadings.length > 0 && (
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
                                  disabled={!isSuperAdmin || isReadOnly}
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

              {!isSuperAdmin && (
                <div className="p-3 bg-amber-50 border-t border-amber-200 text-amber-700 text-sm text-center">
                  Only Super Admin can edit fee amounts.
                </div>
              )}
            </div>
          ) : selectedClass ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
              No sections configured for Class {selectedClass}.
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
              Select a class to view/edit fee amounts.
            </div>
          )}
        </>
      )}
    </div>
  );
}
