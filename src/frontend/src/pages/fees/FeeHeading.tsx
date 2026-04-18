import { useEffect, useState, useSyncExternalStore } from "react";
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
import { dataService } from "../../utils/dataService";
import { CLASSES, MONTHS, generateId, ls } from "../../utils/localStorage";

export default function FeeHeadingPage() {
  const { isReadOnly, currentUser } = useApp();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  // Subscribe to DataService so the list re-renders after server writes
  useSyncExternalStore(dataService.subscribe.bind(dataService), () =>
    dataService.getMode(),
  );
  const headingsDs = dataService.get<FeeHeading>("fee_heads");
  const headingsDs2 = dataService.get<FeeHeading>("fee_headings");
  const dsHeadings = headingsDs.length > 0 ? headingsDs : headingsDs2;
  const headings =
    dsHeadings.length > 0
      ? dsHeadings
      : ls.get<FeeHeading[]>("fee_headings", []);

  const canEdit =
    currentUser?.role === "superadmin" ||
    currentUser?.role === "admin" ||
    currentUser?.role === "accountant";

  useEffect(() => {
    // Warm up cache from localStorage on first render if dataService not ready
    void dataService.refresh("fee_headings").catch(() => {
      /* best-effort */
    });
  }, []);

  async function save() {
    if (!name.trim() || selectedMonths.length === 0) return;
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
      // Save via DataService FIRST (server-first write, updates cache + ls)
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
      // Save via DataService FIRST (server-first write, updates cache + ls)
      await dataService.save(
        "fee_headings",
        h as unknown as Record<string, unknown>,
      );
    }
    resetForm();
  }

  async function deleteHeading(id: string) {
    if (
      !confirm(
        "Delete this fee heading? This will also remove it from all fee plans.",
      )
    )
      return;
    // Delete via DataService (server-first)
    await dataService.delete("fee_headings", id);
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

      {headings.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
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
                  data-ocid="fee-heading-row"
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
                            data-ocid="edit-fee-heading-btn"
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => deleteHeading(h.id)}
                            data-ocid="delete-fee-heading-btn"
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
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button
                onClick={save}
                disabled={!name.trim() || selectedMonths.length === 0}
                data-ocid="save-fee-heading-btn"
              >
                {editId ? "Update" : "Add"} Heading
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
