import { useCallback, useEffect, useState } from "react";
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
import { dataService } from "../../utils/dataService";
import { CLASSES, MONTHS, generateId } from "../../utils/localStorage";

export default function FeeHeadingPage() {
  const { isReadOnly, currentUser } = useApp();
  const [headings, setHeadings] = useState<FeeHeading[]>([]);
  const [loading, setLoading] = useState(true);
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

  // ── Fetch headings from server on mount (getAsync always hits the server) ─────
  const loadHeadings = useCallback(async () => {
    setLoading(true);
    try {
      const fromServer = await dataService.getAsync<FeeHeading>("fee_headings");
      if (fromServer.length > 0) {
        setHeadings(fromServer);
      } else {
        const fromAlt = await dataService.getAsync<FeeHeading>("fee_heads");
        setHeadings(fromAlt);
      }
    } catch {
      setHeadings(dataService.get<FeeHeading>("fee_headings"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHeadings();
  }, [loadHeadings]);

  async function save() {
    if (!name.trim() || selectedMonths.length === 0) return;
    setSaving(true);
    try {
      if (editId) {
        const existing = headings.find((h) => h.id === editId);
        if (!existing) return;
        const updated: FeeHeading = {
          ...existing,
          name: name.trim(),
          months: selectedMonths,
          applicableClasses:
            selectedClasses.length > 0 ? selectedClasses : undefined,
        };
        await dataService.update(
          "fee_headings",
          editId,
          updated as unknown as Record<string, unknown>,
        );
      } else {
        const h: FeeHeading = {
          id: generateId(),
          name: name.trim(),
          months: selectedMonths,
          applicableClasses:
            selectedClasses.length > 0 ? selectedClasses : undefined,
          amount: 0,
        };
        await dataService.save(
          "fee_headings",
          h as unknown as Record<string, unknown>,
        );
      }
      // Re-fetch from server after save to confirm persisted data
      await loadHeadings();
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
    await dataService.delete("fee_headings", id);
    // Re-fetch from server to reflect deletion
    await loadHeadings();
  }

  function openEdit(h: FeeHeading) {
    setEditId(h.id);
    setName(h.name);
    setSelectedMonths([...h.months]);
    setSelectedClasses(h.applicableClasses ? [...h.applicableClasses] : []);
    setOpen(true);
  }

  function resetForm() {
    setEditId(null);
    setName("");
    setSelectedMonths([]);
    setSelectedClasses([]);
    setOpen(false);
  }

  function toggleMonth(m: string) {
    setSelectedMonths((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );
  }

  function toggleClass(c: string) {
    setSelectedClasses((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  }

  function selectAllMonths() {
    setSelectedMonths([...MONTHS]);
  }

  function selectAllClasses() {
    setSelectedClasses([...CLASSES]);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Fee Heading Design</h3>
          <p className="text-sm text-muted-foreground">
            Define fee headings, the months they apply to, and which classes
          </p>
        </div>
        {canEdit && !isReadOnly && (
          <Button onClick={() => setOpen(true)} data-ocid="add-fee-heading-btn">
            + Add Heading
          </Button>
        )}
      </div>

      {loading ? (
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
          <p className="text-lg mb-1">No fee headings yet</p>
          <p className="text-sm">
            Add headings like Tuition Fee, Lab Fee, etc.
          </p>
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
                      {(Array.isArray(h.months)
                        ? h.months
                        : typeof h.months === "string"
                          ? JSON.parse(h.months as unknown as string)
                          : []
                      ).map((m: string) => (
                        <Badge key={m} variant="secondary" className="text-xs">
                          {m.slice(0, 3)}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {h.applicableClasses && h.applicableClasses.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(h.applicableClasses)
                          ? h.applicableClasses
                          : typeof h.applicableClasses === "string"
                            ? JSON.parse(
                                h.applicableClasses as unknown as string,
                              )
                            : []
                        )
                          .slice(0, 5)
                          .map((c: string) => (
                            <Badge
                              key={c}
                              variant="outline"
                              className="text-xs"
                            >
                              {c}
                            </Badge>
                          ))}
                        {(Array.isArray(h.applicableClasses)
                          ? h.applicableClasses
                          : []
                        ).length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +
                            {(Array.isArray(h.applicableClasses)
                              ? h.applicableClasses
                              : []
                            ).length - 5}
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
                  onClick={selectAllMonths}
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
                      onChange={() => toggleMonth(m)}
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
                  onClick={selectAllClasses}
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
                      onChange={() => toggleClass(c)}
                      className="accent-primary"
                      data-ocid="fee-class-checkbox"
                    />
                    {c}
                  </label>
                ))}
              </div>
              {selectedClasses.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  No classes selected — this heading will apply to all classes
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
