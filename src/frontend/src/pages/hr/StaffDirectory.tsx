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
  Download,
  Edit2,
  Eye,
  Plus,
  Search,
  Trash2,
  Upload,
  UserCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import type { Staff } from "../../types";
import { dataService } from "../../utils/dataService";
import { generateId, ls } from "../../utils/localStorage";
import StaffForm from "./StaffForm";

interface Props {
  onNavigate?: (page: string) => void;
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
      {name.charAt(0).toUpperCase()}
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
  "Clerk",
  "Peon",
  "Other",
];

/** Read staff from localStorage — always fresh from storage */
function loadStaff(): Staff[] {
  return ls.get<Staff[]>("staff", []);
}

export default function StaffDirectory({ onNavigate: _onNavigate }: Props) {
  const [staff, setStaff] = useState<Staff[]>(loadStaff);
  const [search, setSearch] = useState("");
  const [filterDesignation, setFilterDesignation] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editStaff, setEditStaff] = useState<Staff | undefined>(undefined);
  const [viewStaff, setViewStaff] = useState<Staff | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = staff.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      s.name.toLowerCase().includes(q) ||
      s.empId.toLowerCase().includes(q) ||
      s.designation.toLowerCase().includes(q) ||
      (s.department ?? "").toLowerCase().includes(q) ||
      s.mobile.includes(search);
    const matchDesignation =
      filterDesignation === "All" || s.designation === filterDesignation;
    return matchSearch && matchDesignation;
  });

  function handleSave(s: Staff) {
    setStaff((prev) => {
      const idx = prev.findIndex((x) => x.id === s.id);
      const updated =
        idx >= 0 ? prev.map((x) => (x.id === s.id ? s : x)) : [...prev, s];
      ls.set("staff", updated);
      return updated;
    });
    // Sync to server via DataService
    void dataService.save("staff", s as unknown as Record<string, unknown>);
    setShowForm(false);
    setEditStaff(undefined);
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this staff member?")) return;
    setStaff((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      ls.set("staff", updated);
      return updated;
    });
    // Sync delete to server
    void dataService.delete("staff", id);
    setViewStaff(null);
  }

  function handleEdit(s: Staff) {
    setEditStaff({ ...s }); // clone to avoid reference mutation
    setViewStaff(null);
    setShowForm(true);
  }

  function handleAddNew() {
    setEditStaff(undefined);
    setShowForm(true);
  }

  function handleExport() {
    const headers = [
      "EmpID",
      "Name",
      "Designation",
      "Department",
      "Mobile",
      "DOB",
      "Email",
      "Address",
      "Qualification",
      "Joining Date",
      "Salary",
      "Status",
      "Subjects",
    ];
    const rows = staff.map((s) => [
      s.empId,
      s.name,
      s.designation,
      s.department ?? "",
      s.mobile,
      s.dob,
      s.email ?? "",
      (s.address ?? "").replace(/,/g, " "),
      s.qualification ?? "",
      s.joiningDate ?? "",
      s.salary ?? "",
      s.status ?? "active",
      (s.subjects ?? [])
        .map((x) => `${x.subject}:${x.classFrom}-${x.classTo}`)
        .join("; "),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "staff_export.csv";
    a.click();
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text
          .split("\n")
          .slice(1) // skip header row
          .filter((l) => l.trim());

        const imported: Staff[] = lines.map((line) => {
          // Handle quoted CSV properly
          const cols = line
            .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
            .map((c) => c.replace(/^"|"$/g, "").trim());

          const [
            empIdRaw,
            name,
            designation,
            department,
            mobile,
            dob,
            email,
            address,
            qualification,
            joiningDate,
            salaryRaw,
            status,
            subjectsRaw,
          ] = cols;

          const dobStr = dob ?? "";
          // Parse dob for password generation (ddmmyyyy)
          let password = mobile?.trim() ?? "";
          if (dobStr) {
            if (dobStr.includes("/")) {
              const [d, m, y] = dobStr.split("/");
              if (d && m && y)
                password = `${d.padStart(2, "0")}${m.padStart(2, "0")}${y}`;
            } else if (dobStr.includes("-") && dobStr.length === 10) {
              const [y, m, d] = dobStr.split("-");
              if (d && m && y)
                password = `${d.padStart(2, "0")}${m.padStart(2, "0")}${y}`;
            }
          }

          const subjects = (subjectsRaw ?? "")
            .split(";")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => {
              const [subj, range] = s.split(":");
              const [from, to] = (range ?? "").split("-");
              return {
                subject: subj?.trim() ?? "",
                classFrom: from?.trim() ?? "1",
                classTo: to?.trim() ?? "10",
              };
            })
            .filter((s) => s.subject);

          return {
            id: generateId(),
            empId: empIdRaw?.trim() || `EMP${generateId()}`,
            name: name?.trim() ?? "",
            designation: designation?.trim() || "Other",
            department: department?.trim() || undefined,
            mobile: mobile?.trim() ?? "",
            dob: dobStr,
            email: email?.trim() || undefined,
            address: address?.trim() || undefined,
            qualification: qualification?.trim() || undefined,
            joiningDate: joiningDate?.trim() || undefined,
            salary: salaryRaw ? Number(salaryRaw) : undefined,
            status: (status?.trim() === "inactive" ? "inactive" : "active") as
              | "active"
              | "inactive",
            subjects,
            credentials: { username: mobile?.trim() ?? "", password },
          };
        });

        if (imported.length === 0) {
          alert("No valid staff records found in the CSV.");
          return;
        }

        setStaff((prev) => {
          const updated = [...prev, ...imported];
          ls.set("staff", updated);
          // Sync all imported staff to server
          for (const s of imported) {
            void dataService.save(
              "staff",
              s as unknown as Record<string, unknown>,
            );
          }
          return updated;
        });

        alert(`Successfully imported ${imported.length} staff member(s).`);
      } catch (err) {
        alert("Failed to parse CSV. Please check the file format.");
        console.error(err);
      }
    };
    reader.readAsText(file);
    // Reset so same file can be re-imported if needed
    e.target.value = "";
  }

  // ── FORM VIEW ──────────────────────────────────────────
  if (showForm) {
    return (
      <StaffForm
        initial={editStaff}
        onSave={handleSave}
        onCancel={() => {
          setShowForm(false);
          setEditStaff(undefined);
        }}
      />
    );
  }

  // ── DETAIL VIEW ────────────────────────────────────────
  if (viewStaff) {
    // Always re-read from current state in case of stale ref
    const current = staff.find((s) => s.id === viewStaff.id) ?? viewStaff;
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
                {current.name.charAt(0)}
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {current.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="default" className="text-xs">
                  {current.designation}
                </Badge>
                <StatusBadge status={current.status} />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {current.department}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            {(
              [
                ["Emp ID", current.empId],
                ["Mobile", current.mobile],
                ["Email", current.email],
                ["Date of Birth", current.dob],
                ["Joining Date", current.joiningDate],
                ["Qualification", current.qualification],
                [
                  "Net Salary",
                  current.salary
                    ? `₹${current.salary.toLocaleString("en-IN")}`
                    : null,
                ],
                ["Address", current.address],
              ] as [string, string | undefined | null][]
            ).map(([label, value]) =>
              value ? (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-medium text-foreground">{value}</p>
                </div>
              ) : null,
            )}
          </div>

          {(current.subjects ?? []).length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Subject Assignments
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(current.subjects ?? []).map((s) => (
                  <Badge
                    key={`${s.subject}-${s.classFrom}-${s.classTo}`}
                    variant="secondary"
                    className="text-xs"
                  >
                    {s.subject}: Class {s.classFrom}–{s.classTo}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="border border-border rounded-lg p-3 bg-muted/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Login Credentials
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Username:</span>{" "}
              <span className="font-mono font-medium">
                {current.credentials?.username ?? current.mobile}
              </span>
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Password:</span>{" "}
              <span className="font-mono font-medium">
                {current.credentials?.password ?? "—"}
              </span>
            </p>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={() => handleEdit(current)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleDelete(current.id)}
            >
              Delete
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ── LIST VIEW ──────────────────────────────────────────
  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              data-ocid="staff-search"
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
              className="w-44"
              data-ocid="staff-filter-designation"
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
        </div>
        <div className="flex gap-2 flex-wrap">
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
            data-ocid="staff-import"
          >
            <Upload className="w-4 h-4 mr-1.5" /> Import CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            data-ocid="staff-export"
          >
            <Download className="w-4 h-4 mr-1.5" /> Export CSV
          </Button>
          <Button size="sm" data-ocid="staff-add" onClick={handleAddNew}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Staff
          </Button>
        </div>
      </div>

      {/* Stats */}
      {staff.length > 0 && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{staff.length} total</span>
          <span className="text-accent">
            {staff.filter((s) => s.designation === "Teacher").length} teachers
          </span>
          <span className="text-destructive">
            {staff.filter((s) => s.status === "inactive").length} inactive
          </span>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center" data-ocid="staff-empty">
          <UserCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground font-medium">
            {search || filterDesignation !== "All"
              ? "No staff match your search or filter."
              : "No staff yet. Add your first staff member."}
          </p>
          {!search && filterDesignation === "All" && (
            <Button className="mt-4" size="sm" onClick={handleAddNew}>
              <Plus className="w-4 h-4 mr-1.5" /> Add Staff
            </Button>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-8">
                    #
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                    Designation
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">
                    Department
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                    Mobile
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground hidden lg:table-cell">
                    Net Salary
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden lg:table-cell">
                    Subjects
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((s, idx) => (
                  <tr
                    key={s.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    data-ocid={`staff-row-${s.id}`}
                    onDoubleClick={() => setViewStaff(s)}
                    title="Double-click for details"
                  >
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <StaffAvatar photo={s.photo} name={s.name} />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {s.name}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {s.empId}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          s.designation === "Teacher" ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {s.designation}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {s.department ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.mobile}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm hidden lg:table-cell">
                      {s.salary ? `₹${s.salary.toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {(s.subjects ?? []).slice(0, 2).map((sub) => (
                          <Badge
                            key={`${s.id}-${sub.subject}`}
                            variant="outline"
                            className="text-xs"
                          >
                            {sub.subject} ({sub.classFrom}–{sub.classTo})
                          </Badge>
                        ))}
                        {(s.subjects ?? []).length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{(s.subjects ?? []).length - 2}
                          </Badge>
                        )}
                        {(s.subjects ?? []).length === 0 && (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label="View details"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewStaff(s);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label="Edit staff"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(s);
                          }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label="Delete staff"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(s.id);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        CSV columns: EmpID, Name, Designation, Department, Mobile, DOB
        (DD/MM/YYYY), Email, Address, Qualification, Joining Date, Salary,
        Status (active/inactive), Subjects (Subject:ClassFrom-ClassTo;
        separated) — double-click a row for full details.
      </p>
    </div>
  );
}
