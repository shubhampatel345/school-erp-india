import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCheck, Loader2, Save, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type { Permission, PermissionMatrix, UserRole } from "../../types";
import { apiUpdatePermissions, getJwt } from "../../utils/api";
import { ls } from "../../utils/localStorage";

const MODULES = [
  { id: "dashboard", label: "Dashboard" },
  { id: "students", label: "Students" },
  { id: "fees", label: "Fees" },
  { id: "attendance", label: "Attendance" },
  { id: "hr", label: "HR & Payroll" },
  { id: "academics", label: "Academics" },
  { id: "transport", label: "Transport" },
  { id: "inventory", label: "Inventory" },
  { id: "examinations", label: "Examinations" },
  { id: "communication", label: "Communication" },
  { id: "chat", label: "Chat" },
  { id: "reports", label: "Reports" },
  { id: "alumni", label: "Alumni" },
  { id: "expenses", label: "Expenses" },
  { id: "homework", label: "Homework" },
  { id: "certificates", label: "Certificates" },
  { id: "settings", label: "Settings" },
];

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "teacher", label: "Teacher" },
  { value: "receptionist", label: "Receptionist" },
  { value: "accountant", label: "Accountant" },
  { value: "librarian", label: "Librarian" },
  { value: "driver", label: "Driver" },
  { value: "parent", label: "Parent" },
  { value: "student", label: "Student" },
];

const DEFAULT_PERMS: Record<
  UserRole,
  { view: boolean; add: boolean; edit: boolean; del: boolean }
> = {
  superadmin: { view: true, add: true, edit: true, del: true },
  admin: { view: true, add: true, edit: true, del: true },
  teacher: { view: true, add: false, edit: false, del: false },
  receptionist: { view: true, add: true, edit: false, del: false },
  accountant: { view: true, add: true, edit: false, del: false },
  librarian: { view: true, add: true, edit: false, del: false },
  driver: { view: true, add: false, edit: false, del: false },
  parent: { view: true, add: false, edit: false, del: false },
  student: { view: true, add: false, edit: false, del: false },
};

type PermRow = { view: boolean; add: boolean; edit: boolean; del: boolean };
type RoleMatrix = Record<string, PermRow>;

function buildDefaultMatrix(role: UserRole): RoleMatrix {
  const defaults = DEFAULT_PERMS[role] ?? DEFAULT_PERMS.teacher;
  const m: RoleMatrix = {};
  for (const mod of MODULES) {
    m[mod.id] = { ...defaults };
  }
  return m;
}

function loadMatrix(role: UserRole): RoleMatrix {
  const saved = ls.get<PermissionMatrix>(
    `permissions_${role}`,
    {} as PermissionMatrix,
  );
  if (Object.keys(saved).length === 0) return buildDefaultMatrix(role);
  const m: RoleMatrix = {};
  for (const mod of MODULES) {
    const perm = saved[mod.id];
    if (perm) {
      m[mod.id] = {
        view: perm.canView,
        add: perm.canAdd,
        edit: perm.canEdit,
        del: perm.canDelete,
      };
    } else {
      const def = DEFAULT_PERMS[role] ?? DEFAULT_PERMS.teacher;
      m[mod.id] = { ...def };
    }
  }
  return m;
}

function toPermissionMatrix(
  _role: UserRole,
  matrix: RoleMatrix,
): PermissionMatrix {
  const pm: PermissionMatrix = {};
  for (const [moduleId, row] of Object.entries(matrix)) {
    pm[moduleId] = {
      module: moduleId,
      canView: row.view,
      canAdd: row.add,
      canEdit: row.edit,
      canDelete: row.del,
    } satisfies Permission;
  }
  return pm;
}

export default function PermissionManagement() {
  const { currentUser } = useApp();
  const [selectedRole, setSelectedRole] = useState<UserRole>("teacher");
  const [matrix, setMatrix] = useState<RoleMatrix>(() => loadMatrix("teacher"));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMatrix(loadMatrix(selectedRole));
  }, [selectedRole]);

  function toggle(moduleId: string, field: keyof PermRow) {
    setMatrix((prev) => ({
      ...prev,
      [moduleId]: { ...prev[moduleId], [field]: !prev[moduleId][field] },
    }));
  }

  function setAllForModule(moduleId: string, val: boolean) {
    setMatrix((prev) => ({
      ...prev,
      [moduleId]: { view: val, add: val, edit: val, del: val },
    }));
  }

  function setAllForAction(field: keyof PermRow, val: boolean) {
    setMatrix((prev) => {
      const next = { ...prev };
      for (const mod of MODULES) {
        next[mod.id] = { ...next[mod.id], [field]: val };
      }
      return next;
    });
  }

  function applyDefaultsForRole() {
    setMatrix(buildDefaultMatrix(selectedRole));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const pm = toPermissionMatrix(selectedRole, matrix);
      ls.set(`permissions_${selectedRole}`, pm);

      const jwt = getJwt();
      if (jwt) {
        await apiUpdatePermissions(
          selectedRole,
          pm as unknown as Record<string, unknown>,
          jwt,
        ).catch(() => {});
      }
      toast.success(`Permissions for ${selectedRole} saved.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save permissions.",
      );
    } finally {
      setSaving(false);
    }
  }

  const isSuperAdmin = currentUser?.role === "superadmin";

  return (
    <div className="p-4 lg:p-6 max-w-5xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-display font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Permission Management
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Control what each role can view, add, edit, and delete across all
            modules.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={selectedRole}
            onValueChange={(v) => setSelectedRole(v as UserRole)}
          >
            <SelectTrigger className="w-40" data-ocid="permissions.role.select">
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => applyDefaultsForRole()}
            data-ocid="permissions.reset_defaults.button"
          >
            Reset Defaults
          </Button>
        </div>
      </div>

      {/* Super Admin notice */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <p className="text-sm text-foreground font-medium">
            Super Admin always has full access
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-1 ml-6">
          Super Admin permissions cannot be restricted.
        </p>
      </Card>

      {/* Matrix */}
      <Card className="overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_repeat(5,auto)] items-center gap-2 px-4 py-2 bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <span>Module</span>
          <span className="w-14 text-center">View</span>
          <span className="w-14 text-center">Add</span>
          <span className="w-14 text-center">Edit</span>
          <span className="w-14 text-center">Delete</span>
          <span className="w-16 text-center">All</span>
        </div>

        {/* "Select All" row */}
        <div className="grid grid-cols-[1fr_repeat(5,auto)] items-center gap-2 px-4 py-2 bg-muted/20 border-b">
          <span className="text-xs font-semibold text-foreground">
            Select All
          </span>
          {(["view", "add", "edit", "del"] as (keyof PermRow)[]).map(
            (field) => {
              const allChecked = MODULES.every((m) => matrix[m.id]?.[field]);
              return (
                <div key={field} className="w-14 flex justify-center">
                  <Checkbox
                    checked={allChecked}
                    onCheckedChange={(v) => setAllForAction(field, !!v)}
                    disabled={!isSuperAdmin}
                    data-ocid={`permissions.all.${field}.checkbox`}
                  />
                </div>
              );
            },
          )}
          <div className="w-16" />
        </div>

        {/* Module rows */}
        <div className="divide-y">
          {MODULES.map((mod, idx) => {
            const row = matrix[mod.id] ?? {
              view: false,
              add: false,
              edit: false,
              del: false,
            };
            const allChecked = row.view && row.add && row.edit && row.del;
            return (
              <div
                key={mod.id}
                className={`grid grid-cols-[1fr_repeat(5,auto)] items-center gap-2 px-4 py-3 transition-colors hover:bg-muted/30 ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                data-ocid={`permissions.module.${mod.id}`}
              >
                <span className="text-sm font-medium text-foreground">
                  {mod.label}
                </span>
                {(["view", "add", "edit", "del"] as (keyof PermRow)[]).map(
                  (field) => (
                    <div key={field} className="w-14 flex justify-center">
                      <Checkbox
                        checked={row[field]}
                        onCheckedChange={() => toggle(mod.id, field)}
                        disabled={!isSuperAdmin}
                        data-ocid={`permissions.${mod.id}.${field}.checkbox`}
                      />
                    </div>
                  ),
                )}
                <div className="w-16 flex justify-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => setAllForModule(mod.id, !allChecked)}
                    disabled={!isSuperAdmin}
                    data-ocid={`permissions.${mod.id}.all.toggle`}
                  >
                    {allChecked ? "None" : "All"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <Badge variant="outline" className="text-[10px]">
          View — can read/see data
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          Add — can create new records
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          Edit — can modify existing records
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          Delete — can remove records
        </Badge>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 justify-end">
        <Button
          variant="outline"
          onClick={() => {
            applyDefaultsForRole();
            toast.info("Defaults restored. Click Save to persist.");
          }}
          data-ocid="permissions.reset_all.button"
        >
          <CheckCheck className="w-4 h-4 mr-2" />
          Reset All Roles
        </Button>
        <Button
          onClick={() => void handleSave()}
          disabled={saving || !isSuperAdmin}
          data-ocid="permissions.save_button"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Permissions
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
