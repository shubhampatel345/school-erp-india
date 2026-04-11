import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertCircle,
  Edit2,
  Plus,
  Trash2,
  UserCircle,
  Users2,
} from "lucide-react";
import { useState } from "react";
import type { ClassSection, Staff } from "../../types";
import { generateId, ls } from "../../utils/localStorage";

interface ClassTeacherEntry {
  id: string;
  className: string;
  section: string;
  staffId: string;
  staffName: string;
}

export default function ClassTeachers() {
  const [entries, setEntries] = useState<ClassTeacherEntry[]>(() =>
    ls.get<ClassTeacherEntry[]>("class_teachers", []),
  );
  const [classes] = useState<ClassSection[]>(() =>
    ls.get<ClassSection[]>("classes", []),
  );
  const [staff] = useState<Staff[]>(() => ls.get<Staff[]>("staff", []));
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<ClassTeacherEntry | null>(null);
  const [formClass, setFormClass] = useState("");
  const [formSection, setFormSection] = useState("");
  const [formStaffId, setFormStaffId] = useState("");
  const [error, setError] = useState("");

  function saveEntries(updated: ClassTeacherEntry[]) {
    setEntries(updated);
    ls.set("class_teachers", updated);
  }

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

  const availableSections =
    classes.find((c) => c.className === formClass)?.sections ?? [];

  const selectedStaff = staff.find((s) => s.id === formStaffId);

  function handleSave() {
    if (!formClass || !formSection || !formStaffId) {
      return setError("All fields are required");
    }
    // Prevent duplicate section assignment (block override)
    const existing = entries.find(
      (e) =>
        e.className === formClass &&
        e.section === formSection &&
        (!editEntry || e.id !== editEntry.id),
    );
    if (existing) {
      return setError(
        `${formClass}-${formSection} already has a class teacher: ${existing.staffName}. Remove the existing assignment first.`,
      );
    }
    const staffMember = staff.find((s) => s.id === formStaffId);
    if (!staffMember) return setError("Invalid teacher selected");

    if (editEntry) {
      saveEntries(
        entries.map((e) =>
          e.id === editEntry.id
            ? {
                ...e,
                className: formClass,
                section: formSection,
                staffId: formStaffId,
                staffName: staffMember.name,
              }
            : e,
        ),
      );
    } else {
      const newEntry: ClassTeacherEntry = {
        id: generateId(),
        className: formClass,
        section: formSection,
        staffId: formStaffId,
        staffName: staffMember.name,
      };
      saveEntries([...entries, newEntry]);
    }
    setShowForm(false);
    setEditEntry(null);
    setError("");
  }

  function handleDelete(id: string) {
    if (!confirm("Remove this class teacher assignment?")) return;
    saveEntries(entries.filter((e) => e.id !== id));
  }

  // Include all staff that are teachers or have subject assignments
  const teacherStaff = staff.filter(
    (s) =>
      s.designation.toLowerCase() === "teacher" ||
      s.designation.toLowerCase().includes("teacher") ||
      (s.subjects?.length ?? 0) > 0,
  );

  const sortedEntries = entries.slice().sort((a, b) => {
    const aKey = `${a.className.padStart(3, "0")}-${a.section}`;
    const bKey = `${b.className.padStart(3, "0")}-${b.section}`;
    return aKey.localeCompare(bKey);
  });

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold font-display text-foreground flex items-center gap-2">
            <Users2 className="w-5 h-5 text-primary" />
            Class Teachers
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            One dedicated class teacher per section — duplicates are blocked
          </p>
        </div>
        <Button
          size="sm"
          onClick={openAddForm}
          data-ocid="assign-class-teacher-btn"
        >
          <Plus className="w-4 h-4 mr-1" />
          Assign Class Teacher
        </Button>
      </div>

      {showForm && (
        <Card className="p-5 border-primary/30 bg-primary/5 space-y-4 max-w-lg">
          <p className="font-semibold text-foreground">
            {editEntry ? "Edit Assignment" : "Assign Class Teacher"}
          </p>
          {error && (
            <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
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
                data-ocid="class-teacher-class-select"
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.className}>
                    Class {c.className}
                  </option>
                ))}
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
                disabled={!formClass}
                data-ocid="class-teacher-section-select"
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
              data-ocid="class-teacher-staff-select"
            >
              <option value="">Select teacher</option>
              {teacherStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.designation})
                </option>
              ))}
            </select>
            {selectedStaff && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-card rounded-lg border border-border">
                {selectedStaff.photo ? (
                  <img
                    src={selectedStaff.photo}
                    alt={selectedStaff.name}
                    className="w-8 h-8 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCircle className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {selectedStaff.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedStaff.mobile} · {selectedStaff.designation}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              data-ocid="save-class-teacher-btn"
            >
              {editEntry ? "Update Assignment" : "Assign Teacher"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowForm(false);
                setError("");
              }}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {entries.length === 0 ? (
        <Card className="p-10 text-center">
          <Users2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground font-medium">
            No class teacher assignments yet.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            First add classes in "Classes &amp; Sections" and staff in the HR
            module, then assign here.
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                  Section
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
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry, idx) => {
                const staffMember = staff.find((s) => s.id === entry.staffId);
                return (
                  <tr
                    key={entry.id}
                    className={idx % 2 === 0 ? "bg-card" : "bg-muted/20"}
                    data-ocid={`class-teacher-row-${entry.id}`}
                  >
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className="font-mono font-semibold"
                      >
                        {entry.className}-{entry.section}
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
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditForm(entry)}
                          aria-label="Edit assignment"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(entry.id)}
                          aria-label="Delete assignment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
