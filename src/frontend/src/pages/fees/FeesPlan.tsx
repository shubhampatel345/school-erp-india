/**
 * FeesPlan.tsx — Class/section fee plan via phpApiService
 *
 * CRITICAL: Amount inputs use self-contained AmountCell (memo) that owns local
 * state and only reports to parent on blur. NO parent re-render on keystroke.
 * type="text" (NOT type="number") to prevent cursor-jump bugs.
 *
 * All reads/writes go through phpApiService directly.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../components/ui/button";
import { useApp } from "../../context/AppContext";
import phpApiService, {
  type ClassRecord,
  type FeeHeadingRecord,
  type FeePlanRecord,
} from "../../utils/phpApiService";

// ── Helpers ────────────────────────────────────────────────────────────────────

function safeStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string" && v.trim()) {
    try {
      const p = JSON.parse(v);
      if (Array.isArray(p)) return p.map(String);
    } catch {
      return v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function parseAmounts(amounts: unknown): Record<string, number> {
  if (!amounts && amounts !== 0) return {};
  if (typeof amounts === "object" && !Array.isArray(amounts))
    return amounts as Record<string, number>;
  if (typeof amounts === "string" && amounts.trim()) {
    try {
      const p = JSON.parse(amounts) as unknown;
      if (typeof p === "object" && !Array.isArray(p) && p !== null)
        return p as Record<string, number>;
    } catch {
      /* not json */
    }
  }
  return {};
}

const MONTHS = [
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
  "January",
  "February",
  "March",
];

const MONTH_SHORT_MAP: Record<string, string> = {
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

const CLASS_ORDER = [
  "Nursery",
  "LKG",
  "UKG",
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
];

function classOrderIdx(name: string): number {
  let idx = CLASS_ORDER.indexOf(name);
  if (idx !== -1) return idx;
  idx = CLASS_ORDER.indexOf(`Class ${name}`);
  return idx !== -1 ? idx : 99;
}

// ── AmountCell — self-contained to prevent cursor-jump ────────────────────────

interface AmountCellProps {
  headingId: string;
  monthShort: string;
  initialValue: string;
  disabled: boolean;
  onBlurSave: (headingId: string, monthShort: string, value: string) => void;
}

const AmountCell = memo(function AmountCell({
  headingId,
  monthShort,
  initialValue,
  disabled,
  onBlurSave,
}: AmountCellProps) {
  const [localValue, setLocalValue] = useState(initialValue);
  const [saved, setSaved] = useState(false);
  const prevInitRef = useRef(initialValue);

  useEffect(() => {
    if (prevInitRef.current !== initialValue) {
      prevInitRef.current = initialValue;
      setLocalValue(initialValue);
      setSaved(false);
    }
  }, [initialValue]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (disabled) return;
    const cleaned = e.target.value
      .replace(/[^0-9.]/g, "")
      .replace(/(\..*)\./g, "$1");
    setLocalValue(cleaned);
    setSaved(false);
  }

  function handleBlur() {
    if (disabled) return;
    onBlurSave(headingId, monthShort, localValue);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    if (e.target.value === "0") e.target.select();
  }

  return (
    <div className="relative flex items-center justify-center">
      <input
        type="text"
        inputMode="decimal"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        disabled={disabled}
        placeholder="0"
        className={[
          "h-7 w-16 text-center text-xs px-1 rounded border",
          "bg-background text-foreground",
          "border-input focus:border-primary focus:ring-1 focus:ring-primary/30",
          "outline-none transition-colors",
          "[appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden",
          disabled
            ? "opacity-50 cursor-not-allowed bg-muted"
            : "hover:border-primary/40",
        ]
          .filter(Boolean)
          .join(" ")}
        data-ocid="fees-plan.amount-input"
      />
      {saved && (
        <span className="absolute -top-2 -right-1.5 text-[9px] text-green-600 font-bold pointer-events-none">
          ✓
        </span>
      )}
    </div>
  );
});

// ── Main Component ────────────────────────────────────────────────────────────

export default function FeesPlanPage() {
  const { currentUser, isReadOnly, currentSession, addNotification } = useApp();

  const [headings, setHeadings] = useState<FeeHeadingRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [plans, setPlans] = useState<FeePlanRecord[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Accumulator for cell values — keyed by headingId+month, no parent re-render
  const pendingAmountsRef = useRef<Record<string, Record<string, string>>>({});

  const canEdit = useMemo(
    () =>
      currentUser?.role === "superadmin" ||
      currentUser?.role === "admin" ||
      currentUser?.role === "accountant",
    [currentUser?.role],
  );

  // Fetch headings and classes once on mount
  useEffect(() => {
    setIsLoading(true);
    Promise.all([phpApiService.getFeeHeadings(), phpApiService.getClasses()])
      .then(([h, c]) => {
        const activeHeadings = h.filter((x) => x.isActive !== false);
        setHeadings(activeHeadings);
        const sorted = [...c].sort(
          (a, b) => classOrderIdx(a.className) - classOrderIdx(b.className),
        );
        setClasses(sorted);
      })
      .catch(() => {
        /* silently fail */
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Fetch fee plan whenever class+section changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: headings is stable after mount
  useEffect(() => {
    if (!selectedClass || !selectedSection) {
      setPlans([]);
      return;
    }
    phpApiService
      .getFeePlan(selectedClass, selectedSection)
      .then((p) => {
        setPlans(p);
        // Seed pending amounts from loaded plan
        const vals: Record<string, Record<string, string>> = {};
        for (const heading of headings) {
          vals[heading.id] = {};
          const plan = p.find((x) => x.headingId === heading.id);
          for (const month of MONTHS) {
            const months = safeStringArray(
              heading.months as string[] | string | undefined,
            );
            if (!months.includes(month)) continue;
            const short = MONTH_SHORT_MAP[month] ?? month.slice(0, 3);
            let val = "";
            if (plan) {
              const amts = parseAmounts(plan.amounts);
              if (amts[short] !== undefined) val = String(amts[short]);
              else if (plan.amount) val = String(plan.amount);
            }
            vals[heading.id][short] = val;
          }
        }
        pendingAmountsRef.current = vals;
        // Force AmountCell re-init via key change (see initialValuesRef below)
        initialValuesRef.current = {
          key: `${selectedClass}|${selectedSection}`,
          values: vals,
        };
      })
      .catch(() => setPlans([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, selectedSection]);

  // Auto-select first section when class changes
  const activeSections = useMemo(() => {
    const cls = classes.find((c) => c.className === selectedClass);
    if (!cls) return [];
    return safeStringArray(cls.sections as string[] | string | undefined);
  }, [classes, selectedClass]);

  useEffect(() => {
    if (activeSections.length > 0) {
      setSelectedSection(activeSections[0]);
    } else {
      setSelectedSection("");
    }
    pendingAmountsRef.current = {};
  }, [activeSections]);

  const classNames = useMemo(() => classes.map((c) => c.className), [classes]);

  const activeHeadings = useMemo(() => {
    if (!selectedClass) return headings;
    return headings.filter((h) => {
      const ac = safeStringArray(
        (h as unknown as Record<string, unknown>).applicableClasses as
          | string[]
          | string
          | undefined,
      );
      return ac.length === 0 || ac.includes(selectedClass);
    });
  }, [headings, selectedClass]);

  // initialValuesRef — tracks which class+section's values are loaded
  const initialValuesKey = `${selectedClass}|${selectedSection}`;
  const initialValuesRef = useRef<{
    key: string;
    values: Record<string, Record<string, string>>;
  }>({
    key: "",
    values: {},
  });

  if (initialValuesRef.current.key !== initialValuesKey) {
    // Seed from plans on first render for this class+section
    const vals: Record<string, Record<string, string>> = {};
    for (const heading of activeHeadings) {
      vals[heading.id] = {};
      const plan = plans.find((p) => p.headingId === heading.id);
      for (const month of MONTHS) {
        const months = safeStringArray(
          heading.months as string[] | string | undefined,
        );
        if (!months.includes(month)) continue;
        const short = MONTH_SHORT_MAP[month] ?? month.slice(0, 3);
        let val = "";
        if (plan) {
          const amts = parseAmounts(plan.amounts);
          if (amts[short] !== undefined) val = String(amts[short]);
          else if (plan.amount) val = String(plan.amount);
        }
        vals[heading.id][short] = val;
      }
    }
    initialValuesRef.current = { key: initialValuesKey, values: vals };
    pendingAmountsRef.current = JSON.parse(JSON.stringify(vals)) as Record<
      string,
      Record<string, string>
    >;
  }

  // Stable blur handler — empty deps = stable ref = AmountCell never remounts
  const handleCellBlur = useCallback(
    (headingId: string, monthShort: string, value: string) => {
      if (!pendingAmountsRef.current[headingId])
        pendingAmountsRef.current[headingId] = {};
      pendingAmountsRef.current[headingId][monthShort] = value;
    },
    [],
  );

  async function handleSave() {
    if (!selectedClass || !selectedSection || !canEdit) return;
    setSaving(true);
    const items: Array<{ headingId: string; amounts: Record<string, number> }> =
      [];

    for (const heading of activeHeadings) {
      const amounts: Record<string, number> = {};
      for (const month of MONTHS) {
        const months = safeStringArray(
          heading.months as string[] | string | undefined,
        );
        if (!months.includes(month)) continue;
        const short = MONTH_SHORT_MAP[month] ?? month.slice(0, 3);
        const val =
          Number(pendingAmountsRef.current[heading.id]?.[short] ?? 0) || 0;
        if (val > 0) amounts[short] = val;
      }
      items.push({ headingId: heading.id, amounts });
    }

    try {
      await phpApiService.saveFeePlan({
        classId: selectedClass,
        sectionId: selectedSection,
        items,
        sessionId: currentSession?.id,
      });
      // Reload plans from server to confirm save
      const updated = await phpApiService.getFeePlan(
        selectedClass,
        selectedSection,
      );
      setPlans(updated);
      setSavedMsg(`✓ Saved — ${selectedClass} / ${selectedSection}`);
      addNotification(
        `Fee plan saved for ${selectedClass} - ${selectedSection}`,
        "success",
      );
    } catch (err) {
      addNotification(
        `Save failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        "error",
      );
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMsg(""), 4000);
    }
  }

  async function copyToAllSections() {
    if (!selectedClass || !selectedSection || !canEdit) return;
    const otherSections = activeSections.filter((s) => s !== selectedSection);
    if (otherSections.length === 0) return;
    if (
      !confirm(
        `Copy amounts from Section ${selectedSection} to: ${otherSections.join(", ")}?`,
      )
    )
      return;

    setSaving(true);
    try {
      for (const section of otherSections) {
        const items: Array<{
          headingId: string;
          amounts: Record<string, number>;
        }> = [];
        for (const heading of activeHeadings) {
          const amounts: Record<string, number> = {};
          for (const month of MONTHS) {
            const months = safeStringArray(
              heading.months as string[] | string | undefined,
            );
            if (!months.includes(month)) continue;
            const short = MONTH_SHORT_MAP[month] ?? month.slice(0, 3);
            const val =
              Number(pendingAmountsRef.current[heading.id]?.[short] ?? 0) || 0;
            if (val > 0) amounts[short] = val;
          }
          items.push({ headingId: heading.id, amounts });
        }
        await phpApiService.saveFeePlan({
          classId: selectedClass,
          sectionId: section,
          items,
          sessionId: currentSession?.id,
        });
      }
      addNotification(
        `Amounts copied to all sections of ${selectedClass}`,
        "success",
      );
    } catch (err) {
      addNotification(
        `Copy failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 justify-center py-12">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-primary animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    );
  }

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
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors font-medium ${selectedClass === cls ? "bg-primary text-primary-foreground border-primary shadow-sm" : "border-border bg-card hover:bg-muted/50"}`}
                  data-ocid="fees-plan.class-btn"
                >
                  {cls}
                </button>
              ))}
            </div>
          </div>

          {selectedClass && activeSections.length > 0 && (
            <>
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Section:
                </p>
                {activeSections.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setSelectedSection(sec)}
                    className={`px-4 py-1.5 text-sm rounded-lg border transition-colors font-medium ${selectedSection === sec ? "bg-primary/10 text-primary border-primary/30" : "border-border bg-card hover:bg-muted/50"}`}
                    data-ocid="fees-plan.section-btn"
                  >
                    {selectedClass} - {sec}
                  </button>
                ))}
              </div>

              {selectedSection && activeHeadings.length > 0 ? (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <h4 className="font-semibold text-foreground">
                        Class {selectedClass} — Section {selectedSection} —
                        Monthly Fee Plan
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Click any cell, type the amount, then press Tab/Enter or
                        click away.
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

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2.5 text-left font-semibold min-w-[150px] border-r border-border">
                            Fee Heading
                          </th>
                          {MONTHS.map((m) => {
                            const short = MONTH_SHORT_MAP[m] ?? m.slice(0, 3);
                            return (
                              <th
                                key={m}
                                className="px-2 py-2.5 text-center font-semibold min-w-[72px]"
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
                          const initVals =
                            initialValuesRef.current.values[heading.id] ?? {};
                          const yearTotal = Object.values(initVals).reduce(
                            (s, v) => s + (Number(v) || 0),
                            0,
                          );
                          const months = safeStringArray(
                            heading.months as string[] | string | undefined,
                          );
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
                                  {months.length} months
                                </div>
                              </td>
                              {MONTHS.map((m) => {
                                const short =
                                  MONTH_SHORT_MAP[m] ?? m.slice(0, 3);
                                const isApplicable = months.includes(m);
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
                                        <AmountCell
                                          headingId={heading.id}
                                          monthShort={short}
                                          initialValue={initVals[short] ?? ""}
                                          disabled={isReadOnly || !canEdit}
                                          onBlurSave={handleCellBlur}
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
                      </tbody>
                    </table>
                  </div>

                  {!canEdit && (
                    <div className="p-3 bg-amber-50 border-t border-amber-200 text-amber-700 text-sm text-center">
                      Only Super Admin, Admin, or Accountant can edit fee
                      amounts.
                    </div>
                  )}
                  {isReadOnly && (
                    <div className="p-3 bg-amber-50 border-t border-amber-200 text-amber-700 text-sm text-center">
                      This session is archived. Switch to the active session to
                      edit.
                    </div>
                  )}
                </div>
              ) : selectedSection && activeHeadings.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
                  No fee headings apply to Class {selectedClass}.
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
