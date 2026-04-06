import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeftRight,
  BookOpen,
  ChevronRight,
  Download,
  GripVertical,
  Plus,
  Printer,
  RefreshCcw,
  Save,
  Shuffle,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClassSection {
  key: string; // e.g. "1_A"
  className: string; // e.g. "1"
  section: string; // e.g. "A"
  label: string; // e.g. "1 A"
}

interface TeacherAssignment {
  id: string;
  teacherName: string;
  classSection: string; // e.g. "1_A"
  subject: string;
}

interface SplitPair {
  id: string;
  subjectA: string; // Mon/Wed/Fri
  subjectB: string; // Tue/Thu/Sat
}

interface TimetableCell {
  teacher: string;
  subject: string;
  isSplitA?: boolean; // subjectA in the split pair
  splitPartner?: string; // teacher for Tue/Thu/Sat
  splitSubjectB?: string;
}

interface SectionTimetable {
  sectionKey: string;
  cells: Record<string, TimetableCell>; // key: "Mon_0", "Tue_2"
}

interface SavedTimetableSet {
  id: string;
  sections: string[]; // section keys included
  days: string[];
  periods: number;
  periodStart: string;
  periodDuration: number;
  periodDurations?: number[];
  intervalMinutes?: number;
  timetables: SectionTimetable[];
  savedAt: string;
}

interface DragData {
  source: "panel" | "cell";
  teacher: string;
  subject: string;
  fromSection?: string;
  fromCellKey?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ODD_DAYS = ["Mon", "Wed", "Fri"];
// Split-week even days (Tue/Thu/Sat) - used for split pair display only

const SUBJECT_COLORS: Record<number, string> = {
  0: "bg-indigo-600/30 border-indigo-500/50 text-indigo-200",
  1: "bg-violet-600/30 border-violet-500/50 text-violet-200",
  2: "bg-cyan-600/30 border-cyan-500/50 text-cyan-200",
  3: "bg-emerald-600/30 border-emerald-500/50 text-emerald-200",
  4: "bg-amber-600/30 border-amber-500/50 text-amber-200",
  5: "bg-rose-600/30 border-rose-500/50 text-rose-200",
  6: "bg-sky-600/30 border-sky-500/50 text-sky-200",
  7: "bg-teal-600/30 border-teal-500/50 text-teal-200",
};

const FALLBACK_SECTIONS: ClassSection[] = [
  "Nursery",
  "LKG",
  "UKG",
  ...Array.from({ length: 12 }, (_, i) => String(i + 1)),
].flatMap((cls) => {
  const sections = ["A", "B"];
  return sections.map((sec) => ({
    key: `${cls}_${sec}`,
    className: cls,
    section: sec,
    label: `${cls} ${sec}`,
  }));
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function calcPeriodTimes(
  startTime: string,
  durationMins: number,
  count: number,
  periodDurations?: number[],
  intervalMinutes?: number,
): { from: string; to: string }[] {
  const result: { from: string; to: string }[] = [];
  const [h, m] = startTime.split(":").map(Number);
  let total = h * 60 + m;
  const gap = intervalMinutes ?? 0;
  for (let i = 0; i < count; i++) {
    const dur =
      periodDurations && periodDurations[i] != null
        ? periodDurations[i]
        : durationMins;
    const from = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    total += dur;
    const to = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    result.push({ from, to });
    total += gap; // add interval after each period
  }
  return result;
}

function buildSubjectColorMap(
  assignments: TeacherAssignment[],
): Record<string, string> {
  const map: Record<string, string> = {};
  let idx = 0;
  for (const a of assignments) {
    if (!map[a.subject]) {
      map[a.subject] = SUBJECT_COLORS[idx % 8];
      idx++;
    }
  }
  return map;
}

/** Fisher-Yates shuffle in place */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isOddDay(day: string): boolean {
  return ODD_DAYS.includes(day);
}

// ─── Auto-generate algorithm ──────────────────────────────────────────────────

function generateSectionTimetables(
  selectedSections: string[],
  assignments: TeacherAssignment[],
  splitPairs: SplitPair[],
  days: string[],
  periodsPerDay: number,
): SectionTimetable[] {
  const orderedDays = ALL_DAYS.filter((d) => days.includes(d));

  // Track which teachers are used per period across ALL sections (conflict prevention)
  // teacherPeriodMap[periodIdx] = Set<teacherName>
  const teacherPeriodMap: Map<number, Set<string>> = new Map();
  for (let p = 0; p < periodsPerDay; p++) {
    teacherPeriodMap.set(p, new Set());
  }

  const result: SectionTimetable[] = [];

  // Build a fast lookup: splitPairs keyed by subjectA and subjectB
  const splitBySubjectA: Record<string, SplitPair> = {};
  const splitBySubjectB: Record<string, SplitPair> = {};
  for (const pair of splitPairs) {
    if (pair.subjectA) splitBySubjectA[pair.subjectA] = pair;
    if (pair.subjectB) splitBySubjectB[pair.subjectB] = pair;
  }

  for (const sectionKey of selectedSections) {
    const sectionAssignments = assignments.filter(
      (a) =>
        a.teacherName.trim() &&
        a.subject.trim() &&
        (a.classSection === sectionKey || a.classSection === ""),
    );

    if (sectionAssignments.length === 0) {
      result.push({ sectionKey, cells: {} });
      continue;
    }

    const cells: Record<string, TimetableCell> = {};

    // Create a shuffled pool of assignments
    const pool = shuffle(sectionAssignments);

    // Per-period, per-day assignment
    for (let p = 0; p < periodsPerDay; p++) {
      const periodOccupied = teacherPeriodMap.get(p)!;
      // For this period, shuffle pool and try to assign one per day
      const dayPool = shuffle(pool);
      let poolCursor = 0;

      for (const day of orderedDays) {
        const key = `${day}_${p}`;
        let placed = false;
        let attempts = 0;

        while (!placed && attempts < dayPool.length * 2) {
          const candidate = dayPool[poolCursor % dayPool.length];
          poolCursor++;
          attempts++;

          // Check if this candidate's teacher is already in this period for another section
          if (periodOccupied.has(candidate.teacherName)) {
            continue;
          }

          // Check if it's a split subject
          const splitA = splitBySubjectA[candidate.subject];
          const splitB = splitBySubjectB[candidate.subject];

          if (splitA) {
            // This is the A-side of a split pair
            // Find the B-side teacher assignment
            const partnerAssign = sectionAssignments.find(
              (a) => a.subject === splitA.subjectB,
            );
            if (
              partnerAssign &&
              !periodOccupied.has(partnerAssign.teacherName)
            ) {
              // Place on Mon/Wed/Fri show subjectA, Tue/Thu/Sat show subjectB
              // We store the cell as a split cell
              cells[key] = {
                teacher: isOddDay(day)
                  ? candidate.teacherName
                  : partnerAssign.teacherName,
                subject: isOddDay(day) ? candidate.subject : splitA.subjectB,
                isSplitA: isOddDay(day),
                splitPartner: partnerAssign.teacherName,
                splitSubjectB: splitA.subjectB,
              };
              periodOccupied.add(candidate.teacherName);
              if (partnerAssign.teacherName !== candidate.teacherName) {
                periodOccupied.add(partnerAssign.teacherName);
              }
              placed = true;
            }
          } else if (!splitB) {
            // Normal (non-split) assignment
            cells[key] = {
              teacher: candidate.teacherName,
              subject: candidate.subject,
            };
            periodOccupied.add(candidate.teacherName);
            placed = true;
          }
          // If it's a splitB subject, skip here — it'll be handled via splitA
        }

        // Fallback: place the first available teacher even if there's a conflict
        if (!placed && dayPool.length > 0) {
          const fallback = dayPool[0];
          cells[key] = {
            teacher: fallback.teacherName,
            subject: fallback.subject,
          };
          periodOccupied.add(fallback.teacherName);
        }
      }
    }

    result.push({ sectionKey, cells });
  }

  return result;
}

// ─── Sub-component: AssignmentRow ─────────────────────────────────────────────

interface AssignmentRowProps {
  row: TeacherAssignment;
  teacherSuggestions: string[];
  subjectSuggestions: string[];
  classSections: ClassSection[];
  onChange: (id: string, field: keyof TeacherAssignment, value: string) => void;
  onRemove: (id: string) => void;
}

function AssignmentRow({
  row,
  teacherSuggestions,
  subjectSuggestions,
  classSections,
  onChange,
  onRemove,
}: AssignmentRowProps) {
  const [teacherInput, setTeacherInput] = useState(row.teacherName);
  const [subjectInput, setSubjectInput] = useState(row.subject);
  const [teacherSugOpen, setTeacherSugOpen] = useState(false);
  const [subjectSugOpen, setSubjectSugOpen] = useState(false);

  const filteredTeachers = teacherSuggestions.filter(
    (t) =>
      teacherInput.length > 0 &&
      t.toLowerCase().includes(teacherInput.toLowerCase()),
  );
  const filteredSubjects = subjectSuggestions.filter(
    (s) =>
      subjectInput.length > 0 &&
      s.toLowerCase().includes(subjectInput.toLowerCase()),
  );

  return (
    <div className="flex items-start gap-2 p-3 bg-gray-800/60 rounded-lg border border-gray-700/50 hover:border-gray-600/70 transition-colors">
      {/* Teacher input */}
      <div className="relative flex-1 min-w-0">
        <Label className="text-[10px] text-gray-400 mb-1 block">Teacher</Label>
        <Input
          value={teacherInput}
          onChange={(e) => {
            setTeacherInput(e.target.value);
            onChange(row.id, "teacherName", e.target.value);
            setTeacherSugOpen(true);
          }}
          onFocus={() => setTeacherSugOpen(true)}
          onBlur={() => setTimeout(() => setTeacherSugOpen(false), 150)}
          placeholder="Teacher name"
          className="bg-gray-900 border-gray-600 text-white text-xs h-8 placeholder:text-gray-500"
          data-ocid="teacher.timetable.input"
        />
        {teacherSugOpen && filteredTeachers.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-xl max-h-36 overflow-y-auto">
            {filteredTeachers.map((t) => (
              <button
                key={t}
                type="button"
                className="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-indigo-600/40 transition-colors"
                onMouseDown={() => {
                  setTeacherInput(t);
                  onChange(row.id, "teacherName", t);
                  setTeacherSugOpen(false);
                }}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Class-Section selector */}
      <div className="w-28 shrink-0">
        <Label className="text-[10px] text-gray-400 mb-1 block">
          Class-Section
        </Label>
        <Select
          value={row.classSection || ""}
          onValueChange={(v) => onChange(row.id, "classSection", v)}
        >
          <SelectTrigger
            className="bg-gray-900 border-gray-600 text-white text-xs h-8"
            data-ocid="teacher.timetable.select"
          >
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600 max-h-48 overflow-y-auto">
            {classSections.map((cs) => (
              <SelectItem
                key={cs.key}
                value={cs.key}
                className="text-gray-200 text-xs focus:bg-indigo-600/40"
              >
                {cs.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subject input */}
      <div className="relative flex-1 min-w-0">
        <Label className="text-[10px] text-gray-400 mb-1 block">Subject</Label>
        <Input
          value={subjectInput}
          onChange={(e) => {
            setSubjectInput(e.target.value);
            onChange(row.id, "subject", e.target.value);
            setSubjectSugOpen(true);
          }}
          onFocus={() => setSubjectSugOpen(true)}
          onBlur={() => setTimeout(() => setSubjectSugOpen(false), 150)}
          placeholder="Subject"
          className="bg-gray-900 border-gray-600 text-white text-xs h-8 placeholder:text-gray-500"
          data-ocid="teacher.timetable.input"
        />
        {subjectSugOpen && filteredSubjects.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-xl max-h-36 overflow-y-auto">
            {filteredSubjects.map((s) => (
              <button
                key={s}
                type="button"
                className="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-indigo-600/40 transition-colors"
                onMouseDown={() => {
                  setSubjectInput(s);
                  onChange(row.id, "subject", s);
                  setSubjectSugOpen(false);
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Remove */}
      <div className="pt-5">
        <button
          type="button"
          onClick={() => onRemove(row.id)}
          className="text-gray-500 hover:text-red-400 transition-colors p-1"
          data-ocid="teacher.timetable.delete_button"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Sub-component: SectionCard ───────────────────────────────────────────────

interface SectionCardProps {
  sectionKey: string;
  sectionLabel: string;
  timetable: SectionTimetable;
  days: string[];
  periodTimes: { from: string; to: string }[];
  subjectColorMap: Record<string, string>;
  onCellUpdate: (
    sectionKey: string,
    cells: Record<string, TimetableCell>,
  ) => void;
}

function SectionCard({
  sectionKey,
  sectionLabel,
  timetable,
  days,
  periodTimes,
  subjectColorMap,
  onCellUpdate,
}: SectionCardProps) {
  const [localCells, setLocalCells] = useState<Record<string, TimetableCell>>(
    timetable.cells,
  );
  const [dragData, setDragData] = useState<DragData | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  // Keep in sync when parent regenerates
  useEffect(() => {
    setLocalCells(timetable.cells);
  }, [timetable.cells]);

  const orderedDays = ALL_DAYS.filter((d) => days.includes(d));
  const emptyCount = Object.keys(localCells).length;
  const totalCells = orderedDays.length * periodTimes.length;
  const hasAny = Object.keys(timetable.cells).length > 0;

  function handleCellDragStart(cellKey: string) {
    const cell = localCells[cellKey];
    if (!cell) return;
    setDragData({
      source: "cell",
      teacher: cell.teacher,
      subject: cell.subject,
      fromSection: sectionKey,
      fromCellKey: cellKey,
    });
  }

  function handleCellDrop(e: React.DragEvent, targetKey: string) {
    e.preventDefault();
    if (!dragData || dragData.fromSection !== sectionKey) return;
    const updated = { ...localCells };
    const srcKey = dragData.fromCellKey!;
    const srcVal = localCells[srcKey];
    const tgtVal = localCells[targetKey];
    if (srcVal) updated[targetKey] = srcVal;
    else delete updated[targetKey];
    if (tgtVal) updated[srcKey] = tgtVal;
    else delete updated[srcKey];
    setLocalCells(updated);
    onCellUpdate(sectionKey, updated);
    setDragData(null);
    setDragOverKey(null);
  }

  function clearCell(key: string) {
    const updated = { ...localCells };
    delete updated[key];
    setLocalCells(updated);
    onCellUpdate(sectionKey, updated);
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800/80 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-400" />
          <span className="text-sm font-semibold text-white">
            Class {sectionLabel}
          </span>
        </div>
        <Badge
          variant="outline"
          className="border-indigo-500/40 text-indigo-300 text-[10px]"
        >
          {emptyCount}/{totalCells} filled
        </Badge>
      </div>

      {!hasAny ? (
        <div className="flex items-center justify-center h-24 text-xs text-gray-600 italic px-4 text-center">
          No teacher assignments for this section. Add assignments in Step 1.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table
            className="border-collapse w-full text-xs"
            data-ocid="teacher.timetable.table"
          >
            <thead>
              <tr>
                <th className="w-20 px-2 py-1.5 bg-gray-900/40 border border-gray-700/50 text-gray-400 text-left font-medium">
                  Day
                </th>
                {periodTimes.map((pt, i) => (
                  <th
                    key={pt.from}
                    className="px-2 py-1.5 bg-gray-900/40 border border-gray-700/50 text-indigo-300 text-center font-medium min-w-[90px]"
                  >
                    P{i + 1}
                    <div className="text-[9px] text-gray-500 font-normal whitespace-nowrap">
                      {pt.from}–{pt.to}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orderedDays.map((day, di) => (
                <tr
                  key={day}
                  className={di % 2 === 0 ? "bg-gray-900/20" : "bg-gray-800/20"}
                >
                  <td className="px-2 py-1.5 border border-gray-700/50 font-semibold text-indigo-300">
                    {day}
                  </td>
                  {periodTimes.map((_, pi) => {
                    const key = `${day}_${pi}`;
                    const cell = localCells[key];
                    const colorCls = cell
                      ? subjectColorMap[cell.subject] || SUBJECT_COLORS[0]
                      : "";
                    const isDragOver = dragOverKey === key;
                    return (
                      <td
                        key={key}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverKey(key);
                        }}
                        onDrop={(e) => handleCellDrop(e, key)}
                        onDragLeave={() => setDragOverKey(null)}
                        className={`border border-gray-700/50 p-1 align-top transition-all ${
                          isDragOver
                            ? "bg-indigo-600/20 outline outline-2 outline-indigo-400/60"
                            : ""
                        }`}
                        data-ocid={`teacher.timetable.item.${pi + 1}`}
                      >
                        {cell ? (
                          <div
                            draggable
                            onDragStart={() => handleCellDragStart(key)}
                            onDragEnd={() => {
                              setDragData(null);
                              setDragOverKey(null);
                            }}
                            className={`group relative rounded px-1.5 py-1 border text-[10px] cursor-grab active:cursor-grabbing select-none ${colorCls}`}
                            data-ocid="teacher.timetable.drag_handle"
                          >
                            <button
                              type="button"
                              onClick={() => clearCell(key)}
                              className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 text-current hover:text-red-300 transition-opacity p-0.5"
                              data-ocid="teacher.timetable.delete_button"
                            >
                              <X size={8} />
                            </button>
                            <div className="font-semibold leading-tight truncate pr-3">
                              {cell.teacher}
                            </div>
                            <div className="opacity-80 truncate">
                              {cell.subject}
                            </div>
                            {cell.isSplitA !== undefined && (
                              <div className="text-[8px] opacity-60">
                                {isOddDay(day) ? "MWF" : "TThS"}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-10 flex items-center justify-center border border-dashed border-gray-700/40 rounded text-[9px] text-gray-700">
                            {isDragOver ? (
                              <span className="text-indigo-400">Drop</span>
                            ) : (
                              "—"
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TeacherTimetable() {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // ── Step 1 state ──────────────────────────────────────────────────────────────
  const [availableSections, setAvailableSections] = useState<ClassSection[]>(
    [],
  );
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([
    { id: uid(), teacherName: "", classSection: "", subject: "" },
  ]);
  const [splitPairs, setSplitPairs] = useState<SplitPair[]>([]);

  // ── Step 2 state ──────────────────────────────────────────────────────────────
  const [selectedDays, setSelectedDays] = useState<string[]>([
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
  ]);
  const [periodsPerDay, setPeriodsPerDay] = useState(8);
  const [periodStart, setPeriodStart] = useState("08:00");
  const [periodDuration, _setPeriodDuration] = useState(45); // fallback/default
  const [periodDurations, setPeriodDurations] = useState<number[]>(
    Array(8).fill(45),
  );
  const [intervalMinutes, setIntervalMinutes] = useState(5);

  // ── Step 3 state ──────────────────────────────────────────────────────────────
  const [sectionTimetables, setSectionTimetables] = useState<
    SectionTimetable[]
  >([]);
  const [generated, setGenerated] = useState(false);

  // ── Saved state ───────────────────────────────────────────────────────────────
  const [savedSets, setSavedSets] = useState<SavedTimetableSet[]>([]);

  // ── External data ─────────────────────────────────────────────────────────────
  const [staffList, setStaffList] = useState<string[]>([]);
  const [subjectListFromStorage, setSubjectListFromStorage] = useState<
    string[]
  >([]);

  // ── Teacher-wise view ─────────────────────────────────────────────────────────
  const [selectedTeacherView, setSelectedTeacherView] = useState("");

  // Load from localStorage
  useEffect(() => {
    try {
      const staff = JSON.parse(
        localStorage.getItem("erp_staff") || "[]",
      ) as Array<{
        name: string;
      }>;
      setStaffList(staff.map((s) => s.name).filter(Boolean));
    } catch {
      /* ignore */
    }

    try {
      const subs = JSON.parse(
        localStorage.getItem("erp_subjects") || "[]",
      ) as Array<{
        name: string;
        class?: string;
        teacher?: string;
      }>;
      setSubjectListFromStorage(subs.map((s) => s.name).filter(Boolean));

      // Auto-populate assignments from subject-teacher-class mappings (legacy fallback)
      const legacyAssignments: TeacherAssignment[] = subs
        .filter((s) => s.name && s.teacher)
        .map((s) => ({
          id: uid(),
          teacherName: s.teacher || "",
          classSection: s.class ? `${s.class.replace("Class ", "")}_A` : "",
          subject: s.name,
        }));

      // Primary: load from erp_teacher_subject_assignments (set by HR wizard)
      try {
        const CLASS_ORDER = [
          "Nursery",
          "LKG",
          "UKG",
          "1",
          "2",
          "3",
          "4",
          "5",
          "6",
          "7",
          "8",
          "9",
          "10",
          "11",
          "12",
        ];
        const teacherSubjectData = JSON.parse(
          localStorage.getItem("erp_teacher_subject_assignments") || "[]",
        ) as Array<{
          teacherId: number;
          teacherName: string;
          assignments: Array<{
            subject: string;
            classFrom: string;
            classTo: string;
          }>;
        }>;

        if (teacherSubjectData.length > 0) {
          // Load available sections for range expansion
          let sectionsList: string[] = ["A", "B", "C"];
          try {
            const sectionsRaw = JSON.parse(
              localStorage.getItem("erp_sections") || "[]",
            ) as Array<{ section?: string }>;
            if (sectionsRaw.length > 0) {
              sectionsList = [
                ...new Set(
                  sectionsRaw.map((s) => s.section).filter(Boolean) as string[],
                ),
              ];
              if (sectionsList.length === 0) sectionsList = ["A"];
            }
          } catch {
            /* ignore */
          }

          const expanded: TeacherAssignment[] = [];
          const seen = new Set<string>();

          for (const teacherRecord of teacherSubjectData) {
            for (const asgn of teacherRecord.assignments) {
              if (!asgn.subject) continue;
              const fromIdx = CLASS_ORDER.indexOf(asgn.classFrom);
              const toIdx = CLASS_ORDER.indexOf(asgn.classTo);
              const startIdx = fromIdx >= 0 ? fromIdx : 0;
              const endIdx = toIdx >= 0 ? toIdx : startIdx;
              for (let ci = startIdx; ci <= endIdx; ci++) {
                const cls = CLASS_ORDER[ci];
                for (const sec of sectionsList) {
                  const csKey = `${cls}_${sec}`;
                  const dedupeKey = `${teacherRecord.teacherName}||${csKey}||${asgn.subject}`;
                  if (!seen.has(dedupeKey)) {
                    seen.add(dedupeKey);
                    expanded.push({
                      id: uid(),
                      teacherName: teacherRecord.teacherName,
                      classSection: csKey,
                      subject: asgn.subject,
                    });
                  }
                }
              }
            }
          }

          if (expanded.length > 0) {
            setAssignments(expanded);
          } else if (legacyAssignments.length > 0) {
            setAssignments(legacyAssignments);
          }
        } else if (legacyAssignments.length > 0) {
          setAssignments(legacyAssignments);
        }
      } catch {
        if (legacyAssignments.length > 0) {
          setAssignments(legacyAssignments);
        }
      }
    } catch {
      /* ignore */
    }

    try {
      const classes = JSON.parse(
        localStorage.getItem("erp_classes") || "[]",
      ) as Array<{
        name: string;
        sections?: string[];
      }>;
      if (classes.length > 0) {
        const sections: ClassSection[] = classes.flatMap((cls) => {
          const secs =
            cls.sections && cls.sections.length > 0 ? cls.sections : ["A"];
          return secs.map((sec) => ({
            key: `${cls.name}_${sec}`,
            className: cls.name,
            section: sec,
            label: `${cls.name} ${sec}`,
          }));
        });
        setAvailableSections(sections);
      } else {
        setAvailableSections(FALLBACK_SECTIONS);
      }
    } catch {
      setAvailableSections(FALLBACK_SECTIONS);
    }

    try {
      const saved = JSON.parse(
        localStorage.getItem("erp_teacher_timetable_v2") || "[]",
      ) as SavedTimetableSet[];
      setSavedSets(saved);
    } catch {
      /* ignore */
    }
  }, []);

  // Period timings
  const periodTimes = useMemo(
    () =>
      calcPeriodTimes(
        periodStart,
        periodDuration,
        periodsPerDay,
        periodDurations,
        intervalMinutes,
      ),
    [
      periodStart,
      periodDuration,
      periodsPerDay,
      periodDurations,
      intervalMinutes,
    ],
  );

  // Subject color map
  const subjectColorMap = useMemo(
    () => buildSubjectColorMap(assignments),
    [assignments],
  );

  // All unique subjects from assignments
  const allSubjectsInAssignments = useMemo(
    () => [...new Set(assignments.map((a) => a.subject).filter(Boolean))],
    [assignments],
  );

  // All unique teacher names
  const allTeacherNames = useMemo(
    () => [...new Set(assignments.map((a) => a.teacherName).filter(Boolean))],
    [assignments],
  );

  const orderedSelectedDays = ALL_DAYS.filter((d) => selectedDays.includes(d));

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function toggleSection(key: string) {
    setSelectedSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  function selectAllSections() {
    setSelectedSections(availableSections.map((s) => s.key));
  }

  function deselectAllSections() {
    setSelectedSections([]);
  }

  function addAssignmentRow() {
    setAssignments((prev) => [
      ...prev,
      { id: uid(), teacherName: "", classSection: "", subject: "" },
    ]);
  }

  function updateAssignment(
    id: string,
    field: keyof TeacherAssignment,
    value: string,
  ) {
    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)),
    );
  }

  function removeAssignment(id: string) {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  }

  function addSplitPair() {
    setSplitPairs((prev) => [
      ...prev,
      { id: uid(), subjectA: "", subjectB: "" },
    ]);
  }

  function updateSplitPair(
    id: string,
    field: "subjectA" | "subjectB",
    value: string,
  ) {
    setSplitPairs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  }

  function removeSplitPair(id: string) {
    setSplitPairs((prev) => prev.filter((p) => p.id !== id));
  }

  function toggleDay(day: string) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  function doGenerate() {
    if (selectedSections.length === 0) {
      toast.error("Select at least one class-section in Step 1.");
      return;
    }
    if (selectedDays.length === 0) {
      toast.error("Select at least one working day.");
      return;
    }
    const validAssignments = assignments.filter(
      (a) => a.teacherName.trim() && a.subject.trim(),
    );
    if (validAssignments.length === 0) {
      toast.error("Add at least one teacher-subject assignment.");
      return;
    }

    const result = generateSectionTimetables(
      selectedSections,
      validAssignments,
      splitPairs.filter((p) => p.subjectA && p.subjectB),
      selectedDays,
      periodsPerDay,
    );

    setSectionTimetables(result);
    setGenerated(true);
    setStep(3);
    toast.success(`Generated timetables for ${result.length} section(s).`);
  }

  function onCellUpdate(
    sectionKey: string,
    cells: Record<string, TimetableCell>,
  ) {
    setSectionTimetables((prev) =>
      prev.map((st) => (st.sectionKey === sectionKey ? { ...st, cells } : st)),
    );
  }

  const saveTimetable = useCallback(() => {
    if (!generated || sectionTimetables.length === 0) {
      toast.error("Generate timetable first.");
      return;
    }
    const entry: SavedTimetableSet = {
      id: uid(),
      sections: selectedSections,
      days: orderedSelectedDays,
      periods: periodsPerDay,
      periodStart,
      periodDuration,
      periodDurations,
      intervalMinutes,
      timetables: sectionTimetables,
      savedAt: new Date().toLocaleString("en-IN"),
    };
    setSavedSets((prev) => {
      const updated = [...prev, entry];
      try {
        localStorage.setItem(
          "erp_teacher_timetable_v2",
          JSON.stringify(updated),
        );
      } catch {
        /* ignore */
      }
      return updated;
    });
    toast.success(
      `Timetable saved for ${sectionTimetables.length} section(s)!`,
    );
  }, [
    generated,
    sectionTimetables,
    selectedSections,
    orderedSelectedDays,
    periodsPerDay,
    periodStart,
    periodDuration,
    periodDurations,
    intervalMinutes,
  ]);

  const saveTimetableRef = useRef(saveTimetable);
  saveTimetableRef.current = saveTimetable;

  // Ctrl+S
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveTimetableRef.current();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function deleteSavedSet(id: string) {
    setSavedSets((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      try {
        localStorage.setItem(
          "erp_teacher_timetable_v2",
          JSON.stringify(updated),
        );
      } catch {
        /* ignore */
      }
      return updated;
    });
    toast.success("Timetable set deleted.");
  }

  // ── Print helpers ─────────────────────────────────────────────────────────────

  function printTimetableSet(set: SavedTimetableSet) {
    const schoolProfile = (() => {
      try {
        return JSON.parse(
          localStorage.getItem("erp_school_profile") || "{}",
        ) as { name?: string; address?: string };
      } catch {
        return {};
      }
    })();
    const schoolName = schoolProfile.name || "School";
    const times = calcPeriodTimes(
      set.periodStart,
      set.periodDuration,
      set.periods,
      set.periodDurations,
      set.intervalMinutes,
    );

    const sectionHTML = set.timetables
      .map((st) => {
        const buildCell = (day: string, pi: number) => {
          const cell = st.cells[`${day}_${pi}`];
          return `<td style="border:1px solid #ddd;padding:4px 8px;text-align:center;min-width:80px">${cell ? `<b>${cell.teacher}</b><br/><small>${cell.subject}</small>` : "—"}</td>`;
        };
        const rows = set.days
          .map((day) => {
            const dataCols = Array.from({ length: set.periods }, (_, pi) =>
              buildCell(day, pi),
            ).join("");
            return `<tr><td style="border:1px solid #ddd;padding:4px 8px;background:#f0f0f0;font-weight:600">${day}</td>${dataCols}</tr>`;
          })
          .join("");
        const headerCols = Array.from(
          { length: set.periods },
          (_, pi) =>
            `<th style="border:1px solid #ddd;padding:4px 8px;background:#e8eaf6">P${pi + 1}<br/><small>${times[pi].from}–${times[pi].to}</small></th>`,
        ).join("");
        return `<h3 style="margin:16px 0 4px">Class ${st.sectionKey.replace("_", " ")}</h3><table style="border-collapse:collapse;width:100%"><thead><tr><th style="border:1px solid #ddd;padding:4px 8px;background:#e8eaf6">Day</th>${headerCols}</tr></thead><tbody>${rows}</tbody></table>`;
      })
      .join("");

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(
      `<!DOCTYPE html><html><head><title>Teacher Timetable</title><style>body{font-family:Arial,sans-serif;padding:20px}h2{text-align:center}@media print{button{display:none}}</style></head><body><h2>${schoolName}</h2><p style="text-align:center">Teacher Class Timetable | Saved: ${set.savedAt}</p>${sectionHTML}<br/><button onclick="window.print()">🖨 Print</button></body></html>`,
    );
    win.document.close();
  }

  function printCombinedView(
    timetables: SectionTimetable[],
    days: string[],
    periods: number,
    pStart: string,
    pDur: number,
    pDurations?: number[],
    pInterval?: number,
  ) {
    const schoolProfile = (() => {
      try {
        return JSON.parse(
          localStorage.getItem("erp_school_profile") || "{}",
        ) as { name?: string };
      } catch {
        return {};
      }
    })();
    const schoolName = schoolProfile.name || "School";
    const times = calcPeriodTimes(pStart, pDur, periods, pDurations, pInterval);
    const ordDays = ALL_DAYS.filter((d) => days.includes(d));
    const sectionKeys = timetables.map((t) => t.sectionKey);

    const headerCols = sectionKeys
      .map(
        (sk) =>
          `<th style="border:1px solid #ddd;padding:4px 8px;background:#e8eaf6">${sk.replace("_", " ")}</th>`,
      )
      .join("");
    const rows = ordDays
      .flatMap((day) =>
        Array.from({ length: periods }, (_, pi) => {
          const cells = sectionKeys
            .map((sk) => {
              const tt = timetables.find((t) => t.sectionKey === sk);
              const cell = tt?.cells[`${day}_${pi}`];
              return `<td style="border:1px solid #ddd;padding:4px 8px;text-align:center;font-size:11px">${cell ? `${cell.teacher}<br/><small>${cell.subject}</small>` : "—"}</td>`;
            })
            .join("");
          return `<tr><td style="border:1px solid #ddd;padding:4px 8px;font-weight:600">${day}</td><td style="border:1px solid #ddd;padding:4px 8px;background:#f9f9f9">P${pi + 1} ${times[pi].from}–${times[pi].to}</td>${cells}</tr>`;
        }),
      )
      .join("");

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(
      `<!DOCTYPE html><html><head><title>Combined Timetable</title><style>body{font-family:Arial,sans-serif;padding:20px}h2{text-align:center}@media print{button{display:none}}</style></head><body><h2>${schoolName}</h2><p style="text-align:center">Combined Teacher Timetable</p><table style="border-collapse:collapse;width:100%"><thead><tr><th style="border:1px solid #ddd;padding:4px 8px;background:#e8eaf6">Day</th><th style="border:1px solid #ddd;padding:4px 8px;background:#e8eaf6">Period</th>${headerCols}</tr></thead><tbody>${rows}</tbody></table><br/><button onclick="window.print()">🖨 Print</button></body></html>`,
    );
    win.document.close();
  }

  function exportCSV(
    timetables: SectionTimetable[],
    days: string[],
    periods: number,
  ) {
    const ordDays = ALL_DAYS.filter((d) => days.includes(d));
    const sectionKeys = timetables.map((t) => t.sectionKey);
    const header = [
      "Day",
      "Period",
      ...sectionKeys.map((sk) => sk.replace("_", " ")),
    ].join(",");
    const dataRows = ordDays.flatMap((day) =>
      Array.from({ length: periods }, (_, pi) => {
        const cells = sectionKeys.map((sk) => {
          const tt = timetables.find((t) => t.sectionKey === sk);
          const cell = tt?.cells[`${day}_${pi}`];
          return cell ? `"${cell.teacher} / ${cell.subject}"` : "—";
        });
        return [day, `P${pi + 1}`, ...cells].join(",");
      }),
    );
    const csv = [header, ...dataRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "teacher_timetable_combined.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Section label helper ──────────────────────────────────────────────────────
  function getSectionLabel(key: string): string {
    const sec = availableSections.find((s) => s.key === key);
    return sec ? sec.label : key.replace("_", " ");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-6">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/20 rounded-lg border border-indigo-500/30">
            <BookOpen size={20} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Teacher Class Timetable
            </h1>
            <p className="text-xs text-gray-400">
              Multi-section wizard with conflict-free auto-generation &amp;
              drag-drop rearrangement
            </p>
          </div>
        </div>
        {generated && (
          <Badge
            variant="outline"
            className="border-emerald-500/40 text-emerald-400"
          >
            {sectionTimetables.length}/{selectedSections.length} sections
            generated
          </Badge>
        )}
      </div>

      {/* Step indicators */}
      <div
        className="flex items-center gap-0 mb-6"
        data-ocid="teacher.timetable.panel"
      >
        {([1, 2, 3] as const).map((s) => {
          const labels = [
            "",
            "Setup & Assignments",
            "Period Config",
            "Timetable Grid",
          ];
          const active = step === s;
          const done = step > s;
          return (
            <div key={s} className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  if (s < step || done) setStep(s);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  active
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40"
                    : done
                      ? "bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30"
                      : "bg-gray-800/80 text-gray-500"
                }`}
                data-ocid="teacher.timetable.tab"
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    active
                      ? "bg-white text-indigo-700"
                      : done
                        ? "bg-indigo-400 text-white"
                        : "bg-gray-700 text-gray-400"
                  }`}
                >
                  {done ? "✓" : s}
                </span>
                {labels[s]}
              </button>
              {s < 3 && (
                <ChevronRight
                  size={14}
                  className={`mx-1 ${step > s ? "text-indigo-500" : "text-gray-700"}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ═══ STEP 1 ═══════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="space-y-5">
          {/* A: Class-Section Selection */}
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                  A
                </span>
                Class-Section Selection
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAllSections}
                  className="text-xs text-indigo-300 hover:text-indigo-200 h-7"
                  data-ocid="teacher.timetable.button"
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deselectAllSections}
                  className="text-xs text-gray-400 hover:text-gray-300 h-7"
                  data-ocid="teacher.timetable.button"
                >
                  Deselect All
                </Button>
                <Badge
                  variant="outline"
                  className="border-indigo-500/40 text-indigo-300 text-[10px]"
                >
                  {selectedSections.length} selected
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
              {availableSections.map((sec) => {
                const checked = selectedSections.includes(sec.key);
                const checkId = `sec-check-${sec.key}`;
                return (
                  <label
                    key={sec.key}
                    htmlFor={checkId}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-xs cursor-pointer transition-all ${
                      checked
                        ? "bg-indigo-600/25 border-indigo-500/50 text-indigo-200"
                        : "bg-gray-900/40 border-gray-700/50 text-gray-400 hover:border-gray-600"
                    }`}
                    data-ocid="teacher.timetable.checkbox"
                  >
                    <Checkbox
                      id={checkId}
                      checked={checked}
                      onCheckedChange={() => toggleSection(sec.key)}
                      className="border-gray-600 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 w-3 h-3"
                    />
                    <span className="select-none font-medium">{sec.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* B: Teacher Assignments */}
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                  B
                </span>
                Teacher Assignments
              </h3>
              <div className="flex items-center gap-2">
                {staffList.length === 0 && (
                  <span className="text-[10px] text-amber-400">
                    ⚠ No staff in HR — enter names manually
                  </span>
                )}
                <Badge
                  variant="outline"
                  className="border-emerald-500/40 text-emerald-300 text-[10px]"
                >
                  {assignments.filter((a) => a.teacherName && a.subject).length}{" "}
                  assignments
                </Badge>
              </div>
            </div>
            {/* Info banner when auto-loaded from teacher profiles */}
            {assignments.some((a) => a.teacherName && a.subject) && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-indigo-950/40 border border-indigo-700/30 text-[11px] text-indigo-300 flex items-center gap-1.5">
                <span>ℹ</span>
                Auto-loaded from teacher profiles. You can add or remove rows
                manually.
              </div>
            )}
            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
              {assignments.map((row) => (
                <AssignmentRow
                  key={row.id}
                  row={row}
                  teacherSuggestions={staffList}
                  subjectSuggestions={subjectListFromStorage}
                  classSections={availableSections}
                  onChange={updateAssignment}
                  onRemove={removeAssignment}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addAssignmentRow}
              className="mt-3 border-dashed border-indigo-500/50 text-indigo-300 hover:bg-indigo-600/20 text-xs"
              data-ocid="teacher.timetable.button"
            >
              <Plus size={13} className="mr-1.5" />
              Add Assignment
            </Button>
          </div>

          {/* C: Split-Subject Pairs */}
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] flex items-center justify-center font-bold">
                  C
                </span>
                Split-Subject Pairs
                <span className="text-[10px] text-gray-500 font-normal">
                  (optional)
                </span>
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={addSplitPair}
                className="border-dashed border-violet-500/50 text-violet-300 hover:bg-violet-600/20 text-xs"
                data-ocid="teacher.timetable.button"
              >
                <Plus size={12} className="mr-1" />
                Add Split Pair
              </Button>
            </div>

            {splitPairs.length === 0 ? (
              <p className="text-xs text-gray-600 italic">
                No split pairs. Add one if a subject is shared 3 days each (e.g.
                Maths Mon/Wed/Fri and Science Tue/Thu/Sat in the same period
                slot).
              </p>
            ) : (
              <div className="space-y-2">
                {splitPairs.map((pair) => (
                  <div
                    key={pair.id}
                    className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg border border-violet-700/30"
                  >
                    <div className="flex-1">
                      <Label className="text-[10px] text-gray-400 mb-1 block">
                        Mon/Wed/Fri Subject
                      </Label>
                      <Select
                        value={pair.subjectA}
                        onValueChange={(v) =>
                          updateSplitPair(pair.id, "subjectA", v)
                        }
                      >
                        <SelectTrigger
                          className="bg-gray-900 border-gray-600 text-white text-xs h-8"
                          data-ocid="teacher.timetable.select"
                        >
                          <SelectValue placeholder="Subject A" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          {allSubjectsInAssignments.map((s) => (
                            <SelectItem
                              key={s}
                              value={s}
                              className="text-gray-200 text-xs focus:bg-violet-600/40"
                            >
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-center text-violet-400 pt-5">
                      <ArrowLeftRight size={14} />
                    </div>
                    <div className="flex-1">
                      <Label className="text-[10px] text-gray-400 mb-1 block">
                        Tue/Thu/Sat Subject
                      </Label>
                      <Select
                        value={pair.subjectB}
                        onValueChange={(v) =>
                          updateSplitPair(pair.id, "subjectB", v)
                        }
                      >
                        <SelectTrigger
                          className="bg-gray-900 border-gray-600 text-white text-xs h-8"
                          data-ocid="teacher.timetable.select"
                        >
                          <SelectValue placeholder="Subject B" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          {allSubjectsInAssignments.map((s) => (
                            <SelectItem
                              key={s}
                              value={s}
                              className="text-gray-200 text-xs focus:bg-violet-600/40"
                            >
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="pt-5">
                      <button
                        type="button"
                        onClick={() => removeSplitPair(pair.id)}
                        className="text-gray-500 hover:text-red-400 transition-colors p-1"
                        data-ocid="teacher.timetable.delete_button"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => setStep(2)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
              data-ocid="teacher.timetable.primary_button"
            >
              Next: Period Setup
              <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ═══ STEP 2 ═══════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-5 space-y-5">
            <h3 className="text-sm font-semibold text-gray-200">
              Period Configuration
            </h3>

            {/* Working days */}
            <div>
              <p className="text-xs text-gray-400 mb-2">Working Days</p>
              <div className="flex flex-wrap gap-3">
                {ALL_DAYS.map((day) => {
                  const checkId = `day-check-${day}`;
                  return (
                    <div
                      key={day}
                      className="flex items-center gap-1.5"
                      data-ocid="teacher.timetable.checkbox"
                    >
                      <Checkbox
                        id={checkId}
                        checked={selectedDays.includes(day)}
                        onCheckedChange={() => toggleDay(day)}
                        className="border-gray-600 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                      />
                      <Label
                        htmlFor={checkId}
                        className="text-sm text-gray-300 cursor-pointer"
                      >
                        {day}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label
                  htmlFor="periods-per-day"
                  className="text-xs text-gray-400 mb-1.5 block"
                >
                  Periods per Day
                </Label>
                <Input
                  id="periods-per-day"
                  type="number"
                  min={1}
                  max={12}
                  value={periodsPerDay}
                  onChange={(e) => {
                    const n = Math.max(1, Number.parseInt(e.target.value) || 1);
                    setPeriodsPerDay(n);
                    setPeriodDurations((prev) => {
                      const updated = [...prev];
                      while (updated.length < n) updated.push(45);
                      return updated.slice(0, n);
                    });
                  }}
                  className="bg-gray-900 border-gray-600 text-white"
                  data-ocid="teacher.timetable.input"
                />
              </div>
              <div>
                <Label
                  htmlFor="period-start"
                  className="text-xs text-gray-400 mb-1.5 block"
                >
                  Start Time
                </Label>
                <Input
                  id="period-start"
                  type="time"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="bg-gray-900 border-gray-600 text-white"
                  data-ocid="teacher.timetable.input"
                />
              </div>
              <div>
                <Label
                  htmlFor="interval-minutes"
                  className="text-xs text-gray-400 mb-1.5 block"
                >
                  Interval/Break (min)
                </Label>
                <Input
                  id="interval-minutes"
                  type="number"
                  min={0}
                  max={30}
                  value={intervalMinutes}
                  onChange={(e) =>
                    setIntervalMinutes(
                      Math.max(0, Number.parseInt(e.target.value) || 0),
                    )
                  }
                  className="bg-gray-900 border-gray-600 text-white"
                  data-ocid="teacher.timetable.input"
                />
              </div>
            </div>

            {/* Per-Period Duration Inputs */}
            <div>
              <Label className="text-xs text-gray-400 mb-2 block">
                Individual Period Durations (min)
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {periodDurations
                  .slice(0, periodsPerDay)
                  .map((durVal, periodIdx) => (
                    <div
                      key={`period-slot-${periodIdx + 1}`}
                      className="flex flex-col gap-1"
                    >
                      <Label className="text-[10px] text-indigo-300">
                        P{periodIdx + 1}
                      </Label>
                      <Input
                        type="number"
                        min={5}
                        max={120}
                        value={durVal}
                        onChange={(e) => {
                          const val = Math.max(
                            5,
                            Number.parseInt(e.target.value) || 45,
                          );
                          setPeriodDurations((prev) => {
                            const updated = [...prev];
                            updated[periodIdx] = val;
                            return updated;
                          });
                        }}
                        className="bg-gray-900 border-gray-600 text-white text-xs h-8"
                        data-ocid="teacher.timetable.input"
                      />
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700 text-xs"
                data-ocid="teacher.timetable.button"
              >
                ← Setup
              </Button>
              <Button
                size="sm"
                onClick={doGenerate}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs flex-1"
                data-ocid="teacher.timetable.primary_button"
              >
                <Shuffle size={13} className="mr-1.5" />
                Generate Timetable
              </Button>
            </div>
          </div>

          {/* Period timings preview */}
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-200 mb-4">
              Period Timings Preview
            </h3>
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {periodTimes.map((pt, i) => (
                <div
                  key={pt.from}
                  className="flex items-center justify-between px-3 py-2 bg-gray-900/60 rounded-md border border-gray-700/40"
                >
                  <span className="text-xs font-semibold text-indigo-300">
                    Period {i + 1}
                  </span>
                  <span className="text-xs text-gray-300">
                    {pt.from} – {pt.to}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ STEP 3 ═══════════════════════════════════════════════════════════════ */}
      {step === 3 && (
        <div className="space-y-5">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep(2)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700 text-xs"
              data-ocid="teacher.timetable.button"
            >
              ← Setup
            </Button>
            <Button
              size="sm"
              onClick={doGenerate}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
              data-ocid="teacher.timetable.primary_button"
            >
              <RefreshCcw size={12} className="mr-1.5" />
              Re-Generate
            </Button>
            <Button
              size="sm"
              onClick={saveTimetable}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
              data-ocid="teacher.timetable.save_button"
            >
              <Save size={12} className="mr-1.5" />
              Save (Ctrl+S)
            </Button>
            <Badge
              variant="outline"
              className="ml-auto border-indigo-500/40 text-indigo-300"
            >
              {sectionTimetables.length}/{selectedSections.length} sections
            </Badge>
          </div>

          {/* Per-section timetable cards */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {sectionTimetables.map((st) => (
              <SectionCard
                key={st.sectionKey}
                sectionKey={st.sectionKey}
                sectionLabel={getSectionLabel(st.sectionKey)}
                timetable={st}
                days={selectedDays}
                periodTimes={periodTimes}
                subjectColorMap={subjectColorMap}
                onCellUpdate={onCellUpdate}
              />
            ))}
          </div>

          {/* Combined + Teacher-wise views */}
          <Tabs defaultValue="combined" className="mt-6">
            <TabsList className="bg-gray-800/60 border border-gray-700/50">
              <TabsTrigger
                value="combined"
                className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
                data-ocid="teacher.timetable.tab"
              >
                Combined View
              </TabsTrigger>
              <TabsTrigger
                value="teacher"
                className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
                data-ocid="teacher.timetable.tab"
              >
                Teacher-Wise View
              </TabsTrigger>
            </TabsList>

            {/* ── Combined View ────────────────────────────────────────────────── */}
            <TabsContent value="combined">
              <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4 mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-200">
                    All Sections — Combined View
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        printCombinedView(
                          sectionTimetables,
                          selectedDays,
                          periodsPerDay,
                          periodStart,
                          periodDuration,
                          periodDurations,
                          intervalMinutes,
                        )
                      }
                      className="border-gray-600 text-gray-300 hover:bg-gray-700 text-xs h-7"
                      data-ocid="teacher.timetable.button"
                    >
                      <Printer size={11} className="mr-1.5" />
                      Print
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        exportCSV(
                          sectionTimetables,
                          selectedDays,
                          periodsPerDay,
                        )
                      }
                      className="border-gray-600 text-gray-300 hover:bg-gray-700 text-xs h-7"
                      data-ocid="teacher.timetable.button"
                    >
                      <Download size={11} className="mr-1.5" />
                      Export CSV
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="border-collapse text-xs w-full">
                    <thead>
                      <tr>
                        <th className="px-2 py-1.5 bg-gray-900/50 border border-gray-700/60 text-gray-400 font-medium text-left sticky left-0">
                          Day
                        </th>
                        <th className="px-2 py-1.5 bg-gray-900/50 border border-gray-700/60 text-gray-400 font-medium text-left whitespace-nowrap">
                          Period
                        </th>
                        {sectionTimetables.map((st) => (
                          <th
                            key={st.sectionKey}
                            className="px-2 py-1.5 bg-indigo-900/30 border border-gray-700/60 text-indigo-300 font-medium text-center whitespace-nowrap min-w-[90px]"
                          >
                            {getSectionLabel(st.sectionKey)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {orderedSelectedDays.map((day, di) =>
                        periodTimes.map((pt, pi) => (
                          <tr
                            key={`${day}-period-${pt.from}`}
                            className={`${
                              di % 2 === 0 ? "bg-gray-900/20" : "bg-gray-800/20"
                            } hover:bg-gray-700/20 transition-colors`}
                          >
                            {pi === 0 && (
                              <td
                                rowSpan={periodTimes.length}
                                className="px-2 py-1 border border-gray-700/60 font-semibold text-indigo-300 text-center align-middle bg-gray-800/50"
                              >
                                {day}
                              </td>
                            )}
                            <td className="px-2 py-1 border border-gray-700/60 text-gray-400 whitespace-nowrap">
                              <span className="font-medium text-indigo-400">
                                P{pi + 1}
                              </span>
                              <span className="ml-1 text-[10px] text-gray-600">
                                {pt.from}–{pt.to}
                              </span>
                            </td>
                            {sectionTimetables.map((st) => {
                              const cell = st.cells[`${day}_${pi}`];
                              const colorCls = cell
                                ? subjectColorMap[cell.subject] ||
                                  SUBJECT_COLORS[0]
                                : "";
                              return (
                                <td
                                  key={st.sectionKey}
                                  className="px-1 py-1 border border-gray-700/60 text-center"
                                >
                                  {cell ? (
                                    <div
                                      className={`rounded px-1.5 py-0.5 border text-[10px] ${colorCls}`}
                                    >
                                      <div className="font-semibold truncate">
                                        {cell.teacher}
                                      </div>
                                      <div className="opacity-80">
                                        {cell.subject}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-700">—</span>
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
            </TabsContent>

            {/* ── Teacher-Wise View ────────────────────────────────────────────── */}
            <TabsContent value="teacher">
              <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4 mt-3">
                <div className="flex items-center gap-4 mb-4">
                  <h3 className="text-sm font-semibold text-gray-200">
                    Teacher Schedule View
                  </h3>
                  <Select
                    value={selectedTeacherView}
                    onValueChange={setSelectedTeacherView}
                  >
                    <SelectTrigger
                      className="bg-gray-900 border-gray-600 text-white w-52"
                      data-ocid="teacher.timetable.select"
                    >
                      <SelectValue placeholder="Select Teacher" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {allTeacherNames.map((name) => (
                        <SelectItem
                          key={name}
                          value={name}
                          className="text-gray-200 focus:bg-indigo-600/40"
                        >
                          <User
                            size={11}
                            className="inline mr-1.5 opacity-60"
                          />
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!selectedTeacherView ? (
                  <p className="text-sm text-gray-600 italic">
                    Select a teacher to view their schedule.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="border-collapse text-xs w-full">
                      <thead>
                        <tr>
                          <th className="px-2 py-1.5 bg-gray-900/50 border border-gray-700/60 text-gray-400 font-medium text-left">
                            Day
                          </th>
                          {periodTimes.map((pt, i) => (
                            <th
                              key={pt.from}
                              className="px-2 py-1.5 bg-gray-900/50 border border-gray-700/60 text-indigo-300 font-medium text-center min-w-[90px]"
                            >
                              P{i + 1}
                              <div className="text-[9px] text-gray-500 font-normal">
                                {pt.from}–{pt.to}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {orderedSelectedDays.map((day, di) => (
                          <tr
                            key={day}
                            className={
                              di % 2 === 0 ? "bg-gray-900/20" : "bg-gray-800/20"
                            }
                          >
                            <td className="px-2 py-1.5 border border-gray-700/60 font-semibold text-indigo-300">
                              {day}
                            </td>
                            {periodTimes.map((_, pi) => {
                              // Find all sections where this teacher teaches in this period+day
                              const slots: string[] = [];
                              for (const st of sectionTimetables) {
                                const cell = st.cells[`${day}_${pi}`];
                                if (
                                  cell &&
                                  cell.teacher === selectedTeacherView
                                ) {
                                  slots.push(
                                    `${getSectionLabel(st.sectionKey)} / ${cell.subject}`,
                                  );
                                }
                              }
                              return (
                                <td
                                  key={`${day}-p${periodTimes[pi]?.from ?? pi}`}
                                  className="px-1 py-1.5 border border-gray-700/60 text-center"
                                >
                                  {slots.length > 0 ? (
                                    <div className="space-y-1">
                                      {slots.map((s, _si) => (
                                        <div
                                          key={`${day}-${periodTimes[pi]?.from ?? pi}-${s.replace(/[^a-z0-9]/gi, "").slice(0, 15)}`}
                                          className="bg-indigo-600/20 border border-indigo-500/30 rounded px-1.5 py-0.5 text-indigo-200 text-[10px]"
                                        >
                                          {s}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-gray-700 text-[10px]">
                                      Free
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
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* ═══ SAVED TIMETABLES ═════════════════════════════════════════════════════ */}
      {savedSets.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
            <Save size={14} className="text-emerald-400" />
            Saved Timetable Sets
            <Badge
              variant="outline"
              className="border-emerald-500/40 text-emerald-300 text-[10px]"
            >
              {savedSets.length}
            </Badge>
          </h2>
          <div className="overflow-x-auto rounded-xl border border-gray-700/50">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700/50 hover:bg-transparent">
                  <TableHead className="text-gray-400 text-xs">
                    Sections
                  </TableHead>
                  <TableHead className="text-gray-400 text-xs">Days</TableHead>
                  <TableHead className="text-gray-400 text-xs">
                    Periods
                  </TableHead>
                  <TableHead className="text-gray-400 text-xs">
                    Saved At
                  </TableHead>
                  <TableHead className="text-gray-400 text-xs">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {savedSets.map((set, i) => (
                  <TableRow
                    key={set.id}
                    className="border-gray-700/40 hover:bg-gray-800/40"
                    data-ocid={`teacher.saved.row.${i + 1}`}
                  >
                    <TableCell className="text-sm text-gray-200">
                      <div className="flex flex-wrap gap-1">
                        {set.sections.slice(0, 6).map((sk) => (
                          <Badge
                            key={sk}
                            variant="outline"
                            className="border-indigo-500/30 text-indigo-300 text-[10px] px-1.5"
                          >
                            {getSectionLabel(sk)}
                          </Badge>
                        ))}
                        {set.sections.length > 6 && (
                          <Badge
                            variant="outline"
                            className="border-gray-500/30 text-gray-400 text-[10px] px-1.5"
                          >
                            +{set.sections.length - 6} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-gray-400">
                      {set.days.join(", ")}
                    </TableCell>
                    <TableCell className="text-xs text-gray-400">
                      {set.periods}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {set.savedAt}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => printTimetableSet(set)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-xs transition-colors"
                          data-ocid="teacher.saved.button"
                        >
                          <Printer size={11} />
                          Print
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSavedSet(set.id)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-red-900/30 hover:bg-red-800/40 text-red-400 rounded text-xs transition-colors"
                          data-ocid="teacher.saved.delete_button"
                        >
                          <Trash2 size={11} />
                          Delete
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
