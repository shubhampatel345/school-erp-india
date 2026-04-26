/**
 * Subjects — Direct API
 * Full CRUD: list, add, edit, delete subjects with class assignment.
 * Assign teacher per subject. Filter by class.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { ClassRecord, StaffRecord } from "../../utils/phpApiService";
import phpApiService from "../../utils/phpApiService";

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

function dispClass(raw: string): string {
  if (["Nursery", "LKG", "UKG"].includes(raw)) return raw;
  if (raw.startsWith("Class ")) return raw;
  if (/^\d+$/.test(raw)) return `Class ${raw}`;
  return raw;
}

function sortClasses(list: string[]): string[] {
  return [...list].sort((a, b) => {
    const ka = a.startsWith("Class ") ? a.replace("Class ", "") : a;
    const kb = b.startsWith("Class ") ? b.replace("Class ", "") : b;
    const ai = CLASS_ORDER_SHORT.indexOf(ka);
    const bi = CLASS_ORDER_SHORT.indexOf(kb);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

interface SubjectRecord {
  id: string;
  name: string;
  code?: string;
  classes: string[];
  teacherId?: string;
  teacherName?: string;
  maxMarks?: string;
  minMarks?: string;
}

interface FormState {
  open: boolean;
  editing: SubjectRecord | null;
  name: string;
  code: string;
  classes: string[];
  teacherId: string;
  maxMarks: string;
  minMarks: string;
}

const BLANK: FormState = {
  open: false,
  editing: null,
  name: "",
  code: "",
  classes: [],
  teacherId: "",
  maxMarks: "100",
  minMarks: "33",
};

export default function Subjects() {
  const { currentUser } = useApp();
  const canWrite =
    currentUser?.role === "superadmin" ||
    currentUser?.role === "admin" ||
    currentUser?.role === "teacher";

  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [classList, setClassList] = useState<ClassRecord[]>([]);
  const [staffList, setStaffList] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [form, setForm] = useState<FormState>(BLANK);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rawSubs, rawClasses, rawStaff] = await Promise.all([
        phpApiService.getSubjects(),
        phpApiService.getClasses(),
        phpApiService.getStaff(),
      ]);
      const mapped: SubjectRecord[] = (
        rawSubs as Record<string, unknown>[]
      ).map((s) => ({
        id: String(s.id ?? ""),
        name: String(s.name ?? ""),
        code: s.code ? String(s.code) : undefined,
        classes: Array.isArray(s.classes) ? (s.classes as string[]) : [],
        teacherId: s.teacher_id ? String(s.teacher_id) : undefined,
        teacherName: s.teacher_name ? String(s.teacher_name) : undefined,
        maxMarks: s.max_marks ? String(s.max_marks) : "100",
        minMarks: s.min_marks ? String(s.min_marks) : "33",
      }));
      setSubjects(mapped);
      setClassList(rawClasses);
      setStaffList(rawStaff.filter((sf) => sf.status !== "inactive"));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load subjects",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // All class names from DB
  const allClasses = sortClasses([
    ...new Set(classList.map((c) => c.className ?? "")),
  ]).filter(Boolean);

  // Filter
  const filtered = subjects.filter((s) => {
    const matchSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.code ?? "").toLowerCase().includes(search.toLowerCase());
    const matchClass =
      filterClass === "all" ||
      s.classes.some((c) => {
        const key = c.startsWith("Class ") ? c.replace("Class ", "") : c;
        const fkey = filterClass.startsWith("Class ")
          ? filterClass.replace("Class ", "")
          : filterClass;
        return key === fkey || c === filterClass;
      });
    return matchSearch && matchClass;
  });

  function openAdd() {
    setForm({ ...BLANK, open: true });
  }

  function openEdit(s: SubjectRecord) {
    setForm({
      open: true,
      editing: s,
      name: s.name,
      code: s.code ?? "",
      classes: [...s.classes],
      teacherId: s.teacherId ?? "",
      maxMarks: s.maxMarks ?? "100",
      minMarks: s.minMarks ?? "33",
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
      const teacher = staffList.find((sf) => sf.id === form.teacherId);
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        classes: form.classes,
        teacher_id: form.teacherId || null,
        teacher_name: teacher?.name ?? null,
        max_marks: form.maxMarks || 100,
        min_marks: form.minMarks || 33,
      };
      if (form.editing) payload.id = form.editing.id;
      await phpApiService.saveSubject(payload);
      toast.success(
        form.editing ? `${form.name} updated` : `${form.name} added`,
      );
      setForm(BLANK);
      void load();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save subject",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(s: SubjectRecord) {
    if (!confirm(`Delete subject "${s.name}"?`)) return;
    try {
      await phpApiService.deleteSubject(s.id);
      toast.success(`${s.name} deleted`);
      void load();
    } catch {
      toast.error("Failed to delete subject");
    }
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-display font-bold text-foreground">
            Subjects
          </h2>
          <p className="text-sm text-muted-foreground">
            {subjects.length} subjects configured
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => void load()}
            aria-label="Refresh"
            data-ocid="subjects.refresh_button"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {canWrite && (
            <Button size="sm" onClick={openAdd} data-ocid="subjects.add_button">
              <Plus className="w-4 h-4 mr-1.5" /> Add Subject
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search subjects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-ocid="subjects.search.input"
          />
        </div>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger
            className="w-36"
            data-ocid="subjects.filter_class.select"
          >
            <SelectValue placeholder="All classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {allClasses.map((c) => (
              <SelectItem key={c} value={c}>
                {dispClass(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          {canWrite && (
            <Button
              size="sm"
              className="mt-4"
              onClick={openAdd}
              data-ocid="subjects.add-first_button"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add First Subject
            </Button>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
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
                  <th className="text-left p-3 font-semibold text-muted-foreground hidden md:table-cell">
                    Teacher
                  </th>
                  <th className="text-center p-3 font-semibold text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, idx) => (
                  <tr
                    key={s.id}
                    className="border-t border-border hover:bg-muted/20 transition-colors"
                    data-ocid={`subjects.item.${idx + 1}`}
                  >
                    <td className="p-3 text-muted-foreground">{idx + 1}</td>
                    <td className="p-3">
                      <p className="font-medium text-foreground">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Max: {s.maxMarks} | Min: {s.minMarks}
                      </p>
                    </td>
                    <td className="p-3 hidden sm:table-cell">
                      <Badge variant="outline" className="text-xs">
                        {s.code || "—"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {s.classes.slice(0, 4).map((c) => (
                          <Badge
                            key={c}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {dispClass(c)}
                          </Badge>
                        ))}
                        {s.classes.length > 4 && (
                          <Badge variant="secondary" className="text-[10px]">
                            +{s.classes.length - 4}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground text-sm">
                      {s.teacherName || "—"}
                    </td>
                    <td className="p-3">
                      {canWrite && (
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => openEdit(s)}
                            data-ocid={`subjects.edit_button.${idx + 1}`}
                            aria-label="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => void handleDelete(s)}
                            data-ocid={`subjects.delete_button.${idx + 1}`}
                            aria-label="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </td>
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
                onClick={() => setForm(BLANK)}
                data-ocid="subjects.close_button"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label className="text-xs">Subject Name *</Label>
                  <Input
                    placeholder="e.g. Mathematics"
                    value={form.name}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, name: e.target.value }))
                    }
                    data-ocid="subjects.name.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Subject Code</Label>
                  <Input
                    placeholder="e.g. MATH"
                    value={form.code}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, code: e.target.value }))
                    }
                    data-ocid="subjects.code.input"
                  />
                </div>
                <div className="space-y-1.5">
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
                    data-ocid="subjects.max_marks.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Min Marks (Pass)</Label>
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
                    data-ocid="subjects.min_marks.input"
                  />
                </div>
              </div>

              {/* Assign Teacher */}
              <div className="space-y-1.5">
                <Label className="text-xs">Assign Teacher</Label>
                <Select
                  value={form.teacherId}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, teacherId: v }))
                  }
                >
                  <SelectTrigger data-ocid="subjects.teacher.select">
                    <SelectValue placeholder="Select teacher (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {staffList
                      .filter((sf) =>
                        ["Teacher", "Principal", "Vice Principal"].includes(
                          sf.designation ?? "",
                        ),
                      )
                      .map((sf) => (
                        <SelectItem key={sf.id} value={sf.id}>
                          {sf.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Classes */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Assign to Classes</Label>
                <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto">
                  {allClasses.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleClass(c)}
                      className={`py-1.5 px-2 rounded-md text-xs font-medium border transition-colors ${
                        form.classes.includes(c)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-transparent border-border text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {dispClass(c)}
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
                onClick={() => setForm(BLANK)}
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
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {form.editing ? "Save Changes" : "Add Subject"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
