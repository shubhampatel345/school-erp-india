/**
 * ExamTimetableMaker — Direct API rebuild (cPanel/MySQL)
 * All data via phpApiService. No getData()/ls context.
 * Features:
 * - Create exam schedule: name, class, date range
 * - Auto-generate timetable: assign subjects to dates
 * - Drag-and-drop to reorder
 * - Print/export CSV
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { CLASSES, SECTIONS, generateId } from "../../utils/localStorage";
import { phpApiService } from "../../utils/phpApiService";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SubjectRow {
  id: string;
  date: string;
  day: string;
  subject: string;
}

interface ClassTimetable {
  classKey: string;
  rows: SubjectRow[];
}

export interface SavedTimetable {
  id: string;
  examName: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  tables: ClassTimetable[];
  sessionId: string;
  savedAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_SUBJECTS = [
  "Hindi",
  "English",
  "Mathematics",
  "Science",
  "Social Science",
  "Computer",
  "Sanskrit",
  "Art",
  "Physical Education",
];

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDayName(dateStr: string): string {
  return DAYS[new Date(`${dateStr}T12:00:00`).getDay()];
}

function getExamDates(start: string, end: string): string[] {
  if (!start || !end || start > end) return [];
  const dates: string[] = [];
  const cur = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  while (cur <= last) {
    if (cur.getDay() !== 0) dates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function exportCSV(tables: ClassTimetable[], examName: string) {
  if (tables.length === 0) return;
  const allDates = [
    ...new Set(tables.flatMap((t) => t.rows.map((r) => r.date))),
  ].sort();
  const headers = ["Date", "Day", ...tables.map((t) => t.classKey)];
  const rows = allDates.map((date) => [
    formatDate(date),
    getDayName(date),
    ...tables.map((t) => t.rows.find((r) => r.date === date)?.subject ?? ""),
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${examName.replace(/\s+/g, "_")}_timetable.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── ClassCard ─────────────────────────────────────────────────────────────────

function ClassCard({
  table,
  onReorder,
  saved,
}: {
  table: ClassTimetable;
  onReorder: (classKey: string, newRows: SubjectRow[]) => void;
  saved: boolean;
}) {
  const dragIdx = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const handleDrop = (idx: number) => {
    setDragOver(null);
    if (saved || dragIdx.current === null || dragIdx.current === idx) return;
    const newRows = [...table.rows];
    const dragged = newRows[dragIdx.current];
    newRows.splice(dragIdx.current, 1);
    newRows.splice(idx, 0, dragged);
    const dates = table.rows.map((r) => r.date);
    const days = table.rows.map((r) => r.day);
    onReorder(
      table.classKey,
      newRows.map((r, i) => ({ ...r, date: dates[i], day: days[i] })),
    );
    dragIdx.current = null;
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
      <div className="bg-primary/10 px-4 py-2.5 border-b border-border flex items-center justify-between">
        <span className="font-semibold text-foreground font-display">
          {table.classKey}
        </span>
        {!saved && (
          <span className="text-xs text-muted-foreground italic">
            ↕ Drag to reorder
          </span>
        )}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/30">
            <th className="px-3 py-2 text-left text-muted-foreground font-medium w-28">
              Date
            </th>
            <th className="px-3 py-2 text-left text-muted-foreground font-medium w-20">
              Day
            </th>
            <th className="px-3 py-2 text-left text-muted-foreground font-medium">
              Subject
            </th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, idx) => (
            <tr
              key={row.id}
              className={`border-t border-border/50 transition-colors ${dragOver === idx && !saved ? "bg-accent/10" : !saved ? "hover:bg-muted/20" : ""}`}
              draggable={!saved}
              onDragStart={() => {
                dragIdx.current = idx;
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(idx);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(idx)}
            >
              <td className="px-3 py-2 text-muted-foreground font-mono text-xs whitespace-nowrap">
                {formatDate(row.date)}
              </td>
              <td className="px-3 py-2 text-muted-foreground text-xs">
                {row.day.slice(0, 3)}
              </td>
              <td className="px-3 py-2 font-medium text-foreground">
                <div className="flex items-center gap-2">
                  {!saved && (
                    <span
                      className="text-muted-foreground cursor-grab select-none text-base"
                      aria-hidden="true"
                    >
                      ⠿
                    </span>
                  )}
                  {row.subject}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── CombinedView ──────────────────────────────────────────────────────────────

function CombinedView({
  tables,
  examName,
  examTime,
}: { tables: ClassTimetable[]; examName: string; examTime?: string }) {
  if (tables.length === 0) return null;
  const allDates = [
    ...new Set(tables.flatMap((t) => t.rows.map((r) => r.date))),
  ].sort();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-foreground">
          Combined Timetable — All Classes
        </h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportCSV(tables, examName)}
            data-ocid="exam-export-csv"
          >
            Export CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            data-ocid="exam-print-combined"
          >
            Print
          </Button>
        </div>
      </div>
      <div className="hidden print:block text-center mb-4">
        <h1 className="text-xl font-bold">SHUBH SCHOOL ERP</h1>
        <h2 className="text-base font-semibold mt-1">{examName} — Timetable</h2>
        {examTime && <p className="text-sm">Time: {examTime}</p>}
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card print:border-0">
        <table className="w-full text-sm min-w-max">
          <thead>
            <tr className="bg-primary/10 border-b border-border">
              <th className="px-3 py-2.5 text-left font-semibold border-r border-border sticky left-0 bg-primary/10 whitespace-nowrap">
                Date
              </th>
              <th className="px-3 py-2.5 text-left font-semibold border-r border-border whitespace-nowrap">
                Day
              </th>
              {tables.map((t) => (
                <th
                  key={t.classKey}
                  className="px-3 py-2.5 text-center font-semibold border-r border-border last:border-r-0 whitespace-nowrap"
                >
                  {t.classKey}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allDates.map((date, i) => (
              <tr
                key={date}
                className={`border-t border-border ${i % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
              >
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground border-r border-border sticky left-0 bg-inherit whitespace-nowrap">
                  {formatDate(date)}
                </td>
                <td className="px-3 py-2 text-muted-foreground border-r border-border text-xs">
                  {getDayName(date)}
                </td>
                {tables.map((t) => (
                  <td
                    key={t.classKey}
                    className="px-3 py-2 text-center font-medium border-r border-border last:border-r-0 whitespace-nowrap"
                  >
                    {t.rows.find((r) => r.date === date)?.subject ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="hidden print:flex justify-between mt-8 text-sm">
        <span>Class Teacher Signature: _______________</span>
        <span>Principal Signature: _______________</span>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ExamTimetableMaker() {
  const [examName, setExamName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [generated, setGenerated] = useState<ClassTimetable[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [savedList, setSavedList] = useState<SavedTimetable[]>([]);
  const [viewSaved, setViewSaved] = useState<SavedTimetable | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load timetables from server
  useEffect(() => {
    setLoading(true);
    phpApiService
      .get<Record<string, unknown>[]>("exams/timetables")
      .then((rows) => {
        const parsed = rows.map((r) => ({
          id: String(r.id ?? ""),
          examName: String(r.examName ?? ""),
          startDate: String(r.startDate ?? ""),
          endDate: String(r.endDate ?? ""),
          startTime: String(r.startTime ?? "09:00"),
          endTime: String(r.endTime ?? "12:00"),
          tables: (() => {
            try {
              return JSON.parse(String(r.tablesData ?? r.tables ?? "[]"));
            } catch {
              return [];
            }
          })(),
          sessionId: String(r.sessionId ?? ""),
          savedAt: String(r.savedAt ?? ""),
        })) as SavedTimetable[];
        if (parsed.length > 0) {
          setSavedList(parsed);
        } else {
          // Fallback to localStorage
          try {
            const local = JSON.parse(
              localStorage.getItem("exam_timetables") ?? "[]",
            ) as SavedTimetable[];
            setSavedList(local);
          } catch {
            setSavedList([]);
          }
        }
      })
      .catch(() => {
        try {
          const local = JSON.parse(
            localStorage.getItem("exam_timetables") ?? "[]",
          ) as SavedTimetable[];
          setSavedList(local);
        } catch {
          setSavedList([]);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const examDates = getExamDates(startDate, endDate);
  const allClassKeys = CLASSES.flatMap((c) =>
    SECTIONS.slice(0, 3).map((s) => `Class ${c}${s}`),
  );

  const toggleClass = (key: string) => {
    setSelectedClasses((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
    setIsSaved(false);
    setGenerated([]);
  };

  const generate = useCallback(() => {
    if (
      !examName.trim() ||
      examDates.length === 0 ||
      selectedClasses.length === 0
    )
      return;
    const tables = selectedClasses.map((classKey) => {
      const shuffled = shuffle([...DEFAULT_SUBJECTS]);
      return {
        classKey,
        rows: examDates.map((date, i) => ({
          id: generateId(),
          date,
          day: getDayName(date),
          subject: shuffled[i % shuffled.length],
        })),
      };
    });
    setGenerated(tables);
    setIsSaved(false);
  }, [examName, examDates, selectedClasses]);

  const handleReorder = useCallback(
    (classKey: string, newRows: SubjectRow[]) => {
      setGenerated((prev) =>
        prev.map((t) =>
          t.classKey === classKey ? { ...t, rows: newRows } : t,
        ),
      );
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (generated.length === 0) return;
    setSaving(true);
    const entry: SavedTimetable = {
      id: generateId(),
      examName,
      startDate,
      endDate,
      startTime,
      endTime,
      tables: generated,
      sessionId: new Date().getFullYear().toString(),
      savedAt: new Date().toISOString(),
    };
    try {
      await phpApiService.post("exams/timetables/add", {
        ...entry,
        tablesData: JSON.stringify(entry.tables),
      });
    } catch {
      // Fallback to localStorage
      const local = JSON.parse(
        localStorage.getItem("exam_timetables") ?? "[]",
      ) as SavedTimetable[];
      localStorage.setItem(
        "exam_timetables",
        JSON.stringify([entry, ...local]),
      );
    }
    setSavedList((prev) => [entry, ...prev]);
    setIsSaved(true);
    setSaving(false);
  }, [generated, examName, startDate, endDate, startTime, endTime]);

  const handleDeleteSaved = async (id: string) => {
    await phpApiService.post("exams/timetables/delete", { id }).catch(() => {
      const local = JSON.parse(
        localStorage.getItem("exam_timetables") ?? "[]",
      ) as SavedTimetable[];
      localStorage.setItem(
        "exam_timetables",
        JSON.stringify(local.filter((e) => e.id !== id)),
      );
    });
    setSavedList((prev) => prev.filter((e) => e.id !== id));
    if (viewSaved?.id === id) setViewSaved(null);
  };

  const canGenerate =
    examName.trim().length > 0 &&
    startDate &&
    endDate &&
    selectedClasses.length > 0 &&
    examDates.length > 0;

  return (
    <div className="space-y-6">
      {/* Step 1: Exam Details */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">
            1
          </span>
          <div>
            <h2 className="font-semibold text-foreground">Exam Details</h2>
            <p className="text-xs text-muted-foreground">
              Enter exam name, dates and time
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <Label>Exam Name</Label>
            <Input
              placeholder="e.g. Half Yearly 2025-26"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              data-ocid="exam-name"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setGenerated([]);
                setIsSaved(false);
              }}
              data-ocid="exam-start-date"
            />
          </div>
          <div className="space-y-1.5">
            <Label>End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setGenerated([]);
                setIsSaved(false);
              }}
              data-ocid="exam-end-date"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Time From</Label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              data-ocid="exam-start-time"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Time To</Label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              data-ocid="exam-end-time"
            />
          </div>
          {examDates.length > 0 && (
            <div className="flex flex-col justify-end space-y-1.5">
              <Label>Exam Schedule</Label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{examDates.length} days</Badge>
                <span className="text-xs text-muted-foreground">
                  (Sundays excluded)
                </span>
              </div>
            </div>
          )}
        </div>
        {examDates.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Exam Dates Preview
            </p>
            <div className="flex flex-wrap gap-1.5">
              {examDates.map((d) => (
                <span
                  key={d}
                  className="px-2 py-1 rounded-md bg-muted/50 border border-border text-xs font-mono text-muted-foreground"
                >
                  {formatDate(d)} ({getDayName(d).slice(0, 3)})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Classes */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">
            2
          </span>
          <div>
            <h2 className="font-semibold text-foreground">
              Classes &amp; Subjects
            </h2>
            <p className="text-xs text-muted-foreground">
              Select participating classes
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Select Classes</Label>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-1.5">
            {allClassKeys.map((key) => (
              <label
                key={key}
                className={`flex items-center justify-center p-2 rounded-lg border cursor-pointer text-xs font-medium transition-smooth select-none ${selectedClasses.includes(key) ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selectedClasses.includes(key)}
                  onChange={() => toggleClass(key)}
                  data-ocid={`exam-class-${key.replace(/\s+/g, "-").toLowerCase()}`}
                />
                {key.replace("Class ", "")}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Step 3: Generate */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">
              3
            </span>
            <div>
              <h2 className="font-semibold text-foreground">
                Generate Timetable
              </h2>
              <p className="text-xs text-muted-foreground">
                Auto-distributes subjects across exam dates
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={generate}
              disabled={!canGenerate}
              data-ocid="exam-generate"
            >
              {generated.length > 0 ? "Re-Generate" : "Generate Timetable"}
            </Button>
            {generated.length > 0 && !isSaved && (
              <Button
                variant="outline"
                onClick={() => void handleSave()}
                disabled={saving}
                className="border-accent text-accent hover:bg-accent/10"
                data-ocid="exam-save"
              >
                {saving ? "Saving…" : "Save Timetable"}
              </Button>
            )}
            {isSaved && (
              <Badge className="bg-accent/20 text-accent border border-accent/30 px-3 py-1.5">
                ✓ Saved
              </Badge>
            )}
          </div>
        </div>
        {!canGenerate && (
          <p className="text-muted-foreground text-sm bg-muted/30 rounded-lg px-4 py-3">
            Complete Steps 1 and 2 — enter exam name, select dates, and pick at
            least one class.
          </p>
        )}
        {generated.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {generated.map((table) => (
              <ClassCard
                key={table.classKey}
                table={table}
                onReorder={handleReorder}
                saved={isSaved}
              />
            ))}
          </div>
        )}
      </div>

      {/* Step 4: Combined View */}
      {isSaved && generated.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-accent text-accent-foreground text-sm font-bold flex items-center justify-center shrink-0">
              4
            </span>
            <div>
              <h2 className="font-semibold text-foreground">
                Combined Excel View
              </h2>
              <p className="text-xs text-muted-foreground">
                All classes in one table — print or export as CSV
              </p>
            </div>
          </div>
          <CombinedView
            tables={generated}
            examName={examName}
            examTime={`${startTime} – ${endTime}`}
          />
        </div>
      )}

      {/* Saved list */}
      {loading ? (
        <div className="space-y-2" data-ocid="exam.timetable.loading_state">
          {[1, 2].map((k) => (
            <div key={k} className="h-14 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        savedList.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h2 className="font-semibold text-foreground">
              Saved Timetables ({savedList.length})
            </h2>
            <div className="space-y-2">
              {savedList.map((entry) => (
                <div key={entry.id} className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-smooth">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{entry.examName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(entry.startDate)} →{" "}
                        {formatDate(entry.endDate)} · {entry.startTime}–
                        {entry.endTime} · {entry.tables.length} classes
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0 ml-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setViewSaved(
                            viewSaved?.id === entry.id ? null : entry,
                          )
                        }
                        data-ocid={`exam-view-saved-${entry.id}`}
                      >
                        {viewSaved?.id === entry.id ? "Hide" : "View"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => exportCSV(entry.tables, entry.examName)}
                      >
                        CSV
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => void handleDeleteSaved(entry.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  {viewSaved?.id === entry.id && (
                    <div className="pl-4 border-l-2 border-primary/30">
                      <CombinedView
                        tables={entry.tables}
                        examName={entry.examName}
                        examTime={`${entry.startTime} – ${entry.endTime}`}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
