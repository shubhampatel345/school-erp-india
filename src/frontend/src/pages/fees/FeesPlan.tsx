/**
 * FeesPlan.tsx — Class-wise, section-wise fee plans
 *
 * Collection key: "fees_plan" (matches server MySQL table)
 * Amounts stored as JSON: {"Apr":1000,"May":1000,...}
 * Each plan row: classId + sectionId + headingId → amounts per month
 *
 * CRITICAL: input fields MUST be editable (not readonly).
 */
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useApp } from "../../context/AppContext";
import type { ClassSection, FeeHeading, FeesPlan } from "../../types";
import { CLASS_ORDER } from "../../types";
import { CLASSES, MONTHS, generateId } from "../../utils/localStorage";

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

/** Parse the amounts field which may be a JSON string or an object */
function parseAmounts(amounts: unknown): Record<string, number> {
  if (!amounts) return {};
  if (typeof amounts === "object" && !Array.isArray(amounts)) {
    return amounts as Record<string, number>;
  }
  if (typeof amounts === "string" && amounts) {
    try {
      const p = JSON.parse(amounts);
      if (typeof p === "object" && !Array.isArray(p))
        return p as Record<string, number>;
    } catch {
      // ignore
    }
  }
  return {};
}

const MONTH_SHORT: Record<string, string> = {
  April: "Apr",
  May: "May",
  June: "Jun",
  July: "Jul",
  August: "Aug",
  September: "Sep",
  October: "Oct",
  November: "Nov",
  December: "Dec",
  January: "Jan",
  February: "Feb",
  March: "Mar",
};

export default function FeesPlanPage() {
  const {
    getData,
    saveData,
    updateData,
    currentUser,
    isReadOnly,
    currentSession,
    addNotification,
  } = useApp();

  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  // editValues[headingId][month] = amount string
  const [editValues, setEditValues] = useState<
    Record<string, Record<string, string>>
  >({});
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const canEdit =
    currentUser?.role === "superadmin" ||
    currentUser?.role === "admin" ||
    currentUser?.role === "accountant";

  // Load from context — collection keys match server
  const rawHeadings = getData("fee_headings") as FeeHeading[];
  const headings = rawHeadings
    .map((h) => ({
      ...h,
      months: safeArray<string>(h.months as unknown as string[]),
    }))
    .filter((h) => h.isActive !== false)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  const plans = getData("fees_plan") as FeesPlan[];

  // Class list from context, sorted by CLASS_ORDER
  const classSections: ClassSection[] = useMemo(() => {
    const cs = getData("classes") as ClassSection[];
    if (cs.length > 0) {
      return [...cs].sort((a, b) => {
        const an =
          a.className ?? (a as unknown as { name?: string }).name ?? "";
        const bn =
          b.className ?? (b as unknown as { name?: string }).name ?? "";
        const ai = CLASS_ORDER.indexOf(an);
        const bi = CLASS_ORDER.indexOf(bn);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });
    }
    return CLASSES.map((c) => ({
      id: c,
      className: c,
      sections: ["A", "B", "C"],
    }));
  }, [getData]);

  const classNames = classSections
    .map((c) => c.className ?? (c as unknown as { name?: string }).name ?? "")
    .filter(Boolean);

  const activeSections: string[] = useMemo(() => {
    const cs = classSections.find(
      (c) =>
        (c.className ?? (c as unknown as { name?: string }).name ?? "") ===
        selectedClass,
    );
    if (!cs) return [];
    return safeArray<string>(cs.sections as unknown as string[]);
  }, [classSections, selectedClass]);

  // Headings applicable to selected class
  const activeHeadings = useMemo(() => {
    if (!selectedClass) return headings;
    return headings.filter(
      (h) =>
        !h.applicableClasses ||
        h.applicableClasses.length === 0 ||
        safeArray<string>(h.applicableClasses as unknown as string[]).includes(
          selectedClass,
        ),
    );
  }, [headings, selectedClass]);

  // When class or section changes, load existing plan amounts into editValues
  useEffect(() => {
    if (!selectedClass || !selectedSection || activeHeadings.length === 0) {
      setEditValues({});
      return;
    }

    const vals: Record<string, Record<string, string>> = {};
    for (const heading of activeHeadings) {
      vals[heading.id] = {};
      const plan = plans.find(
        (p) =>
          (p.classId === selectedClass ||
            (p as unknown as Record<string, string>).className ===
              selectedClass) &&
          (p.sectionId === selectedSection ||
            (p as unknown as Record<string, string>).sectionName ===
              selectedSection) &&
          p.headingId === heading.id,
      );

      const headingMonths = heading.months;
      for (const month of MONTHS) {
        if (!headingMonths.includes(month)) continue;
        const short = MONTH_SHORT[month] ?? month.slice(0, 3);
        if (plan?.amounts) {
          const amts = parseAmounts(plan.amounts);
          vals[heading.id][short] =
            amts[short] !== undefined ? String(amts[short]) : "";
        } else if (plan?.amount) {
          vals[heading.id][short] = String(plan.amount);
        } else {
          vals[heading.id][short] = "";
        }
      }
    }
    setEditValues(vals);
    setSavedMsg("");
  }, [selectedClass, selectedSection, activeHeadings, plans]);

  // Auto-select first section when class changes
  useEffect(() => {
    if (activeSections.length > 0) {
      setSelectedSection(activeSections[0]);
    } else {
      setSelectedSection("");
    }
  }, [activeSections]);

  function handleAmountChange(
    headingId: string,
    monthShort: string,
    value: string,
  ) {
    if (!canEdit) return;
    setEditValues((prev) => ({
      ...prev,
      [headingId]: {
        ...prev[headingId],
        [monthShort]: value,
      },
    }));
    setSavedMsg("");
  }

  /** Copy amounts from one section to all other sections of the same class */
  async function copyToAllSections() {
    if (!selectedClass || !selectedSection || !canEdit) return;
    const otherSections = activeSections.filter((s) => s !== selectedSection);
    if (otherSections.length === 0) return;
    if (
      !confirm(
        `Copy amounts from Section ${selectedSection} to sections: ${otherSections.join(", ")}?`,
      )
    )
      return;

    setSaving(true);
    try {
      for (const section of otherSections) {
        for (const heading of activeHeadings) {
          const amounts: Record<string, number> = {};
          let hasAny = false;
          for (const month of MONTHS) {
            if (!heading.months.includes(month)) continue;
            const short = MONTH_SHORT[month] ?? month.slice(0, 3);
            const val = Number(editValues[heading.id]?.[short] ?? 0);
            if (val > 0) {
              amounts[short] = val;
              hasAny = true;
            }
          }
          if (!hasAny) continue;

          const existing = plans.find(
            (p) =>
              (p.classId === selectedClass ||
                (p as unknown as Record<string, string>).className ===
                  selectedClass) &&
              (p.sectionId === section ||
                (p as unknown as Record<string, string>).sectionName ===
                  section) &&
              p.headingId === heading.id,
          );

          const planData = {
            classId: selectedClass,
            sectionId: section,
            className: selectedClass,
            sectionName: section,
            headingId: heading.id,
            headingName: heading.name,
            amounts,
            amount: Object.values(amounts)[0] ?? 0,
            sessionId: currentSession?.id ?? "",
          };

          if (existing) {
            await updateData("fees_plan", existing.id, planData);
          } else {
            await saveData("fees_plan", {
              id: generateId(),
              ...planData,
            } as unknown as Record<string, unknown>);
          }
        }
      }
      addNotification(
        `Amounts copied to all sections of Class ${selectedClass}`,
        "success",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!selectedClass || !selectedSection || !canEdit) return;
    setSaving(true);
    const saves: Promise<unknown>[] = [];

    for (const heading of activeHeadings) {
      const amounts: Record<string, number> = {};
      let hasAny = false;

      for (const month of MONTHS) {
        if (!heading.months.includes(month)) continue;
        const short = MONTH_SHORT[month] ?? month.slice(0, 3);
        const val = Number(editValues[heading.id]?.[short] ?? 0);
        if (val > 0) {
          amounts[short] = val;
          hasAny = true;
        }
      }

      const existing = plans.find(
        (p) =>
          (p.classId === selectedClass ||
            (p as unknown as Record<string, string>).className ===
              selectedClass) &&
          (p.sectionId === selectedSection ||
            (p as unknown as Record<string, string>).sectionName ===
              selectedSection) &&
          p.headingId === heading.id,
      );

      const planData = {
        classId: selectedClass,
        sectionId: selectedSection,
        className: selectedClass,
        sectionName: selectedSection,
        headingId: heading.id,
        headingName: heading.name,
        amounts,
        amount: hasAny ? (Object.values(amounts)[0] ?? 0) : 0,
        sessionId: currentSession?.id ?? "",
      };

      if (existing) {
        saves.push(updateData("fees_plan", existing.id, planData));
      } else if (hasAny) {
        saves.push(
          saveData("fees_plan", {
            id: generateId(),
            ...planData,
          } as unknown as Record<string, unknown>),
        );
      }
    }

    await Promise.allSettled(saves);
    setSaving(false);
    setSavedMsg(`✓ Saved for ${selectedClass} - ${selectedSection}`);
    addNotification(
      `Fee plan saved for Class ${selectedClass} - Section ${selectedSection}`,
      "success",
    );
    setTimeout(() => setSavedMsg(""), 3000);
  }

  /** Compute column total for a heading (sum of all entered month amounts) */
  function getHeadingTotal(headingId: string): number {
    const vals = editValues[headingId] ?? {};
    return Object.values(vals).reduce((s, v) => s + (Number(v) || 0), 0);
  }

  /** Compute row total for a month (sum across all headings) */
  function getMonthTotal(monthShort: string): number {
    return activeHeadings.reduce((s, h) => {
      if (
        !h.months.some((m) => (MONTH_SHORT[m] ?? m.slice(0, 3)) === monthShort)
      )
        return s;
      return s + (Number(editValues[h.id]?.[monthShort] ?? 0) || 0);
    }, 0);
  }

  const grandTotal = activeHeadings.reduce(
    (s, h) => s + getHeadingTotal(h.id),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-foreground">Fees Plan</h3>
          <p className="text-sm text-muted-foreground">
            Set month-wise fee amounts per class, section, and heading
          </p>
        </div>
      </div>

      {headings.length === 0 ? (
        <div
          className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground"
          data-ocid="fees-plan.empty_state"
        >
          <p className="text-2xl mb-2">⚠️</p>
          <p className="font-medium">No fee headings found</p>
          <p className="text-sm mt-1">
            Add fee headings in the "Fee Headings" tab first.
          </p>
        </div>
      ) : (
        <>
          {/* Class selector */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Select Class
            </p>
            <div className="flex gap-2 flex-wrap">
              {classNames.map((cls) => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setSelectedClass(cls)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors font-medium ${
                    selectedClass === cls
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "border-border bg-card hover:bg-muted/50"
                  }`}
                  data-ocid="fees-plan.class-btn"
                >
                  {cls}
                </button>
              ))}
            </div>
          </div>

          {selectedClass && activeSections.length > 0 && (
            <>
              {/* Section selector */}
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Section:
                </p>
                {activeSections.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setSelectedSection(sec)}
                    className={`px-4 py-1.5 text-sm rounded-lg border transition-colors font-medium ${
                      selectedSection === sec
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "border-border bg-card hover:bg-muted/50"
                    }`}
                    data-ocid="fees-plan.section-btn"
                  >
                    {selectedClass} - {sec}
                  </button>
                ))}
              </div>

              {selectedSection && activeHeadings.length > 0 ? (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <h4 className="font-semibold text-foreground">
                        Class {selectedClass} — Section {selectedSection} —
                        Monthly Fee Plan
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Enter monthly amount for each fee heading. Leave blank
                        for ₹0.
                        {savedMsg && (
                          <span className="ml-2 text-green-600 font-semibold">
                            {savedMsg}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {activeSections.length > 1 && canEdit && !isReadOnly && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void copyToAllSections()}
                          disabled={saving}
                          data-ocid="fees-plan.copy-all-btn"
                        >
                          Copy to All Sections
                        </Button>
                      )}
                      {canEdit && !isReadOnly && (
                        <Button
                          onClick={() => void handleSave()}
                          disabled={saving}
                          data-ocid="fees-plan.save-btn"
                        >
                          {saving ? "Saving…" : "Save Plan"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Month-wise grid */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2.5 text-left font-semibold min-w-[150px] border-r border-border">
                            Fee Heading
                          </th>
                          {MONTHS.map((m) => {
                            const short = MONTH_SHORT[m] ?? m.slice(0, 3);
                            return (
                              <th
                                key={m}
                                className="px-2 py-2.5 text-center font-semibold min-w-[70px]"
                              >
                                {short}
                              </th>
                            );
                          })}
                          <th className="px-3 py-2.5 text-right font-semibold min-w-[80px] border-l border-border bg-primary/5">
                            Total/yr
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeHeadings.map((heading) => {
                          const yearTotal = getHeadingTotal(heading.id);
                          return (
                            <tr
                              key={heading.id}
                              className="border-t border-border hover:bg-muted/10"
                            >
                              <td className="px-3 py-2 font-medium border-r border-border">
                                <div className="text-foreground">
                                  {heading.name}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {heading.months.length} months
                                </div>
                              </td>
                              {MONTHS.map((m) => {
                                const short = MONTH_SHORT[m] ?? m.slice(0, 3);
                                const isApplicable = heading.months.includes(m);
                                return (
                                  <td
                                    key={m}
                                    className="px-1 py-1.5 text-center"
                                  >
                                    {isApplicable ? (
                                      <div className="flex items-center gap-0.5 justify-center">
                                        <span className="text-muted-foreground text-[10px]">
                                          ₹
                                        </span>
                                        <Input
                                          type="number"
                                          min="0"
                                          value={
                                            editValues[heading.id]?.[short] ??
                                            ""
                                          }
                                          onChange={(e) =>
                                            handleAmountChange(
                                              heading.id,
                                              short,
                                              e.target.value,
                                            )
                                          }
                                          disabled={!canEdit || isReadOnly}
                                          className="h-7 text-center text-xs w-16 px-1"
                                          placeholder="0"
                                          data-ocid="fees-plan.amount-input"
                                        />
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground/30 text-[10px]">
                                        —
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="px-3 py-2 text-right font-bold text-primary border-l border-border bg-primary/5">
                                {yearTotal > 0
                                  ? `₹${yearTotal.toLocaleString("en-IN")}`
                                  : "—"}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Monthly Total row */}
                        <tr className="border-t-2 border-border bg-muted/30 font-bold">
                          <td className="px-3 py-2 text-foreground border-r border-border">
                            Monthly Total
                          </td>
                          {MONTHS.map((m) => {
                            const short = MONTH_SHORT[m] ?? m.slice(0, 3);
                            const total = getMonthTotal(short);
                            return (
                              <td
                                key={m}
                                className="px-2 py-2 text-center text-xs"
                              >
                                {total > 0 ? (
                                  <span className="text-foreground font-semibold">
                                    ₹{total.toLocaleString("en-IN")}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/40">
                                    —
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-right border-l border-border bg-primary/10 text-primary">
                            ₹{grandTotal.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {!canEdit && (
                    <div className="p-3 bg-amber-50 border-t border-amber-200 text-amber-700 text-sm text-center">
                      Only Super Admin, Admin, or Accountant can edit fee
                      amounts.
                    </div>
                  )}
                </div>
              ) : selectedSection && activeHeadings.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
                  No fee headings apply to Class {selectedClass}. Add headings
                  in the "Fee Headings" tab.
                </div>
              ) : null}
            </>
          )}

          {selectedClass && activeSections.length === 0 && (
            <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
              No sections configured for Class {selectedClass}. Add sections in
              Academics → Classes.
            </div>
          )}

          {!selectedClass && (
            <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
              <p className="text-2xl mb-2">👆</p>
              <p className="font-medium">
                Select a class above to edit fee amounts
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
