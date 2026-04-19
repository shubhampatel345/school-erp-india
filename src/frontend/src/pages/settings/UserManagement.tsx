import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  Plus,
  Search,
  Shield,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import type { AppUser, UserRole } from "../../types";
import {
  apiCreateRecord,
  apiDeleteRecord,
  apiUpdateRecord,
  getJwt,
} from "../../utils/api";
import { generateId, ls } from "../../utils/localStorage";

// ── Types ──────────────────────────────────────────────────

interface UserFormData {
  fullName: string;
  username: string;
  role: UserRole;
  mobile: string;
  email: string;
  password: string;
}

const BLANK_FORM: UserFormData = {
  fullName: "",
  username: "",
  role: "teacher",
  mobile: "",
  email: "",
  password: "",
};

// ── Role config ────────────────────────────────────────────

const ROLE_OPTIONS: { label: string; value: UserRole }[] = [
  { label: "Admin", value: "admin" },
  { label: "Teacher", value: "teacher" },
  { label: "Receptionist", value: "receptionist" },
  { label: "Accountant", value: "accountant" },
  { label: "Librarian", value: "librarian" },
  { label: "Driver", value: "driver" },
  { label: "Student", value: "student" },
  { label: "Parent", value: "parent" },
];

const ROLE_BADGE: Record<string, string> = {
  superadmin: "bg-primary/10 text-primary border-primary/20",
  admin: "bg-accent/10 text-accent border-accent/20",
  teacher: "bg-blue-100 text-blue-700 border-blue-200",
  student: "bg-green-100 text-green-700 border-green-200",
  parent: "bg-purple-100 text-purple-700 border-purple-200",
  driver: "bg-orange-100 text-orange-700 border-orange-200",
  receptionist: "bg-yellow-100 text-yellow-700 border-yellow-200",
  accountant: "bg-teal-100 text-teal-700 border-teal-200",
  librarian: "bg-pink-100 text-pink-700 border-pink-200",
};

function roleBadge(role: string) {
  return (
    ROLE_BADGE[role.toLowerCase()] ??
    "bg-muted text-muted-foreground border-border"
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Server helpers ─────────────────────────────────────────

async function serverSaveUser(
  user: AppUser & { password?: string },
  isNew: boolean,
) {
  const token = getJwt();
  const payload = user as unknown as Record<string, unknown>;
  try {
    if (isNew) {
      await apiCreateRecord("users", payload, token);
    } else {
      await apiUpdateRecord("users", user.id, payload, token);
    }
  } catch {
    // server unavailable — local only is fine
  }
}

async function serverDeleteUser(id: string) {
  const token = getJwt();
  try {
    await apiDeleteRecord("users", id, token);
  } catch {
    // server unavailable
  }
}

// ── Component ──────────────────────────────────────────────

export default function UserManagement() {
  const { currentUser, changePassword, hasPermission } = useApp();

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  // Add/Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormData>(BLANK_FORM);
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Reset password modal
  const [resetTarget, setResetTarget] = useState<{
    id: string;
    name: string;
    username: string;
  } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Visible password
  const [visiblePasswords, setVisiblePasswords] = useState<
    Record<string, boolean>
  >({});

  // ── Load users ────────────────────────────────────────────

  function getAllUsers(): (AppUser & { email?: string; status?: string })[] {
    const customUsers = ls.get<(AppUser & { email?: string })[]>(
      "custom_users",
      [],
    );
    const rows: (AppUser & { email?: string; status?: string })[] = [
      {
        id: "su1",
        username: "superadmin",
        role: "superadmin",
        name: "Super Admin",
        status: "active",
      },
    ];
    for (const u of customUsers) {
      rows.push({ ...u, status: "active" });
    }
    return rows;
  }

  function getStoredPassword(username: string): string {
    const passwords = ls.get<Record<string, string>>("user_passwords", {});
    return passwords[username] ?? "—";
  }

  const allUsers = getAllUsers();

  // ── Permission guard (after all hooks) ────────────────────
  const canAccess =
    hasPermission("userManagement", "canView") ||
    currentUser?.role === "superadmin";
  const roles = Array.from(new Set(allUsers.map((u) => u.role)));

  const filtered = useMemo(() => {
    return allUsers.filter((u) => {
      const q = search.toLowerCase();
      const matchSearch =
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.mobile?.includes(q) ?? false) ||
        (u.email?.toLowerCase().includes(q) ?? false);
      const matchRole = filterRole === "all" || u.role === filterRole;
      return matchSearch && matchRole;
    });
  }, [allUsers, search, filterRole]);

  // ── Stats ──────────────────────────────────────────────────

  const totalUsers = allUsers.length;
  const staffCount = allUsers.filter(
    (u) => !["student", "parent"].includes(u.role),
  ).length;
  const studentCount = allUsers.filter((u) => u.role === "student").length;

  // ── Open add/edit modal ────────────────────────────────────

  function openAdd() {
    setEditingId(null);
    setForm(BLANK_FORM);
    setFormError("");
    setShowPw(false);
    setModalOpen(true);
  }

  function openEdit(u: AppUser & { email?: string }) {
    setEditingId(u.id);
    setForm({
      fullName: u.name,
      username: u.username,
      role: u.role,
      mobile: u.mobile ?? "",
      email: u.email ?? "",
      password: "",
    });
    setFormError("");
    setShowPw(false);
    setModalOpen(true);
  }

  // ── Save user ──────────────────────────────────────────────

  async function handleSave() {
    setFormError("");
    if (!form.fullName.trim()) {
      setFormError("Full name is required.");
      return;
    }
    if (!form.username.trim()) {
      setFormError("Username is required.");
      return;
    }
    if (!editingId && !form.password.trim()) {
      setFormError("Password is required for new user.");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        // Update
        const customUsers = ls.get<AppUser[]>("custom_users", []);
        const idx = customUsers.findIndex((u) => u.id === editingId);
        if (idx !== -1) {
          const updated: AppUser = {
            ...customUsers[idx],
            name: form.fullName.trim(),
            username: form.username.trim(),
            role: form.role,
            mobile: form.mobile.trim() || undefined,
          };
          customUsers[idx] = updated;
          ls.set("custom_users", customUsers);
          if (form.password.trim()) {
            const passwords = ls.get<Record<string, string>>(
              "user_passwords",
              {},
            );
            passwords[form.username.trim()] = form.password.trim();
            ls.set("user_passwords", passwords);
          }
          await serverSaveUser(updated, false);
        }
      } else {
        // Create
        const user: AppUser = {
          id: generateId(),
          username: form.username.trim(),
          role: form.role,
          name: form.fullName.trim(),
          mobile: form.mobile.trim() || undefined,
        };
        // For parent role: use mobile as username if not explicitly set
        if (form.role === "parent" && !form.username.trim()) {
          user.username = form.mobile.trim();
        }
        const customUsers = ls.get<AppUser[]>("custom_users", []);
        customUsers.push(user);
        ls.set("custom_users", customUsers);

        const passwords = ls.get<Record<string, string>>("user_passwords", {});
        passwords[user.username] = form.password.trim();
        // For parent: also allow mobile as password (default)
        if (form.role === "parent") {
          passwords[form.mobile.trim()] = form.mobile.trim();
        }
        ls.set("user_passwords", passwords);
        await serverSaveUser(user, true);
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  // ── Reset password ─────────────────────────────────────────

  function handleResetPassword() {
    if (!resetTarget || !newPassword.trim()) return;
    const passwords = ls.get<Record<string, string>>("user_passwords", {});
    passwords[resetTarget.username] = newPassword.trim();
    ls.set("user_passwords", passwords);
    changePassword(resetTarget.id, newPassword.trim());
    setResetTarget(null);
    setNewPassword("");
  }

  // ── Delete user ────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    const customUsers = ls.get<AppUser[]>("custom_users", []);
    ls.set(
      "custom_users",
      customUsers.filter((u) => u.id !== deleteTarget.id),
    );
    await serverDeleteUser(deleteTarget.id);
    setDeleteTarget(null);
  }

  // ── Render ─────────────────────────────────────────────────

  if (!canAccess) {
    return (
      <div className="p-10 text-center">
        <Shield className="w-14 h-14 mx-auto mb-4 text-muted-foreground/30" />
        <p className="font-medium text-muted-foreground">
          Super Admin access required.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Users className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold font-display text-foreground">
            {totalUsers}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Total Users</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold font-display text-primary">
            {staffCount}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Staff / Admin</p>
        </Card>
        <Card className="p-4 text-center">
          <p
            className="text-2xl font-bold font-display"
            style={{ color: "oklch(0.55 0.18 145)" }}
          >
            {studentCount}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Students</p>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-wrap flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              data-ocid="user_management.search_input"
              placeholder="Search name, username, mobile…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger
              className="w-40"
              data-ocid="user_management.role_filter"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r} value={r}>
                  {capitalize(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button data-ocid="user_management.open_modal_button" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1.5" /> Add User
        </Button>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                  Name
                </th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                  Username
                </th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">
                  Mobile
                </th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                  Role
                </th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">
                  Password
                </th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((u, i) => (
                <tr
                  key={u.id}
                  data-ocid={`user_management.item.${i + 1}`}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium truncate max-w-[120px]">
                        {u.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {u.username}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                    {u.mobile ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={`text-xs border ${roleBadge(u.role)}`}
                      variant="outline"
                    >
                      {capitalize(u.role)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-muted-foreground">
                        {visiblePasswords[u.id]
                          ? getStoredPassword(u.username)
                          : "••••••••"}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setVisiblePasswords((p) => ({
                            ...p,
                            [u.id]: !p[u.id],
                          }))
                        }
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={
                          visiblePasswords[u.id]
                            ? "Hide password"
                            : "Show password"
                        }
                      >
                        {visiblePasswords[u.id] ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      {u.role !== "superadmin" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          data-ocid={`user_management.edit_button.${i + 1}`}
                          onClick={() => openEdit(u)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        data-ocid={`user_management.reset_password.${i + 1}`}
                        onClick={() => {
                          setResetTarget({
                            id: u.id,
                            name: u.name,
                            username: u.username,
                          });
                          setNewPassword("");
                          setShowNewPw(false);
                        }}
                      >
                        <KeyRound className="w-3.5 h-3.5 mr-1" /> Reset
                      </Button>
                      {u.role !== "superadmin" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          data-ocid={`user_management.delete_button.${i + 1}`}
                          onClick={() =>
                            setDeleteTarget({ id: u.id, name: u.name })
                          }
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    data-ocid="user_management.empty_state"
                    className="px-4 py-12 text-center text-muted-foreground text-sm"
                  >
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    No users found{search ? ` for "${search}"` : ""}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent data-ocid="user_management.dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5" />
              {editingId ? "Edit User" : "Add New User"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="um-fullname">Full Name *</Label>
                <Input
                  id="um-fullname"
                  data-ocid="user_management.fullname.input"
                  value={form.fullName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fullName: e.target.value }))
                  }
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="um-username">Username *</Label>
                <Input
                  id="um-username"
                  data-ocid="user_management.username.input"
                  value={form.username}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, username: e.target.value }))
                  }
                  placeholder="Login username"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => {
                    const role = v as UserRole;
                    setForm((f) => ({
                      ...f,
                      role,
                      // For parent: auto-fill username from mobile
                      username:
                        role === "parent" && f.mobile ? f.mobile : f.username,
                    }));
                  }}
                >
                  <SelectTrigger data-ocid="user_management.role.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="um-mobile">Mobile</Label>
                <Input
                  id="um-mobile"
                  data-ocid="user_management.mobile.input"
                  value={form.mobile}
                  onChange={(e) => {
                    const mobile = e.target.value;
                    setForm((f) => ({
                      ...f,
                      mobile,
                      // For parent: mobile is both username and password
                      username: f.role === "parent" ? mobile : f.username,
                      password: f.role === "parent" ? mobile : f.password,
                    }));
                  }}
                  placeholder="10-digit mobile"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="um-email">Email</Label>
                <Input
                  id="um-email"
                  data-ocid="user_management.email.input"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="Email address"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="um-password">
                  {editingId
                    ? "New Password (leave blank to keep)"
                    : "Password *"}
                </Label>
                <div className="relative">
                  <Input
                    id="um-password"
                    data-ocid="user_management.password.input"
                    type={showPw ? "text" : "password"}
                    value={form.password}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, password: e.target.value }))
                    }
                    placeholder={
                      editingId
                        ? "Leave blank to keep current"
                        : "Set login password"
                    }
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPw ? "Hide" : "Show"}
                  >
                    {showPw ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {form.role === "parent" && (
              <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                Parent login: Username = Mobile Number, Password = Mobile Number
                (auto-set)
              </p>
            )}

            {formError && (
              <p
                data-ocid="user_management.error_state"
                className="text-sm text-destructive"
              >
                {formError}
              </p>
            )}

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                data-ocid="user_management.cancel_button"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                data-ocid="user_management.save_button"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving…" : editingId ? "Save Changes" : "Add User"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={() => setResetTarget(null)}>
        <DialogContent data-ocid="user_management.reset_dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              Reset Password — {resetTarget?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground">
              Username:{" "}
              <span className="font-mono font-medium text-foreground">
                {resetTarget?.username}
              </span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reset-pw">New Password</Label>
              <div className="relative">
                <Input
                  id="reset-pw"
                  data-ocid="user_management.new_password.input"
                  type={showNewPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showNewPw ? "Hide" : "Show"}
                >
                  {showNewPw ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                data-ocid="user_management.reset_cancel_button"
                onClick={() => setResetTarget(null)}
              >
                Cancel
              </Button>
              <Button
                data-ocid="user_management.reset_confirm_button"
                onClick={handleResetPassword}
                disabled={!newPassword.trim()}
              >
                Reset Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent data-ocid="user_management.delete_dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <strong className="text-foreground">{deleteTarget?.name}</strong>?
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                data-ocid="user_management.delete_cancel_button"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                data-ocid="user_management.delete_confirm_button"
                onClick={handleDelete}
              >
                Delete User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
