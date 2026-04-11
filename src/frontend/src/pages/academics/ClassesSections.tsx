import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit2, LayoutGrid, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { ClassSection } from "../../types";
import { CLASSES, SECTIONS, generateId, ls } from "../../utils/localStorage";

export default function ClassesSections() {
  const [classes, setClasses] = useState<ClassSection[]>(() =>
    ls.get<ClassSection[]>("classes", []),
  );
  const [showAddClass, setShowAddClass] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [editClass, setEditClass] = useState<ClassSection | null>(null);
  const [addSectionFor, setAddSectionFor] = useState<string | null>(null);
  const [newSection, setNewSection] = useState("");

  function saveClasses(updated: ClassSection[]) {
    setClasses(updated);
    ls.set("classes", updated);
  }

  function handleAddClass() {
    if (!newClassName.trim()) return;
    const exists = classes.find(
      (c) => c.className.toLowerCase() === newClassName.trim().toLowerCase(),
    );
    if (exists) return alert("Class already exists");
    const entry: ClassSection = {
      id: generateId(),
      className: newClassName.trim(),
      sections: [],
    };
    saveClasses([...classes, entry]);
    setNewClassName("");
    setShowAddClass(false);
  }

  function handleDeleteClass(id: string) {
    if (!confirm("Delete this class and all its sections?")) return;
    saveClasses(classes.filter((c) => c.id !== id));
  }

  function handleAddSection(classId: string) {
    if (!newSection.trim()) return;
    const updated = classes.map((c) => {
      if (c.id !== classId) return c;
      if (c.sections.includes(newSection.trim().toUpperCase())) {
        alert("Section already exists");
        return c;
      }
      return {
        ...c,
        sections: [...c.sections, newSection.trim().toUpperCase()],
      };
    });
    saveClasses(updated as ClassSection[]);
    setNewSection("");
    setAddSectionFor(null);
  }

  function handleDeleteSection(classId: string, section: string) {
    const updated = classes.map((c) => {
      if (c.id !== classId) return c;
      return { ...c, sections: c.sections.filter((s) => s !== section) };
    });
    saveClasses(updated);
  }

  function handleEditSave() {
    if (!editClass) return;
    saveClasses(classes.map((c) => (c.id === editClass.id ? editClass : c)));
    setEditClass(null);
  }

  function seedDefaults() {
    if (
      classes.length > 0 &&
      !confirm("Replace existing classes with defaults?")
    )
      return;
    const defaults: ClassSection[] = CLASSES.map((cls) => ({
      id: generateId(),
      className: cls,
      sections: ["A", "B", "C"],
    }));
    saveClasses(defaults);
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold font-display text-foreground flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-primary" />
            Classes &amp; Sections
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage class structure and sections
          </p>
        </div>
        <div className="flex gap-2">
          {classes.length === 0 && (
            <Button variant="outline" size="sm" onClick={seedDefaults}>
              Load Defaults (Nursery–12, ABC)
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setShowAddClass(true)}
            data-ocid="add-class-btn"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Class
          </Button>
        </div>
      </div>

      {showAddClass && (
        <Card className="p-4 border-primary/30 bg-primary/5">
          <p className="text-sm font-semibold mb-3">New Class</p>
          <div className="flex gap-2 flex-wrap">
            <select
              className="border border-input rounded-md px-3 py-2 text-sm bg-card"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
            >
              <option value="">Select class</option>
              {CLASSES.filter(
                (c) => !classes.find((x) => x.className === c),
              ).map((c) => (
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
            </select>
            <Button size="sm" onClick={handleAddClass}>
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAddClass(false)}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {classes.length === 0 ? (
        <Card className="p-10 text-center">
          <LayoutGrid className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No classes added yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Click "Load Defaults" to pre-fill all classes or add manually.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {classes.map((cls) => (
            <Card key={cls.id} className="p-4">
              {editClass?.id === cls.id ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="w-24">Class Name</Label>
                    <Input
                      value={editClass.className}
                      onChange={(e) =>
                        setEditClass({
                          ...editClass,
                          className: e.target.value,
                        })
                      }
                      className="w-40"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleEditSave}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditClass(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="min-w-[80px]">
                    <p className="font-semibold text-foreground">
                      Class {cls.className}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cls.sections.length} section
                      {cls.sections.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex-1 flex flex-wrap gap-2 items-center">
                    {cls.sections.map((sec) => (
                      <Badge
                        key={sec}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {cls.className}-{sec}
                        <button
                          type="button"
                          onClick={() => handleDeleteSection(cls.id, sec)}
                          className="ml-1 hover:text-destructive transition-colors"
                          aria-label={`Remove section ${sec}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    {addSectionFor === cls.id ? (
                      <div className="flex gap-1 items-center">
                        <select
                          className="border border-input rounded px-2 py-1 text-xs bg-card"
                          value={newSection}
                          onChange={(e) => setNewSection(e.target.value)}
                        >
                          <option value="">Section</option>
                          {SECTIONS.filter(
                            (s) => !cls.sections.includes(s),
                          ).map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleAddSection(cls.id)}
                        >
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => setAddSectionFor(null)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAddSectionFor(cls.id);
                          setNewSection("");
                        }}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add Section
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1 ml-auto">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditClass(cls)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClass(cls.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
