/**
 * ClassesSections — rebuild using useApp() context
 * All CRUD via saveData / updateData / deleteData (server + context sync)
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  Edit2,
  LayoutGrid,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type { ClassSection } from "../../types";
import { CLASSES, SECTIONS, generateId } from "../../utils/localStorage";

// Canonical sort order for Indian school classes
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

function sortClasses(arr: ClassSection[]): ClassSection[] {
  return [...arr].sort((a, b) => {
    const ai = CLASS_ORDER.indexOf(a.name ?? a.className ?? "");
    const bi = CLASS_ORDER.indexOf(b.name ?? b.className ?? "");
    if (ai === -1 && bi === -1)
      return (a.name ?? "").localeCompare(b.name ?? "");
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

interface ClassModalState {
  open: boolean;
  editing: ClassSection | null;
  name: string;
  sections: string[];
}

export default function ClassesSections() {
  const {
    getData,
    saveData,
    updateData,
    deleteData,
    currentUser,
    currentSession,
  } = useApp();

  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<ClassModalState>({
    open: false,
    editing: null,
    name: "",
    sections: [],
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Read classes from context (server-loaded)
  const rawClasses = getData("classes") as ClassSection[];
  const classes = sortClasses(rawClasses);

  // Normalize a class record: support both `name` and `className` fields
  function normalizeName(cls: ClassSection): string {
    return cls.name ?? cls.className ?? "";
  }
  function normalizeSections(cls: ClassSection): string[] {
    if (Array.isArray(cls.sections)) return cls.sections as string[];
    return [];
  }

  const canWrite =
    currentUser?.role === "superadmin" || currentUser?.role === "admin";

  function openAdd() {
    setModal({ open: true, editing: null, name: "", sections: [] });
  }

  function openEdit(cls: ClassSection) {
    setModal({
      open: true,
      editing: cls,
      name: normalizeName(cls),
      sections: [...normalizeSections(cls)],
    });
  }

  function closeModal() {
    setModal({ open: false, editing: null, name: "", sections: [] });
  }

  function toggleSection(sec: string) {
    setModal((prev) => ({
      ...prev,
      sections: prev.sections.includes(sec)
        ? prev.sections.filter((s) => s !== sec)
        : [...prev.sections, sec],
    }));
  }

  async function handleSave() {
    const trimmedName = modal.name.trim();
    if (!trimmedName) {
      toast.error("Class name is required");
      return;
    }
    // Duplicate check (skip current record when editing)
    const duplicate = classes.find(
      (c) =>
        normalizeName(c).toLowerCase() === trimmedName.toLowerCase() &&
        c.id !== modal.editing?.id,
    );
    if (duplicate) {
      toast.error("A class with this name already exists");
      return;
    }

    setSaving(true);
    try {
      if (modal.editing) {
        await updateData("classes", modal.editing.id, {
          name: trimmedName,
          className: trimmedName,
          sections: modal.sections,
        });
        toast.success(`Class "${trimmedName}" updated`);
      } else {
        const newClass: Record<string, unknown> = {
          id: generateId(),
          name: trimmedName,
          className: trimmedName,
          sections: modal.sections,
          session: currentSession?.label ?? "2025-26",
        };
        await saveData("classes", newClass);
        toast.success(`Class "${trimmedName}" added`);
      }
      closeModal();
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    // Check if students are enrolled
    const students = getData("students") as Array<{ class: string }>;
    const cls = classes.find((c) => c.id === id);
    const clsName = cls ? normalizeName(cls) : "";
    const enrolled = students.filter((s) => s.class === clsName).length;
    if (enrolled > 0) {
      toast.error(
        `Cannot delete: ${enrolled} student(s) enrolled in ${clsName}. Discontinue or move them first.`,
      );
      setDeleteId(null);
      return;
    }
    try {
      await deleteData("classes", id);
      toast.success("Class deleted");
    } catch {
      toast.error("Failed to delete. Please try again.");
    } finally {
      setDeleteId(null);
    }
  }

  async function seedDefaults() {
    if (
      classes.length > 0 &&
      !confirm(
        "Replace existing classes with defaults (Nursery–12, sections A B C)?",
      )
    )
      return;
    setSaving(true);
    try {
      await Promise.allSettled(
        CLASSES.map((cls) =>
          saveData("classes", {
            id: generateId(),
            name: cls,
            className: cls,
            sections: ["A", "B", "C"],
            session: currentSession?.label ?? "2025-26",
          }),
        ),
      );
      toast.success("Default classes loaded");
    } catch {
      toast.error("Some classes may not have saved. Please retry.");
    } finally {
      setSaving(false);
    }
  }

  // Allow adding/removing a section inline without opening the full edit modal
  const [inlineSectionFor, setInlineSectionFor] = useState<string | null>(null);
  const [inlineSection, setInlineSection] = useState("");

  async function handleInlineAddSection(classId: string) {
    if (!inlineSection.trim()) return;
    const cls = classes.find((c) => c.id === classId);
    if (!cls) return;
    const existing = normalizeSections(cls);
    const upper = inlineSection.trim().toUpperCase();
    if (existing.includes(upper)) {
      toast.error("Section already exists");
      return;
    }
    const updated = [...existing, upper];
    await updateData("classes", classId, { sections: updated });
    setInlineSectionFor(null);
    setInlineSection("");
    toast.success(`Section ${upper} added`);
  }

  async function handleRemoveSection(classId: string, sec: string) {
    const cls = classes.find((c) => c.id === classId);
    if (!cls) return;
    const updated = normalizeSections(cls).filter((s) => s !== sec);
    await updateData("classes", classId, { sections: updated });
    toast.success(`Section ${sec} removed`);
  }

  // Keep refreshing from context on every render (context is live)
  useEffect(() => {
    // context already has latest data from server via syncEngine subscription
  }, []);

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold font-display text-foreground flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-primary" />
            Classes &amp; Sections
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {classes.length} class{classes.length !== 1 ? "es" : ""} configured
          </p>
        </div>
        {canWrite && (
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={seedDefaults}
              disabled={saving}
              data-ocid="classes.load-defaults-btn"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : null}
              Add Standard Classes
            </Button>
            <Button
              size="sm"
              onClick={openAdd}
              data-ocid="classes.add-class-btn"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Class
            </Button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {classes.length === 0 && (
        <Card className="p-12 text-center" data-ocid="classes.empty_state">
          <LayoutGrid className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="font-semibold text-foreground">No classes yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
            Add classes here first — they'll appear in the Student form's class
            dropdown.
          </p>
          {canWrite && (
            <Button className="mt-4" size="sm" onClick={seedDefaults}>
              Add Standard Classes (Nursery–12, A B C)
            </Button>
          )}
        </Card>
      )}

      {/* Class Cards */}
      {classes.length > 0 && (
        <div className="space-y-3">
          {classes.map((cls, idx) => {
            const name = normalizeName(cls);
            const sections = normalizeSections(cls);
            const displayName =
              name === "Nursery" || name === "LKG" || name === "UKG"
                ? name
                : `Class ${name}`;
            return (
              <Card
                key={cls.id}
                className="p-4"
                data-ocid={`classes.item.${idx + 1}`}
              >
                <div className="flex items-start gap-4 flex-wrap">
                  {/* Class name + section count */}
                  <div className="min-w-[120px]">
                    <p className="font-semibold text-foreground">
                      {displayName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {sections.length} section
                      {sections.length !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Section badges */}
                  <div className="flex-1 flex flex-wrap gap-2 items-center min-w-0">
                    {sections.map((sec) => (
                      <Badge
                        key={sec}
                        variant="secondary"
                        className="flex items-center gap-1 font-medium"
                      >
                        {name}-{sec}
                        {canWrite && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSection(cls.id, sec)}
                            className="ml-0.5 hover:text-destructive transition-colors"
                            aria-label={`Remove section ${sec}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </Badge>
                    ))}

                    {/* Inline add section */}
                    {canWrite &&
                      (inlineSectionFor === cls.id ? (
                        <div className="flex gap-1 items-center">
                          <select
                            className="border border-input rounded px-2 py-1 text-xs bg-card h-7"
                            value={inlineSection}
                            onChange={(e) => setInlineSection(e.target.value)}
                            ref={(el) => {
                              el?.focus();
                            }}
                          >
                            <option value="">Section</option>
                            {SECTIONS.filter((s) => !sections.includes(s)).map(
                              (s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ),
                            )}
                          </select>
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleInlineAddSection(cls.id)}
                            disabled={!inlineSection}
                          >
                            Add
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => {
                              setInlineSectionFor(null);
                              setInlineSection("");
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setInlineSectionFor(cls.id);
                            setInlineSection("");
                          }}
                          className="text-xs text-primary hover:underline flex items-center gap-1 transition-colors"
                          data-ocid={`classes.add-section-btn.${idx + 1}`}
                        >
                          <Plus className="w-3 h-3" />
                          Add Section
                        </button>
                      ))}
                  </div>

                  {/* Action buttons */}
                  {canWrite && (
                    <div className="flex gap-1 ml-auto shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(cls)}
                        data-ocid={`classes.edit_button.${idx + 1}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(cls.id)}
                        data-ocid={`classes.delete_button.${idx + 1}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="bg-card rounded-xl shadow-lg w-full max-w-md p-6 space-y-5"
            data-ocid="classes.dialog"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg font-display text-foreground">
                {modal.editing ? "Edit Class" : "Add New Class"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-muted-foreground hover:text-foreground"
                data-ocid="classes.close_button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Class Name */}
            <div className="space-y-1.5">
              <label htmlFor="class-name" className="text-sm font-medium">
                Class Name <span className="text-destructive">*</span>
              </label>
              {modal.editing ? (
                <Input
                  id="class-name"
                  value={modal.name}
                  onChange={(e) =>
                    setModal((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. 1, 6, Nursery, LKG"
                  data-ocid="classes.name-input"
                />
              ) : (
                <select
                  id="class-name"
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-card"
                  value={modal.name}
                  onChange={(e) =>
                    setModal((prev) => ({ ...prev, name: e.target.value }))
                  }
                  data-ocid="classes.name-select"
                >
                  <option value="">Select class…</option>
                  {CLASSES.filter(
                    (c) =>
                      !classes.find(
                        (x) =>
                          normalizeName(x).toLowerCase() === c.toLowerCase(),
                      ),
                  ).map((c) => (
                    <option key={c} value={c}>
                      {c === "Nursery" || c === "LKG" || c === "UKG"
                        ? c
                        : `Class ${c}`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Sections */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Sections</span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setModal((prev) => ({ ...prev, sections: [...SECTIONS] }))
                    }
                    className="text-xs text-primary hover:underline"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setModal((prev) => ({ ...prev, sections: [] }))
                    }
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {SECTIONS.map((sec) => (
                  <label
                    key={sec}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border transition-colors ${
                      modal.sections.includes(sec)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-muted-foreground hover:border-primary"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={modal.sections.includes(sec)}
                      onChange={() => toggleSection(sec)}
                    />
                    Section {sec}
                  </label>
                ))}
              </div>
              {modal.sections.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Selected: {modal.sections.join(", ")}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleSave}
                disabled={saving || !modal.name}
                data-ocid="classes.save_button"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {modal.editing ? "Update Class" : "Save Class"}
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={closeModal}
                data-ocid="classes.cancel_button"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="bg-card rounded-xl shadow-lg w-full max-w-sm p-6 space-y-4"
            data-ocid="classes.delete-confirm-dialog"
          >
            <h3 className="font-bold text-foreground">Delete Class?</h3>
            <p className="text-sm text-muted-foreground">
              This will permanently delete the class and all its sections. This
              cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteId)}
                data-ocid="classes.confirm_button"
              >
                Delete
              </Button>
              <Button
                variant="ghost"
                onClick={() => setDeleteId(null)}
                data-ocid="classes.cancel_button"
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
