/**
 * ClassTeachers — server-synced via useApp() context
 * All CRUD via saveData / updateData / deleteData (mirrors server)
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertCircle,
  Edit2,
  Loader2,
  Plus,
  Trash2,
  UserCircle,
  Users2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type { ClassSection, Staff } from "../../types";
import { generateId } from "../../utils/localStorage";

// Canonical class order
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

function getClassDisplayName(name: string): string {
  if (name === "Nursery" || name === "LKG" || name === "UKG") return name;
  return `Class ${name}`;
}

function sortClasses(arr: ClassSection[]): ClassSection[] {
  return [...arr].sort((a, b) => {
    const aName = a.name ?? a.className ?? "";
    const bName = b.name ?? b.className ?? "";
    const ai = CLASS_ORDER.indexOf(aName);
    const bi = CLASS_ORDER.indexOf(bName);
    if (ai === -1 && bi === -1) return aName.localeCompare(bName);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

function sortEntries(entries: ClassTeacherEntry[]): ClassTeacherEntry[] {
  return [...entries].sort((a, b) => {
    const ai = CLASS_ORDER.indexOf(a.className);
    const bi = CLASS_ORDER.indexOf(b.className);
    const classDiff =
      ai === -1 && bi === -1
        ? a.className.localeCompare(b.className)
        : ai === -1
          ? 1
          : bi === -1
            ? -1
            : ai - bi;
    if (classDiff !== 0) return classDiff;
    return a.section.localeCompare(b.section);
  });
}

interface ClassTeacherEntry {
  id: string;
  className: string;
  section: string;
  staffId: string;
  staffName: string;
}

export default function ClassTeachers() {
  const { getData, saveData, updateData, deleteData, currentUser } = useApp();

  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<ClassTeacherEntry | null>(null);
  const [formClass, setFormClass] = useState("");
  const [formSection, setFormSection] = useState("");
  const [formStaffId, setFormStaffId] = useState("");
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // All data from server-synced context
  const rawClasses = getData("classes") as ClassSection[];
  const sortedClasses = sortClasses(rawClasses);
  const staffData = getData("staff") as Staff[];
  const entries = getData("class_teachers") as ClassTeacherEntry[];

  const canWrite =
    currentUser?.role === "superadmin" || currentUser?.role === "admin";

  const availableSections =
    sortedClasses.find((c) => (c.name ?? c.className ?? "") === formClass)
      ?.sections ?? [];

  const teacherStaff = staffData.filter(
    (s) =>
      s.designation?.toLowerCase() === "teacher" ||
      s.designation?.toLowerCase().includes("teacher") ||
      (s.subjects?.length ?? 0) > 0,
  );

  const selectedStaff = staffData.find((s) => s.id === formStaffId);

  function openAddForm() {
    setEditEntry(null);
    setFormClass("");
    setFormSection("");
    setFormStaffId("");
    setError("");
    setShowForm(true);
  }

  function openEditForm(entry: ClassTeacherEntry) {
    setEditEntry(entry);
    setFormClass(entry.className);
    setFormSection(entry.section);
    setFormStaffId(entry.staffId);
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditEntry(null);
    setError("");
  }

  async function handleSave() {
    if (!formClass || !formSection || !formStaffId) {
      setError("All fields are required");
      return;
    }
    // Prevent duplicate section assignment
    const duplicate = entries.find(
      (e) =>
        e.className === formClass &&
        e.section === formSection &&
        (!editEntry || e.id !== editEntry.id),
    );
    if (duplicate) {
      setError(
        `${formClass}-${formSection} already has a class teacher: ${duplicate.staffName}. Remove the existing assignment first.`,
      );
      return;
    }
    const staffMember = staffData.find((s) => s.id === formStaffId);
    if (!staffMember) {
      setError("Invalid teacher selected");
      return;
    }

    setSaving(true);
    try {
      if (editEntry) {
        await updateData("class_teachers", editEntry.id, {
          className: formClass,
          section: formSection,
          staffId: formStaffId,
          staffName: staffMember.name,
        });
        toast.success("Assignment updated");
      } else {
        const newEntry: Record<string, unknown> = {
          id: generateId(),
          className: formClass,
          section: formSection,
          staffId: formStaffId,
          staffName: staffMember.name,
        };
        await saveData("class_teachers", newEntry);
        toast.success(
          `${staffMember.name} assigned as Class Teacher for ${formClass}-${formSection}`,
        );
      }
      closeForm();
    } catch {
      toast.error("Failed to save assignment. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteData("class_teachers", id);
      toast.success("Assignment removed");
    } catch {
      toast.error("Failed to remove assignment.");
    } finally {
      setDeleteId(null);
    }
  }

  const sorted = sortEntries(entries);

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold font-display text-foreground flex items-center gap-2">
            <Users2 className="w-5 h-5 text-primary" />
            Class Teachers
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Assign one dedicated class teacher per section
          </p>
        </div>
        {canWrite && (
          <Button
            size="sm"
            onClick={openAddForm}
            data-ocid="class-teachers.add_button"
          >
            <Plus className="w-4 h-4 mr-1" />
            Assign Class Teacher
          </Button>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <Card
          className="p-5 border-primary/30 bg-primary/5 space-y-4 max-w-lg"
          data-ocid="class-teachers.dialog"
        >
          <p className="font-semibold text-foreground">
            {editEntry ? "Edit Assignment" : "Assign Class Teacher"}
          </p>

          {error && (
            <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* No classes warning */}
          {sortedClasses.length === 0 && (
            <div className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
              No classes configured. Go to{" "}
              <strong>Classes &amp; Sections</strong> tab first to add classes.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="text-sm font-medium">Class</span>
              <select
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-card"
                value={formClass}
                onChange={(e) => {
                  setFormClass(e.target.value);
                  setFormSection("");
                  setError("");
                }}
                data-ocid="class-teachers.class_select"
              >
                <option value="">Select class</option>
                {sortedClasses.map((c) => {
                  const n = c.name ?? c.className ?? "";
                  return (
                    <option key={c.id} value={n}>
                      {getClassDisplayName(n)}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium">Section</span>
              <select
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-card"
                value={formSection}
                onChange={(e) => {
                  setFormSection(e.target.value);
                  setError("");
                }}
                disabled={!formClass || availableSections.length === 0}
                data-ocid="class-teachers.section_select"
              >
                <option value="">Select section</option>
                {availableSections.map((s) => (
                  <option key={s} value={s}>
                    {formClass}-{s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-sm font-medium">Teacher</span>
            <select
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-card"
              value={formStaffId}
              onChange={(e) => {
                setFormStaffId(e.target.value);
                setError("");
              }}
              data-ocid="class-teachers.teacher_select"
            >
              <option value="">Select teacher</option>
              {teacherStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.designation})
                </option>
              ))}
            </select>
            {teacherStaff.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                No teachers found. Add staff with "Teacher" designation in HR
                module.
              </p>
            )}
            {selectedStaff && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-card rounded-lg border border-border">
                {selectedStaff.photo ? (
                  <img
                    src={selectedStaff.photo}
                    alt={selectedStaff.name}
                    className="w-8 h-8 rounded-full object-cover border border-border shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <UserCircle className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {selectedStaff.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedStaff.designation}
                    {selectedStaff.mobile ? ` · ${selectedStaff.mobile}` : ""}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !formClass || !formSection || !formStaffId}
              data-ocid="class-teachers.save_button"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : null}
              {editEntry ? "Update Assignment" : "Assign Teacher"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={closeForm}
              data-ocid="class-teachers.cancel_button"
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Empty state */}
      {entries.length === 0 ? (
        <Card
          className="p-10 text-center"
          data-ocid="class-teachers.empty_state"
        >
          <Users2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground font-medium">
            No class teacher assignments yet.
          </p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
            First add classes in "Classes &amp; Sections" and staff in HR, then
            assign teachers here.
          </p>
          {canWrite && (
            <Button className="mt-4" size="sm" onClick={openAddForm}>
              <Plus className="w-4 h-4 mr-1" />
              Assign Class Teacher
            </Button>
          )}
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                  Class / Section
                </th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                  Class Teacher
                </th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">
                  Designation
                </th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">
                  Mobile
                </th>
                {canWrite && (
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {sorted.map((entry, idx) => {
                const staffMember = staffData.find(
                  (s) => s.id === entry.staffId,
                );
                return (
                  <tr
                    key={entry.id}
                    className={idx % 2 === 0 ? "bg-card" : "bg-muted/20"}
                    data-ocid={`class-teachers.item.${idx + 1}`}
                  >
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className="font-mono font-semibold"
                      >
                        {getClassDisplayName(entry.className)}-{entry.section}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {staffMember?.photo ? (
                          <img
                            src={staffMember.photo}
                            alt={entry.staffName}
                            className="w-8 h-8 rounded-full object-cover border border-border shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <UserCircle className="w-5 h-5 text-primary" />
                          </div>
                        )}
                        <span className="font-medium text-foreground">
                          {entry.staffName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {staffMember?.designation ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell font-mono text-xs">
                      {staffMember?.mobile ?? "—"}
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditForm(entry)}
                            aria-label="Edit assignment"
                            data-ocid={`class-teachers.edit_button.${idx + 1}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(entry.id)}
                            aria-label="Delete assignment"
                            data-ocid={`class-teachers.delete_button.${idx + 1}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="bg-card rounded-xl shadow-lg w-full max-w-sm p-6 space-y-4"
            data-ocid="class-teachers.dialog"
          >
            <h3 className="font-bold text-foreground">Remove Assignment?</h3>
            <p className="text-sm text-muted-foreground">
              This will remove the class teacher assignment. You can re-assign
              anytime.
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteId)}
                data-ocid="class-teachers.confirm_button"
              >
                Remove
              </Button>
              <Button
                variant="ghost"
                onClick={() => setDeleteId(null)}
                data-ocid="class-teachers.cancel_button"
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
