/**
 * Classes — Full rebuild with correct API field names.
 * POST body uses 'name' (NOT 'className') per API contract.
 * Enable/Disable toggle + Save button work reliably.
 * Error messages are descriptive — never "Session expired" on API errors.
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

// Indian school class order — short names as stored in DB
const CLASS_ORDER_SHORT = [
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

// Display names (Class prefix for numeric ones)
function displayName(raw: string): string {
  if (["Nursery", "LKG", "UKG"].includes(raw)) return raw;
  // Handle "Class 1" style stored names
  if (raw.startsWith("Class ")) return raw;
  // Numeric only → "Class N"
  if (/^\d+$/.test(raw)) return `Class ${raw}`;
  return raw;
}

// Sort ClassRecord array by Indian school order
function sortClasses(arr: ClassRecord[]): ClassRecord[] {
  return [...arr].sort((a, b) => {
    const nameA = a.className ?? "";
    const nameB = b.className ?? "";
    // Normalise for lookup: strip "Class " prefix if present
    const keyA = nameA.startsWith("Class ")
      ? nameA.replace("Class ", "")
      : nameA;
    const keyB = nameB.startsWith("Class ")
      ? nameB.replace("Class ", "")
      : nameB;
    const ai = CLASS_ORDER_SHORT.indexOf(keyA);
    const bi = CLASS_ORDER_SHORT.indexOf(keyB);
    if (ai === -1 && bi === -1) return nameA.localeCompare(nameB);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

const PREDEFINED_SECTIONS = ["A", "B", "C", "D", "E", "F"];

interface ClassModal {
  open: boolean;
  editing: ClassRecord | null;
  nameKey: string; // key in CLASS_ORDER_SHORT or "__custom__"
  customName: string;
  sections: string[];
  newSection: string;
  isEnabled: boolean;
  error: string | null;
}

const BLANK_MODAL: ClassModal = {
  open: false,
  editing: null,
  nameKey: "",
  customName: "",
  sections: ["A"],
  newSection: "",
  isEnabled: true,
  error: null,
};

export default function Classes() {
  const { currentUser } = useApp();
  const canWrite =
    currentUser?.role === "superadmin" || currentUser?.role === "admin";

  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [modal, setModal] = useState<ClassModal>(BLANK_MODAL);

  // ── Data load ────────────────────────────────────────────────────────────────
  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await phpApiService.getClasses();
      setClasses(sortClasses(data));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load classes";
      toast.error(
        msg.includes("expired")
          ? "Failed to load classes — please refresh"
          : msg,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  const usedNames = new Set(
    classes.map((c) => {
      const raw = c.className ?? "";
      return raw.startsWith("Class ") ? raw.replace("Class ", "") : raw;
    }),
  );

  // ── Modal helpers ─────────────────────────────────────────────────────────────
  function openAdd() {
    setModal({ ...BLANK_MODAL, open: true });
  }

  function openEdit(cls: ClassRecord) {
    const raw = cls.className ?? "";
    const key = raw.startsWith("Class ") ? raw.replace("Class ", "") : raw;
    const isPredefined = CLASS_ORDER_SHORT.includes(key);
    setModal({
      open: true,
      editing: cls,
      nameKey: isPredefined ? key : "__custom__",
      customName: isPredefined ? "" : raw,
      sections: [...(cls.sections as string[])],
      newSection: "",
      isEnabled: (cls as Record<string, unknown>).isEnabled !== false,
      error: null,
    });
  }

  function toggleSection(s: string) {
    setModal((prev) => ({
      ...prev,
      sections: prev.sections.includes(s)
        ? prev.sections.filter((x) => x !== s)
        : [...prev.sections, s],
    }));
  }

  function addCustomSection() {
    const s = modal.newSection.trim().toUpperCase();
    if (!s) return;
    if (modal.sections.includes(s)) {
      toast.error("Section already added");
      return;
    }
    setModal((prev) => ({
      ...prev,
      sections: [...prev.sections, s],
      newSection: "",
    }));
  }

  // ── Save class — CRITICAL: POST with field 'name', not 'className' ────────────
  async function handleSave() {
    setModal((p) => ({ ...p, error: null }));

    // Resolve final class name to send to API
    const finalName =
      modal.nameKey === "__custom__" ? modal.customName.trim() : modal.nameKey;

    if (!finalName) {
      setModal((p) => ({ ...p, error: "Class name is required." }));
      return;
    }
    if (modal.sections.length === 0) {
      setModal((p) => ({ ...p, error: "At least one section is required." }));
      return;
    }
    if (!modal.editing && usedNames.has(finalName)) {
      setModal((p) => ({
        ...p,
        error: `${displayName(finalName)} already exists.`,
      }));
      return;
    }

    setSaving(true);
    try {
      if (modal.editing) {
        // Update: POST with id + name
        console.log("[Classes] updating class:", {
          id: modal.editing.id,
          name: finalName,
          sections: modal.sections,
          is_enabled: modal.isEnabled ? 1 : 0,
        });
        const updateResult = await phpApiService.updateClass(modal.editing.id, {
          name: finalName, // ← 'name', NOT 'className'
          sections: modal.sections,
          is_enabled: modal.isEnabled ? 1 : 0,
        });
        console.log("[Classes] updateClass result:", updateResult);
        // Close modal first, then reload
        setModal(BLANK_MODAL);
        await loadClasses(); // ← AWAIT so list refreshes before success toast
        toast.success(`${displayName(finalName)} updated`);
      } else {
        // Add: POST with name (no id)
        console.log("[Classes] adding class:", {
          name: finalName,
          sections: modal.sections,
          is_enabled: modal.isEnabled ? 1 : 0,
        });
        const result = await phpApiService.addClass({
          name: finalName, // ← 'name', NOT 'className'
          sections: modal.sections,
          is_enabled: modal.isEnabled ? 1 : 0,
        });
        console.log("[Classes] addClass result:", result);
        // Close modal first, then reload
        setModal(BLANK_MODAL);
        await loadClasses(); // ← AWAIT so the new class appears immediately
        toast.success(`${displayName(finalName)} added successfully`);
        // Warn if list is still empty after reload (data not persisted on server)
        if (classes.length === 0) {
          toast.warning(
            "Class saved but list is empty — check server API route",
          );
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to save. Please retry.";
      console.error("[Classes] save failed:", err);
      // Keep modal open with inline error so user sees what went wrong
      setModal((p) => ({ ...p, error: msg }));
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(cls: ClassRecord) {
    const wasEnabled = (cls as Record<string, unknown>).isEnabled !== false;
    try {
      console.log(
        "[Classes] toggling class:",
        cls.id,
        "enabled →",
        !wasEnabled,
      );
      await phpApiService.updateClass(cls.id, {
        is_enabled: wasEnabled ? 0 : 1,
      });
      toast.success(
        `${displayName(cls.className)} ${wasEnabled ? "disabled" : "enabled"}`,
      );
      await loadClasses(); // ← AWAIT to immediately reflect the toggle
    } catch (err) {
      console.error("[Classes] toggle failed:", err);
      toast.error("Failed to update class status");
    }
  }

  async function handleDelete(cls: ClassRecord) {
    if (!confirm(`Delete ${displayName(cls.className)} and all its sections?`))
      return;
    setDeletingId(cls.id);
    try {
      console.log("[Classes] deleting class:", cls.id);
      await phpApiService.deleteClass(cls.id);
      toast.success(`${displayName(cls.className)} deleted`);
      await loadClasses(); // ← AWAIT so deleted class disappears immediately
    } catch (err) {
      console.error("[Classes] delete failed:", err);
      toast.error("Failed to delete class");
    } finally {
      setDeletingId(null);
    }
  }

  const sorted = sortClasses(classes);

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display font-bold text-foreground">
            Classes &amp; Sections
          </h2>
          <p className="text-sm text-muted-foreground">
            {sorted.length} class{sorted.length !== 1 ? "es" : ""} configured
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => void loadClasses()}
            aria-label="Refresh"
            data-ocid="classes.refresh_button"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {canWrite && (
            <Button size="sm" onClick={openAdd} data-ocid="classes.add_button">
              <Plus className="w-4 h-4 mr-1.5" /> Add Class
            </Button>
          )}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div
          className="flex items-center justify-center py-20"
          data-ocid="classes.loading_state"
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : sorted.length === 0 ? (
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
              onClick={openAdd}
              data-ocid="classes.add-first_button"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add First Class
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sorted.map((cls, idx) => {
            const isEnabled =
              (cls as Record<string, unknown>).isEnabled !== false;
            return (
              <Card
                key={cls.id}
                className={`p-4 transition-opacity ${!isEnabled ? "opacity-60" : ""}`}
                data-ocid={`classes.item.${idx + 1}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h3 className="font-display font-semibold text-foreground truncate">
                      {displayName(cls.className)}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <p className="text-xs text-muted-foreground">
                        {(cls.sections as string[]).length} section
                        {(cls.sections as string[]).length !== 1 ? "s" : ""}
                      </p>
                      <Badge
                        variant={isEnabled ? "default" : "secondary"}
                        className={`text-[9px] px-1.5 py-0 cursor-pointer select-none ${
                          isEnabled
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/20"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => canWrite && void handleToggle(cls)}
                        data-ocid={`classes.toggle.${idx + 1}`}
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
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => openEdit(cls)}
                        data-ocid={`classes.edit_button.${idx + 1}`}
                        aria-label="Edit"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        disabled={deletingId === cls.id}
                        onClick={() => void handleDelete(cls)}
                        data-ocid={`classes.delete_button.${idx + 1}`}
                        aria-label="Delete"
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
                <div className="flex flex-wrap gap-1">
                  {(cls.sections as string[]).map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          data-ocid="classes.dialog"
        >
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-display font-semibold text-foreground">
                {modal.editing ? "Edit Class" : "Add Class"}
              </h2>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setModal(BLANK_MODAL)}
                data-ocid="classes.close_button"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-5 space-y-4">
              {/* Class name picker */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Class Name *</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {CLASS_ORDER_SHORT.map((key) => (
                    <button
                      key={key}
                      type="button"
                      disabled={!modal.editing && usedNames.has(key)}
                      onClick={() =>
                        setModal((p) => ({
                          ...p,
                          nameKey: key,
                          customName: "",
                          error: null,
                        }))
                      }
                      className={`py-1.5 rounded-md text-xs font-medium border transition-colors ${
                        modal.nameKey === key
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-transparent border-border text-foreground hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed"
                      }`}
                    >
                      {displayName(key)}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setModal((p) => ({
                        ...p,
                        nameKey: "__custom__",
                        error: null,
                      }))
                    }
                    className={`py-1.5 rounded-md text-xs font-medium border transition-colors col-span-2 ${
                      modal.nameKey === "__custom__"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent border-border text-foreground hover:bg-muted/50"
                    }`}
                  >
                    + Custom
                  </button>
                </div>
                {modal.nameKey === "__custom__" && (
                  <Input
                    className="mt-2"
                    placeholder="Enter class name"
                    value={modal.customName}
                    onChange={(e) =>
                      setModal((p) => ({
                        ...p,
                        customName: e.target.value,
                        error: null,
                      }))
                    }
                    data-ocid="classes.custom_name.input"
                  />
                )}
              </div>

              {/* Sections */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Sections *</Label>
                <div className="flex flex-wrap gap-1.5">
                  {PREDEFINED_SECTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSection(s)}
                      className={`w-9 h-9 rounded-md text-sm font-semibold border transition-colors ${
                        modal.sections.includes(s)
                          ? "bg-accent text-accent-foreground border-accent"
                          : "bg-transparent border-border text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {/* Custom section input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Custom section (e.g. G)"
                    value={modal.newSection}
                    onChange={(e) =>
                      setModal((p) => ({ ...p, newSection: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomSection();
                      }
                    }}
                    className="flex-1"
                    data-ocid="classes.section_name.input"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addCustomSection}
                    data-ocid="classes.add_section_button"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {/* Custom sections added */}
                <div className="flex flex-wrap gap-1.5">
                  {modal.sections
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
                            setModal((p) => ({
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

              {/* Enable/Disable toggle */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Class Status
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {modal.isEnabled
                      ? "Active — visible in student dropdowns"
                      : "Inactive — hidden from dropdowns"}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={modal.isEnabled}
                  onClick={() =>
                    setModal((p) => ({ ...p, isEnabled: !p.isEnabled }))
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors ${
                    modal.isEnabled
                      ? "bg-primary border-primary"
                      : "bg-muted border-border"
                  }`}
                  data-ocid="classes.enable.toggle"
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      modal.isEnabled ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* Inline error */}
              {modal.error && (
                <div
                  className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-2.5 text-sm text-destructive"
                  data-ocid="classes.error_state"
                >
                  {modal.error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-5 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setModal(BLANK_MODAL)}
                data-ocid="classes.cancel_button"
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleSave()}
                disabled={
                  saving ||
                  modal.nameKey === "" ||
                  (modal.nameKey === "__custom__" &&
                    modal.customName.trim() === "")
                }
                data-ocid="classes.submit_button"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Save Class
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
