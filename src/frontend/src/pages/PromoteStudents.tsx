import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import type { FeeReceipt, Student } from "../types";
import {
  CLASSES,
  MONTHS,
  SECTIONS,
  formatCurrency,
  generateId,
  ls,
} from "../utils/localStorage";

interface SectionMap {
  fromClass: string;
  fromSection: string;
  toClass: string;
  selected: boolean;
}

function getNextClass(cls: string): string | null {
  const idx = CLASSES.indexOf(cls);
  if (idx === -1 || idx === CLASSES.length - 1) return null;
  return CLASSES[idx + 1];
}

export default function PromoteStudents() {
  const { currentSession, createSession, switchSession, addNotification } =
    useApp();
  const [step, setStep] = useState(1);
  const [newSessionLabel, setNewSessionLabel] = useState("");
  const [sectionMaps, setSectionMaps] = useState<SectionMap[]>(() => {
    const maps: SectionMap[] = [];
    for (const cls of CLASSES) {
      const next = getNextClass(cls);
      for (const sec of SECTIONS) {
        maps.push({
          fromClass: cls,
          fromSection: sec,
          toClass: next ?? "Passed Out",
          selected: false,
        });
      }
    }
    return maps;
  });
  const [confirmedCheckbox, setConfirmedCheckbox] = useState(false);
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState({
    promoted: 0,
    passedOut: 0,
    duesCarried: 0,
    totalDueAmount: 0,
  });

  const students = useMemo(
    () =>
      ls
        .get<Student[]>("students", [])
        .filter(
          (s) =>
            s.sessionId === (currentSession?.id ?? "") && s.status === "active",
        ),
    [currentSession],
  );

  const receipts = useMemo(
    () =>
      ls
        .get<FeeReceipt[]>("fee_receipts", [])
        .filter(
          (r) => r.sessionId === (currentSession?.id ?? "") && !r.isDeleted,
        ),
    [currentSession],
  );

  function getStudentsForSection(cls: string, sec: string): Student[] {
    return students.filter((s) => s.class === cls && s.section === sec);
  }

  function toggleSection(idx: number) {
    setSectionMaps((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, selected: !m.selected } : m)),
    );
  }

  function selectAll() {
    setSectionMaps((prev) =>
      prev.map((m) => ({
        ...m,
        selected: getStudentsForSection(m.fromClass, m.fromSection).length > 0,
      })),
    );
  }

  function clearAll() {
    setSectionMaps((prev) => prev.map((m) => ({ ...m, selected: false })));
  }

  const selectedMaps = sectionMaps.filter((m) => m.selected);
  const affectedStudents = selectedMaps.flatMap((m) =>
    getStudentsForSection(m.fromClass, m.fromSection),
  );

  function getPaidMonths(studentId: string): Set<string> {
    const paid = new Set<string>();
    for (const r of receipts.filter((r) => r.studentId === studentId)) {
      for (const item of r.items) paid.add(item.month);
    }
    return paid;
  }

  function getUnpaidMonths(studentId: string): string[] {
    const paid = getPaidMonths(studentId);
    return MONTHS.filter((m) => !paid.has(m));
  }

  // Estimate due amount from fee plan for the student
  function getStudentDueAmount(
    student: Student,
    unpaidMonths: string[],
  ): number {
    if (unpaidMonths.length === 0) return 0;
    const feesPlan = ls.get<
      Array<{
        classId: string;
        sectionId: string;
        headingId: string;
        amount: number;
      }>
    >("fees_plan", []);
    const planEntries = feesPlan.filter(
      (p) => p.classId === student.class && p.sectionId === student.section,
    );
    if (planEntries.length === 0) return 0;
    const monthlyTotal = planEntries.reduce((sum, p) => sum + p.amount, 0);
    return monthlyTotal * unpaidMonths.length;
  }

  const passedOutCount = affectedStudents.filter(
    (s) =>
      selectedMaps.find(
        (m) => m.fromClass === s.class && m.fromSection === s.section,
      )?.toClass === "Passed Out",
  ).length;

  const studentsWithDues = affectedStudents.filter(
    (s) => getUnpaidMonths(s.id).length > 0,
  );

  const totalDueEstimate = studentsWithDues.reduce((sum, s) => {
    const unpaid = getUnpaidMonths(s.id);
    return sum + getStudentDueAmount(s, unpaid);
  }, 0);

  function handlePromote() {
    if (!newSessionLabel.trim().match(/^\d{4}-\d{2}$/)) {
      alert("Session label must be in YYYY-YY format (e.g. 2026-27)");
      return;
    }
    if (!confirmedCheckbox) {
      alert("Please check the confirmation checkbox before proceeding.");
      return;
    }

    const newSession = createSession(newSessionLabel.trim());
    const allStudents = ls.get<Student[]>("students", []);
    let promoted = 0;
    let passedOut = 0;
    let duesCarried = 0;
    let totalDueAmount = 0;

    // Save old-balance records separately for dues tracking
    const oldBalances: Array<{
      id: string;
      studentId: string;
      studentName: string;
      sessionLabel: string;
      months: string[];
      totalAmount: number;
    }> = ls.get("old_balances", []);

    const updatedStudents = allStudents.map((s) => {
      if (s.sessionId !== (currentSession?.id ?? "")) return s;
      const map = selectedMaps.find(
        (m) => m.fromClass === s.class && m.fromSection === s.section,
      );
      if (!map) return s;

      const unpaid = getUnpaidMonths(s.id);
      const dueAmt = getStudentDueAmount(s, unpaid);

      if (unpaid.length > 0) {
        duesCarried++;
        totalDueAmount += dueAmt;
        oldBalances.push({
          id: generateId(),
          studentId: s.id,
          studentName: s.fullName,
          sessionLabel: currentSession?.label ?? "",
          months: unpaid,
          totalAmount: dueAmt,
        });
      }

      const oldBal: Record<string, boolean> = {};
      for (const month of unpaid) oldBal[month] = true;

      if (map.toClass === "Passed Out") {
        passedOut++;
        return {
          ...s,
          status: "discontinued" as const,
          leavingDate: new Date().toISOString().split("T")[0],
          leavingReason: "Passed Out / Graduated",
          remarks: "Passed Out / Graduated",
          sessionId: newSession.id,
          oldBalance: oldBal,
        };
      }

      promoted++;
      return {
        ...s,
        class: map.toClass,
        sessionId: newSession.id,
        oldBalance: oldBal,
      };
    });

    ls.set("students", updatedStudents);
    ls.set("old_balances", oldBalances);
    switchSession(newSession.id);
    setSummary({ promoted, passedOut, duesCarried, totalDueAmount });
    addNotification(
      `Promotion complete: ${promoted} promoted, ${passedOut} passed out to session ${newSessionLabel}`,
      "success",
      "🎓",
    );
    setDone(true);
  }

  // ─── Done Screen ──────────────────────────────────────────
  if (done) {
    return (
      <div className="p-4 lg:p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="p-10 text-center max-w-md w-full shadow-elevated">
          <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-accent" />
          </div>
          <h2 className="text-xl font-display font-bold text-foreground mb-2">
            Promotion Complete!
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Session changed to{" "}
            <strong className="text-foreground">{newSessionLabel}</strong>
          </p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-4 bg-accent/10 rounded-xl">
              <p className="text-2xl font-bold text-accent font-display">
                {summary.promoted}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Promoted</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-xl">
              <p className="text-2xl font-bold text-primary font-display">
                {summary.passedOut}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Passed Out</p>
            </div>
          </div>
          {summary.duesCarried > 0 && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl mb-4">
              <p className="text-lg font-bold text-orange-700 font-display">
                {summary.duesCarried} students
              </p>
              <p className="text-xs text-orange-600 mt-0.5">
                had dues carried forward
              </p>
              {summary.totalDueAmount > 0 && (
                <p className="text-sm font-semibold text-orange-700 mt-1">
                  ≈ {formatCurrency(summary.totalDueAmount)} total
                </p>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground leading-relaxed">
            Unpaid dues are stored as "Old Balance" and visible in Fees →
            Collect Fees. The old session{" "}
            <strong className="text-foreground">{currentSession?.label}</strong>{" "}
            is archived and accessible from the session switcher.
          </p>
        </Card>
      </div>
    );
  }

  // ─── Steps ────────────────────────────────────────────────
  const stepLabels = [
    "Set New Session",
    "Select Classes",
    "Review Dues",
    "Confirm",
  ];

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">
            Promote Students
          </h1>
          <p className="text-sm text-muted-foreground">
            Move students to the next class and session
          </p>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : step > s
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {step > s ? "✓" : s}
            </div>
            {s < 4 && (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          {stepLabels[step - 1]}
        </span>
      </div>

      {/* ── Step 1: New Session ── */}
      {step === 1 && (
        <Card className="p-6 space-y-5">
          <h2 className="font-display font-semibold text-foreground">
            Step 1: Set New Session
          </h2>
          <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
            <Badge variant="secondary">Current Session</Badge>
            <span className="font-semibold text-foreground">
              {currentSession?.label ?? "—"}
            </span>
            <Badge variant="outline" className="ml-auto text-xs">
              Active
            </Badge>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-session-label">New Session Label *</Label>
            <Input
              id="new-session-label"
              data-ocid="promote-new-session"
              placeholder="e.g. 2026-27"
              value={newSessionLabel}
              onChange={(e) => setNewSessionLabel(e.target.value)}
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              Format: YYYY-YY (e.g. 2026-27). The old session will be archived.
            </p>
          </div>

          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm text-foreground">
            <p className="font-medium mb-1">What happens after promotion:</p>
            <ul className="text-muted-foreground space-y-1 text-xs list-disc list-inside">
              <li>Current session is archived (data preserved forever)</li>
              <li>Students advance to next class in the new session</li>
              <li>Class 12 students are automatically marked "Passed Out"</li>
              <li>Unpaid monthly dues carry forward as Old Balance</li>
            </ul>
          </div>

          <div className="flex justify-end">
            <Button
              data-ocid="promote-step1-next"
              onClick={() => setStep(2)}
              disabled={!newSessionLabel.trim().match(/^\d{4}-\d{2}$/)}
            >
              Next: Select Classes →
            </Button>
          </div>
        </Card>
      )}

      {/* ── Step 2: Select Sections ── */}
      {step === 2 && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-display font-semibold text-foreground">
              Step 2: Select Sections to Promote
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Only sections with active students are shown.
          </p>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {sectionMaps
              .filter(
                (m) =>
                  getStudentsForSection(m.fromClass, m.fromSection).length > 0,
              )
              .map((m) => {
                const realIdx = sectionMaps.findIndex(
                  (x) =>
                    x.fromClass === m.fromClass &&
                    x.fromSection === m.fromSection,
                );
                const count = getStudentsForSection(
                  m.fromClass,
                  m.fromSection,
                ).length;
                return (
                  <label
                    key={`${m.fromClass}-${m.fromSection}`}
                    htmlFor={`section-${m.fromClass}-${m.fromSection}`}
                    className={`flex items-center gap-4 p-3 rounded-lg transition-colors cursor-pointer w-full ${
                      m.selected
                        ? "bg-primary/5 border border-primary/20"
                        : "bg-muted/30 hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      id={`section-${m.fromClass}-${m.fromSection}`}
                      data-ocid={`promote-section-${m.fromClass}-${m.fromSection}`}
                      checked={m.selected}
                      onCheckedChange={() => toggleSection(realIdx)}
                    />
                    <span className="flex-1 flex items-center gap-3">
                      <span className="font-semibold text-foreground">
                        Class {m.fromClass}-{m.fromSection}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      <span
                        className={
                          m.toClass === "Passed Out"
                            ? "text-orange-600 font-medium"
                            : "text-accent font-medium"
                        }
                      >
                        {m.toClass === "Passed Out"
                          ? "🎓 Passed Out"
                          : `Class ${m.toClass}-${m.fromSection}`}
                      </span>
                      <Badge variant="secondary" className="ml-auto">
                        {count} student{count !== 1 ? "s" : ""}
                      </Badge>
                    </span>
                  </label>
                );
              })}
          </div>
          <div className="flex justify-between gap-3 pt-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              ← Back
            </Button>
            <Button
              data-ocid="promote-step2-next"
              onClick={() => setStep(3)}
              disabled={selectedMaps.length === 0}
            >
              Next: Review Dues ({affectedStudents.length} students) →
            </Button>
          </div>
        </Card>
      )}

      {/* ── Step 3: Review ── */}
      {step === 3 && (
        <Card className="p-6 space-y-4">
          <h2 className="font-display font-semibold text-foreground">
            Step 3: Review Students & Dues
          </h2>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-muted/40 rounded-xl text-center">
              <p className="text-lg font-bold font-display text-foreground">
                {affectedStudents.length}
              </p>
              <p className="text-xs text-muted-foreground">Total Students</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-xl text-center">
              <p className="text-lg font-bold font-display text-orange-700">
                {passedOutCount}
              </p>
              <p className="text-xs text-muted-foreground">Passing Out</p>
            </div>
            <div className="p-3 bg-accent/10 rounded-xl text-center">
              <p className="text-lg font-bold font-display text-accent">
                {studentsWithDues.length}
              </p>
              <p className="text-xs text-muted-foreground">Have Dues</p>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">
                    Student
                  </th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">
                    From
                  </th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">
                    To
                  </th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">
                    Unpaid Months
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {affectedStudents.map((s) => {
                  const unpaid = getUnpaidMonths(s.id);
                  const map = selectedMaps.find(
                    (m) =>
                      m.fromClass === s.class && m.fromSection === s.section,
                  );
                  return (
                    <tr key={s.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium text-foreground">
                        {s.fullName}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {s.class}-{s.section}
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          variant={
                            map?.toClass === "Passed Out"
                              ? "secondary"
                              : "default"
                          }
                          className="text-xs"
                        >
                          {map?.toClass === "Passed Out"
                            ? "Passed Out"
                            : `${map?.toClass}-${s.section}`}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        {unpaid.length === 0 ? (
                          <span className="text-accent text-xs">✓ Clear</span>
                        ) : (
                          <div className="flex flex-wrap gap-0.5">
                            {unpaid.map((m) => (
                              <Badge
                                key={m}
                                variant="secondary"
                                className="text-xs bg-orange-100 text-orange-700 border-orange-200"
                              >
                                {m.slice(0, 3)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between gap-3 pt-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              ← Back
            </Button>
            <Button data-ocid="promote-step3-next" onClick={() => setStep(4)}>
              Next: Confirm →
            </Button>
          </div>
        </Card>
      )}

      {/* ── Step 4: Confirm ── */}
      {step === 4 && (
        <Card className="p-6 space-y-5">
          <h2 className="font-display font-semibold text-foreground">
            Step 4: Confirm Promotion
          </h2>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-accent/10 rounded-xl text-center">
              <p className="text-2xl font-bold font-display text-accent">
                {affectedStudents.length - passedOutCount}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Will be Promoted
              </p>
            </div>
            <div className="p-4 bg-primary/10 rounded-xl text-center">
              <p className="text-2xl font-bold font-display text-primary">
                {passedOutCount}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Passing Out
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-xl text-center">
              <p className="text-2xl font-bold font-display text-orange-700">
                {studentsWithDues.length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Have Dues</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-xl text-center">
              <p className="text-base font-bold font-display text-orange-700">
                {totalDueEstimate > 0 ? formatCurrency(totalDueEstimate) : "₹0"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dues Amount
              </p>
            </div>
          </div>

          {/* Session summary */}
          <div className="space-y-2 p-4 bg-muted/40 rounded-xl">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Current session (will be archived):
              </span>
              <span className="font-semibold text-foreground">
                {currentSession?.label}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">New session:</span>
              <span className="font-semibold text-primary">
                {newSessionLabel}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sections selected:</span>
              <span className="font-semibold text-foreground">
                {selectedMaps.length}
              </span>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-orange-800">
              <p className="font-semibold mb-1">Important — Please Read</p>
              <ul className="space-y-1 text-xs list-disc list-inside">
                <li>
                  The current session will be archived (read-only) and a new
                  session will be created
                </li>
                <li>
                  Students will be moved to the next class in the new session
                </li>
                <li>
                  Unpaid dues will carry forward as "Old Balance" and remain
                  visible in Fees
                </li>
                <li>This action cannot be undone — export a backup first</li>
              </ul>
            </div>
          </div>

          {/* Confirm checkbox */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
            <Checkbox
              id="confirm-promotion"
              data-ocid="promote-confirm-checkbox"
              checked={confirmedCheckbox}
              onCheckedChange={(v) => setConfirmedCheckbox(!!v)}
            />
            <Label
              htmlFor="confirm-promotion"
              className="text-sm cursor-pointer leading-relaxed"
            >
              I confirm this action cannot be undone. I have exported a backup
              of all school data before proceeding.
            </Label>
          </div>

          <div className="flex justify-between gap-3 pt-1">
            <Button variant="outline" onClick={() => setStep(3)}>
              ← Back
            </Button>
            <Button
              data-ocid="promote-confirm"
              onClick={handlePromote}
              disabled={!confirmedCheckbox}
              className="min-w-40"
            >
              <GraduationCap className="w-4 h-4 mr-1.5" />
              Promote All Students
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
