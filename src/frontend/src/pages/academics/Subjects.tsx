/**
 * Subjects — Direct API rebuild
 * All CRUD via phpApiService.getSubjects/saveSubject/put/del.
 * Waits for HTTP 200 before success.
 * Marks fields are plain text inputs — no spinners.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BookOpen,
  Edit2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
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

interface SubjectRecord {
  id: string;
  name: string;
  code?: string;
  classes: string[];
  maxMarks?: string;
  minMarks?: string;
}

interface FormState {
  open: boolean;
  editing: SubjectRecord | null;
  name: string;
  code: string;
  classes: string[];
  maxMarks: string;
  minMarks: string;
}

const EMPTY_FORM: FormState = {
  open: false,
  editing: null,
  name: "",
  code: "",
  classes: [],
  maxMarks: "",
  minMarks: "",
};

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

function displayClass(name: string) {
  return ["Nursery", "LKG", "UKG"].includes(name) ? name : `Class ${name}`;
}

export default function Subjects() {
  const { currentUser } = useApp();

  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const canWrite =
    currentUser?.role === "superadmin" || currentUser?.role === "admin";

  const loadSubjects = useCallback(() => {
    setLoading(true);
    Promise.all([phpApiService.getSubjects(""), phpApiService.getClasses()])
      .then(([subs, cls]) => {
        setSubjects(subs as unknown as SubjectRecord[]);
        setClasses(cls);
      })
      .catch(() => toast.error("Failed to load subjects"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  const allClassNames = sortClassList(classes.map((c) => c.className));

  const filtered = subjects.filter((s) => {
    const q = search.toLowerCase();
    return (
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.code ?? "").toLowerCase().includes(q)
    );
  });

  function openAdd() {
    setForm({ ...EMPTY_FORM, open: true });
  }

  function openEdit(s: SubjectRecord) {
    setForm({
      open: true,
      editing: s,
      name: s.name,
      code: s.code ?? "",
      classes: [...s.classes],
      maxMarks: String(s.maxMarks ?? ""),
      minMarks: String(s.minMarks ?? ""),
    });
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
    if (!form.name.trim()) {
      toast.error("Subject name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        classes: form.classes,
        maxMarks: form.maxMarks ? Number(form.maxMarks) : null,
        minMarks: form.minMarks ? Number(form.minMarks) : null,
      };
      if (form.editing) {
        await phpApiService.put("subjects/update", {
          id: form.editing.id,
          ...payload,
        });
        toast.success("Subject updated");
      } else {
        await phpApiService.post("subjects/add", payload);
        toast.success("Subject added");
      }
      setForm(EMPTY_FORM);
      loadSubjects();
    } catch {
      toast.error("Failed to save subject. Please retry.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete subject "${name}"?`)) return;
    setDeletingId(id);
    try {
      await phpApiService.del("subjects/delete", { id });
      toast.success("Subject deleted");
      loadSubjects();
    } catch {
      toast.error("Failed to delete subject.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search subjects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-ocid="subjects.search.input"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={loadSubjects}
          aria-label="Refresh"
          data-ocid="subjects.refresh.button"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
        {canWrite && (
          <Button size="sm" onClick={openAdd} data-ocid="subjects.add.button">
            <Plus className="w-4 h-4 mr-1.5" /> Add Subject
          </Button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Badge variant="secondary">{filtered.length} subjects</Badge>
      </div>

      {/* List */}
      {loading ? (
        <div
          className="flex items-center justify-center py-20"
          data-ocid="subjects.loading_state"
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card
          className="p-12 text-center border-dashed"
          data-ocid="subjects.empty_state"
        >
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-semibold text-foreground">No subjects found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {subjects.length === 0
              ? "Add your first subject to get started"
              : "Try adjusting the search"}
          </p>
          {subjects.length === 0 && canWrite && (
            <Button
              size="sm"
              className="mt-4"
              onClick={openAdd}
              data-ocid="subjects.add-first.button"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add First Subject
            </Button>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="text-left p-3 font-semibold text-muted-foreground">
                    #
                  </th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">
                    Subject
                  </th>
                  <th className="text-left p-3 font-semibold text-muted-foreground hidden sm:table-cell">
                    Code
                  </th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">
                    Classes
                  </th>
                  <th className="text-right p-3 font-semibold text-muted-foreground hidden md:table-cell">
                    Max Marks
                  </th>
                  <th className="text-right p-3 font-semibold text-muted-foreground hidden md:table-cell">
                    Min Marks
                  </th>
                  {canWrite && (
                    <th className="text-center p-3 font-semibold text-muted-foreground">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, idx) => (
                  <tr
                    key={s.id}
                    className="border-t border-border hover:bg-muted/30 transition-colors"
                    data-ocid={`subjects.item.${idx + 1}`}
                  >
                    <td className="p-3 text-muted-foreground">{idx + 1}</td>
                    <td className="p-3 font-medium text-foreground">
                      {s.name}
                    </td>
                    <td className="p-3 text-muted-foreground font-mono text-xs hidden sm:table-cell">
                      {s.code || "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {s.classes.length > 0 ? (
                          sortClassList(s.classes).map((c) => (
                            <Badge
                              key={c}
                              variant="outline"
                              className="text-xs"
                            >
                              {displayClass(c)}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            All classes
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right text-muted-foreground hidden md:table-cell">
                      {s.maxMarks || "—"}
                    </td>
                    <td className="p-3 text-right text-muted-foreground hidden md:table-cell">
                      {s.minMarks || "—"}
                    </td>
                    {canWrite && (
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => openEdit(s)}
                            data-ocid={`subjects.edit.${idx + 1}`}
                            aria-label="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            disabled={deletingId === s.id}
                            onClick={() => void handleDelete(s.id, s.name)}
                            data-ocid={`subjects.delete.${idx + 1}`}
                            aria-label="Delete"
                          >
                            {deletingId === s.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add/Edit Modal */}
      {form.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          data-ocid="subjects.dialog"
        >
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-display font-semibold text-foreground">
                {form.editing ? "Edit Subject" : "Add Subject"}
              </h2>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setForm(EMPTY_FORM)}
                data-ocid="subjects.close_button"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <Label className="text-xs">Subject Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="e.g. Mathematics"
                    data-ocid="subjects.name.input"
                  />
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <Label className="text-xs">Subject Code</Label>
                  <Input
                    value={form.code}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, code: e.target.value }))
                    }
                    placeholder="e.g. MATH"
                    data-ocid="subjects.code.input"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max Marks</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={form.maxMarks}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        maxMarks: e.target.value.replace(/[^0-9]/g, ""),
                      }))
                    }
                    placeholder="e.g. 100"
                    data-ocid="subjects.max-marks.input"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Min (Pass) Marks</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={form.minMarks}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        minMarks: e.target.value.replace(/[^0-9]/g, ""),
                      }))
                    }
                    placeholder="e.g. 33"
                    data-ocid="subjects.min-marks.input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">
                  Applicable Classes (leave empty for all)
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {allClassNames.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleClass(c)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                        form.classes.includes(c)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-transparent border-border text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {displayClass(c)}
                    </button>
                  ))}
                </div>
                {form.classes.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {form.classes.length} class
                    {form.classes.length !== 1 ? "es" : ""} selected
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setForm(EMPTY_FORM)}
                data-ocid="subjects.cancel_button"
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleSave()}
                disabled={saving}
                data-ocid="subjects.submit_button"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…
                  </>
                ) : form.editing ? (
                  "Update Subject"
                ) : (
                  "Add Subject"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
