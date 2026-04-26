/**
 * SHUBH SCHOOL ERP — User Management (rewritten)
 * Super Admin can add, edit, reset passwords, deactivate users.
 * All reads/writes go directly to PHP/MySQL via phpApiService.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Edit,
  KeyRound,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ROLES, type UserRole } from "../../types";
import phpApiService from "../../utils/phpApiService";

interface UserRecord {
  id: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
}

const ROLE_COLORS: Record<string, string> = {
  superadmin: "bg-primary/10 text-primary",
  admin: "bg-blue-500/10 text-blue-600",
  teacher: "bg-green-500/10 text-green-600",
  accountant: "bg-amber-500/10 text-amber-600",
  parent: "bg-purple-500/10 text-purple-600",
  student: "bg-cyan-500/10 text-cyan-600",
  driver: "bg-orange-500/10 text-orange-600",
  receptionist: "bg-pink-500/10 text-pink-600",
  librarian: "bg-indigo-500/10 text-indigo-600",
};

type ModalMode = "add" | "edit" | "reset" | null;

interface FormData {
  username: string;
  password: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
}

const EMPTY_FORM: FormData = {
  username: "",
  password: "",
  name: "",
  email: "",
  phone: "",
  role: "teacher",
};

export default function UserManagement() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<UserRecord | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [newPw, setNewPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    void phpApiService
      .getUsers()
      .then((raw) => {
        setUsers(
          (raw as unknown as UserRecord[]).filter(
            (u) => u.username !== "superadmin",
          ),
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.role?.toLowerCase().includes(search.toLowerCase()),
  );

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setError("");
    setModal("add");
  };

  const openEdit = (u: UserRecord) => {
    setSelected(u);
    setForm({
      username: u.username,
      password: "",
      name: u.name,
      email: u.email ?? "",
      phone: u.phone ?? "",
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

  const setF = (k: keyof FormData, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.username || !form.name) {
      setError("Username and name are required");
      return;
    }
    if (modal === "add" && !form.password) {
      setError("Password is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (modal === "add") {
        await phpApiService.createUser({ ...form });
      } else if (modal === "edit" && selected) {
        await phpApiService.updateUser({
          id: selected.id,
          name: form.name,
          email: form.email,
          phone: form.phone,
          role: form.role,
        });
      }
      load();
      setModal(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!newPw || !selected) return;
    setSaving(true);
    setError("");
    try {
      await phpApiService.resetPassword(selected.id, newPw);
      setModal(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reset password");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (u: UserRecord) => {
    await phpApiService.updateUser({ id: u.id, isActive: !u.isActive });
    setUsers((prev) =>
      prev.map((x) => (x.id === u.id ? { ...x, isActive: !x.isActive } : x)),
    );
  };

  const handleDelete = async (u: UserRecord) => {
    if (!confirm(`Delete user "${u.name}"?`)) return;
    await phpApiService.deleteUser(u.id);
    setUsers((prev) => prev.filter((x) => x.id !== u.id));
  };

  const FORM_FIELDS: [keyof FormData, string, string][] = [
    ["name", "Full Name", "text"],
    ["username", "Username", "text"],
    ["email", "Email", "email"],
    ["phone", "Phone", "tel"],
  ];

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold text-foreground">
            User Management
          </h2>
          <Badge variant="secondary">{users.length} users</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users…"
              className="pl-8 w-48"
              data-ocid="user-mgmt.search_input"
            />
          </div>
          <Button size="sm" onClick={openAdd} data-ocid="user-mgmt.add_button">
            <Plus className="w-4 h-4 mr-1" /> Add User
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {["a", "b", "c", "d"].map((k) => (
            <div key={k} className="h-16 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="text-center py-12 bg-card rounded-xl border border-border"
          data-ocid="user-mgmt.empty_state"
        >
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No users found</p>
          <Button size="sm" className="mt-3" onClick={openAdd}>
            Add First User
          </Button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Name
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">
                  Username
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Role
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                  Status
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, idx) => (
                <tr
                  key={u.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                  data-ocid={`user-mgmt.item.${idx + 1}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{u.name}</p>
                    <p className="text-xs text-muted-foreground sm:hidden">
                      @{u.username}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    @{u.username}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        ROLE_COLORS[u.role] ?? "bg-muted text-foreground"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        u.isActive !== false
                          ? "bg-green-500/10 text-green-600"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {u.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => openEdit(u)}
                        data-ocid={`user-mgmt.edit_button.${idx + 1}`}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => openReset(u)}
                        data-ocid={`user-mgmt.reset_pw_button.${idx + 1}`}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleToggleActive(u)}
                        data-ocid={`user-mgmt.toggle_button.${idx + 1}`}
                      >
                        {u.isActive !== false ? (
                          <UserX className="w-3.5 h-3.5" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(u)}
                        data-ocid={`user-mgmt.delete_button.${idx + 1}`}
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
      )}

      {/* Add/Edit Modal */}
      {(modal === "add" || modal === "edit") && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          data-ocid="user-mgmt.dialog"
        >
          <div className="bg-card border border-border rounded-2xl shadow-elevated w-full max-w-md p-5 space-y-4">
            <h3 className="font-display font-semibold text-foreground">
              {modal === "add" ? "Add User" : "Edit User"}
            </h3>
            {error && (
              <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              {FORM_FIELDS.map(([k, lbl, type]) => (
                <div
                  key={String(k)}
                  className={k === "name" ? "col-span-2" : ""}
                >
                  <Label className="text-xs mb-1 block">{lbl}</Label>
                  <Input
                    type={type}
                    value={form[k]}
                    onChange={(e) => setF(k, e.target.value)}
                    disabled={modal === "edit" && k === "username"}
                    data-ocid={`user-modal.${k}_input`}
                  />
                </div>
              ))}
              {modal === "add" && (
                <div>
                  <Label className="text-xs mb-1 block">Password</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setF("password", e.target.value)}
                    data-ocid="user-modal.password_input"
                  />
                </div>
              )}
              <div className={modal === "add" ? "" : "col-span-2"}>
                <Label className="text-xs mb-1 block">Role</Label>
                <select
                  value={form.role}
                  onChange={(e) => setF("role", e.target.value)}
                  className="w-full border border-input bg-background text-foreground rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-ring"
                  data-ocid="user-modal.role_select"
                >
                  {ROLES.filter((r) => r !== "superadmin").map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setModal(null)}
                data-ocid="user-modal.cancel_button"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                data-ocid="user-modal.confirm_button"
              >
                {saving ? "Saving…" : "Save User"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {modal === "reset" && selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          data-ocid="user-mgmt.reset-dialog"
        >
          <div className="bg-card border border-border rounded-2xl shadow-elevated w-full max-w-sm p-5 space-y-4">
            <h3 className="font-display font-semibold text-foreground">
              Reset Password
            </h3>
            <p className="text-sm text-muted-foreground">
              Set a new password for <strong>{selected.name}</strong>
            </p>
            {error && (
              <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}
            <div>
              <Label className="text-xs mb-1 block">New Password</Label>
              <Input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Enter new password"
                data-ocid="user-reset.password_input"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setModal(null)}
                data-ocid="user-reset.cancel_button"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReset}
                disabled={saving || !newPw}
                data-ocid="user-reset.confirm_button"
              >
                {saving ? "Resetting…" : "Reset Password"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
