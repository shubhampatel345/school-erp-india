/**
 * SHUBH SCHOOL ERP — User Management (standalone page)
 * Direct API via apiCall(). Super Admin only.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldOff,
  UserCheck,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { apiCall } from "../utils/api";

interface UserRecord {
  id: string;
  username: string;
  name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  role: string;
  isActive?: boolean;
  is_active?: number | boolean;
}

type ModalMode = "add" | "edit" | "reset" | null;

interface FormData {
  username: string;
  password: string;
  full_name: string;
  email: string;
  mobile: string;
  role: string;
}

const EMPTY_FORM: FormData = {
  username: "",
  password: "",
  full_name: "",
  email: "",
  mobile: "",
  role: "teacher",
};

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "teacher", label: "Teacher" },
  { value: "accountant", label: "Accountant" },
  { value: "receptionist", label: "Receptionist" },
  { value: "librarian", label: "Librarian" },
  { value: "driver", label: "Driver" },
  { value: "parent", label: "Parent" },
  { value: "student", label: "Student" },
];

const ROLE_STYLE: Record<string, string> = {
  superadmin: "bg-primary/10 text-primary",
  super_admin: "bg-primary/10 text-primary",
  admin: "bg-blue-500/10 text-blue-600",
  teacher: "bg-green-500/10 text-green-600",
  accountant: "bg-amber-500/10 text-amber-600",
  parent: "bg-purple-500/10 text-purple-600",
  student: "bg-cyan-500/10 text-cyan-600",
  driver: "bg-orange-500/10 text-orange-600",
  receptionist: "bg-pink-500/10 text-pink-600",
  librarian: "bg-indigo-500/10 text-indigo-600",
};

function isActive(u: UserRecord): boolean {
  if (u.isActive !== undefined) return Boolean(u.isActive);
  if (u.is_active !== undefined)
    return u.is_active !== 0 && u.is_active !== false;
  return true;
}

function displayName(u: UserRecord): string {
  return u.full_name ?? u.name ?? u.username;
}

export default function UserManagement() {
  const { currentUser } = useApp();
  const isSuperAdmin = currentUser?.role === "superadmin";

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<UserRecord | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [newPw, setNewPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall<UserRecord[] | { data?: UserRecord[] }>(
        "users/list",
      );
      const rows: UserRecord[] = Array.isArray(res)
        ? res
        : Array.isArray((res as { data?: UserRecord[] }).data)
          ? (res as { data?: UserRecord[] }).data!
          : [];
      setUsers(
        rows.filter((u) => u.role !== "superadmin" && u.role !== "super_admin"),
      );
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = users.filter(
    (u) =>
      displayName(u).toLowerCase().includes(search.toLowerCase()) ||
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.role?.toLowerCase().includes(search.toLowerCase()),
  );

  const openAdd = () => {
    setSelected(null);
    setForm(EMPTY_FORM);
    setError("");
    setModal("add");
  };

  const openEdit = (u: UserRecord) => {
    setSelected(u);
    setForm({
      username: u.username,
      password: "",
      full_name: displayName(u),
      email: u.email ?? "",
      mobile: u.mobile ?? u.phone ?? "",
      role: u.role,
    });
    setError("");
    setModal("edit");
  };

  const openReset = (u: UserRecord) => {
    setSelected(u);
    setNewPw("");
    setError("");
    setModal("reset");
  };

  const handleSave = async () => {
    if (!form.username || !form.full_name || !form.role) {
      setError("Username, full name, and role are required");
      return;
    }
    if (modal === "add" && !form.password) {
      setError("Password is required for new users");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (modal === "add") {
        await apiCall("users/add", "POST", {
          username: form.username,
          password: form.password,
          full_name: form.full_name,
          email: form.email,
          mobile: form.mobile,
          role: form.role,
        });
        toast.success(`User "${form.full_name}" created`);
      } else if (modal === "edit" && selected) {
        await apiCall("users/update", "POST", {
          id: selected.id,
          username: form.username,
          full_name: form.full_name,
          email: form.email,
          mobile: form.mobile,
          role: form.role,
          ...(form.password ? { password: form.password } : {}),
        });
        toast.success(`User "${form.full_name}" updated`);
      }
      setModal(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!newPw || newPw.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      await apiCall("users/reset-password", "POST", {
        id: selected.id,
        username: selected.username,
        new_password: newPw,
      });
      toast.success(`Password reset for "${displayName(selected)}"`);
      setModal(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (u: UserRecord) => {
    const nowActive = isActive(u);
    try {
      await apiCall("users/update", "POST", {
        id: u.id,
        is_active: nowActive ? 0 : 1,
      });
      setUsers((prev) =>
        prev.map((x) =>
          x.id === u.id
            ? { ...x, isActive: !nowActive, is_active: nowActive ? 0 : 1 }
            : x,
        ),
      );
      toast.success(
        `${displayName(u)} ${nowActive ? "deactivated" : "activated"}`,
      );
    } catch {
      toast.error("Failed to update user status");
    }
  };

  if (!isSuperAdmin) {
    return (
      <div
        className="p-6 text-center text-muted-foreground"
        data-ocid="usermgmt.access_denied"
      >
        <ShieldOff className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>Super Admin access required</p>
      </div>
    );
  }

  return (
    <div
      className="p-4 md:p-6 space-y-5 bg-background min-h-screen"
      data-ocid="usermgmt.page"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">
            User Management
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {users.length} users — manage roles, passwords, and access
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            data-ocid="usermgmt.refresh_button"
          >
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={openAdd} data-ocid="usermgmt.add_button">
            <Plus className="w-4 h-4 mr-1" /> Add User
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search by name, username, or role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-ocid="usermgmt.search_input"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3" data-ocid="usermgmt.loading_state">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="text-center py-16 text-muted-foreground"
          data-ocid="usermgmt.empty_state"
        >
          <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No users found</p>
          <Button
            className="mt-4"
            onClick={openAdd}
            data-ocid="usermgmt.empty_add_button"
          >
            Add First User
          </Button>
        </div>
      ) : (
        <div
          className="bg-card border border-border rounded-xl overflow-hidden"
          data-ocid="usermgmt.list"
        >
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {["Name", "Username", "Role", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((u, i) => (
                <tr
                  key={u.id}
                  className="hover:bg-muted/20 transition-colors"
                  data-ocid={`usermgmt.item.${i + 1}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                        {displayName(u)[0]?.toUpperCase() ?? "?"}
                      </div>
                      <span className="font-medium text-foreground truncate">
                        {displayName(u)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    {u.username}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_STYLE[u.role] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isActive(u) ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                        Active
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground text-xs"
                      >
                        Inactive
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => openEdit(u)}
                        data-ocid={`usermgmt.edit_button.${i + 1}`}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => openReset(u)}
                        data-ocid={`usermgmt.reset_pw_button.${i + 1}`}
                      >
                        <KeyRound className="w-3 h-3 mr-1" /> Reset PW
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={`h-7 text-xs ${isActive(u) ? "text-destructive" : "text-emerald-600"}`}
                        onClick={() => void handleToggleActive(u)}
                        data-ocid={`usermgmt.toggle_active_button.${i + 1}`}
                      >
                        {isActive(u) ? (
                          <>
                            <ShieldOff className="w-3 h-3 mr-1" /> Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3 h-3 mr-1" /> Activate
                          </>
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {(modal === "add" || modal === "edit") && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div
            className="bg-card border border-border rounded-2xl shadow-elevated w-full max-w-md animate-slide-up"
            data-ocid="usermgmt.dialog"
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-display font-semibold text-foreground">
                {modal === "add" ? "Add New User" : "Edit User"}
              </h2>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="text-muted-foreground hover:text-foreground transition-colors text-xl w-8 h-8 flex items-center justify-center"
                aria-label="Close"
                data-ocid="usermgmt.close_button"
              >
                ×
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Full Name *
                  </Label>
                  <Input
                    value={form.full_name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, full_name: e.target.value }))
                    }
                    placeholder="User's full name"
                    data-ocid="usermgmt.full_name_input"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Username *
                  </Label>
                  <Input
                    value={form.username}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, username: e.target.value }))
                    }
                    placeholder="login username"
                    data-ocid="usermgmt.username_input"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    {modal === "add"
                      ? "Password *"
                      : "New Password (leave blank to keep)"}
                  </Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, password: e.target.value }))
                    }
                    placeholder={
                      modal === "add" ? "Set password" : "Leave blank to keep"
                    }
                    data-ocid="usermgmt.password_input"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Role *
                  </Label>
                  <select
                    className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                    value={form.role}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, role: e.target.value }))
                    }
                    data-ocid="usermgmt.role_select"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Mobile
                  </Label>
                  <Input
                    value={form.mobile}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, mobile: e.target.value }))
                    }
                    placeholder="10-digit mobile"
                    inputMode="tel"
                    data-ocid="usermgmt.mobile_input"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Email
                  </Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="email@school.com"
                    data-ocid="usermgmt.email_input"
                  />
                </div>
              </div>
              {error && (
                <p
                  className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg"
                  data-ocid="usermgmt.field_error"
                >
                  {error}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setModal(null)}
                  data-ocid="usermgmt.cancel_button"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={saving}
                  onClick={() => void handleSave()}
                  data-ocid="usermgmt.submit_button"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : null}
                  {modal === "add" ? "Create User" : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {modal === "reset" && selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div
            className="bg-card border border-border rounded-2xl shadow-elevated w-full max-w-sm animate-slide-up"
            data-ocid="usermgmt.reset_dialog"
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-display font-semibold text-foreground">
                Reset Password
              </h2>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="text-muted-foreground hover:text-foreground text-xl w-8 h-8 flex items-center justify-center"
                aria-label="Close"
                data-ocid="usermgmt.reset_close_button"
              >
                ×
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Reset password for <strong>{displayName(selected)}</strong> (
                {selected.username})
              </p>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  New Password *
                </Label>
                <Input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Minimum 4 characters"
                  autoFocus
                  data-ocid="usermgmt.new_password_input"
                />
              </div>
              {error && (
                <p
                  className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg"
                  data-ocid="usermgmt.reset_error"
                >
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setModal(null)}
                  data-ocid="usermgmt.reset_cancel_button"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={saving || newPw.length < 4}
                  onClick={() => void handleReset()}
                  data-ocid="usermgmt.reset_confirm_button"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : null}
                  Reset Password
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
