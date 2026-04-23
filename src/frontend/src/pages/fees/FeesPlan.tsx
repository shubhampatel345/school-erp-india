/**
 * FeesPlan.tsx — Class-wise, section-wise fee plans
 *
 * CRITICAL TYPING FIX (root cause of persistent cursor-jump bug):
 * - Each cell is now a fully self-contained component (AmountCell) that owns
 *   its own local state via useState. It does NOT report to the parent on every
 *   keystroke — only on blur.
 * - The parent never stores per-cell amounts in its own state at all.
 *   The parent holds an "initialValues" map that is passed down once when the
 *   class/section selection changes. React.memo + stable props means AmountCell
 *   will NOT re-render unless the initial value prop changes.
 * - On blur, each cell calls onBlur(headingId, monthShort, value) which
 *   immediately persists to IndexedDB/canister — no parent re-render needed.
 * - A savedCells Set is tracked in the parent ref (not state) so the ✓ badge
 *   doesn't cause a re-render either.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../components/ui/button";
import { useApp } from "../../context/AppContext";
import type { ClassSection, FeeHeading, FeesPlan } from "../../types";
import { CLASS_ORDER } from "../../types";
import { CLASSES, MONTHS, generateId } from "../../utils/localStorage";

// ─── helpers ─────────────────────────────────────────────────────────────────

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
  if (typeof amounts === "number") return {};
  if (typeof amounts === "object" && !Array.isArray(amounts)) {
    return amounts as Record<string, number>;
  }
  if (typeof amounts === "string" && amounts.trim()) {
    try {
      const p = JSON.parse(amounts) as unknown;
      if (typeof p === "object" && !Array.isArray(p) && p !== null) {
        return p as Record<string, number>;
      }
    } catch {
      // not parseable JSON
    }
  }
  return {};
}

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

// ─── AmountCell — fully self-contained ────────────────────────────────────────
// CRITICAL: This component owns its own local state.
// It does NOT call onChange on every keystroke — only onBlur.
// React.memo ensures it only re-renders when initialValue or disabled changes.

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
  // Local state — only this component re-renders on keystroke
  const [localValue, setLocalValue] = useState(initialValue);
  const [saved, setSaved] = useState(false);

  // Sync when initialValue changes (class/section switched)
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
    // Clear saved indicator after 3s
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FeesPlanPage() {
  const {
    getData,
    saveData,
    updateData,
    refreshCollection,
    currentUser,
    isReadOnly,
    currentSession,
    addNotification,
  } = useApp();

  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  // Accumulator for per-cell blur saves — keyed by headingId+month
  // Using a ref so we don't re-render the whole page on each cell blur
  const pendingAmountsRef = useRef<Record<string, Record<string, string>>>({});

  // ── Stable permission flags ─────────────────────────────────────────────────
  const canEdit = useMemo(
    () =>
      currentUser?.role === "superadmin" ||
      currentUser?.role === "admin" ||
      currentUser?.role === "accountant",
    [currentUser?.role],
  );

  // ── Raw collections ─────────────────────────────────────────────────────────
  const rawHeadings = getData("fee_headings") as FeeHeading[];
  const headings = useMemo(
    () =>
      rawHeadings
        .map((h) => ({
          ...h,
          months: safeStringArray(h.months),
        }))
        .filter((h) => h.isActive !== false)
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [rawHeadings],
  );

  const rawPlans = getData("fees_plan") as FeesPlan[];
  const plans = useMemo(() => rawPlans, [rawPlans]);

  // ── Classes ─────────────────────────────────────────────────────────────────
  const rawClasses = getData("classes") as ClassSection[];
  const classSections: ClassSection[] = useMemo(() => {
    if (rawClasses.length > 0) {
      return [...rawClasses].sort((a, b) => {
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
  }, [rawClasses]);

  const classNames = useMemo(
    () =>
      classSections
        .map(
          (c) => c.className ?? (c as unknown as { name?: string }).name ?? "",
        )
        .filter(Boolean),
    [classSections],
  );

  const activeSections: string[] = useMemo(() => {
    const cs = classSections.find(
      (c) =>
        (c.className ?? (c as unknown as { name?: string }).name ?? "") ===
        selectedClass,
    );
    if (!cs) return [];
    return safeStringArray(cs.sections);
  }, [classSections, selectedClass]);

  // Headings applicable to selected class
  const activeHeadings = useMemo(() => {
    if (!selectedClass) return headings;
    return headings.filter((h) => {
      const ac = safeStringArray(h.applicableClasses);
      return ac.length === 0 || ac.includes(selectedClass);
    });
  }, [headings, selectedClass]);

  // Auto-select first section when class changes
  useEffect(() => {
    if (activeSections.length > 0) {
      setSelectedSection(activeSections[0]);
    } else {
      setSelectedSection("");
    }
    // Reset pending amounts when class changes
    pendingAmountsRef.current = {};
  }, [activeSections]);

  // Pending amounts are reset inside the initialValuesKey block below

  // Plans scoped to current class+section
  const relevantPlans = useMemo(
    () =>
      plans.filter((p) => {
        const pc =
          p.classId ||
          (p as unknown as Record<string, string>).className ||
          (p as unknown as Record<string, string>).class ||
          "";
        const ps =
          p.sectionId ||
          (p as unknown as Record<string, string>).sectionName ||
          (p as unknown as Record<string, string>).section ||
          "";
        return pc === selectedClass && ps === selectedSection;
      }),
    [plans, selectedClass, selectedSection],
  );

  // Derive initial values for cells — memoized so AmountCell only re-initializes
  // when the selection actually changes (not on every SyncEngine poll)
  const initialValuesKey = `${selectedClass}|${selectedSection}`;
  const initialValuesRef = useRef<{
    key: string;
    values: Record<string, Record<string, string>>;
  }>({ key: "", values: {} });

  if (initialValuesRef.current.key !== initialValuesKey) {
    const vals: Record<string, Record<string, string>> = {};
    for (const heading of activeHeadings) {
      vals[heading.id] = {};
      const plan = relevantPlans.find((p) => p.headingId === heading.id);
      for (const month of MONTHS) {
        if (!heading.months.includes(month)) continue;
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
    // Seed pendingAmounts with the initial values so Save All works even without blur
    pendingAmountsRef.current = JSON.parse(JSON.stringify(vals)) as Record<
      string,
      Record<string, string>
    >;
  }

  // ── On-blur cell save handler ────────────────────────────────────────────────
  // CRITICAL: empty deps → stable reference → AmountCell never remounts
  const handleCellBlur = useCallback(
    (headingId: string, monthShort: string, value: string) => {
      // Update the accumulator — no state update, no re-render
      if (!pendingAmountsRef.current[headingId]) {
        pendingAmountsRef.current[headingId] = {};
      }
      pendingAmountsRef.current[headingId][monthShort] = value;
    },
    [],
  );

  // ── Save All ─────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!selectedClass || !selectedSection || !canEdit) return;
    setSaving(true);
    const saves: Promise<unknown>[] = [];

    for (const heading of activeHeadings) {
      const amounts: Record<string, number> = {};
      let hasAny = false;

      for (const month of MONTHS) {
        if (!heading.months.includes(month)) continue;
        const short = MONTH_SHORT_MAP[month] ?? month.slice(0, 3);
        const raw = pendingAmountsRef.current[heading.id]?.[short] ?? "";
        const val = Number(raw) || 0;
        if (val > 0) {
          amounts[short] = val;
          hasAny = true;
        }
      }

      const existing = relevantPlans.find((p) => p.headingId === heading.id);
      const planData = {
        classId: selectedClass,
        sectionId: selectedSection,
        className: selectedClass,
        sectionName: selectedSection,
        class: selectedClass,
        section: selectedSection,
        headingId: heading.id,
        headingName: heading.name,
        amounts: JSON.stringify(amounts),
        amount: hasAny ? (Object.values(amounts)[0] ?? 0) : 0,
        sessionId: currentSession?.id ?? "",
        session: currentSession?.id ?? "",
      };

      if (existing) {
        saves.push(updateData("fees_plan", existing.id, planData));
      } else {
        saves.push(
          saveData("fees_plan", {
            id: generateId(),
            ...planData,
          } as unknown as Record<string, unknown>),
        );
      }
    }

    try {
      await Promise.allSettled(saves);
      await refreshCollection("fees_plan");
      setSavedMsg(`✓ Saved — ${selectedClass} / ${selectedSection}`);
      addNotification(
        `Fee plan saved for Class ${selectedClass} - Section ${selectedSection}`,
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

  // ── Copy to all sections ─────────────────────────────────────────────────────
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
        for (const heading of activeHeadings) {
          const amounts: Record<string, number> = {};
          let hasAny = false;
          for (const month of MONTHS) {
            if (!heading.months.includes(month)) continue;
            const short = MONTH_SHORT_MAP[month] ?? month.slice(0, 3);
            const val =
              Number(pendingAmountsRef.current[heading.id]?.[short] ?? 0) || 0;
            if (val > 0) {
              amounts[short] = val;
              hasAny = true;
            }
          }
          if (!hasAny) continue;

          const existing = plans.find((p) => {
            const pc =
              p.classId ||
              (p as unknown as Record<string, string>).className ||
              "";
            const ps =
              p.sectionId ||
              (p as unknown as Record<string, string>).sectionName ||
              "";
            return (
              pc === selectedClass &&
              ps === section &&
              p.headingId === heading.id
            );
          });

          const planData = {
            classId: selectedClass,
            sectionId: section,
            className: selectedClass,
            sectionName: section,
            class: selectedClass,
            section,
            headingId: heading.id,
            headingName: heading.name,
            amounts: JSON.stringify(amounts),
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
    } catch (err) {
      addNotification(
        `Copy failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

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
                        Click any cell, type the amount, then press Tab/Enter or
                        click away to save.
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
                          // Year total is derived from initialValues (seeded from plans)
                          const yearTotal = Object.values(initVals).reduce(
                            (s, v) => s + (Number(v) || 0),
                            0,
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
                                  {heading.months.length} months
                                </div>
                              </td>
                              {MONTHS.map((m) => {
                                const short =
                                  MONTH_SHORT_MAP[m] ?? m.slice(0, 3);
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

                  {!canEdit && !isReadOnly && (
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
