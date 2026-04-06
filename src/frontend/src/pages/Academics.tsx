import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Edit2,
  GraduationCap,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const DEMO_CLASSES = [
  { name: "Class 1", sections: ["A", "B"], max: 40 },
  { name: "Class 3", sections: ["A", "B"], max: 40 },
  { name: "Class 5", sections: ["A", "B", "C"], max: 45 },
  { name: "Class 8", sections: ["A", "B"], max: 40 },
  { name: "Class 10", sections: ["A", "B"], max: 40 },
  { name: "Class 12", sections: ["A (Sci)", "B (Com)"], max: 35 },
];

const DEMO_SUBJECTS = [
  { id: 1, name: "Mathematics", classes: ["Class 8", "Class 9", "Class 10"] },
  {
    id: 2,
    name: "English",
    classes: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"],
  },
  {
    id: 3,
    name: "Hindi",
    classes: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6"],
  },
  { id: 4, name: "Science", classes: ["Class 6", "Class 7", "Class 8"] },
  {
    id: 5,
    name: "Social Science",
    classes: ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"],
  },
  { id: 6, name: "Physics", classes: ["Class 11", "Class 12"] },
  { id: 7, name: "Chemistry", classes: ["Class 11", "Class 12"] },
];

const DEMO_SYLLABUS = [
  {
    id: 1,
    class: "Class 10",
    subject: "Mathematics",
    chapter: "Real Numbers",
    status: "Completed",
  },
  {
    id: 2,
    class: "Class 10",
    subject: "Mathematics",
    chapter: "Polynomials",
    status: "Completed",
  },
  {
    id: 3,
    class: "Class 10",
    subject: "Mathematics",
    chapter: "Linear Equations",
    status: "In Progress",
  },
  {
    id: 4,
    class: "Class 10",
    subject: "Mathematics",
    chapter: "Quadratic Equations",
    status: "Pending",
  },
  {
    id: 5,
    class: "Class 10",
    subject: "Mathematics",
    chapter: "Arithmetic Progressions",
    status: "Pending",
  },
  {
    id: 6,
    class: "Class 10",
    subject: "Mathematics",
    chapter: "Triangles",
    status: "Pending",
  },
];

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const PERIODS = [
  "8:00-8:45",
  "8:45-9:30",
  "9:45-10:30",
  "10:30-11:15",
  "11:30-12:15",
  "12:15-1:00",
];

const CLASS_BADGE_COLORS = [
  "bg-blue-900/50 text-blue-300 border-blue-800",
  "bg-purple-900/50 text-purple-300 border-purple-800",
  "bg-yellow-900/50 text-yellow-300 border-yellow-800",
  "bg-pink-900/50 text-pink-300 border-pink-800",
  "bg-cyan-900/50 text-cyan-300 border-cyan-800",
  "bg-orange-900/50 text-orange-300 border-orange-800",
  "bg-teal-900/50 text-teal-300 border-teal-800",
  "bg-green-900/50 text-green-300 border-green-800",
];

interface ClassRecord {
  name: string;
  sections: string[];
  max: number;
}
interface SubjectRecord {
  id: number;
  name: string;
  classes: string[];
}
interface SyllabusRecord {
  id: number;
  class: string;
  subject: string;
  chapter: string;
  status: string;
}
interface TimetableEntry {
  day: string;
  period: string;
  subject: string;
  class: string;
  section: string;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

export function Academics() {
  const [tab, setTab] = useState<
    "classes" | "subjects" | "timetable" | "syllabus"
  >("classes");

  // Classes
  const [classes, setClasses] = useState<ClassRecord[]>(() =>
    loadFromStorage("erp_classes", DEMO_CLASSES),
  );
  const [showClassModal, setShowClassModal] = useState(false);
  const [editClass, setEditClass] = useState<ClassRecord | null>(null);
  const [classForm, setClassForm] = useState({
    name: "",
    sections: "",
    max: "40",
  });

  // Subjects
  const [subjects, setSubjects] = useState<SubjectRecord[]>(() =>
    loadFromStorage("erp_subjects", DEMO_SUBJECTS),
  );
  const [showSubModal, setShowSubModal] = useState(false);
  const [editSub, setEditSub] = useState<SubjectRecord | null>(null);
  const [subForm, setSubForm] = useState({ name: "", classes: [] as string[] });

  // Timetable
  const [timetable, setTimetable] = useState<TimetableEntry[]>(() =>
    loadFromStorage("erp_timetable", []),
  );
  const [ttClass, setTtClass] = useState("Class 10");
  const [ttSection, setTtSection] = useState("A");
  const [showTtModal, setShowTtModal] = useState(false);
  const [ttForm, setTtForm] = useState({
    day: "Monday",
    period: "8:00-8:45",
    subject: "Mathematics",
  });

  // Syllabus
  const [syllabus, setSyllabus] = useState<SyllabusRecord[]>(() =>
    loadFromStorage("erp_syllabus", DEMO_SYLLABUS),
  );
  const [sylClass, setSylClass] = useState("Class 10");
  const [sylSubject, setSylSubject] = useState("Mathematics");
  const [showSylModal, setShowSylModal] = useState(false);
  const [sylForm, setSylForm] = useState({ chapter: "", status: "Pending" });

  useEffect(() => {
    localStorage.setItem("erp_classes", JSON.stringify(classes));
  }, [classes]);
  useEffect(() => {
    localStorage.setItem("erp_subjects", JSON.stringify(subjects));
  }, [subjects]);
  useEffect(() => {
    localStorage.setItem("erp_timetable", JSON.stringify(timetable));
  }, [timetable]);
  useEffect(() => {
    localStorage.setItem("erp_syllabus", JSON.stringify(syllabus));
  }, [syllabus]);

  const saveClass = () => {
    if (!classForm.name.trim()) return;
    const secs = classForm.sections
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (editClass) {
      setClasses((prev) =>
        prev.map((c) =>
          c.name === editClass.name
            ? {
                name: classForm.name,
                sections: secs,
                max: Number(classForm.max) || 40,
              }
            : c,
        ),
      );
      toast.success("Class updated");
    } else {
      setClasses((prev) => [
        ...prev,
        {
          name: classForm.name,
          sections: secs,
          max: Number(classForm.max) || 40,
        },
      ]);
      toast.success("Class added");
    }
    setShowClassModal(false);
    setEditClass(null);
    setClassForm({ name: "", sections: "", max: "40" });
  };

  const deleteClass = (name: string) => {
    setClasses((prev) => prev.filter((c) => c.name !== name));
    toast.success("Class deleted");
  };

  const toggleSubjectClass = (className: string) => {
    setSubForm((prev) => ({
      ...prev,
      classes: prev.classes.includes(className)
        ? prev.classes.filter((c) => c !== className)
        : [...prev.classes, className],
    }));
  };

  const saveSubject = () => {
    if (!subForm.name.trim()) return;
    if (editSub) {
      setSubjects((prev) =>
        prev.map((s) =>
          s.id === editSub.id
            ? { ...s, name: subForm.name, classes: subForm.classes }
            : s,
        ),
      );
      toast.success("Subject updated");
    } else {
      setSubjects((prev) => [
        ...prev,
        { id: Date.now(), name: subForm.name, classes: subForm.classes },
      ]);
      toast.success("Subject added");
    }
    setShowSubModal(false);
    setEditSub(null);
    setSubForm({ name: "", classes: [] });
  };

  const saveTimetable = () => {
    const entry = { ...ttForm, class: ttClass, section: ttSection };
    const exists = timetable.find(
      (t) =>
        t.class === ttClass &&
        t.section === ttSection &&
        t.day === ttForm.day &&
        t.period === ttForm.period,
    );
    if (exists) {
      setTimetable((prev) =>
        prev.map((t) =>
          t.class === ttClass &&
          t.section === ttSection &&
          t.day === ttForm.day &&
          t.period === ttForm.period
            ? entry
            : t,
        ),
      );
    } else {
      setTimetable((prev) => [...prev, entry]);
    }
    toast.success("Timetable saved");
    setShowTtModal(false);
  };

  const saveSyllabus = () => {
    if (!sylForm.chapter.trim()) return;
    setSyllabus((prev) => [
      ...prev,
      { id: Date.now(), class: sylClass, subject: sylSubject, ...sylForm },
    ]);
    toast.success("Chapter added");
    setShowSylModal(false);
    setSylForm({ chapter: "", status: "Pending" });
  };

  const updateSyllabusStatus = (id: number, status: string) => {
    setSyllabus((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s)),
    );
  };

  const filteredSyllabus = syllabus.filter(
    (s) => s.class === sylClass && s.subject === sylSubject,
  );
  const syllabusSubjects = [
    ...new Set(
      subjects.filter((s) => s.classes.includes(sylClass)).map((s) => s.name),
    ),
  ];
  const completedCount = filteredSyllabus.filter(
    (s) => s.status === "Completed",
  ).length;
  const progress =
    filteredSyllabus.length > 0
      ? Math.round((completedCount / filteredSyllabus.length) * 100)
      : 0;

  const ttGrid = (day: string) => {
    return PERIODS.map((period) => {
      const entry = timetable.find(
        (t) =>
          t.class === ttClass &&
          t.section === ttSection &&
          t.day === day &&
          t.period === period,
      );
      return entry?.subject || "";
    });
  };

  const tabs = [
    { key: "classes", label: "Classes & Sections" },
    { key: "subjects", label: "Subjects" },
    { key: "timetable", label: "Timetable" },
    { key: "syllabus", label: "Syllabus" },
  ] as const;

  return (
    <div>
      <h2 className="text-white text-lg font-semibold mb-4">Academics</h2>
      <div className="flex flex-wrap gap-1 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            data-ocid={`academics.${t.key}.tab`}
            className={`px-4 py-1.5 rounded text-xs font-medium transition ${
              tab === t.key
                ? "bg-green-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─ CLASSES & SECTIONS ─ */}
      {tab === "classes" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-xs">
              {classes.length} classes configured
            </span>
            <button
              type="button"
              onClick={() => {
                setEditClass(null);
                setClassForm({ name: "", sections: "", max: "40" });
                setShowClassModal(true);
              }}
              data-ocid="academics.classes.primary_button"
              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded"
            >
              <Plus size={13} /> Add Class
            </button>
          </div>
          <div className="space-y-2">
            {classes.map((c, i) => (
              <div
                key={c.name}
                className="rounded-lg p-4 flex items-center justify-between"
                style={{ background: "#1a1f2e", border: "1px solid #374151" }}
                data-ocid={`academics.classes.item.${i + 1}`}
              >
                <div>
                  <div className="flex items-center gap-3">
                    <GraduationCap size={16} className="text-green-400" />
                    <span className="text-white font-semibold text-sm">
                      {c.name}
                    </span>
                    <span className="text-gray-500 text-xs">
                      Max: {c.max} students
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2 ml-7">
                    {c.sections.map((s) => (
                      <span
                        key={s}
                        className="bg-blue-900/40 text-blue-300 text-[10px] px-2 py-0.5 rounded-full border border-blue-800"
                      >
                        Section {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditClass(c);
                      setClassForm({
                        name: c.name,
                        sections: c.sections.join(", "),
                        max: String(c.max),
                      });
                      setShowClassModal(true);
                    }}
                    className="text-blue-400 hover:text-blue-300 p-1"
                    data-ocid={`academics.classes.edit_button.${i + 1}`}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteClass(c.name)}
                    className="text-red-400 hover:text-red-300 p-1"
                    data-ocid={`academics.classes.delete_button.${i + 1}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─ SUBJECTS ─ */}
      {tab === "subjects" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-xs">
              {subjects.length} subjects
            </span>
            <button
              type="button"
              onClick={() => {
                setEditSub(null);
                setSubForm({ name: "", classes: [] });
                setShowSubModal(true);
              }}
              data-ocid="academics.subjects.primary_button"
              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded"
            >
              <Plus size={13} /> Add Subject
            </button>
          </div>
          <div className="rounded-lg overflow-hidden border border-gray-700">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#1a1f2e" }}>
                  {["#", "Subject Name", "Classes Assigned", "Actions"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-3 py-2 text-gray-400 font-medium"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {subjects.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-8 text-center text-gray-500"
                      data-ocid="academics.subjects.empty_state"
                    >
                      No subjects. Click &quot;Add Subject&quot; to begin.
                    </td>
                  </tr>
                ) : (
                  subjects.map((s, i) => (
                    <tr
                      key={s.id}
                      style={{
                        background: i % 2 === 0 ? "#111827" : "#0f1117",
                      }}
                      data-ocid={`academics.subjects.item.${i + 1}`}
                    >
                      <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2 text-white font-medium">
                        {s.name}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {s.classes.length === 0 ? (
                            <span className="text-gray-600">—</span>
                          ) : (
                            s.classes.map((cls, ci) => (
                              <span
                                key={cls}
                                className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                  CLASS_BADGE_COLORS[
                                    ci % CLASS_BADGE_COLORS.length
                                  ]
                                }`}
                              >
                                {cls}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditSub(s);
                              setSubForm({
                                name: s.name,
                                classes: [...s.classes],
                              });
                              setShowSubModal(true);
                            }}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSubjects((prev) =>
                                prev.filter((x) => x.id !== s.id),
                              );
                              toast.success("Deleted");
                            }}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─ TIMETABLE ─ */}
      {tab === "timetable" && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <select
              value={ttClass}
              onChange={(e) => setTtClass(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
              data-ocid="academics.timetable.select"
            >
              {classes.map((c) => (
                <option key={c.name}>{c.name}</option>
              ))}
            </select>
            <select
              value={ttSection}
              onChange={(e) => setTtSection(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
            >
              {(classes.find((c) => c.name === ttClass)?.sections || ["A"]).map(
                (s) => (
                  <option key={s}>{s}</option>
                ),
              )}
            </select>
            <button
              type="button"
              onClick={() => setShowTtModal(true)}
              data-ocid="academics.timetable.primary_button"
              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded"
            >
              <Plus size={13} /> Add Period
            </button>
          </div>
          <div className="rounded-lg overflow-hidden border border-gray-700">
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ minWidth: 700 }}>
                <thead>
                  <tr style={{ background: "#1a1f2e" }}>
                    <th className="text-left px-3 py-2 text-gray-400">Day</th>
                    {PERIODS.map((p) => (
                      <th
                        key={p}
                        className="text-center px-2 py-2 text-gray-400 text-[10px]"
                      >
                        {p}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day, i) => (
                    <tr
                      key={day}
                      style={{
                        background: i % 2 === 0 ? "#111827" : "#0f1117",
                      }}
                    >
                      <td className="px-3 py-2 text-white font-medium">
                        {day}
                      </td>
                      {ttGrid(day).map((sub, pi) => (
                        <td
                          key={`${day}-${PERIODS[pi] || pi}`}
                          className="px-2 py-2 text-center"
                        >
                          {sub ? (
                            <span className="bg-blue-900/40 text-blue-300 text-[10px] px-2 py-0.5 rounded">
                              {sub}
                            </span>
                          ) : (
                            <span className="text-gray-700 text-[10px]">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─ SYLLABUS ─ */}
      {tab === "syllabus" && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <select
              value={sylClass}
              onChange={(e) => {
                setSylClass(e.target.value);
                setSylSubject(
                  subjects.filter((s) => s.classes.includes(e.target.value))[0]
                    ?.name || "",
                );
              }}
              className="bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
              data-ocid="academics.syllabus.select"
            >
              {classes.map((c) => (
                <option key={c.name}>{c.name}</option>
              ))}
            </select>
            <select
              value={sylSubject}
              onChange={(e) => setSylSubject(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
            >
              {syllabusSubjects.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowSylModal(true)}
              data-ocid="academics.syllabus.primary_button"
              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded"
            >
              <Plus size={13} /> Add Chapter
            </button>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 bg-gray-800 rounded-full h-3 overflow-hidden border border-gray-700">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-gray-300 text-xs font-medium">
              {progress}% Complete
            </span>
            <span className="text-gray-500 text-xs">
              {completedCount}/{filteredSyllabus.length} chapters
            </span>
          </div>
          <div className="space-y-2">
            {filteredSyllabus.length === 0 ? (
              <div
                className="text-center py-8 text-gray-500 text-sm"
                data-ocid="academics.syllabus.empty_state"
              >
                No chapters added yet.
              </div>
            ) : (
              filteredSyllabus.map((s, i) => (
                <div
                  key={s.id}
                  className="rounded-lg p-3 flex items-center justify-between"
                  style={{ background: "#1a1f2e", border: "1px solid #374151" }}
                  data-ocid={`academics.syllabus.item.${i + 1}`}
                >
                  <div className="flex items-center gap-3">
                    <BookOpen
                      size={14}
                      className={
                        s.status === "Completed"
                          ? "text-green-400"
                          : s.status === "In Progress"
                            ? "text-yellow-400"
                            : "text-gray-500"
                      }
                    />
                    <span className="text-white text-xs">{s.chapter}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={s.status}
                      onChange={(e) =>
                        updateSyllabusStatus(s.id, e.target.value)
                      }
                      className="bg-gray-800 border border-gray-600 rounded px-2 py-0.5 text-xs outline-none text-gray-200"
                    >
                      {["Pending", "In Progress", "Completed"].map((st) => (
                        <option key={st}>{st}</option>
                      ))}
                    </select>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        s.status === "Completed"
                          ? "bg-green-900/50 text-green-400"
                          : s.status === "In Progress"
                            ? "bg-yellow-900/50 text-yellow-400"
                            : "bg-gray-800 text-gray-500"
                      }`}
                    >
                      {s.status}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSyllabus((prev) => prev.filter((x) => x.id !== s.id))
                      }
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─ CLASS MODAL ─ */}
      {showClassModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          data-ocid="academics.classes.modal"
        >
          <div
            className="rounded-xl p-6 w-full max-w-md"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">
                {editClass ? "Edit Class" : "Add Class"}
              </h3>
              <button
                type="button"
                onClick={() => setShowClassModal(false)}
                className="text-gray-400 hover:text-white"
                data-ocid="academics.classes.close_button"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { id: "cls-name", label: "Class Name", key: "name" },
                {
                  id: "cls-sections",
                  label: "Sections (comma separated)",
                  key: "sections",
                },
                { id: "cls-max", label: "Max Students", key: "max" },
              ].map((f) => (
                <div key={f.id}>
                  <label
                    htmlFor={f.id}
                    className="text-gray-400 text-xs block mb-1"
                  >
                    {f.label}
                  </label>
                  <input
                    id={f.id}
                    value={classForm[f.key as keyof typeof classForm]}
                    onChange={(e) =>
                      setClassForm((p) => ({ ...p, [f.key]: e.target.value }))
                    }
                    className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-green-500"
                    data-ocid="academics.classes.input"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={saveClass}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded"
                data-ocid="academics.classes.submit_button"
              >
                {editClass ? "Update" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setShowClassModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs py-2 rounded"
                data-ocid="academics.classes.cancel_button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─ SUBJECT MODAL ─ */}
      {showSubModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          data-ocid="academics.subjects.modal"
        >
          <div
            className="rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">
                {editSub ? "Edit Subject" : "Add Subject"}
              </h3>
              <button
                type="button"
                onClick={() => setShowSubModal(false)}
                className="text-gray-400 hover:text-white"
                data-ocid="academics.subjects.close_button"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              {/* Subject Name */}
              <div>
                <label
                  htmlFor="sub-name"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Subject Name
                </label>
                <input
                  id="sub-name"
                  value={subForm.name}
                  onChange={(e) =>
                    setSubForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. Hindi, Mathematics"
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-green-500"
                  data-ocid="academics.subjects.input"
                />
              </div>

              {/* Classes selection */}
              <div>
                <p className="text-gray-400 text-xs block mb-2">
                  Classes Assigned{" "}
                  <span className="text-gray-600 font-normal">
                    ({subForm.classes.length} selected)
                  </span>
                </p>
                {classes.length === 0 ? (
                  <p className="text-yellow-500 text-xs bg-yellow-900/20 border border-yellow-800 rounded px-3 py-2">
                    ⚠️ Add classes first in the Classes &amp; Sections tab.
                  </p>
                ) : (
                  <div
                    className="rounded-lg p-3 grid grid-cols-2 gap-2"
                    style={{
                      background: "#111827",
                      border: "1px solid #374151",
                    }}
                  >
                    {classes.map((c) => (
                      <label
                        key={c.name}
                        className="flex items-center gap-2 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={subForm.classes.includes(c.name)}
                          onChange={() => toggleSubjectClass(c.name)}
                          className="rounded border-gray-600 bg-gray-800 accent-green-500"
                          data-ocid="academics.subjects.checkbox"
                        />
                        <span
                          className={`text-xs transition ${
                            subForm.classes.includes(c.name)
                              ? "text-green-400 font-medium"
                              : "text-gray-400 group-hover:text-gray-200"
                          }`}
                        >
                          {c.name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick select all/none */}
              {classes.length > 0 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSubForm((p) => ({
                        ...p,
                        classes: classes.map((c) => c.name),
                      }))
                    }
                    className="text-[10px] text-green-400 hover:text-green-300 border border-green-800 hover:border-green-600 px-2 py-1 rounded transition"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubForm((p) => ({ ...p, classes: [] }))}
                    className="text-[10px] text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-500 px-2 py-1 rounded transition"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={saveSubject}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded"
                data-ocid="academics.subjects.submit_button"
              >
                {editSub ? "Update" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setShowSubModal(false)}
                className="flex-1 bg-gray-700 text-white text-xs py-2 rounded"
                data-ocid="academics.subjects.cancel_button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─ TIMETABLE MODAL ─ */}
      {showTtModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          data-ocid="academics.timetable.modal"
        >
          <div
            className="rounded-xl p-6 w-full max-w-sm"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">
                Add Period — {ttClass} {ttSection}
              </h3>
              <button
                type="button"
                onClick={() => setShowTtModal(false)}
                className="text-gray-400 hover:text-white"
                data-ocid="academics.timetable.close_button"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="tt-day"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Day
                </label>
                <select
                  id="tt-day"
                  value={ttForm.day}
                  onChange={(e) =>
                    setTtForm((p) => ({ ...p, day: e.target.value }))
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
                >
                  {DAYS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="tt-period"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Period
                </label>
                <select
                  id="tt-period"
                  value={ttForm.period}
                  onChange={(e) =>
                    setTtForm((p) => ({ ...p, period: e.target.value }))
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
                >
                  {PERIODS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="tt-subject"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Subject
                </label>
                <input
                  id="tt-subject"
                  list="tt-subject-list"
                  value={ttForm.subject}
                  onChange={(e) =>
                    setTtForm((p) => ({ ...p, subject: e.target.value }))
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-green-500"
                />
                <datalist id="tt-subject-list">
                  {subjects.map((s) => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={saveTimetable}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded"
                data-ocid="academics.timetable.submit_button"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowTtModal(false)}
                className="flex-1 bg-gray-700 text-white text-xs py-2 rounded"
                data-ocid="academics.timetable.cancel_button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─ SYLLABUS MODAL ─ */}
      {showSylModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          data-ocid="academics.syllabus.modal"
        >
          <div
            className="rounded-xl p-6 w-full max-w-sm"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Add Chapter</h3>
              <button
                type="button"
                onClick={() => setShowSylModal(false)}
                className="text-gray-400 hover:text-white"
                data-ocid="academics.syllabus.close_button"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="syl-chapter"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Chapter Name
                </label>
                <input
                  id="syl-chapter"
                  value={sylForm.chapter}
                  onChange={(e) =>
                    setSylForm((p) => ({ ...p, chapter: e.target.value }))
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-green-500"
                  data-ocid="academics.syllabus.input"
                />
              </div>
              <div>
                <label
                  htmlFor="syl-status"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Status
                </label>
                <select
                  id="syl-status"
                  value={sylForm.status}
                  onChange={(e) =>
                    setSylForm((p) => ({ ...p, status: e.target.value }))
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
                >
                  {["Pending", "In Progress", "Completed"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={saveSyllabus}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded"
                data-ocid="academics.syllabus.submit_button"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowSylModal(false)}
                className="flex-1 bg-gray-700 text-white text-xs py-2 rounded"
                data-ocid="academics.syllabus.cancel_button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
