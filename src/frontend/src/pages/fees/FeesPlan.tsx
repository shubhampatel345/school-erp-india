/**
 * FeesPlan.tsx — Class-wise, section-wise fee plans
 *
 * TYPING FIX:
 * - headings is now memoized so its reference is stable across renders.
 *   This prevents the editValues effect from firing on every SyncEngine poll.
 * - handleAmountChange is a stable useCallback with empty deps.
 * - All permissions are computed once with useMemo.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// ─── component ───────────────────────────────────────────────────────────────

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
  // editValues[headingId][monthShort] = amount string (empty = 0)
  const [editValues, setEditValues] = useState<
    Record<string, Record<string, string>>
  >({});
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  // ── Stable permission flags — computed once, not re-derived on every render ──
  const canEdit = useMemo(
    () =>
      currentUser?.role === "superadmin" ||
      currentUser?.role === "admin" ||
      currentUser?.role === "accountant",
    [currentUser?.role],
  );

  // ── Raw collections ─────────────────────────────────────────────────────────
  // CRITICAL: memoize headings so its reference is stable.
  // Without this, headings rebuilds every render → activeHeadings changes →
  // editValues useEffect fires → erases what the user is typing.
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
  // Memoize plans too so activeHeadings.filter doesn't re-run unnecessarily.
  const plans = useMemo(() => rawPlans, [rawPlans]);

  // ── Classes ─────────────────────────────────────────────────────────────────
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

  /** Headings applicable to the selected class */
  const activeHeadings = useMemo(() => {
    if (!selectedClass) return headings;
    return headings.filter((h) => {
      const ac = safeStringArray(h.applicableClasses);
      return ac.length === 0 || ac.includes(selectedClass);
    });
  }, [headings, selectedClass]);

  // ── Auto-select first section when class changes ─────────────────────────
  useEffect(() => {
    if (activeSections.length > 0) {
      setSelectedSection(activeSections[0]);
    } else {
      setSelectedSection("");
    }
  }, [activeSections]);

  // ── Load existing plan amounts into editValues ────────────────────────────
  // Use refs to track previous serialized values so we can skip the effect
  // when data arrives from SyncEngine polls but hasn't actually changed.
  // This prevents the fee grid from resetting while the user is typing.
  const prevEditKeyRef = useRef<string>("");

  const plansKey = useMemo(
    () =>
      JSON.stringify(
        plans.map((p) => ({ id: p.id, amounts: p.amounts, amount: p.amount })),
      ),
    [plans],
  );
  const headingsKey = useMemo(
    () => JSON.stringify(activeHeadings.map((h) => h.id)),
    [activeHeadings],
  );

  useEffect(() => {
    const newKey = `${selectedClass}|${selectedSection}|${headingsKey}|${plansKey}`;
    if (prevEditKeyRef.current === newKey) return; // nothing changed — don't reset
    prevEditKeyRef.current = newKey;

    if (!selectedClass || !selectedSection || activeHeadings.length === 0) {
      setEditValues({});
      return;
    }

    const vals: Record<string, Record<string, string>> = {};

    for (const heading of activeHeadings) {
      vals[heading.id] = {};

      const plan = plans.find((p) => {
        const planClass =
          p.classId ||
          (p as unknown as Record<string, string>).className ||
          (p as unknown as Record<string, string>).class ||
          "";
        const planSection =
          p.sectionId ||
          (p as unknown as Record<string, string>).sectionName ||
          (p as unknown as Record<string, string>).section ||
          "";
        return (
          planClass === selectedClass &&
          planSection === selectedSection &&
          p.headingId === heading.id
        );
      });

      for (const month of MONTHS) {
        if (!heading.months.includes(month)) continue;
        const short = MONTH_SHORT[month] ?? month.slice(0, 3);

        let val = "";
        if (plan) {
          if (plan.amounts && typeof plan.amounts === "object") {
            const amts = plan.amounts as Record<string, number>;
            val = amts[short] !== undefined ? String(amts[short]) : "";
          } else if (plan.amounts) {
            const amts = parseAmounts(plan.amounts);
            val = amts[short] !== undefined ? String(amts[short]) : "";
          }
          if (!val && plan.amount) {
            val = String(plan.amount);
          }
        }

        vals[heading.id][short] = val;
      }
    }

    setEditValues(vals);
    setSavedMsg("");
  }, [
    selectedClass,
    selectedSection,
    activeHeadings,
    plans,
    headingsKey,
    plansKey,
  ]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  // CRITICAL: empty deps array so this is created once — never a new reference.
  const handleAmountChange = useCallback(
    (headingId: string, monthShort: string, raw: string) => {
      const cleaned = raw.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
      setEditValues((prev) => ({
        ...prev,
        [headingId]: {
          ...(prev[headingId] ?? {}),
          [monthShort]: cleaned,
        },
      }));
      setSavedMsg("");
    },
    [],
  );

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
            const short = MONTH_SHORT[month] ?? month.slice(0, 3);
            const val = Number(editValues[heading.id]?.[short] ?? 0);
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
            session: currentSession?.id ?? "",
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

      const existing = plans.find((p) => {
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
        return (
          pc === selectedClass &&
          ps === selectedSection &&
          p.headingId === heading.id
        );
      });

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

  // ── Totals ────────────────────────────────────────────────────────────────

  function getHeadingTotal(headingId: string): number {
    return Object.values(editValues[headingId] ?? {}).reduce(
      (s, v) => s + (Number(v) || 0),
      0,
    );
  }

  function getMonthTotal(monthShort: string): number {
    return activeHeadings.reduce((s, h) => {
      const applicable = h.months.some(
        (m) => (MONTH_SHORT[m] ?? m.slice(0, 3)) === monthShort,
      );
      if (!applicable) return s;
      return s + (Number(editValues[h.id]?.[monthShort] ?? 0) || 0);
    }, 0);
  }

  const grandTotal = activeHeadings.reduce(
    (s, h) => s + getHeadingTotal(h.id),
    0,
  );

  // ── Render ────────────────────────────────────────────────────────────────

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
                                const currentVal =
                                  editValues[heading.id]?.[short] ?? "";
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
                                          value={currentVal}
                                          disabled={isReadOnly || !canEdit}
                                          onChange={handleAmountChange}
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

// ── AmountCell extracted as a separate component ──────────────────────────────
// CRITICAL: This MUST be outside FeesPlanPage so it doesn't remount on parent re-renders.
// It receives a stable `onChange` callback (useCallback with []) so React.memo works.
import { memo } from "react";

interface AmountCellProps {
  headingId: string;
  monthShort: string;
  value: string;
  disabled: boolean;
  onChange: (headingId: string, monthShort: string, raw: string) => void;
}

const AmountCell = memo(function AmountCell({
  headingId,
  monthShort,
  value,
  disabled,
  onChange,
}: AmountCellProps) {
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      onChange={(e) => {
        if (!disabled) onChange(headingId, monthShort, e.target.value);
      }}
      onFocus={(e) => {
        if (e.target.value === "0") e.target.select();
      }}
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
  );
});
