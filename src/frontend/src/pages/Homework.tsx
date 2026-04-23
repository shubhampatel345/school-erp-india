/**
 * SHUBH SCHOOL ERP — Homework Module (Rebuilt)
 * Tabs: Assignments | Submissions | Analytics
 * Add/edit homework with class, section, subject, due date, attachment link
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Edit2,
  ExternalLink,
  Link,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import type {
  ClassSection,
  Homework,
  HomeworkSubmission,
  Student,
} from "../types";
import { CLASS_ORDER } from "../types";
import { generateId } from "../utils/localStorage";

// ── Helpers ──────────────────────────────────────────────────

function isOverdue(dueDate: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

function isDueSoon(dueDate: string): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  return due > new Date() && due <= tomorrow;
}

// ── Homework Form ────────────────────────────────────────────

interface HWForm {
  class: string;
  section: string;
  subject: string;
  title: string;
  description: string;
  dueDate: string;
  attachmentUrl: string;
}

const EMPTY_FORM: HWForm = {
  class: "",
  section: "",
  subject: "",
  title: "",
  description: "",
  dueDate: "",
  attachmentUrl: "",
};

function HomeworkFormPanel({
  initial,
  classSections,
  onSave,
  onClose,
}: {
  initial?: Partial<HWForm>;
  classSections: ClassSection[];
  onSave: (f: HWForm) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<HWForm>({ ...EMPTY_FORM, ...initial });
  const set = (k: keyof HWForm, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const sections = useMemo(() => {
    if (!form.class) return ["A", "B", "C", "D"];
    const cs = classSections.find((c) => c.className === form.class);
    return cs?.sections ?? ["A", "B", "C", "D"];
  }, [form.class, classSections]);

  const sortedClasses = useMemo(() => {
    const fromDB = classSections.map((c) => c.className);
    if (fromDB.length > 0)
      return fromDB.sort(
        (a, b) => CLASS_ORDER.indexOf(a) - CLASS_ORDER.indexOf(b),
      );
    return CLASS_ORDER;
  }, [classSections]);

  const canSave = form.class && form.subject && form.title && form.dueDate;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Class *</Label>
          <Select
            value={form.class}
            onValueChange={(v) => {
              set("class", v);
              set("section", "");
            }}
          >
            <SelectTrigger
              className="mt-1"
              data-ocid="homework.form_class_select"
            >
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {sortedClasses.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Section</Label>
          <Select value={form.section} onValueChange={(v) => set("section", v)}>
            <SelectTrigger
              className="mt-1"
              data-ocid="homework.form_section_select"
            >
              <SelectValue placeholder="All sections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {sections.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Subject *</Label>
          <Input
            value={form.subject}
            onChange={(e) => set("subject", e.target.value)}
            placeholder="e.g. Mathematics"
            className="mt-1"
            data-ocid="homework.form_subject_input"
          />
        </div>
        <div>
          <Label>Due Date *</Label>
          <Input
            type="date"
            value={form.dueDate}
            onChange={(e) => set("dueDate", e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="col-span-2">
          <Label>Title *</Label>
          <Input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Assignment title"
            className="mt-1"
            data-ocid="homework.form_title_input"
          />
        </div>
        <div className="col-span-2">
          <Label>Description</Label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring mt-1"
            data-ocid="homework.form_description_textarea"
          />
        </div>
        <div className="col-span-2">
          <Label>Attachment Link (optional)</Label>
          <Input
            value={form.attachmentUrl}
            onChange={(e) => set("attachmentUrl", e.target.value)}
            placeholder="https://docs.google.com/..."
            className="mt-1"
            data-ocid="homework.form_attachment_input"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          onClick={onClose}
          data-ocid="homework.form_cancel_button"
        >
          Cancel
        </Button>
        <Button
          disabled={!canSave}
          onClick={() => {
            if (canSave) onSave(form);
          }}
          data-ocid="homework.form_submit_button"
        >
          Save
        </Button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

export default function HomeworkPage() {
  const {
    getData,
    saveData,
    updateData,
    deleteData,
    currentUser,
    currentSession,
  } = useApp();

  const homeworkList = getData("homework") as Homework[];
  const submissions = getData("homework_submissions") as HomeworkSubmission[];
  const students = getData("students") as Student[];
  const classSections = getData("classes") as ClassSection[];

  const [activeTab, setActiveTab] = useState<
    "assignments" | "submissions" | "analytics"
  >("assignments");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Homework | null>(null);
  const [filterClass, setFilterClass] = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "overdue"
  >("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sessionId = currentSession?.id ?? "";

  const sortedClasses = useMemo(() => {
    const fromDB = classSections.map((c) => c.className);
    if (fromDB.length > 0)
      return fromDB.sort(
        (a, b) => CLASS_ORDER.indexOf(a) - CLASS_ORDER.indexOf(b),
      );
    return CLASS_ORDER;
  }, [classSections]);

  const subjects = useMemo(
    () => [...new Set(homeworkList.map((h) => h.subject))].sort(),
    [homeworkList],
  );

  const filtered = useMemo(() => {
    return homeworkList
      .filter((h) => {
        if (filterClass !== "all" && h.class !== filterClass) return false;
        if (
          filterSection !== "all" &&
          h.section &&
          h.section !== "all" &&
          h.section !== filterSection
        )
          return false;
        if (filterSubject !== "all" && h.subject !== filterSubject)
          return false;
        if (filterStatus === "overdue" && !isOverdue(h.dueDate)) return false;
        if (filterStatus === "pending" && isOverdue(h.dueDate)) return false;
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [homeworkList, filterClass, filterSection, filterSubject, filterStatus]);

  const getSubmissionRate = (hw: Homework): number => {
    const classStudents = students.filter(
      (s) =>
        s.class === hw.class &&
        (hw.section === "all" || !hw.section || s.section === hw.section),
    );
    if (classStudents.length === 0) return 0;
    const subs = submissions.filter((s) => s.homeworkId === hw.id).length;
    return Math.round((subs / classStudents.length) * 100);
  };

  // ── CRUD ──────────────────────────────────────────────────

  const handleSave = async (form: HWForm) => {
    const record: Record<string, unknown> = {
      class: form.class,
      section: form.section,
      subject: form.subject,
      title: form.title,
      description: form.description,
      dueDate: form.dueDate,
      assignedBy: currentUser?.name ?? "Admin",
      attachmentUrl: form.attachmentUrl || undefined,
      createdAt: editItem?.createdAt ?? new Date().toISOString(),
      sessionId,
    };
    if (editItem) {
      await updateData("homework", editItem.id, record);
    } else {
      record.id = generateId();
      await saveData("homework", record);
    }
    setDialogOpen(false);
    setEditItem(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this assignment?")) return;
    await deleteData("homework", id);
  };

  const toggleSubmission = async (hw: Homework, studentId: string) => {
    const existing = submissions.find(
      (s) => s.homeworkId === hw.id && s.studentId === studentId,
    );
    if (existing) {
      await deleteData("homework_submissions", existing.id);
    } else {
      await saveData("homework_submissions", {
        id: generateId(),
        homeworkId: hw.id,
        studentId,
        submittedAt: new Date().toISOString(),
        status: isOverdue(hw.dueDate) ? "late" : "submitted",
      });
    }
  };

  // ── Analytics ─────────────────────────────────────────────

  const analytics = useMemo(() => {
    const subjectCount: Record<string, number> = {};
    const classCount: Record<string, number> = {};
    const overdueCount = homeworkList.filter((h) =>
      isOverdue(h.dueDate),
    ).length;
    const pendingCount = homeworkList.filter(
      (h) => !isOverdue(h.dueDate),
    ).length;
    for (const h of homeworkList) {
      subjectCount[h.subject] = (subjectCount[h.subject] ?? 0) + 1;
      classCount[h.class] = (classCount[h.class] ?? 0) + 1;
    }
    const totalSubmissions = submissions.length;
    const totalPossible = homeworkList.reduce((acc, hw) => {
      return (
        acc +
        students.filter(
          (s) =>
            s.class === hw.class &&
            (hw.section === "all" || !hw.section || s.section === hw.section),
        ).length
      );
    }, 0);
    const overallRate =
      totalPossible > 0
        ? Math.round((totalSubmissions / totalPossible) * 100)
        : 0;
    return {
      subjectCount,
      classCount,
      overdueCount,
      pendingCount,
      overallRate,
    };
  }, [homeworkList, submissions, students]);

  // ── Submission Tracker ─────────────────────────────────────

  function SubmissionTracker({ hw }: { hw: Homework }) {
    const classStudents = students.filter(
      (s) =>
        s.class === hw.class &&
        (!hw.section || hw.section === "all" || s.section === hw.section),
    );
    const submitted = classStudents.filter((s) =>
      submissions.some(
        (sub) => sub.homeworkId === hw.id && sub.studentId === s.id,
      ),
    );
    const missing = classStudents.filter(
      (s) =>
        !submissions.some(
          (sub) => sub.homeworkId === hw.id && sub.studentId === s.id,
        ),
    );

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">{hw.title}</p>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {submitted.length}/{classStudents.length} submitted
            </Badge>
            {isOverdue(hw.dueDate) && (
              <Badge variant="destructive" className="text-xs">
                Overdue
              </Badge>
            )}
          </div>
        </div>
        {classStudents.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No students in {hw.class}
            {hw.section && hw.section !== "all" ? `-${hw.section}` : ""}
          </p>
        ) : (
          <div className="max-h-52 overflow-y-auto space-y-1">
            {classStudents.map((s) => {
              const sub = submissions.find(
                (sub) => sub.homeworkId === hw.id && sub.studentId === s.id,
              );
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-2 p-1.5 rounded border border-border hover:bg-muted/30"
                >
                  <Checkbox
                    checked={!!sub}
                    onCheckedChange={() => toggleSubmission(hw, s.id)}
                    id={`sub-${hw.id}-${s.id}`}
                  />
                  <label
                    htmlFor={`sub-${hw.id}-${s.id}`}
                    className="text-sm flex-1 cursor-pointer"
                  >
                    {s.fullName}
                  </label>
                  {sub && (
                    <Badge
                      variant={
                        sub.status === "late" ? "destructive" : "secondary"
                      }
                      className="text-xs"
                    >
                      {sub.status === "late" ? "Late" : "✓"}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {missing.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {missing.length} student{missing.length !== 1 ? "s" : ""} yet to
            submit
          </p>
        )}
      </div>
    );
  }

  const TABS = [
    { id: "assignments" as const, label: "Assignments" },
    { id: "submissions" as const, label: "Submissions" },
    { id: "analytics" as const, label: "Analytics" },
  ];

  return (
    <div className="p-4 md:p-6 bg-background min-h-screen space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">
            Homework
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {homeworkList.length} assignments · {analytics.overdueCount} overdue
          </p>
        </div>
        <Button
          onClick={() => {
            setEditItem(null);
            setDialogOpen(true);
          }}
          data-ocid="homework.add_button"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Assignment
        </Button>
      </div>

      {/* Tabs */}
      <div className="bg-card border border-border rounded-xl p-1 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
            data-ocid={`homework.${t.id}_tab`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ASSIGNMENTS TAB ── */}
      {activeTab === "assignments" && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap items-center">
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger
                className="w-32"
                data-ocid="homework.filter_class_select"
              >
                <SelectValue placeholder="All classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {sortedClasses.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSection} onValueChange={setFilterSection}>
              <SelectTrigger
                className="w-28"
                data-ocid="homework.filter_section_select"
              >
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {["A", "B", "C", "D", "E"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger
                className="w-36"
                data-ocid="homework.filter_subject_select"
              >
                <SelectValue placeholder="All subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterStatus}
              onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}
            >
              <SelectTrigger
                className="w-32"
                data-ocid="homework.filter_status_select"
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <div
              className="text-center py-16 text-muted-foreground"
              data-ocid="homework.assignments_empty_state"
            >
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No assignments found</p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => setDialogOpen(true)}
              >
                Add First Assignment
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((hw, i) => {
                const overdue = isOverdue(hw.dueDate);
                const soon = isDueSoon(hw.dueDate);
                const rate = getSubmissionRate(hw);
                const isExpanded = expandedId === hw.id;
                return (
                  <Card
                    key={hw.id}
                    className={`hover:shadow-md transition-shadow cursor-pointer ${overdue ? "border-destructive/40" : soon ? "border-yellow-500/40" : ""}`}
                    data-ocid={`homework.item.${i + 1}`}
                    onClick={() => setExpandedId(isExpanded ? null : hw.id)}
                  >
                    <CardContent className="pt-4 pb-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground text-sm truncate">
                            {hw.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {hw.subject} · {hw.class}
                            {hw.section && hw.section !== "all"
                              ? `-${hw.section}`
                              : ""}{" "}
                            · By {hw.assignedBy}
                          </p>
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {overdue ? (
                              <Badge
                                variant="destructive"
                                className="text-xs flex items-center gap-1"
                              >
                                <AlertTriangle className="w-3 h-3" />
                                Overdue
                              </Badge>
                            ) : soon ? (
                              <Badge className="text-xs bg-yellow-500/20 text-yellow-700 border border-yellow-500/40">
                                Due soon
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Due {hw.dueDate}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              <Users className="w-3 h-3 mr-1" />
                              {rate}% submitted
                            </Badge>
                            {hw.attachmentUrl && (
                              <a
                                href={hw.attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                              >
                                <Link className="w-3 h-3" />
                                Attachment
                              </a>
                            )}
                          </div>
                          {isExpanded && hw.description && (
                            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                              {hw.description}
                            </p>
                          )}
                          {/* Submission progress bar */}
                          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                        </div>
                        <div
                          className="flex gap-1 ml-1 flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditItem(hw);
                              setDialogOpen(true);
                            }}
                            data-ocid={`homework.edit_button.${i + 1}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => handleDelete(hw.id)}
                            data-ocid={`homework.delete_button.${i + 1}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SUBMISSIONS TAB ── */}
      {activeTab === "submissions" && (
        <div className="space-y-4">
          {/* Class filter for submissions */}
          <div className="flex gap-2">
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger
                className="w-36"
                data-ocid="homework.sub_filter_class"
              >
                <SelectValue placeholder="All classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {sortedClasses.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <div
              className="text-center py-16 text-muted-foreground"
              data-ocid="homework.submissions_empty_state"
            >
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No assignments to track</p>
            </div>
          ) : (
            filtered.map((hw, i) => (
              <Card
                key={hw.id}
                data-ocid={`homework.submission_tracker.${i + 1}`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>
                      {hw.class}
                      {hw.section && hw.section !== "all"
                        ? `-${hw.section}`
                        : ""}{" "}
                      — {hw.subject}
                    </span>
                    {isOverdue(hw.dueDate) && (
                      <Badge variant="destructive" className="text-xs">
                        Overdue
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SubmissionTracker hw={hw} />
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ── ANALYTICS TAB ── */}
      {activeTab === "analytics" && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-3 text-center">
                <div className="text-2xl font-bold text-primary">
                  {homeworkList.length}
                </div>
                <div className="text-xs text-muted-foreground">
                  Total Assignments
                </div>
              </CardContent>
            </Card>
            <Card className="bg-destructive/5 border-destructive/20">
              <CardContent className="py-3 text-center">
                <div className="text-2xl font-bold text-destructive">
                  {analytics.overdueCount}
                </div>
                <div className="text-xs text-muted-foreground">Overdue</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 text-center">
                <div className="text-2xl font-bold text-foreground">
                  {analytics.pendingCount}
                </div>
                <div className="text-xs text-muted-foreground">On Time</div>
              </CardContent>
            </Card>
            <Card className="bg-accent/10 border-accent/20">
              <CardContent className="py-3 text-center">
                <div className="text-2xl font-bold text-accent">
                  {analytics.overallRate}%
                </div>
                <div className="text-xs text-muted-foreground">
                  Submission Rate
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Subject-wise */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Subject-wise Assignments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.entries(analytics.subjectCount).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data yet</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(analytics.subjectCount)
                      .sort(([, a], [, b]) => b - a)
                      .map(([sub, count]) => (
                        <div key={sub} className="flex items-center gap-2">
                          <span className="text-sm text-foreground w-32 truncate">
                            {sub}
                          </span>
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{
                                width: `${(count / homeworkList.length) * 100}%`,
                              }}
                            />
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {count}
                          </Badge>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Class-wise */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Class-wise Frequency</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.entries(analytics.classCount).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data yet</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(analytics.classCount)
                      .sort(([, a], [, b]) => b - a)
                      .map(([cls, count]) => (
                        <div key={cls} className="flex items-center gap-2">
                          <span className="text-sm text-foreground w-24 truncate">
                            {cls}
                          </span>
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div
                              className="bg-accent h-2 rounded-full"
                              style={{
                                width: `${(count / homeworkList.length) * 100}%`,
                              }}
                            />
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {count}
                          </Badge>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Overdue list */}
          {analytics.overdueCount > 0 && (
            <Card className="border-destructive/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-4 h-4" />
                  Overdue Assignments ({analytics.overdueCount})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {homeworkList
                    .filter((h) => isOverdue(h.dueDate))
                    .map((hw, i) => (
                      <div
                        key={hw.id}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm"
                        data-ocid={`homework.overdue_item.${i + 1}`}
                      >
                        <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                        <span className="font-medium flex-1 truncate">
                          {hw.title}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {hw.class} · {hw.subject}
                        </span>
                        <Badge variant="destructive" className="text-xs">
                          Due {hw.dueDate}
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" data-ocid="homework.dialog">
          <DialogHeader>
            <DialogTitle>
              {editItem ? "Edit Assignment" : "Add Assignment"}
            </DialogTitle>
          </DialogHeader>
          <HomeworkFormPanel
            initial={
              editItem
                ? {
                    class: editItem.class,
                    section: editItem.section,
                    subject: editItem.subject,
                    title: editItem.title,
                    description: editItem.description,
                    dueDate: editItem.dueDate,
                    attachmentUrl: editItem.attachmentUrl ?? "",
                  }
                : undefined
            }
            classSections={classSections}
            onSave={handleSave}
            onClose={() => {
              setDialogOpen(false);
              setEditItem(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
