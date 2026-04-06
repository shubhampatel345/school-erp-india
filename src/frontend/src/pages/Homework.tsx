import {
  BarChart2,
  CheckSquare,
  Edit2,
  Plus,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

interface HWRecord {
  id: string;
  class: string;
  section: string;
  subject: string;
  title: string;
  description: string;
  assignedDate: string;
  dueDate: string;
  status: "Open" | "Closed";
}

interface Submission {
  hwId: string;
  studentAdmNo: string;
  studentName: string;
  submitted: boolean;
}

const CLASSES = [
  "Class 1",
  "Class 3",
  "Class 5",
  "Class 7",
  "Class 8",
  "Class 10",
  "Class 12",
];
const SECTIONS = ["A", "B", "C"];
const SUBJECTS = [
  "Mathematics",
  "English",
  "Hindi",
  "Science",
  "Social Science",
  "Computer",
  "Physics",
  "Chemistry",
  "Biology",
];

const DEMO_HW: HWRecord[] = [
  {
    id: "hw1",
    class: "Class 10",
    section: "A",
    subject: "Mathematics",
    title: "Trigonometry Practice Set",
    description:
      "Complete exercises 5.1 to 5.5 from NCERT. Show all working steps.",
    assignedDate: "2026-03-15",
    dueDate: "2026-03-20",
    status: "Open",
  },
  {
    id: "hw2",
    class: "Class 7",
    section: "B",
    subject: "Science",
    title: "Photosynthesis Diagram",
    description:
      "Draw a labeled diagram of photosynthesis process and write notes.",
    assignedDate: "2026-03-15",
    dueDate: "2026-03-18",
    status: "Open",
  },
  {
    id: "hw3",
    class: "Class 5",
    section: "A",
    subject: "English",
    title: "Festival Essay",
    description: "Write a 200-word essay on 'My Favourite Festival'.",
    assignedDate: "2026-03-14",
    dueDate: "2026-03-17",
    status: "Closed",
  },
  {
    id: "hw4",
    class: "Class 8",
    section: "A",
    subject: "Social Science",
    title: "India Map Work",
    description: "Mark all Indian states and capitals on the outline map.",
    assignedDate: "2026-03-16",
    dueDate: "2026-03-22",
    status: "Open",
  },
  {
    id: "hw5",
    class: "Class 12",
    section: "A",
    subject: "Physics",
    title: "Optics Problems",
    description: "Solve Q1-Q15 from Chapter 9 Ray Optics in NCERT.",
    assignedDate: "2026-03-17",
    dueDate: "2026-03-24",
    status: "Open",
  },
  {
    id: "hw6",
    class: "Class 10",
    section: "B",
    subject: "English",
    title: "Letter Writing",
    description: "Write a formal letter to the Principal requesting leave.",
    assignedDate: "2026-03-10",
    dueDate: "2026-03-13",
    status: "Closed",
  },
];

const CHART_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#8b5cf6",
  "#14b8a6",
  "#eab308",
];

function loadLS<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

export function Homework() {
  const [tab, setTab] = useState<"list" | "tracker" | "analytics">("list");
  const [homework, setHomework] = useState<HWRecord[]>(() =>
    loadLS("erp_homework", DEMO_HW),
  );
  const [submissions, setSubmissions] = useState<Submission[]>(() =>
    loadLS("erp_hw_submissions", []),
  );
  const [selectedHw, setSelectedHw] = useState<HWRecord | null>(null);
  const [filterClass, setFilterClass] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | "Open" | "Closed">("");
  const [showModal, setShowModal] = useState(false);
  const [editHw, setEditHw] = useState<HWRecord | null>(null);
  const [form, setForm] = useState({
    class: "Class 10",
    section: "A",
    subject: "Mathematics",
    title: "",
    description: "",
    dueDate: "",
    status: "Open" as "Open" | "Closed",
  });

  useEffect(() => {
    localStorage.setItem("erp_homework", JSON.stringify(homework));
  }, [homework]);
  useEffect(() => {
    localStorage.setItem("erp_hw_submissions", JSON.stringify(submissions));
  }, [submissions]);

  const students: Array<{ admNo: string; name: string; className: string }> =
    (() => {
      try {
        return JSON.parse(localStorage.getItem("erp_students") || "[]");
      } catch {
        return [];
      }
    })();

  const filtered = homework.filter((hw) => {
    return (
      (!filterClass || hw.class === filterClass) &&
      (!filterSubject || hw.subject === filterSubject) &&
      (!filterStatus || hw.status === filterStatus)
    );
  });

  const saveHw = () => {
    if (!form.title.trim()) return;
    const today = new Date().toISOString().split("T")[0];
    if (editHw) {
      setHomework((prev) =>
        prev.map((h) => (h.id === editHw.id ? { ...editHw, ...form } : h)),
      );
      toast.success("Homework updated");
    } else {
      const newHw: HWRecord = {
        id: Date.now().toString(),
        ...form,
        assignedDate: today,
      };
      setHomework((prev) => [...prev, newHw]);
      toast.success("Homework assigned");
    }
    setShowModal(false);
    setEditHw(null);
    setForm({
      class: "Class 10",
      section: "A",
      subject: "Mathematics",
      title: "",
      description: "",
      dueDate: "",
      status: "Open",
    });
  };

  const toggleSubmission = (hwId: string, admNo: string, name: string) => {
    const existing = submissions.find(
      (s) => s.hwId === hwId && s.studentAdmNo === admNo,
    );
    if (existing) {
      setSubmissions((prev) =>
        prev.map((s) =>
          s.hwId === hwId && s.studentAdmNo === admNo
            ? { ...s, submitted: !s.submitted }
            : s,
        ),
      );
    } else {
      setSubmissions((prev) => [
        ...prev,
        { hwId, studentAdmNo: admNo, studentName: name, submitted: true },
      ]);
    }
  };

  const getSubmissionStatus = (hwId: string, admNo: string) => {
    const s = submissions.find(
      (s) => s.hwId === hwId && s.studentAdmNo === admNo,
    );
    return s?.submitted || false;
  };

  const getHwStudents = (hw: HWRecord) =>
    students
      .filter((s) => {
        const cls = s.className?.toLowerCase() || "";
        return cls.includes(hw.class.toLowerCase().replace("class ", ""));
      })
      .slice(0, 20);

  // Analytics data
  const subjectDist = SUBJECTS.map((sub) => ({
    name: sub,
    count: homework.filter((h) => h.subject === sub).length,
  })).filter((s) => s.count > 0);
  const classDist = CLASSES.map((cls) => ({
    name: cls,
    Total: homework.filter((h) => h.class === cls).length,
    Open: homework.filter((h) => h.class === cls && h.status === "Open").length,
  })).filter((c) => c.Total > 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white text-lg font-semibold">
          Homework Management
        </h2>
        <button
          type="button"
          onClick={() => {
            setEditHw(null);
            setForm({
              class: "Class 10",
              section: "A",
              subject: "Mathematics",
              title: "",
              description: "",
              dueDate: "",
              status: "Open",
            });
            setShowModal(true);
          }}
          data-ocid="homework.primary_button"
          className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded"
        >
          <Plus size={13} /> Assign Homework
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          {
            label: "Total Assigned",
            value: homework.length,
            color: "text-white",
          },
          {
            label: "Open",
            value: homework.filter((h) => h.status === "Open").length,
            color: "text-green-400",
          },
          {
            label: "Closed",
            value: homework.filter((h) => h.status === "Closed").length,
            color: "text-gray-400",
          },
          {
            label: "Overdue",
            value: homework.filter(
              (h) =>
                h.status === "Open" &&
                h.dueDate < new Date().toISOString().split("T")[0],
            ).length,
            color: "text-red-400",
          },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-lg p-3"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <p className="text-gray-400 text-xs">{k.label}</p>
            <p className={`${k.color} text-2xl font-bold`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        {(["list", "tracker", "analytics"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            data-ocid={`homework.${t}.tab`}
            className={`px-4 py-1.5 rounded text-xs font-medium capitalize transition ${tab === t ? "bg-green-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
          >
            {t === "list"
              ? "Homework List"
              : t === "tracker"
                ? "Submission Tracker"
                : "Analytics"}
          </button>
        ))}
      </div>

      {/* ─ HOMEWORK LIST ─ */}
      {tab === "list" && (
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-gray-300 text-xs outline-none"
              data-ocid="homework.class.select"
            >
              <option value="">All Classes</option>
              {CLASSES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-gray-300 text-xs outline-none"
            >
              <option value="">All Subjects</option>
              {SUBJECTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as "" | "Open" | "Closed")
              }
              className="bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-gray-300 text-xs outline-none"
            >
              <option value=" ">All Status</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div
                className="text-center py-8 text-gray-500"
                data-ocid="homework.list.empty_state"
              >
                No homework found.
              </div>
            ) : (
              filtered.map((hw, i) => {
                const overdue =
                  hw.status === "Open" &&
                  hw.dueDate < new Date().toISOString().split("T")[0];
                return (
                  <div
                    key={hw.id}
                    className="rounded-lg p-4"
                    style={{
                      background: "#1a1f2e",
                      border: `1px solid ${overdue ? "#7f1d1d" : "#374151"}`,
                    }}
                    data-ocid={`homework.list.item.${i + 1}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-medium text-sm">
                            {hw.title}
                          </h3>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${hw.status === "Open" ? "bg-green-900/50 text-green-400" : "bg-gray-700 text-gray-400"}`}
                          >
                            {hw.status}
                          </span>
                          {overdue && (
                            <span className="text-[10px] bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded-full">
                              Overdue
                            </span>
                          )}
                        </div>
                        <div className="flex gap-3 text-[10px] mb-2">
                          <span className="text-blue-400">
                            {hw.class}-{hw.section}
                          </span>
                          <span className="text-purple-400">{hw.subject}</span>
                          <span className="text-gray-500">
                            Assigned: {hw.assignedDate}
                          </span>
                          <span
                            className={`font-medium ${overdue ? "text-red-400" : "text-yellow-400"}`}
                          >
                            Due: {hw.dueDate}
                          </span>
                        </div>
                        <p className="text-gray-400 text-xs">
                          {hw.description}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          type="button"
                          onClick={() => {
                            setTab("tracker");
                            setSelectedHw(hw);
                          }}
                          className="text-green-400 hover:text-green-300 text-[10px] bg-green-900/30 px-2 py-1 rounded"
                          data-ocid={`homework.tracker.button.${i + 1}`}
                        >
                          <CheckSquare size={12} className="inline mr-1" />
                          Track
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditHw(hw);
                            setForm({
                              class: hw.class,
                              section: hw.section,
                              subject: hw.subject,
                              title: hw.title,
                              description: hw.description,
                              dueDate: hw.dueDate,
                              status: hw.status,
                            });
                            setShowModal(true);
                          }}
                          className="text-blue-400 hover:text-blue-300"
                          data-ocid={`homework.edit_button.${i + 1}`}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setHomework((prev) =>
                              prev.filter((x) => x.id !== hw.id),
                            );
                            toast.success("Removed");
                          }}
                          className="text-red-400 hover:text-red-300"
                          data-ocid={`homework.delete_button.${i + 1}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ─ SUBMISSION TRACKER ─ */}
      {tab === "tracker" && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <select
              value={selectedHw?.id || ""}
              onChange={(e) =>
                setSelectedHw(
                  homework.find((h) => h.id === e.target.value) || null,
                )
              }
              className="flex-1 max-w-md bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
              data-ocid="homework.tracker.select"
            >
              <option value="">-- Select Homework --</option>
              {homework.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.class} | {h.subject}: {h.title}
                </option>
              ))}
            </select>
          </div>
          {selectedHw &&
            (() => {
              const hwStudents = getHwStudents(selectedHw);
              const submittedCount = hwStudents.filter((s) =>
                getSubmissionStatus(selectedHw.id, s.admNo),
              ).length;
              return (
                <div>
                  <div
                    className="flex items-center gap-4 mb-3 p-3 rounded-lg"
                    style={{
                      background: "#1a1f2e",
                      border: "1px solid #374151",
                    }}
                  >
                    <span className="text-white font-medium text-xs">
                      {selectedHw.title}
                    </span>
                    <span className="text-blue-400 text-xs">
                      {selectedHw.class}-{selectedHw.section}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {selectedHw.subject}
                    </span>
                    <span className="ml-auto text-xs">
                      <span className="text-green-400 font-bold">
                        {submittedCount}
                      </span>
                      <span className="text-gray-500">
                        /{hwStudents.length}
                      </span>{" "}
                      submitted
                    </span>
                  </div>
                  {hwStudents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No students found for this class. Add students first.
                    </div>
                  ) : (
                    <div className="rounded-lg overflow-hidden border border-gray-700">
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ background: "#1a1f2e" }}>
                            {[
                              "#",
                              "Adm No.",
                              "Student Name",
                              "Submitted",
                              "Action",
                            ].map((h) => (
                              <th
                                key={h}
                                className="text-left px-3 py-2 text-gray-400 font-medium"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {hwStudents.map((s, i) => {
                            const submitted = getSubmissionStatus(
                              selectedHw.id,
                              s.admNo,
                            );
                            return (
                              <tr
                                key={s.admNo}
                                style={{
                                  background:
                                    i % 2 === 0 ? "#111827" : "#0f1117",
                                }}
                                data-ocid={`homework.tracker.item.${i + 1}`}
                              >
                                <td className="px-3 py-2 text-gray-500">
                                  {i + 1}
                                </td>
                                <td className="px-3 py-2 text-yellow-400">
                                  {s.admNo}
                                </td>
                                <td className="px-3 py-2 text-white">
                                  {s.name}
                                </td>
                                <td className="px-3 py-2">
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded ${submitted ? "bg-green-900/50 text-green-400" : "bg-gray-800 text-gray-500"}`}
                                  >
                                    {submitted ? "Submitted" : "Pending"}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleSubmission(
                                        selectedHw.id,
                                        s.admNo,
                                        s.name,
                                      )
                                    }
                                    className="flex items-center gap-1 text-xs"
                                    data-ocid={`homework.tracker.toggle.${i + 1}`}
                                  >
                                    {submitted ? (
                                      <CheckSquare
                                        size={14}
                                        className="text-green-400"
                                      />
                                    ) : (
                                      <Square
                                        size={14}
                                        className="text-gray-400"
                                      />
                                    )}
                                    <span
                                      className={
                                        submitted
                                          ? "text-green-400"
                                          : "text-gray-400"
                                      }
                                    >
                                      {submitted ? "Unmark" : "Mark Submitted"}
                                    </span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}
          {!selectedHw && (
            <div
              className="text-center py-8 text-gray-500"
              data-ocid="homework.tracker.empty_state"
            >
              Select a homework assignment to track submissions.
            </div>
          )}
        </div>
      )}

      {/* ─ ANALYTICS ─ */}
      {tab === "analytics" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div
              className="rounded-lg p-4"
              style={{ background: "#1a1f2e", border: "1px solid #374151" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 size={14} className="text-blue-400" />
                <h3 className="text-gray-200 text-sm font-medium">
                  Class-wise Homework Count
                </h3>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={classDist}
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#9ca3af", fontSize: 9 }}
                  />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#1f2937",
                      border: "none",
                      color: "#fff",
                    }}
                  />
                  <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 10 }} />
                  <Bar dataKey="Total" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Open" fill="#22c55e" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div
              className="rounded-lg p-4"
              style={{ background: "#1a1f2e", border: "1px solid #374151" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 size={14} className="text-purple-400" />
                <h3 className="text-gray-200 text-sm font-medium">
                  Subject-wise Distribution
                </h3>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={subjectDist}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {subjectDist.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#1f2937",
                      border: "none",
                      color: "#fff",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ─ HOMEWORK MODAL ─ */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          data-ocid="homework.modal"
        >
          <div
            className="rounded-xl p-6 w-full max-w-md"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">
                {editHw ? "Edit Homework" : "Assign Homework"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditHw(null);
                }}
                className="text-gray-400 hover:text-white"
                data-ocid="homework.close_button"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="hw-class"
                    className="text-gray-400 text-xs block mb-1"
                  >
                    Class
                  </label>
                  <select
                    id="hw-class"
                    value={form.class}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, class: e.target.value }))
                    }
                    className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
                    data-ocid="homework.class.select"
                  >
                    {CLASSES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="hw-sec"
                    className="text-gray-400 text-xs block mb-1"
                  >
                    Section
                  </label>
                  <select
                    id="hw-sec"
                    value={form.section}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, section: e.target.value }))
                    }
                    className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
                  >
                    {SECTIONS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="hw-status"
                    className="text-gray-400 text-xs block mb-1"
                  >
                    Status
                  </label>
                  <select
                    id="hw-status"
                    value={form.status}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        status: e.target.value as "Open" | "Closed",
                      }))
                    }
                    className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
                  >
                    <option>Open</option>
                    <option>Closed</option>
                  </select>
                </div>
              </div>
              <div>
                <label
                  htmlFor="hw-subject"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Subject
                </label>
                <select
                  id="hw-subject"
                  value={form.subject}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, subject: e.target.value }))
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="hw-title"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Title
                </label>
                <input
                  id="hw-title"
                  value={form.title}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, title: e.target.value }))
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-green-500"
                  data-ocid="homework.input"
                />
              </div>
              <div>
                <label
                  htmlFor="hw-due"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Due Date
                </label>
                <input
                  id="hw-due"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, dueDate: e.target.value }))
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="hw-desc"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Description
                </label>
                <textarea
                  id="hw-desc"
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none resize-none"
                  data-ocid="homework.textarea"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={saveHw}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded"
                data-ocid="homework.submit_button"
              >
                {editHw ? "Update" : "Assign"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditHw(null);
                }}
                className="flex-1 bg-gray-700 text-white text-xs py-2 rounded"
                data-ocid="homework.cancel_button"
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
