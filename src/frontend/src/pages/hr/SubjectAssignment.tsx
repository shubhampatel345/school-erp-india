/**
 * SubjectAssignment — HR module
 * Assign subjects to teachers with class range.
 * Uses direct API: getStaff + getSubjects + getClasses.
 * Saves via phpApiService.apiPost("academics/subject-assignments/save").
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import { CLASS_ORDER } from "../../types";
import type { ClassRecord, StaffRecord } from "../../utils/phpApiService";
import phpApiService from "../../utils/phpApiService";

interface SubjectItem {
  id: string;
  name: string;
}

interface Assignment {
  id: string;
  staffId: string;
  staffName: string;
  subjectId: string;
  subjectName: string;
  classFrom: string;
  classTo: string;
}

function dispClass(raw: string): string {
  if (["Nursery", "LKG", "UKG"].includes(raw)) return raw;
  if (raw.startsWith("Class ")) return raw;
  if (/^\d+$/.test(raw)) return `Class ${raw}`;
  return raw;
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const EMPTY_ASSIGNMENT: Omit<Assignment, "id"> = {
  staffId: "",
  staffName: "",
  subjectId: "",
  subjectName: "",
  classFrom: "",
  classTo: "",
};

export default function SubjectAssignment() {
  const { currentUser } = useApp();
  const canWrite =
    currentUser?.role === "superadmin" || currentUser?.role === "admin";

  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filter
  const [filterStaff, setFilterStaff] = useState("");
  const [search, setSearch] = useState("");

  // New assignment row
  const [showAdd, setShowAdd] = useState(false);
  const [newAssign, setNewAssign] = useState({ ...EMPTY_ASSIGNMENT });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rawStaff, rawSubjects, rawClasses, rawAssignments] =
        await Promise.all([
          phpApiService.getStaff(),
          phpApiService.getSubjects(),
          phpApiService.getClasses(),
          phpApiService
            .apiGet<Assignment[]>("academics/subject-assignments")
            .catch(() => []),
        ]);
      setStaff(rawStaff.filter((s) => s.status !== "inactive"));
      setSubjects(
        (rawSubjects as Record<string, unknown>[]).map((s) => ({
          id: String(s.id ?? ""),
          name: String(s.name ?? ""),
        })),
      );
      setClasses(rawClasses);
      setAssignments(rawAssignments ?? []);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // All class names in order
  const allClassNames = [...new Set(classes.map((c) => c.className))].sort(
    (a, b) => {
      const ka = a.startsWith("Class ") ? a.replace("Class ", "") : a;
      const kb = b.startsWith("Class ") ? b.replace("Class ", "") : b;
      const ai = CLASS_ORDER.indexOf(ka);
      const bi = CLASS_ORDER.indexOf(kb);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    },
  );

  // Teachers only
  const teachers = staff.filter((s) =>
    ["Teacher", "Principal", "Vice Principal", "HOD"].includes(
      s.designation ?? "",
    ),
  );

  async function saveAll(updated: Assignment[]) {
    setSaving(true);
    try {
      await phpApiService.apiPost("academics/subject-assignments/save", {
        assignments: updated,
      });
      setAssignments(updated);
      toast.success("Assignments saved");
    } catch {
      toast.error("Failed to save — shown locally");
      setAssignments(updated);
    } finally {
      setSaving(false);
    }
  }

  function addAssignment() {
    if (!newAssign.staffId || !newAssign.subjectId) {
      toast.error("Select teacher and subject");
      return;
    }
    const sf = staff.find((s) => s.id === newAssign.staffId);
    const subj = subjects.find((s) => s.id === newAssign.subjectId);
    const assignment: Assignment = {
      id: makeId(),
      staffId: newAssign.staffId,
      staffName: sf?.name ?? "",
      subjectId: newAssign.subjectId,
      subjectName: subj?.name ?? "",
      classFrom: newAssign.classFrom,
      classTo: newAssign.classTo,
    };
    void saveAll([...assignments, assignment]);
    setNewAssign({ ...EMPTY_ASSIGNMENT });
    setShowAdd(false);
  }

  function removeAssignment(id: string) {
    void saveAll(assignments.filter((a) => a.id !== id));
  }

  // Filtered assignments
  const filteredAssignments = assignments.filter((a) => {
    const matchStaff = !filterStaff || a.staffId === filterStaff;
    const matchSearch =
      !search ||
      a.staffName.toLowerCase().includes(search.toLowerCase()) ||
      a.subjectName.toLowerCase().includes(search.toLowerCase());
    return matchStaff && matchSearch;
  });

  // Group by staff
  const byStaff: Record<string, Assignment[]> = {};
  for (const a of filteredAssignments) {
    if (!byStaff[a.staffName]) byStaff[a.staffName] = [];
    byStaff[a.staffName].push(a);
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-display font-bold text-foreground">
            Subject Assignment
          </h2>
          <p className="text-sm text-muted-foreground">
            {assignments.length} assignment{assignments.length !== 1 ? "s" : ""}{" "}
            configured
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => void load()}
            aria-label="Refresh"
            data-ocid="subjects_assign.refresh_button"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {saving && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground self-center" />
          )}
          {canWrite && (
            <Button
              size="sm"
              onClick={() => setShowAdd(!showAdd)}
              data-ocid="subjects_assign.add_button"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Assignment
            </Button>
          )}
        </div>
      </div>

      {/* Add form */}
      {showAdd && canWrite && (
        <Card className="p-4 space-y-3 border-primary/20">
          <h3 className="font-semibold text-sm text-foreground">
            New Subject Assignment
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Teacher *</p>
              <Select
                value={newAssign.staffId}
                onValueChange={(v) =>
                  setNewAssign((p) => ({ ...p, staffId: v }))
                }
              >
                <SelectTrigger data-ocid="subjects_assign.teacher.select">
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((sf) => (
                    <SelectItem key={sf.id} value={sf.id}>
                      {sf.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Subject *</p>
              <Select
                value={newAssign.subjectId}
                onValueChange={(v) =>
                  setNewAssign((p) => ({ ...p, subjectId: v }))
                }
              >
                <SelectTrigger data-ocid="subjects_assign.subject.select">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Class From</p>
              <Select
                value={newAssign.classFrom}
                onValueChange={(v) =>
                  setNewAssign((p) => ({ ...p, classFrom: v }))
                }
              >
                <SelectTrigger data-ocid="subjects_assign.class_from.select">
                  <SelectValue placeholder="From class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any</SelectItem>
                  {allClassNames.map((c) => (
                    <SelectItem key={c} value={c}>
                      {dispClass(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Class To</p>
              <Select
                value={newAssign.classTo}
                onValueChange={(v) =>
                  setNewAssign((p) => ({ ...p, classTo: v }))
                }
              >
                <SelectTrigger data-ocid="subjects_assign.class_to.select">
                  <SelectValue placeholder="To class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any</SelectItem>
                  {allClassNames.map((c) => (
                    <SelectItem key={c} value={c}>
                      {dispClass(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={addAssignment}
              disabled={!newAssign.staffId || !newAssign.subjectId}
              data-ocid="subjects_assign.save_button"
            >
              <Save className="w-4 h-4 mr-1.5" /> Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowAdd(false);
                setNewAssign({ ...EMPTY_ASSIGNMENT });
              }}
              data-ocid="subjects_assign.cancel_button"
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder="Search teacher or subject…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-xs"
          data-ocid="subjects_assign.search.input"
        />
        <Select value={filterStaff} onValueChange={setFilterStaff}>
          <SelectTrigger
            className="w-44"
            data-ocid="subjects_assign.filter_teacher.select"
          >
            <SelectValue placeholder="All teachers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Teachers</SelectItem>
            {teachers.map((sf) => (
              <SelectItem key={sf.id} value={sf.id}>
                {sf.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div
          className="flex items-center justify-center py-20"
          data-ocid="subjects_assign.loading_state"
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredAssignments.length === 0 ? (
        <Card
          className="p-12 text-center border-dashed"
          data-ocid="subjects_assign.empty_state"
        >
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-semibold text-foreground">No assignments yet</p>
          {canWrite && (
            <Button
              size="sm"
              className="mt-4"
              onClick={() => setShowAdd(true)}
              data-ocid="subjects_assign.add-first_button"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add First Assignment
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {Object.entries(byStaff).map(([staffName, staffAssigns], idx) => (
            <Card
              key={staffName}
              className="overflow-hidden"
              data-ocid={`subjects_assign.teacher.${idx + 1}`}
            >
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
                <p className="font-semibold text-foreground text-sm">
                  {staffName}
                </p>
                <Badge variant="secondary" className="text-xs">
                  {staffAssigns.length} subject
                  {staffAssigns.length !== 1 ? "s" : ""}
                </Badge>
              </div>
              <div className="divide-y divide-border/50">
                {staffAssigns.map((a, aIdx) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/10"
                    data-ocid={`subjects_assign.item.${aIdx + 1}`}
                  >
                    <BookOpen className="w-4 h-4 text-primary/60 flex-shrink-0" />
                    <span className="flex-1 font-medium text-sm text-foreground">
                      {a.subjectName}
                    </span>
                    {(a.classFrom || a.classTo) && (
                      <span className="text-xs text-muted-foreground">
                        {a.classFrom ? dispClass(a.classFrom) : "All"}
                        {a.classTo && a.classTo !== a.classFrom
                          ? ` → ${dispClass(a.classTo)}`
                          : ""}
                      </span>
                    )}
                    {canWrite && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive flex-shrink-0"
                        onClick={() => removeAssignment(a.id)}
                        aria-label="Remove assignment"
                        data-ocid={`subjects_assign.delete_button.${aIdx + 1}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
