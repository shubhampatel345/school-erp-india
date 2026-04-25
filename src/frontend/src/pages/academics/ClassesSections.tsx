/**
 * ClassesSections — Direct API rebuild
 * All CRUD via phpApiService.getClasses/saveClass/addSection/getSections.
 * Waits for HTTP 200 before success. Indian class order (Nursery → Class 12).
 * Supports Enable/Disable toggle per class.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  Edit2,
  LayoutGrid,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type { ClassRecord } from "../../utils/phpApiService";
import phpApiService from "../../utils/phpApiService";

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

function sortClasses(arr: ClassRecord[]): ClassRecord[] {
  return [...arr].sort((a, b) => {
    const ai = CLASS_ORDER.indexOf(a.className);
    const bi = CLASS_ORDER.indexOf(b.className);
    if (ai === -1 && bi === -1) return a.className.localeCompare(b.className);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

function displayClassName(name: string) {
  return ["Nursery", "LKG", "UKG"].includes(name) ? name : `Class ${name}`;
}

const PREDEFINED_CLASSES = CLASS_ORDER;
const PREDEFINED_SECTIONS = ["A", "B", "C", "D", "E", "F"];

interface ClassModalState {
  open: boolean;
  editing: ClassRecord | null;
  name: string;
  customName: string;
  sections: string[];
  newSection: string;
  isEnabled: boolean;
  /** Error message to show inside modal without closing */
  saveError: string | null;
}

interface SectionModalState {
  open: boolean;
  classId: string;
  className: string;
  name: string;
}

export default function ClassesSections() {
  const { currentUser } = useApp();

  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [classModal, setClassModal] = useState<ClassModalState>({
    open: false,
    editing: null,
    name: "",
    customName: "",
    sections: [],
    newSection: "",
    isEnabled: true,
    saveError: null,
  });
  const [sectionModal, setSectionModal] = useState<SectionModalState>({
    open: false,
    classId: "",
    className: "",
    name: "",
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canWrite =
    currentUser?.role === "superadmin" || currentUser?.role === "admin";

  const loadClasses = useCallback(() => {
    setLoading(true);
    phpApiService
      .getClasses()
      .then((data) => setClasses(sortClasses(data)))
      .catch(() => toast.error("Failed to load classes"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const sortedClasses = sortClasses(classes);
  const usedClassNames = new Set(classes.map((c) => c.className));

  // Class modal helpers
  function openAddClass() {
    setClassModal({
      open: true,
      editing: null,
      name: "",
      customName: "",
      sections: ["A"],
      newSection: "",
      isEnabled: true,
      saveError: null,
    });
  }

  function openEditClass(cls: ClassRecord) {
    setClassModal({
      open: true,
      editing: cls,
      name: CLASS_ORDER.includes(cls.className) ? cls.className : "__custom__",
      customName: CLASS_ORDER.includes(cls.className) ? "" : cls.className,
      sections: [...(cls.sections as string[])],
      newSection: "",
      isEnabled: (cls as Record<string, unknown>).isEnabled !== false,
      saveError: null,
    });
  }

  function toggleSection(s: string) {
    setClassModal((prev) => ({
      ...prev,
      sections: prev.sections.includes(s)
        ? prev.sections.filter((x) => x !== s)
        : [...prev.sections, s],
    }));
  }

  function addCustomSection() {
    const s = classModal.newSection.trim().toUpperCase();
    if (!s) return;
    if (classModal.sections.includes(s)) {
      toast.error("Section already added");
      return;
    }
    setClassModal((prev) => ({
      ...prev,
      sections: [...prev.sections, s],
      newSection: "",
    }));
  }

  async function handleSaveClass() {
    // Clear previous error
    setClassModal((p) => ({ ...p, saveError: null }));

    const finalName =
      classModal.name === "__custom__"
        ? classModal.customName.trim()
        : classModal.name;
    if (!finalName) {
      setClassModal((p) => ({ ...p, saveError: "Class name is required." }));
      return;
    }
    if (classModal.sections.length === 0) {
      setClassModal((p) => ({
        ...p,
        saveError: "At least one section is required.",
      }));
      return;
    }
    if (!classModal.editing && usedClassNames.has(finalName)) {
      setClassModal((p) => ({
        ...p,
        saveError: `${displayClassName(finalName)} already exists.`,
      }));
      return;
    }
    setSaving(true);
    try {
      if (classModal.editing) {
        // PUT classes/update — PHP expects 'name' and 'is_enabled'
        await phpApiService.put("classes/update", {
          id: classModal.editing.id,
          name: finalName,
          className: finalName, // send both for broad PHP compatibility
          sections: classModal.sections,
          is_enabled: classModal.isEnabled ? 1 : 0,
          isEnabled: classModal.isEnabled,
        });
        toast.success(`${displayClassName(finalName)} updated`);
      } else {
        // POST classes/add — PHP expects 'name' (not 'className') and 'is_enabled'
        await phpApiService.addClass({
          name: finalName,
          className: finalName, // send both for broad compatibility
          sections: classModal.sections,
          is_enabled: classModal.isEnabled ? 1 : 0,
          isEnabled: classModal.isEnabled,
        });
        toast.success(`${displayClassName(finalName)} added`);
      }
      setClassModal((prev) => ({ ...prev, open: false }));
      loadClasses();
    } catch (err) {
      // Show error inside modal — do NOT close and do NOT show "Session expired"
      let msg = "Failed to save class. Please retry.";
      if (err instanceof Error) {
        // Exclude generic session expired message from inline form error
        const isSessionError =
          err.message.toLowerCase().includes("session expired") ||
          err.message.toLowerCase().includes("please log in");
        msg = isSessionError
          ? "Authentication error — please refresh the page and try again."
          : err.message;
      }
      setClassModal((p) => ({ ...p, saveError: msg }));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteClass(cls: ClassRecord) {
    if (
      !confirm(
        `Delete ${displayClassName(cls.className)} and all its sections?`,
      )
    )
      return;
    setDeletingId(cls.id);
    try {
      await phpApiService.del("classes/delete", { id: cls.id });
      toast.success(`${displayClassName(cls.className)} deleted`);
      loadClasses();
    } catch {
      toast.error("Failed to delete class. Please retry.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleEnabled(cls: ClassRecord) {
    const nowEnabled = (cls as Record<string, unknown>).isEnabled !== false;
    try {
      await phpApiService.put("classes/update", {
        id: cls.id,
        is_enabled: nowEnabled ? 0 : 1, // send 0/1 for PHP
        isEnabled: !nowEnabled, // send boolean for broad compatibility
      });
      toast.success(
        `${displayClassName(cls.className)} ${!nowEnabled ? "enabled" : "disabled"}`,
      );
      loadClasses();
    } catch {
      toast.error("Failed to update class status.");
    }
  }

  // Section modal
  function openAddSection(cls: ClassRecord) {
    setSectionModal({
      open: true,
      classId: cls.id,
      className: cls.className,
      name: "",
    });
  }

  async function handleSaveSection() {
    if (!sectionModal.name.trim()) {
      toast.error("Section name is required");
      return;
    }
    setSaving(true);
    try {
      await phpApiService.addSection({
        classId: sectionModal.classId,
        name: sectionModal.name.trim().toUpperCase(),
      });
      toast.success(
        `Section ${sectionModal.name.toUpperCase()} added to ${displayClassName(sectionModal.className)}`,
      );
      setSectionModal((prev) => ({ ...prev, open: false }));
      loadClasses();
    } catch {
      toast.error("Failed to add section. Please retry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display font-bold text-foreground">
            Classes &amp; Sections
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {sortedClasses.length} classes configured
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={loadClasses}
            aria-label="Refresh"
            data-ocid="classes.refresh.button"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {canWrite && (
            <Button
              size="sm"
              onClick={openAddClass}
              data-ocid="classes.add.button"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Class
            </Button>
          )}
        </div>
      </div>

      {/* Classes Grid */}
      {loading ? (
        <div
          className="flex items-center justify-center py-20"
          data-ocid="classes.loading_state"
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : sortedClasses.length === 0 ? (
        <Card
          className="p-12 text-center border-dashed"
          data-ocid="classes.empty_state"
        >
          <LayoutGrid className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-semibold text-foreground">No classes configured</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add your first class to get started
          </p>
          {canWrite && (
            <Button
              size="sm"
              className="mt-4"
              onClick={openAddClass}
              data-ocid="classes.add-first.button"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add First Class
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedClasses.map((cls, idx) => {
            const isEnabled =
              (cls as Record<string, unknown>).isEnabled !== false;
            return (
              <Card
                key={cls.id}
                className={`p-4 transition-opacity ${!isEnabled ? "opacity-60" : ""}`}
                data-ocid={`classes.item.${idx + 1}`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-display font-semibold text-foreground">
                      {displayClassName(cls.className)}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs text-muted-foreground">
                        {(cls.sections as string[]).length} section
                        {(cls.sections as string[]).length !== 1 ? "s" : ""}
                      </p>
                      {/* Enabled/Disabled badge */}
                      <Badge
                        variant={isEnabled ? "default" : "secondary"}
                        className={`text-[9px] px-1.5 py-0 cursor-pointer select-none ${
                          isEnabled
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/20"
                            : "hover:bg-muted"
                        }`}
                        onClick={() =>
                          canWrite ? void handleToggleEnabled(cls) : undefined
                        }
                        title={
                          canWrite
                            ? isEnabled
                              ? "Click to disable"
                              : "Click to enable"
                            : undefined
                        }
                      >
                        {isEnabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  </div>
                  {canWrite && (
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => openEditClass(cls)}
                        data-ocid={`classes.edit.${idx + 1}`}
                        aria-label="Edit class"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        disabled={deletingId === cls.id}
                        onClick={() => void handleDeleteClass(cls)}
                        data-ocid={`classes.delete.${idx + 1}`}
                        aria-label="Delete class"
                      >
                        {deletingId === cls.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(cls.sections as string[]).map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>

                {canWrite && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-7 text-xs"
                    onClick={() => openAddSection(cls)}
                    data-ocid={`classes.add-section.${idx + 1}`}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Section
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Class Modal */}
      {classModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          data-ocid="classes.dialog"
        >
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-display font-semibold text-foreground">
                {classModal.editing ? "Edit Class" : "Add Class"}
              </h2>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setClassModal((p) => ({ ...p, open: false }))}
                data-ocid="classes.close_button"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-5 space-y-4">
              {/* Class name picker */}
              <div className="space-y-1">
                <Label className="text-xs">Class Name *</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {PREDEFINED_CLASSES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        setClassModal((p) => ({
                          ...p,
                          name: c,
                          customName: "",
                          saveError: null,
                        }))
                      }
                      disabled={!classModal.editing && usedClassNames.has(c)}
                      className={`py-1.5 rounded-md text-xs font-medium border transition-colors ${
                        classModal.name === c
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-transparent border-border text-foreground hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed"
                      }`}
                    >
                      {displayClassName(c)}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setClassModal((p) => ({
                        ...p,
                        name: "__custom__",
                        saveError: null,
                      }))
                    }
                    className={`py-1.5 rounded-md text-xs font-medium border transition-colors col-span-2 ${
                      classModal.name === "__custom__"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent border-border text-foreground hover:bg-muted/50"
                    }`}
                  >
                    + Custom
                  </button>
                </div>
                {classModal.name === "__custom__" && (
                  <Input
                    className="mt-2"
                    placeholder="Enter class name"
                    value={classModal.customName}
                    onChange={(e) =>
                      setClassModal((p) => ({
                        ...p,
                        customName: e.target.value,
                        saveError: null,
                      }))
                    }
                    data-ocid="classes.custom-name.input"
                  />
                )}
              </div>

              {/* Sections */}
              <div className="space-y-2">
                <Label className="text-xs">Sections *</Label>
                <div className="flex flex-wrap gap-1.5">
                  {PREDEFINED_SECTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSection(s)}
                      className={`w-9 h-9 rounded-md text-sm font-semibold border transition-colors ${
                        classModal.sections.includes(s)
                          ? "bg-accent text-accent-foreground border-accent"
                          : "bg-transparent border-border text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Custom section (e.g. G)"
                    value={classModal.newSection}
                    onChange={(e) =>
                      setClassModal((p) => ({
                        ...p,
                        newSection: e.target.value,
                      }))
                    }
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomSection();
                      }
                    }}
                    data-ocid="classes.new-section.input"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addCustomSection}
                    data-ocid="classes.add-custom-section.button"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {classModal.sections
                    .filter((s) => !PREDEFINED_SECTIONS.includes(s))
                    .map((s) => (
                      <Badge
                        key={s}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() =>
                            setClassModal((p) => ({
                              ...p,
                              sections: p.sections.filter((x) => x !== s),
                            }))
                          }
                          className="hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                </div>
              </div>

              {/* Enable / Disable toggle */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Class Status
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {classModal.isEnabled
                      ? "This class is active and visible in dropdowns"
                      : "This class is hidden from student dropdowns"}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={classModal.isEnabled}
                  onClick={() =>
                    setClassModal((p) => ({
                      ...p,
                      isEnabled: !p.isEnabled,
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    classModal.isEnabled
                      ? "bg-primary border-primary"
                      : "bg-muted border-border"
                  }`}
                  data-ocid="classes.enabled.toggle"
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      classModal.isEnabled ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* Inline save error */}
              {classModal.saveError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-2.5 text-sm text-destructive">
                  {classModal.saveError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setClassModal((p) => ({ ...p, open: false }))}
                data-ocid="classes.cancel_button"
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleSaveClass()}
                disabled={
                  saving ||
                  // Disabled only when class name is not yet selected
                  classModal.name === "" ||
                  (classModal.name === "__custom__" &&
                    classModal.customName.trim() === "")
                }
                data-ocid="classes.submit_button"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {classModal.editing ? "Save Class" : "Save Class"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Section Modal */}
      {sectionModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          data-ocid="classes.section-dialog"
        >
          <div className="bg-card rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">
                Add Section — {displayClassName(sectionModal.className)}
              </h3>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSectionModal((p) => ({ ...p, open: false }))}
                data-ocid="classes.section-close_button"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 space-y-3">
              <Label className="text-xs">Section Name *</Label>
              <Input
                placeholder="e.g. D"
                value={sectionModal.name}
                onChange={(e) =>
                  setSectionModal((p) => ({
                    ...p,
                    name: e.target.value.toUpperCase(),
                  }))
                }
                data-ocid="classes.section-name.input"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSaveSection();
                }}
              />
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setSectionModal((p) => ({ ...p, open: false }))}
                data-ocid="classes.section-cancel_button"
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleSaveSection()}
                disabled={saving}
                data-ocid="classes.section-submit_button"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Add Section"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
