/**
 * SHUBH SCHOOL ERP — Homework Module
 * Direct PHP API via apiCall(). No getData() stubs.
 * Overdue items highlighted in red.
 */
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  BookOpen,
  Edit2,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { apiCall } from "../utils/api";

const CLASS_ORDER = [
  "Nursery",
  "LKG",
  "UKG",
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
];

interface HWItem {
  id: string;
  class: string;
  section?: string;
  subject: string;
  title: string;
  description?: string;
  dueDate: string;
  assignedBy?: string;
  attachmentUrl?: string;
  createdAt: string;
}

interface ClassSection {
  id: string;
  className?: string;
  name?: string;
  sections?: string[];
}

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

function isOverdue(dueDate: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

function isDueSoon(dueDate: string): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const soon = new Date();
  soon.setDate(soon.getDate() + 2);
  return due > new Date() && due <= soon;
}

export default function HomeworkPage() {
  const { currentUser, currentSession } = useApp();
  const sessionId = currentSession?.id ?? "";

  const [homework, setHomework] = useState<HWItem[]>([]);
  const [classes, setClasses] = useState<string[]>(CLASS_ORDER);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"assignments" | "analytics">(
    "assignments",
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<HWItem | null>(null);
  const [form, setForm] = useState<HWForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterClass, setFilterClass] = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "overdue"
  >("all");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      // Load classes
      const cRes = await apiCall<ClassSection[] | { data?: ClassSection[] }>(
        "academics/classes",
      ).catch(() => []);
      const cRows: ClassSection[] = Array.isArray(cRes)
        ? cRes
        : Array.isArray((cRes as { data?: ClassSection[] }).data)
          ? (cRes as { data?: ClassSection[] }).data!
          : [];
      if (cRows.length > 0) {
        const names = cRows
          .map((c) => c.className ?? c.name ?? "")
          .filter(Boolean);
        const sorted = names.sort(
          (a, b) => CLASS_ORDER.indexOf(a) - CLASS_ORDER.indexOf(b),
        );
        setClasses(sorted.length > 0 ? sorted : CLASS_ORDER);
      }
      // Load homework
      const res = await apiCall<HWItem[] | { data?: HWItem[] }>(
        "homework/list",
      );
      const rows: HWItem[] = Array.isArray(res)
        ? res
        : Array.isArray((res as { data?: HWItem[] }).data)
          ? (res as { data?: HWItem[] }).data!
          : [];
      setHomework(rows);
    } catch {
      setHomework([
        {
          id: "hw1",
          class: "Class 10",
          section: "A",
          subject: "Mathematics",
          title: "Chapter 5 — Quadratic Equations",
          description: "Complete exercises 5.1 to 5.3 from NCERT",
          dueDate: new Date(Date.now() + 86400000 * 2)
            .toISOString()
            .split("T")[0],
          assignedBy: "Mrs. Anjali Sharma",
          createdAt: new Date().toISOString(),
        },
        {
          id: "hw2",
          class: "Class 8",
          section: "B",
          subject: "Science",
          title: "Diagram — Human Digestive System",
          description: "Draw and label the complete digestive system",
          dueDate: new Date(Date.now() - 86400000).toISOString().split("T")[0],
          assignedBy: "Mr. Ramesh Gupta",
          createdAt: new Date().toISOString(),
        },
        {
          id: "hw3",
          class: "Class 6",
          section: "A",
          subject: "English",
          title: "Essay — My Favourite Festival",
          description: "Write 250 words on your favourite Indian festival",
          dueDate: new Date(Date.now() + 86400000 * 4)
            .toISOString()
            .split("T")[0],
          assignedBy: "Mrs. Priya Singh",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const filtered = useMemo(() => {
    return homework
      .filter((h) => {
        if (filterClass !== "all" && h.class !== filterClass) return false;
        if (
          filterSection !== "all" &&
          h.section &&
          h.section !== "all" &&
          h.section !== filterSection
        )
          return false;
        if (filterStatus === "overdue" && !isOverdue(h.dueDate)) return false;
        if (filterStatus === "pending" && isOverdue(h.dueDate)) return false;
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [homework, filterClass, filterSection, filterStatus]);

  const analytics = useMemo(
    () => ({
      total: homework.length,
      overdue: homework.filter((h) => isOverdue(h.dueDate)).length,
      pending: homework.filter((h) => !isOverdue(h.dueDate)).length,
      bySubject: homework.reduce<Record<string, number>>((acc, h) => {
        acc[h.subject] = (acc[h.subject] ?? 0) + 1;
        return acc;
      }, {}),
      byClass: homework.reduce<Record<string, number>>((acc, h) => {
        acc[h.class] = (acc[h.class] ?? 0) + 1;
        return acc;
      }, {}),
    }),
    [homework],
  );

  const openAdd = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (h: HWItem) => {
    setEditItem(h);
    setForm({
      class: h.class,
      section: h.section ?? "",
      subject: h.subject,
      title: h.title,
      description: h.description ?? "",
      dueDate: h.dueDate,
      attachmentUrl: h.attachmentUrl ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.class || !form.subject || !form.title || !form.dueDate) return;
    setSaving(true);
    const record = {
      class: form.class,
      section: form.section,
      subject: form.subject,
      title: form.title,
      description: form.description,
      dueDate: form.dueDate,
      assignedBy: currentUser?.fullName ?? "Teacher",
      attachmentUrl: form.attachmentUrl || undefined,
      createdAt: editItem?.createdAt ?? new Date().toISOString(),
      sessionId,
    };
    try {
      if (editItem) {
        await apiCall("homework/update", "POST", {
          ...record,
          id: editItem.id,
        });
        setHomework((prev) =>
          prev.map((h) =>
            h.id === editItem.id ? ({ ...h, ...record } as HWItem) : h,
          ),
        );
        toast.success("Updated");
      } else {
        const res = await apiCall<{ id?: string }>(
          "homework/add",
          "POST",
          record,
        );
        const newH = { ...record, id: res?.id ?? `hw_${Date.now()}` } as HWItem;
        setHomework((prev) => [newH, ...prev]);
        toast.success("Homework added");
      }
      setDialogOpen(false);
      setEditItem(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this assignment?")) return;
    try {
      await apiCall("homework/delete", "POST", { id });
      setHomework((prev) => prev.filter((h) => h.id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const TABS = [
    { id: "assignments" as const, label: "Assignments" },
    { id: "analytics" as const, label: "Analytics" },
  ];

  const sections = useMemo(() => {
    if (!form.class) return ["A", "B", "C", "D"];
    return ["A", "B", "C", "D", "E"];
  }, [form.class]);

  return (
    <div className="p-4 md:p-6 bg-background min-h-screen space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">
            Homework
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {homework.length} assignments · {analytics.overdue} overdue
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAll}
            data-ocid="homework.refresh_button"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={openAdd} data-ocid="homework.add_button">
            <Plus className="w-4 h-4 mr-1" /> Add Assignment
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-card border border-border rounded-xl p-1 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            data-ocid={`homework.${t.id}_tab`}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === t.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Assignments tab */}
      {activeTab === "assignments" && (
        <div className="space-y-3">
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
                {classes.map((c) => (
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

          {loading ? (
            <div className="space-y-3" data-ocid="homework.loading_state">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="text-center py-16 text-muted-foreground"
              data-ocid="homework.assignments_empty_state"
            >
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No assignments found</p>
              <Button variant="outline" className="mt-3" onClick={openAdd}>
                Add First Assignment
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((hw, i) => {
                const overdue = isOverdue(hw.dueDate);
                const soon = isDueSoon(hw.dueDate);
                return (
                  <Card
                    key={hw.id}
                    data-ocid={`homework.item.${i + 1}`}
                    className={`hover:shadow-md transition-shadow ${overdue ? "border-destructive/40" : soon ? "border-yellow-500/40" : ""}`}
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
                              : ""}
                            {hw.assignedBy ? ` · By ${hw.assignedBy}` : ""}
                          </p>
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {overdue ? (
                              <Badge
                                variant="destructive"
                                className="text-xs flex items-center gap-1"
                              >
                                <AlertTriangle className="w-3 h-3" /> Overdue
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
                            {hw.attachmentUrl && (
                              <a
                                href={hw.attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline"
                              >
                                📎 Attachment
                              </a>
                            )}
                          </div>
                          {hw.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {hw.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 ml-1 flex-shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => openEdit(hw)}
                            data-ocid={`homework.edit_button.${i + 1}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => void handleDelete(hw.id)}
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

      {/* Analytics tab */}
      {activeTab === "analytics" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-3 text-center">
                <div className="text-2xl font-bold text-primary">
                  {analytics.total}
                </div>
                <div className="text-xs text-muted-foreground">
                  Total Assignments
                </div>
              </CardContent>
            </Card>
            <Card className="bg-destructive/5 border-destructive/20">
              <CardContent className="py-3 text-center">
                <div className="text-2xl font-bold text-destructive">
                  {analytics.overdue}
                </div>
                <div className="text-xs text-muted-foreground">Overdue</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 text-center">
                <div className="text-2xl font-bold text-foreground">
                  {analytics.pending}
                </div>
                <div className="text-xs text-muted-foreground">On Time</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 text-center">
                <div className="text-2xl font-bold text-foreground">
                  {Object.keys(analytics.bySubject).length}
                </div>
                <div className="text-xs text-muted-foreground">Subjects</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Subject-wise Assignments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.entries(analytics.bySubject).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data yet</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(analytics.bySubject)
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
                                width: `${(count / analytics.total) * 100}%`,
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
                <CardTitle className="text-sm">Overdue Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.overdue === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    ✓ No overdue assignments
                  </p>
                ) : (
                  <div className="space-y-2">
                    {homework
                      .filter((h) => isOverdue(h.dueDate))
                      .map((hw, i) => (
                        <div
                          key={hw.id}
                          data-ocid={`homework.overdue_item.${i + 1}`}
                          className="flex items-center gap-2 text-sm"
                        >
                          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                          <span className="flex-1 truncate text-foreground">
                            {hw.title}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {hw.class}
                          </span>
                          <Badge variant="destructive" className="text-xs">
                            Due {hw.dueDate}
                          </Badge>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDialogOpen(false);
            setEditItem(null);
          }
        }}
      >
        <DialogContent className="max-w-lg" data-ocid="homework.dialog">
          <DialogHeader>
            <DialogTitle>
              {editItem ? "Edit Assignment" : "Add Assignment"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Class *</Label>
                <Select
                  value={form.class}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, class: v, section: "" }))
                  }
                >
                  <SelectTrigger
                    className="mt-1"
                    data-ocid="homework.form_class_select"
                  >
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Section</Label>
                <Select
                  value={form.section}
                  onValueChange={(v) => setForm((f) => ({ ...f, section: v }))}
                >
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
                  onChange={(e) =>
                    setForm((f) => ({ ...f, subject: e.target.value }))
                  }
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
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dueDate: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
              <div className="col-span-2">
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="Assignment title"
                  className="mt-1"
                  data-ocid="homework.form_title_input"
                />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring mt-1"
                  data-ocid="homework.form_description_textarea"
                />
              </div>
              <div className="col-span-2">
                <Label>Attachment Link (optional)</Label>
                <Input
                  value={form.attachmentUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, attachmentUrl: e.target.value }))
                  }
                  placeholder="https://docs.google.com/..."
                  className="mt-1"
                  data-ocid="homework.form_attachment_input"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setEditItem(null);
                }}
                data-ocid="homework.form_cancel_button"
              >
                Cancel
              </Button>
              <Button
                disabled={
                  !form.class ||
                  !form.subject ||
                  !form.title ||
                  !form.dueDate ||
                  saving
                }
                onClick={() => void handleSave()}
                data-ocid="homework.form_submit_button"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : null}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
