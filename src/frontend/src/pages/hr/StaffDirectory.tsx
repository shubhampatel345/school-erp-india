import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Columns,
  Download,
  Edit2,
  Eye,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  UserCircle,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import type { Staff } from "../../types";
import { generateId } from "../../utils/localStorage";
import StaffForm from "./StaffForm";

interface Props {
  onNavigate?: (page: string) => void;
}

const DESIGNATIONS = [
  "All",
  "Teacher",
  "Principal",
  "Vice Principal",
  "Admin",
  "Receptionist",
  "Accountant",
  "Librarian",
  "Driver",
  "Peon",
  "Security",
  "Cook",
  "Other",
];

const DEPARTMENTS = [
  "All",
  "Teaching",
  "Admin",
  "Support",
  "Accounts",
  "Library",
  "Transport",
];

const ALL_COLUMNS = [
  { id: "empId", label: "Emp ID" },
  { id: "photo", label: "Photo" },
  { id: "name", label: "Name" },
  { id: "designation", label: "Designation" },
  { id: "department", label: "Department" },
  { id: "mobile", label: "Mobile" },
  { id: "gender", label: "Gender" },
  { id: "email", label: "Email" },
  { id: "salary", label: "Salary" },
  { id: "joinDate", label: "Join Date" },
  { id: "village", label: "Village" },
  { id: "status", label: "Status" },
] as const;

type ColId = (typeof ALL_COLUMNS)[number]["id"];

const DEFAULT_VISIBLE: ColId[] = [
  "photo",
  "empId",
  "name",
  "designation",
  "department",
  "mobile",
  "gender",
  "salary",
  "status",
];

const PAGE_SIZE = 50;

function autoEmpId(existing: Staff[]): string {
  const nums = existing
    .map((s) => {
      const m = s.empId?.match(/^EMP(\d+)$/);
      return m ? Number.parseInt(m[1], 10) : 0;
    })
    .filter(Boolean);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `EMP${String(next).padStart(3, "0")}`;
}

function StaffAvatar({ photo, name }: { photo?: string; name: string }) {
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        className="w-8 h-8 rounded-full object-cover border border-border shrink-0"
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
      {(name ?? "?").charAt(0).toUpperCase()}
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  return (
    <Badge
      variant={status === "inactive" ? "secondary" : "outline"}
      className={`text-xs ${status === "inactive" ? "text-muted-foreground" : "text-accent border-accent/40"}`}
    >
      {status === "inactive" ? "Inactive" : "Active"}
    </Badge>
  );
}

export default function StaffDirectory({ onNavigate: _onNavigate }: Props) {
  const {
    getData,
    saveData,
    updateData,
    deleteData,
    refreshCollection,
    addNotification,
    canWrite,
  } = useApp();

  const [search, setSearch] = useState("");
  const [filterDesignation, setFilterDesignation] = useState("All");
  const [filterDepartment, setFilterDepartment] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterGender, setFilterGender] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editStaff, setEditStaff] = useState<Staff | undefined>(undefined);
  const [viewStaff, setViewStaff] = useState<Staff | null>(null);
  const [visibleCols, setVisibleCols] = useState<Set<ColId>>(
    new Set(DEFAULT_VISIBLE),
  );
  const [showColMenu, setShowColMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);

  // Refresh from server on mount
  useEffect(() => {
    void (async () => {
      setRefreshing(true);
      try {
        await refreshCollection("staff");
      } catch {
        // ignore — use cached data
      } finally {
        setRefreshing(false);
      }
    })();
  }, [refreshCollection]);

  // Re-read from context on every render (reactive to data changes)
  const staff = (getData("staff") as Staff[]).map((s) => ({
    ...s,
    name: s.name ?? s.fullName ?? "",
  }));

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-colmenu]")) setShowColMenu(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = staff.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (s.name ?? "").toLowerCase().includes(q) ||
      (s.empId ?? "").toLowerCase().includes(q) ||
      (s.mobile ?? "").includes(search) ||
      (s.designation ?? "").toLowerCase().includes(q) ||
      (s.department ?? "").toLowerCase().includes(q);
    const matchDesig =
      filterDesignation === "All" || s.designation === filterDesignation;
    const matchDept =
      filterDepartment === "All" || (s.department ?? "") === filterDepartment;
    const matchStatus =
      filterStatus === "All" ||
      (filterStatus === "active"
        ? (s.status ?? "active") === "active"
        : s.status === "inactive");
    const matchGender =
      filterGender === "All" || (s.gender ?? "") === filterGender;
    return matchSearch && matchDesig && matchDept && matchStatus && matchGender;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  const filterKey = `${search}|${filterDesignation}|${filterDepartment}|${filterStatus}|${filterGender}`;
  const prevFilterKeyRef = useRef(filterKey);
  if (prevFilterKeyRef.current !== filterKey) {
    prevFilterKeyRef.current = filterKey;
    setPage(1);
  }

  // ── CRUD ──────────────────────────────────────────────────

  const handleSave = useCallback(
    async (s: Staff) => {
      setSaving(true);
      try {
        const existing = staff.find((x) => x.id === s.id);
        if (existing) {
          await updateData(
            "staff",
            s.id,
            s as unknown as Record<string, unknown>,
          );
          addNotification(`Staff updated: ${s.name}`, "success", "👤");
        } else {
          const empId = s.empId?.trim() || autoEmpId(staff);
          await saveData("staff", {
            ...s,
            empId,
          } as unknown as Record<string, unknown>);
          addNotification(`Staff added: ${s.name}`, "success", "👤");
        }
        setShowForm(false);
        setEditStaff(undefined);
      } catch {
        addNotification("Failed to save staff member.", "error");
      } finally {
        setSaving(false);
      }
    },
    [staff, saveData, updateData, addNotification],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this staff member? This cannot be undone.")) return;
      try {
        await deleteData("staff", id);
        addNotification("Staff member deleted.", "info");
        setViewStaff(null);
      } catch {
        addNotification("Failed to delete staff member.", "error");
      }
    },
    [deleteData, addNotification],
  );

  // ── Export CSV ─────────────────────────────────────────────

  function handleExport() {
    const headers = [
      "EmpID",
      "Name",
      "Gender",
      "Designation",
      "Department",
      "Mobile",
      "AltMobile",
      "DOB",
      "Email",
      "Address",
      "Village",
      "Qualification",
      "JoiningDate",
      "BaseSalary",
      "AadhaarNo",
      "BankAccount",
      "IFSCCode",
      "BankName",
      "Status",
    ];
    const rows = staff.map((s) => [
      s.empId ?? "",
      s.name ?? "",
      s.gender ?? "",
      s.designation ?? "",
      s.department ?? "",
      s.mobile ?? "",
      (s as unknown as { altMobile?: string }).altMobile ?? "",
      s.dob ?? "",
      s.email ?? "",
      (s.address ?? "").replace(/,/g, " "),
      s.village ?? "",
      s.qualification ?? "",
      s.joiningDate ?? "",
      String(s.baseSalary ?? s.salary ?? ""),
      s.aadhaarNo ?? "",
      s.bankAccount ?? "",
      s.ifscCode ?? "",
      s.bankName ?? "",
      s.status ?? "active",
    ]);
    const csv = [headers, ...rows]
      .map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "staff_export.csv";
    a.click();
  }

  // ── Import CSV ─────────────────────────────────────────────

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split("\n").filter((l) => l.trim());
        if (lines.length < 2) {
          alert("No valid data rows found.");
          return;
        }

        // Parse header row to get column indices
        const headerLine = lines[0];
        const headers = headerLine
          .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
          .map((h) => h.replace(/^"|"$/g, "").trim().toLowerCase());

        const col = (name: string) => headers.indexOf(name.toLowerCase());

        const imported: Staff[] = lines.slice(1).map((line) => {
          const cols = line
            .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
            .map((c) => c.replace(/^"|"$/g, "").trim());

          const get = (name: string) => cols[col(name)] ?? "";
          const mobile = get("Mobile");
          const password = mobile || "password";

          return {
            id: generateId(),
            empId: get("EmpID").trim() || autoEmpId(staff),
            name: get("Name").trim() ?? "",
            fullName: get("Name").trim() ?? "",
            gender: (get("Gender") as "Male" | "Female" | "Other") || undefined,
            designation: get("Designation").trim() || "Other",
            department: get("Department").trim() || undefined,
            mobile: mobile,
            dob: get("DOB") || undefined,
            email: get("Email").trim() || undefined,
            address: get("Address").trim() || undefined,
            village: get("Village").trim() || undefined,
            qualification: get("Qualification").trim() || undefined,
            joiningDate: get("JoiningDate").trim() || undefined,
            baseSalary: get("BaseSalary")
              ? Number(get("BaseSalary"))
              : undefined,
            salary: get("BaseSalary") ? Number(get("BaseSalary")) : undefined,
            aadhaarNo: get("AadhaarNo").trim() || undefined,
            bankAccount: get("BankAccount").trim() || undefined,
            ifscCode: get("IFSCCode").trim() || undefined,
            bankName: get("BankName").trim() || undefined,
            status: (get("Status").trim() === "inactive"
              ? "inactive"
              : "active") as "active" | "inactive",
            subjects: [],
            credentials: { username: mobile, password },
          };
        });

        if (imported.length === 0) {
          alert("No valid staff records found in the CSV.");
          return;
        }

        let count = 0;
        for (const s of imported) {
          try {
            await saveData("staff", s as unknown as Record<string, unknown>);
            count++;
          } catch {
            // continue
          }
        }
        addNotification(`Imported ${count} staff member(s).`, "success");
      } catch {
        alert("Failed to parse CSV. Please check the file format.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // ── FORM VIEW ──────────────────────────────────────────────
  if (showForm) {
    return (
      <StaffForm
        initial={editStaff}
        onSave={(s) => {
          void handleSave(s);
        }}
        onCancel={() => {
          setShowForm(false);
          setEditStaff(undefined);
        }}
      />
    );
  }

  // ── DETAIL VIEW ────────────────────────────────────────────
  if (viewStaff) {
    const current = staff.find((s) => s.id === viewStaff.id) ?? viewStaff;
    const altMobile = (current as unknown as { altMobile?: string }).altMobile;
    return (
      <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold text-foreground">
            Staff Details
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewStaff(null)}
          >
            ← Back
          </Button>
        </div>
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-4">
            {current.photo ? (
              <img
                src={current.photo}
                alt={current.name}
                className="w-20 h-20 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold">
                {(current.name ?? "?").charAt(0)}
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {current.name}
              </h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="default" className="text-xs">
                  {current.designation}
                </Badge>
                <StatusBadge status={current.status} />
                {current.gender && (
                  <Badge variant="outline" className="text-xs">
                    {current.gender}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {current.empId} · {current.department}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            {(
              [
                ["Emp ID", current.empId],
                ["Mobile", current.mobile],
                ["Alt Mobile", altMobile],
                ["Email", current.email],
                ["Date of Birth", current.dob],
                ["Joining Date", current.joiningDate],
                ["Qualification", current.qualification],
                ["Village", current.village],
                ["Address", current.address],
                ["Aadhaar No.", current.aadhaarNo],
                ["Bank Account", current.bankAccount],
                ["IFSC Code", current.ifscCode],
                ["Bank Name", current.bankName],
                [
                  "Base Salary",
                  (current.baseSalary ?? current.salary)
                    ? `₹${(current.baseSalary ?? current.salary ?? 0).toLocaleString("en-IN")}`
                    : null,
                ],
              ] as [string, string | undefined | null][]
            ).map(([label, value]) =>
              value ? (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-medium text-foreground break-words">
                    {value}
                  </p>
                </div>
              ) : null,
            )}
          </div>

          <div className="border border-border rounded-lg p-3 bg-muted/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Login Credentials
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Username: </span>
              <span className="font-mono font-medium">
                {current.credentials?.username ?? current.mobile}
              </span>
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Password: </span>
              <span className="font-mono font-medium">
                {current.credentials?.password ?? "—"}
              </span>
            </p>
          </div>

          {canWrite && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setEditStaff({ ...current });
                  setViewStaff(null);
                  setShowForm(true);
                }}
                data-ocid="staff.edit_button"
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => void handleDelete(current.id)}
                data-ocid="staff.delete_button"
              >
                Delete
              </Button>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // ── LIST VIEW ──────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              data-ocid="staff.search_input"
              placeholder="Search by name, mobile, designation…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={filterDesignation}
            onValueChange={setFilterDesignation}
          >
            <SelectTrigger
              className="w-40"
              data-ocid="staff.filter-designation"
            >
              <SelectValue placeholder="All Designations" />
            </SelectTrigger>
            <SelectContent>
              {DESIGNATIONS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d === "All" ? "All Designations" : d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterDepartment} onValueChange={setFilterDepartment}>
            <SelectTrigger className="w-40" data-ocid="staff.filter-dept">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d === "All" ? "All Departments" : d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterGender} onValueChange={setFilterGender}>
            <SelectTrigger className="w-32" data-ocid="staff.filter-gender">
              <SelectValue placeholder="All Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Gender</SelectItem>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32" data-ocid="staff.filter-status">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRefreshing(true);
              void refreshCollection("staff").finally(() =>
                setRefreshing(false),
              );
            }}
            disabled={refreshing}
            aria-label="Refresh staff list"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>

          {/* Column picker */}
          <div className="relative" data-colmenu>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowColMenu((v) => !v)}
              data-ocid="staff.columns_button"
            >
              <Columns className="w-4 h-4 mr-1.5" /> Columns
            </Button>
            {showColMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg p-3 min-w-[180px] space-y-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Show/Hide Columns
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowColMenu(false)}
                    aria-label="Close"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {ALL_COLUMNS.map((col) => (
                  <label
                    key={col.id}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/40 rounded px-1 py-0.5"
                  >
                    <input
                      type="checkbox"
                      checked={visibleCols.has(col.id)}
                      onChange={(e) => {
                        setVisibleCols((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(col.id);
                          else next.delete(col.id);
                          return next;
                        });
                      }}
                      className="accent-primary"
                    />
                    <span className="text-foreground">{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImport}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            data-ocid="staff.import_button"
          >
            <Upload className="w-4 h-4 mr-1.5" /> Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            data-ocid="staff.export_button"
          >
            <Download className="w-4 h-4 mr-1.5" /> Export
          </Button>
          {canWrite && (
            <Button
              size="sm"
              data-ocid="staff.add_button"
              onClick={() => {
                setEditStaff(undefined);
                setShowForm(true);
              }}
              disabled={saving}
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Staff
            </Button>
          )}
        </div>
      </div>

      {/* Stats row */}
      {staff.length > 0 && (
        <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
          <span className="font-medium text-foreground">
            {staff.length} total
          </span>
          <span className="text-primary">
            {staff.filter((s) => s.designation === "Teacher").length} teachers
          </span>
          <span>
            {staff.filter((s) => (s.gender ?? "") === "Female").length} female
          </span>
          <span className="text-destructive">
            {staff.filter((s) => s.status === "inactive").length} inactive
          </span>
          {filtered.length !== staff.length && (
            <span className="text-muted-foreground">
              {filtered.length} shown
            </span>
          )}
        </div>
      )}

      {/* Table */}
      {refreshing && staff.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Loading staff from server…</span>
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center" data-ocid="staff.empty_state">
          <UserCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground font-medium">
            {search ||
            filterDesignation !== "All" ||
            filterDepartment !== "All" ||
            filterStatus !== "All"
              ? "No staff match your search or filters."
              : "No staff yet. Add your first staff member."}
          </p>
          {!search &&
            filterDesignation === "All" &&
            filterDepartment === "All" &&
            filterStatus === "All" &&
            canWrite && (
              <Button
                className="mt-4"
                size="sm"
                onClick={() => {
                  setEditStaff(undefined);
                  setShowForm(true);
                }}
                data-ocid="staff.empty_add_button"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Add Staff
              </Button>
            )}
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-3 font-semibold text-muted-foreground w-10">
                      #
                    </th>
                    {visibleCols.has("photo") && (
                      <th className="text-left px-3 py-3 font-semibold text-muted-foreground w-10">
                        Photo
                      </th>
                    )}
                    {visibleCols.has("empId") && (
                      <th className="text-left px-3 py-3 font-semibold text-muted-foreground">
                        Emp ID
                      </th>
                    )}
                    {visibleCols.has("name") && (
                      <th className="text-left px-3 py-3 font-semibold text-muted-foreground">
                        Name
                      </th>
                    )}
                    {visibleCols.has("designation") && (
                      <th className="text-left px-3 py-3 font-semibold text-muted-foreground">
                        Designation
                      </th>
                    )}
                    {visibleCols.has("department") && (
                      <th className="text-left px-3 py-3 font-semibold text-muted-foreground hidden md:table-cell">
                        Department
                      </th>
                    )}
                    {visibleCols.has("mobile") && (
                      <th className="text-left px-3 py-3 font-semibold text-muted-foreground">
                        Mobile
                      </th>
                    )}
                    {visibleCols.has("gender") && (
                      <th className="text-left px-3 py-3 font-semibold text-muted-foreground hidden sm:table-cell">
                        Gender
                      </th>
                    )}
                    {visibleCols.has("email") && (
                      <th className="text-left px-3 py-3 font-semibold text-muted-foreground hidden lg:table-cell">
                        Email
                      </th>
                    )}
                    {visibleCols.has("salary") && (
                      <th className="text-right px-3 py-3 font-semibold text-muted-foreground hidden lg:table-cell">
                        Salary
                      </th>
                    )}
                    {visibleCols.has("joinDate") && (
                      <th className="text-left px-3 py-3 font-semibold text-muted-foreground hidden lg:table-cell">
                        Join Date
                      </th>
                    )}
                    {visibleCols.has("village") && (
                      <th className="text-left px-3 py-3 font-semibold text-muted-foreground hidden xl:table-cell">
                        Village
                      </th>
                    )}
                    {visibleCols.has("status") && (
                      <th className="text-left px-3 py-3 font-semibold text-muted-foreground">
                        Status
                      </th>
                    )}
                    <th className="text-right px-3 py-3 font-semibold text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginated.map((s, idx) => (
                    <tr
                      key={s.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      data-ocid={`staff.item.${(page - 1) * PAGE_SIZE + idx + 1}`}
                      onDoubleClick={() => setViewStaff(s)}
                      title="Double-click for full details"
                    >
                      <td className="px-3 py-3 text-muted-foreground text-xs">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      {visibleCols.has("photo") && (
                        <td className="px-3 py-3">
                          <StaffAvatar photo={s.photo} name={s.name ?? ""} />
                        </td>
                      )}
                      {visibleCols.has("empId") && (
                        <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                          {s.empId}
                        </td>
                      )}
                      {visibleCols.has("name") && (
                        <td className="px-3 py-3">
                          <p className="font-medium text-foreground truncate max-w-[160px]">
                            {s.name}
                          </p>
                        </td>
                      )}
                      {visibleCols.has("designation") && (
                        <td className="px-3 py-3">
                          <Badge
                            variant={
                              s.designation === "Teacher"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {s.designation}
                          </Badge>
                        </td>
                      )}
                      {visibleCols.has("department") && (
                        <td className="px-3 py-3 text-muted-foreground hidden md:table-cell">
                          {s.department ?? "—"}
                        </td>
                      )}
                      {visibleCols.has("mobile") && (
                        <td className="px-3 py-3 text-muted-foreground">
                          {s.mobile}
                        </td>
                      )}
                      {visibleCols.has("gender") && (
                        <td className="px-3 py-3 text-muted-foreground hidden sm:table-cell">
                          {s.gender ?? "—"}
                        </td>
                      )}
                      {visibleCols.has("email") && (
                        <td className="px-3 py-3 text-muted-foreground hidden lg:table-cell text-xs truncate max-w-[150px]">
                          {s.email ?? "—"}
                        </td>
                      )}
                      {visibleCols.has("salary") && (
                        <td className="px-3 py-3 text-right font-mono text-sm hidden lg:table-cell">
                          {(s.baseSalary ?? s.salary)
                            ? `₹${(s.baseSalary ?? s.salary ?? 0).toLocaleString("en-IN")}`
                            : "—"}
                        </td>
                      )}
                      {visibleCols.has("joinDate") && (
                        <td className="px-3 py-3 text-muted-foreground hidden lg:table-cell text-xs">
                          {s.joiningDate ?? "—"}
                        </td>
                      )}
                      {visibleCols.has("village") && (
                        <td className="px-3 py-3 text-muted-foreground hidden xl:table-cell text-xs">
                          {s.village ?? "—"}
                        </td>
                      )}
                      {visibleCols.has("status") && (
                        <td className="px-3 py-3">
                          <StatusBadge status={s.status} />
                        </td>
                      )}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label="View details"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewStaff(s);
                            }}
                            data-ocid={`staff.view_button.${(page - 1) * PAGE_SIZE + idx + 1}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {canWrite && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                aria-label="Edit staff"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditStaff({ ...s });
                                  setShowForm(true);
                                }}
                                data-ocid={`staff.edit_button.${(page - 1) * PAGE_SIZE + idx + 1}`}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                aria-label="Delete staff"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDelete(s.id);
                                }}
                                className="text-destructive hover:text-destructive"
                                data-ocid={`staff.delete_button.${(page - 1) * PAGE_SIZE + idx + 1}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
                {filtered.length}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  data-ocid="staff.pagination_prev"
                >
                  ← Prev
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pg =
                    Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                  return (
                    <Button
                      key={pg}
                      variant={page === pg ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pg)}
                    >
                      {pg}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  data-ocid="staff.pagination_next"
                >
                  Next →
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <p className="text-xs text-muted-foreground">
        CSV columns: EmpID, Name, Gender, Designation, Department, Mobile,
        AltMobile, DOB, Email, Address, Village, Qualification, JoiningDate,
        BaseSalary, AadhaarNo, BankAccount, IFSCCode, BankName, Status —
        double-click a row for full details.
      </p>
    </div>
  );
}
