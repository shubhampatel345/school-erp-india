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
  Plus,
  Search,
  Shield,
  UserCog,
} from "lucide-react";
import { useState } from "react";
import { useApp } from "../../context/AppContext";
import type { AppUser, UserRole } from "../../types";
import { generateId, ls } from "../../utils/localStorage";

const STAFF_POSITIONS: { label: string; role: UserRole }[] = [
  { label: "Admin", role: "admin" },
  { label: "Receptionist", role: "receptionist" },
  { label: "Accountant", role: "accountant" },
  { label: "Librarian", role: "librarian" },
  { label: "Driver", role: "driver" },
  { label: "Peon", role: "receptionist" }, // maps to receptionist role for access
];

interface UserRow {
  id: string;
  name: string;
  username: string;
  role: string;
  mobile?: string;
}

const ROLE_COLORS: Record<string, string> = {
  "Super Admin": "bg-primary/10 text-primary border-primary/20",
  Admin: "bg-accent/10 text-accent border-accent/20",
  Teacher: "bg-blue-100 text-blue-700 border-blue-200",
  Student: "bg-green-100 text-green-700 border-green-200",
  Parent: "bg-purple-100 text-purple-700 border-purple-200",
  Driver: "bg-orange-100 text-orange-700 border-orange-200",
  default: "bg-muted text-muted-foreground border-border",
};

function getRoleBadgeClass(role: string) {
  return ROLE_COLORS[role] ?? ROLE_COLORS.default;
}

export default function UserManagement() {
  const { currentUser, changePassword } = useApp();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPosition, setAddPosition] = useState("Admin");
  const [addPositionRole, setAddPositionRole] = useState<UserRole>("admin");
  const [addMobile, setAddMobile] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [showAddPw, setShowAddPw] = useState(false);
  const [viewPasswordUser, setViewPasswordUser] = useState<UserRow | null>(
    null,
  );
  const [maskedPasswords, setMaskedPasswords] = useState<
    Record<string, boolean>
  >({});

  if (currentUser?.role !== "superadmin") {
    return (
      <div className="p-10 text-center">
        <Shield className="w-14 h-14 mx-auto mb-4 text-muted-foreground/30" />
        <p className="font-medium text-muted-foreground">
          Super Admin access required.
        </p>
      </div>
    );
  }

  function getAllUsers(): UserRow[] {
    const students = ls.get<
      {
        id: string;
        fullName: string;
        credentials: { username: string };
        mobile?: string;
      }[]
    >("students", []);
    const staff = ls.get<
      {
        id: string;
        name: string;
        credentials?: { username: string };
        designation: string;
        mobile?: string;
      }[]
    >("staff", []);
    const customUsers = ls.get<AppUser[]>("custom_users", []);

    const rows: UserRow[] = [
      {
        id: "su1",
        name: "Super Admin",
        username: "superadmin",
        role: "Super Admin",
      },
      { id: "ad1", name: "School Admin", username: "admin", role: "Admin" },
      ...students.map((s) => ({
        id: s.id,
        name: s.fullName,
        username: s.credentials.username,
        role: "Student",
        mobile: s.mobile,
      })),
      ...staff.map((s) => ({
        id: s.id,
        name: s.name,
        username: s.credentials?.username ?? s.id,
        role: s.designation,
        mobile: s.mobile,
      })),
      ...customUsers.map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        role: u.role.charAt(0).toUpperCase() + u.role.slice(1),
        mobile: u.mobile,
      })),
    ];
    return rows;
  }

  function getStoredPassword(username: string): string {
    const passwords = ls.get<Record<string, string>>("user_passwords", {});
    return passwords[username] ?? "••••••••";
  }

  const allUsers = getAllUsers();
  const roles = Array.from(new Set(allUsers.map((u) => u.role)));
  const filtered = allUsers.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.mobile?.includes(search) ?? false);
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  function handleResetPassword() {
    if (!resetTarget || !newPassword.trim()) return;
    const passwords = ls.get<Record<string, string>>("user_passwords", {});
    passwords[resetTarget.username] = newPassword.trim();
    ls.set("user_passwords", passwords);
    changePassword(resetTarget.id, newPassword.trim());
    setResetTarget(null);
    setNewPassword("");
  }

  function handleAddUser() {
    if (!addName.trim() || !addMobile.trim() || !addPassword.trim()) {
      alert("Please fill all required fields.");
      return;
    }
    const user: AppUser = {
      id: generateId(),
      username: addMobile.trim(),
      role: addPositionRole,
      name: addName.trim(),
      mobile: addMobile.trim(),
      position: addPosition,
    };
    const customUsers = ls.get<AppUser[]>("custom_users", []);
    customUsers.push(user);
    ls.set("custom_users", customUsers);
    const passwords = ls.get<Record<string, string>>("user_passwords", {});
    passwords[addMobile.trim()] = addPassword.trim();
    ls.set("user_passwords", passwords);
    setShowAddUser(false);
    setAddName("");
    setAddMobile("");
    setAddPassword("");
    setAddPosition("Admin");
    setAddPositionRole("admin");
  }

  function togglePasswordVisibility(userId: string) {
    setMaskedPasswords((prev) => ({ ...prev, [userId]: !prev[userId] }));
  }

  const studentCount = allUsers.filter((u) => u.role === "Student").length;
  const staffCount = allUsers.filter((u) => u.role !== "Student").length;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold font-display text-foreground">
            {allUsers.length}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Total Users</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold font-display text-green-600">
            {studentCount}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Students</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold font-display text-primary">
            {staffCount}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Staff / Admin</p>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-wrap flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              data-ocid="user-search"
              placeholder="Search by name, username, mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-40" data-ocid="user-role-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button data-ocid="user-add" onClick={() => setShowAddUser(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Staff User
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
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
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
                      className={`text-xs border ${getRoleBadgeClass(u.role)}`}
                      variant="outline"
                    >
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-muted-foreground">
                        {maskedPasswords[u.id]
                          ? getStoredPassword(u.username)
                          : "••••••••"}
                      </span>
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(u.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={
                          maskedPasswords[u.id]
                            ? "Hide password"
                            : "View password"
                        }
                      >
                        {maskedPasswords[u.id] ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      data-ocid={`reset-password-${u.id}`}
                      onClick={() => {
                        setResetTarget(u);
                        setNewPassword("");
                        setShowNewPw(false);
                      }}
                    >
                      <KeyRound className="w-3.5 h-3.5 mr-1" /> Reset
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground text-sm"
                  >
                    No users found for "{search}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={() => setResetTarget(null)}>
        <DialogContent>
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
                  data-ocid="reset-password-input"
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
                  aria-label={showNewPw ? "Hide password" : "Show password"}
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
              <Button variant="outline" onClick={() => setResetTarget(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleResetPassword}
                data-ocid="reset-password-confirm"
              >
                Reset Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Password Dialog */}
      <Dialog
        open={!!viewPasswordUser}
        onOpenChange={() => setViewPasswordUser(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Password for {viewPasswordUser?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="bg-muted rounded-lg p-4 font-mono text-center text-lg font-bold tracking-widest text-foreground">
              {viewPasswordUser
                ? getStoredPassword(viewPasswordUser.username)
                : ""}
            </div>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setViewPasswordUser(null)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Staff User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5" />
              Add Staff User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-name">Full Name *</Label>
              <Input
                id="add-name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Staff member's full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Position *</Label>
              <Select
                value={addPosition}
                onValueChange={(v) => {
                  setAddPosition(v);
                  const pos = STAFF_POSITIONS.find((p) => p.label === v);
                  if (pos) setAddPositionRole(pos.role);
                }}
              >
                <SelectTrigger data-ocid="add-user-position">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_POSITIONS.map((p) => (
                    <SelectItem key={p.label} value={p.label}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-mobile">Mobile No. (Username) *</Label>
              <Input
                id="add-mobile"
                value={addMobile}
                onChange={(e) => setAddMobile(e.target.value)}
                placeholder="10-digit mobile number"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-pw">Password *</Label>
              <div className="relative">
                <Input
                  id="add-pw"
                  type={showAddPw ? "text" : "password"}
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  placeholder="Set login password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowAddPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showAddPw ? "Hide" : "Show"}
                >
                  {showAddPw ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground">
              Username = Mobile Number · Role = {addPosition}
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowAddUser(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddUser} data-ocid="add-user-save">
                Add User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
