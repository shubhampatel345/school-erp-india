/**
 * SubjectAssignment — HR module
 * Assign subjects to teachers with class/section matrix.
 * Saves via useApp() context (IndexedDB first, canister in background).
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  CheckCircle2,
  Loader2,
  Save,
  UserCheck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type { ClassSection, Staff, Subject } from "../../types";
import { CLASS_ORDER } from "../../types";
import { generateId } from "../../utils/localStorage";

interface SubjectMatrix {
  [subjectId: string]: {
    [classSection: string]: boolean;
  };
}

interface Assignment {
  id: string;
  staffId: string;
  staffName: string;
  subjectId: string;
  subjectName: string;
  classes: string[]; // "ClassName-Section" or just "ClassName"
  sessionId?: string;
}

function sortedClasses(classList: ClassSection[]): ClassSection[] {
  return [...classList].sort((a, b) => {
    const nameA = a.name ?? a.className ?? "";
    const nameB = b.name ?? b.className ?? "";
    const ai = CLASS_ORDER.indexOf(nameA);
    const bi = CLASS_ORDER.indexOf(nameB);
    if (ai === -1 && bi === -1) return nameA.localeCompare(nameB);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export default function SubjectAssignment() {
  const {
    getData,
    saveData,
    updateData,
    currentUser,
    currentSession,
    addNotification,
  } = useApp();

  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [matrix, setMatrix] = useState<SubjectMatrix>({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const canWrite =
    currentUser?.role === "superadmin" || currentUser?.role === "admin";

  // Load data from context
  const allStaff = (getData("staff") as Staff[]).filter(
    (s) => (s.status ?? "active") === "active",
  );
  const teachers = allStaff.filter(
    (s) => s.designation === "Teacher" || s.designation === "Principal",
  );
  const subjects = getData("subjects") as Subject[];
  const classesRaw = getData("classes") as ClassSection[];
  const classes = sortedClasses(classesRaw);
  const assignments = getData("subject_assignments") as Assignment[];

  // Selected teacher
  const selectedStaff = teachers.find((t) => t.id === selectedStaffId);

  // Load existing assignments for selected teacher into matrix
  function loadTeacherAssignments(staffId: string) {
    const existing = assignments.filter((a) => a.staffId === staffId);
    const newMatrix: SubjectMatrix = {};
    for (const a of existing) {
      newMatrix[a.subjectId] = {};
      for (const cls of a.classes) {
        newMatrix[a.subjectId][cls] = true;
      }
    }
    setMatrix(newMatrix);
    setHasChanges(false);
  }

  function handleTeacherChange(staffId: string) {
    setSelectedStaffId(staffId);
    if (staffId) loadTeacherAssignments(staffId);
    else {
      setMatrix({});
      setHasChanges(false);
    }
  }

  // Get all class-section combos for a subject (based on subject.classes)
  function getClassSectionsForSubject(subject: Subject): string[] {
    const result: string[] = [];
    for (const cls of classes) {
      const name = cls.name ?? cls.className ?? "";
      if (!subject.classes.includes(name)) continue;
      const secs = Array.isArray(cls.sections)
        ? (cls.sections as string[])
        : [];
      if (secs.length === 0) {
        result.push(name);
      } else {
        for (const sec of secs) {
          result.push(`${name}-${sec}`);
        }
      }
    }
    return result;
  }

  function toggleCell(subjectId: string, classSection: string) {
    if (!canWrite) return;
    setMatrix((prev) => {
      const subj = { ...(prev[subjectId] ?? {}) };
      subj[classSection] = !subj[classSection];
      return { ...prev, [subjectId]: subj };
    });
    setHasChanges(true);
  }

  function toggleAllForSubject(subjectId: string, cells: string[]) {
    if (!canWrite) return;
    setMatrix((prev) => {
      const subj = prev[subjectId] ?? {};
      const allOn = cells.every((c) => subj[c]);
      const newSubj: Record<string, boolean> = {};
      for (const c of cells) newSubj[c] = !allOn;
      return { ...prev, [subjectId]: newSubj };
    });
    setHasChanges(true);
  }

  async function handleSave() {
    if (!selectedStaffId || !selectedStaff) return;
    setSaving(true);
    try {
      // Build assignment records from matrix
      const newAssignments: Assignment[] = [];
      for (const [subjectId, classCells] of Object.entries(matrix)) {
        const subj = subjects.find((s) => s.id === subjectId);
        if (!subj) continue;
        const assignedClasses = Object.entries(classCells)
          .filter(([, v]) => v)
          .map(([k]) => k);
        if (assignedClasses.length === 0) continue;
        newAssignments.push({
          id: generateId(),
          staffId: selectedStaffId,
          staffName: selectedStaff.name ?? selectedStaff.fullName ?? "",
          subjectId,
          subjectName: subj.name,
          classes: assignedClasses,
          sessionId: currentSession?.id,
        });
      }

      // Remove existing assignments for this teacher
      const existingForTeacher = assignments.filter(
        (a) => a.staffId === selectedStaffId,
      );
      // Delete old ones (via updateData to empty or deleteData)
      for (const old of existingForTeacher) {
        try {
          await updateData("subject_assignments", old.id, {
            ...old,
            classes: [],
            _deleted: true,
          });
        } catch {
          // ignore
        }
      }

      // Save new assignments
      for (const a of newAssignments) {
        await saveData(
          "subject_assignments",
          a as unknown as Record<string, unknown>,
        );
      }

      setHasChanges(false);
      addNotification(
        `Subject assignments saved for ${selectedStaff.name ?? "teacher"}`,
        "success",
      );
      toast.success("Assignments saved successfully");
    } catch {
      toast.error("Failed to save assignments. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Summary counts
  const assignedSubjectCount = useMemo(() => {
    return Object.values(matrix).filter((cells) =>
      Object.values(cells).some(Boolean),
    ).length;
  }, [matrix]);

  const assignedClassCount = useMemo(() => {
    const set = new Set<string>();
    for (const cells of Object.values(matrix)) {
      for (const [k, v] of Object.entries(cells)) {
        if (v) set.add(k);
      }
    }
    return set.size;
  }, [matrix]);

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold font-display text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Subject Assignment
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Assign subjects and class–sections to teachers
          </p>
        </div>
        {canWrite && selectedStaffId && hasChanges && (
          <Button
            onClick={handleSave}
            disabled={saving}
            data-ocid="subject-assignment.save_button"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Assignments
          </Button>
        )}
      </div>

      {/* Teacher selector */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="space-y-1.5 flex-1 max-w-xs">
            <label
              htmlFor="teacher-select"
              className="text-sm font-medium text-foreground"
            >
              Select Teacher
            </label>
            <Select value={selectedStaffId} onValueChange={handleTeacherChange}>
              <SelectTrigger
                id="teacher-select"
                data-ocid="subject-assignment.teacher_select"
              >
                <SelectValue placeholder="Choose a teacher…" />
              </SelectTrigger>
              <SelectContent>
                {teachers.length === 0 && (
                  <SelectItem value="__none__" disabled>
                    No teachers found — add staff first
                  </SelectItem>
                )}
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name ?? t.fullName ?? "—"} ({t.designation})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedStaff && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {selectedStaff.name ?? selectedStaff.fullName}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {selectedStaff.designation}
                </Badge>
              </div>
              {assignedSubjectCount > 0 && (
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span className="text-primary font-medium">
                    {assignedSubjectCount} subject
                    {assignedSubjectCount !== 1 ? "s" : ""}
                  </span>
                  <span>·</span>
                  <span>
                    {assignedClassCount} class–section
                    {assignedClassCount !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* No teacher selected */}
      {!selectedStaffId && (
        <Card
          className="p-14 text-center"
          data-ocid="subject-assignment.empty_state"
        >
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground opacity-40 mb-4" />
          <p className="font-semibold text-foreground">No teacher selected</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
            Select a teacher above to view and edit their subject assignments.
          </p>
        </Card>
      )}

      {/* No subjects */}
      {selectedStaffId && subjects.length === 0 && (
        <Card className="p-10 text-center">
          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground font-medium">No subjects found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add subjects first in Academics → Subjects.
          </p>
        </Card>
      )}

      {/* Matrix */}
      {selectedStaffId && subjects.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground min-w-[160px] sticky left-0 bg-muted/50">
                    Subject
                  </th>
                  <th className="text-center px-3 py-3 font-semibold text-muted-foreground w-20">
                    All
                  </th>
                  {/* Class headers — show unique class names */}
                  {classes
                    .filter((cls) => {
                      const name = cls.name ?? cls.className ?? "";
                      return subjects.some((s) => s.classes.includes(name));
                    })
                    .map((cls) => {
                      const name = cls.name ?? cls.className ?? "";
                      const secs = Array.isArray(cls.sections)
                        ? (cls.sections as string[])
                        : [];
                      return secs.length === 0 ? (
                        <th
                          key={cls.id}
                          className="text-center px-3 py-3 font-semibold text-muted-foreground text-xs whitespace-nowrap"
                        >
                          {name}
                        </th>
                      ) : (
                        secs.map((sec) => (
                          <th
                            key={`${cls.id}-${sec}`}
                            className="text-center px-3 py-3 font-semibold text-muted-foreground text-xs whitespace-nowrap"
                          >
                            {name}-{sec}
                          </th>
                        ))
                      );
                    })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subjects.map((subj, idx) => {
                  const cells = getClassSectionsForSubject(subj);
                  if (cells.length === 0) return null;
                  const subjMatrix = matrix[subj.id] ?? {};
                  const checkedCount = cells.filter(
                    (c) => subjMatrix[c],
                  ).length;
                  const allChecked = checkedCount === cells.length;

                  return (
                    <tr
                      key={subj.id}
                      className={
                        idx % 2 === 0
                          ? "bg-card hover:bg-muted/20"
                          : "bg-muted/10 hover:bg-muted/20"
                      }
                      data-ocid={`subject-assignment.row.${idx + 1}`}
                    >
                      {/* Subject name — sticky */}
                      <td className="px-4 py-3 sticky left-0 bg-inherit">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground truncate max-w-[140px]">
                            {subj.name}
                          </span>
                          {subj.code && (
                            <Badge
                              variant="secondary"
                              className="text-xs font-mono shrink-0"
                            >
                              {subj.code}
                            </Badge>
                          )}
                        </div>
                        {checkedCount > 0 && (
                          <p className="text-xs text-primary mt-0.5">
                            {checkedCount} assigned
                          </p>
                        )}
                      </td>

                      {/* Select All toggle */}
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleAllForSubject(subj.id, cells)}
                          disabled={!canWrite}
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center mx-auto transition-colors ${
                            allChecked
                              ? "bg-primary border-primary text-primary-foreground"
                              : checkedCount > 0
                                ? "bg-primary/30 border-primary"
                                : "border-border hover:border-primary"
                          } disabled:opacity-40 disabled:cursor-not-allowed`}
                          aria-label={
                            allChecked ? "Deselect all" : "Select all"
                          }
                          data-ocid={`subject-assignment.select-all.${idx + 1}`}
                        >
                          {allChecked && (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          {!allChecked && checkedCount > 0 && (
                            <span className="w-2 h-2 rounded-sm bg-primary block" />
                          )}
                        </button>
                      </td>

                      {/* Class-section checkboxes */}
                      {cells.map((cell) => (
                        <td key={cell} className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleCell(subj.id, cell)}
                            disabled={!canWrite}
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center mx-auto transition-colors ${
                              subjMatrix[cell]
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-border hover:border-primary"
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                            aria-label={`${subj.name} — ${cell}`}
                            data-ocid={`subject-assignment.cell.${idx + 1}.${cell.replace(/-/g, "_")}`}
                          >
                            {subjMatrix[cell] && <X className="w-3 h-3" />}
                          </button>
                        </td>
                      ))}

                      {/* Pad empty columns for subjects that don't cover all classes */}
                      {/* (handled naturally — cells only contains valid class-sections) */}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Current assignments summary */}
      {selectedStaffId &&
        assignments.filter(
          (a) => a.staffId === selectedStaffId && a.classes.length > 0,
        ).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Current Saved Assignments
            </p>
            <div className="flex flex-wrap gap-2">
              {assignments
                .filter(
                  (a) =>
                    a.staffId === selectedStaffId &&
                    !(a as unknown as { _deleted?: boolean })._deleted &&
                    a.classes.length > 0,
                )
                .map((a) => (
                  <Badge
                    key={a.id}
                    variant="secondary"
                    className="text-xs flex items-center gap-1"
                  >
                    <BookOpen className="w-3 h-3" />
                    {a.subjectName}: {a.classes.slice(0, 3).join(", ")}
                    {a.classes.length > 3 && ` +${a.classes.length - 3}`}
                  </Badge>
                ))}
            </div>
          </div>
        )}

      {/* Save footer */}
      {canWrite && selectedStaffId && hasChanges && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-primary/30 bg-primary/5">
          <p className="text-sm text-foreground flex-1">
            You have unsaved changes.
          </p>
          <Button
            onClick={handleSave}
            disabled={saving}
            data-ocid="subject-assignment.save_footer_button"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Assignments
          </Button>
        </div>
      )}
    </div>
  );
}
