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
import { CheckCheck, CheckCircle, Copy, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import type { Permission, PermissionMatrix, UserRole } from "../../types";
import { apiUpdatePermissions, getJwt } from "../../utils/api";
import { ls } from "../../utils/localStorage";

// ── Constants ──────────────────────────────────────────────

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
  { id: "userManagement", label: "User Management" },
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

type PermField = keyof Omit<Permission, "module">;

const PERM_FIELDS: { key: PermField; label: string; short: string }[] = [
  { key: "canView", label: "View", short: "V" },
  { key: "canAdd", label: "Add", short: "A" },
  { key: "canEdit", label: "Edit", short: "E" },
  { key: "canDelete", label: "Delete", short: "D" },
];

// ── Role defaults ──────────────────────────────────────────

function buildDefault(
  canView: boolean,
  canAdd: boolean,
  canEdit: boolean,
  canDelete: boolean,
): PermissionMatrix {
  const matrix: PermissionMatrix = {};
  for (const m of MODULES) {
    matrix[m.id] = { module: m.id, canView, canAdd, canEdit, canDelete };
  }
  return matrix;
}

const ROLE_DEFAULTS: Record<string, PermissionMatrix> = {
  admin: buildDefault(true, true, true, true),
  teacher: buildDefault(true, false, false, false),
  receptionist: buildDefault(true, true, false, false),
  accountant: buildDefault(true, true, false, false),
  librarian: buildDefault(true, true, false, false),
  driver: buildDefault(true, false, false, false),
  parent: buildDefault(true, false, false, false),
  student: buildDefault(true, false, false, false),
};

// ── Persistence ────────────────────────────────────────────

function getStoredMatrix(role: string): PermissionMatrix {
  const all = ls.get<Record<string, PermissionMatrix>>("role_permissions", {});
  return (
    all[role] ?? ROLE_DEFAULTS[role] ?? buildDefault(false, false, false, false)
  );
}

function storeMatrix(role: string, matrix: PermissionMatrix) {
  const all = ls.get<Record<string, PermissionMatrix>>("role_permissions", {});
  all[role] = matrix;
  ls.set("role_permissions", all);
}

// ── Component ──────────────────────────────────────────────

export default function PermissionManagement() {
  const { currentUser, hasPermission } = useApp();

  const [selectedRole, setSelectedRole] = useState<UserRole>("teacher");
  const [matrix, setMatrix] = useState<PermissionMatrix>(() =>
    getStoredMatrix("teacher"),
  );
  const [copyFromRole, setCopyFromRole] = useState<UserRole>("admin");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Load matrix when role changes (must be before any early return) ───────

  useEffect(() => {
    setMatrix(getStoredMatrix(selectedRole));
    setSaved(false);
  }, [selectedRole]);

  // ── Permission guard ──────────────────────────────────────

  const canAccess =
    hasPermission("userManagement", "canView") ||
    currentUser?.role === "superadmin";
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

  // ── Toggle a single cell ──────────────────────────────────

  function toggle(moduleId: string, field: PermField) {
    setMatrix((prev) => {
      const current = prev[moduleId] ?? {
        module: moduleId,
        canView: false,
        canAdd: false,
        canEdit: false,
        canDelete: false,
      };
      const updated = { ...current, [field]: !current[field] };
      // If toggling off canView, also disable add/edit/delete
      if (field === "canView" && !updated.canView) {
        updated.canAdd = false;
        updated.canEdit = false;
        updated.canDelete = false;
      }
      // If toggling on add/edit/delete, also enable canView
      if (field !== "canView" && updated[field]) {
        updated.canView = true;
      }
      return { ...prev, [moduleId]: updated };
    });
    setSaved(false);
  }

  // ── Toggle all in a column ────────────────────────────────

  function toggleColumn(field: PermField) {
    const allOn = MODULES.every((m) =>
      matrix[m.id]?.[field] !== false && matrix[m.id]?.[field] !== undefined
        ? matrix[m.id][field]
        : (ROLE_DEFAULTS[selectedRole]?.[m.id]?.[field] ?? false),
    );
    setMatrix((prev) => {
      const next = { ...prev };
      for (const m of MODULES) {
        const current = prev[m.id] ?? {
          module: m.id,
          canView: false,
          canAdd: false,
          canEdit: false,
          canDelete: false,
        };
        next[m.id] = { ...current, [field]: !allOn };
      }
      return next;
    });
    setSaved(false);
  }

  // ── Copy from role ────────────────────────────────────────

  function handleCopyFrom() {
    const source = getStoredMatrix(copyFromRole);
    setMatrix(source);
    setSaved(false);
  }

  // ── Save ──────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    try {
      storeMatrix(selectedRole, matrix);
      const token = getJwt();
      if (token) {
        try {
          await apiUpdatePermissions(
            selectedRole,
            matrix as unknown as Record<string, unknown>,
            token,
          );
        } catch {
          // server unavailable — local save succeeded
        }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  // ── Current role display ──────────────────────────────────

  const isSuperAdmin = selectedRole === "superadmin";

  function cellValue(moduleId: string, field: PermField): boolean {
    return matrix[moduleId]?.[field] ?? false;
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground font-display">
            Role Permissions
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure module access for each user role
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Role selector */}
          <Select
            value={selectedRole}
            onValueChange={(v) => setSelectedRole(v as UserRole)}
          >
            <SelectTrigger
              className="w-44"
              data-ocid="perm_management.role.select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="superadmin">Super Admin</SelectItem>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Copy from */}
          {!isSuperAdmin && (
            <div className="flex items-center gap-2">
              <Select
                value={copyFromRole}
                onValueChange={(v) => setCopyFromRole(v as UserRole)}
              >
                <SelectTrigger
                  className="w-36"
                  data-ocid="perm_management.copy_from.select"
                >
                  <SelectValue placeholder="Copy from…" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.filter((r) => r.value !== selectedRole).map(
                    (r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                data-ocid="perm_management.copy_button"
                onClick={handleCopyFrom}
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
              </Button>
            </div>
          )}

          {/* Save */}
          {!isSuperAdmin && (
            <Button
              data-ocid="perm_management.save_button"
              onClick={handleSave}
              disabled={saving}
            >
              {saved ? (
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> Saved
                </span>
              ) : saving ? (
                "Saving…"
              ) : (
                "Save Permissions"
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Super Admin notice */}
      {isSuperAdmin && (
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-3"
          style={{
            background: "oklch(0.55 0.14 200 / 0.08)",
            border: "1px solid oklch(0.55 0.14 200 / 0.20)",
          }}
        >
          <Shield
            className="w-5 h-5 flex-shrink-0"
            style={{ color: "oklch(0.55 0.14 200)" }}
          />
          <div>
            <p className="text-sm font-medium text-foreground">
              Super Admin — Unrestricted Access
            </p>
            <p className="text-xs text-muted-foreground">
              Super Admin has full access to all modules and cannot be
              restricted.
            </p>
          </div>
        </div>
      )}

      {/* Matrix */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-48">
                  Module
                </th>
                {PERM_FIELDS.map((f) => (
                  <th
                    key={f.key}
                    className="px-4 py-3 text-center font-semibold text-muted-foreground"
                  >
                    {!isSuperAdmin ? (
                      <button
                        type="button"
                        onClick={() => toggleColumn(f.key)}
                        className="flex flex-col items-center gap-1 mx-auto hover:text-foreground transition-colors"
                        title={`Toggle all ${f.label}`}
                        data-ocid={`perm_management.column_${f.key}.toggle`}
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span className="text-xs">{f.label}</span>
                      </button>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs">{f.label}</span>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {MODULES.map((mod, i) => (
                <tr
                  key={mod.id}
                  data-ocid={`perm_management.module.${i + 1}`}
                  className="hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">
                      {mod.label}
                    </span>
                  </td>
                  {PERM_FIELDS.map((f) => (
                    <td key={f.key} className="px-4 py-3 text-center">
                      {isSuperAdmin ? (
                        <Badge
                          className="text-xs border bg-primary/10 text-primary border-primary/20"
                          variant="outline"
                        >
                          ✓
                        </Badge>
                      ) : (
                        <Checkbox
                          checked={cellValue(mod.id, f.key)}
                          onCheckedChange={() => toggle(mod.id, f.key)}
                          data-ocid={`perm_management.${mod.id}_${f.key}.checkbox`}
                          aria-label={`${mod.label} ${f.label}`}
                          className="mx-auto"
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isSuperAdmin && (
          <div className="px-4 py-3 bg-muted/30 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Changes apply immediately after saving. Users must re-login to see
              updated permissions.
            </p>
            <Button
              size="sm"
              data-ocid="perm_management.save_bottom_button"
              onClick={handleSave}
              disabled={saving}
            >
              {saved ? (
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Saved
                </span>
              ) : saving ? (
                "Saving…"
              ) : (
                "Save"
              )}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
