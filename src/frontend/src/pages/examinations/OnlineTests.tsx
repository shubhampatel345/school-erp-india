/**
 * SHUBH SCHOOL ERP — Online Exams + Auto-Grading
 *
 * Tab 1: Exam Manager (Teachers/Admin) — create/edit/activate exams
 * Tab 2: Take Exam   (Students)        — timer, MCQ, auto-submit
 * Tab 3: Results     (Teachers/Admin)  — per-exam scores, override, export
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Textarea } from "../../components/ui/textarea";
import { useApp } from "../../context/AppContext";
import type {
  ExamAttempt,
  ExamQuestion,
  OnlineExam,
  Student,
} from "../../types";
import {
  apiCreateRecord,
  apiDeleteRecord,
  apiListRecords,
  apiUpdateRecord,
  getJwt,
} from "../../utils/api";
import { CLASSES, SECTIONS, generateId } from "../../utils/localStorage";

// ── helpers ───────────────────────────────────────────────────────────────────

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function fmtSeconds(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${pad(m)}:${pad(sec)}`;
}
function now() {
  return new Date().toISOString();
}
function pct(score: number, total: number) {
  return total > 0 ? Math.round((score / total) * 100) : 0;
}

// ── Grade auto-grade ──────────────────────────────────────────────────────────

function gradeAttempt(
  exam: OnlineExam,
  answers: Record<string, number[]>,
): {
  score: number;
  breakdown: Record<string, { correct: boolean; earned: number }>;
} {
  let score = 0;
  const breakdown: Record<string, { correct: boolean; earned: number }> = {};
  for (const q of exam.questions) {
    const given = (answers[q.id] ?? []).sort().join(",");
    const correct = q.correctAnswers.sort().join(",");
    const isCorrect = given === correct;
    const earned = isCorrect ? q.marks : 0;
    score += earned;
    breakdown[q.id] = { correct: isCorrect, earned };
  }
  return { score, breakdown };
}

// ── Status badge ──────────────────────────────────────────────────────────────

function ExamStatusBadge({ status }: { status: OnlineExam["status"] }) {
  const map = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-accent/20 text-accent border-accent/30",
    completed: "bg-primary/10 text-primary border-primary/20",
  };
  return <Badge className={`capitalize border ${map[status]}`}>{status}</Badge>;
}

// ── QuestionEditor ─────────────────────────────────────────────────────────────

interface QEditorProps {
  question: ExamQuestion;
  index: number;
  onUpdate: (q: ExamQuestion) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function QuestionEditor({
  question: q,
  index,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: QEditorProps) {
  return (
    <div className="border border-border rounded-lg p-4 bg-card space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">
          Q{index + 1} · {q.marks} mark{q.marks !== 1 ? "s" : ""}
        </span>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            disabled={isFirst}
            onClick={onMoveUp}
          >
            ↑
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            disabled={isLast}
            onClick={onMoveDown}
          >
            ↓
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            ✕
          </Button>
        </div>
      </div>

      <Textarea
        rows={2}
        placeholder="Question text…"
        value={q.question}
        onChange={(e) => onUpdate({ ...q, question: e.target.value })}
        className="text-sm"
        data-ocid="online_tests.question_text"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {q.options.map((opt, oi) => (
          <div key={`opt-${q.id}-${oi}`} className="flex items-center gap-2">
            <input
              type="radio"
              name={`correct-${q.id}`}
              checked={q.correctAnswers.includes(oi)}
              onChange={() => onUpdate({ ...q, correctAnswers: [oi] })}
              className="accent-primary shrink-0"
              data-ocid={`online_tests.correct_radio.${oi + 1}`}
            />
            <Input
              placeholder={`Option ${String.fromCharCode(65 + oi)}`}
              value={opt}
              onChange={(e) => {
                const opts = [...q.options];
                opts[oi] = e.target.value;
                onUpdate({ ...q, options: opts });
              }}
              className="text-sm h-8"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Label className="text-xs text-muted-foreground">Marks:</Label>
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className="h-7 w-20 text-sm"
          value={q.marks}
          onChange={(e) =>
            onUpdate({
              ...q,
              marks: Math.max(
                1,
                Number(e.target.value.replace(/[^0-9]/g, "")) || 1,
              ),
            })
          }
          data-ocid="online_tests.marks_input"
        />
      </div>
    </div>
  );
}

// ── CreateExamDialog ──────────────────────────────────────────────────────────

interface CreateExamDialogProps {
  open: boolean;
  onClose: () => void;
  editingExam: OnlineExam | null;
  onSaved: (exam: OnlineExam) => void;
}

function newQuestion(): ExamQuestion {
  return {
    id: generateId(),
    question: "",
    options: ["", "", "", ""],
    correctAnswers: [0],
    marks: 1,
  };
}

function CreateExamDialog({
  open,
  onClose,
  editingExam,
  onSaved,
}: CreateExamDialogProps) {
  const { currentUser, addNotification } = useApp();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [classId, setClassId] = useState("");
  const [sections, setSections] = useState<string[]>([]);
  const [duration, setDuration] = useState(60);
  const [passPct, setPassPct] = useState(40);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [questions, setQuestions] = useState<ExamQuestion[]>([newQuestion()]);
  const [saving, setSaving] = useState(false);

  const totalMarks = questions.reduce((s, q) => s + q.marks, 0);

  useEffect(() => {
    if (!open) return;
    if (editingExam) {
      setTitle(editingExam.title);
      setSubject(editingExam.subject);
      setClassId(editingExam.classId);
      setSections(editingExam.sections);
      setDuration(editingExam.duration);
      setPassPct(editingExam.passPercentage);
      setStartTime(editingExam.startTime.slice(0, 16));
      setEndTime(editingExam.endTime.slice(0, 16));
      setQuestions(editingExam.questions);
    } else {
      setTitle("");
      setSubject("");
      setClassId("");
      setSections([]);
      setDuration(60);
      setPassPct(40);
      setStartTime("");
      setEndTime("");
      setQuestions([newQuestion()]);
    }
  }, [editingExam, open]);

  const addQ = () => setQuestions((prev) => [...prev, newQuestion()]);

  const updateQ = (idx: number, q: ExamQuestion) =>
    setQuestions((prev) => prev.map((x, i) => (i === idx ? q : x)));

  const deleteQ = (idx: number) =>
    setQuestions((prev) => prev.filter((_, i) => i !== idx));

  const moveQ = (idx: number, dir: -1 | 1) => {
    const next = [...questions];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setQuestions(next);
  };

  const toggleSection = (sec: string) =>
    setSections((prev) =>
      prev.includes(sec) ? prev.filter((s) => s !== sec) : [...prev, sec],
    );

  async function handleSave(publishNow: boolean) {
    if (
      !title.trim() ||
      !subject.trim() ||
      !classId ||
      questions.length === 0
    ) {
      addNotification(
        "Please fill Title, Subject, Class, and add questions.",
        "warning",
      );
      return;
    }
    const exam: OnlineExam = {
      id: editingExam?.id ?? generateId(),
      title: title.trim(),
      subject: subject.trim(),
      classId,
      sections,
      duration,
      totalMarks,
      passPercentage: passPct,
      startTime: startTime
        ? new Date(startTime).toISOString()
        : new Date().toISOString(),
      endTime: endTime
        ? new Date(endTime).toISOString()
        : new Date(Date.now() + 7200_000).toISOString(),
      questions,
      status: publishNow ? "active" : "draft",
      createdBy: currentUser?.id ?? "admin",
    };

    setSaving(true);
    try {
      const token = getJwt();
      if (editingExam) {
        await apiUpdateRecord(
          "online_exams",
          editingExam.id,
          { ...exam, questionsData: JSON.stringify(exam.questions) } as Record<
            string,
            unknown
          >,
          token,
        );
      } else {
        await apiCreateRecord(
          "online_exams",
          { ...exam, questionsData: JSON.stringify(exam.questions) } as Record<
            string,
            unknown
          >,
          token,
        );
      }
      addNotification(
        `Exam "${exam.title}" ${editingExam ? "updated" : "created"} successfully.`,
        "success",
      );
      onSaved(exam);
      onClose();
    } catch {
      addNotification("Failed to save exam. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        data-ocid="online_tests.dialog"
      >
        <DialogHeader>
          <DialogTitle>
            {editingExam ? "Edit Exam" : "Create New Exam"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Exam Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Math Unit Test 1"
                data-ocid="online_tests.title_input"
              />
            </div>
            <div className="space-y-1">
              <Label>Subject *</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Mathematics"
                data-ocid="online_tests.subject_input"
              />
            </div>
            <div className="space-y-1">
              <Label>Class *</Label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                data-ocid="online_tests.class_select"
              >
                <option value="">Select class</option>
                {CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Duration (minutes)</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={duration}
                onChange={(e) =>
                  setDuration(
                    Math.max(
                      1,
                      Number(e.target.value.replace(/[^0-9]/g, "")) || 1,
                    ),
                  )
                }
                data-ocid="online_tests.duration_input"
              />
            </div>
            <div className="space-y-1">
              <Label>Start Date & Time</Label>
              <Input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                data-ocid="online_tests.start_time_input"
              />
            </div>
            <div className="space-y-1">
              <Label>End Date & Time</Label>
              <Input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                data-ocid="online_tests.end_time_input"
              />
            </div>
            <div className="space-y-1">
              <Label>Pass Percentage (%)</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={passPct}
                onChange={(e) =>
                  setPassPct(
                    Math.min(
                      100,
                      Math.max(
                        0,
                        Number(e.target.value.replace(/[^0-9]/g, "")) || 0,
                      ),
                    ),
                  )
                }
                data-ocid="online_tests.pass_pct_input"
              />
            </div>
            <div className="space-y-1">
              <Label>Total Marks (auto)</Label>
              <Input value={totalMarks} readOnly className="bg-muted" />
            </div>
          </div>

          {/* Sections */}
          {classId && (
            <div className="space-y-2">
              <Label>Sections (select applicable)</Label>
              <div className="flex flex-wrap gap-2">
                {SECTIONS.map((sec) => (
                  <label
                    key={sec}
                    className="flex items-center gap-1.5 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={sections.includes(sec)}
                      onChange={() => toggleSection(sec)}
                      className="accent-primary"
                      data-ocid={`online_tests.section_checkbox.${sec}`}
                    />
                    {sec}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Questions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                Questions ({questions.length})
              </Label>
              <Button
                size="sm"
                variant="outline"
                onClick={addQ}
                data-ocid="online_tests.add_question_button"
              >
                + Add Question
              </Button>
            </div>
            {questions.map((q, i) => (
              <QuestionEditor
                key={q.id}
                question={q}
                index={i}
                onUpdate={(updated) => updateQ(i, updated)}
                onDelete={() => deleteQ(i)}
                onMoveUp={() => moveQ(i, -1)}
                onMoveDown={() => moveQ(i, 1)}
                isFirst={i === 0}
                isLast={i === questions.length - 1}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2 border-t border-border">
            <Button
              variant="outline"
              onClick={onClose}
              data-ocid="online_tests.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => handleSave(false)}
              data-ocid="online_tests.save_draft_button"
            >
              Save as Draft
            </Button>
            <Button
              disabled={saving}
              onClick={() => handleSave(true)}
              data-ocid="online_tests.publish_button"
            >
              {saving ? "Saving…" : "Publish"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── ExamManager Tab ───────────────────────────────────────────────────────────

function ExamManager() {
  const { addNotification } = useApp();
  const [exams, setExams] = useState<OnlineExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<OnlineExam | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadExams = useCallback(async () => {
    setLoading(true);
    try {
      const token = getJwt();
      const rows = await apiListRecords<Record<string, unknown>>(
        "online_exams",
        {},
        token,
      );
      const parsed: OnlineExam[] = rows.map((r) => ({
        id: String(r.id ?? r.examId ?? generateId()),
        title: String(r.title ?? ""),
        subject: String(r.subject ?? ""),
        classId: String(r.classId ?? ""),
        sections: (() => {
          try {
            return JSON.parse(String(r.sections ?? "[]")) as string[];
          } catch {
            return [];
          }
        })(),
        duration: Number(r.duration ?? 60),
        totalMarks: Number(r.totalMarks ?? 0),
        passPercentage: Number(r.passPercentage ?? 40),
        startTime: String(r.startTime ?? new Date().toISOString()),
        endTime: String(r.endTime ?? new Date().toISOString()),
        questions: (() => {
          try {
            return JSON.parse(
              String(r.questionsData ?? r.questions ?? "[]"),
            ) as ExamQuestion[];
          } catch {
            return [];
          }
        })(),
        status: (r.status as OnlineExam["status"]) ?? "draft",
        createdBy: String(r.createdBy ?? ""),
      }));
      setExams(parsed);
    } catch {
      // offline: keep current
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadExams();
  }, [loadExams]);

  async function handleToggleStatus(exam: OnlineExam) {
    const nextStatus: OnlineExam["status"] =
      exam.status === "active"
        ? "completed"
        : exam.status === "draft"
          ? "active"
          : "draft";
    try {
      const token = getJwt();
      await apiUpdateRecord(
        "online_exams",
        exam.id,
        { status: nextStatus } as Record<string, unknown>,
        token,
      );
      setExams((prev) =>
        prev.map((e) => (e.id === exam.id ? { ...e, status: nextStatus } : e)),
      );
      addNotification(
        `Exam "${exam.title}" status updated to ${nextStatus}.`,
        "success",
      );
    } catch {
      addNotification("Failed to update exam status.", "error");
    }
  }

  async function handleDelete(examId: string) {
    try {
      const token = getJwt();
      await apiDeleteRecord("online_exams", examId, token);
      setExams((prev) => prev.filter((e) => e.id !== examId));
      addNotification("Exam deleted.", "success");
    } catch {
      addNotification("Failed to delete exam.", "error");
    } finally {
      setDeleteConfirm(null);
    }
  }

  function onSaved(exam: OnlineExam) {
    setExams((prev) => {
      const idx = prev.findIndex((e) => e.id === exam.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = exam;
        return next;
      }
      return [exam, ...prev];
    });
  }

  if (loading) {
    return (
      <div
        className="p-6 text-center text-muted-foreground"
        data-ocid="online_tests.loading_state"
      >
        Loading exams…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">All Exams ({exams.length})</h3>
        <Button
          onClick={() => {
            setEditingExam(null);
            setDialogOpen(true);
          }}
          data-ocid="online_tests.create_exam_button"
        >
          + Create New Exam
        </Button>
      </div>

      {exams.length === 0 ? (
        <div
          className="text-center py-16 text-muted-foreground"
          data-ocid="online_tests.empty_state"
        >
          <div className="text-4xl mb-3">📝</div>
          <p className="font-medium">No online exams created yet</p>
          <p className="text-sm mt-1">
            Click "Create New Exam" to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((exam, i) => (
            <div
              key={exam.id}
              className="bg-card border border-border rounded-xl p-4 space-y-3"
              data-ocid={`online_tests.exam_card.${i + 1}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{exam.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {exam.subject}
                  </p>
                </div>
                <ExamStatusBadge status={exam.status} />
              </div>

              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>Class: {exam.classId}</p>
                <p>
                  Questions: {exam.questions.length} · Total: {exam.totalMarks}{" "}
                  marks
                </p>
                <p>
                  Duration: {exam.duration} min · Pass: {exam.passPercentage}%
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => {
                    setEditingExam(exam);
                    setDialogOpen(true);
                  }}
                  data-ocid={`online_tests.edit_button.${i + 1}`}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => handleToggleStatus(exam)}
                  data-ocid={`online_tests.toggle_status_button.${i + 1}`}
                >
                  {exam.status === "active"
                    ? "Complete"
                    : exam.status === "draft"
                      ? "Activate"
                      : "Re-open"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7 text-destructive hover:text-destructive"
                  onClick={() => setDeleteConfirm(exam.id)}
                  data-ocid={`online_tests.delete_button.${i + 1}`}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateExamDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editingExam={editingExam}
        onSaved={onSaved}
      />

      {/* Delete confirm */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent data-ocid="online_tests.confirm_dialog">
          <DialogHeader>
            <DialogTitle>Delete Exam?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the exam and all student attempts.
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              data-ocid="online_tests.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              data-ocid="online_tests.confirm_button"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── ExamInterface — full-screen during exam ────────────────────────────────────

interface ExamInterfaceProps {
  exam: OnlineExam;
  studentId: string;
  onFinish: (attempt: ExamAttempt) => void;
  onCancel: () => void;
}

function ExamInterface({
  exam,
  studentId,
  onFinish,
  onCancel,
}: ExamInterfaceProps) {
  const { addNotification } = useApp();
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(exam.duration * 60);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const startedAt = useRef(new Date().toISOString());

  // Countdown
  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          void handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Warn before leaving
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const q = exam.questions[current];
  const answered = Object.keys(answers).length;

  function pickOption(optIdx: number) {
    setAnswers((prev) => ({ ...prev, [q.id]: [optIdx] }));
  }

  async function handleSubmit(auto = false) {
    if (submitting) return;
    setShowConfirm(false);
    setSubmitting(true);

    const submittedAt = new Date().toISOString();
    const start = new Date(startedAt.current).getTime();
    const end = new Date(submittedAt).getTime();
    const timeTaken = Math.round((end - start) / 1000);

    const { score, breakdown } = gradeAttempt(exam, answers);
    const percentage = pct(score, exam.totalMarks);
    const passed = percentage >= exam.passPercentage;

    const attempt: ExamAttempt = {
      id: generateId(),
      examId: exam.id,
      studentId,
      answers,
      score,
      totalMarks: exam.totalMarks,
      percentage,
      passed,
      startedAt: startedAt.current,
      submittedAt,
      timeTaken,
    };

    try {
      const token = getJwt();
      await apiCreateRecord(
        "exam_attempts",
        {
          ...attempt,
          answersData: JSON.stringify(answers),
          breakdownData: JSON.stringify(breakdown),
        } as Record<string, unknown>,
        token,
      );
    } catch {
      if (!auto)
        addNotification(
          "Result saved locally — will sync when online.",
          "warning",
        );
    }

    setSubmitting(false);
    onFinish(attempt);
  }

  const urgentTimer = timeLeft < 60;

  return (
    <div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      data-ocid="online_tests.exam_interface"
    >
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <p className="font-bold text-sm truncate">{exam.title}</p>
          <p className="text-xs text-muted-foreground">{exam.subject}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground">
            Q {current + 1} / {exam.questions.length}
          </span>
          <span
            className={`font-mono font-bold text-lg ${urgentTimer ? "text-destructive animate-pulse" : "text-foreground"}`}
            data-ocid="online_tests.timer"
          >
            {fmtSeconds(timeLeft)}
          </span>
          <Button
            size="sm"
            variant="destructive"
            disabled={submitting}
            onClick={() => setShowConfirm(true)}
            data-ocid="online_tests.submit_exam_button"
          >
            {submitting ? "Submitting…" : "Submit Exam"}
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Question panel */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <p className="font-semibold text-base leading-relaxed">
                <span className="text-muted-foreground mr-2">
                  Q{current + 1}.
                </span>
                {q.question || (
                  <span className="text-muted-foreground italic">
                    No question text
                  </span>
                )}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <label
                    key={`opt-${q.id}-${oi}`}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                      ${
                        (answers[q.id] ?? []).includes(oi)
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40 hover:bg-muted/30"
                      }`}
                    data-ocid={`online_tests.option.${oi + 1}`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={(answers[q.id] ?? []).includes(oi)}
                      onChange={() => pickOption(oi)}
                      className="accent-primary"
                    />
                    <span className="text-sm">
                      <span className="font-medium mr-1">
                        {String.fromCharCode(65 + oi)}.
                      </span>
                      {opt}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                disabled={current === 0}
                onClick={() => setCurrent((p) => p - 1)}
                data-ocid="online_tests.prev_button"
              >
                ← Previous
              </Button>
              {current < exam.questions.length - 1 ? (
                <Button
                  onClick={() => setCurrent((p) => p + 1)}
                  data-ocid="online_tests.next_button"
                >
                  Next →
                </Button>
              ) : (
                <Button
                  onClick={() => setShowConfirm(true)}
                  disabled={submitting}
                  data-ocid="online_tests.finish_button"
                >
                  Finish & Submit
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Question navigator */}
        <div className="hidden md:flex flex-col w-48 border-l border-border p-4 shrink-0 overflow-y-auto">
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Questions
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {exam.questions.map((qn, i) => (
              <button
                type="button"
                key={qn.id}
                onClick={() => setCurrent(i)}
                className={`h-8 w-8 rounded text-xs font-medium transition-colors
                  ${i === current ? "bg-primary text-primary-foreground" : answers[qn.id] ? "bg-accent/30 text-accent" : "bg-muted text-muted-foreground hover:bg-muted/60"}`}
                data-ocid={`online_tests.q_nav.${i + 1}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-accent/30" />
              <span className="text-muted-foreground">
                Answered ({answered})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-muted" />
              <span className="text-muted-foreground">
                Unanswered ({exam.questions.length - answered})
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-auto text-xs text-muted-foreground"
            onClick={onCancel}
            data-ocid="online_tests.cancel_exam_button"
          >
            Quit Exam
          </Button>
        </div>
      </div>

      {/* Submit confirm */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent data-ocid="online_tests.submit_confirm_dialog">
          <DialogHeader>
            <DialogTitle>Submit Exam?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You have answered {answered} of {exam.questions.length} questions.
            Once submitted you cannot change your answers.
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              data-ocid="online_tests.cancel_button"
            >
              Continue Exam
            </Button>
            <Button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              data-ocid="online_tests.confirm_button"
            >
              {submitting ? "Submitting…" : "Yes, Submit"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── ResultPage ────────────────────────────────────────────────────────────────

interface ResultPageProps {
  exam: OnlineExam;
  attempt: ExamAttempt;
  onClose: () => void;
}

function ResultPage({ exam, attempt, onClose }: ResultPageProps) {
  const p = attempt.percentage;
  const passed = attempt.passed;

  return (
    <div
      className="space-y-6 max-w-3xl mx-auto py-6"
      data-ocid="online_tests.result_page"
    >
      {/* Score card */}
      <div
        className={`rounded-2xl p-6 text-center border ${
          passed
            ? "bg-accent/10 border-accent/30"
            : "bg-destructive/10 border-destructive/30"
        }`}
      >
        <div className="text-5xl font-black mb-2">
          {attempt.score}/{attempt.totalMarks}
        </div>
        <div className="text-2xl font-bold mb-3">{p}%</div>
        <Badge
          className={`text-base px-4 py-1 ${
            passed
              ? "bg-accent/20 text-accent border-accent/30"
              : "bg-destructive/20 text-destructive border-destructive/30"
          }`}
        >
          {passed ? "✓ PASSED" : "✕ FAILED"}
        </Badge>
        <div className="mt-4 flex justify-center gap-6 text-sm text-muted-foreground">
          <span>
            Time taken: {Math.round(attempt.timeTaken / 60)} min{" "}
            {attempt.timeTaken % 60} sec
          </span>
          <span>
            Submitted:{" "}
            {new Date(attempt.submittedAt).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      {/* Question breakdown */}
      <div>
        <h3 className="font-semibold mb-3">Question Breakdown</h3>
        <div className="space-y-3">
          {exam.questions.map((q, i) => {
            const given = attempt.answers[q.id] ?? [];
            const isCorrect =
              given.sort().join(",") === q.correctAnswers.sort().join(",");
            return (
              <div
                key={q.id}
                className={`rounded-lg border p-4 text-sm ${
                  isCorrect
                    ? "border-accent/30 bg-accent/5"
                    : "border-destructive/30 bg-destructive/5"
                }`}
                data-ocid={`online_tests.result_row.${i + 1}`}
              >
                <p className="font-medium mb-1">
                  Q{i + 1}. {q.question}
                </p>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>
                    Your answer:{" "}
                    <strong>
                      {given.length > 0
                        ? given
                            .map((oi) => String.fromCharCode(65 + oi))
                            .join(", ")
                        : "Not answered"}
                    </strong>
                  </span>
                  <span>
                    Correct:{" "}
                    <strong>
                      {q.correctAnswers
                        .map((oi) => String.fromCharCode(65 + oi))
                        .join(", ")}
                    </strong>
                  </span>
                  <span
                    className={
                      isCorrect
                        ? "text-accent font-semibold"
                        : "text-destructive font-semibold"
                    }
                  >
                    {isCorrect ? `+${q.marks}` : "0"} marks
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          onClick={() => window.print()}
          data-ocid="online_tests.download_result_button"
        >
          🖨 Download / Print Result
        </Button>
        <Button onClick={onClose} data-ocid="online_tests.close_button">
          Back to Exams
        </Button>
      </div>
    </div>
  );
}

// ── TakeExam Tab ──────────────────────────────────────────────────────────────

function TakeExam({
  studentId,
  classId,
}: { studentId: string; classId: string }) {
  const [exams, setExams] = useState<OnlineExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeExam, setActiveExam] = useState<OnlineExam | null>(null);
  const [finishedAttempt, setFinishedAttempt] = useState<ExamAttempt | null>(
    null,
  );
  const [finishedExam, setFinishedExam] = useState<OnlineExam | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const token = getJwt();
        const rows = await apiListRecords<Record<string, unknown>>(
          "online_exams",
          { classId, status: "active" },
          token,
        );
        const parsed: OnlineExam[] = rows.map((r) => ({
          id: String(r.id ?? generateId()),
          title: String(r.title ?? ""),
          subject: String(r.subject ?? ""),
          classId: String(r.classId ?? ""),
          sections: (() => {
            try {
              return JSON.parse(String(r.sections ?? "[]")) as string[];
            } catch {
              return [];
            }
          })(),
          duration: Number(r.duration ?? 60),
          totalMarks: Number(r.totalMarks ?? 0),
          passPercentage: Number(r.passPercentage ?? 40),
          startTime: String(r.startTime ?? ""),
          endTime: String(r.endTime ?? ""),
          questions: (() => {
            try {
              return JSON.parse(
                String(r.questionsData ?? r.questions ?? "[]"),
              ) as ExamQuestion[];
            } catch {
              return [];
            }
          })(),
          status: (r.status as OnlineExam["status"]) ?? "active",
          createdBy: String(r.createdBy ?? ""),
        }));
        const nowTs = Date.now();
        setExams(
          parsed.filter(
            (e) =>
              e.status === "active" &&
              new Date(e.startTime).getTime() <= nowTs &&
              new Date(e.endTime).getTime() >= nowTs,
          ),
        );
      } catch {
        // offline
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [classId]);

  if (activeExam && !finishedAttempt) {
    return (
      <ExamInterface
        exam={activeExam}
        studentId={studentId}
        onFinish={(attempt) => {
          setFinishedAttempt(attempt);
          setFinishedExam(activeExam);
          setActiveExam(null);
        }}
        onCancel={() => setActiveExam(null)}
      />
    );
  }

  if (finishedAttempt && finishedExam) {
    return (
      <ResultPage
        exam={finishedExam}
        attempt={finishedAttempt}
        onClose={() => {
          setFinishedAttempt(null);
          setFinishedExam(null);
        }}
      />
    );
  }

  if (loading) {
    return (
      <div
        className="p-6 text-center text-muted-foreground"
        data-ocid="online_tests.loading_state"
      >
        Loading available exams…
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <div
        className="text-center py-16 text-muted-foreground"
        data-ocid="online_tests.empty_state"
      >
        <div className="text-4xl mb-3">🎓</div>
        <p className="font-medium">No active exams right now</p>
        <p className="text-sm mt-1">
          Check back when your teacher publishes an exam for your class.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Available Exams for Your Class</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {exams.map((exam, i) => (
          <div
            key={exam.id}
            className="bg-card border border-border rounded-xl p-5 space-y-3"
            data-ocid={`online_tests.available_exam.${i + 1}`}
          >
            <div>
              <p className="font-bold">{exam.title}</p>
              <p className="text-sm text-muted-foreground">{exam.subject}</p>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>Duration: {exam.duration} minutes</p>
              <p>Questions: {exam.questions.length}</p>
              <p>Total Marks: {exam.totalMarks}</p>
              <p>
                Available until:{" "}
                {new Date(exam.endTime).toLocaleString("en-IN", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => setActiveExam(exam)}
              data-ocid={`online_tests.start_exam_button.${i + 1}`}
            >
              Start Exam →
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ResultsDashboard Tab ──────────────────────────────────────────────────────

function ResultsDashboard() {
  const [exams, setExams] = useState<OnlineExam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [attempts, setAttempts] = useState<
    (ExamAttempt & { studentName: string })[]
  >([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [overrideCell, setOverrideCell] = useState<string | null>(null);
  const [overrideScore, setOverrideScore] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const { addNotification } = useApp();

  useEffect(() => {
    async function load() {
      setLoadingExams(true);
      try {
        const token = getJwt();
        const [examRows, studentRows] = await Promise.all([
          apiListRecords<Record<string, unknown>>("online_exams", {}, token),
          apiListRecords<Student>("students", {}, token),
        ]);
        setStudents(studentRows);
        setExams(
          examRows.map((r) => ({
            id: String(r.id ?? generateId()),
            title: String(r.title ?? ""),
            subject: String(r.subject ?? ""),
            classId: String(r.classId ?? ""),
            sections: (() => {
              try {
                return JSON.parse(String(r.sections ?? "[]")) as string[];
              } catch {
                return [];
              }
            })(),
            duration: Number(r.duration ?? 60),
            totalMarks: Number(r.totalMarks ?? 0),
            passPercentage: Number(r.passPercentage ?? 40),
            startTime: String(r.startTime ?? ""),
            endTime: String(r.endTime ?? ""),
            questions: [],
            status: (r.status as OnlineExam["status"]) ?? "draft",
            createdBy: String(r.createdBy ?? ""),
          })),
        );
      } catch {
        // offline
      } finally {
        setLoadingExams(false);
      }
    }
    void load();
  }, []);

  useEffect(() => {
    if (!selectedExamId) {
      setAttempts([]);
      return;
    }
    setLoadingAttempts(true);
    const token = getJwt();
    apiListRecords<Record<string, unknown>>(
      "exam_attempts",
      { examId: selectedExamId },
      token,
    )
      .then((rows) => {
        const mapped = rows.map((r) => {
          const student = students.find((s) => s.id === String(r.studentId));
          return {
            id: String(r.id ?? generateId()),
            examId: String(r.examId ?? ""),
            studentId: String(r.studentId ?? ""),
            studentName: student?.fullName ?? String(r.studentId ?? "—"),
            answers: (() => {
              try {
                return JSON.parse(
                  String(r.answersData ?? r.answers ?? "{}"),
                ) as Record<string, number[]>;
              } catch {
                return {};
              }
            })(),
            score: Number(r.score ?? 0),
            totalMarks: Number(r.totalMarks ?? 0),
            percentage: Number(r.percentage ?? 0),
            passed: Boolean(r.passed),
            startedAt: String(r.startedAt ?? ""),
            submittedAt: String(r.submittedAt ?? ""),
            timeTaken: Number(r.timeTaken ?? 0),
          };
        });
        setAttempts(mapped);
      })
      .catch(() => {})
      .finally(() => setLoadingAttempts(false));
  }, [selectedExamId, students]);

  const selectedExam = exams.find((e) => e.id === selectedExamId);

  const stats = {
    highest: attempts.length ? Math.max(...attempts.map((a) => a.score)) : 0,
    lowest: attempts.length ? Math.min(...attempts.map((a) => a.score)) : 0,
    avg: attempts.length
      ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
      : 0,
    passRate: attempts.length
      ? Math.round(
          (attempts.filter((a) => a.passed).length / attempts.length) * 100,
        )
      : 0,
  };

  function exportCsv() {
    if (!selectedExam || attempts.length === 0) return;
    const header = "Student,Score,Total,Percentage,Pass/Fail,Time Taken";
    const rows = attempts.map(
      (a) =>
        `"${a.studentName}",${a.score},${a.totalMarks},${a.percentage}%,${a.passed ? "Pass" : "Fail"},${Math.floor(a.timeTaken / 60)}m ${a.timeTaken % 60}s`,
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedExam.title}_results.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function saveOverride(attemptId: string) {
    const newScore = Number(overrideScore);
    if (Number.isNaN(newScore)) return;
    try {
      const token = getJwt();
      const attempt = attempts.find((a) => a.id === attemptId);
      if (!attempt) return;
      const newPct = pct(newScore, attempt.totalMarks);
      const newPassed = selectedExam
        ? newPct >= selectedExam.passPercentage
        : false;
      await apiUpdateRecord(
        "exam_attempts",
        attemptId,
        {
          score: newScore,
          percentage: newPct,
          passed: newPassed,
          overrideReason,
          overriddenAt: now(),
        } as Record<string, unknown>,
        token,
      );
      setAttempts((prev) =>
        prev.map((a) =>
          a.id === attemptId
            ? { ...a, score: newScore, percentage: newPct, passed: newPassed }
            : a,
        ),
      );
      addNotification("Score updated.", "success");
    } catch {
      addNotification("Failed to update score.", "error");
    } finally {
      setOverrideCell(null);
      setOverrideScore("");
      setOverrideReason("");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <Label className="shrink-0">Select Exam:</Label>
          {loadingExams ? (
            <span className="text-sm text-muted-foreground">Loading…</span>
          ) : (
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[200px]"
              data-ocid="online_tests.results_exam_select"
            >
              <option value="">— Choose exam —</option>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} ({e.classId})
                </option>
              ))}
            </select>
          )}
        </div>
        {selectedExamId && attempts.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            data-ocid="online_tests.export_csv_button"
          >
            ⬇ Export CSV
          </Button>
        )}
      </div>

      {selectedExamId && (
        <>
          {/* Stats */}
          {attempts.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Highest", value: `${stats.highest}` },
                { label: "Lowest", value: `${stats.lowest}` },
                { label: "Average", value: `${stats.avg}` },
                { label: "Pass Rate", value: `${stats.passRate}%` },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-card border border-border rounded-lg p-3 text-center"
                >
                  <p className="text-xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          {loadingAttempts ? (
            <div
              className="text-center py-8 text-muted-foreground"
              data-ocid="online_tests.loading_state"
            >
              Loading results…
            </div>
          ) : attempts.length === 0 ? (
            <div
              className="text-center py-12 text-muted-foreground"
              data-ocid="online_tests.empty_state"
            >
              No students have submitted this exam yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="text-left px-4 py-3">#</th>
                    <th className="text-left px-4 py-3">Student</th>
                    <th className="text-right px-4 py-3">Score</th>
                    <th className="text-right px-4 py-3">%</th>
                    <th className="text-center px-4 py-3">Status</th>
                    <th className="text-right px-4 py-3">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((attempt, i) => (
                    <tr
                      key={attempt.id}
                      className="border-t border-border hover:bg-muted/20 transition-colors"
                      data-ocid={`online_tests.result_row.${i + 1}`}
                    >
                      <td className="px-4 py-3 text-muted-foreground">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {attempt.studentName}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {overrideCell === attempt.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              className="h-7 w-20 text-sm"
                              value={overrideScore}
                              onChange={(e) =>
                                setOverrideScore(
                                  e.target.value
                                    .replace(/[^0-9.]/g, "")
                                    .replace(/(\..*)\./g, "$1"),
                                )
                              }
                              autoFocus
                              data-ocid="online_tests.override_score_input"
                            />
                            <Input
                              className="h-7 w-28 text-sm"
                              placeholder="Reason"
                              value={overrideReason}
                              onChange={(e) =>
                                setOverrideReason(e.target.value)
                              }
                              data-ocid="online_tests.override_reason_input"
                            />
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => saveOverride(attempt.id)}
                              data-ocid="online_tests.save_override_button"
                            >
                              ✓
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-1 text-xs"
                              onClick={() => setOverrideCell(null)}
                            >
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="font-mono font-semibold hover:text-primary cursor-pointer"
                            title="Click to override score"
                            onClick={() => {
                              setOverrideCell(attempt.id);
                              setOverrideScore(String(attempt.score));
                              setOverrideReason("");
                            }}
                            data-ocid={`online_tests.score_cell.${i + 1}`}
                          >
                            {attempt.score}/{attempt.totalMarks}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {attempt.percentage}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          className={
                            attempt.passed
                              ? "bg-accent/20 text-accent border-accent/30"
                              : "bg-destructive/20 text-destructive border-destructive/30"
                          }
                        >
                          {attempt.passed ? "Pass" : "Fail"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                        {Math.floor(attempt.timeTaken / 60)}m{" "}
                        {attempt.timeTaken % 60}s
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── OnlineTests (exported main component) ─────────────────────────────────────

export function OnlineTests() {
  const { currentUser } = useApp();
  const role = currentUser?.role ?? "student";

  const isStudent = role === "student";
  const isParent = role === "parent";
  const isTeacherOrAdmin =
    role === "teacher" || role === "admin" || role === "superadmin";

  // For students: use their linked class from their profile
  const studentClassId = currentUser?.position ?? "Class 1"; // position holds class info for students

  const defaultTab = isStudent || isParent ? "take-exam" : "exam-manager";

  return (
    <div className="space-y-4" data-ocid="online_tests.page">
      <Tabs defaultValue={defaultTab}>
        <TabsList className="mb-4" data-ocid="online_tests.tab">
          {isTeacherOrAdmin && (
            <TabsTrigger
              value="exam-manager"
              data-ocid="online_tests.exam_manager_tab"
            >
              Exam Manager
            </TabsTrigger>
          )}
          {(isStudent || isTeacherOrAdmin) && (
            <TabsTrigger
              value="take-exam"
              data-ocid="online_tests.take_exam_tab"
            >
              Take Exam
            </TabsTrigger>
          )}
          {isTeacherOrAdmin && (
            <TabsTrigger value="results" data-ocid="online_tests.results_tab">
              Results Dashboard
            </TabsTrigger>
          )}
          {isParent && (
            <TabsTrigger
              value="take-exam"
              data-ocid="online_tests.parent_results_tab"
            >
              Child&apos;s Results
            </TabsTrigger>
          )}
        </TabsList>

        {isTeacherOrAdmin && (
          <TabsContent value="exam-manager">
            <ExamManager />
          </TabsContent>
        )}

        <TabsContent value="take-exam">
          {isStudent ? (
            <TakeExam
              studentId={currentUser?.studentId ?? currentUser?.id ?? ""}
              classId={studentClassId}
            />
          ) : isTeacherOrAdmin ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-3xl mb-2">👨‍🏫</div>
              <p className="font-medium">Teacher Preview</p>
              <p className="text-sm mt-1">
                Students see available active exams here and take them in a
                full-screen interface.
              </p>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">
                Parent view — your child&apos;s exam results will appear here.
              </p>
            </div>
          )}
        </TabsContent>

        {isTeacherOrAdmin && (
          <TabsContent value="results">
            <ResultsDashboard />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

export default OnlineTests;
