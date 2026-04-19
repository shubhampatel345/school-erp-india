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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Edit2,
  Plus,
  Trash2,
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

interface HWForm {
  class: string;
  section: string;
  subject: string;
  title: string;
  description: string;
  dueDate: string;
}

const EMPTY_FORM: HWForm = {
  class: "",
  section: "",
  subject: "",
  title: "",
  description: "",
  dueDate: "",
};

function isOverdue(dueDate: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

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
            <SelectTrigger data-ocid="homework.form_class_select">
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
            <SelectTrigger data-ocid="homework.form_section_select">
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
            data-ocid="homework.form_subject_input"
          />
        </div>
        <div>
          <Label>Due Date *</Label>
          <Input
            type="date"
            value={form.dueDate}
            onChange={(e) => set("dueDate", e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <Label>Title *</Label>
          <Input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Assignment title"
            data-ocid="homework.form_title_input"
          />
        </div>
        <div className="col-span-2">
          <Label>Description</Label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            data-ocid="homework.form_description_textarea"
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
          onClick={() => {
            if (!form.class || !form.subject || !form.title || !form.dueDate)
              return;
            onSave(form);
          }}
          data-ocid="homework.form_submit_button"
        >
          Save
        </Button>
      </div>
    </div>
  );
}

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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Homework | null>(null);
  const [filterClass, setFilterClass] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");
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
        if (filterSubject !== "all" && h.subject !== filterSubject)
          return false;
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [homeworkList, filterClass, filterSubject]);

  // Analytics
  const analytics = useMemo(() => {
    const subjectCount: Record<string, number> = {};
    const overdueCount = homeworkList.filter((h) =>
      isOverdue(h.dueDate),
    ).length;
    const completedCount = homeworkList.filter(
      (h) => !isOverdue(h.dueDate),
    ).length;
    for (const h of homeworkList) {
      subjectCount[h.subject] = (subjectCount[h.subject] ?? 0) + 1;
    }
    const classCount: Record<string, number> = {};
    for (const h of homeworkList) {
      classCount[h.class] = (classCount[h.class] ?? 0) + 1;
    }
    return { subjectCount, overdueCount, completedCount, classCount };
  }, [homeworkList]);

  const handleSave = async (form: HWForm) => {
    const record: Record<string, unknown> = {
      class: form.class,
      section: form.section,
      subject: form.subject,
      title: form.title,
      description: form.description,
      dueDate: form.dueDate,
      assignedBy: currentUser?.name ?? "Admin",
      createdAt: new Date().toISOString(),
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

  const SubmissionTracker = ({ hw }: { hw: Homework }) => {
    const classStudents = students.filter(
      (s) =>
        s.class === hw.class &&
        (!hw.section || hw.section === "all" || s.section === hw.section),
    );
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-foreground">{hw.title}</p>
          <Badge variant={isOverdue(hw.dueDate) ? "destructive" : "secondary"}>
            {getSubmissionRate(hw)}% submitted
          </Badge>
        </div>
        {classStudents.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No students in {hw.class}
            {hw.section && hw.section !== "all" ? `-${hw.section}` : ""}
          </p>
        ) : (
          <div className="max-h-60 overflow-y-auto space-y-1">
            {classStudents.map((s) => {
              const sub = submissions.find(
                (sub) => sub.homeworkId === hw.id && sub.studentId === s.id,
              );
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-2 p-2 rounded border hover:bg-muted/30"
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
                    <Badge variant="secondary" className="text-xs">
                      {sub.status === "late" ? "Late" : "Submitted"}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 bg-background min-h-screen space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">
            Homework
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {homeworkList.length} assignments
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

      <Tabs defaultValue="assignments">
        <TabsList>
          <TabsTrigger value="assignments" data-ocid="homework.assignments_tab">
            Assignments
          </TabsTrigger>
          <TabsTrigger value="submissions" data-ocid="homework.submissions_tab">
            Submissions
          </TabsTrigger>
          <TabsTrigger value="analytics" data-ocid="homework.analytics_tab">
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="mt-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
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
          </div>

          {filtered.length === 0 ? (
            <div
              className="text-center py-16 text-muted-foreground"
              data-ocid="homework.assignments_empty_state"
            >
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No assignments yet</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((hw, i) => {
                const overdue = isOverdue(hw.dueDate);
                return (
                  <Card
                    key={hw.id}
                    className={`hover:shadow-md transition-shadow ${overdue ? "border-destructive/40" : ""}`}
                    data-ocid={`homework.item.${i + 1}`}
                  >
                    <CardContent className="pt-4 pb-3">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground text-sm truncate">
                            {hw.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {hw.subject} · Class {hw.class}
                            {hw.section && hw.section !== "all"
                              ? `-${hw.section}`
                              : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            By: {hw.assignedBy}
                          </p>
                          <div className="flex items-center gap-1.5 mt-2">
                            {overdue ? (
                              <Badge
                                variant="destructive"
                                className="text-xs flex items-center gap-1"
                              >
                                <AlertTriangle className="w-3 h-3" />
                                Overdue
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Due {hw.dueDate}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {getSubmissionRate(hw)}% submitted
                            </Badge>
                          </div>
                          {hw.description && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                              {hw.description}
                            </p>
                          )}
                        </div>
                        <div
                          className="flex gap-1 ml-2"
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
        </TabsContent>

        <TabsContent value="submissions" className="mt-4 space-y-4">
          {filtered.length === 0 ? (
            <div
              className="text-center py-16 text-muted-foreground"
              data-ocid="homework.submissions_empty_state"
            >
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No assignments to track submissions for</p>
            </div>
          ) : (
            filtered.map((hw, i) => (
              <Card
                key={hw.id}
                data-ocid={`homework.submission_tracker.${i + 1}`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {hw.class}
                    {hw.section && hw.section !== "all" ? `-${hw.section}` : ""}{" "}
                    — {hw.subject}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SubmissionTracker hw={hw} />
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
            <Card className="bg-green-50 border-green-200">
              <CardContent className="py-3 text-center">
                <div className="text-2xl font-bold text-green-700">
                  {analytics.completedCount}
                </div>
                <div className="text-xs text-muted-foreground">On Time</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Subject-wise Count</CardTitle>
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
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="homework.dialog">
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
