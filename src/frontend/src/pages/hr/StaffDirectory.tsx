/**
 * StaffDirectory — Direct API rebuild
 * All CRUD via phpApiService.getStaff/addStaff/updateStaff/deleteStaff.
 * Waits for HTTP 200 before showing success.
 * NO getData/saveData context usage. NO amount spinners.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  Download,
  Edit2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserCircle,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type { StaffRecord } from "../../utils/phpApiService";
import phpApiService from "../../utils/phpApiService";

interface Props {
  onNavigate?: (page: string) => void;
}

const DESIGNATIONS = [
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
  "Teaching",
  "Admin",
  "Support",
  "Accounts",
  "Library",
  "Transport",
];

const GENDERS = ["Male", "Female", "Other"];

type FilterDesignation = "All" | (typeof DESIGNATIONS)[number];
type FilterDepartment = "All" | (typeof DEPARTMENTS)[number];

interface StaffForm {
  name: string;
  designation: string;
  department: string;
  mobile: string;
  email: string;
  salary: string; // plain text — no spinners
  joiningDate: string;
  gender: string;
  address: string;
  qualification: string;
  empId: string;
  status: string;
}

const EMPTY_FORM: StaffForm = {
  name: "",
  designation: "Teacher",
  department: "Teaching",
  mobile: "",
  email: "",
  salary: "",
  joiningDate: "",
  gender: "Male",
  address: "",
  qualification: "",
  empId: "",
  status: "active",
};

function autoEmpId(existing: StaffRecord[]): string {
  const nums = existing
    .map((s) => {
      const m = s.empId?.match(/^EMP(\d+)$/);
      return m ? Number.parseInt(m[1], 10) : 0;
    })
    .filter(Boolean);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `EMP${String(next).padStart(3, "0")}`;
}

const PAGE_SIZE = 50;

export default function StaffDirectory({ onNavigate: _onNavigate }: Props) {
  const { currentUser } = useApp();
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [filterDesignation, setFilterDesignation] =
    useState<FilterDesignation>("All");
  const [filterDepartment, setFilterDepartment] =
    useState<FilterDepartment>("All");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StaffForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canWrite =
    currentUser?.role === "superadmin" || currentUser?.role === "admin";

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const result = await phpApiService.getStaff();
      setStaff(result);
      setTotal(result.length);
    } catch {
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  // Client-side filter
  const filtered = staff.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.empId ?? "").toLowerCase().includes(q) ||
      (s.mobile ?? "").includes(q);
    const matchDesig =
      filterDesignation === "All" || s.designation === filterDesignation;
    const matchDept =
      filterDepartment === "All" ||
      (s as Record<string, unknown>).department === filterDepartment;
    return matchSearch && matchDesig && matchDept;
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  function openAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, empId: autoEmpId(staff) });
    setShowModal(true);
  }

  function openEdit(s: StaffRecord) {
    setEditingId(s.id);
    setForm({
      name: s.name,
      designation: s.designation ?? "Teacher",
      department:
        ((s as Record<string, unknown>).department as string) ?? "Teaching",
      mobile: s.mobile ?? "",
      email: s.email ?? "",
      salary: String(s.salary ?? ""),
      joiningDate: ((s as Record<string, unknown>).joiningDate as string) ?? "",
      gender: ((s as Record<string, unknown>).gender as string) ?? "Male",
      address: ((s as Record<string, unknown>).address as string) ?? "",
      qualification:
        ((s as Record<string, unknown>).qualification as string) ?? "",
      empId: s.empId ?? "",
      status: s.status ?? "active",
    });
    setShowModal(true);
  }

  function setField(key: keyof StaffForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!form.empId.trim()) {
      toast.error("Employee ID is required");
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<StaffRecord> = {
        name: form.name.trim(),
        empId: form.empId.trim(),
        designation: form.designation,
        mobile: form.mobile.trim(),
        email: form.email.trim(),
        salary: form.salary ? Number(form.salary) : undefined,
        status: form.status,
        department: form.department,
        joiningDate: form.joiningDate,
        gender: form.gender,
        address: form.address,
        qualification: form.qualification,
      } as Partial<StaffRecord> & Record<string, unknown>;

      if (editingId) {
        await phpApiService.updateStaff({ id: editingId, ...payload });
        toast.success("Staff updated successfully");
      } else {
        await phpApiService.addStaff(payload);
        toast.success("Staff added successfully");
      }
      setShowModal(false);
      void loadStaff();
    } catch {
      toast.error("Failed to save staff. Please retry.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this staff member?")) return;
    setDeletingId(id);
    try {
      await phpApiService.del("staff/delete", { id });
      toast.success("Staff deleted");
      void loadStaff();
    } catch {
      toast.error("Failed to delete staff. Please retry.");
    } finally {
      setDeletingId(null);
    }
  }

  function exportCSV() {
    const rows = [
      [
        "Emp ID",
        "Name",
        "Designation",
        "Department",
        "Mobile",
        "Email",
        "Salary",
        "Status",
      ],
    ];
    for (const s of filtered) {
      rows.push([
        s.empId ?? "",
        s.name,
        s.designation ?? "",
        ((s as Record<string, unknown>).department as string) ?? "",
        s.mobile ?? "",
        s.email ?? "",
        String(s.salary ?? ""),
        s.status ?? "",
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    a.download = "staff_directory.csv";
    a.click();
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search by name, emp ID, mobile…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            data-ocid="staff.search.input"
          />
        </div>
        <Select
          value={filterDesignation}
          onValueChange={(v) => {
            setFilterDesignation(v as FilterDesignation);
            setPage(1);
          }}
        >
          <SelectTrigger
            className="w-36"
            data-ocid="staff.designation-filter.select"
          >
            <SelectValue placeholder="Designation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Designations</SelectItem>
            {DESIGNATIONS.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterDepartment}
          onValueChange={(v) => {
            setFilterDepartment(v as FilterDepartment);
            setPage(1);
          }}
        >
          <SelectTrigger
            className="w-36"
            data-ocid="staff.department-filter.select"
          >
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Departments</SelectItem>
            {DEPARTMENTS.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={() => void loadStaff()}
          aria-label="Refresh"
          data-ocid="staff.refresh.button"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={exportCSV}
          data-ocid="staff.export.button"
        >
          <Download className="w-4 h-4 mr-1.5" /> Export
        </Button>
        {canWrite && (
          <Button size="sm" onClick={openAdd} data-ocid="staff.add.button">
            <Plus className="w-4 h-4 mr-1.5" /> Add Staff
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-3 flex-wrap">
        <Badge variant="secondary">{filtered.length} shown</Badge>
        <Badge variant="secondary">
          {staff.filter((s) => s.status === "active").length} active
        </Badge>
        <Badge variant="outline" className="text-muted-foreground">
          {total} total
        </Badge>
      </div>

      {/* Table */}
      {loading ? (
        <div
          className="flex items-center justify-center py-20"
          data-ocid="staff.loading_state"
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card
          className="p-12 text-center border-dashed"
          data-ocid="staff.empty_state"
        >
          <UserCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-semibold text-foreground">No staff found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {staff.length === 0
              ? "Add your first staff member to get started"
              : "Try adjusting the search or filters"}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 sticky top-0">
                <tr>
                  <th className="text-left p-3 font-semibold text-muted-foreground">
                    #
                  </th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">
                    Name
                  </th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">
                    Emp ID
                  </th>
                  <th className="text-left p-3 font-semibold text-muted-foreground hidden md:table-cell">
                    Designation
                  </th>
                  <th className="text-left p-3 font-semibold text-muted-foreground hidden lg:table-cell">
                    Department
                  </th>
                  <th className="text-left p-3 font-semibold text-muted-foreground hidden sm:table-cell">
                    Mobile
                  </th>
                  <th className="text-right p-3 font-semibold text-muted-foreground hidden md:table-cell">
                    Salary (₹)
                  </th>
                  <th className="text-center p-3 font-semibold text-muted-foreground">
                    Status
                  </th>
                  {canWrite && (
                    <th className="text-center p-3 font-semibold text-muted-foreground">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {paginated.map((s, idx) => (
                  <tr
                    key={s.id}
                    className="border-t border-border hover:bg-muted/30 transition-colors"
                    data-ocid={`staff.item.${idx + 1}`}
                  >
                    <td className="p-3 text-muted-foreground font-mono text-xs">
                      {(page - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-xs">
                          {s.name.charAt(0)}
                        </div>
                        <span className="font-medium text-foreground truncate max-w-[140px]">
                          {s.name}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground font-mono text-xs">
                      {s.empId}
                    </td>
                    <td className="p-3 text-muted-foreground hidden md:table-cell">
                      {s.designation}
                    </td>
                    <td className="p-3 text-muted-foreground hidden lg:table-cell">
                      {((s as Record<string, unknown>).department as string) ??
                        "—"}
                    </td>
                    <td className="p-3 text-muted-foreground hidden sm:table-cell">
                      {s.mobile || "—"}
                    </td>
                    <td className="p-3 text-right text-foreground font-mono hidden md:table-cell">
                      {s.salary
                        ? `₹${Number(s.salary).toLocaleString("en-IN")}`
                        : "—"}
                    </td>
                    <td className="p-3 text-center">
                      <Badge
                        variant={
                          s.status === "active" ? "default" : "secondary"
                        }
                        className="text-xs capitalize"
                      >
                        {s.status ?? "active"}
                      </Badge>
                    </td>
                    {canWrite && (
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => openEdit(s)}
                            data-ocid={`staff.edit_button.${idx + 1}`}
                            aria-label="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            disabled={deletingId === s.id}
                            onClick={() => void handleDelete(s.id)}
                            data-ocid={`staff.delete_button.${idx + 1}`}
                            aria-label="Delete"
                          >
                            {deletingId === s.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border p-3">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages} · {filtered.length} staff
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  data-ocid="staff.pagination_prev"
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  data-ocid="staff.pagination_next"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          data-ocid="staff.dialog"
        >
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-display font-semibold text-foreground text-lg">
                {editingId ? "Edit Staff Member" : "Add New Staff"}
              </h2>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowModal(false)}
                data-ocid="staff.close_button"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Full Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="Full name"
                  data-ocid="staff.name.input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Employee ID *</Label>
                <Input
                  value={form.empId}
                  onChange={(e) => setField("empId", e.target.value)}
                  placeholder="e.g. EMP001"
                  data-ocid="staff.emp-id.input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Designation</Label>
                <Select
                  value={form.designation}
                  onValueChange={(v) => setField("designation", v)}
                >
                  <SelectTrigger data-ocid="staff.designation.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DESIGNATIONS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Department</Label>
                <Select
                  value={form.department}
                  onValueChange={(v) => setField("department", v)}
                >
                  <SelectTrigger data-ocid="staff.department.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Mobile</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={form.mobile}
                  onChange={(e) => setField("mobile", e.target.value)}
                  placeholder="10-digit mobile"
                  data-ocid="staff.mobile.input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="email@school.com"
                  data-ocid="staff.email.input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Monthly Salary (₹)</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={form.salary}
                  onChange={(e) =>
                    setField("salary", e.target.value.replace(/[^0-9.]/g, ""))
                  }
                  placeholder="e.g. 25000"
                  data-ocid="staff.salary.input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Joining Date</Label>
                <Input
                  type="date"
                  value={form.joiningDate}
                  onChange={(e) => setField("joiningDate", e.target.value)}
                  data-ocid="staff.joining-date.input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Gender</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => setField("gender", v)}
                >
                  <SelectTrigger data-ocid="staff.gender.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Qualification</Label>
                <Input
                  value={form.qualification}
                  onChange={(e) => setField("qualification", e.target.value)}
                  placeholder="e.g. B.Ed, M.Sc"
                  data-ocid="staff.qualification.input"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setField("address", e.target.value)}
                  placeholder="Full address"
                  data-ocid="staff.address.input"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setField("status", v)}
                >
                  <SelectTrigger data-ocid="staff.status.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                data-ocid="staff.cancel_button"
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleSave()}
                disabled={saving}
                data-ocid="staff.submit_button"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…
                  </>
                ) : editingId ? (
                  "Update Staff"
                ) : (
                  "Add Staff"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
