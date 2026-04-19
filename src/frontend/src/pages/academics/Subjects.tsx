/**
 * Subjects — rebuild using useApp() context
 * All CRUD via saveData / updateData / deleteData
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BookOpen, Edit2, Loader2, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type { ClassSection, Subject } from "../../types";
import { CLASSES, generateId } from "../../utils/localStorage";

// Stable sort order for classes
const CLASS_ORDER = [
  "Nursery",
  "LKG",
  "UKG",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
];

function sortClassList(list: string[]): string[] {
  return [...list].sort((a, b) => {
    const ai = CLASS_ORDER.indexOf(a);
    const bi = CLASS_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

interface FormState {
  open: boolean;
  editing: Subject | null;
  name: string;
  code: string;
  classes: string[];
}

export default function Subjects() {
  const { getData, saveData, updateData, deleteData, currentUser } = useApp();
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>({
    open: false,
    editing: null,
    name: "",
    code: "",
    classes: [],
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const subjects = getData("subjects") as Subject[];
  // Get available classes from the classes collection
  const classesData = getData("classes") as ClassSection[];
  const availableClasses =
    classesData.length > 0
      ? classesData.map((c) => c.name ?? c.className ?? "").filter(Boolean)
      : CLASSES;

  const canWrite =
    currentUser?.role === "superadmin" || currentUser?.role === "admin";

  const filtered = subjects.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  function openAdd() {
    setForm({ open: true, editing: null, name: "", code: "", classes: [] });
  }

  function openEdit(sub: Subject) {
    setForm({
      open: true,
      editing: sub,
      name: sub.name,
      code: sub.code ?? "",
      classes: [...sub.classes],
    });
  }

  function closeForm() {
    setForm({ open: false, editing: null, name: "", code: "", classes: [] });
  }

  function toggleClass(cls: string) {
    setForm((prev) => ({
      ...prev,
      classes: prev.classes.includes(cls)
        ? prev.classes.filter((c) => c !== cls)
        : [...prev.classes, cls],
    }));
  }

  async function handleSave() {
    const trimName = form.name.trim();
    if (!trimName) {
      toast.error("Subject name is required");
      return;
    }
    if (form.classes.length === 0) {
      toast.error("Select at least one class");
      return;
    }
    setSaving(true);
    try {
      if (form.editing) {
        await updateData("subjects", form.editing.id, {
          name: trimName,
          code: form.code.trim() || undefined,
          classes: form.classes,
        });
        toast.success(`Subject "${trimName}" updated`);
      } else {
        const newSub: Record<string, unknown> = {
          id: generateId(),
          name: trimName,
          code: form.code.trim() || undefined,
          classes: form.classes,
        };
        await saveData("subjects", newSub);
        toast.success(`Subject "${trimName}" added`);
      }
      closeForm();
    } catch {
      toast.error("Failed to save subject. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteData("subjects", id);
      toast.success("Subject deleted");
    } catch {
      toast.error("Failed to delete subject.");
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold font-display text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Subjects
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Define subjects and assign them to classes
          </p>
        </div>
        {canWrite && (
          <Button size="sm" onClick={openAdd} data-ocid="subjects.add_button">
            <Plus className="w-4 h-4 mr-1" />
            Add Subject
          </Button>
        )}
      </div>

      {/* Search */}
      <Input
        placeholder="Search subjects…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
        data-ocid="subjects.search_input"
      />

      {/* Empty state */}
      {filtered.length === 0 && (
        <Card className="p-10 text-center" data-ocid="subjects.empty_state">
          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            {search
              ? "No subjects match your search."
              : "No subjects added yet."}
          </p>
        </Card>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                  Subject Name
                </th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">
                  Code
                </th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                  Classes
                </th>
                {canWrite && (
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub, idx) => (
                <tr
                  key={sub.id}
                  className={idx % 2 === 0 ? "bg-card" : "bg-muted/20"}
                  data-ocid={`subjects.item.${idx + 1}`}
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {sub.name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell font-mono text-xs">
                    {sub.code ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {sortClassList(sub.classes).map((cls) => (
                        <Badge
                          key={cls}
                          variant="secondary"
                          className="text-xs"
                        >
                          {cls === "Nursery" || cls === "LKG" || cls === "UKG"
                            ? cls
                            : `Cl. ${cls}`}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(sub)}
                          data-ocid={`subjects.edit_button.${idx + 1}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(sub.id)}
                          data-ocid={`subjects.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {form.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="bg-card rounded-xl shadow-lg w-full max-w-lg p-6 space-y-5"
            data-ocid="subjects.dialog"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg font-display text-foreground">
                {form.editing ? "Edit Subject" : "New Subject"}
              </h3>
              <button
                type="button"
                onClick={closeForm}
                className="text-muted-foreground hover:text-foreground"
                data-ocid="subjects.close_button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label htmlFor="subject-name" className="text-sm font-medium">
                  Subject Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="subject-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Hindi, Mathematics"
                  data-ocid="subjects.name_input"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="subject-code" className="text-sm font-medium">
                  Code (optional)
                </label>
                <Input
                  id="subject-code"
                  value={form.code}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, code: e.target.value }))
                  }
                  placeholder="e.g. HIN, MAT"
                  data-ocid="subjects.code_input"
                />
              </div>
            </div>

            {/* Class multi-select */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Taught in Classes <span className="text-destructive">*</span>
                </span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        classes: [...availableClasses],
                      }))
                    }
                    className="text-xs text-primary hover:underline"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, classes: [] }))
                    }
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableClasses.map((cls) => (
                  <label
                    key={cls}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border transition-colors ${
                      form.classes.includes(cls)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-muted-foreground hover:border-primary"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={form.classes.includes(cls)}
                      onChange={() => toggleClass(cls)}
                    />
                    {cls === "Nursery" || cls === "LKG" || cls === "UKG"
                      ? cls
                      : `Class ${cls}`}
                  </label>
                ))}
              </div>
              {form.classes.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Selected: {sortClassList(form.classes).join(", ")}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleSave}
                disabled={
                  saving || !form.name.trim() || form.classes.length === 0
                }
                data-ocid="subjects.save_button"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {form.editing ? "Update Subject" : "Save Subject"}
              </Button>
              <Button
                variant="ghost"
                onClick={closeForm}
                data-ocid="subjects.cancel_button"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-xl shadow-lg w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-foreground">Delete Subject?</h3>
            <p className="text-sm text-muted-foreground">
              This will permanently remove the subject. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteId)}
                data-ocid="subjects.confirm_button"
              >
                Delete
              </Button>
              <Button
                variant="ghost"
                onClick={() => setDeleteId(null)}
                data-ocid="subjects.cancel_button"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
