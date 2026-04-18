import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  BarChart2,
  BookOpen,
  CheckCircle,
  Clock,
  Edit2,
  PlusCircle,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import type {
  HomeworkSubmission,
  Homework as HomeworkType,
  Student,
  Subject,
} from "../types";
import { dataService } from "../utils/dataService";
import {
  CLASSES,
  LS_KEYS,
  SECTIONS,
  generateId,
  ls,
} from "../utils/localStorage";

// ─── Helpers ─────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);

function getStatus(hw: HomeworkType): "active" | "overdue" {
  return hw.dueDate < today ? "overdue" : "active";
}

// ─── Homework List Tab ───────────────────────────────────
function HomeworkListTab() {
  const { currentSession, currentUser, addNotification } = useApp();
  const subjects = ls.get<Subject[]>(LS_KEYS.subjects, []);

  const [items, setItems] = useState<HomeworkType[]>(() => {
    const ds = dataService.get<HomeworkType>("homework");
    return ds.length > 0 ? ds : ls.get<HomeworkType[]>(LS_KEYS.homework, []);
  });
  const [filterClass, setFilterClass] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<HomeworkType | null>(null);

  const [form, setForm] = useState({
    class: "",
    section: "",
    subject: "",
    title: "",
    description: "",
    dueDate: "",
  });

  const sessionItems = useMemo(
    () =>
      items.filter(
        (hw) => !hw.sessionId || hw.sessionId === currentSession?.id,
      ),
    [items, currentSession],
  );

  const filtered = useMemo(
    () =>
      sessionItems.filter((hw) => {
        const matchClass = filterClass === "all" || hw.class === filterClass;
        const matchSubject =
          filterSubject === "all" || hw.subject === filterSubject;
        const status = getStatus(hw);
        const matchStatus = filterStatus === "all" || filterStatus === status;
        return matchClass && matchSubject && matchStatus;
      }),
    [sessionItems, filterClass, filterSubject, filterStatus],
  );

  const handleSubmit = () => {
    if (!form.class || !form.subject || !form.title || !form.dueDate) return;

    if (editing) {
      const updated = items.map((hw) =>
        hw.id === editing.id
          ? { ...hw, ...form, assignedBy: currentUser?.name ?? "Teacher" }
          : hw,
      );
      setItems(updated);
      ls.set(LS_KEYS.homework, updated);
      // Update via DataService
      void dataService.update("homework", editing.id, {
        ...form,
        assignedBy: currentUser?.name ?? "Teacher",
      } as Record<string, unknown>);
    } else {
      const hw: HomeworkType = {
        id: generateId(),
        class: form.class,
        section: form.section,
        subject: form.subject,
        title: form.title,
        description: form.description,
        dueDate: form.dueDate,
        assignedBy: currentUser?.name ?? "Teacher",
        createdAt: new Date().toISOString(),
        sessionId: currentSession?.id,
      };
      const updated = [hw, ...items];
      setItems(updated);
      ls.set(LS_KEYS.homework, updated);
      // Save via DataService (server-first)
      void dataService.save(
        "homework",
        hw as unknown as Record<string, unknown>,
      );
    }

    addNotification(
      `Homework "${form.title}" ${editing ? "updated" : "added"}`,
      "success",
      "📚",
    );
    setShowForm(false);
    setEditing(null);
    setForm({
      class: "",
      section: "",
      subject: "",
      title: "",
      description: "",
      dueDate: "",
    });
  };

  const openEdit = (hw: HomeworkType) => {
    setEditing(hw);
    setForm({
      class: hw.class,
      section: hw.section,
      subject: hw.subject,
      title: hw.title,
      description: hw.description,
      dueDate: hw.dueDate,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const updated = items.filter((hw) => hw.id !== id);
    setItems(updated);
    ls.set(LS_KEYS.homework, updated);
    void dataService.delete("homework", id);
  };

  const overdueCount = sessionItems.filter(
    (hw) => getStatus(hw) === "overdue",
  ).length;

  return (
    <div className="space-y-4">
      {overdueCount > 0 && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/30 text-sm">
          <Clock className="w-4 h-4 text-destructive" />
          <span className="text-destructive font-medium">
            {overdueCount} overdue assignments detected
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-between">
        <div className="flex gap-2 flex-wrap">
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-28" data-ocid="hw-filter-class">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {CLASSES.map((c) => (
                <SelectItem key={c} value={c}>
                  Class {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-32" data-ocid="hw-filter-subject">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32" data-ocid="hw-filter-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          data-ocid="add-homework-btn"
        >
          <PlusCircle className="w-4 h-4 mr-1" /> Add Homework
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div
          className="text-center py-14 text-muted-foreground"
          data-ocid="hw-empty-state"
        >
          <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No homework assignments found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left p-3 font-semibold">Title</th>
                <th className="text-left p-3 font-semibold">Class</th>
                <th className="text-left p-3 font-semibold">Subject</th>
                <th className="text-left p-3 font-semibold">Due Date</th>
                <th className="text-left p-3 font-semibold">Assigned By</th>
                <th className="text-left p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((hw) => {
                const status = getStatus(hw);
                return (
                  <tr
                    key={hw.id}
                    className="border-t border-border hover:bg-muted/20"
                    data-ocid="hw-row"
                  >
                    <td className="p-3">
                      <div>
                        <p className="font-medium">{hw.title}</p>
                        {hw.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {hw.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      Class {hw.class}
                      {hw.section ? ` - ${hw.section}` : ""}
                    </td>
                    <td className="p-3">{hw.subject}</td>
                    <td className="p-3 whitespace-nowrap">{hw.dueDate}</td>
                    <td className="p-3">{hw.assignedBy}</td>
                    <td className="p-3">
                      <Badge
                        variant={
                          status === "overdue" ? "destructive" : "default"
                        }
                        className="text-xs"
                      >
                        {status === "overdue" ? "⚠ Overdue" : "Active"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(hw)}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDelete(hw.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Homework" : "Add Homework"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Class</Label>
                <Select
                  value={form.class}
                  onValueChange={(v) => setForm((f) => ({ ...f, class: v }))}
                >
                  <SelectTrigger data-ocid="hw-class-select">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASSES.map((c) => (
                      <SelectItem key={c} value={c}>
                        Class {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Section</Label>
                <Select
                  value={form.section}
                  onValueChange={(v) => setForm((f) => ({ ...f, section: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {SECTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Subject</Label>
              <Select
                value={form.subject}
                onValueChange={(v) => setForm((f) => ({ ...f, subject: v }))}
              >
                <SelectTrigger data-ocid="hw-subject-select">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="Hindi">Hindi</SelectItem>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Mathematics">Mathematics</SelectItem>
                  <SelectItem value="Science">Science</SelectItem>
                  <SelectItem value="Social Science">Social Science</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Homework title..."
                data-ocid="hw-title-input"
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Details..."
              />
            </div>
            <div className="space-y-1">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dueDate: e.target.value }))
                }
                data-ocid="hw-due-input"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSubmit}
                className="flex-1"
                data-ocid="hw-save-btn"
              >
                Save
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Submission Tracker Tab ──────────────────────────────
type SubmissionStatus = "submitted" | "late" | "missing";

function SubmissionTrackerTab() {
  const { currentSession } = useApp();
  const homeworkItems = ls
    .get<HomeworkType[]>(LS_KEYS.homework, [])
    .filter((hw) => !hw.sessionId || hw.sessionId === currentSession?.id);

  const [selectedHwId, setSelectedHwId] = useState("");
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>(() =>
    ls.get<HomeworkSubmission[]>(LS_KEYS.homeworkSubmissions, []),
  );

  const selectedHw = homeworkItems.find((hw) => hw.id === selectedHwId);

  const classStudents = useMemo(() => {
    if (!selectedHw) return [];
    return ls
      .get<Student[]>(LS_KEYS.students, [])
      .filter(
        (s) =>
          s.class === selectedHw.class &&
          (!selectedHw.section || s.section === selectedHw.section) &&
          s.status === "active",
      );
  }, [selectedHw]);

  const getSubmission = (studentId: string) =>
    submissions.find(
      (sub) => sub.homeworkId === selectedHwId && sub.studentId === studentId,
    );

  const setStatus = (studentId: string, status: SubmissionStatus) => {
    const existing = submissions.filter(
      (sub) =>
        !(sub.homeworkId === selectedHwId && sub.studentId === studentId),
    );
    const newSub: HomeworkSubmission = {
      id: generateId(),
      homeworkId: selectedHwId,
      studentId,
      submittedAt: new Date().toISOString(),
      status,
    };
    const updated = [...existing, newSub];
    setSubmissions(updated);
    ls.set(LS_KEYS.homeworkSubmissions, updated);
  };

  const submittedCount = classStudents.filter((s) => {
    const sub = getSubmission(s.id);
    return sub?.status === "submitted";
  }).length;
  const lateCount = classStudents.filter(
    (s) => getSubmission(s.id)?.status === "late",
  ).length;
  const missingCount = classStudents.filter(
    (s) => !getSubmission(s.id) || getSubmission(s.id)?.status === "missing",
  ).length;
  const submissionPct =
    classStudents.length > 0
      ? Math.round((submittedCount / classStudents.length) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <div className="max-w-sm">
        <Label>Select Homework Assignment</Label>
        <Select value={selectedHwId} onValueChange={setSelectedHwId}>
          <SelectTrigger className="mt-1" data-ocid="tracker-hw-select">
            <SelectValue placeholder="Choose homework..." />
          </SelectTrigger>
          <SelectContent>
            {homeworkItems.map((hw) => (
              <SelectItem key={hw.id} value={hw.id}>
                {hw.title} — Class {hw.class} {hw.section} ({hw.subject})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedHw && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="font-bold text-green-700">
                    {submittedCount}/{classStudents.length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Late</p>
                  <p className="font-bold text-amber-700">{lateCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-3 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Missing</p>
                  <p className="font-bold text-red-600">{missingCount}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Submission Rate</span>
              <span className="font-semibold">{submissionPct}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${submissionPct}%` }}
              />
            </div>
          </div>

          {/* Student Table */}
          {classStudents.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No students in this class/section.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-semibold">Student</th>
                    <th className="text-left p-3 font-semibold">Adm. No.</th>
                    <th className="text-left p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold">Mark</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((s) => {
                    const sub = getSubmission(s.id);
                    return (
                      <tr
                        key={s.id}
                        className="border-t border-border hover:bg-muted/20"
                        data-ocid="tracker-student-row"
                      >
                        <td className="p-3 font-medium">{s.fullName}</td>
                        <td className="p-3 text-muted-foreground">{s.admNo}</td>
                        <td className="p-3">
                          {!sub || sub.status === "missing" ? (
                            <Badge variant="destructive" className="text-xs">
                              Missing
                            </Badge>
                          ) : sub.status === "late" ? (
                            <Badge className="text-xs bg-amber-100 text-amber-800">
                              Late
                            </Badge>
                          ) : (
                            <Badge className="text-xs bg-green-100 text-green-800">
                              Submitted
                            </Badge>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant={
                                sub?.status === "submitted"
                                  ? "default"
                                  : "outline"
                              }
                              className="h-7 px-2 text-xs"
                              onClick={() => setStatus(s.id, "submitted")}
                            >
                              ✓ Done
                            </Button>
                            <Button
                              size="sm"
                              variant={
                                sub?.status === "late" ? "default" : "outline"
                              }
                              className="h-7 px-2 text-xs"
                              onClick={() => setStatus(s.id, "late")}
                            >
                              Late
                            </Button>
                            <Button
                              size="sm"
                              variant={
                                sub?.status === "missing"
                                  ? "destructive"
                                  : "outline"
                              }
                              className="h-7 px-2 text-xs"
                              onClick={() => setStatus(s.id, "missing")}
                            >
                              ✗
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
        </>
      )}
    </div>
  );
}

// ─── Analytics Tab ───────────────────────────────────────
function AnalyticsTab() {
  const { currentSession } = useApp();
  const hwItems = ls
    .get<HomeworkType[]>(LS_KEYS.homework, [])
    .filter((hw) => !hw.sessionId || hw.sessionId === currentSession?.id);
  const submissions = ls.get<HomeworkSubmission[]>(
    LS_KEYS.homeworkSubmissions,
    [],
  );
  const students = ls
    .get<Student[]>(LS_KEYS.students, [])
    .filter((s) => s.sessionId === currentSession?.id && s.status === "active");

  // Submission rate by class
  const byClass = CLASSES.map((c) => {
    const classHw = hwItems.filter((hw) => hw.class === c);
    const classStudents = students.filter((s) => s.class === c);
    const total = classHw.length * classStudents.length;
    const submitted = submissions.filter(
      (sub) =>
        classHw.some((hw) => hw.id === sub.homeworkId) &&
        sub.status === "submitted",
    ).length;
    return {
      class: c,
      submitted,
      total,
      pct: total > 0 ? Math.round((submitted / total) * 100) : 0,
    };
  }).filter((c) => c.total > 0);

  // Overall status distribution
  const totalSubs = submissions.length;
  const onTime = submissions.filter((s) => s.status === "submitted").length;
  const late = submissions.filter((s) => s.status === "late").length;
  const missing = submissions.filter((s) => s.status === "missing").length;

  // Subject completion rate
  const subjects = ls.get<{ id: string; name: string }[]>(LS_KEYS.subjects, []);
  const subjectData = subjects
    .map((sub) => {
      const subHw = hwItems.filter((hw) => hw.subject === sub.name);
      const subSubs = submissions.filter(
        (s) =>
          subHw.some((hw) => hw.id === s.homeworkId) &&
          s.status === "submitted",
      );
      const total = subHw.length;
      return {
        name: sub.name,
        completed: subSubs.length,
        total,
        pct: total > 0 ? Math.round((subSubs.length / total) * 100) : 0,
      };
    })
    .filter((s) => s.total > 0);

  const STATUS_COLORS = {
    submitted: "#22c55e",
    late: "#f59e0b",
    missing: "#ef4444",
  };

  return (
    <div className="space-y-6">
      {/* Overall submission stats */}
      {totalSubs === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BarChart2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No submission data yet. Mark submissions in the Tracker tab.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* On-time vs late vs missing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4" /> Submission Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6 flex-wrap">
                {(
                  [
                    {
                      label: "On Time",
                      count: onTime,
                      color: STATUS_COLORS.submitted,
                    },
                    { label: "Late", count: late, color: STATUS_COLORS.late },
                    {
                      label: "Missing",
                      count: missing,
                      color: STATUS_COLORS.missing,
                    },
                  ] as const
                ).map((item) => {
                  const pct =
                    totalSubs > 0
                      ? Math.round((item.count / totalSubs) * 100)
                      : 0;
                  return (
                    <div key={item.label} className="flex-1 min-w-[120px]">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="flex items-center gap-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          {item.label}
                        </span>
                        <span className="font-semibold">{pct}%</span>
                      </div>
                      <div className="h-3 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.count} submissions
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Submission rate by class */}
          {byClass.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart2 className="w-4 h-4" /> Submission Rate by Class
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {byClass.map((c) => (
                    <div key={c.class} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-16 shrink-0">
                        Class {c.class}
                      </span>
                      <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${c.pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold w-10 text-right">
                        {c.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Subject-wise completion */}
          {subjectData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Subject-wise Completion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-semibold">Subject</th>
                        <th className="text-right p-3 font-semibold">
                          Assignments
                        </th>
                        <th className="text-right p-3 font-semibold">
                          Completed
                        </th>
                        <th className="p-3 font-semibold">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjectData.map((s) => (
                        <tr
                          key={s.name}
                          className="border-t border-border hover:bg-muted/20"
                        >
                          <td className="p-3 font-medium">{s.name}</td>
                          <td className="p-3 text-right text-muted-foreground">
                            {s.total}
                          </td>
                          <td className="p-3 text-right">{s.completed}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${s.pct}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold w-8 text-right">
                                {s.pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────
export default function Homework() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <BookOpen className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold font-display">Homework</h1>
          <p className="text-sm text-muted-foreground">
            Assign, track, and analyse student homework
          </p>
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList data-ocid="homework-tabs">
          <TabsTrigger value="list">
            <BookOpen className="w-4 h-4 mr-1.5" /> Homework List
          </TabsTrigger>
          <TabsTrigger value="tracker">
            <CheckCircle className="w-4 h-4 mr-1.5" /> Submission Tracker
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart2 className="w-4 h-4 mr-1.5" /> Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardContent className="pt-5">
              <HomeworkListTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracker">
          <Card>
            <CardContent className="pt-5">
              <SubmissionTrackerTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
