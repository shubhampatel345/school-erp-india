/**
 * Students.tsx — PHP/MySQL direct (no IndexedDB, no offline sync)
 *
 * Fetch-first: all reads come from the server via phpApiService.
 * Mutations wait for server HTTP 200 before refreshing list and showing success.
 * No canister, no IndexedDB, no pending queue, no sync engine.
 */
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
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Cake,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { SkeletonTableRows } from "../components/SkeletonComponents";
import StudentDetailModal from "../components/StudentDetailModal";
import StudentForm from "../components/StudentForm";
import StudentImportExport from "../components/StudentImportExport";
import { useApp } from "../context/AppContext";
import type { Student } from "../types";
import { CLASSES_ORDER } from "../types";
import { ls } from "../utils/localStorage";
import phpApiService, { type StudentRecord } from "../utils/phpApiService";

const ITEMS_PER_PAGE = 50;
const LS_COL_KEY = "student_grid_columns_v2";

function classOrder(name: string): number {
  let idx = CLASSES_ORDER.indexOf(name);
  if (idx !== -1) return idx;
  idx = CLASSES_ORDER.indexOf(`Class ${name}`);
  return idx !== -1 ? idx : 99;
}

/** Map raw server record → Student shape */
function toStudent(r: StudentRecord): Student {
  const s = r as unknown as Record<string, unknown>;
  return {
    id: r.id,
    admNo: r.admNo ?? (s.adm_no as string) ?? "",
    fullName: r.fullName ?? (s.full_name as string) ?? "",
    fatherName: (s.fatherName as string) ?? (s.father_name as string) ?? "",
    motherName: (s.motherName as string) ?? (s.mother_name as string) ?? "",
    fatherMobile:
      r.fatherMobile ?? (s.father_mobile as string) ?? r.fatherMobile ?? "",
    motherMobile:
      (s.motherMobile as string) ?? (s.mother_mobile as string) ?? "",
    guardianMobile: (s.guardianMobile as string) ?? r.fatherMobile ?? "",
    mobile: r.mobile ?? "",
    dob: r.dob ?? "",
    gender: (r.gender as Student["gender"]) ?? "Male",
    class: r.class ?? "",
    section: r.section ?? "",
    rollNo: (s.rollNo as string) ?? "",
    category: (s.category as string) ?? "",
    religion: (s.religion as string) ?? "",
    bloodGroup: (s.bloodGroup as string) ?? "",
    address: r.address ?? "",
    village: (s.village as string) ?? "",
    aadhaarNo: (s.aadhaarNo as string) ?? (s.aadhaar_no as string) ?? "",
    srNo: (s.srNo as string) ?? (s.sr_no as string) ?? "",
    penNo: (s.penNo as string) ?? (s.pen_no as string) ?? "",
    apaarNo: (s.apaarNo as string) ?? (s.apaar_no as string) ?? "",
    previousSchool:
      (s.previousSchool as string) ?? (s.previous_school as string) ?? "",
    admissionDate:
      (s.admissionDate as string) ?? (s.admission_date as string) ?? "",
    photo: (s.photo as string) ?? "",
    status: (s.status as string) === "discontinued" ? "discontinued" : "active",
    sessionId: r.sessionId ?? "",
    transportRoute: (s.transportRoute as string) ?? "",
    transportBusNo: (s.transportBusNo as string) ?? "",
    transportPickup: (s.transportPickup as string) ?? "",
    createdAt: r.createdAt ?? "",
  } as Student;
}

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
  { key: "photo", label: "Photo", defaultVisible: true, width: 44 },
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
    width: 70,
    sortable: true,
  },
  { key: "section", label: "Section", defaultVisible: true, width: 70 },
  { key: "gender", label: "Gender", defaultVisible: false, width: 80 },
  { key: "dob", label: "DOB", defaultVisible: false, width: 100 },
  { key: "fatherName", label: "Father Name", defaultVisible: true, width: 140 },
  {
    key: "fatherMobile",
    label: "Father Mobile",
    defaultVisible: true,
    width: 120,
  },
  {
    key: "motherName",
    label: "Mother Name",
    defaultVisible: false,
    width: 140,
  },
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
  { key: "apaarNo", label: "APAAR No.", defaultVisible: false, width: 100 },
  {
    key: "previousSchool",
    label: "Prev. School",
    defaultVisible: false,
    width: 160,
  },
  {
    key: "admissionDate",
    label: "Adm. Date",
    defaultVisible: false,
    width: 110,
  },
  { key: "transportRoute", label: "Route", defaultVisible: false, width: 110 },
  { key: "transportBusNo", label: "Bus No.", defaultVisible: false, width: 80 },
  { key: "status", label: "Status", defaultVisible: true, width: 90 },
];

const DEFAULT_VISIBLE = ALL_COLUMNS.filter((c) => c.defaultVisible).map(
  (c) => c.key,
);

function getCellValue(s: Student, key: string): string {
  const r = s as unknown as Record<string, string | undefined>;
  return r[key] ?? "";
}

/** Upcoming birthdays (next 30 days) */
function upcomingBirthdays(students: Student[]): Student[] {
  const today = new Date();
  const todayMD = today.getMonth() * 100 + today.getDate();
  return students.filter((s) => {
    if (!s.dob) return false;
    const [dd, mm] = s.dob.split("/");
    if (!dd || !mm) return false;
    const bd = (Number(mm) - 1) * 100 + Number(dd);
    const diff = bd - todayMD;
    return diff >= 0 && diff <= 30;
  });
}

interface StudentsProps {
  onNavigate?: (page: string) => void;
}

export default function Students({ onNavigate: _onNavigate }: StudentsProps) {
  const { currentSession, currentUser, addNotification } = useApp();

  // ── Server state ───────────────────────────────────────────────────────────
  const [students, setStudents] = useState<Student[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [classes, setClasses] = useState<
    Array<{ className: string; sections: string[] }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterGender, setFilterGender] = useState("all");
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
  const [deleteConfirm, setDeleteConfirm] = useState<Student | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [showBirthdays, setShowBirthdays] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [familyGrouping, setFamilyGrouping] = useState(false);
  const [colPickerOpen, setColPickerOpen] = useState(false);

  const canManage =
    currentUser?.role === "superadmin" ||
    currentUser?.role === "admin" ||
    currentUser?.role === "receptionist";

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const currentSessionId = currentSession?.id;
  const fetchStudents = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);
      setError(null);
      try {
        const params: Record<string, string> = { page: "1", limit: "1000" };
        if (currentSessionId) params.session = currentSessionId;
        const result = await phpApiService.getStudents(params);
        const mapped = (result.data ?? []).map(toStudent);
        setStudents(mapped);
        setTotalCount(result.total ?? mapped.length);
        setCurrentPage(1);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to load students";
        const isTokenErr =
          msg.toLowerCase().includes("session expired") ||
          msg.toLowerCase().includes("token");
        if (!(isTokenErr && currentUser?.role === "superadmin")) {
          setError(msg);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentSessionId, currentUser?.role],
  );

  // Load classes once on mount
  useEffect(() => {
    phpApiService
      .getClasses()
      .then((cls) => {
        const sorted = [...cls].sort(
          (a, b) => classOrder(a.className) - classOrder(b.className),
        );
        setClasses(
          sorted.map((c) => ({
            className: c.className,
            sections: c.sections ?? [],
          })),
        );
      })
      .catch(() => {
        /* silent */
      });
  }, []);

  // Initial + session-change fetch
  const fetchRef = useRef(fetchStudents);
  fetchRef.current = fetchStudents;

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — re-fetch when session changes
  useEffect(() => {
    void fetchRef.current();
  }, [currentSessionId]);

  // Persist column visibility
  useEffect(() => {
    ls.set(LS_COL_KEY, visibleCols);
  }, [visibleCols]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const classNames = useMemo(() => {
    if (classes.length > 0) return classes.map((c) => c.className);
    const seen = new Set<string>();
    return students
      .map((s) => s.class)
      .filter((c): c is string => !!c && !seen.has(c) && !!seen.add(c))
      .sort((a, b) => classOrder(a) - classOrder(b));
  }, [classes, students]);

  const sectionsForFilter = useMemo(() => {
    if (filterClass === "all") return [];
    const cls = classes.find((c) => c.className === filterClass);
    if (cls?.sections?.length) return cls.sections;
    const seen = new Set<string>();
    return students
      .filter((s) => s.class === filterClass)
      .map((s) => s.section)
      .filter(
        (sec): sec is string => !!sec && !seen.has(sec) && !!seen.add(sec),
      );
  }, [filterClass, classes, students]);

  const stats = useMemo(
    () => ({
      total: students.length,
      active: students.filter((s) => s.status === "active").length,
      discontinued: students.filter((s) => s.status === "discontinued").length,
      boys: students.filter((s) => s.gender === "Male").length,
      girls: students.filter((s) => s.gender === "Female").length,
    }),
    [students],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = students.filter((s) => {
      if (!s?.id) return false;
      if (filterClass !== "all" && s.class !== filterClass) return false;
      if (filterSection !== "all" && s.section !== filterSection) return false;
      if (filterStatus !== "all" && s.status !== filterStatus) return false;
      if (filterGender !== "all" && s.gender !== filterGender) return false;
      if (q) {
        const hay = [
          s.fullName,
          s.admNo,
          s.fatherName,
          s.motherName ?? "",
          s.mobile ?? "",
          s.fatherMobile ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (sortKey) {
      list = [...list].sort((a, b) => {
        const cmp = getCellValue(a, sortKey).localeCompare(
          getCellValue(b, sortKey),
          "en-IN",
          { numeric: true },
        );
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
    sortKey,
    sortDir,
  ]);

  // Family grouping: group by fatherMobile
  const displayRows = useMemo(() => {
    if (!familyGrouping) return filtered;
    const seen = new Set<string>();
    const grouped: Student[] = [];
    const families = new Map<string, Student[]>();
    for (const s of filtered) {
      const key = s.fatherMobile?.trim() || s.id;
      if (!families.has(key)) families.set(key, []);
      families.get(key)!.push(s);
    }
    for (const [, members] of families) {
      for (const m of members) {
        if (!seen.has(m.id)) {
          seen.add(m.id);
          grouped.push(m);
        }
      }
    }
    return grouped;
  }, [filtered, familyGrouping]);

  const totalPages = Math.max(
    1,
    Math.ceil(displayRows.length / ITEMS_PER_PAGE),
  );
  const safePage = Math.min(currentPage, totalPages);
  const pageStudents = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return displayRows.slice(start, start + ITEMS_PER_PAGE);
  }, [displayRows, safePage]);

  const activeVisibleCols = useMemo(
    () => ALL_COLUMNS.filter((c) => visibleCols.includes(c.key)),
    [visibleCols],
  );

  // ── Sort handler ───────────────────────────────────────────────────────────
  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  // ── Select all ─────────────────────────────────────────────────────────────
  const allPageSelected =
    pageStudents.length > 0 && pageStudents.every((s) => selectedIds.has(s.id));
  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        for (const s of pageStudents) next.delete(s.id);
      } else {
        for (const s of pageStudents) next.add(s.id);
      }
      return next;
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(student: Student) {
    try {
      await phpApiService.deleteStudent(student.id);
      addNotification(`Student ${student.fullName} deleted.`, "success");
      setDeleteConfirm(null);
      await fetchStudents(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function handleBulkDelete() {
    try {
      for (const id of selectedIds) {
        await phpApiService.deleteStudent(id);
      }
      addNotification(`${selectedIds.size} students deleted.`, "success");
      setSelectedIds(new Set());
      setBulkDeleteConfirm(false);
      await fetchStudents(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to bulk delete");
    }
  }

  // ── Excel export ───────────────────────────────────────────────────────────
  async function exportExcel() {
    try {
      const xlsx = await import("xlsx");
      const rows = displayRows.map((s) => ({
        "Adm.No": s.admNo,
        "Full Name": s.fullName,
        Class: s.class,
        Section: s.section,
        Gender: s.gender,
        DOB: s.dob,
        "Father Name": s.fatherName,
        "Father Mobile": s.fatherMobile,
        "Mother Name": s.motherName,
        "Mother Mobile": s.motherMobile,
        Mobile: s.mobile,
        Category: s.category,
        Village: s.village,
        Address: s.address,
        "Aadhaar No": s.aadhaarNo,
        "SR No": s.srNo,
        "Pen No": s.penNo,
        "APAAR No": s.apaarNo,
        "Previous School": s.previousSchool,
        "Adm. Date": s.admissionDate,
        Route: s.transportRoute,
        "Bus No": s.transportBusNo,
        Status: s.status,
      }));
      const ws = xlsx.utils.json_to_sheet(rows);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "Students");
      xlsx.writeFile(wb, `students_${currentSession?.label ?? "export"}.xlsx`);
      toast.success("Excel exported successfully");
    } catch {
      toast.error("Failed to export Excel");
    }
  }

  // ── WhatsApp broadcast ─────────────────────────────────────────────────────
  function handleWhatsAppBroadcast() {
    toast.info("Open Communication → Bulk Broadcast to send WhatsApp messages");
  }

  const birthdayStudents = useMemo(
    () => upcomingBirthdays(students),
    [students],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full" data-ocid="students.page">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-card border-b border-border flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="w-5 h-5 text-primary flex-shrink-0" />
          <h1 className="font-display font-bold text-foreground text-lg truncate">
            Students
          </h1>
          <Badge variant="secondary" className="text-xs">
            {totalCount}
          </Badge>
          {isRefreshing && (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Stat pills */}
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <span className="bg-muted/60 px-2 py-0.5 rounded-full">
              Active: {stats.active}
            </span>
            <span className="bg-muted/60 px-2 py-0.5 rounded-full">
              Boys: {stats.boys}
            </span>
            <span className="bg-muted/60 px-2 py-0.5 rounded-full">
              Girls: {stats.girls}
            </span>
          </div>

          {birthdayStudents.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-amber-500 h-8"
              onClick={() => setShowBirthdays(true)}
              data-ocid="students.birthdays_button"
            >
              <Cake className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {birthdayStudents.length} Birthday
                {birthdayStudents.length > 1 ? "s" : ""}
              </span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8"
            onClick={() => setFamilyGrouping((v) => !v)}
            data-ocid="students.family_grouping_toggle"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {familyGrouping ? "Ungrouped" : "Family"}
            </span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8"
            onClick={handleWhatsAppBroadcast}
            data-ocid="students.whatsapp_button"
          >
            <MessageCircle className="w-3.5 h-3.5 text-green-500" />
            <span className="hidden sm:inline">WhatsApp</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8"
            onClick={exportExcel}
            data-ocid="students.export_button"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>

          {canManage && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8"
              onClick={() => setShowImportExport(true)}
              data-ocid="students.import_button"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Import</span>
            </Button>
          )}

          {canManage && (
            <Button
              size="sm"
              className="gap-1.5 h-8"
              onClick={() => {
                setEditStudent(null);
                setShowForm(true);
              }}
              data-ocid="students.add_button"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Student
            </Button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-background border-b border-border flex-wrap">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Search name, adm no, mobile…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            data-ocid="students.search_input"
          />
          {search && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => setSearch("")}
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>

        <Select
          value={filterClass}
          onValueChange={(v) => {
            setFilterClass(v);
            setFilterSection("all");
            setCurrentPage(1);
          }}
        >
          <SelectTrigger
            className="h-8 w-[120px] text-xs"
            data-ocid="students.class_filter"
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

        {sectionsForFilter.length > 0 && (
          <Select
            value={filterSection}
            onValueChange={(v) => {
              setFilterSection(v);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger
              className="h-8 w-[100px] text-xs"
              data-ocid="students.section_filter"
            >
              <SelectValue placeholder="Section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {sectionsForFilter.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={filterStatus}
          onValueChange={(v) => {
            setFilterStatus(v);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger
            className="h-8 w-[110px] text-xs"
            data-ocid="students.status_filter"
          >
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
          <SelectTrigger
            className="h-8 w-[90px] text-xs"
            data-ocid="students.gender_filter"
          >
            <SelectValue placeholder="Gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Male">Male</SelectItem>
            <SelectItem value="Female">Female</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>

        {/* Column picker */}
        <Popover open={colPickerOpen} onOpenChange={setColPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 ml-auto"
              data-ocid="students.columns_button"
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Columns</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-2">
            <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
              Show/Hide Columns
            </p>
            <div className="grid grid-cols-2 gap-1 max-h-56 overflow-y-auto">
              {ALL_COLUMNS.filter((c) => c.key !== "photo").map((col) => (
                <div
                  key={col.key}
                  className="flex items-center gap-1.5 text-xs cursor-pointer px-1 py-0.5 rounded hover:bg-muted"
                >
                  <Checkbox
                    id={`col-toggle-${col.key}`}
                    checked={visibleCols.includes(col.key)}
                    onCheckedChange={(v) =>
                      setVisibleCols((prev) =>
                        v
                          ? [...prev, col.key]
                          : prev.filter((k) => k !== col.key),
                      )
                    }
                  />
                  <label
                    htmlFor={`col-toggle-${col.key}`}
                    className="cursor-pointer"
                  >
                    {col.label}
                  </label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => void fetchStudents(true)}
          title="Refresh"
          data-ocid="students.refresh_button"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-2 bg-primary/10 border-b border-primary/20 text-sm"
          data-ocid="students.bulk_actions"
        >
          <span className="text-primary font-medium">
            {selectedIds.size} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-destructive gap-1.5"
            onClick={() => setBulkDeleteConfirm(true)}
            data-ocid="students.bulk_delete_button"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Selected
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 ml-auto"
            onClick={() => setSelectedIds(new Set())}
            data-ocid="students.bulk_clear_button"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </Button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          className="flex items-center gap-3 px-4 py-3 bg-destructive/10 border-b border-destructive/20 text-sm text-destructive"
          data-ocid="students.error_state"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-destructive"
            onClick={() => void fetchStudents()}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto min-h-0">
        <table
          className="w-full text-sm border-collapse min-w-max"
          data-ocid="students.table"
        >
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
            <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
              <th className="w-8 px-2 text-center border-r border-border/40">
                <Checkbox
                  checked={allPageSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                  data-ocid="students.select_all_checkbox"
                />
              </th>
              {activeVisibleCols.map((col) => (
                <th
                  key={col.key}
                  className="px-2 py-2 text-left border-r border-border/40 last:border-r-0 whitespace-nowrap"
                  style={{ minWidth: col.width }}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                      {sortKey === col.key ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="w-3 h-3" />
                        ) : (
                          <ArrowDown className="w-3 h-3" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
              {canManage && (
                <th className="w-16 px-2 py-2 text-center">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonTableRows
                rows={12}
                cols={activeVisibleCols.length + 1}
              />
            ) : pageStudents.length === 0 ? (
              <tr>
                <td
                  colSpan={activeVisibleCols.length + (canManage ? 2 : 1)}
                  className="py-16 text-center text-muted-foreground"
                  data-ocid="students.empty_state"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Users className="w-8 h-8 opacity-30" />
                    <p className="text-sm font-medium">No students found</p>
                    <p className="text-xs">
                      {students.length === 0
                        ? "Add your first student to get started."
                        : "Try adjusting the filters."}
                    </p>
                    {canManage && students.length === 0 && (
                      <Button
                        size="sm"
                        className="mt-2 gap-1.5"
                        onClick={() => {
                          setEditStudent(null);
                          setShowForm(true);
                        }}
                        data-ocid="students.empty_add_button"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Student
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              pageStudents.map((student, idx) => {
                const rowIndex = (safePage - 1) * ITEMS_PER_PAGE + idx + 1;
                const isSelected = selectedIds.has(student.id);
                return (
                  <tr
                    key={student.id}
                    className={`border-b border-border/60 hover:bg-accent/5 cursor-pointer transition-colors ${isSelected ? "bg-primary/5" : ""}`}
                    onClick={() => setSelectedStudent(student)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        setSelectedStudent(student);
                    }}
                    tabIndex={0}
                    data-ocid={`students.item.${rowIndex}`}
                  >
                    <td
                      className="w-8 px-2 text-center border-r border-border/40"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(v) => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (v) next.add(student.id);
                            else next.delete(student.id);
                            return next;
                          });
                        }}
                        aria-label={`Select ${student.fullName}`}
                        data-ocid={`students.checkbox.${rowIndex}`}
                      />
                    </td>
                    {activeVisibleCols.map((col) => (
                      <td
                        key={col.key}
                        className="px-2 py-1.5 border-r border-border/40 last:border-r-0 max-w-[200px]"
                      >
                        {col.key === "photo" ? (
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 overflow-hidden">
                            {student.photo ? (
                              <img
                                src={student.photo}
                                alt={student.fullName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              student.fullName.charAt(0).toUpperCase()
                            )}
                          </div>
                        ) : col.key === "status" ? (
                          <Badge
                            variant={
                              student.status === "active"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {student.status === "active"
                              ? "Active"
                              : "Discontinued"}
                          </Badge>
                        ) : (
                          <span className="truncate block text-xs">
                            {getCellValue(student, col.key)}
                          </span>
                        )}
                      </td>
                    ))}
                    {canManage && (
                      <td
                        className="w-16 px-2 py-1.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive opacity-60 hover:opacity-100"
                          onClick={() => setDeleteConfirm(student)}
                          aria-label="Delete student"
                          data-ocid={`students.delete_button.${rowIndex}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && displayRows.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between px-4 py-2 bg-card border-t border-border text-sm flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">
            Showing{" "}
            {Math.min((safePage - 1) * ITEMS_PER_PAGE + 1, displayRows.length)}–
            {Math.min(safePage * ITEMS_PER_PAGE, displayRows.length)} of{" "}
            {displayRows.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              data-ocid="students.pagination_prev"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              {safePage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              data-ocid="students.pagination_next"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Student Detail Modal ── */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onUpdate={(updated) => {
            setStudents((prev) =>
              prev.map((s) => (s.id === updated.id ? updated : s)),
            );
            setSelectedStudent(updated);
          }}
          allStudents={students}
        />
      )}

      {/* ── Add / Edit Form ── */}
      {showForm && (
        <StudentForm
          student={editStudent ?? undefined}
          onSave={async (saved) => {
            // Close form first
            setShowForm(false);
            setEditStudent(null);
            // Await the refresh so the new student appears in the list
            await fetchStudents(true);
            // Show success AFTER the list has refreshed with real server data
            toast.success(
              editStudent
                ? `${saved.fullName} updated`
                : `${saved.fullName} added`,
            );
          }}
          onClose={() => {
            setShowForm(false);
            setEditStudent(null);
          }}
        />
      )}

      {/* ── Import/Export ── */}
      {showImportExport && (
        <StudentImportExport
          onClose={() => setShowImportExport(false)}
          onImported={async () => {
            setShowImportExport(false);
            await fetchStudents(true);
          }}
        />
      )}

      {/* ── Delete Confirm ── */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          data-ocid="students.delete_dialog"
        >
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <p className="font-semibold text-foreground">Delete Student?</p>
            <p className="text-sm text-muted-foreground">
              This will permanently delete{" "}
              <strong>{deleteConfirm.fullName}</strong>. This action cannot be
              undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirm(null)}
                data-ocid="students.delete_cancel_button"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => void handleDelete(deleteConfirm)}
                data-ocid="students.delete_confirm_button"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Delete Confirm ── */}
      {bulkDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          data-ocid="students.bulk_delete_dialog"
        >
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <p className="font-semibold text-foreground">
              Delete {selectedIds.size} Students?
            </p>
            <p className="text-sm text-muted-foreground">
              This will permanently delete the selected students and cannot be
              undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkDeleteConfirm(false)}
                data-ocid="students.bulk_delete_cancel_button"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => void handleBulkDelete()}
                data-ocid="students.bulk_delete_confirm_button"
              >
                Delete All
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Birthdays Panel ── */}
      {showBirthdays && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-sm w-full p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-foreground flex items-center gap-2">
                <Cake className="w-4 h-4 text-amber-500" /> Upcoming Birthdays
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setShowBirthdays(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {birthdayStudents.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 py-1.5 border-b border-border/60 last:border-0 text-sm"
                >
                  <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center text-xs font-bold text-amber-600">
                    {s.fullName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{s.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.class} {s.section} · DOB: {s.dob}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
