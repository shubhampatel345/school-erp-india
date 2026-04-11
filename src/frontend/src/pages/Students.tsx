import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Cake,
  Download,
  List,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import StudentDetailModal from "../components/StudentDetailModal";
import StudentForm from "../components/StudentForm";
import StudentImportExport from "../components/StudentImportExport";
import { useApp } from "../context/AppContext";
import type { Student } from "../types";
import { CLASSES, SECTIONS, ls } from "../utils/localStorage";

const PRINT_COLS = [
  { key: "admNo", label: "Adm.No" },
  { key: "fullName", label: "Name" },
  { key: "class", label: "Class" },
  { key: "section", label: "Section" },
  { key: "fatherName", label: "Father Name" },
  { key: "dob", label: "DOB" },
  { key: "gender", label: "Gender" },
  { key: "mobile", label: "Mobile" },
  { key: "category", label: "Category" },
  { key: "address", label: "Address" },
];

export default function Students() {
  const { currentSession, isReadOnly, currentUser } = useApp();
  const [students, setStudents] = useState<Student[]>(() =>
    ls.get<Student[]>("students", []),
  );
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [showImportExport, setShowImportExport] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printCols, setPrintCols] = useState<string[]>([
    "admNo",
    "fullName",
    "class",
    "section",
    "fatherName",
    "gender",
    "mobile",
  ]);
  const [showBirthdays, setShowBirthdays] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Student | null>(null);

  const canManage =
    currentUser?.role === "superadmin" ||
    currentUser?.role === "admin" ||
    currentUser?.role === "receptionist";

  function reload() {
    setStudents(ls.get<Student[]>("students", []));
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter((s) => {
      const matchClass = filterClass === "all" || s.class === filterClass;
      const matchSection =
        filterSection === "all" || s.section === filterSection;
      const matchSearch =
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.admNo.toLowerCase().includes(q) ||
        (s.fatherName ?? "").toLowerCase().includes(q) ||
        s.class.toLowerCase().includes(q) ||
        s.section.toLowerCase().includes(q);
      return matchClass && matchSection && matchSearch;
    });
  }, [students, search, filterClass, filterSection]);

  const today = new Date();
  const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
  const birthdayStudents = students.filter((s) => {
    const parts = s.dob.split("/");
    return parts[1] === currentMonth;
  });

  function handleSaved(_student: Student) {
    reload();
    setShowForm(false);
    setEditStudent(null);
    setSelectedStudent(null);
  }

  function handleDelete(student: Student) {
    const all = ls
      .get<Student[]>("students", [])
      .filter((s) => s.id !== student.id);
    ls.set("students", all);
    setDeleteConfirm(null);
    reload();
  }

  function handlePrint() {
    const schoolProfile = ls.get("school_profile", {
      name: "SHUBH SCHOOL ERP",
    }) as { name: string };
    const headers = PRINT_COLS.filter((c) => printCols.includes(c.key)).map(
      (c) => c.label,
    );
    const rows = filtered.map((s) =>
      PRINT_COLS.filter((c) => printCols.includes(c.key)).map(
        (c) => (s as unknown as Record<string, string>)[c.key] ?? "",
      ),
    );
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    printWin.document.write(`
      <html><head><title>Student List</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; margin: 10mm; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f0f0f0; border: 1px solid #999; padding: 4px 6px; text-align: left; }
        td { border: 1px solid #ccc; padding: 4px 6px; }
        h2 { text-align: center; margin-bottom: 4px; }
        p { text-align: center; margin: 0 0 8px; font-size: 10px; }
      </style></head><body>
      <h2>${schoolProfile.name}</h2>
      <p>Student List – ${filterClass !== "all" ? `Class ${filterClass}` : "All Classes"} ${filterSection !== "all" ? filterSection : ""} | ${new Date().toLocaleDateString("en-IN")}</p>
      <table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
      </table></body></html>`);
    printWin.document.close();
    printWin.print();
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Student Information
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} of {students.length} students
            {currentSession && ` · Session ${currentSession.label}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!isReadOnly && canManage && (
            <Button
              onClick={() => {
                setEditStudent(null);
                setShowForm(true);
              }}
              data-ocid="add-student-btn"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Student
            </Button>
          )}
          {!isReadOnly && canManage && (
            <Button
              variant="outline"
              onClick={() => setShowImportExport(true)}
              data-ocid="students-importexport-btn"
            >
              <Upload className="w-4 h-4 mr-1" /> Import/Export
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowPrintDialog(true)}>
            <List className="w-4 h-4 mr-1" /> List
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowBirthdays(!showBirthdays)}
            className="relative"
          >
            <Cake className="w-4 h-4 mr-1" /> Birthdays
            {birthdayStudents.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {birthdayStudents.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Birthdays panel */}
      {showBirthdays && birthdayStudents.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-1">
            <Cake className="w-4 h-4" /> Birthdays This Month (
            {birthdayStudents.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {birthdayStudents.map((s) => (
              <div
                key={s.id}
                className="bg-card border border-amber-300 rounded-md px-3 py-1.5 text-xs"
              >
                <span className="font-medium text-amber-900">{s.fullName}</span>
                <span className="text-amber-600 ml-1">({s.dob})</span>
                <span className="text-amber-500 ml-1">
                  Cl.{s.class}
                  {s.section}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, Adm.No, class..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-ocid="students-search"
          />
        </div>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-36" data-ocid="students-filter-class">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {CLASSES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSection} onValueChange={setFilterSection}>
          <SelectTrigger className="w-28" data-ocid="students-filter-section">
            <SelectValue placeholder="All Sections" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {SECTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border sticky top-0">
              <tr>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Photo
                </th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Adm.No
                </th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Student
                </th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Class
                </th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                  Guardian
                </th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                  Category
                </th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Status
                </th>
                {!isReadOnly && canManage && (
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="p-8 text-center text-muted-foreground"
                  >
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No students found</p>
                    <p className="text-xs mt-1">
                      Add students or adjust your filters
                    </p>
                  </td>
                </tr>
              )}
              {filtered.map((student) => (
                <tr
                  key={student.id}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                  data-ocid={`student-row-${student.id}`}
                  onDoubleClick={() => setSelectedStudent(student)}
                >
                  {/* Photo */}
                  <td className="p-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {student.photo ? (
                        <img
                          src={student.photo}
                          alt={student.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] font-bold text-primary">
                          {student.fullName.charAt(0)}
                        </span>
                      )}
                    </div>
                  </td>
                  {/* Adm No */}
                  <td className="p-3">
                    <span
                      className={`text-xs font-mono font-medium ${
                        student.status === "discontinued"
                          ? "line-through text-muted-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {student.admNo}
                    </span>
                  </td>
                  {/* Name */}
                  <td className="p-3">
                    <button
                      type="button"
                      className="text-left w-full"
                      onClick={() => setSelectedStudent(student)}
                    >
                      <span
                        className={`font-medium text-sm block ${
                          student.status === "discontinued"
                            ? "line-through text-muted-foreground"
                            : "text-foreground hover:text-primary"
                        }`}
                      >
                        {student.fullName}
                      </span>
                    </button>
                  </td>
                  {/* Class */}
                  <td className="p-3">
                    <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-medium">
                      {student.class}
                      {student.section}
                    </span>
                  </td>
                  {/* Guardian */}
                  <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">
                    <div>{student.fatherName || "—"}</div>
                    {(student.fatherMobile || student.mobile) && (
                      <div className="text-xs">
                        {student.fatherMobile || student.mobile}
                      </div>
                    )}
                  </td>
                  {/* Category */}
                  <td className="p-3 hidden lg:table-cell">
                    {student.category ? (
                      <Badge variant="outline" className="text-[10px]">
                        {student.category}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                  {/* Status */}
                  <td className="p-3">
                    <Badge
                      variant={
                        student.status === "active" ? "default" : "destructive"
                      }
                      className="text-[10px]"
                    >
                      {student.status === "active" ? "Active" : "Discontinued"}
                    </Badge>
                  </td>
                  {/* Actions */}
                  {!isReadOnly && canManage && (
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 text-muted-foreground hover:text-primary"
                          aria-label="Edit student"
                          data-ocid={`student-edit-${student.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditStudent(student);
                            setShowForm(true);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 text-muted-foreground hover:text-destructive"
                          aria-label="Delete student"
                          data-ocid={`student-delete-${student.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(student);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Dialog */}
      {showPrintDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <h3 className="text-lg font-semibold font-display text-foreground flex items-center gap-2">
              <List className="w-5 h-5" /> Print Student List
            </h3>
            <p className="text-sm text-muted-foreground">
              Select columns to include:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PRINT_COLS.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={printCols.includes(col.key)}
                    onChange={(e) => {
                      if (e.target.checked)
                        setPrintCols((prev) => [...prev, col.key]);
                      else
                        setPrintCols((prev) =>
                          prev.filter((k) => k !== col.key),
                        );
                    }}
                    className="rounded"
                  />
                  {col.label}
                </label>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowPrintDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  handlePrint();
                  setShowPrintDialog(false);
                }}
                data-ocid="students-print-btn"
              >
                <Download className="w-4 h-4 mr-1" /> Print
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  Delete Student?
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Are you sure you want to delete{" "}
                  <strong>{deleteConfirm.fullName}</strong> (
                  {deleteConfirm.admNo})? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteConfirm)}
                data-ocid="confirm-delete-student-btn"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Student Form */}
      {showForm && !isReadOnly && (
        <StudentForm
          student={editStudent ?? undefined}
          onSave={handleSaved}
          onClose={() => {
            setShowForm(false);
            setEditStudent(null);
          }}
        />
      )}

      {/* Import/Export */}
      {showImportExport && (
        <StudentImportExport
          onClose={() => setShowImportExport(false)}
          onImported={reload}
        />
      )}

      {/* Student Detail Modal */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onUpdate={(updated) => {
            reload();
            setSelectedStudent(updated);
          }}
        />
      )}
    </div>
  );
}
