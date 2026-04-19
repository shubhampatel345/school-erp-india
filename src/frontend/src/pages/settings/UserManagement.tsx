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
  Loader2,
  Pencil,
  Plus,
  Search,
  Shield,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type { AppUser, UserRole } from "../../types";
import {
  apiCreateRecord,
  apiDeleteRecord,
  apiUpdateRecord,
  getJwt,
} from "../../utils/api";
import { generateId, ls } from "../../utils/localStorage";

interface UserFormData {
  fullName: string;
  username: string;
  role: UserRole;
  mobile: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const EMPTY_FORM: UserFormData = {
  fullName: "",
  username: "",
  role: "teacher",
  mobile: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const ROLE_OPTIONS: { value: UserRole; label: string; color: string }[] = [
  { value: "admin", label: "Admin", color: "bg-purple-100 text-purple-700" },
  { value: "teacher", label: "Teacher", color: "bg-blue-100 text-blue-700" },
  {
    value: "receptionist",
    label: "Receptionist",
    color: "bg-teal-100 text-teal-700",
  },
  {
    value: "accountant",
    label: "Accountant",
    color: "bg-amber-100 text-amber-700",
  },
  {
    value: "librarian",
    label: "Librarian",
    color: "bg-green-100 text-green-700",
  },
  { value: "driver", label: "Driver", color: "bg-orange-100 text-orange-700" },
  { value: "parent", label: "Parent", color: "bg-pink-100 text-pink-700" },
  { value: "student", label: "Student", color: "bg-sky-100 text-sky-700" },
];

function getRoleColor(role: UserRole): string {
  return (
    ROLE_OPTIONS.find((r) => r.value === role)?.color ??
    "bg-muted text-muted-foreground"
  );
}

interface StoredUser extends AppUser {
  password?: string;
  isActive?: boolean;
  lastLogin?: string;
}

export default function UserManagement() {
  const { currentUser, changePassword } = useApp();

  const [users, setUsers] = useState<StoredUser[]>(() =>
    ls.get<StoredUser[]>("custom_users", []),
  );
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<StoredUser | null>(null);
  const [form, setForm] = useState<UserFormData>({ ...EMPTY_FORM });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StoredUser | null>(null);
  const [resetUser, setResetUser] = useState<StoredUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const jwt = getJwt();

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q),
    );
  }, [users, search]);

  function persistUsers(updated: StoredUser[]) {
    ls.set("custom_users", updated);
    setUsers(updated);
  }

  function openAdd() {
    setEditUser(null);
    setForm({ ...EMPTY_FORM });
    setShowPw(false);
    setShowForm(true);
  }

  function openEdit(user: StoredUser) {
    setEditUser(user);
    setForm({
      fullName: user.fullName ?? user.name ?? "",
      username: user.username,
      role: user.role,
      mobile: user.mobile ?? "",
      email: user.email ?? "",
      password: "",
      confirmPassword: "",
    });
    setShowPw(false);
    setShowForm(true);
  }

  async function handleSave() {
    const {
      fullName,
      username,
      role,
      mobile,
      email,
      password,
      confirmPassword,
    } = form;
    if (!fullName.trim()) {
      toast.error("Full name is required.");
      return;
    }
    if (!username.trim()) {
      toast.error("Username is required.");
      return;
    }
    if (username.match(/^\d+$/)) {
      toast.error("Username cannot be a mobile number.");
      return;
    }
    if (!editUser && !password) {
      toast.error("Password is required for new users.");
      return;
    }
    if (password && password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (!editUser && users.some((u) => u.username === username)) {
      toast.error("Username already exists.");
      return;
    }

    setSaving(true);
    try {
      if (editUser) {
        const updated: StoredUser = {
          ...editUser,
          fullName,
          name: fullName,
          username,
          role,
          mobile,
          email,
        };
        const updatedList = users.map((u) =>
          u.id === editUser.id ? updated : u,
        );
        persistUsers(updatedList);

        // Server update
        if (jwt) {
          await apiUpdateRecord(
            "users",
            editUser.id,
            {
              fullName,
              username,
              role,
              mobile,
              email,
            } as Record<string, unknown>,
            jwt,
          ).catch(() => {});
        }

        if (password) {
          changePassword(editUser.id, password);
          const passwords = ls.get<Record<string, string>>(
            "user_passwords",
            {},
          );
          passwords[username] = password;
          ls.set("user_passwords", passwords);
        }
        toast.success("User updated.");
      } else {
        const id = generateId();
        const newUser: StoredUser = {
          id,
          username,
          role,
          fullName,
          name: fullName,
          mobile,
          email,
          isActive: true,
        };
        persistUsers([...users, newUser]);
        const passwords = ls.get<Record<string, string>>("user_passwords", {});
        passwords[username] = password;
        ls.set("user_passwords", passwords);

        // Server create
        if (jwt) {
          await apiCreateRecord(
            "users",
            {
              id,
              fullName,
              username,
              role,
              mobile,
              email,
              password,
            } as Record<string, unknown>,
            jwt,
          ).catch(() => {});
        }
        toast.success("User created.");
      }
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save user.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const updated = users.filter((u) => u.id !== deleteTarget.id);
      persistUsers(updated);
      const passwords = ls.get<Record<string, string>>("user_passwords", {});
      delete passwords[deleteTarget.username];
      ls.set("user_passwords", passwords);
      if (jwt) {
        await apiDeleteRecord("users", deleteTarget.id, jwt).catch(() => {});
      }
      toast.success("User deleted.");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete user.",
      );
    }
  }

  async function handleResetPassword() {
    if (!resetUser || !newPassword.trim()) {
      toast.error("Enter a new password.");
      return;
    }
    setResetting(true);
    try {
      changePassword(resetUser.id, newPassword);
      const passwords = ls.get<Record<string, string>>("user_passwords", {});
      passwords[resetUser.username] = newPassword;
      ls.set("user_passwords", passwords);
      if (jwt) {
        await apiUpdateRecord(
          "users",
          resetUser.id,
          { password: newPassword } as Record<string, unknown>,
          jwt,
        ).catch(() => {});
      }
      toast.success(
        `Password reset for ${resetUser.fullName ?? resetUser.username}.`,
      );
      setResetUser(null);
      setNewPassword("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reset password.",
      );
    } finally {
      setResetting(false);
    }
  }

  function handleToggleActive(user: StoredUser) {
    const updated = users.map((u) =>
      u.id === user.id ? { ...u, isActive: !u.isActive } : u,
    );
    persistUsers(updated);
    toast.success(
      `${user.fullName ?? user.username} ${user.isActive ? "deactivated" : "activated"}.`,
    );
  }

  const isSuperAdmin = currentUser?.role === "superadmin";

  return (
    <div className="p-4 lg:p-6 max-w-5xl space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-display font-semibold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> User Management
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {users.length} user{users.length !== 1 ? "s" : ""} — Super Admin
            manages all roles
          </p>
        </div>
        {isSuperAdmin && (
          <Button onClick={openAdd} data-ocid="users.add_button">
            <Plus className="w-4 h-4 mr-1.5" /> Add User
          </Button>
        )}
      </div>

      {/* Super Admin Card */}
      <Card className="p-4 border-primary/20 bg-primary/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">Super Admin</p>
            <p className="text-xs text-muted-foreground">
              superadmin — Full access to all modules
            </p>
          </div>
          <Badge className="text-[10px] bg-primary/10 text-primary border-primary/30">
            Active
          </Badge>
          {isSuperAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setResetUser({
                  id: "su1",
                  username: "superadmin",
                  role: "superadmin",
                  name: "Super Admin",
                  fullName: "Super Admin",
                });
                setNewPassword("");
              }}
              data-ocid="users.superadmin.reset_button"
            >
              <KeyRound className="w-3.5 h-3.5 mr-1" />
              Reset Password
            </Button>
          )}
        </div>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, username or role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-ocid="users.search_input"
        />
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 && users.length === 0 ? (
        <Card className="p-10 text-center" data-ocid="users.empty_state">
          <UserCog className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="font-medium text-muted-foreground">
            No custom users yet
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Add staff users — they can log in with their username and password.
          </p>
          {isSuperAdmin && (
            <Button className="mt-4" onClick={openAdd}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add First User
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map((user, idx) => (
            <Card
              key={user.id}
              className={`p-4 transition-smooth ${user.isActive === false ? "opacity-60" : ""}`}
              data-ocid={`users.item.${idx + 1}`}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-muted-foreground">
                    {(user.fullName ?? user.username)[0]?.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {user.fullName ?? user.name ?? user.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @{user.username}
                    {user.mobile ? ` · ${user.mobile}` : ""}
                  </p>
                </div>
                <Badge className={`text-[10px] ${getRoleColor(user.role)}`}>
                  {ROLE_OPTIONS.find((r) => r.value === user.role)?.label ??
                    user.role}
                </Badge>
                <Badge
                  variant={user.isActive !== false ? "outline" : "secondary"}
                  className="text-[10px]"
                >
                  {user.isActive !== false ? "Active" : "Inactive"}
                </Badge>
                {isSuperAdmin && (
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(user)}
                      data-ocid={`users.edit_button.${idx + 1}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setResetUser(user);
                        setNewPassword("");
                      }}
                      data-ocid={`users.reset_button.${idx + 1}`}
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleActive(user)}
                      data-ocid={`users.toggle_button.${idx + 1}`}
                    >
                      {user.isActive !== false ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(user)}
                      data-ocid={`users.delete_button.${idx + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={showForm}
        onOpenChange={(v) => {
          if (!v) setShowForm(false);
        }}
      >
        <DialogContent className="max-w-lg" data-ocid="users.dialog">
          <DialogHeader>
            <DialogTitle>{editUser ? "Edit User" : "Add New User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="u-fullname">Full Name *</Label>
                <Input
                  id="u-fullname"
                  value={form.fullName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fullName: e.target.value }))
                  }
                  placeholder="Full name"
                  data-ocid="users.fullname.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-username">Username *</Label>
                <Input
                  id="u-username"
                  value={form.username}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, username: e.target.value }))
                  }
                  placeholder="login username (not mobile no.)"
                  data-ocid="users.username.input"
                  disabled={!!editUser}
                />
                {!editUser && (
                  <p className="text-[10px] text-muted-foreground">
                    Must not be a mobile number
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-role">Role *</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, role: v as UserRole }))
                  }
                  disabled={!isSuperAdmin}
                >
                  <SelectTrigger id="u-role" data-ocid="users.role.select">
                    <SelectValue placeholder="Select role" />
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
                <Label htmlFor="u-mobile">Mobile</Label>
                <Input
                  id="u-mobile"
                  value={form.mobile}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, mobile: e.target.value }))
                  }
                  placeholder="+91 XXXXX XXXXX"
                  data-ocid="users.mobile.input"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="u-email">Email</Label>
                <Input
                  id="u-email"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="user@school.com"
                  data-ocid="users.email.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-pw">
                  {editUser
                    ? "New Password (leave blank to keep)"
                    : "Password *"}
                </Label>
                <div className="relative">
                  <Input
                    id="u-pw"
                    type={showPw ? "text" : "password"}
                    value={form.password}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, password: e.target.value }))
                    }
                    placeholder={editUser ? "Leave blank to keep" : "Password"}
                    data-ocid="users.password.input"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPw((v) => !v)}
                  >
                    {showPw ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              {form.password && (
                <div className="space-y-1.5">
                  <Label htmlFor="u-confirm-pw">Confirm Password</Label>
                  <Input
                    id="u-confirm-pw"
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        confirmPassword: e.target.value,
                      }))
                    }
                    placeholder="Repeat password"
                    data-ocid="users.confirm_password.input"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                data-ocid="users.form.cancel_button"
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleSave()}
                disabled={saving}
                data-ocid="users.form.submit_button"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : editUser ? (
                  "Save Changes"
                ) : (
                  "Create User"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={!!resetUser}
        onOpenChange={(v) => {
          if (!v) setResetUser(null);
        }}
      >
        <DialogContent className="max-w-sm" data-ocid="users.reset_dialog">
          <DialogHeader>
            <DialogTitle>
              Reset Password — {resetUser?.fullName ?? resetUser?.username}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="reset-pw">New Password</Label>
              <Input
                id="reset-pw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                data-ocid="users.reset.password.input"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleResetPassword();
                }}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setResetUser(null)}
                data-ocid="users.reset.cancel_button"
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleResetPassword()}
                disabled={resetting || !newPassword}
                data-ocid="users.reset.confirm_button"
              >
                {resetting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resetting…
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 mr-2" />
                    Reset Password
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-sm" data-ocid="users.delete_dialog">
          <DialogHeader>
            <DialogTitle>Delete User?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Delete{" "}
            <strong>{deleteTarget?.fullName ?? deleteTarget?.username}</strong>?
            This cannot be undone.
          </p>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              data-ocid="users.delete.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              data-ocid="users.delete.confirm_button"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
