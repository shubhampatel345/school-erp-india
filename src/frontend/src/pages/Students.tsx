import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Cake,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  List,
  MessageCircle,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SkeletonTableRows } from "../components/SkeletonComponents";
import StudentDetailModal from "../components/StudentDetailModal";
import StudentForm from "../components/StudentForm";
import StudentImportExport from "../components/StudentImportExport";
import { useApp } from "../context/AppContext";
import type { ClassSection, Student } from "../types";
import { ls } from "../utils/localStorage";

const ITEMS_PER_PAGE = 50;

// ── Column definitions ────────────────────────────────────────────────────────
interface ColDef {
  key: string;
  label: string;
  defaultVisible: boolean;
  width: number;
  sortable?: boolean;
}

const ALL_COLUMNS: ColDef[] = [
  {
    key: "admNo",
    label: "Adm. No.",
    defaultVisible: true,
    width: 80,
    sortable: true,
  },
  { key: "photo", label: "Photo", defaultVisible: true, width: 50 },
  {
    key: "fullName",
    label: "Full Name",
    defaultVisible: true,
    width: 160,
    sortable: true,
  },
  {
    key: "class",
    label: "Class",
    defaultVisible: true,
    width: 60,
    sortable: true,
  },
  { key: "section", label: "Section", defaultVisible: true, width: 60 },
  { key: "gender", label: "Gender", defaultVisible: false, width: 80 },
  { key: "dob", label: "DOB", defaultVisible: false, width: 100 },
  { key: "fatherName", label: "Father Name", defaultVisible: true, width: 140 },
  {
    key: "fatherMobile",
    label: "Father Mobile",
    defaultVisible: false,
    width: 120,
  },
  { key: "motherName", label: "Mother Name", defaultVisible: true, width: 140 },
  {
    key: "motherMobile",
    label: "Mother Mobile",
    defaultVisible: false,
    width: 120,
  },
  { key: "mobile", label: "Mobile", defaultVisible: false, width: 120 },
  { key: "village", label: "Village", defaultVisible: false, width: 100 },
  { key: "category", label: "Category", defaultVisible: false, width: 90 },
  { key: "address", label: "Address", defaultVisible: false, width: 180 },
  { key: "aadhaarNo", label: "Aadhaar No.", defaultVisible: false, width: 130 },
  { key: "srNo", label: "S.R. No.", defaultVisible: false, width: 100 },
  { key: "penNo", label: "Pen No.", defaultVisible: false, width: 100 },
  { key: "apaarNo", label: "Apaar No.", defaultVisible: false, width: 100 },
  {
    key: "previousSchool",
    label: "Previous School",
    defaultVisible: true,
    width: 160,
  },
  {
    key: "admissionDate",
    label: "Admission Date",
    defaultVisible: false,
    width: 120,
  },
  { key: "transportRoute", label: "Route", defaultVisible: false, width: 120 },
  { key: "transportBusNo", label: "Bus No.", defaultVisible: false, width: 90 },
  {
    key: "transportPickup",
    label: "Pickup Point",
    defaultVisible: false,
    width: 120,
  },
  { key: "status", label: "Status", defaultVisible: true, width: 100 },
];

const DEFAULT_VISIBLE = ALL_COLUMNS.filter((c) => c.defaultVisible).map(
  (c) => c.key,
);
const LS_COL_KEY = "student_grid_columns";

const PRINT_COLS = [
  { key: "admNo", label: "Adm.No" },
  { key: "fullName", label: "Name" },
  { key: "class", label: "Class" },
  { key: "section", label: "Section" },
  { key: "fatherName", label: "Father Name" },
  { key: "motherName", label: "Mother Name" },
  { key: "dob", label: "DOB" },
  { key: "gender", label: "Gender" },
  { key: "mobile", label: "Mobile" },
  { key: "fatherMobile", label: "Father Mobile" },
  { key: "category", label: "Category" },
  { key: "address", label: "Address" },
  { key: "previousSchool", label: "Previous School" },
  { key: "aadhaarNo", label: "Aadhaar No." },
  { key: "srNo", label: "S.R. No." },
  { key: "penNo", label: "Pen No." },
  { key: "apaarNo", label: "Apaar No." },
  { key: "admissionDate", label: "Admission Date" },
  { key: "transportRoute", label: "Route" },
  { key: "transportBusNo", label: "Bus No." },
  { key: "status", label: "Status" },
];

function getCellValue(student: Student, key: string): string {
  const s = student as unknown as Record<string, string | undefined>;
  return s[key] ?? "";
}

interface StudentsProps {
  onNavigate?: (page: string) => void;
}

export default function Students({ onNavigate }: StudentsProps) {
  const {
    currentSession,
    canWrite,
    currentUser,
    getData,
    saveData,
    updateData,
    deleteData,
    refreshCollection,
    addNotification,
  } = useApp();

  // ── Students from context (server-synced) ─────────────────────────────────
  // getData is stable (useCallback), but its return value changes — we pull
  // it outside useMemo and just reference the function directly.
  const rawStudents = getData("students") as Student[];
  const students = useMemo(
    () => rawStudents.filter(Boolean),
    // rawStudents reference changes when context updates — this is intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawStudents],
  );

  // ── Classes from context ───────────────────────────────────────────────────
  const rawClasses = getData("classes") as ClassSection[];
  const contextClasses = useMemo(
    () => rawClasses,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawClasses],
  );

  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshCollection("students");
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshCollection]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  // Refresh once on mount
  useEffect(() => {
    void refreshRef.current();
  }, []);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterGender, setFilterGender] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterRoute, setFilterRoute] = useState("all");

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [visibleCols, setVisibleCols] = useState<string[]>(() =>
    ls.get<string[]>(LS_COL_KEY, DEFAULT_VISIBLE),
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  /** Pagination */
  const [currentPage, setCurrentPage] = useState(1);

  const canManage =
    currentUser?.role === "superadmin" ||
    currentUser?.role === "admin" ||
    currentUser?.role === "receptionist";

  // Save column prefs to localStorage (UI preference only)
  useEffect(() => {
    ls.set(LS_COL_KEY, visibleCols);
  }, [visibleCols]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const uniqueRoutes = useMemo(() => {
    const routes = new Set<string>();
    for (const s of students) {
      if (s.transportRoute) routes.add(s.transportRoute);
    }
    return Array.from(routes).sort();
  }, [students]);

  // Class names for filter (from context.classes first, fallback to student data)
  const classNames = useMemo(() => {
    if (contextClasses.length > 0) {
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
      return [...contextClasses]
        .sort((a, b) => {
          const an =
            a.className ?? (a as unknown as { name?: string }).name ?? "";
          const bn =
            b.className ?? (b as unknown as { name?: string }).name ?? "";
          const ai = CLASS_ORDER.indexOf(an);
          const bi = CLASS_ORDER.indexOf(bn);
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        })
        .map(
          (c) => c.className ?? (c as unknown as { name?: string }).name ?? "",
        );
    }
    // Fallback to unique values from student data
    const seen = new Set<string>();
    return students
      .map((s) => s.class)
      .filter((c) => c && !seen.has(c) && seen.add(c));
  }, [contextClasses, students]);

  // Sections for selected class filter
  const sectionsForFilter = useMemo(() => {
    if (filterClass === "all") return [];
    const cls = contextClasses.find(
      (c) =>
        (c.className ?? (c as unknown as { name?: string }).name ?? "") ===
        filterClass,
    );
    if (cls?.sections) return cls.sections;
    // Fallback from student data
    const seen = new Set<string>();
    return students
      .filter((s) => s.class === filterClass)
      .map((s) => s.section)
      .filter((sec) => sec && !seen.has(sec) && seen.add(sec));
  }, [filterClass, contextClasses, students]);

  const stats = useMemo(() => {
    const active = students.filter((s) => s.status === "active");
    return {
      total: students.length,
      active: active.length,
      discontinued: students.length - active.length,
      boys: students.filter((s) => s.gender === "Male").length,
      girls: students.filter((s) => s.gender === "Female").length,
    };
  }, [students]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = students.filter((s) => {
      if (filterClass !== "all" && s.class !== filterClass) return false;
      if (filterSection !== "all" && s.section !== filterSection) return false;
      if (filterStatus !== "all" && s.status !== filterStatus) return false;
      if (filterGender !== "all" && s.gender !== filterGender) return false;
      if (filterCategory !== "all" && (s.category ?? "") !== filterCategory)
        return false;
      if (filterRoute !== "all" && (s.transportRoute ?? "") !== filterRoute)
        return false;
      if (q) {
        const haystack = [
          s.fullName,
          s.admNo,
          s.fatherName,
          s.motherName,
          s.mobile,
          s.fatherMobile ?? "",
          s.address ?? "",
          s.village ?? "",
          `${s.class}${s.section}`,
          s.class,
          s.section,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    if (sortKey) {
      list = [...list].sort((a, b) => {
        const av = getCellValue(a, sortKey);
        const bv = getCellValue(b, sortKey);
        const cmp = av.localeCompare(bv, "en-IN", { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return list;
  }, [
    students,
    search,
    filterClass,
    filterSection,
    filterStatus,
    filterGender,
    filterCategory,
    filterRoute,
    sortKey,
    sortDir,
  ]);

  const activeVisibleCols = useMemo(
    () => ALL_COLUMNS.filter((c) => visibleCols.includes(c.key)),
    [visibleCols],
  );

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedStudents = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, safePage]);
  const paginationStart =
    filtered.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1;
  const paginationEnd = Math.min(safePage * ITEMS_PER_PAGE, filtered.length);

  // Birthdays
  const today = new Date();
  const currentMonthStr = String(today.getMonth() + 1).padStart(2, "0");
  const birthdayStudents = students.filter((s) => {
    const parts = s.dob?.split("/");
    return parts && parts.length >= 2 && parts[1] === currentMonthStr;
  });

  // ── Sort handler ───────────────────────────────────────────────────────────
  function handleSort(key: string) {
    if (!ALL_COLUMNS.find((c) => c.key === key)?.sortable) return;
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else {
        setSortKey(null);
        setSortDir("asc");
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  // ── Selection ──────────────────────────────────────────────────────────────
  const allVisibleSelected =
    filtered.length > 0 && filtered.every((s) => selectedIds.has(s.id));

  function toggleAll() {
    if (allVisibleSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((s) => s.id)));
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleSaved() {
    setShowForm(false);
    setEditStudent(null);
    setSelectedStudent(null);
  }

  async function handleDelete(student: Student) {
    try {
      await deleteData("students", student.id);
      addNotification(`Student ${student.fullName} deleted`, "success");
    } catch {
      addNotification("Failed to delete student", "error");
    }
    setDeleteConfirm(null);
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    let deleted = 0;
    for (const id of ids) {
      try {
        await deleteData("students", id);
        deleted++;
      } catch {
        /* continue */
      }
    }
    addNotification(`Deleted ${deleted} students`, "success");
    setSelectedIds(new Set());
    setBulkDeleteConfirm(false);
  }

  function clearFilters() {
    setSearch("");
    setFilterClass("all");
    setFilterSection("all");
    setFilterStatus("all");
    setFilterGender("all");
    setFilterCategory("all");
    setFilterRoute("all");
    setCurrentPage(1);
  }

  function handlePrint() {
    const schoolProfile = ls.get("school_profile", {
      name: "SHUBH SCHOOL ERP",
    }) as { name: string };
    const headers = PRINT_COLS.filter((c) => printCols.includes(c.key)).map(
      (c) => c.label,
    );
    const rows = filtered.map((s) =>
      PRINT_COLS.filter((c) => printCols.includes(c.key)).map((c) =>
        getCellValue(s, c.key),
      ),
    );
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    printWin.document.write(`
      <html><head><title>Student List</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:10px;margin:8mm}
        table{width:100%;border-collapse:collapse}
        th{background:#f0f0f0;border:1px solid #999;padding:3px 5px;text-align:left;white-space:nowrap}
        td{border:1px solid #ddd;padding:3px 5px;white-space:nowrap}
        h2{text-align:center;margin-bottom:2px;font-size:14px}
        p{text-align:center;margin:0 0 6px;font-size:9px;color:#666}
      </style></head><body>
      <h2>${schoolProfile.name}</h2>
      <p>Student List – ${filterClass !== "all" ? `Class ${filterClass}` : "All Classes"}${filterSection !== "all" ? ` ${filterSection}` : ""} | ${new Date().toLocaleDateString("en-IN")} | ${filtered.length} students</p>
      <table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((r, i) => `<tr style="${i % 2 === 1 ? "background:#f9f9f9" : ""}">${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
      </table></body></html>`);
    printWin.document.close();
    printWin.print();
  }

  function handleExportCSV() {
    const cols = PRINT_COLS;
    const header = cols.map((c) => c.label).join(",");
    const rows = filtered.map((s) =>
      cols
        .map((c) => `"${getCellValue(s, c.key).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleCol(key: string) {
    setVisibleCols((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  const tableRef = useRef<HTMLDivElement>(null);

  function renderCell(student: Student, colKey: string) {
    const isDiscontinued = student.status === "discontinued";
    const safeName = student.fullName ?? student.admNo ?? "–";
    const safeAdmNo = student.admNo ?? "–";

    if (colKey === "photo") {
      return (
        <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
          {student.photo ? (
            <img
              src={student.photo}
              alt={safeName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-[9px] font-bold text-primary">
              {safeName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      );
    }
    if (colKey === "admNo") {
      return (
        <span
          className={`text-xs font-mono font-semibold ${isDiscontinued ? "line-through text-muted-foreground" : "text-foreground"}`}
        >
          {safeAdmNo}
        </span>
      );
    }
    if (colKey === "fullName") {
      return (
        <span
          className={`font-medium text-xs ${isDiscontinued ? "line-through text-muted-foreground" : "text-foreground"}`}
        >
          {safeName}
        </span>
      );
    }
    if (colKey === "class") {
      return (
        <span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded font-medium">
          {student.class ?? "–"}
        </span>
      );
    }
    if (colKey === "section") {
      return (
        <span className="text-xs text-foreground">
          {student.section ?? "–"}
        </span>
      );
    }
    if (colKey === "status") {
      return (
        <Badge
          variant={student.status === "active" ? "default" : "destructive"}
          className="text-[9px] px-1.5 py-0"
        >
          {student.status === "active" ? "Active" : "Discontinued"}
        </Badge>
      );
    }
    if (colKey === "category" && student.category) {
      return (
        <Badge variant="outline" className="text-[9px] px-1 py-0">
          {student.category}
        </Badge>
      );
    }
    return (
      <span className="text-xs text-muted-foreground truncate max-w-[140px] block">
        {getCellValue(student, colKey) || "—"}
      </span>
    );
  }

  function SortIcon({ colKey }: { colKey: string }) {
    if (!ALL_COLUMNS.find((c) => c.key === colKey)?.sortable) return null;
    if (sortKey !== colKey)
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30 inline" />;
    return sortDir === "asc" ? (
      <ArrowUp className="w-3 h-3 ml-1 text-primary inline" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 text-primary inline" />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page Header */}
      <div className="px-4 md:px-6 pt-4 pb-2 bg-card border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div>
            <h1 className="text-xl font-bold font-display text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Student Information
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {currentSession && `Session ${currentSession.label} · `}
              {filtered.length < students.length
                ? `${filtered.length} of ${students.length} students`
                : `${students.length} students`}
              {filtered.length > ITEMS_PER_PAGE &&
                ` · Page ${safePage} of ${totalPages}`}
              {isRefreshing && (
                <span className="ml-2 text-primary animate-pulse">
                  Syncing…
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {canWrite && canManage && (
              <Button
                size="sm"
                onClick={() => {
                  setEditStudent(null);
                  setShowForm(true);
                }}
                data-ocid="add-student-btn"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Student
              </Button>
            )}
            {canWrite && canManage && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowImportExport(true)}
                data-ocid="students-importexport-btn"
              >
                <Upload className="w-3.5 h-3.5 mr-1" /> Import/Export
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPrintDialog(true)}
            >
              <List className="w-3.5 h-3.5 mr-1" /> Print List
            </Button>
            <Button size="sm" variant="outline" onClick={handleExportCSV}>
              <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowBirthdays(!showBirthdays)}
              className="relative"
            >
              <Cake className="w-3.5 h-3.5 mr-1" /> Birthdays
              {birthdayStudents.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {birthdayStudents.length}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex gap-3 flex-wrap text-xs mb-3">
          {[
            { label: "Total", value: stats.total, color: "text-foreground" },
            { label: "Active", value: stats.active, color: "text-emerald-600" },
            {
              label: "Discontinued",
              value: stats.discontinued,
              color: "text-destructive",
            },
            { label: "Boys", value: stats.boys, color: "text-blue-600" },
            { label: "Girls", value: stats.girls, color: "text-pink-600" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="bg-muted/50 rounded-md px-3 py-1.5 flex items-center gap-1.5"
            >
              <span className="text-muted-foreground">{label}:</span>
              <span className={`font-bold ${color}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-xs"
              placeholder="Search name, Adm.No, father, mother, mobile…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              data-ocid="students-search"
            />
          </div>

          {/* Class filter from context */}
          <Select
            value={filterClass}
            onValueChange={(v) => {
              setFilterClass(v);
              setFilterSection("all");
              setCurrentPage(1);
            }}
          >
            <SelectTrigger
              className="w-28 h-8 text-xs"
              data-ocid="students-filter-class"
            >
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classNames.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Section filter */}
          <Select
            value={filterSection}
            onValueChange={(v) => {
              setFilterSection(v);
              setCurrentPage(1);
            }}
            disabled={filterClass === "all"}
          >
            <SelectTrigger
              className="w-24 h-8 text-xs"
              data-ocid="students-filter-section"
            >
              <SelectValue placeholder="Section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {sectionsForFilter.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterStatus}
            onValueChange={(v) => {
              setFilterStatus(v);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="discontinued">Discontinued</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filterGender}
            onValueChange={(v) => {
              setFilterGender(v);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Gender</SelectItem>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filterCategory}
            onValueChange={(v) => {
              setFilterCategory(v);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Category</SelectItem>
              {["General", "OBC", "SC", "ST", "EWS", "Minority"].map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {uniqueRoutes.length > 0 && (
            <Select value={filterRoute} onValueChange={setFilterRoute}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue placeholder="Route" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Routes</SelectItem>
                {uniqueRoutes.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs px-2"
            onClick={clearFilters}
          >
            <X className="w-3 h-3 mr-1" /> Clear
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs ml-auto"
                data-ocid="columns-toggle-btn"
              >
                <Columns3 className="w-3.5 h-3.5 mr-1" /> Columns
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="end">
              <p className="text-xs font-semibold text-foreground mb-2">
                Show / Hide Columns
              </p>
              <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto">
                {ALL_COLUMNS.map((col) => (
                  <label
                    key={col.key}
                    htmlFor={`col-chk-${col.key}`}
                    className="flex items-center gap-1.5 cursor-pointer text-xs hover:text-foreground text-muted-foreground"
                  >
                    <Checkbox
                      id={`col-chk-${col.key}`}
                      checked={visibleCols.includes(col.key)}
                      onCheckedChange={() => toggleCol(col.key)}
                      className="w-3.5 h-3.5"
                    />
                    {col.label}
                  </label>
                ))}
              </div>
              <div className="flex gap-1 mt-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-6 flex-1"
                  onClick={() => setVisibleCols(ALL_COLUMNS.map((c) => c.key))}
                >
                  Show All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-6 flex-1"
                  onClick={() => setVisibleCols(DEFAULT_VISIBLE)}
                >
                  Reset
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex-shrink-0 bg-primary/5 border-b border-primary/20 px-4 py-2 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-primary">
            {selectedIds.size} student{selectedIds.size > 1 ? "s" : ""} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => setShowPrintDialog(true)}
          >
            <List className="w-3 h-3 mr-1" /> Print List
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={handleExportCSV}
          >
            <Download className="w-3 h-3 mr-1" /> Export CSV
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs">
            <MessageCircle className="w-3 h-3 mr-1" /> WhatsApp
          </Button>
          {currentUser?.role === "superadmin" && (
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs"
              onClick={() => setBulkDeleteConfirm(true)}
            >
              <Trash2 className="w-3 h-3 mr-1" /> Delete
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs ml-auto"
            onClick={() => setSelectedIds(new Set())}
          >
            <X className="w-3 h-3 mr-1" /> Clear
          </Button>
        </div>
      )}

      {/* Birthdays Panel */}
      {showBirthdays && birthdayStudents.length > 0 && (
        <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-3">
          <h3 className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1">
            <Cake className="w-3.5 h-3.5" /> Birthdays This Month (
            {birthdayStudents.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {birthdayStudents.map((s) => (
              <div
                key={s.id}
                className="bg-card border border-amber-300 rounded px-2 py-1 text-xs"
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

      {/* Grid */}
      <div ref={tableRef} className="flex-1 overflow-auto">
        <table
          className="w-full text-xs border-collapse"
          style={{ minWidth: "600px" }}
        >
          <thead className="sticky top-0 z-10 bg-muted border-b border-border shadow-sm">
            <tr>
              <th className="w-8 px-2 py-2 border-r border-border">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                  className="w-3.5 h-3.5"
                />
              </th>
              {activeVisibleCols.map((col) => (
                <th
                  key={col.key}
                  className={`px-2 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap border-r border-border last:border-r-0 ${col.sortable ? "cursor-pointer hover:bg-muted/80 select-none" : ""}`}
                  style={{
                    minWidth: `${col.width}px`,
                    width: `${col.width}px`,
                  }}
                  onClick={() => handleSort(col.key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") handleSort(col.key);
                  }}
                  tabIndex={col.sortable ? 0 : undefined}
                  role={col.sortable ? "button" : undefined}
                >
                  {col.label}
                  <SortIcon colKey={col.key} />
                </th>
              ))}
              {canWrite && canManage && (
                <th className="px-2 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide w-16">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {/* Loading skeleton — show while initial load is in progress */}
            {isRefreshing && students.length === 0 && (
              <SkeletonTableRows rows={10} cols={activeVisibleCols.length} />
            )}

            {!isRefreshing && filtered.length === 0 && (
              <tr>
                <td
                  colSpan={activeVisibleCols.length + 2}
                  className="py-16 text-center text-muted-foreground"
                  data-ocid="students.empty_state"
                >
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="font-medium text-sm">No students found</p>
                  <p className="text-xs mt-1 opacity-60">
                    Adjust your filters or add students
                  </p>
                  {canWrite && canManage && (
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setEditStudent(null);
                        setShowForm(true);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add First Student
                    </Button>
                  )}
                </td>
              </tr>
            )}

            {paginatedStudents.map((student, idx) => {
              const isDiscontinued = student.status === "discontinued";
              const isChecked = selectedIds.has(student.id);
              // idx relative to current page for data-ocid numbering
              const globalIdx = (safePage - 1) * ITEMS_PER_PAGE + idx;
              return (
                <tr
                  key={student.id}
                  className={[
                    "group cursor-pointer transition-colors border-b border-border/60",
                    isChecked
                      ? "bg-primary/5"
                      : isDiscontinued
                        ? idx % 2 === 0
                          ? "bg-muted/20 opacity-70"
                          : "bg-muted/30 opacity-70"
                        : idx % 2 === 0
                          ? "bg-background hover:bg-muted/20"
                          : "bg-muted/10 hover:bg-muted/30",
                  ].join(" ")}
                  style={{ height: "36px" }}
                  data-ocid={`students.item.${globalIdx + 1}`}
                  onDoubleClick={() => {
                    try {
                      setSelectedStudent(student);
                    } catch {
                      // guard against undefined student properties
                    }
                  }}
                >
                  <td className="w-8 px-2 border-r border-border/40">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleRow(student.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select ${student.fullName}`}
                      className="w-3.5 h-3.5"
                    />
                  </td>

                  {activeVisibleCols.map((col) => (
                    <td
                      key={col.key}
                      className="px-2 py-1 border-r border-border/40 last:border-r-0 overflow-hidden"
                      style={{ maxWidth: `${col.width}px` }}
                    >
                      {renderCell(student, col.key)}
                    </td>
                  ))}

                  {canWrite && canManage && (
                    <td className="px-1 py-1">
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 text-muted-foreground hover:text-primary"
                          aria-label="Edit student"
                          data-ocid={`students.edit_button.${globalIdx + 1}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditStudent(student);
                            setShowForm(true);
                          }}
                        >
                          <svg
                            aria-hidden="true"
                            className="w-3 h-3"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 text-muted-foreground hover:text-destructive"
                          aria-label="Delete student"
                          data-ocid={`students.delete_button.${globalIdx + 1}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(student);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {filtered.length > ITEMS_PER_PAGE && (
        <div className="flex-shrink-0 border-t border-border bg-card px-4 py-2 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            Showing {paginationStart}–{paginationEnd} of {filtered.length}{" "}
            students
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              data-ocid="students.pagination_prev"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
            </Button>
            {/* Page number pills — show up to 5 around current page */}
            {(() => {
              const items = Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === totalPages ||
                    (p >= safePage - 1 && p <= safePage + 1),
                )
                .reduce<Array<number | string>>((acc, p, i, arr) => {
                  if (i > 0 && (arr[i - 1] as number) < p - 1)
                    acc.push(`ellipsis-${p}`);
                  acc.push(p);
                  return acc;
                }, []);
              return items.map((p) =>
                typeof p === "string" ? (
                  <span key={p} className="text-xs text-muted-foreground px-1">
                    …
                  </span>
                ) : (
                  <Button
                    key={`page-${p}`}
                    variant={p === safePage ? "default" : "outline"}
                    size="sm"
                    className="h-7 w-7 p-0 text-xs"
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </Button>
                ),
              );
            })()}
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              data-ocid="students.pagination_next"
            >
              Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Print Dialog */}
      {showPrintDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div
            className="bg-card rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4"
            data-ocid="students-print.dialog"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold font-display text-foreground flex items-center gap-2">
                <List className="w-4 h-4" /> Print Student List
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7"
                onClick={() => setShowPrintDialog(false)}
                data-ocid="students-print.close_button"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Select columns to include in the printed list:
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {PRINT_COLS.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 cursor-pointer text-xs hover:text-foreground"
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
                    className="rounded w-3.5 h-3.5"
                  />
                  <span className="text-muted-foreground">{col.label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPrintDialog(false)}
                data-ocid="students-print.cancel_button"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  handlePrint();
                  setShowPrintDialog(false);
                }}
                data-ocid="students-print.submit_button"
              >
                <Download className="w-3.5 h-3.5 mr-1" /> Print
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div
            className="bg-card rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-4"
            data-ocid="students-delete.dialog"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-4 h-4 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">
                  Delete Student?
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Delete <strong>{deleteConfirm.fullName}</strong> (
                  {deleteConfirm.admNo})? This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirm(null)}
                data-ocid="students-delete.cancel_button"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => void handleDelete(deleteConfirm)}
                data-ocid="students-delete.confirm_button"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirm */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-4 h-4 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">
                  Delete {selectedIds.size} Students?
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  This will permanently delete {selectedIds.size} selected
                  students and cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => void handleBulkDelete()}
              >
                Delete All
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Student Form */}
      {showForm && canWrite && (
        <StudentForm
          student={editStudent ?? undefined}
          onSave={handleSaved}
          onClose={() => {
            setShowForm(false);
            setEditStudent(null);
          }}
          saveData={saveData}
          updateData={updateData}
        />
      )}

      {/* Import/Export */}
      {showImportExport && (
        <StudentImportExport
          onClose={() => setShowImportExport(false)}
          onImported={() => void refresh()}
          saveData={saveData}
        />
      )}

      {/* Student Detail Modal */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onUpdate={(updated) => {
            setSelectedStudent(updated);
          }}
          onNavigate={onNavigate}
          updateData={updateData}
          deleteData={deleteData}
          allStudents={students}
        />
      )}
    </div>
  );
}
