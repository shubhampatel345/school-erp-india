/**
 * FeeHeading.tsx — Fee Headings CRUD
 *
 * Collection key: "fee_headings" (matches server MySQL table)
 * Fields: name, headType, accountName, displayOrder, isActive, months, applicableClasses
 */
import { useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { useApp } from "../../context/AppContext";
import type { FeeHeading } from "../../types";
import { CLASS_ORDER } from "../../types";
import { CLASSES, MONTHS, generateId } from "../../utils/localStorage";

function safeArray<T>(v: T[] | string | undefined): T[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v) {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

const DEFAULT_FEE_HEADINGS: Array<{
  name: string;
  headType: "tuition" | "transport" | "other";
  accountName: string;
}> = [
  { name: "Tuition Fee", headType: "tuition", accountName: "Main Account" },
  {
    name: "Transport Fee",
    headType: "transport",
    accountName: "Transport Account",
  },
  { name: "Development Fund", headType: "other", accountName: "Main Account" },
  { name: "Exam Fee", headType: "other", accountName: "Main Account" },
];

const HEAD_TYPE_LABELS: Record<string, string> = {
  tuition: "Tuition",
  transport: "Transport",
  other: "Other",
};

const HEAD_TYPE_COLORS: Record<string, string> = {
  tuition: "bg-blue-100 text-blue-700 border-blue-200",
  transport: "bg-orange-100 text-orange-700 border-orange-200",
  other: "bg-muted text-muted-foreground border-border",
};

export default function FeeHeadingPage() {
  const {
    getData,
    saveData,
    updateData,
    deleteData,
    isReadOnly,
    currentUser,
    currentSession,
    addNotification,
  } = useApp();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [headType, setHeadType] = useState<"tuition" | "transport" | "other">(
    "tuition",
  );
  const [accountName, setAccountName] = useState("Main Account");
  const [displayOrder, setDisplayOrder] = useState("1");
  const [isActive, setIsActive] = useState(true);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([...MONTHS]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const canEdit =
    currentUser?.role === "superadmin" ||
    currentUser?.role === "admin" ||
    currentUser?.role === "accountant";

  // Collection key "fee_headings" matches the server MySQL table
  const rawHeadings = getData("fee_headings") as FeeHeading[];
  const headings = rawHeadings
    .map((h) => ({
      ...h,
      months: safeArray<string>(h.months as unknown as string[]),
      applicableClasses: h.applicableClasses
        ? safeArray<string>(h.applicableClasses as unknown as string[])
        : [],
    }))
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const months = selectedMonths.length > 0 ? selectedMonths : [...MONTHS];
      if (editId) {
        await updateData("fee_headings", editId, {
          name: name.trim(),
          headType,
          accountName: accountName.trim() || "Main Account",
          displayOrder: Number(displayOrder) || 1,
          isActive,
          months,
          applicableClasses: selectedClasses.length > 0 ? selectedClasses : [],
        });
        addNotification(`Fee heading "${name.trim()}" updated`, "success");
      } else {
        const h: FeeHeading = {
          id: generateId(),
          name: name.trim(),
          headType,
          accountName: accountName.trim() || "Main Account",
          displayOrder: Number(displayOrder) || headings.length + 1,
          isActive,
          months,
          applicableClasses:
            selectedClasses.length > 0 ? selectedClasses : undefined,
          amount: 0,
          sessionId: currentSession?.id,
        };
        await saveData("fee_headings", h as unknown as Record<string, unknown>);
        addNotification(`Fee heading "${h.name}" added`, "success");
      }
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  async function addDefaultHeadings() {
    if (headings.length > 0) return;
    setSaving(true);
    try {
      for (let i = 0; i < DEFAULT_FEE_HEADINGS.length; i++) {
        const dh = DEFAULT_FEE_HEADINGS[i];
        const h: FeeHeading = {
          id: generateId(),
          name: dh.name,
          headType: dh.headType,
          accountName: dh.accountName,
          displayOrder: i + 1,
          isActive: true,
          months: [...MONTHS],
          amount: 0,
          sessionId: currentSession?.id,
        };
        await saveData("fee_headings", h as unknown as Record<string, unknown>);
      }
      addNotification("Default fee headings added", "success");
    } finally {
      setSaving(false);
    }
  }

  async function deleteHeading(id: string) {
    if (
      !confirm(
        "Delete this fee heading? This will also remove it from all fee plans.",
      )
    )
      return;
    await deleteData("fee_headings", id);
    addNotification("Fee heading deleted", "info");
  }

  function openEdit(h: FeeHeading) {
    setEditId(h.id);
    setName(h.name);
    setHeadType(h.headType ?? "other");
    setAccountName(h.accountName ?? "Main Account");
    setDisplayOrder(String(h.displayOrder ?? 1));
    setIsActive(h.isActive !== false);
    setSelectedMonths(safeArray<string>(h.months as unknown as string[]));
    setSelectedClasses(
      h.applicableClasses
        ? safeArray<string>(h.applicableClasses as unknown as string[])
        : [],
    );
    setOpen(true);
  }

  function resetForm() {
    setEditId(null);
    setName("");
    setHeadType("tuition");
    setAccountName("Main Account");
    setDisplayOrder(String(headings.length + 1));
    setIsActive(true);
    setSelectedMonths([...MONTHS]);
    setSelectedClasses([]);
    setOpen(false);
  }

  // Build a class list — prefer context classes, fall back to CLASS_ORDER
  const classSections = getData("classes") as Array<{
    className?: string;
    name?: string;
  }>;
  const classList =
    classSections.length > 0
      ? classSections.map((c) => c.className ?? c.name ?? "").filter(Boolean)
      : CLASS_ORDER;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-foreground">Fee Headings</h3>
          <p className="text-sm text-muted-foreground">
            Define fee headings, types, accounts, and applicable months
          </p>
        </div>
        {canEdit && !isReadOnly && (
          <div className="flex gap-2">
            {headings.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void addDefaultHeadings()}
                disabled={saving}
                data-ocid="fee-heading.add-defaults-btn"
              >
                + Add Defaults
              </Button>
            )}
            <Button
              onClick={() => {
                setDisplayOrder(String(headings.length + 1));
                setOpen(true);
              }}
              data-ocid="fee-heading.add-btn"
            >
              + Add Heading
            </Button>
          </div>
        )}
      </div>

      {headings.length === 0 ? (
        <div
          className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground"
          data-ocid="fee-heading.empty_state"
        >
          <p className="text-4xl mb-3">📋</p>
          <p className="text-lg font-medium mb-1">No fee headings yet</p>
          <p className="text-sm mb-4">
            Add headings like Tuition Fee, Transport Fee, Development Fund. Or
            click "Add Defaults" to add the 4 most common headings at once.
          </p>
          {canEdit && !isReadOnly && (
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={() => void addDefaultHeadings()}
                disabled={saving}
                data-ocid="fee-heading.add-defaults-empty-btn"
              >
                {saving ? "Adding…" : "+ Add Default Headings"}
              </Button>
              <Button
                onClick={() => setOpen(true)}
                data-ocid="fee-heading.add-empty-btn"
              >
                + Add Custom Heading
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground w-10">
                  #
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  Heading Name
                </th>
                <th className="px-4 py-3 text-left font-semibold">Type</th>
                <th className="px-4 py-3 text-left font-semibold">Account</th>
                <th className="px-4 py-3 text-left font-semibold">Months</th>
                <th className="px-4 py-3 text-center font-semibold">Active</th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {headings.map((h, idx) => (
                <tr
                  key={h.id}
                  className={`border-t border-border hover:bg-muted/20 ${h.isActive === false ? "opacity-50" : ""}`}
                  data-ocid={`fee-heading.item.${idx + 1}`}
                >
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {h.displayOrder ?? idx + 1}
                  </td>
                  <td className="px-4 py-3 font-medium">{h.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border font-medium ${HEAD_TYPE_COLORS[h.headType ?? "other"]}`}
                    >
                      {HEAD_TYPE_LABELS[h.headType ?? "other"]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {h.accountName || "Main Account"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {h.months.length === 12 ? (
                        <Badge variant="secondary" className="text-xs">
                          All 12 months
                        </Badge>
                      ) : (
                        h.months.slice(0, 6).map((m) => (
                          <Badge
                            key={m}
                            variant="secondary"
                            className="text-xs"
                          >
                            {m.slice(0, 3)}
                          </Badge>
                        ))
                      )}
                      {h.months.length > 6 && h.months.length < 12 && (
                        <Badge variant="outline" className="text-xs">
                          +{h.months.length - 6}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-xs font-semibold ${h.isActive !== false ? "text-green-600" : "text-muted-foreground"}`}
                    >
                      {h.isActive !== false ? "✓ Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-2 justify-center">
                      {canEdit && !isReadOnly && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(h)}
                            data-ocid={`fee-heading.edit-btn.${idx + 1}`}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => void deleteHeading(h.id)}
                            data-ocid={`fee-heading.delete-btn.${idx + 1}`}
                          >
                            Delete
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
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) resetForm();
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit" : "Add"} Fee Heading</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Name */}
            <div>
              <label
                htmlFor="fee-heading-name"
                className="text-sm font-medium mb-1 block"
              >
                Heading Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="fee-heading-name"
                placeholder="e.g. Tuition Fee, Lab Fee, Library Fee"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-ocid="fee-heading.name-input"
              />
            </div>

            {/* Head Type */}
            <div>
              <p className="text-sm font-medium mb-2">Head Type</p>
              <div className="flex gap-2">
                {(["tuition", "transport", "other"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setHeadType(t)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      headType === t
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted/50"
                    }`}
                    data-ocid={`fee-heading.type-btn.${t}`}
                  >
                    {HEAD_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Account + Order + Active row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="fee-heading-account"
                  className="text-sm font-medium mb-1 block"
                >
                  Account Name
                </label>
                <Input
                  id="fee-heading-account"
                  placeholder="Main Account"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  data-ocid="fee-heading.account-input"
                />
              </div>
              <div>
                <label
                  htmlFor="fee-heading-order"
                  className="text-sm font-medium mb-1 block"
                >
                  Display Order
                </label>
                <Input
                  id="fee-heading-order"
                  type="number"
                  min="1"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(e.target.value)}
                  data-ocid="fee-heading.order-input"
                />
              </div>
            </div>

            {/* Active toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 accent-primary"
                data-ocid="fee-heading.active-checkbox"
              />
              <span className="text-sm font-medium">
                Active (visible in fee collection)
              </span>
            </label>

            {/* Month selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Applicable Months</span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => setSelectedMonths([...MONTHS])}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:underline"
                    onClick={() => setSelectedMonths([])}
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {MONTHS.map((m) => (
                  <label
                    key={m}
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMonths.includes(m)}
                      onChange={() =>
                        setSelectedMonths((prev) =>
                          prev.includes(m)
                            ? prev.filter((x) => x !== m)
                            : [...prev, m],
                        )
                      }
                      className="accent-primary"
                    />
                    {m.slice(0, 3)}
                  </label>
                ))}
              </div>
            </div>

            {/* Class selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-medium">
                    Applicable Classes
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Leave blank to apply to all classes
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => setSelectedClasses([...classList])}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:underline"
                    onClick={() => setSelectedClasses([])}
                  >
                    None
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto border border-border rounded-lg p-2">
                {classList.map((c) => (
                  <label
                    key={c}
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedClasses.includes(c)}
                      onChange={() =>
                        setSelectedClasses((prev) =>
                          prev.includes(c)
                            ? prev.filter((x) => x !== c)
                            : [...prev, c],
                        )
                      }
                      className="accent-primary"
                    />
                    {c}
                  </label>
                ))}
              </div>
              {selectedClasses.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  No classes selected — heading will apply to all classes
                </p>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={resetForm}
                disabled={saving}
                data-ocid="fee-heading.cancel-btn"
              >
                Cancel
              </Button>
              <Button
                onClick={() => void save()}
                disabled={!name.trim() || saving}
                data-ocid="fee-heading.save-btn"
              >
                {saving ? "Saving…" : editId ? "Update Heading" : "Add Heading"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
