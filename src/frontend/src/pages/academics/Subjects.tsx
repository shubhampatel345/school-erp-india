import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BookOpen, Edit2, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { Subject } from "../../types";
import { CLASSES, generateId, ls } from "../../utils/localStorage";

export default function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>(() =>
    ls.get<Subject[]>("academics_subjects", []),
  );
  const [showForm, setShowForm] = useState(false);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [formName, setFormName] = useState("");
  const [formClasses, setFormClasses] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  function saveSubjects(updated: Subject[]) {
    setSubjects(updated);
    ls.set("academics_subjects", updated);
  }

  function openAddForm() {
    setEditSubject(null);
    setFormName("");
    setFormClasses([]);
    setShowForm(true);
  }

  function openEditForm(sub: Subject) {
    setEditSubject(sub);
    setFormName(sub.name);
    setFormClasses([...sub.classes]);
    setShowForm(true);
  }

  function handleSave() {
    if (!formName.trim()) return alert("Subject name is required");
    if (formClasses.length === 0) return alert("Select at least one class");
    if (editSubject) {
      saveSubjects(
        subjects.map((s) =>
          s.id === editSubject.id
            ? { ...s, name: formName.trim(), classes: formClasses }
            : s,
        ),
      );
    } else {
      const newSub: Subject = {
        id: generateId(),
        name: formName.trim(),
        classes: formClasses,
      };
      saveSubjects([...subjects, newSub]);
    }
    setShowForm(false);
    setEditSubject(null);
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this subject?")) return;
    saveSubjects(subjects.filter((s) => s.id !== id));
  }

  function toggleClass(cls: string) {
    setFormClasses((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls],
    );
  }

  function selectAll() {
    setFormClasses([...CLASSES]);
  }

  function clearAll() {
    setFormClasses([]);
  }

  const filtered = subjects.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold font-display text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Subjects
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Define subjects and assign to classes
          </p>
        </div>
        <Button size="sm" onClick={openAddForm} data-ocid="add-subject-btn">
          <Plus className="w-4 h-4 mr-1" />
          Add Subject
        </Button>
      </div>

      {showForm && (
        <Card className="p-5 border-primary/30 bg-primary/5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-foreground">
              {editSubject ? "Edit Subject" : "New Subject"}
            </p>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1">
            <label htmlFor="subject-name" className="text-sm font-medium">
              Subject Name
            </label>
            <Input
              id="subject-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Hindi, Mathematics, Science"
              className="max-w-xs"
              data-ocid="subject-name-input"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                Taught in Classes (select all that apply)
              </span>
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-primary hover:underline"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-muted-foreground hover:underline"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {CLASSES.map((cls) => (
                <label
                  key={cls}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border transition-colors ${
                    formClasses.includes(cls)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:border-primary"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={formClasses.includes(cls)}
                    onChange={() => toggleClass(cls)}
                  />
                  {cls === "Nursery" || cls === "LKG" || cls === "UKG"
                    ? cls
                    : `Class ${cls}`}
                </label>
              ))}
            </div>
            {formClasses.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Selected: {formClasses.join(", ")}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} data-ocid="save-subject-btn">
              {editSubject ? "Update Subject" : "Save Subject"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <Input
        placeholder="Search subjects..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
        data-ocid="subject-search"
      />

      {filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            {search
              ? "No subjects match your search."
              : "No subjects added yet."}
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                  Subject Name
                </th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                  Taught in Classes
                </th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub, idx) => (
                <tr
                  key={sub.id}
                  className={idx % 2 === 0 ? "bg-card" : "bg-muted/20"}
                  data-ocid={`subject-row-${sub.id}`}
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {sub.name}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {sub.classes
                        .sort((a, b) => {
                          const ai = CLASSES.indexOf(a);
                          const bi = CLASSES.indexOf(b);
                          return ai - bi;
                        })
                        .map((cls) => (
                          <Badge
                            key={cls}
                            variant="secondary"
                            className="text-xs"
                          >
                            {cls}
                          </Badge>
                        ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditForm(sub)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(sub.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
