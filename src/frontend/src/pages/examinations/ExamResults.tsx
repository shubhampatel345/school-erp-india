import { useEffect, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useApp } from "../../context/AppContext";
import type { Student } from "../../types";
import { CLASSES, SECTIONS, generateId, ls } from "../../utils/localStorage";
import type { SavedTimetable } from "./ExamTimetableMaker";

// ── Types ─────────────────────────────────────────────────────────────────────
interface SubjectMark {
  subject: string;
  maxMarks: number;
  marksObtained: number;
}

interface StudentResult {
  studentId: string;
  studentName: string;
  admNo: string;
  subjects: SubjectMark[];
}

interface ExamResultGroup {
  id: string;
  examName: string;
  classKey: string;
  subjects: string[];
  maxMarks: number;
  studentResults: StudentResult[];
  sessionId: string;
  savedAt: string;
}

interface ExamResultLegacy {
  id: string;
  studentId: string;
  studentName: string;
  admNo: string;
  studentClass: string;
  section: string;
  examName: string;
  sessionId: string;
  subjects: SubjectMark[];
  createdAt: string;
}

// ── Grade helpers ─────────────────────────────────────────────────────────────
function calcGrade(pct: number): string {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  if (pct >= 40) return "D";
  return "F";
}

function gradeBadgeClass(grade: string): string {
  if (grade === "A+" || grade === "A")
    return "bg-accent/20 text-accent border-accent/30";
  if (grade === "F")
    return "bg-destructive/20 text-destructive border-destructive/30";
  if (grade === "B+" || grade === "B")
    return "bg-primary/10 text-primary border-primary/20";
  return "bg-muted text-muted-foreground border-border";
}

// ── Marksheet Print ───────────────────────────────────────────────────────────
function Marksheet({
  result,
  examName,
  onClose,
}: {
  result: StudentResult;
  examName: string;
  onClose: () => void;
}) {
  const school = ls.get<{ name: string; address: string; phone?: string }>(
    "school_profile",
    { name: "SHUBH SCHOOL ERP", address: "" },
  );
  const total = result.subjects.reduce((s, r) => s + r.marksObtained, 0);
  const maxTotal = result.subjects.reduce((s, r) => s + r.maxMarks, 0);
  const pct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
  const grade = calcGrade(pct);
  const pass = pct >= 40;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 print:bg-transparent print:inset-auto print:p-0"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="bg-card border border-border rounded-xl w-full max-w-lg shadow-elevated print:shadow-none print:border-0 print:rounded-none"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
      >
        <div className="p-6 space-y-4 print:p-4">
          {/* Header */}
          <div className="text-center border-b border-border pb-3 print:border-gray-300">
            <h1 className="text-xl font-bold font-display text-foreground">
              {school.name}
            </h1>
            {school.address && (
              <p className="text-sm text-muted-foreground">{school.address}</p>
            )}
            {school.phone && (
              <p className="text-sm text-muted-foreground">
                Ph: {school.phone}
              </p>
            )}
            <h2 className="text-base font-semibold mt-2 text-foreground">
              MARKSHEET — {examName}
            </h2>
          </div>

          {/* Student info */}
          <div className="grid grid-cols-2 gap-2 text-sm bg-muted/30 rounded-lg p-3">
            <div>
              <span className="font-medium text-muted-foreground">
                Student:{" "}
              </span>
              <span className="text-foreground">{result.studentName}</span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">
                Adm. No.:{" "}
              </span>
              <span className="text-foreground">{result.admNo}</span>
            </div>
          </div>

          {/* Marks table */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Subject
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                    Max
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                    Obtained
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                    %
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                    Grade
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.subjects.map((s, i) => {
                  const sPct =
                    s.maxMarks > 0
                      ? Math.round((s.marksObtained / s.maxMarks) * 100)
                      : 0;
                  return (
                    // biome-ignore lint/suspicious/noArrayIndexKey: stable index for read-only marksheet
                    <tr key={i} className="border-t border-border/50">
                      <td className="px-3 py-2 text-foreground">{s.subject}</td>
                      <td className="px-3 py-2 text-center text-muted-foreground">
                        {s.maxMarks}
                      </td>
                      <td className="px-3 py-2 text-center font-medium text-foreground">
                        {s.marksObtained}
                      </td>
                      <td className="px-3 py-2 text-center text-muted-foreground">
                        {sPct}%
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge className={gradeBadgeClass(calcGrade(sPct))}>
                          {calcGrade(sPct)}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                  <td className="px-3 py-2 text-foreground">TOTAL</td>
                  <td className="px-3 py-2 text-center text-foreground">
                    {maxTotal}
                  </td>
                  <td className="px-3 py-2 text-center text-foreground">
                    {total}
                  </td>
                  <td className="px-3 py-2 text-center text-foreground">
                    {pct}%
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Badge className={gradeBadgeClass(grade)}>{grade}</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Result line */}
          <div className="flex items-center justify-between border-t border-border pt-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Result:</span>
              <Badge
                className={
                  pass
                    ? "bg-accent/20 text-accent border-accent/30"
                    : "bg-destructive/20 text-destructive border-destructive/30"
                }
              >
                {pass ? "PASS" : "FAIL"}
              </Badge>
            </div>
            <span className="text-sm text-muted-foreground">
              Principal Signature: ___________
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 pb-4 print:hidden border-t border-border pt-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            Print Marksheet
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Marks Entry Table ─────────────────────────────────────────────────────────
function MarksEntryTable({
  group,
  students,
  onSave,
  onClose,
}: {
  group: ExamResultGroup;
  students: Student[];
  onSave: (updated: ExamResultGroup) => void;
  onClose: () => void;
}) {
  const [results, setResults] = useState<StudentResult[]>(() => {
    if (group.studentResults.length > 0) return group.studentResults;
    return students.map((s) => ({
      studentId: s.id,
      studentName: s.fullName,
      admNo: s.admNo,
      subjects: group.subjects.map((subj) => ({
        subject: subj,
        maxMarks: group.maxMarks,
        marksObtained: 0,
      })),
    }));
  });

  const updateMark = (studentIdx: number, subjIdx: number, value: string) => {
    const num = Math.min(group.maxMarks, Math.max(0, Number(value) || 0));
    setResults((prev) =>
      prev.map((r, si) =>
        si === studentIdx
          ? {
              ...r,
              subjects: r.subjects.map((s, sj) =>
                sj === subjIdx ? { ...s, marksObtained: num } : s,
              ),
            }
          : r,
      ),
    );
  };

  const handleSave = () => {
    onSave({ ...group, studentResults: results });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-elevated">
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-foreground">
              Marks Entry — {group.examName}
            </h2>
            <p className="text-xs text-muted-foreground">
              {group.classKey} &nbsp;·&nbsp; Max marks: {group.maxMarks} per
              subject
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-smooth text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="overflow-auto flex-1 p-5">
          <table className="w-full text-sm min-w-max border-collapse">
            <thead className="sticky top-0">
              <tr className="bg-muted/50">
                <th className="px-3 py-2.5 text-left font-semibold text-foreground border border-border bg-muted/50 sticky left-0 z-10 min-w-40">
                  Student
                </th>
                <th className="px-3 py-2.5 text-left font-semibold text-foreground border border-border bg-muted/50 w-24">
                  Adm. No.
                </th>
                {group.subjects.map((subj) => (
                  <th
                    key={subj}
                    className="px-3 py-2.5 text-center font-semibold text-foreground border border-border bg-muted/50 min-w-28 whitespace-nowrap"
                  >
                    {subj}
                    <span className="block text-xs font-normal text-muted-foreground">
                      /{group.maxMarks}
                    </span>
                  </th>
                ))}
                <th className="px-3 py-2.5 text-center font-semibold text-foreground border border-border bg-muted/50 w-20">
                  Total
                </th>
                <th className="px-3 py-2.5 text-center font-semibold text-foreground border border-border bg-muted/50 w-16">
                  %
                </th>
                <th className="px-3 py-2.5 text-center font-semibold text-foreground border border-border bg-muted/50 w-16">
                  Grade
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, si) => {
                const total = r.subjects.reduce(
                  (s, sub) => s + sub.marksObtained,
                  0,
                );
                const maxTotal = r.subjects.reduce(
                  (s, sub) => s + sub.maxMarks,
                  0,
                );
                const pct =
                  maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
                const grade = calcGrade(pct);
                return (
                  <tr
                    // biome-ignore lint/suspicious/noArrayIndexKey: student index is stable within this session
                    key={si}
                    className={`border-b border-border ${si % 2 === 0 ? "bg-background" : "bg-muted/10"}`}
                  >
                    <td className="px-3 py-2 font-medium text-foreground border border-border sticky left-0 bg-inherit">
                      {r.studentName}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground text-xs border border-border font-mono">
                      {r.admNo}
                    </td>
                    {r.subjects.map((s, sj) => (
                      <td
                        // biome-ignore lint/suspicious/noArrayIndexKey: subject index is stable within row
                        key={sj}
                        className="px-2 py-1 border border-border"
                      >
                        <Input
                          type="number"
                          min={0}
                          max={group.maxMarks}
                          value={s.marksObtained}
                          onChange={(e) => updateMark(si, sj, e.target.value)}
                          className="h-8 text-center w-full min-w-16"
                          data-ocid={`marks-${si}-${sj}`}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-mono font-semibold text-foreground border border-border">
                      {total}/{maxTotal}
                    </td>
                    <td className="px-3 py-2 text-center font-semibold text-foreground border border-border">
                      {pct}%
                    </td>
                    <td className="px-3 py-2 text-center border border-border">
                      <Badge className={`${gradeBadgeClass(grade)} text-xs`}>
                        {grade}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t border-border px-5 py-3 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} data-ocid="marks-save">
            Save Marks
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ExamResults() {
  const { currentSession } = useApp();
  const sessionId = currentSession?.id ?? "sess_2025";

  const [savedTimetables, setSavedTimetables] = useState<SavedTimetable[]>(() =>
    ls.get<SavedTimetable[]>("exam_timetables", []),
  );

  const [groups, setGroups] = useState<ExamResultGroup[]>(() =>
    ls.get<ExamResultGroup[]>("exam_result_groups", []),
  );

  // Filters
  const [filterExam, setFilterExam] = useState("all");
  const [filterClass, setFilterClass] = useState("all");
  const [search, setSearch] = useState("");

  // UI state
  const [showNewForm, setShowNewForm] = useState(false);
  const [editGroup, setEditGroup] = useState<ExamResultGroup | null>(null);
  const [printTarget, setPrintTarget] = useState<{
    result: StudentResult;
    examName: string;
  } | null>(null);

  // New result form state
  const [newExamId, setNewExamId] = useState("");
  const [newClassKey, setNewClassKey] = useState("");
  const [newMaxMarks, setNewMaxMarks] = useState(100);
  const [newSubjects, setNewSubjects] = useState<string[]>([]);

  // Refresh saved timetables when component mounts
  useEffect(() => {
    setSavedTimetables(ls.get<SavedTimetable[]>("exam_timetables", []));
  }, []);

  const selectedTimetable = savedTimetables.find((t) => t.id === newExamId);

  // When exam selected, auto-populate class list
  const availableClasses = selectedTimetable
    ? selectedTimetable.tables.map((t) => t.classKey)
    : [];

  // When class selected, auto-populate subjects
  useEffect(() => {
    if (!selectedTimetable || !newClassKey) {
      setNewSubjects([]);
      return;
    }
    const classTable = selectedTimetable.tables.find(
      (t) => t.classKey === newClassKey,
    );
    if (classTable) {
      const uniqueSubjects = [
        ...new Set(classTable.rows.map((r) => r.subject)),
      ];
      setNewSubjects(uniqueSubjects);
    }
  }, [selectedTimetable, newClassKey]);

  const studentsForClass = newClassKey
    ? ls.get<Student[]>("students", []).filter((s) => {
        const cls = newClassKey.replace("Class ", "").replace(/[A-Z]$/, "");
        const sec = newClassKey.replace("Class ", "").slice(-1);
        return s.class === cls && s.section === sec;
      })
    : [];

  const handleCreateGroup = () => {
    if (!selectedTimetable || !newClassKey || newSubjects.length === 0) return;
    const newGroup: ExamResultGroup = {
      id: generateId(),
      examName: selectedTimetable.examName,
      classKey: newClassKey,
      subjects: newSubjects,
      maxMarks: newMaxMarks,
      studentResults: studentsForClass.map((s) => ({
        studentId: s.id,
        studentName: s.fullName,
        admNo: s.admNo,
        subjects: newSubjects.map((subj) => ({
          subject: subj,
          maxMarks: newMaxMarks,
          marksObtained: 0,
        })),
      })),
      sessionId,
      savedAt: new Date().toISOString(),
    };
    const updated = [newGroup, ...groups];
    ls.set("exam_result_groups", updated);
    setGroups(updated);
    setShowNewForm(false);
    setNewExamId("");
    setNewClassKey("");
    setNewSubjects([]);
    setNewMaxMarks(100);
    setEditGroup(newGroup);
  };

  const handleSaveGroup = (updated: ExamResultGroup) => {
    setGroups((prev) => {
      const list = prev.map((g) => (g.id === updated.id ? updated : g));
      ls.set("exam_result_groups", list);
      return list;
    });
    setEditGroup(null);
  };

  const handleDeleteGroup = (id: string) => {
    setGroups((prev) => {
      const list = prev.filter((g) => g.id !== id);
      ls.set("exam_result_groups", list);
      return list;
    });
  };

  const examNames = [...new Set(groups.map((g) => g.examName))];
  const classKeys = CLASSES.flatMap((c) =>
    SECTIONS.slice(0, 3).map((s) => `Class ${c}${s}`),
  );

  const filteredGroups = groups.filter((g) => {
    const matchExam = filterExam === "all" || g.examName === filterExam;
    const matchClass = filterClass === "all" || g.classKey === filterClass;
    return matchExam && matchClass;
  });

  // For legacy individual results display
  const legacyResults = ls
    .get<ExamResultLegacy[]>("exam_results", [])
    .filter((r) => {
      const matchExam = filterExam === "all" || r.examName === filterExam;
      const matchClass =
        filterClass === "all" ||
        `Class ${r.studentClass}${r.section}` === filterClass;
      const matchSearch =
        !search ||
        r.studentName.toLowerCase().includes(search.toLowerCase()) ||
        r.admNo.toLowerCase().includes(search.toLowerCase());
      return matchExam && matchClass && matchSearch;
    });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Search student…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-44"
            data-ocid="result-search"
          />
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            value={filterExam}
            onChange={(e) => setFilterExam(e.target.value)}
            data-ocid="result-filter-exam"
          >
            <option value="all">All Exams</option>
            {examNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            data-ocid="result-filter-class"
          >
            <option value="all">All Classes</option>
            {classKeys.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={() => setShowNewForm(true)} data-ocid="result-add">
          + New Result Sheet
        </Button>
      </div>

      {/* New Result Form */}
      {showNewForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">
              Create Result Sheet
            </h3>
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {savedTimetables.length === 0 ? (
            <div className="text-center py-8 bg-muted/30 rounded-lg">
              <p className="text-2xl mb-2">📅</p>
              <p className="font-medium text-foreground">No saved timetables</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create and save an exam timetable first from the Timetable Maker
                tab
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label>Select Exam</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  value={newExamId}
                  onChange={(e) => {
                    setNewExamId(e.target.value);
                    setNewClassKey("");
                    setNewSubjects([]);
                  }}
                  data-ocid="new-result-exam"
                >
                  <option value="">— Select Exam —</option>
                  {savedTimetables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.examName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Class &amp; Section</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  value={newClassKey}
                  onChange={(e) => setNewClassKey(e.target.value)}
                  disabled={!newExamId}
                  data-ocid="new-result-class"
                >
                  <option value="">— Select Class —</option>
                  {availableClasses.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Max Marks (per subject)</Label>
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={newMaxMarks}
                  onChange={(e) =>
                    setNewMaxMarks(Number(e.target.value) || 100)
                  }
                  data-ocid="new-result-max-marks"
                />
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <Button
                  onClick={handleCreateGroup}
                  disabled={
                    !newExamId || !newClassKey || newSubjects.length === 0
                  }
                  data-ocid="new-result-create"
                >
                  Create &amp; Enter Marks
                </Button>
              </div>
            </div>
          )}

          {newSubjects.length > 0 && (
            <div className="space-y-1.5">
              <Label>Subjects (auto-populated from timetable)</Label>
              <div className="flex flex-wrap gap-1.5">
                {newSubjects.map((s) => (
                  <Badge key={s} variant="secondary" className="px-2.5 py-1">
                    {s}
                  </Badge>
                ))}
              </div>
              {studentsForClass.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {studentsForClass.length} students found in {newClassKey}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Result Groups List */}
      {filteredGroups.length === 0 && legacyResults.length === 0 ? (
        <div
          className="bg-card border border-dashed border-border rounded-xl py-16 text-center"
          data-ocid="result-empty"
        >
          <p className="text-4xl mb-3">📋</p>
          <p className="font-semibold text-foreground text-lg">
            No results yet
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            Create a result sheet by clicking "+ New Result Sheet" above
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((g) => {
            const totalStudents = g.studentResults.length;
            const filledCount = g.studentResults.filter((r) =>
              r.subjects.some((s) => s.marksObtained > 0),
            ).length;
            const avgPct =
              totalStudents > 0
                ? Math.round(
                    g.studentResults.reduce((sum, r) => {
                      const tot = r.subjects.reduce(
                        (s, sub) => s + sub.marksObtained,
                        0,
                      );
                      const max = r.subjects.reduce(
                        (s, sub) => s + sub.maxMarks,
                        0,
                      );
                      return sum + (max > 0 ? (tot / max) * 100 : 0);
                    }, 0) / totalStudents,
                  )
                : 0;

            return (
              <div
                key={g.id}
                className="bg-card border border-border rounded-xl overflow-hidden"
                data-ocid={`result-group-${g.id}`}
              >
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground">
                        {g.examName}
                      </p>
                      <Badge variant="secondary">{g.classKey}</Badge>
                      <Badge className="bg-muted text-muted-foreground border-border">
                        {g.subjects.length} subjects
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {totalStudents} students &nbsp;·&nbsp; {filledCount} marks
                      entered &nbsp;·&nbsp; Avg: {avgPct}%
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0 ml-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditGroup(g)}
                      data-ocid={`result-enter-${g.id}`}
                    >
                      Enter Marks
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteGroup(g.id)}
                      data-ocid={`result-delete-${g.id}`}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Student results summary */}
                {g.studentResults.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-max">
                      <thead>
                        <tr className="bg-muted/30 border-b border-border">
                          <th className="px-4 py-2 text-left text-muted-foreground font-medium">
                            Student
                          </th>
                          <th className="px-4 py-2 text-left text-muted-foreground font-medium">
                            Adm. No.
                          </th>
                          {g.subjects.map((subj) => (
                            <th
                              key={subj}
                              className="px-3 py-2 text-center text-muted-foreground font-medium whitespace-nowrap"
                            >
                              {subj}
                            </th>
                          ))}
                          <th className="px-3 py-2 text-center text-muted-foreground font-medium">
                            Total
                          </th>
                          <th className="px-3 py-2 text-center text-muted-foreground font-medium">
                            %
                          </th>
                          <th className="px-3 py-2 text-center text-muted-foreground font-medium">
                            Grade
                          </th>
                          <th className="px-3 py-2 text-center text-muted-foreground font-medium">
                            Result
                          </th>
                          <th className="px-3 py-2 text-right text-muted-foreground font-medium">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.studentResults
                          .filter(
                            (r) =>
                              !search ||
                              r.studentName
                                .toLowerCase()
                                .includes(search.toLowerCase()) ||
                              r.admNo
                                .toLowerCase()
                                .includes(search.toLowerCase()),
                          )
                          .map((r, ri) => {
                            const total = r.subjects.reduce(
                              (s, sub) => s + sub.marksObtained,
                              0,
                            );
                            const maxTotal = r.subjects.reduce(
                              (s, sub) => s + sub.maxMarks,
                              0,
                            );
                            const pct =
                              maxTotal > 0
                                ? Math.round((total / maxTotal) * 100)
                                : 0;
                            const grade = calcGrade(pct);
                            const pass = pct >= 40;
                            return (
                              <tr
                                // biome-ignore lint/suspicious/noArrayIndexKey: stable index for result rows
                                key={ri}
                                className="border-t border-border/50 hover:bg-muted/20"
                              >
                                <td className="px-4 py-2 font-medium text-foreground">
                                  {r.studentName}
                                </td>
                                <td className="px-4 py-2 text-xs text-muted-foreground font-mono">
                                  {r.admNo}
                                </td>
                                {r.subjects.map((s, si) => (
                                  <td
                                    // biome-ignore lint/suspicious/noArrayIndexKey: stable index
                                    key={si}
                                    className="px-3 py-2 text-center font-mono text-foreground"
                                  >
                                    {s.marksObtained}
                                  </td>
                                ))}
                                <td className="px-3 py-2 text-center font-mono font-semibold text-foreground">
                                  {total}/{maxTotal}
                                </td>
                                <td className="px-3 py-2 text-center font-semibold text-foreground">
                                  {pct}%
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <Badge
                                    className={`${gradeBadgeClass(grade)} text-xs`}
                                  >
                                    {grade}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <Badge
                                    className={
                                      pass
                                        ? "bg-accent/20 text-accent text-xs"
                                        : "bg-destructive/20 text-destructive text-xs"
                                    }
                                  >
                                    {pass ? "PASS" : "FAIL"}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setPrintTarget({
                                        result: r,
                                        examName: g.examName,
                                      })
                                    }
                                    data-ocid={`result-print-${g.id}-${ri}`}
                                  >
                                    Marksheet
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Marks entry modal */}
      {editGroup && (
        <MarksEntryTable
          group={editGroup}
          students={ls.get<Student[]>("students", []).filter((s) => {
            const cls = editGroup.classKey
              .replace("Class ", "")
              .replace(/[A-Z]$/, "");
            const sec = editGroup.classKey.replace("Class ", "").slice(-1);
            return s.class === cls && s.section === sec;
          })}
          onSave={handleSaveGroup}
          onClose={() => setEditGroup(null)}
        />
      )}

      {/* Marksheet print modal */}
      {printTarget && (
        <Marksheet
          result={printTarget.result}
          examName={printTarget.examName}
          onClose={() => setPrintTarget(null)}
        />
      )}
    </div>
  );
}
