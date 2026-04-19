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
import { Skeleton } from "../../components/ui/skeleton";
import { useApp } from "../../context/AppContext";
import type { FeeHeading } from "../../types";
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

export default function FeeHeadingPage() {
  const {
    getData,
    saveData,
    updateData,
    deleteData,
    isReadOnly,
    currentUser,
    addNotification,
  } = useApp();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const canEdit =
    currentUser?.role === "superadmin" ||
    currentUser?.role === "admin" ||
    currentUser?.role === "accountant";

  // Read from context — data is already loaded from server on login
  const rawHeadings = getData("feeHeadings") as FeeHeading[];
  const headings = rawHeadings.map((h) => ({
    ...h,
    months: safeArray<string>(h.months as unknown as string[]),
    applicableClasses: h.applicableClasses
      ? safeArray<string>(h.applicableClasses as unknown as string[])
      : undefined,
  }));

  async function save() {
    if (!name.trim() || selectedMonths.length === 0) return;
    setSaving(true);
    try {
      if (editId) {
        await updateData("feeHeadings", editId, {
          name: name.trim(),
          months: selectedMonths,
          applicableClasses: selectedClasses.length > 0 ? selectedClasses : [],
        });
        addNotification("Fee heading updated", "success");
      } else {
        const h: FeeHeading = {
          id: generateId(),
          name: name.trim(),
          months: selectedMonths,
          applicableClasses:
            selectedClasses.length > 0 ? selectedClasses : undefined,
          amount: 0,
        };
        await saveData("feeHeadings", h as unknown as Record<string, unknown>);
        addNotification(`Fee heading "${h.name}" added`, "success");
      }
      resetForm();
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
    await deleteData("feeHeadings", id);
    addNotification("Fee heading deleted", "info");
  }

  function openEdit(h: FeeHeading) {
    setEditId(h.id);
    setName(h.name);
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
    setSelectedMonths([]);
    setSelectedClasses([]);
    setOpen(false);
  }

  const isLoading = false; // data already in context from initial server load

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Fee Heading Design</h3>
          <p className="text-sm text-muted-foreground">
            Define fee headings, applicable months, and classes
          </p>
        </div>
        {canEdit && !isReadOnly && (
          <Button onClick={() => setOpen(true)} data-ocid="add-fee-heading-btn">
            + Add Heading
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="bg-card border border-border rounded-xl p-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          ))}
        </div>
      ) : headings.length === 0 ? (
        <div
          className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground"
          data-ocid="fee-headings.empty_state"
        >
          <p className="text-4xl mb-3">📋</p>
          <p className="text-lg font-medium mb-1">No fee headings yet</p>
          <p className="text-sm">
            Add headings like Tuition Fee, Lab Fee, Library Fee etc.
          </p>
          {canEdit && !isReadOnly && (
            <Button
              className="mt-4"
              onClick={() => setOpen(true)}
              data-ocid="add-fee-heading-empty-btn"
            >
              + Add First Heading
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">#</th>
                <th className="px-4 py-3 text-left font-semibold">
                  Heading Name
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  Applicable Months
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  Applicable Classes
                </th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {headings.map((h, idx) => (
                <tr
                  key={h.id}
                  className="border-t border-border hover:bg-muted/20"
                  data-ocid={`fee-heading-row.item.${idx + 1}`}
                >
                  <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium">{h.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {h.months.map((m) => (
                        <Badge key={m} variant="secondary" className="text-xs">
                          {m.slice(0, 3)}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {h.applicableClasses && h.applicableClasses.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {h.applicableClasses.slice(0, 5).map((c) => (
                          <Badge key={c} variant="outline" className="text-xs">
                            {c}
                          </Badge>
                        ))}
                        {h.applicableClasses.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{h.applicableClasses.length - 5}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        All Classes
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-2 justify-center">
                      {canEdit && !isReadOnly && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(h)}
                            data-ocid={`edit-fee-heading-btn.${idx + 1}`}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => void deleteHeading(h.id)}
                            data-ocid={`delete-fee-heading-btn.${idx + 1}`}
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
            <div>
              <label
                htmlFor="fee-heading-name"
                className="text-sm font-medium mb-1 block"
              >
                Heading Name
              </label>
              <Input
                id="fee-heading-name"
                placeholder="e.g. Tuition Fee, Lab Fee, Library Fee"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-ocid="fee-heading-name-input"
              />
            </div>

            {/* Month selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Applicable Months</span>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setSelectedMonths([...MONTHS])}
                >
                  Select All
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {MONTHS.map((m) => (
                  <label
                    key={m}
                    htmlFor={`month-${m}`}
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <input
                      id={`month-${m}`}
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
                      data-ocid="fee-month-checkbox"
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
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setSelectedClasses([...CLASSES])}
                >
                  Select All
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                {CLASSES.map((c) => (
                  <label
                    key={c}
                    htmlFor={`class-${c}`}
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <input
                      id={`class-${c}`}
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
                      data-ocid="fee-class-checkbox"
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
              <Button variant="outline" onClick={resetForm} disabled={saving}>
                Cancel
              </Button>
              <Button
                onClick={() => void save()}
                disabled={!name.trim() || selectedMonths.length === 0 || saving}
                data-ocid="save-fee-heading-btn"
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
