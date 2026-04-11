import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useApp } from "../../context/AppContext";
import type { Staff } from "../../types";
import { CLASSES, SECTIONS, generateId, ls } from "../../utils/localStorage";

// ── Types ─────────────────────────────────────────────────────────────────────
interface TeacherAssignment {
  staffId: string;
  teacherName: string;
  subject: string;
  classFrom: string;
  classTo: string;
  expandedSections: string[]; // e.g. ["1A","1B","2A"]
}

interface SplitPair {
  id: string;
  subjectA: string;
  subjectB: string;
  class_: string;
  section: string;
}

interface PeriodDef {
  index: number;
  label: string;
  startTime: string;
  endTime: string;
  durationMin: number;
}

interface CellValue {
  teacherName: string;
  subject: string;
  staffId: string;
}

interface SectionGrid {
  class_: string;
  section: string;
  // [dayIndex][periodIndex] => CellValue | null
  cells: (CellValue | null)[][];
}

interface SavedTimetable {
  id: string;
  sessionLabel: string;
  days: string[];
  periods: PeriodDef[];
  intervalMinutes: number;
  sections: SectionGrid[];
  splitPairs: SplitPair[];
  savedAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const ALL_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function addMinutes(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function buildPeriods(
  count: number,
  startTime: string,
  durations: number[],
  intervalMin: number,
): PeriodDef[] {
  const periods: PeriodDef[] = [];
  let cursor = startTime;
  for (let i = 0; i < count; i++) {
    const dur = durations[i] ?? 45;
    const end = addMinutes(cursor, dur);
    periods.push({
      index: i,
      label: `P${i + 1}`,
      startTime: cursor,
      endTime: end,
      durationMin: dur,
    });
    cursor = addMinutes(end, intervalMin);
  }
  return periods;
}

function expandSections(classFrom: string, classTo: string): string[] {
  const fromIdx = CLASSES.indexOf(classFrom);
  const toIdx = CLASSES.indexOf(classTo);
  if (fromIdx < 0 || toIdx < 0) return [];
  const result: string[] = [];
  for (let i = fromIdx; i <= toIdx; i++) {
    for (const sec of SECTIONS.slice(0, 3)) {
      result.push(`${CLASSES[i]}${sec}`);
    }
  }
  return result;
}

function isMWF(dayIndex: number): boolean {
  // 0=Mon,1=Tue,2=Wed,3=Thu,4=Fri,5=Sat
  return dayIndex === 0 || dayIndex === 2 || dayIndex === 4;
}

// ── Sub-component: SectionCard ─────────────────────────────────────────────────
function SectionCard({
  grid,
  days,
  periods,
  saved,
  onCellChange,
}: {
  grid: SectionGrid;
  days: string[];
  periods: PeriodDef[];
  saved: boolean;
  onCellChange: (
    class_: string,
    section: string,
    dayIdx: number,
    periodIdx: number,
    value: CellValue | null,
  ) => void;
}) {
  const dragSrc = useRef<{ day: number; period: number } | null>(null);

  const handleDragStart = (day: number, period: number) => {
    if (saved) return;
    dragSrc.current = { day, period };
  };

  const handleDrop = (day: number, period: number) => {
    if (saved || !dragSrc.current) return;
    const src = dragSrc.current;
    if (src.day === day && src.period === period) return;
    const srcVal = grid.cells[src.day]?.[src.period] ?? null;
    const dstVal = grid.cells[day]?.[period] ?? null;
    onCellChange(grid.class_, grid.section, src.day, src.period, dstVal);
    onCellChange(grid.class_, grid.section, day, period, srcVal);
    dragSrc.current = null;
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
      <div className="bg-primary/10 px-4 py-2.5 border-b border-border flex items-center justify-between">
        <span className="font-semibold text-foreground font-display">
          Class {grid.class_} — Section {grid.section}
        </span>
        {!saved && (
          <span className="text-xs text-muted-foreground">
            ↔ Drag to swap periods
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-max">
          <thead>
            <tr className="bg-muted/40">
              <th className="px-3 py-2 text-left text-muted-foreground font-medium w-20 sticky left-0 bg-muted/40">
                Day
              </th>
              {periods.map((p) => (
                <th
                  key={p.index}
                  className="px-2 py-2 text-center text-muted-foreground font-medium whitespace-nowrap"
                >
                  {p.label}
                  <br />
                  <span className="font-normal text-[10px]">{p.startTime}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day, di) => (
              <tr
                key={day}
                className="border-t border-border/50 hover:bg-muted/10"
              >
                <td className="px-3 py-2 font-medium text-foreground sticky left-0 bg-card">
                  {DAY_SHORT[ALL_DAYS.indexOf(day)] ?? day.slice(0, 3)}
                </td>
                {periods.map((p) => {
                  const cell = grid.cells[di]?.[p.index] ?? null;
                  return (
                    <td
                      key={p.index}
                      draggable={!saved && !!cell}
                      onDragStart={() => handleDragStart(di, p.index)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(di, p.index)}
                      className={`px-2 py-1.5 text-center relative group ${
                        cell ? "bg-primary/5 cursor-grab" : "bg-background"
                      } border-l border-border/30`}
                      data-ocid={`tt-cell-${grid.class_}-${grid.section}-${di}-${p.index}`}
                    >
                      {cell ? (
                        <div className="relative">
                          <div className="font-semibold text-foreground leading-tight text-[11px]">
                            {cell.subject}
                          </div>
                          <div className="text-muted-foreground text-[10px] leading-tight">
                            {cell.teacherName.split(" ")[0]}
                          </div>
                          {!saved && (
                            <button
                              type="button"
                              onClick={() =>
                                onCellChange(
                                  grid.class_,
                                  grid.section,
                                  di,
                                  p.index,
                                  null,
                                )
                              }
                              className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-destructive text-destructive-foreground text-[9px] leading-none hidden group-hover:flex items-center justify-center"
                              aria-label="Clear cell"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/30 text-[10px]">
                          —
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Combined Excel View ────────────────────────────────────────────────────────
function CombinedView({
  sections,
  days,
  periods,
  sessionLabel,
}: {
  sections: SectionGrid[];
  days: string[];
  periods: PeriodDef[];
  sessionLabel: string;
}) {
  if (sections.length === 0) return null;

  const exportCSV = () => {
    const sectionKeys = sections.map((s) => `${s.class_}${s.section}`);
    const headers = ["Day", "Period", ...sectionKeys];
    const rows: string[][] = [];
    for (const day of days) {
      const di = ALL_DAYS.indexOf(day);
      for (const period of periods) {
        const row = [
          day.slice(0, 3),
          period.label,
          ...sections.map((s) => s.cells[di]?.[period.index]?.subject ?? ""),
        ];
        rows.push(row);
      }
    }
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timetable_${sessionLabel.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">
          Combined Timetable — All Sections
        </h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={exportCSV}
            data-ocid="tt-export-csv"
          >
            Export CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            data-ocid="tt-print"
          >
            Print
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-xs min-w-max">
          <thead>
            <tr className="bg-primary/10 border-b border-border">
              <th className="px-3 py-2.5 text-left font-semibold border-r border-border w-20">
                Day
              </th>
              <th className="px-3 py-2.5 text-left font-semibold border-r border-border w-16">
                Period
              </th>
              {sections.map((s) => (
                <th
                  key={`${s.class_}${s.section}`}
                  className="px-3 py-2.5 text-center font-semibold border-r border-border last:border-r-0 whitespace-nowrap"
                >
                  {s.class_}
                  {s.section}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.flatMap((day, di) =>
              periods.map((period, pi) => (
                <tr
                  key={`${day}-${period.label}`}
                  className={`border-t border-border/30 ${pi === 0 ? "border-t-2 border-t-border/60" : ""} ${di % 2 === 0 ? "bg-background" : "bg-muted/10"}`}
                >
                  <td className="px-3 py-1.5 text-muted-foreground border-r border-border">
                    {pi === 0 ? day.slice(0, 3) : ""}
                  </td>
                  <td className="px-3 py-1.5 font-medium text-foreground border-r border-border">
                    {period.label}
                    <span className="text-muted-foreground text-[10px] ml-1">
                      {period.startTime}
                    </span>
                  </td>
                  {sections.map((s) => {
                    const cell = s.cells[di]?.[period.index] ?? null;
                    return (
                      <td
                        key={`${s.class_}${s.section}`}
                        className="px-2 py-1.5 text-center border-r border-border/30 last:border-r-0"
                      >
                        {cell ? (
                          <div>
                            <div className="font-medium text-foreground text-[11px]">
                              {cell.subject}
                            </div>
                            <div className="text-muted-foreground text-[10px]">
                              {cell.teacherName.split(" ")[0]}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Teacher-wise View ──────────────────────────────────────────────────────────
function TeacherWiseView({
  sections,
  days,
  periods,
  assignments,
}: {
  sections: SectionGrid[];
  days: string[];
  periods: PeriodDef[];
  assignments: TeacherAssignment[];
}) {
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const uniqueTeachers = [...new Set(assignments.map((a) => a.teacherName))];

  const teacherSchedule: {
    day: string;
    period: PeriodDef;
    class_: string;
    section: string;
    subject: string;
  }[] = [];

  if (selectedTeacher) {
    for (const sec of sections) {
      for (let di = 0; di < days.length; di++) {
        for (const period of periods) {
          const cell = sec.cells[di]?.[period.index];
          if (cell?.teacherName === selectedTeacher) {
            teacherSchedule.push({
              day: days[di],
              period,
              class_: sec.class_,
              section: sec.section,
              subject: cell.subject,
            });
          }
        }
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Label className="whitespace-nowrap">Select Teacher:</Label>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground flex-1 max-w-xs"
          value={selectedTeacher}
          onChange={(e) => setSelectedTeacher(e.target.value)}
          data-ocid="tt-teacher-select"
        >
          <option value="">— Choose Teacher —</option>
          {uniqueTeachers.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {selectedTeacher && teacherSchedule.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          No periods assigned to {selectedTeacher} yet.
        </div>
      )}

      {teacherSchedule.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">
                  Day
                </th>
                <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">
                  Period
                </th>
                <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">
                  Time
                </th>
                <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">
                  Class
                </th>
                <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">
                  Subject
                </th>
              </tr>
            </thead>
            <tbody>
              {teacherSchedule.map((row, i) => (
                <tr
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable index for read-only schedule rows
                  key={`row-${i}`}
                  className="border-t border-border/50 hover:bg-muted/20"
                >
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    {row.day}
                  </td>
                  <td className="px-4 py-2.5 text-foreground">
                    {row.period.label}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">
                    {row.period.startTime}–{row.period.endTime}
                  </td>
                  <td className="px-4 py-2.5 text-foreground">
                    Class {row.class_} - {row.section}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-primary">
                    {row.subject}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function TeacherTimetable() {
  const { currentSession, addNotification } = useApp();

  // ── Step 1 state ─────────────────────────────────────────────────────────────
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [splitPairs, setSplitPairs] = useState<SplitPair[]>([]);

  // ── Step 2 state ─────────────────────────────────────────────────────────────
  const [selectedDays, setSelectedDays] = useState<string[]>([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
  ]);
  const [periodsCount, setPeriodsCount] = useState(6);
  const [startTime, setStartTime] = useState("08:00");
  const [intervalMin, setIntervalMin] = useState(5);
  const [periodDurations, setPeriodDurations] = useState<number[]>(
    Array(8).fill(45),
  );

  // ── Generated state ───────────────────────────────────────────────────────────
  const [grids, setGrids] = useState<SectionGrid[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [savedList, setSavedList] = useState<SavedTimetable[]>(() =>
    ls.get<SavedTimetable[]>("teacher_timetables", []),
  );
  const [viewTab, setViewTab] = useState<"grids" | "combined" | "teacher">(
    "grids",
  );
  const [viewSaved, setViewSaved] = useState<SavedTimetable | null>(null);

  const sessionLabel = currentSession?.label ?? "2025-26";

  // ── Load assignments from HR staff ────────────────────────────────────────────
  useEffect(() => {
    const staffList = ls.get<Staff[]>("staff", []);
    const rows: TeacherAssignment[] = [];
    for (const staff of staffList) {
      if (!staff.subjects?.length) continue;
      for (const sa of staff.subjects) {
        const sections = expandSections(sa.classFrom, sa.classTo);
        rows.push({
          staffId: staff.id,
          teacherName: staff.name,
          subject: sa.subject,
          classFrom: sa.classFrom,
          classTo: sa.classTo,
          expandedSections: sections,
        });
      }
    }
    setAssignments(rows);
  }, []);

  const activePeriods = buildPeriods(
    periodsCount,
    startTime,
    periodDurations.slice(0, periodsCount),
    intervalMin,
  );

  // ── Section toggle ────────────────────────────────────────────────────────────
  const toggleSection = (key: string) => {
    setSelectedSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
    setGrids([]);
    setIsSaved(false);
  };

  // ── Split pair management ─────────────────────────────────────────────────────
  const addSplitPair = () => {
    setSplitPairs((prev) => [
      ...prev,
      { id: generateId(), subjectA: "", subjectB: "", class_: "", section: "" },
    ]);
  };

  const updateSplitPair = (
    id: string,
    field: keyof Omit<SplitPair, "id">,
    value: string,
  ) => {
    setSplitPairs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  };

  const removeSplitPair = (id: string) => {
    setSplitPairs((prev) => prev.filter((p) => p.id !== id));
  };

  // ── Period duration ───────────────────────────────────────────────────────────
  const updateDuration = (idx: number, val: number) => {
    setPeriodDurations((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  // ── Auto-generate timetable ───────────────────────────────────────────────────
  const generate = useCallback(() => {
    if (selectedSections.length === 0 || assignments.length === 0) return;

    // Build section grids
    const newGrids: SectionGrid[] = selectedSections.map((sectionKey) => {
      const classNum = sectionKey.slice(0, -1);
      const sec = sectionKey.slice(-1);
      const cells: (CellValue | null)[][] = selectedDays.map(() =>
        Array(periodsCount).fill(null),
      );
      return { class_: classNum, section: sec, cells };
    });

    // Track per-teacher per-day-period occupation: key = "staffId|dayIdx|periodIdx"
    const occupied = new Set<string>();

    // Helper: find next available assignment for a section on a given period
    // that doesn't conflict with occupied slots
    function findTeacher(
      classNum: string,
      sec: string,
      dayIdx: number,
      periodIdx: number,
      usedThisRow: Set<string>, // subjects already placed this row (day)
    ): CellValue | null {
      // Get applicable assignments for this class
      const sectionKey = `${classNum}${sec}`;
      const applicable = assignments.filter((a) =>
        a.expandedSections.includes(sectionKey),
      );
      if (applicable.length === 0) return null;

      // Check split pair logic
      const relevantPair = splitPairs.find(
        (p) => p.class_ === classNum && p.section === sec,
      );

      // Try each assignment in shuffled order
      const shuffled = [...applicable].sort(() => Math.random() - 0.5);
      for (const a of shuffled) {
        const conflictKey = `${a.staffId}|${dayIdx}|${periodIdx}`;
        if (occupied.has(conflictKey)) continue;

        // Apply split pair subject selection
        let subject = a.subject;
        if (relevantPair) {
          if (
            relevantPair.subjectA === a.subject ||
            relevantPair.subjectB === a.subject
          ) {
            subject = isMWF(dayIdx)
              ? relevantPair.subjectA
              : relevantPair.subjectB;
            // Check if another assignment teaches split subject
            const pairedSubject = isMWF(dayIdx)
              ? relevantPair.subjectA
              : relevantPair.subjectB;
            const pairedAssignment = applicable.find(
              (x) => x.subject === pairedSubject && x.staffId !== a.staffId,
            );
            if (pairedAssignment) {
              const pairedConflict = `${pairedAssignment.staffId}|${dayIdx}|${periodIdx}`;
              if (!occupied.has(pairedConflict) && !usedThisRow.has(subject)) {
                return {
                  teacherName: pairedAssignment.teacherName,
                  subject,
                  staffId: pairedAssignment.staffId,
                };
              }
              continue;
            }
          }
        }

        if (!usedThisRow.has(subject)) {
          return {
            teacherName: a.teacherName,
            subject,
            staffId: a.staffId,
          };
        }
      }
      return null;
    }

    // Fill grids: iterate day × period, fill each section
    for (let di = 0; di < selectedDays.length; di++) {
      for (let pi = 0; pi < periodsCount; pi++) {
        // Collect which teachers are globally assigned this slot (from already-filled grids)
        const slotOccupied = new Set<string>();
        for (const grid of newGrids) {
          const cell = grid.cells[di][pi];
          if (cell) slotOccupied.add(cell.staffId);
        }

        for (const grid of newGrids) {
          const usedThisDay = new Set<string>();
          for (let pj = 0; pj < pi; pj++) {
            const c = grid.cells[di][pj];
            if (c) usedThisDay.add(c.subject);
          }

          const cell = findTeacher(
            grid.class_,
            grid.section,
            di,
            pi,
            usedThisDay,
          );
          if (cell) {
            grid.cells[di][pi] = cell;
            occupied.add(`${cell.staffId}|${di}|${pi}`);
            slotOccupied.add(cell.staffId);
          }
        }
      }
    }

    setGrids(newGrids);
    setIsSaved(false);
    setViewTab("grids");
  }, [selectedSections, assignments, selectedDays, periodsCount, splitPairs]);

  // ── Cell change handler ───────────────────────────────────────────────────────
  const handleCellChange = useCallback(
    (
      class_: string,
      section: string,
      dayIdx: number,
      periodIdx: number,
      value: CellValue | null,
    ) => {
      setGrids((prev) =>
        prev.map((g) => {
          if (g.class_ !== class_ || g.section !== section) return g;
          const cells = g.cells.map((row) => [...row]);
          cells[dayIdx][periodIdx] = value;
          return { ...g, cells };
        }),
      );
      setIsSaved(false);
    },
    [],
  );

  // ── Save ──────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (grids.length === 0) return;
    const entry: SavedTimetable = {
      id: generateId(),
      sessionLabel,
      days: selectedDays,
      periods: activePeriods,
      intervalMinutes: intervalMin,
      sections: grids,
      splitPairs,
      savedAt: new Date().toISOString(),
    };
    const updated = [entry, ...savedList];
    ls.set("teacher_timetables", updated);
    setSavedList(updated);
    setIsSaved(true);
    addNotification(
      `Teacher timetable saved for ${sessionLabel}`,
      "success",
      "📆",
    );
  }, [
    grids,
    sessionLabel,
    selectedDays,
    activePeriods,
    intervalMin,
    splitPairs,
    savedList,
    addNotification,
  ]);

  // Ctrl+S shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  // ── Build class-section keys from stored data ─────────────────────────────────
  const classSectionData = ls.get<{ className: string; sections: string[] }[]>(
    "class_sections",
    [],
  );
  const allSectionKeys: string[] =
    classSectionData.length > 0
      ? classSectionData.flatMap((cs) =>
          cs.sections.map((sec) => `${cs.className}${sec}`),
        )
      : CLASSES.flatMap((c) => SECTIONS.slice(0, 3).map((s) => `${c}${s}`));

  const canGenerate =
    selectedSections.length > 0 &&
    assignments.length > 0 &&
    selectedDays.length > 0 &&
    periodsCount > 0;

  return (
    <div className="space-y-6">
      {/* ── Step 1: Setup ─────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
            1
          </span>
          <h2 className="font-semibold text-foreground">Class-Section Setup</h2>
        </div>

        {/* Section selector */}
        <div className="space-y-2">
          <Label>Select Class-Sections</Label>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-1.5 max-h-40 overflow-y-auto pr-1">
            {allSectionKeys.map((key) => (
              <label
                key={key}
                className={`flex items-center justify-center p-2 rounded-lg border cursor-pointer text-xs transition-smooth select-none ${
                  selectedSections.includes(key)
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selectedSections.includes(key)}
                  onChange={() => toggleSection(key)}
                  data-ocid={`tt-section-${key.toLowerCase()}`}
                />
                {key}
              </label>
            ))}
          </div>
        </div>

        {/* Teacher Assignments (loaded from HR) */}
        <div className="space-y-2">
          <Label>Teacher Assignments (from HR Staff records)</Label>
          {assignments.length === 0 ? (
            <div className="bg-muted/30 rounded-lg px-4 py-3 text-sm text-muted-foreground">
              No teacher subject assignments found. Add teachers with subject
              assignments in HR → Staff Directory.
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium">
                      Teacher
                    </th>
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium">
                      Subject
                    </th>
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium">
                      Classes
                    </th>
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium">
                      Sections
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a, i) => (
                    <tr
                      // biome-ignore lint/suspicious/noArrayIndexKey: stable index for read-only assignment display
                      key={i}
                      className="border-t border-border/50 hover:bg-muted/10"
                    >
                      <td className="px-3 py-2 font-medium text-foreground">
                        {a.teacherName}
                      </td>
                      <td className="px-3 py-2 text-foreground">{a.subject}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {a.classFrom} – {a.classTo}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {a.expandedSections.slice(0, 6).map((s) => (
                            <Badge
                              key={s}
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {s}
                            </Badge>
                          ))}
                          {a.expandedSections.length > 6 && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                            >
                              +{a.expandedSections.length - 6}
                            </Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Split Subject Pairs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Split-Subject Pairs (optional)</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={addSplitPair}
              data-ocid="tt-add-split"
            >
              + Add Pair
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Subject A on Mon/Wed/Fri, Subject B on Tue/Thu/Sat for a specific
            section
          </p>
          {splitPairs.map((pair) => (
            <div
              key={pair.id}
              className="grid grid-cols-2 md:grid-cols-5 gap-2 p-3 bg-muted/20 rounded-lg items-end"
            >
              <div className="space-y-1">
                <Label className="text-xs">Subject A (MWF)</Label>
                <Input
                  placeholder="e.g. Maths"
                  value={pair.subjectA}
                  onChange={(e) =>
                    updateSplitPair(pair.id, "subjectA", e.target.value)
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Subject B (TTS)</Label>
                <Input
                  placeholder="e.g. Science"
                  value={pair.subjectB}
                  onChange={(e) =>
                    updateSplitPair(pair.id, "subjectB", e.target.value)
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Class</Label>
                <select
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                  value={pair.class_}
                  onChange={(e) =>
                    updateSplitPair(pair.id, "class_", e.target.value)
                  }
                >
                  <option value="">—</option>
                  {CLASSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Section</Label>
                <select
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                  value={pair.section}
                  onChange={(e) =>
                    updateSplitPair(pair.id, "section", e.target.value)
                  }
                >
                  <option value="">—</option>
                  {SECTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => removeSplitPair(pair.id)}
                className="h-8 px-3 rounded-md bg-destructive/10 text-destructive text-xs hover:bg-destructive/20 transition-smooth"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Step 2: Period Configuration ──────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
            2
          </span>
          <h2 className="font-semibold text-foreground">
            Period Configuration
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Days */}
          <div className="col-span-2 md:col-span-4 space-y-2">
            <Label>Days of Week</Label>
            <div className="flex gap-2 flex-wrap">
              {ALL_DAYS.map((day) => (
                <label
                  key={day}
                  className={`px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-smooth select-none ${
                    selectedDays.includes(day)
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selectedDays.includes(day)}
                    onChange={() =>
                      setSelectedDays((prev) =>
                        prev.includes(day)
                          ? prev.filter((d) => d !== day)
                          : [...prev, day],
                      )
                    }
                  />
                  {day.slice(0, 3)}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Periods per Day</Label>
            <Input
              type="number"
              min={1}
              max={12}
              value={periodsCount}
              onChange={(e) => {
                const v = Math.max(1, Math.min(12, Number(e.target.value)));
                setPeriodsCount(v);
              }}
              data-ocid="tt-periods-count"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Start Time</Label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              data-ocid="tt-start-time"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Interval (min)</Label>
            <Input
              type="number"
              min={0}
              max={60}
              value={intervalMin}
              onChange={(e) =>
                setIntervalMin(Math.max(0, Number(e.target.value)))
              }
              data-ocid="tt-interval"
            />
          </div>
        </div>

        {/* Per-period duration */}
        <div className="space-y-2">
          <Label>Duration per Period (minutes)</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {Array.from({ length: periodsCount }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: index is period identifier
              <div key={i} className="space-y-1">
                <span className="text-xs text-muted-foreground">P{i + 1}</span>
                <Input
                  type="number"
                  min={10}
                  max={120}
                  value={periodDurations[i] ?? 45}
                  onChange={(e) =>
                    updateDuration(i, Math.max(10, Number(e.target.value)))
                  }
                  className="h-8 text-sm"
                  data-ocid={`tt-period-dur-${i}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Period timing preview */}
        <div className="space-y-2">
          <Label>Period Timing Preview</Label>
          <div className="flex flex-wrap gap-2">
            {activePeriods.map((p, i) => (
              <div key={p.index} className="flex items-center gap-1">
                <Badge variant="secondary" className="font-mono text-xs">
                  {p.label}: {p.startTime}–{p.endTime}
                </Badge>
                {i < activePeriods.length - 1 && intervalMin > 0 && (
                  <span className="text-muted-foreground text-xs">
                    [{intervalMin}m]
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Step 3: Generate & Edit ───────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
              3
            </span>
            <h2 className="font-semibold text-foreground">
              Generated Timetables
            </h2>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={generate}
              disabled={!canGenerate}
              data-ocid="tt-generate"
            >
              {grids.length > 0 ? "Re-Generate" : "Generate Timetable"}
            </Button>
            {grids.length > 0 && !isSaved && (
              <Button
                variant="outline"
                onClick={handleSave}
                className="border-accent text-accent hover:bg-accent/10"
                data-ocid="tt-save"
              >
                Save (Ctrl+S)
              </Button>
            )}
            {isSaved && (
              <Badge className="bg-accent/20 text-accent border-accent/30 px-3 py-1.5">
                ✓ Saved
              </Badge>
            )}
          </div>
        </div>

        {!canGenerate && (
          <p className="text-muted-foreground text-sm">
            Select class-sections, ensure HR staff have subject assignments,
            choose days and periods, then click Generate.
          </p>
        )}

        {grids.length > 0 && (
          <>
            {/* View tabs */}
            <div className="flex gap-1 bg-muted/40 rounded-lg p-1 w-fit">
              {(["grids", "combined", "teacher"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setViewTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-smooth ${
                    viewTab === tab
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "grids"
                    ? "Per Section"
                    : tab === "combined"
                      ? "Combined View"
                      : "Teacher View"}
                </button>
              ))}
            </div>

            {viewTab === "grids" && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {grids.map((grid) => (
                  <SectionCard
                    key={`${grid.class_}${grid.section}`}
                    grid={grid}
                    days={selectedDays}
                    periods={activePeriods}
                    saved={isSaved}
                    onCellChange={handleCellChange}
                  />
                ))}
              </div>
            )}

            {viewTab === "combined" && (
              <CombinedView
                sections={grids}
                days={selectedDays}
                periods={activePeriods}
                sessionLabel={sessionLabel}
              />
            )}

            {viewTab === "teacher" && (
              <TeacherWiseView
                sections={grids}
                days={selectedDays}
                periods={activePeriods}
                assignments={assignments}
              />
            )}
          </>
        )}
      </div>

      {/* ── Saved Timetables ─────────────────────────────────────────── */}
      {savedList.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-foreground">Saved Timetables</h2>
          <div className="space-y-2">
            {savedList.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/30 transition-smooth"
              >
                <div>
                  <p className="font-medium text-foreground">
                    Session: {entry.sessionLabel}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.days.length} days · {entry.periods.length} periods ·{" "}
                    {entry.sections.length} sections · Saved{" "}
                    {new Date(entry.savedAt).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setViewSaved(viewSaved?.id === entry.id ? null : entry)
                    }
                    data-ocid={`tt-view-saved-${entry.id}`}
                  >
                    {viewSaved?.id === entry.id ? "Hide" : "View"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      const updated = savedList.filter(
                        (e) => e.id !== entry.id,
                      );
                      ls.set("teacher_timetables", updated);
                      setSavedList(updated);
                      if (viewSaved?.id === entry.id) setViewSaved(null);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {viewSaved && (
            <div className="mt-4 space-y-4">
              <CombinedView
                sections={viewSaved.sections}
                days={viewSaved.days}
                periods={viewSaved.periods}
                sessionLabel={viewSaved.sessionLabel}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
