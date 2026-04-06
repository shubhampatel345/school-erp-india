import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Pencil,
  Printer,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface ExamStudent {
  name: string;
  admNo: string;
  className: string;
  rollNo: string;
}

interface ExamTimetableEntry {
  id: string;
  examGroup: string;
  date: string; // DD/MM/YYYY format
  day: string;
  timeFrom: string;
  timeTo: string;
  subject: string;
  className: string;
  section: string;
  maxMarks: number;
  minMarks: number;
  venue: string;
}

const CLASS_LIST = [
  "Nursery",
  "KG",
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

const CLASS_BORDER_COLORS = [
  "border-l-blue-500",
  "border-l-green-500",
  "border-l-purple-500",
  "border-l-orange-500",
  "border-l-red-500",
  "border-l-cyan-500",
  "border-l-pink-500",
  "border-l-yellow-500",
];

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function getDefaultSubjects(className: string): string[] {
  if (className === "Nursery" || className === "KG") {
    return ["English", "Hindi", "Maths", "Drawing", "EVS"];
  }
  const num = Number.parseInt(className.replace("Class ", ""), 10);
  if (num >= 1 && num <= 5)
    return ["English", "Hindi", "Maths", "EVS", "Drawing", "GK"];
  if (num >= 6 && num <= 8)
    return [
      "English",
      "Hindi",
      "Maths",
      "Science",
      "Social Science",
      "Sanskrit",
      "Computer",
    ];
  if (num >= 9 && num <= 10)
    return [
      "English",
      "Hindi",
      "Maths",
      "Science",
      "Social Science",
      "Sanskrit",
      "Computer",
    ];
  if (num >= 11 && num <= 12)
    return [
      "English",
      "Physics",
      "Chemistry",
      "Maths",
      "Biology",
      "Computer Science",
      "History",
      "Geography",
      "Economics",
    ];
  return ["English", "Hindi", "Maths"];
}

function parseDayFromDate(dateStr: string): string {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return "";
  const [dd, mm, yyyy] = parts;
  const d = Number.parseInt(dd, 10);
  const m = Number.parseInt(mm, 10) - 1;
  const y = Number.parseInt(yyyy, 10);
  if (Number.isNaN(d) || Number.isNaN(m) || Number.isNaN(y) || y < 1000)
    return "";
  const dt = new Date(y, m, d);
  if (Number.isNaN(dt.getTime())) return "";
  return DAY_NAMES[dt.getDay()];
}

function getAvailableDates(startIso: string, endIso: string): string[] {
  const dates: string[] = [];
  const start = new Date(startIso);
  const end = new Date(endIso);
  const cur = new Date(start);
  while (cur <= end) {
    if (cur.getDay() !== 0) {
      // skip Sundays
      const dd = String(cur.getDate()).padStart(2, "0");
      const mm = String(cur.getMonth() + 1).padStart(2, "0");
      const yyyy = cur.getFullYear();
      dates.push(`${dd}/${mm}/${yyyy}`);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function getGrade(pct: number) {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  return "F";
}

const EMPTY_FORM: Omit<ExamTimetableEntry, "id" | "day"> = {
  examGroup: "",
  date: "",
  timeFrom: "",
  timeTo: "",
  subject: "",
  className: "",
  section: "",
  maxMarks: 100,
  minMarks: 33,
  venue: "",
};

// ── Per-class draggable timetable card ────────────────────────────────────────
interface ClassTimetableCardProps {
  className: string;
  examName: string;
  entries: ExamTimetableEntry[];
  colorClass: string;
  onEntriesChange: (
    className: string,
    newEntries: ExamTimetableEntry[],
  ) => void;
  onDeleteEntry: (id: string) => void;
}

function ClassTimetableCard({
  className,
  examName,
  entries,
  colorClass,
  onEntriesChange,
  onDeleteEntry,
}: ClassTimetableCardProps) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ExamTimetableEntry | null>(null);
  const dragNode = useRef<HTMLTableRowElement | null>(null);

  const inputCls =
    "bg-gray-900 border border-gray-600 text-white text-xs rounded px-2 py-1 outline-none focus:border-green-500 transition";

  function handleDragStart(
    e: React.DragEvent<HTMLTableRowElement>,
    index: number,
  ) {
    setDraggingIndex(index);
    dragNode.current = e.currentTarget;
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(
    e: React.DragEvent<HTMLTableRowElement>,
    index: number,
  ) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }

  function handleDrop(
    e: React.DragEvent<HTMLTableRowElement>,
    dropIndex: number,
  ) {
    e.preventDefault();
    if (draggingIndex === null || draggingIndex === dropIndex) {
      setDraggingIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newEntries = [...entries];
    const [removed] = newEntries.splice(draggingIndex, 1);
    newEntries.splice(dropIndex, 0, removed);
    onEntriesChange(className, newEntries);
    setDraggingIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    setDraggingIndex(null);
    setDragOverIndex(null);
  }

  function moveRow(index: number, direction: "up" | "down") {
    const newEntries = [...entries];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newEntries.length) return;
    [newEntries[index], newEntries[targetIndex]] = [
      newEntries[targetIndex],
      newEntries[index],
    ];
    onEntriesChange(className, newEntries);
  }

  function handlePrintClass() {
    const profile = (() => {
      try {
        return JSON.parse(localStorage.getItem("erp_school_profile") || "{}");
      } catch {
        return {};
      }
    })();
    const schoolName = profile.schoolName || "School Name";
    const rows = entries
      .map(
        (e, i) => `
          <tr style="background:${i % 2 === 0 ? "#f9f9f9" : "#fff"}">
            <td style="padding:5px 8px;border-bottom:1px solid #ddd;">${i + 1}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #ddd;">${e.date}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #ddd;">${e.day}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #ddd;">${e.timeFrom}${e.timeTo ? ` – ${e.timeTo}` : ""}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #ddd;font-weight:600;">${e.subject}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #ddd;">${e.maxMarks}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #ddd;">${e.minMarks}</td>
          </tr>`,
      )
      .join("");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html><head><title>Exam Timetable – ${className}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #000; background: #fff; padding: 20px; }
  h1 { font-size: 18px; text-align: center; font-weight: bold; }
  h2 { font-size: 14px; text-align: center; color: #1a5276; font-weight: bold; margin: 4px 0; }
  .sub { text-align: center; font-size: 12px; color: #555; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th { background: #1a5276; color: #fff; padding: 6px 8px; text-align: left; font-size: 11px; }
  .footer { margin-top: 40px; display: flex; justify-content: space-between; }
  .sig { text-align: center; width: 180px; border-top: 1px solid #000; padding-top: 4px; font-size: 11px; }
  @media print { body { padding: 10px; } }
</style>
</head><body>
<h1>${schoolName}</h1>
<h2>EXAMINATION TIMETABLE</h2>
<div class="sub">${examName} &nbsp;|&nbsp; ${className}</div>
<table>
  <thead><tr>
    <th>Sr.</th><th>Date</th><th>Day</th><th>Time</th><th>Subject</th>
    <th>Max Marks</th><th>Min Marks</th>
  </tr></thead>
  <tbody>${rows || '<tr><td colspan="7" style="text-align:center;padding:20px;">No entries.</td></tr>'}</tbody>
</table>
<div class="footer">
  <div class="sig">Class Teacher</div>
  <div class="sig">Principal</div>
</div>
</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }

  return (
    <div
      className={`bg-gray-800 border border-gray-700 border-l-4 ${colorClass} rounded-lg overflow-hidden`}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700">
        <h4 className="text-white text-sm font-semibold">
          {className}
          <span className="text-gray-400 font-normal ml-2 text-xs">
            — {examName}
          </span>
        </h4>
        <button
          type="button"
          onClick={handlePrintClass}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded transition"
          data-ocid="exam.timetable.print_button"
        >
          <Printer size={12} /> Print
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "#1a1f2e" }}>
              {[
                "#",
                "",
                "Date",
                "Day",
                "Subject",
                "Time",
                "Max",
                "Min",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="text-left px-3 py-2 text-gray-400 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-6 text-center text-gray-500"
                  data-ocid="exam.timetable.empty_state"
                >
                  No entries for this class.
                </td>
              </tr>
            ) : (
              entries.map((e, i) =>
                editId === e.id && editForm ? (
                  <tr key={e.id} style={{ background: "#1a2744" }}>
                    <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
                    <td className="px-2 py-1.5" />
                    <td className="px-2 py-1.5">
                      <input
                        value={editForm.date}
                        onChange={(ev) =>
                          setEditForm((p) =>
                            p ? { ...p, date: ev.target.value } : p,
                          )
                        }
                        placeholder="DD/MM/YYYY"
                        className={`${inputCls} w-24`}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-green-400 text-[10px]">
                      {parseDayFromDate(editForm.date)}
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={editForm.subject}
                        onChange={(ev) =>
                          setEditForm((p) =>
                            p ? { ...p, subject: ev.target.value } : p,
                          )
                        }
                        className={`${inputCls} w-28`}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex gap-1">
                        <input
                          value={editForm.timeFrom}
                          onChange={(ev) =>
                            setEditForm((p) =>
                              p ? { ...p, timeFrom: ev.target.value } : p,
                            )
                          }
                          className={`${inputCls} w-16`}
                          placeholder="From"
                        />
                        <input
                          value={editForm.timeTo}
                          onChange={(ev) =>
                            setEditForm((p) =>
                              p ? { ...p, timeTo: ev.target.value } : p,
                            )
                          }
                          className={`${inputCls} w-16`}
                          placeholder="To"
                        />
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        value={editForm.maxMarks}
                        onChange={(ev) =>
                          setEditForm((p) =>
                            p
                              ? {
                                  ...p,
                                  maxMarks:
                                    Number.parseInt(ev.target.value) || 0,
                                }
                              : p,
                          )
                        }
                        className={`${inputCls} w-14`}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        value={editForm.minMarks}
                        onChange={(ev) =>
                          setEditForm((p) =>
                            p
                              ? {
                                  ...p,
                                  minMarks:
                                    Number.parseInt(ev.target.value) || 0,
                                }
                              : p,
                          )
                        }
                        className={`${inputCls} w-14`}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (!editForm) return;
                            const day = parseDayFromDate(editForm.date);
                            const updated = entries.map((en) =>
                              en.id === editForm.id ? { ...editForm, day } : en,
                            );
                            onEntriesChange(className, updated);
                            setEditId(null);
                            setEditForm(null);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white px-2 py-0.5 rounded text-[10px] transition"
                          data-ocid="exam.timetable.save_button"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditId(null);
                            setEditForm(null);
                          }}
                          className="bg-gray-600 hover:bg-gray-500 text-white px-2 py-0.5 rounded text-[10px] transition"
                          data-ocid="exam.timetable.cancel_button"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={e.id}
                    draggable
                    onDragStart={(ev) => handleDragStart(ev, i)}
                    onDragOver={(ev) => handleDragOver(ev, i)}
                    onDrop={(ev) => handleDrop(ev, i)}
                    onDragEnd={handleDragEnd}
                    style={{
                      background:
                        draggingIndex === i
                          ? undefined
                          : i % 2 === 0
                            ? "#111827"
                            : "#0f1117",
                      opacity: draggingIndex === i ? 0.5 : 1,
                      userSelect: "none",
                    }}
                    className={`transition-all ${
                      dragOverIndex === i && draggingIndex !== i
                        ? "outline outline-2 outline-green-400 bg-green-900/20"
                        : ""
                    } cursor-grab active:cursor-grabbing`}
                    data-ocid={`exam.timetable.item.${i + 1}`}
                  >
                    <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-2 py-2">
                      <GripVertical size={12} className="text-gray-600" />
                    </td>
                    <td className="px-3 py-2 text-white whitespace-nowrap">
                      {e.date}
                    </td>
                    <td className="px-3 py-2 text-yellow-400 whitespace-nowrap">
                      {e.day}
                    </td>
                    <td className="px-3 py-2 text-blue-300 font-medium">
                      {e.subject}
                    </td>
                    <td className="px-3 py-2 text-gray-300 whitespace-nowrap">
                      {e.timeFrom}
                      {e.timeTo ? ` – ${e.timeTo}` : ""}
                    </td>
                    <td className="px-3 py-2 text-green-400">{e.maxMarks}</td>
                    <td className="px-3 py-2 text-red-400">{e.minMarks}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveRow(i, "up")}
                          disabled={i === 0}
                          className="text-gray-400 hover:text-white disabled:opacity-30 transition p-0.5"
                          title="Move up"
                          data-ocid="exam.timetable.toggle"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveRow(i, "down")}
                          disabled={i === entries.length - 1}
                          className="text-gray-400 hover:text-white disabled:opacity-30 transition p-0.5"
                          title="Move down"
                          data-ocid="exam.timetable.toggle"
                        >
                          <ChevronDown size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditId(e.id);
                            setEditForm({ ...e });
                          }}
                          className="text-blue-400 hover:text-blue-300 transition p-0.5"
                          title="Edit"
                          data-ocid="exam.timetable.edit_button"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteEntry(e.id)}
                          className="text-red-400 hover:text-red-300 transition p-0.5"
                          title="Delete"
                          data-ocid="exam.timetable.delete_button"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Examinations component ───────────────────────────────────────────────
export function Examinations() {
  const [tab, setTab] = useState<
    "timetable" | "schedule" | "results" | "marksheet"
  >("timetable");

  // ── Timetable Entries (global) ─────────────────────────────────────────────
  const [timetableEntries, setTimetableEntries] = useState<
    ExamTimetableEntry[]
  >(() => {
    try {
      return JSON.parse(localStorage.getItem("erp_exam_timetable") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(
      "erp_exam_timetable",
      JSON.stringify(timetableEntries),
    );
  }, [timetableEntries]);

  // ── Wizard State ──────────────────────────────────────────────────────────
  const [wizardExamName, setWizardExamName] = useState("");
  const [wizardStartDate, setWizardStartDate] = useState("");
  const [wizardEndDate, setWizardEndDate] = useState("");
  const [wizardTimeFrom, setWizardTimeFrom] = useState("09:00");
  const [wizardTimeTo, setWizardTimeTo] = useState("12:00");
  const [wizardMaxMarks, setWizardMaxMarks] = useState(100);
  const [wizardMinMarks, setWizardMinMarks] = useState(33);
  const [wizardClasses, setWizardClasses] = useState<string[]>([]);

  // subjects per class: { className: string[] }
  const [wizardSubjects, setWizardSubjects] = useState<
    Record<string, string[]>
  >({});
  const [customSubjectInput, setCustomSubjectInput] = useState<
    Record<string, string>
  >({});

  // Generated timetable grouped by class
  const [generatedByClass, setGeneratedByClass] = useState<
    Record<string, ExamTimetableEntry[]>
  >({});
  const [showGenerated, setShowGenerated] = useState(false);

  // Manual entry collapse state
  const [manualExpanded, setManualExpanded] = useState(false);

  // Manual entry state (kept from old)
  const [examGroups, setExamGroups] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("erp_exam_groups") || "[]");
    } catch {
      return [];
    }
  });
  const [newGroupName, setNewGroupName] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [formData, setFormData] = useState<
    Omit<ExamTimetableEntry, "id" | "day">
  >({
    ...EMPTY_FORM,
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ExamTimetableEntry | null>(null);

  useEffect(() => {
    localStorage.setItem("erp_exam_groups", JSON.stringify(examGroups));
  }, [examGroups]);

  // When classes selection changes, initialize subject selection
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reruns only on wizardClasses change
  useEffect(() => {
    const stored: Record<string, string[]> = {};
    for (const cls of wizardClasses) {
      if (!wizardSubjects[cls]) {
        // Load from localStorage erp_subjects
        let defaults = getDefaultSubjects(cls);
        try {
          const raw = JSON.parse(localStorage.getItem("erp_subjects") || "[]");
          const classSubjects = raw
            .filter((s: any) => s.class === cls)
            .map((s: any) => s.name as string);
          if (classSubjects.length > 0) defaults = classSubjects;
        } catch {
          // fallback to defaults
        }
        stored[cls] = defaults;
      } else {
        stored[cls] = wizardSubjects[cls];
      }
    }
    setWizardSubjects(stored);
  }, [wizardClasses]);

  function toggleWizardClass(cls: string) {
    setWizardClasses((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls],
    );
  }

  function toggleSubject(cls: string, subject: string) {
    setWizardSubjects((prev) => {
      const cur = prev[cls] || [];
      const next = cur.includes(subject)
        ? cur.filter((s) => s !== subject)
        : [...cur, subject];
      return { ...prev, [cls]: next };
    });
  }

  function addCustomSubject(cls: string) {
    const s = (customSubjectInput[cls] || "").trim();
    if (!s) return;
    setWizardSubjects((prev) => {
      const cur = prev[cls] || [];
      if (cur.includes(s)) return prev;
      return { ...prev, [cls]: [...cur, s] };
    });
    setCustomSubjectInput((prev) => ({ ...prev, [cls]: "" }));
  }

  function handleGenerateTimetable() {
    if (
      !wizardExamName ||
      !wizardStartDate ||
      !wizardEndDate ||
      wizardClasses.length === 0
    )
      return;
    const availDates = getAvailableDates(wizardStartDate, wizardEndDate);
    const newByClass: Record<string, ExamTimetableEntry[]> = {};
    const allNewEntries: ExamTimetableEntry[] = [];

    for (const cls of wizardClasses) {
      const subjects = wizardSubjects[cls] || [];
      const classEntries: ExamTimetableEntry[] = [];
      subjects.forEach((subj, idx) => {
        const dateStr = idx < availDates.length ? availDates[idx] : "TBD";
        const day = dateStr !== "TBD" ? parseDayFromDate(dateStr) : "TBD";
        const entry: ExamTimetableEntry = {
          id: generateId(),
          examGroup: wizardExamName,
          date: dateStr,
          day,
          timeFrom: wizardTimeFrom,
          timeTo: wizardTimeTo,
          subject: subj,
          className: cls,
          section: "",
          maxMarks: wizardMaxMarks,
          minMarks: wizardMinMarks,
          venue: "",
        };
        classEntries.push(entry);
        allNewEntries.push(entry);
      });
      newByClass[cls] = classEntries;
    }

    setGeneratedByClass(newByClass);
    setShowGenerated(true);
    // Merge into global timetable (remove old entries with same examGroup name + className)
    setTimetableEntries((prev) => {
      const filtered = prev.filter(
        (e) =>
          !(
            e.examGroup === wizardExamName &&
            wizardClasses.includes(e.className)
          ),
      );
      return [...filtered, ...allNewEntries];
    });
  }

  function handleClassEntriesChange(
    cls: string,
    newEntries: ExamTimetableEntry[],
  ) {
    setGeneratedByClass((prev) => ({ ...prev, [cls]: newEntries }));
    // Sync to global timetable
    setTimetableEntries((prev) => {
      const others = prev.filter(
        (e) => !(e.className === cls && e.examGroup === wizardExamName),
      );
      return [...others, ...newEntries];
    });
  }

  function handleDeleteFromGenerated(id: string) {
    setGeneratedByClass((prev) => {
      const next = { ...prev };
      for (const cls of Object.keys(next)) {
        next[cls] = next[cls].filter((e) => e.id !== id);
      }
      return next;
    });
    setTimetableEntries((prev) => prev.filter((e) => e.id !== id));
  }

  // Manual entry functions
  function handleAddGroup() {
    const name = newGroupName.trim();
    if (!name || examGroups.includes(name)) return;
    setExamGroups((prev) => [...prev, name]);
    setNewGroupName("");
  }

  function handleDeleteGroup(g: string) {
    setExamGroups((prev) => prev.filter((x) => x !== g));
  }

  function handleAddEntry() {
    const day = parseDayFromDate(formData.date);
    const entry: ExamTimetableEntry = { ...formData, day, id: generateId() };
    setTimetableEntries((prev) => [...prev, entry]);
    setFormData({
      ...EMPTY_FORM,
      examGroup: formData.examGroup,
      className: formData.className,
    });
  }

  function handleDeleteEntry(id: string) {
    setTimetableEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function handleEditStart(entry: ExamTimetableEntry) {
    setEditId(entry.id);
    setEditForm({ ...entry });
  }

  function handleEditSave() {
    if (!editForm) return;
    const day = parseDayFromDate(editForm.date);
    setTimetableEntries((prev) =>
      prev.map((e) => (e.id === editForm.id ? { ...editForm, day } : e)),
    );
    setEditId(null);
    setEditForm(null);
  }

  function handleEditCancel() {
    setEditId(null);
    setEditForm(null);
  }

  const filteredEntries = timetableEntries.filter((e) => {
    if (filterGroup && e.examGroup !== filterGroup) return false;
    if (filterClass && e.className !== filterClass) return false;
    return true;
  });

  function handlePrintTimetable() {
    const profile = (() => {
      try {
        return JSON.parse(localStorage.getItem("erp_school_profile") || "{}");
      } catch {
        return {};
      }
    })();
    const schoolName = profile.schoolName || "School Name";
    const rows = filteredEntries
      .map(
        (e, i) => `
          <tr style="background:${i % 2 === 0 ? "#f9f9f9" : "#fff"}">
            <td>${i + 1}</td>
            <td>${e.date}</td>
            <td>${e.day}</td>
            <td>${e.timeFrom} – ${e.timeTo}</td>
            <td>${e.subject}</td>
            <td>${e.maxMarks}</td>
            <td>${e.minMarks}</td>
            <td>${e.venue}</td>
          </tr>`,
      )
      .join("");
    const groupLabel = filterGroup || examGroups[0] || "All Groups";
    const classLabel = filterClass || "All Classes";
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html><head><title>Exam Timetable</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #000; background: #fff; padding: 20px; }
  h1 { font-size: 18px; text-align: center; font-weight: bold; }
  h2 { font-size: 14px; text-align: center; color: #1a5276; font-weight: bold; margin: 4px 0; }
  .sub { text-align: center; font-size: 12px; color: #555; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th { background: #1a5276; color: #fff; padding: 6px 8px; text-align: left; font-size: 11px; }
  td { padding: 5px 8px; border-bottom: 1px solid #ddd; font-size: 11px; }
  .footer { margin-top: 40px; display: flex; justify-content: space-between; }
  .sig { text-align: center; width: 180px; border-top: 1px solid #000; padding-top: 4px; font-size: 11px; }
  @media print { body { padding: 10px; } }
</style>
</head><body>
<h1>${schoolName}</h1>
<h2>EXAMINATION TIME TABLE</h2>
<div class="sub">${groupLabel} &nbsp;|&nbsp; ${classLabel}</div>
<table>
  <thead><tr>
    <th>Sr.</th><th>Date</th><th>Day</th><th>Time</th><th>Subject</th>
    <th>Max Marks</th><th>Min Marks</th><th>Venue</th>
  </tr></thead>
  <tbody>${rows || '<tr><td colspan="8" style="text-align:center;padding:20px;">No entries found.</td></tr>'}</tbody>
</table>
<div class="footer">
  <div class="sig">Class Teacher</div>
  <div class="sig">Principal</div>
</div>
</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }

  // ── Schedule / Results / Marksheet state ──────────────────────────────────
  const [scheduleSearch, setScheduleSearch] = useState("");
  const scheduleEntries = timetableEntries;
  const filteredSchedule = scheduleSearch.trim()
    ? scheduleEntries.filter(
        (e) =>
          e.subject.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
          e.className.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
          e.examGroup.toLowerCase().includes(scheduleSearch.toLowerCase()),
      )
    : scheduleEntries;

  const [resultsSearch, setResultsSearch] = useState("");
  const [students, setStudents] = useState<ExamStudent[]>([]);
  const [marksheetStudent, setMarksheetStudent] = useState<ExamStudent | null>(
    null,
  );

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("erp_students") || "[]");
      if (Array.isArray(raw) && raw.length > 0) {
        const mapped = raw.map((s: any) => ({
          name: s.name,
          admNo: s.admNo,
          className: s.className,
          rollNo: s.rollNo,
        }));
        setStudents(mapped);
        try {
          const presel = localStorage.getItem("admit_selected_student");
          if (presel) {
            const sel = JSON.parse(presel);
            const found = mapped.find(
              (s: ExamStudent) => s.admNo === sel.admNo,
            );
            if (found) {
              setMarksheetStudent(found);
              setTab("marksheet");
            }
            localStorage.removeItem("admit_selected_student");
          }
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const resultsData = useMemo(() => {
    return students.slice(0, 10).map((s) => ({
      student: s.name,
      admNo: s.admNo,
      className: s.className,
      math: Math.floor(60 + Math.random() * 40),
      science: Math.floor(55 + Math.random() * 45),
      english: Math.floor(50 + Math.random() * 50),
      hindi: Math.floor(65 + Math.random() * 35),
      social: Math.floor(58 + Math.random() * 42),
    }));
  }, [students]);

  const filteredResults = resultsSearch.trim()
    ? resultsData.filter(
        (r) =>
          r.student.toLowerCase().includes(resultsSearch.toLowerCase()) ||
          r.admNo.toLowerCase().includes(resultsSearch.toLowerCase()) ||
          r.className.toLowerCase().includes(resultsSearch.toLowerCase()),
      )
    : resultsData;

  const selectedMarksheet = marksheetStudent ?? (students[0] || null);

  const inputCls =
    "bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1.5 outline-none focus:border-green-500 transition";

  const canGenerate =
    wizardExamName.trim() !== "" &&
    wizardStartDate !== "" &&
    wizardEndDate !== "" &&
    wizardClasses.length > 0 &&
    wizardEndDate >= wizardStartDate;

  const orderedGeneratedClasses = wizardClasses.filter(
    (cls) => generatedByClass[cls],
  );

  return (
    <div>
      <h2 className="text-white text-lg font-semibold mb-4">Examinations</h2>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {(
          [
            { key: "timetable", label: "Timetable Maker" },
            { key: "schedule", label: "Exam Schedule" },
            { key: "results", label: "Results" },
            { key: "marksheet", label: "Print Marksheet" },
          ] as const
        ).map((t) => (
          <button
            type="button"
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded text-xs font-medium transition ${
              tab === t.key
                ? "bg-green-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
            data-ocid={`exam.${t.key}.tab`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TIMETABLE MAKER ──────────────────────────────────────────────── */}
      {tab === "timetable" && (
        <div className="space-y-4">
          {/* ── SECTION 1: Auto-Generate Wizard ──────────────────────── */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                AUTO GENERATE
              </span>
              <h3 className="text-white text-sm font-semibold">
                Exam Timetable Wizard
              </h3>
            </div>

            {/* Row 1: Exam Name, Start Date, End Date */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
              <div className="flex flex-col gap-1 lg:col-span-2">
                <label
                  htmlFor="wz-exam-name"
                  className="text-gray-400 text-[10px]"
                >
                  Exam Name *
                </label>
                <input
                  id="wz-exam-name"
                  value={wizardExamName}
                  onChange={(e) => setWizardExamName(e.target.value)}
                  placeholder="e.g. Half Yearly 2025-26"
                  className={inputCls}
                  data-ocid="exam.timetable.input"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="wz-start-date"
                  className="text-gray-400 text-[10px]"
                >
                  Start Date *
                </label>
                <input
                  id="wz-start-date"
                  type="date"
                  value={wizardStartDate}
                  onChange={(e) => setWizardStartDate(e.target.value)}
                  className={inputCls}
                  data-ocid="exam.timetable.input"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="wz-end-date"
                  className="text-gray-400 text-[10px]"
                >
                  End Date *
                </label>
                <input
                  id="wz-end-date"
                  type="date"
                  value={wizardEndDate}
                  onChange={(e) => setWizardEndDate(e.target.value)}
                  className={inputCls}
                  data-ocid="exam.timetable.input"
                />
              </div>
              {wizardStartDate &&
                wizardEndDate &&
                wizardEndDate >= wizardStartDate && (
                  <div className="flex items-end">
                    <span className="text-green-400 text-[10px]">
                      {getAvailableDates(wizardStartDate, wizardEndDate).length}{" "}
                      available days (excl. Sundays)
                    </span>
                  </div>
                )}
            </div>

            {/* Row 2: Times and Marks */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="wz-time-from"
                  className="text-gray-400 text-[10px]"
                >
                  Time From
                </label>
                <input
                  id="wz-time-from"
                  type="time"
                  value={wizardTimeFrom}
                  onChange={(e) => setWizardTimeFrom(e.target.value)}
                  className={inputCls}
                  data-ocid="exam.timetable.input"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="wz-time-to"
                  className="text-gray-400 text-[10px]"
                >
                  Time To
                </label>
                <input
                  id="wz-time-to"
                  type="time"
                  value={wizardTimeTo}
                  onChange={(e) => setWizardTimeTo(e.target.value)}
                  className={inputCls}
                  data-ocid="exam.timetable.input"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="wz-max-marks"
                  className="text-gray-400 text-[10px]"
                >
                  Max Marks
                </label>
                <input
                  id="wz-max-marks"
                  type="number"
                  value={wizardMaxMarks}
                  onChange={(e) =>
                    setWizardMaxMarks(Number.parseInt(e.target.value) || 100)
                  }
                  className={inputCls}
                  data-ocid="exam.timetable.input"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="wz-min-marks"
                  className="text-gray-400 text-[10px]"
                >
                  Min Marks (Pass)
                </label>
                <input
                  id="wz-min-marks"
                  type="number"
                  value={wizardMinMarks}
                  onChange={(e) =>
                    setWizardMinMarks(Number.parseInt(e.target.value) || 33)
                  }
                  className={inputCls}
                  data-ocid="exam.timetable.input"
                />
              </div>
            </div>

            {/* Row 3: Participating Classes */}
            <div className="mb-3">
              <p className="text-gray-400 text-[10px] block mb-1.5">
                Participating Classes *
              </p>
              <div className="flex flex-wrap gap-2">
                {CLASS_LIST.map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => toggleWizardClass(cls)}
                    className={`px-3 py-1 rounded-full text-[11px] font-medium transition border ${
                      wizardClasses.includes(cls)
                        ? "bg-green-600 border-green-500 text-white"
                        : "bg-transparent border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200"
                    }`}
                    data-ocid="exam.timetable.toggle"
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 4: Subjects per class */}
            {wizardClasses.length > 0 && (
              <div className="mb-4">
                <p className="text-gray-400 text-[10px] block mb-2">
                  Subjects per Class
                </p>
                <div className="space-y-3">
                  {wizardClasses.map((cls) => {
                    const allSubs = wizardSubjects[cls] || [];
                    const defaultSubs = (() => {
                      let d = getDefaultSubjects(cls);
                      try {
                        const raw = JSON.parse(
                          localStorage.getItem("erp_subjects") || "[]",
                        );
                        const cs = raw
                          .filter((s: any) => s.class === cls)
                          .map((s: any) => s.name as string);
                        if (cs.length > 0) d = cs;
                      } catch {
                        // ignore
                      }
                      return d;
                    })();
                    // Combine default + any custom added
                    const displaySubs = [
                      ...new Set([...defaultSubs, ...allSubs]),
                    ];
                    return (
                      <div
                        key={cls}
                        className="bg-gray-900/50 rounded-lg p-3 border border-gray-700"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white text-[11px] font-semibold">
                            {cls}
                          </span>
                          <span className="text-green-400 text-[10px]">
                            {allSubs.length} subject
                            {allSubs.length !== 1 ? "s" : ""} selected
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {displaySubs.map((subj) => (
                            <button
                              key={subj}
                              type="button"
                              onClick={() => toggleSubject(cls, subj)}
                              className={`px-2.5 py-0.5 rounded-full text-[11px] border transition ${
                                allSubs.includes(subj)
                                  ? "bg-green-700/80 border-green-600 text-white"
                                  : "bg-transparent border-gray-600 text-gray-400 hover:border-gray-400"
                              }`}
                              data-ocid="exam.timetable.toggle"
                            >
                              {subj}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={customSubjectInput[cls] || ""}
                            onChange={(e) =>
                              setCustomSubjectInput((prev) => ({
                                ...prev,
                                [cls]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) =>
                              e.key === "Enter" && addCustomSubject(cls)
                            }
                            placeholder="Add custom subject..."
                            className="bg-gray-800 border border-gray-600 text-white text-[11px] rounded px-2 py-1 outline-none focus:border-green-500 transition flex-1"
                            data-ocid="exam.timetable.input"
                          />
                          <button
                            type="button"
                            onClick={() => addCustomSubject(cls)}
                            className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-[11px] px-2 py-1 rounded transition"
                            data-ocid="exam.timetable.secondary_button"
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Generate button */}
            <button
              type="button"
              onClick={handleGenerateTimetable}
              disabled={!canGenerate}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-500 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition flex items-center gap-2"
              data-ocid="exam.timetable.primary_button"
            >
              <span className="text-base">✨</span>
              Generate Timetable
            </button>
            {!canGenerate && (
              <p className="text-gray-500 text-[10px] mt-1">
                Fill Exam Name, Start Date, End Date, and select at least one
                class to generate.
              </p>
            )}
          </div>

          {/* ── SECTION 2: Generated Timetables ──────────────────────── */}
          {showGenerated && orderedGeneratedClasses.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-white text-sm font-semibold">
                  Generated Timetables
                </h3>
                <span className="text-gray-400 text-[10px]">
                  — drag rows or use ▲▼ to reorder
                </span>
              </div>
              {orderedGeneratedClasses.map((cls, idx) => (
                <ClassTimetableCard
                  key={cls}
                  className={cls}
                  examName={wizardExamName}
                  entries={generatedByClass[cls] || []}
                  colorClass={
                    CLASS_BORDER_COLORS[idx % CLASS_BORDER_COLORS.length]
                  }
                  onEntriesChange={handleClassEntriesChange}
                  onDeleteEntry={handleDeleteFromGenerated}
                />
              ))}
            </div>
          )}

          {/* ── SECTION 3: Manual Entry (collapsible) ────────────────── */}
          <div className="border border-gray-700 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setManualExpanded((p) => !p)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-750 transition"
              data-ocid="exam.timetable.toggle"
            >
              <span className="text-gray-300 text-xs font-medium">
                ⚙ Advanced: Manual Entry
              </span>
              {manualExpanded ? (
                <ChevronUp size={14} className="text-gray-400" />
              ) : (
                <ChevronDown size={14} className="text-gray-400" />
              )}
            </button>

            {manualExpanded && (
              <div className="bg-gray-800/60 p-4 space-y-4">
                {/* Exam Group Management */}
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                  <h3 className="text-white text-xs font-semibold mb-2">
                    Exam Groups
                  </h3>
                  <div className="flex gap-2 mb-3">
                    <input
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddGroup()}
                      placeholder="e.g. Half Yearly 2025-26"
                      className={`${inputCls} flex-1`}
                      data-ocid="exam.timetable.input"
                    />
                    <button
                      type="button"
                      onClick={handleAddGroup}
                      className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded transition"
                      data-ocid="exam.timetable.secondary_button"
                    >
                      + Add Group
                    </button>
                  </div>
                  {examGroups.length === 0 ? (
                    <p
                      className="text-gray-500 text-xs"
                      data-ocid="exam.timetable.empty_state"
                    >
                      No exam groups yet. Add one above.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {examGroups.map((g) => (
                        <span
                          key={g}
                          className="inline-flex items-center gap-1.5 bg-gray-700 text-gray-300 text-[11px] px-2.5 py-1 rounded-full"
                        >
                          {g}
                          <button
                            type="button"
                            onClick={() => handleDeleteGroup(g)}
                            className="text-gray-500 hover:text-red-400 transition"
                            data-ocid="exam.timetable.delete_button"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Manual Entry Form */}
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                  <h3 className="text-white text-xs font-semibold mb-2">
                    Add Entry Manually
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="tt-group"
                        className="text-gray-400 text-[10px]"
                      >
                        Exam Group
                      </label>
                      <select
                        id="tt-group"
                        value={formData.examGroup}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            examGroup: e.target.value,
                          }))
                        }
                        className={inputCls}
                        data-ocid="exam.timetable.select"
                      >
                        <option value="">Select Group</option>
                        {examGroups.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="tt-class"
                        className="text-gray-400 text-[10px]"
                      >
                        Class
                      </label>
                      <select
                        id="tt-class"
                        value={formData.className}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            className: e.target.value,
                          }))
                        }
                        className={inputCls}
                        data-ocid="exam.timetable.select"
                      >
                        <option value="">Select Class</option>
                        {CLASS_LIST.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="tt-section"
                        className="text-gray-400 text-[10px]"
                      >
                        Section
                      </label>
                      <input
                        id="tt-section"
                        value={formData.section}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            section: e.target.value,
                          }))
                        }
                        placeholder="A"
                        className={inputCls}
                        data-ocid="exam.timetable.input"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="tt-date"
                        className="text-gray-400 text-[10px]"
                      >
                        Date (DD/MM/YYYY)
                      </label>
                      <input
                        id="tt-date"
                        value={formData.date}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, date: e.target.value }))
                        }
                        placeholder="DD/MM/YYYY"
                        className={inputCls}
                        data-ocid="exam.timetable.input"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="tt-from"
                        className="text-gray-400 text-[10px]"
                      >
                        Time From
                      </label>
                      <input
                        id="tt-from"
                        type="time"
                        value={formData.timeFrom}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            timeFrom: e.target.value,
                          }))
                        }
                        className={inputCls}
                        data-ocid="exam.timetable.input"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="tt-to"
                        className="text-gray-400 text-[10px]"
                      >
                        Time To
                      </label>
                      <input
                        id="tt-to"
                        type="time"
                        value={formData.timeTo}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, timeTo: e.target.value }))
                        }
                        className={inputCls}
                        data-ocid="exam.timetable.input"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="tt-subject"
                        className="text-gray-400 text-[10px]"
                      >
                        Subject
                      </label>
                      <input
                        id="tt-subject"
                        value={formData.subject}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            subject: e.target.value,
                          }))
                        }
                        placeholder="Mathematics"
                        className={inputCls}
                        data-ocid="exam.timetable.input"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="tt-max-marks"
                        className="text-gray-400 text-[10px]"
                      >
                        Max Marks
                      </label>
                      <input
                        id="tt-max-marks"
                        type="number"
                        value={formData.maxMarks}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            maxMarks: Number.parseInt(e.target.value) || 0,
                          }))
                        }
                        className={inputCls}
                        data-ocid="exam.timetable.input"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="tt-min-marks"
                        className="text-gray-400 text-[10px]"
                      >
                        Min Marks
                      </label>
                      <input
                        id="tt-min-marks"
                        type="number"
                        value={formData.minMarks}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            minMarks: Number.parseInt(e.target.value) || 0,
                          }))
                        }
                        className={inputCls}
                        data-ocid="exam.timetable.input"
                      />
                    </div>
                    <div className="flex flex-col gap-1 col-span-2">
                      <label
                        htmlFor="tt-venue"
                        className="text-gray-400 text-[10px]"
                      >
                        Venue / Room
                      </label>
                      <input
                        id="tt-venue"
                        value={formData.venue}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, venue: e.target.value }))
                        }
                        placeholder="Room 101"
                        className={inputCls}
                        data-ocid="exam.timetable.input"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddEntry}
                    disabled={
                      !formData.examGroup ||
                      !formData.className ||
                      !formData.subject ||
                      !formData.date
                    }
                    className="mt-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xs px-4 py-1.5 rounded transition"
                    data-ocid="exam.timetable.secondary_button"
                  >
                    + Add Entry
                  </button>
                </div>

                {/* Manual Entry Table */}
                <div>
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={filterGroup}
                        onChange={(e) => setFilterGroup(e.target.value)}
                        className={inputCls}
                        data-ocid="exam.timetable.select"
                      >
                        <option value="">All Groups</option>
                        {examGroups.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                      <select
                        value={filterClass}
                        onChange={(e) => setFilterClass(e.target.value)}
                        className={inputCls}
                        data-ocid="exam.timetable.select"
                      >
                        <option value="">All Classes</option>
                        {CLASS_LIST.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={handlePrintTimetable}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded transition"
                      data-ocid="exam.timetable.print_button"
                    >
                      <Printer size={12} /> Print Timetable
                    </button>
                  </div>

                  <div className="rounded-lg overflow-hidden border border-gray-700">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ background: "#1a1f2e" }}>
                            {[
                              "Sr.",
                              "Date",
                              "Day",
                              "Time",
                              "Subject",
                              "Class",
                              "Sec.",
                              "Max",
                              "Min",
                              "Venue",
                              "Actions",
                            ].map((h) => (
                              <th
                                key={h}
                                className="text-left px-3 py-2 text-gray-400 whitespace-nowrap"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredEntries.length === 0 ? (
                            <tr>
                              <td
                                colSpan={11}
                                className="px-3 py-8 text-center text-gray-500"
                                data-ocid="exam.timetable.empty_state"
                              >
                                No timetable entries yet. Use the form above to
                                add entries.
                              </td>
                            </tr>
                          ) : (
                            filteredEntries.map((e, i) =>
                              editId === e.id && editForm ? (
                                <tr
                                  key={e.id}
                                  style={{ background: "#1a2744" }}
                                  data-ocid={`exam.timetable.item.${i + 1}`}
                                >
                                  <td className="px-2 py-1.5 text-gray-400">
                                    {i + 1}
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <input
                                      value={editForm.date}
                                      onChange={(ev) =>
                                        setEditForm((p) =>
                                          p
                                            ? { ...p, date: ev.target.value }
                                            : p,
                                        )
                                      }
                                      className={`${inputCls} w-24`}
                                    />
                                  </td>
                                  <td className="px-2 py-1.5 text-green-400 text-[10px]">
                                    {editForm
                                      ? parseDayFromDate(editForm.date)
                                      : ""}
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <div className="flex gap-1">
                                      <input
                                        value={editForm.timeFrom}
                                        onChange={(ev) =>
                                          setEditForm((p) =>
                                            p
                                              ? {
                                                  ...p,
                                                  timeFrom: ev.target.value,
                                                }
                                              : p,
                                          )
                                        }
                                        className={`${inputCls} w-20`}
                                        placeholder="From"
                                      />
                                      <input
                                        value={editForm.timeTo}
                                        onChange={(ev) =>
                                          setEditForm((p) =>
                                            p
                                              ? {
                                                  ...p,
                                                  timeTo: ev.target.value,
                                                }
                                              : p,
                                          )
                                        }
                                        className={`${inputCls} w-20`}
                                        placeholder="To"
                                      />
                                    </div>
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <input
                                      value={editForm.subject}
                                      onChange={(ev) =>
                                        setEditForm((p) =>
                                          p
                                            ? { ...p, subject: ev.target.value }
                                            : p,
                                        )
                                      }
                                      className={`${inputCls} w-24`}
                                    />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <select
                                      value={editForm.className}
                                      onChange={(ev) =>
                                        setEditForm((p) =>
                                          p
                                            ? {
                                                ...p,
                                                className: ev.target.value,
                                              }
                                            : p,
                                        )
                                      }
                                      className={`${inputCls} w-20`}
                                    >
                                      {CLASS_LIST.map((c) => (
                                        <option key={c} value={c}>
                                          {c}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <input
                                      value={editForm.section}
                                      onChange={(ev) =>
                                        setEditForm((p) =>
                                          p
                                            ? { ...p, section: ev.target.value }
                                            : p,
                                        )
                                      }
                                      className={`${inputCls} w-10`}
                                    />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <input
                                      type="number"
                                      value={editForm.maxMarks}
                                      onChange={(ev) =>
                                        setEditForm((p) =>
                                          p
                                            ? {
                                                ...p,
                                                maxMarks:
                                                  Number.parseInt(
                                                    ev.target.value,
                                                  ) || 0,
                                              }
                                            : p,
                                        )
                                      }
                                      className={`${inputCls} w-14`}
                                    />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <input
                                      type="number"
                                      value={editForm.minMarks}
                                      onChange={(ev) =>
                                        setEditForm((p) =>
                                          p
                                            ? {
                                                ...p,
                                                minMarks:
                                                  Number.parseInt(
                                                    ev.target.value,
                                                  ) || 0,
                                              }
                                            : p,
                                        )
                                      }
                                      className={`${inputCls} w-14`}
                                    />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <input
                                      value={editForm.venue}
                                      onChange={(ev) =>
                                        setEditForm((p) =>
                                          p
                                            ? { ...p, venue: ev.target.value }
                                            : p,
                                        )
                                      }
                                      className={`${inputCls} w-20`}
                                    />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <div className="flex gap-1">
                                      <button
                                        type="button"
                                        onClick={handleEditSave}
                                        className="bg-green-600 hover:bg-green-700 text-white px-2 py-0.5 rounded text-[10px] transition"
                                        data-ocid="exam.timetable.save_button"
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleEditCancel}
                                        className="bg-gray-600 hover:bg-gray-500 text-white px-2 py-0.5 rounded text-[10px] transition"
                                        data-ocid="exam.timetable.cancel_button"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ) : (
                                <tr
                                  key={e.id}
                                  style={{
                                    background:
                                      i % 2 === 0 ? "#111827" : "#0f1117",
                                  }}
                                  data-ocid={`exam.timetable.item.${i + 1}`}
                                >
                                  <td className="px-3 py-2 text-gray-400">
                                    {i + 1}
                                  </td>
                                  <td className="px-3 py-2 text-white whitespace-nowrap">
                                    {e.date}
                                  </td>
                                  <td className="px-3 py-2 text-yellow-400 whitespace-nowrap">
                                    {e.day}
                                  </td>
                                  <td className="px-3 py-2 text-gray-300 whitespace-nowrap">
                                    {e.timeFrom}
                                    {e.timeTo ? ` – ${e.timeTo}` : ""}
                                  </td>
                                  <td className="px-3 py-2 text-blue-300 font-medium">
                                    {e.subject}
                                  </td>
                                  <td className="px-3 py-2 text-gray-300">
                                    {e.className}
                                  </td>
                                  <td className="px-3 py-2 text-gray-300">
                                    {e.section}
                                  </td>
                                  <td className="px-3 py-2 text-green-400">
                                    {e.maxMarks}
                                  </td>
                                  <td className="px-3 py-2 text-red-400">
                                    {e.minMarks}
                                  </td>
                                  <td className="px-3 py-2 text-gray-400">
                                    {e.venue}
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleEditStart(e)}
                                        className="text-blue-400 hover:text-blue-300 transition"
                                        data-ocid="exam.timetable.edit_button"
                                      >
                                        <Pencil size={12} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteEntry(e.id)}
                                        className="text-red-400 hover:text-red-300 transition"
                                        data-ocid="exam.timetable.delete_button"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ),
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EXAM SCHEDULE ────────────────────────────────────────────────── */}
      {tab === "schedule" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-400 text-xs">
              All exam timetable entries from Timetable Maker
            </p>
            <div className="flex items-center bg-gray-800 border border-gray-700 rounded px-2 py-1.5">
              <Search size={12} className="text-gray-400 mr-1" />
              <input
                value={scheduleSearch}
                onChange={(e) => setScheduleSearch(e.target.value)}
                placeholder="Search schedule..."
                className="bg-transparent text-gray-300 text-xs outline-none w-36"
                data-ocid="exam.schedule.search_input"
              />
            </div>
          </div>
          <div className="rounded-lg overflow-hidden border border-gray-700">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#1a1f2e" }}>
                  {[
                    "Exam Group",
                    "Date",
                    "Day",
                    "Time",
                    "Subject",
                    "Class",
                    "Max Marks",
                  ].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSchedule.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-gray-500"
                      data-ocid="exam.schedule.empty_state"
                    >
                      No exam schedule found. Use Timetable Maker to add
                      entries.
                    </td>
                  </tr>
                ) : (
                  filteredSchedule.map((e, i) => (
                    <tr
                      key={e.id}
                      style={{
                        background: i % 2 === 0 ? "#111827" : "#0f1117",
                      }}
                      data-ocid={`exam.schedule.item.${i + 1}`}
                    >
                      <td className="px-3 py-2 text-blue-400">{e.examGroup}</td>
                      <td className="px-3 py-2 text-white">{e.date}</td>
                      <td className="px-3 py-2 text-yellow-400">{e.day}</td>
                      <td className="px-3 py-2 text-gray-300">
                        {e.timeFrom}
                        {e.timeTo ? ` – ${e.timeTo}` : ""}
                      </td>
                      <td className="px-3 py-2 text-blue-300 font-medium">
                        {e.subject}
                      </td>
                      <td className="px-3 py-2 text-gray-300">{e.className}</td>
                      <td className="px-3 py-2 text-green-400">{e.maxMarks}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── RESULTS ─────────────────────────────────────────────────────── */}
      {tab === "results" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-400 text-xs">Mid-Term 2026 Results</p>
            <div className="flex items-center bg-gray-800 border border-gray-700 rounded px-2 py-1.5">
              <Search size={12} className="text-gray-400 mr-1" />
              <input
                value={resultsSearch}
                onChange={(e) => setResultsSearch(e.target.value)}
                placeholder="Search by name/class..."
                className="bg-transparent text-gray-300 text-xs outline-none w-40"
                data-ocid="exam.results.search_input"
              />
            </div>
          </div>
          <div className="rounded-lg overflow-hidden border border-gray-700">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#1a1f2e" }}>
                  {[
                    "Student",
                    "Class",
                    "Math",
                    "Science",
                    "English",
                    "Hindi",
                    "Social",
                    "Total",
                    "%",
                    "Grade",
                  ].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredResults.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-3 py-8 text-center text-gray-500"
                      data-ocid="exam.results.empty_state"
                    >
                      No results found.
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((r, i) => {
                    const total =
                      r.math + r.science + r.english + r.hindi + r.social;
                    const pct = (total / 500) * 100;
                    return (
                      <tr
                        key={r.student}
                        style={{
                          background: i % 2 === 0 ? "#111827" : "#0f1117",
                        }}
                        data-ocid={`exam.results.item.${i + 1}`}
                      >
                        <td className="px-3 py-2 text-white">{r.student}</td>
                        <td className="px-3 py-2 text-gray-400">
                          {r.className}
                        </td>
                        <td className="px-3 py-2 text-gray-300">{r.math}</td>
                        <td className="px-3 py-2 text-gray-300">{r.science}</td>
                        <td className="px-3 py-2 text-gray-300">{r.english}</td>
                        <td className="px-3 py-2 text-gray-300">{r.hindi}</td>
                        <td className="px-3 py-2 text-gray-300">{r.social}</td>
                        <td className="px-3 py-2 text-white font-medium">
                          {total}/500
                        </td>
                        <td className="px-3 py-2 text-yellow-400">
                          {pct.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              pct >= 60
                                ? "bg-green-900/50 text-green-400"
                                : "bg-red-900/50 text-red-400"
                            }`}
                          >
                            {getGrade(pct)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PRINT MARKSHEET ─────────────────────────────────────────────── */}
      {tab === "marksheet" && (
        <div className="max-w-2xl">
          <div className="mb-4 flex items-center gap-3">
            <label
              htmlFor="exam-marksheet-student"
              className="text-gray-400 text-xs"
            >
              Select Student:
            </label>
            <select
              id="exam-marksheet-student"
              value={marksheetStudent?.admNo || selectedMarksheet?.admNo || ""}
              onChange={(e) => {
                const s = students.find((st) => st.admNo === e.target.value);
                if (s) setMarksheetStudent(s);
              }}
              className="bg-gray-800 border border-gray-600 text-white text-xs rounded px-2 py-1.5 outline-none"
              data-ocid="exam.marksheet.select"
            >
              {students.map((s) => (
                <option key={s.admNo} value={s.admNo}>
                  {s.name} ({s.admNo})
                </option>
              ))}
            </select>
          </div>
          {selectedMarksheet && (
            <div
              className="rounded-lg p-6 border border-gray-700"
              style={{ background: "#1a1f2e" }}
            >
              <div className="text-center border-b border-gray-600 pb-4 mb-4">
                <h3 className="text-yellow-400 text-xl font-bold">
                  PSM SCHOOL
                </h3>
                <p className="text-gray-300 text-sm">
                  Progress Report Card - Session 2025-26
                </p>
                <p className="text-gray-400 text-xs">Mid-Term Examination</p>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                <div>
                  <span className="text-gray-400">Student Name: </span>
                  <span className="text-white">{selectedMarksheet.name}</span>
                </div>
                <div>
                  <span className="text-gray-400">Class: </span>
                  <span className="text-white">
                    {selectedMarksheet.className}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Roll No: </span>
                  <span className="text-white">{selectedMarksheet.rollNo}</span>
                </div>
                <div>
                  <span className="text-gray-400">Admission No: </span>
                  <span className="text-white">{selectedMarksheet.admNo}</span>
                </div>
              </div>
              <table className="w-full text-xs mb-4">
                <thead>
                  <tr className="border-b border-gray-600">
                    {["Subject", "Max Marks", "Marks Obtained", "Grade"].map(
                      (h) => (
                        <th key={h} className="text-left py-1 text-gray-400">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Mathematics", 100, 78],
                    ["Science", 100, 82],
                    ["English", 100, 74],
                    ["Hindi", 100, 85],
                    ["Social Science", 100, 79],
                  ].map(([s, m, o]) => (
                    <tr key={String(s)} className="border-b border-gray-800">
                      <td className="py-1.5 text-white">{s}</td>
                      <td className="py-1.5 text-gray-300">{m}</td>
                      <td className="py-1.5 text-green-400 font-medium">{o}</td>
                      <td className="py-1.5">
                        <span className="text-blue-400">
                          {getGrade(Number(o))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-gray-400 text-xs">Total: </span>
                  <span className="text-white font-bold">398/500</span>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Percentage: </span>
                  <span className="text-yellow-400 font-bold">79.6%</span>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Grade: </span>
                  <span className="text-green-400 font-bold text-lg">B+</span>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Result: </span>
                  <span className="text-green-400 font-bold">PASS</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 rounded"
                data-ocid="exam.marksheet.primary_button"
              >
                Print Marksheet
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
