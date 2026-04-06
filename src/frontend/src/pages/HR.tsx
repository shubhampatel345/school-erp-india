import { Download, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DateInput } from "../components/DateInput";
import { generateCredentialsFromData } from "../context/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────────────────

interface SubjectAssignment {
  subject: string;
  classFrom: string;
  classTo: string;
}

interface TeacherSubjectRecord {
  teacherId: number;
  teacherName: string;
  assignments: SubjectAssignment[];
}

interface StaffMember {
  id: number;
  name: string;
  designation: string;
  department: string;
  salary: number;
  contact: string;
  dob: string;
  joinDate: string;
  status: "Active" | "Inactive";
  subjectAssignments?: SubjectAssignment[];
}

// ─── Constants ───────────────────────────────────────────────────────────────────────────

const DESIGNATIONS = [
  "Teacher",
  "Admin",
  "Accountant",
  "Librarian",
  "Receptionist",
  "Nurse",
  "Clerk",
  "Peon",
  "Driver",
  "Other",
];

const CLASS_OPTIONS = [
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

const DEFAULT_SUBJECTS = [
  "Hindi",
  "English",
  "Mathematics",
  "Science",
  "Social Science",
  "Sanskrit",
  "Computer",
  "Art",
  "Physical Education",
  "Moral Science",
  "General Knowledge",
];

const SUBJECT_BADGE_COLORS = [
  "bg-blue-900/60 text-blue-300",
  "bg-purple-900/60 text-purple-300",
  "bg-yellow-900/60 text-yellow-300",
  "bg-pink-900/60 text-pink-300",
  "bg-cyan-900/60 text-cyan-300",
  "bg-orange-900/60 text-orange-300",
  "bg-teal-900/60 text-teal-300",
];

// ─── Empty form factory ───────────────────────────────────────────────────────────────────

function emptyForm() {
  return {
    name: "",
    designation: "",
    department: "",
    salary: "",
    contact: "",
    dob: "",
    joinDate: "",
  };
}

function emptySubjectRow(): SubjectAssignment {
  return { subject: "", classFrom: "", classTo: "" };
}

// ─── SubjectRow component ────────────────────────────────────────────────────────────────────

function SubjectRow({
  row,
  index,
  subjectSuggestions,
  onChange,
  onRemove,
  canRemove,
}: {
  row: SubjectAssignment;
  index: number;
  subjectSuggestions: string[];
  onChange: (
    idx: number,
    field: keyof SubjectAssignment,
    value: string,
  ) => void;
  onRemove: (idx: number) => void;
  canRemove: boolean;
}) {
  const listId = `subj-list-${index}`;
  return (
    <div
      className="grid gap-2 items-end"
      style={{ gridTemplateColumns: "1fr 140px 140px 32px" }}
      data-ocid={`hr.teacher.subject.row.${index + 1}`}
    >
      <div>
        {index === 0 && (
          <p className="text-gray-500 text-[10px] mb-1">Subject</p>
        )}
        <input
          list={listId}
          value={row.subject}
          onChange={(e) => onChange(index, "subject", e.target.value)}
          placeholder="e.g. English"
          className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-green-500"
          data-ocid="hr.teacher.subject.input"
        />
        <datalist id={listId}>
          {subjectSuggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
      <div>
        {index === 0 && (
          <p className="text-gray-500 text-[10px] mb-1">Class From</p>
        )}
        <select
          value={row.classFrom}
          onChange={(e) => onChange(index, "classFrom", e.target.value)}
          className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-green-500"
          data-ocid="hr.teacher.subject.select"
        >
          <option value="">From</option>
          {CLASS_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        {index === 0 && (
          <p className="text-gray-500 text-[10px] mb-1">Class To</p>
        )}
        <select
          value={row.classTo}
          onChange={(e) => onChange(index, "classTo", e.target.value)}
          className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-green-500"
          data-ocid="hr.teacher.subject.select"
        >
          <option value="">To</option>
          {CLASS_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={() => onRemove(index)}
        disabled={!canRemove}
        className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-900/20 disabled:opacity-30 disabled:cursor-not-allowed transition"
        style={{ marginTop: index === 0 ? "18px" : undefined }}
        data-ocid="hr.teacher.subject.delete_button"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────────────────────

export function HumanResource() {
  const [tab, setTab] = useState<"directory" | "payroll" | "leave">(
    "directory",
  );
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [form, setForm] = useState(emptyForm());
  const [subjectRows, setSubjectRows] = useState<SubjectAssignment[]>([
    emptySubjectRow(),
  ]);
  const [subjectSuggestions, setSubjectSuggestions] =
    useState<string[]>(DEFAULT_SUBJECTS);
  const [stepError, setStepError] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  // Load subjects from Academics
  useEffect(() => {
    try {
      const raw = JSON.parse(
        localStorage.getItem("erp_subjects") || "[]",
      ) as Array<{ name?: string }>;
      const names = raw.map((s) => s.name).filter(Boolean) as string[];
      if (names.length > 0) {
        setSubjectSuggestions([...new Set([...DEFAULT_SUBJECTS, ...names])]);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Load staff from localStorage on mount
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("erp_staff") || "[]");
      if (Array.isArray(raw) && raw.length > 0) {
        const mapped: StaffMember[] = raw.map((s: any, i: number) => ({
          id: s.id ?? i + 1,
          name: s.name || "",
          designation: s.designation || "",
          department: s.department || "",
          salary: s.salary || 0,
          contact: s.contact || "",
          dob: s.dob || "",
          joinDate: s.joiningDate || s.joinDate || "",
          status: s.status || "Active",
          subjectAssignments: s.subjectAssignments || undefined,
        }));
        setStaff(mapped);
      }
    } catch {
      setStaff([]);
    }
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    if (staff.length > 0) {
      localStorage.setItem(
        "erp_staff",
        JSON.stringify(
          staff.map((s) => ({
            id: s.id,
            name: s.name,
            designation: s.designation,
            department: s.department,
            salary: s.salary,
            contact: s.contact,
            dob: s.dob,
            joiningDate: s.joinDate,
            status: s.status,
            subjectAssignments: s.subjectAssignments,
          })),
        ),
      );
    }
  }, [staff]);

  const isTeacher = form.designation === "Teacher";

  function openModal() {
    setForm(emptyForm());
    setSubjectRows([emptySubjectRow()]);
    setWizardStep(1);
    setStepError("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setWizardStep(1);
    setStepError("");
  }

  function goToStep2() {
    if (!form.name.trim()) {
      setStepError("Name is required.");
      return;
    }
    setStepError("");
    setWizardStep(2);
  }

  function updateSubjectRow(
    idx: number,
    field: keyof SubjectAssignment,
    value: string,
  ) {
    setSubjectRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    );
  }

  function removeSubjectRow(idx: number) {
    setSubjectRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function addSubjectRow() {
    setSubjectRows((prev) => [...prev, emptySubjectRow()]);
  }

  function saveTeacherSubjectAssignments(
    teacherId: number,
    teacherName: string,
    assignments: SubjectAssignment[],
  ) {
    try {
      const existing: TeacherSubjectRecord[] = JSON.parse(
        localStorage.getItem("erp_teacher_subject_assignments") || "[]",
      );
      const idx = existing.findIndex((r) => r.teacherId === teacherId);
      const record: TeacherSubjectRecord = {
        teacherId,
        teacherName,
        assignments,
      };
      if (idx >= 0) {
        existing[idx] = record;
      } else {
        existing.push(record);
      }
      localStorage.setItem(
        "erp_teacher_subject_assignments",
        JSON.stringify(existing),
      );
    } catch {
      /* ignore */
    }
  }

  function handleAdd() {
    if (!form.name.trim()) {
      setStepError("Name is required.");
      return;
    }
    if (isTeacher) {
      const validRows = subjectRows.filter((r) => r.subject.trim());
      if (validRows.length === 0) {
        setStepError("Add at least one subject assignment.");
        return;
      }
    }
    setStepError("");

    const newId = Date.now();
    const validSubjects = isTeacher
      ? subjectRows.filter((r) => r.subject.trim())
      : [];

    const newMember: StaffMember = {
      id: newId,
      name: form.name,
      designation: form.designation,
      department: form.department,
      salary: Number(form.salary) || 0,
      contact: form.contact,
      dob: form.dob,
      joinDate: form.joinDate,
      status: "Active",
      subjectAssignments: isTeacher ? validSubjects : undefined,
    };

    setStaff((prev) => [...prev, newMember]);

    if (isTeacher && validSubjects.length > 0) {
      saveTeacherSubjectAssignments(newId, form.name, validSubjects);
    }

    closeModal();
    setTimeout(() => generateCredentialsFromData(), 100);
  }

  // ─── Export CSV ─────────────────────────────────────────────────────────────────────
  function exportStaff() {
    const headers = [
      "Name",
      "Designation",
      "Department",
      "Salary",
      "Contact",
      "DOB",
      "Join Date",
      "Status",
    ];
    const rows = staff.map((s) => [
      s.name,
      s.designation,
      s.department,
      String(s.salary),
      s.contact,
      s.dob,
      s.joinDate,
      s.status,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${(v || "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "staff_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Import CSV ─────────────────────────────────────────────────────────────────────
  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.trim().split("\n");
      if (lines.length < 2) return;
      // skip header row
      const imported: StaffMember[] = lines
        .slice(1)
        .map((line, i) => {
          const cols = line
            .split(",")
            .map((c) => c.trim().replace(/^"|"$/g, "").replace(/""/g, '"'));
          return {
            id: Date.now() + i,
            name: cols[0] || "",
            designation: cols[1] || "",
            department: cols[2] || "",
            salary: Number(cols[3]) || 0,
            contact: cols[4] || "",
            dob: cols[5] || "",
            joinDate: cols[6] || "",
            status: (cols[7] as "Active" | "Inactive") || "Active",
          };
        })
        .filter((s) => s.name.trim());
      setStaff((prev) => [...prev, ...imported]);
      toast.success(`Imported ${imported.length} staff member(s)`);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const totalPayroll = staff
    .filter((s) => s.status === "Active")
    .reduce((sum, s) => sum + s.salary, 0);

  const filteredStaff = staffSearch.trim()
    ? staff.filter(
        (s) =>
          s.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
          s.designation.toLowerCase().includes(staffSearch.toLowerCase()) ||
          s.department.toLowerCase().includes(staffSearch.toLowerCase()),
      )
    : staff;

  return (
    <div>
      <h2 className="text-white text-lg font-semibold mb-4">Human Resource</h2>
      <div className="flex gap-1 mb-4">
        {(["directory", "payroll", "leave"] as const).map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded text-xs font-medium capitalize transition ${
              tab === t
                ? "bg-green-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {t === "directory"
              ? "Staff Directory"
              : t === "payroll"
                ? "Payroll"
                : "Leave Management"}
          </button>
        ))}
      </div>

      {/* ── DIRECTORY TAB ────────────────────────────────────────────────────────────────────── */}
      {tab === "directory" && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <p className="text-gray-400 text-xs">
                Total Active Staff:{" "}
                {filteredStaff.filter((s) => s.status === "Active").length}
              </p>
              <div className="flex items-center bg-gray-800 border border-gray-700 rounded px-2 py-1">
                <Search size={12} className="text-gray-400 mr-1" />
                <input
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  placeholder="Search staff..."
                  className="bg-transparent text-gray-300 text-xs outline-none w-36"
                  data-ocid="hr.staff.search_input"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Export CSV */}
              <button
                type="button"
                onClick={exportStaff}
                className="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded"
                data-ocid="hr.staff.secondary_button"
              >
                <Download size={14} /> Export CSV
              </button>

              {/* Import CSV */}
              <>
                <input
                  ref={importRef}
                  type="file"
                  accept=".csv"
                  onChange={handleImport}
                  className="hidden"
                  id="staff-import-input"
                />
                <button
                  type="button"
                  onClick={() => importRef.current?.click()}
                  className="flex items-center gap-1 bg-blue-700 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded"
                  data-ocid="hr.staff.upload_button"
                >
                  <Upload size={14} /> Import CSV
                </button>
              </>

              {/* Add Staff */}
              <button
                type="button"
                onClick={openModal}
                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded"
                data-ocid="hr.staff.primary_button"
              >
                <Plus size={14} /> Add Staff
              </button>
            </div>
          </div>
          <div className="rounded-lg overflow-hidden border border-gray-700">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#1a1f2e" }}>
                  {[
                    "Name",
                    "Designation",
                    "Department",
                    "Subjects",
                    "Salary",
                    "Contact",
                    "Join Date",
                    "Status",
                  ].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-8 text-center text-gray-500"
                      data-ocid="hr.staff.empty_state"
                    >
                      No staff found.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((s, i) => (
                    <tr
                      key={s.id}
                      style={{
                        background: i % 2 === 0 ? "#111827" : "#0f1117",
                      }}
                      data-ocid={`hr.staff.item.${i + 1}`}
                    >
                      <td className="px-3 py-2 text-white font-medium">
                        {s.name}
                      </td>
                      <td className="px-3 py-2 text-blue-400">
                        {s.designation}
                      </td>
                      <td className="px-3 py-2 text-gray-300">
                        {s.department}
                      </td>
                      <td className="px-3 py-2">
                        {s.subjectAssignments &&
                        s.subjectAssignments.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {s.subjectAssignments.map((a, si) => (
                              <span
                                key={`${a.subject}-${si}`}
                                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                  SUBJECT_BADGE_COLORS[
                                    si % SUBJECT_BADGE_COLORS.length
                                  ]
                                }`}
                              >
                                {a.subject}
                                {a.classFrom && a.classTo
                                  ? ` (${a.classFrom}-${a.classTo})`
                                  : ""}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-green-400">
                        ₹{s.salary.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2 text-gray-400">{s.contact}</td>
                      <td className="px-3 py-2 text-gray-400">{s.joinDate}</td>
                      <td className="px-3 py-2">
                        <span className="bg-green-900/50 text-green-400 px-1.5 py-0.5 rounded text-[10px]">
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PAYROLL TAB ──────────────────────────────────────────────────────────────────────── */}
      {tab === "payroll" && (
        <div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div
              className="rounded-lg p-3"
              style={{ background: "#1a1f2e", border: "1px solid #374151" }}
            >
              <p className="text-gray-400 text-xs">Total Staff</p>
              <p className="text-white text-2xl font-bold">{staff.length}</p>
            </div>
            <div
              className="rounded-lg p-3"
              style={{ background: "#1a1f2e", border: "1px solid #374151" }}
            >
              <p className="text-gray-400 text-xs">Monthly Payroll</p>
              <p className="text-green-400 text-2xl font-bold">
                ₹{totalPayroll.toLocaleString("en-IN")}
              </p>
            </div>
            <div
              className="rounded-lg p-3"
              style={{ background: "#1a1f2e", border: "1px solid #374151" }}
            >
              <p className="text-gray-400 text-xs">Annual Payroll</p>
              <p className="text-yellow-400 text-2xl font-bold">
                ₹{(totalPayroll * 12).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
          <div className="rounded-lg overflow-hidden border border-gray-700">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#1a1f2e" }}>
                  {[
                    "Staff Name",
                    "Designation",
                    "Basic Salary",
                    "HRA",
                    "DA",
                    "Net Salary",
                    "Action",
                  ].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staff.map((s, i) => {
                  const hra = Math.round(s.salary * 0.2);
                  const da = Math.round(s.salary * 0.15);
                  return (
                    <tr
                      key={s.id}
                      style={{
                        background: i % 2 === 0 ? "#111827" : "#0f1117",
                      }}
                    >
                      <td className="px-3 py-2 text-white">{s.name}</td>
                      <td className="px-3 py-2 text-gray-300">
                        {s.designation}
                      </td>
                      <td className="px-3 py-2 text-gray-300">
                        ₹{s.salary.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2 text-gray-300">
                        ₹{hra.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2 text-gray-300">
                        ₹{da.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2 text-green-400 font-medium">
                        ₹{(s.salary + hra + da).toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="bg-blue-700 hover:bg-blue-600 text-white px-2 py-0.5 rounded text-[10px]"
                        >
                          Pay Slip
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── LEAVE TAB ───────────────────────────────────────────────────────────────────────── */}
      {tab === "leave" && (
        <div
          className="rounded-lg p-4 max-w-lg"
          style={{ background: "#1a1f2e", border: "1px solid #374151" }}
        >
          <h3 className="text-white text-sm font-medium mb-3">
            Leave Applications
          </h3>
          <p className="text-gray-400 text-xs">No pending leave requests.</p>
        </div>
      )}

      {/* ── ADD STAFF MODAL ────────────────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-xl w-full max-w-xl overflow-hidden shadow-2xl"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
            data-ocid="hr.staff.modal"
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: "1px solid #374151" }}
            >
              <div>
                <h3 className="text-white font-semibold">
                  {isTeacher ? "Add Teacher" : "Add Staff Member"}
                </h3>
                {isTeacher && (
                  <div className="flex items-center gap-2 mt-1">
                    {["Basic Info", "Subject Assignment"].map((label, idx) => (
                      <div key={label} className="flex items-center gap-1">
                        {idx > 0 && <div className="w-4 h-px bg-gray-600" />}
                        <div
                          className={`flex items-center gap-1.5 text-xs ${
                            wizardStep === idx + 1
                              ? "text-green-400"
                              : wizardStep > idx + 1
                                ? "text-gray-300"
                                : "text-gray-600"
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              wizardStep === idx + 1
                                ? "bg-green-600 text-white"
                                : wizardStep > idx + 1
                                  ? "bg-green-800 text-green-300"
                                  : "bg-gray-700 text-gray-500"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-gray-400 hover:text-white"
                data-ocid="hr.staff.close_button"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5">
              {/* ── STEP 1 / SINGLE STEP FORM ── */}
              {wizardStep === 1 && (
                <div>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Name */}
                    <div>
                      <label
                        htmlFor="hr-name"
                        className="text-gray-400 text-xs block mb-1"
                      >
                        Name *
                      </label>
                      <input
                        id="hr-name"
                        value={form.name}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, name: e.target.value }))
                        }
                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-green-500"
                        data-ocid="hr.staff.input"
                      />
                    </div>

                    {/* Designation */}
                    <div>
                      <label
                        htmlFor="hr-designation"
                        className="text-gray-400 text-xs block mb-1"
                      >
                        Designation *
                      </label>
                      <select
                        id="hr-designation"
                        value={form.designation}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            designation: e.target.value,
                          }))
                        }
                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-green-500"
                        data-ocid="hr.staff.select"
                      >
                        <option value="">Select Designation</option>
                        {DESIGNATIONS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Department */}
                    <div>
                      <label
                        htmlFor="hr-department"
                        className="text-gray-400 text-xs block mb-1"
                      >
                        Department
                      </label>
                      <input
                        id="hr-department"
                        value={form.department}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, department: e.target.value }))
                        }
                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-green-500"
                        data-ocid="hr.staff.input"
                      />
                    </div>

                    {/* Salary */}
                    <div>
                      <label
                        htmlFor="hr-salary"
                        className="text-gray-400 text-xs block mb-1"
                      >
                        Salary (₹)
                      </label>
                      <input
                        id="hr-salary"
                        type="number"
                        value={form.salary}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, salary: e.target.value }))
                        }
                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-green-500"
                        data-ocid="hr.staff.input"
                      />
                    </div>

                    {/* Contact */}
                    <div>
                      <label
                        htmlFor="hr-contact"
                        className="text-gray-400 text-xs block mb-1"
                      >
                        Contact / Mobile *
                      </label>
                      <input
                        id="hr-contact"
                        value={form.contact}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, contact: e.target.value }))
                        }
                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-green-500"
                        data-ocid="hr.staff.input"
                      />
                    </div>

                    {/* DOB */}
                    <div>
                      <p className="text-gray-400 text-xs block mb-1">
                        Date of Birth
                      </p>
                      <DateInput
                        value={form.dob}
                        onChange={(v) => setForm((p) => ({ ...p, dob: v }))}
                      />
                    </div>

                    {/* Join Date */}
                    <div>
                      <p className="text-gray-400 text-xs block mb-1">
                        Join Date
                      </p>
                      <DateInput
                        value={form.joinDate}
                        onChange={(v) =>
                          setForm((p) => ({ ...p, joinDate: v }))
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-3 p-2 bg-blue-900/20 border border-blue-700/30 rounded text-xs text-blue-300">
                    💡 Username: Mobile No. &nbsp;|&nbsp; Password: DOB
                    (ddmmyyyy)
                  </div>

                  {stepError && (
                    <p
                      className="text-red-400 text-xs mt-2"
                      data-ocid="hr.staff.error_state"
                    >
                      {stepError}
                    </p>
                  )}

                  <div className="flex gap-2 mt-4">
                    {isTeacher ? (
                      <>
                        <button
                          type="button"
                          onClick={goToStep2}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded flex items-center justify-center gap-1"
                          data-ocid="hr.staff.primary_button"
                        >
                          Next: Subject Assignment →
                        </button>
                        <button
                          type="button"
                          onClick={closeModal}
                          className="px-4 bg-gray-700 hover:bg-gray-600 text-white text-xs py-2 rounded"
                          data-ocid="hr.staff.cancel_button"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleAdd}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded"
                          data-ocid="hr.staff.submit_button"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={closeModal}
                          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs py-2 rounded"
                          data-ocid="hr.staff.cancel_button"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ── STEP 2: SUBJECT ASSIGNMENT (Teacher only) ── */}
              {wizardStep === 2 && (
                <div>
                  <div
                    className="mb-3 p-2.5 rounded-lg"
                    style={{
                      background: "#0f1117",
                      border: "1px solid #374151",
                    }}
                  >
                    <p className="text-xs text-gray-400">
                      Teacher:{" "}
                      <span className="text-white font-medium">
                        {form.name}
                      </span>
                      {form.designation && (
                        <>
                          {" "}
                          &nbsp;·&nbsp;{" "}
                          <span className="text-green-400">
                            {form.designation}
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  <p className="text-gray-300 text-xs font-medium mb-3">
                    Assign Subjects &amp; Class Ranges
                  </p>

                  <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
                    {subjectRows.map((row, idx) => (
                      <SubjectRow
                        key={`${row.subject || "row"}-${idx}`}
                        row={row}
                        index={idx}
                        subjectSuggestions={subjectSuggestions}
                        onChange={updateSubjectRow}
                        onRemove={removeSubjectRow}
                        canRemove={subjectRows.length > 1}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addSubjectRow}
                    className="mt-3 flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 border border-dashed border-green-700 hover:border-green-500 rounded px-3 py-1.5 transition"
                    data-ocid="hr.teacher.subject.primary_button"
                  >
                    <Plus size={13} /> Add Subject
                  </button>

                  {stepError && (
                    <p
                      className="text-red-400 text-xs mt-2"
                      data-ocid="hr.staff.error_state"
                    >
                      {stepError}
                    </p>
                  )}

                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setWizardStep(1);
                        setStepError("");
                      }}
                      className="px-4 bg-gray-700 hover:bg-gray-600 text-white text-xs py-2 rounded"
                      data-ocid="hr.staff.secondary_button"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={handleAdd}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded"
                      data-ocid="hr.staff.submit_button"
                    >
                      Save Teacher
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 bg-gray-700 hover:bg-gray-600 text-white text-xs py-2 rounded"
                      data-ocid="hr.staff.cancel_button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
