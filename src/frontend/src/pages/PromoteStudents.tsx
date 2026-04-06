import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  ChevronRight,
  GraduationCap,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface StudentRecord {
  id: number;
  admNo: string;
  name: string;
  fatherName: string;
  motherName?: string;
  className: string;
  section: string;
  rollNo: string;
  dob: string;
  contact: string;
  route?: string;
  schNo?: string;
  oldBalance: number;
  status: "Active" | "Inactive" | "Discontinued";
  session?: string;
  prevSessionDues?: Array<{
    month: string;
    sessionLabel: string;
    amount: number;
  }>;
  leavingDate?: string;
  leavingReason?: string;
  leavingRemarks?: string;
  [key: string]: unknown;
}

interface ClassRecord {
  name: string;
  sections: string[];
  teacher: string;
  max: number;
}

interface ClassTeacherRecord {
  id: string;
  classSection: string;
  teacherName: string;
  teacherId: string;
  subjects: string[];
  classRangeFrom: string;
  classRangeTo: string;
}

interface PaymentRecord {
  id: string;
  admNo: string;
  months: string[];
  feeRows: Array<{
    id: number;
    feeHead: string;
    months: Record<string, number>;
    checked: boolean;
  }>;
  netFees: number;
  receiptAmt: number;
  balance: number;
  session?: string;
  [key: string]: unknown;
}

const CLASS_PROGRESSION: Record<string, string> = {
  Nursery: "Class 1",
  KG: "Class 1",
  LKG: "UKG",
  UKG: "Class 1",
  "Class 1": "Class 2",
  "Class 2": "Class 3",
  "Class 3": "Class 4",
  "Class 4": "Class 5",
  "Class 5": "Class 6",
  "Class 6": "Class 7",
  "Class 7": "Class 8",
  "Class 8": "Class 9",
  "Class 9": "Class 10",
  "Class 10": "PASSED_OUT",
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function getNextSession(current: string): string {
  const match = current.match(/(\d{4})-(\d{2,4})/);
  if (match) {
    const startYear = Number.parseInt(match[1], 10);
    const endYear = startYear + 1;
    return `${endYear}-${String(endYear + 1).slice(-2)}`;
  }
  return "2026-27";
}

function getClassSection(className: string, section: string): string {
  return `${className}-${section}`;
}

type Step = 1 | 2 | 3 | 4;

export function PromoteStudents() {
  const [step, setStep] = useState<Step>(1);
  const [currentSession] = useState<string>(() => {
    try {
      const settings = JSON.parse(localStorage.getItem("erp_settings") || "{}");
      return settings.session || "2025-26";
    } catch {
      return "2025-26";
    }
  });
  const [newSession, setNewSession] = useState<string>(() =>
    getNextSession(
      (() => {
        try {
          const settings = JSON.parse(
            localStorage.getItem("erp_settings") || "{}",
          );
          return settings.session || "2025-26";
        } catch {
          return "2025-26";
        }
      })(),
    ),
  );

  // Step 2: class selection
  const _classes = loadFromStorage<ClassRecord[]>("erp_classes", []);
  const classTeachers = loadFromStorage<ClassTeacherRecord[]>(
    "erp_class_teachers",
    [],
  );
  const allStudents = loadFromStorage<StudentRecord[]>("erp_students", []);
  const activeStudents = allStudents.filter((s) => s.status === "Active");

  // Group active students by className+section
  const classGroups: Record<string, StudentRecord[]> = {};
  for (const s of activeStudents) {
    const key = getClassSection(s.className, s.section);
    if (!classGroups[key]) classGroups[key] = [];
    classGroups[key].push(s);
  }
  const classSections = Object.keys(classGroups).sort();

  const [selectedSections, setSelectedSections] = useState<Set<string>>(
    () => new Set(classSections),
  );

  const toggleSection = (cs: string) => {
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(cs)) next.delete(cs);
      else next.add(cs);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    if (checked) setSelectedSections(new Set(classSections));
    else setSelectedSections(new Set());
  };

  const selectedStudents = activeStudents.filter((s) =>
    selectedSections.has(getClassSection(s.className, s.section)),
  );

  // Step 3: review data
  const payments = loadFromStorage<PaymentRecord[]>("erp_fee_payments", []);

  const getStudentDues = (admNo: string): number => {
    return payments
      .filter((p) => p.admNo === admNo && p.balance > 0)
      .reduce((s, p) => s + p.balance, 0);
  };

  const getNextClass = (className: string): string => {
    return CLASS_PROGRESSION[className] || className;
  };

  const passOutCount = selectedStudents.filter(
    (s) => getNextClass(s.className) === "PASSED_OUT",
  ).length;
  const studentsWithDues = selectedStudents.filter(
    (s) => getStudentDues(s.admNo) > 0,
  ).length;
  const totalDues = selectedStudents.reduce(
    (sum, s) => sum + getStudentDues(s.admNo),
    0,
  );

  // Promotion logic
  const [promotionResult, setPromotionResult] = useState<{
    promoted: number;
    passedOut: number;
    duesCarried: number;
  } | null>(null);

  const handleConfirmPromotion = () => {
    try {
      const allStudentsData = loadFromStorage<StudentRecord[]>(
        "erp_students",
        [],
      );
      const allPayments = loadFromStorage<PaymentRecord[]>(
        "erp_fee_payments",
        [],
      );

      // Archive current session
      const archiveKey = `erp_session_archive_${currentSession.replace(/[^a-zA-Z0-9]/g, "_")}`;
      localStorage.setItem(
        archiveKey,
        JSON.stringify({
          sessionLabel: currentSession,
          archivedAt: new Date().toISOString(),
          students: allStudentsData,
          payments: allPayments,
        }),
      );

      let promotedCount = 0;
      let passedOutCount = 0;
      let duesCarriedCount = 0;

      const updatedStudents = allStudentsData.map((s) => {
        if (s.status !== "Active") return s;
        const cs = getClassSection(s.className, s.section);
        if (!selectedSections.has(cs)) return s;

        // Calculate per-month dues from payments
        const studentPayments = allPayments.filter(
          (p) => p.admNo === s.admNo && p.balance > 0,
        );
        const prevDues: Array<{
          month: string;
          sessionLabel: string;
          amount: number;
        }> = [];

        for (const p of studentPayments) {
          if (p.months.length > 0 && p.balance > 0) {
            const perMonth = p.balance / p.months.length;
            for (const m of p.months) {
              const existing = prevDues.find(
                (d) => d.month === m && d.sessionLabel === currentSession,
              );
              if (existing) {
                existing.amount += perMonth;
              } else {
                prevDues.push({
                  month: m,
                  sessionLabel: currentSession,
                  amount: Math.round(perMonth),
                });
              }
            }
          }
        }

        const totalOldBalance = studentPayments.reduce(
          (sum, p) => sum + p.balance,
          0,
        );
        const nextClass = getNextClass(s.className);
        const isPassedOut = nextClass === "PASSED_OUT";

        if (prevDues.length > 0) duesCarriedCount++;

        if (isPassedOut) {
          passedOutCount++;
          return {
            ...s,
            status: "Discontinued" as const,
            leavingReason: "Passed Out (Class 10)",
            leavingDate: new Date().toISOString().split("T")[0],
            leavingRemarks: `Promoted out after Session ${currentSession}`,
            session: newSession,
            prevSessionDues: prevDues,
            oldBalance: Math.round(totalOldBalance),
          };
        }

        promotedCount++;
        return {
          ...s,
          className: nextClass,
          session: newSession,
          prevSessionDues: prevDues,
          oldBalance: Math.round(totalOldBalance),
        };
      });

      localStorage.setItem("erp_students", JSON.stringify(updatedStudents));

      // Update session in settings
      try {
        const settings = JSON.parse(
          localStorage.getItem("erp_settings") || "{}",
        );
        settings.session = newSession;
        localStorage.setItem("erp_settings", JSON.stringify(settings));
      } catch {
        localStorage.setItem(
          "erp_settings",
          JSON.stringify({ session: newSession }),
        );
      }

      setPromotionResult({
        promoted: promotedCount,
        passedOut: passedOutCount,
        duesCarried: duesCarriedCount,
      });
      setStep(4);
      toast.success("Students promoted successfully!");
    } catch (err) {
      toast.error("Promotion failed. Please try again.");
      console.error(err);
    }
  };

  const stepLabels = ["Session Setup", "Class Selection", "Review", "Done"];

  return (
    <div>
      <h2 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
        <GraduationCap size={20} className="text-green-400" />
        Promote Students
      </h2>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-6">
        {stepLabels.map((label, idx) => {
          const stepNum = (idx + 1) as Step;
          const isActive = step === stepNum;
          const isDone = step > stepNum;
          return (
            <div key={label} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    isDone
                      ? "bg-green-600 border-green-600 text-white"
                      : isActive
                        ? "bg-blue-600 border-blue-400 text-white"
                        : "bg-gray-800 border-gray-600 text-gray-500"
                  }`}
                >
                  {isDone ? <CheckCircle size={14} /> : stepNum}
                </div>
                <span
                  className={`text-xs font-medium ${
                    isActive
                      ? "text-blue-300"
                      : isDone
                        ? "text-green-400"
                        : "text-gray-500"
                  }`}
                >
                  {label}
                </span>
              </div>
              {idx < stepLabels.length - 1 && (
                <ChevronRight size={16} className="text-gray-600 mx-2" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div
          className="rounded-xl p-6 max-w-lg"
          style={{ background: "#1a1f2e", border: "1px solid #374151" }}
        >
          <h3 className="text-white font-semibold mb-1">Session Setup</h3>
          <p className="text-gray-400 text-xs mb-5">
            This will move all selected students to the next class and create a
            new session archive.
          </p>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="current-session-display"
                className="text-gray-400 text-xs block mb-1"
              >
                Current Session
              </label>
              <div
                id="current-session-display"
                className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-yellow-300 text-sm font-semibold"
              >
                {currentSession}
              </div>
            </div>
            <div>
              <label
                htmlFor="new-session"
                className="text-gray-400 text-xs block mb-1"
              >
                New Session Label
              </label>
              <input
                id="new-session"
                value={newSession}
                onChange={(e) => setNewSession(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm outline-none focus:border-blue-400"
                placeholder="e.g. 2026-27"
                data-ocid="promote.new_session.input"
              />
            </div>
            <div
              className="rounded-lg p-3"
              style={{ background: "#0f1117", border: "1px solid #1f2937" }}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle
                  size={13}
                  className="text-yellow-400 mt-0.5 flex-shrink-0"
                />
                <p className="text-yellow-300 text-xs">
                  Current session data ({currentSession}) will be archived.
                  Students will move to the next class. Dues will carry forward
                  as Old Balance.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!newSession.trim()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              data-ocid="promote.step1.primary_button"
            >
              Next <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div
          className="rounded-xl p-6"
          style={{ background: "#1a1f2e", border: "1px solid #374151" }}
        >
          <h3 className="text-white font-semibold mb-1">Class Selection</h3>
          <p className="text-gray-400 text-xs mb-4">
            Select which classes to include in this promotion batch.
          </p>

          {classSections.length === 0 ? (
            <div
              className="text-center py-8 text-gray-500 text-sm"
              data-ocid="promote.classes.empty_state"
            >
              No active students found. Please add students in Student
              Information first.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3">
                <label className="flex items-center gap-2 text-gray-300 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSections.size === classSections.length}
                    onChange={(e) => toggleAll(e.target.checked)}
                    className="accent-blue-500"
                    data-ocid="promote.select_all.checkbox"
                  />
                  Select All
                </label>
                <span className="text-gray-500 text-xs">
                  {selectedSections.size} of {classSections.length} sections
                  selected
                </span>
              </div>

              <div className="rounded-lg overflow-hidden border border-gray-700">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "#0d111c" }}>
                      <th className="px-3 py-2 text-left text-gray-400 w-8">
                        {" "}
                      </th>
                      <th className="px-3 py-2 text-left text-gray-400">
                        Class
                      </th>
                      <th className="px-3 py-2 text-left text-gray-400">
                        Section
                      </th>
                      <th className="px-3 py-2 text-left text-gray-400">
                        Class Teacher
                      </th>
                      <th className="px-3 py-2 text-right text-gray-400">
                        Students
                      </th>
                      <th className="px-3 py-2 text-left text-gray-400">
                        Promotes To
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {classSections.map((cs, i) => {
                      const parts = cs.split("-");
                      const section = parts[parts.length - 1];
                      const className = parts.slice(0, -1).join("-");
                      const ct = classTeachers.find(
                        (t) => t.classSection === cs,
                      );
                      const count = (classGroups[cs] || []).length;
                      const nextClass = getNextClass(className);
                      const isPassOut = nextClass === "PASSED_OUT";
                      return (
                        <tr
                          key={cs}
                          style={{
                            background: i % 2 === 0 ? "#111827" : "#0d111c",
                          }}
                          data-ocid={`promote.class.item.${i + 1}`}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedSections.has(cs)}
                              onChange={() => toggleSection(cs)}
                              className="accent-blue-500"
                              data-ocid={`promote.class.checkbox.${i + 1}`}
                            />
                          </td>
                          <td className="px-3 py-2 text-white font-medium">
                            {className}
                          </td>
                          <td className="px-3 py-2">
                            <span className="bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded text-[10px]">
                              {section}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-300">
                            {ct ? (
                              ct.teacherName
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-white font-semibold">
                            {count}
                          </td>
                          <td className="px-3 py-2">
                            {isPassOut ? (
                              <span className="text-green-400 font-medium">
                                🎓 Passed Out
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-gray-300">
                                {nextClass}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div
                className="mt-3 rounded-lg px-4 py-3"
                style={{ background: "#0d111c", border: "1px solid #1f2937" }}
              >
                <p className="text-gray-300 text-xs">
                  <span className="text-white font-semibold">
                    {selectedStudents.length}
                  </span>{" "}
                  students across{" "}
                  <span className="text-white font-semibold">
                    {selectedSections.size}
                  </span>{" "}
                  sections selected for promotion
                </p>
              </div>
            </>
          )}

          <div className="mt-5 flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded bg-gray-800 hover:bg-gray-700"
              data-ocid="promote.step2.cancel_button"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={selectedSections.size === 0}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2 rounded font-medium disabled:opacity-50"
              data-ocid="promote.step2.primary_button"
            >
              Next <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div
          className="rounded-xl p-6"
          style={{ background: "#1a1f2e", border: "1px solid #374151" }}
        >
          <h3 className="text-white font-semibold mb-1">Review Promotion</h3>
          <p className="text-gray-400 text-xs mb-4">
            Review the promotion details before confirming. This action cannot
            be undone.
          </p>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              {
                label: "Total Students",
                value: selectedStudents.length,
                color: "#3b82f6",
                bg: "#1e3a5f",
              },
              {
                label: "Passing Out (Cl.10)",
                value: passOutCount,
                color: "#22c55e",
                bg: "#14532d",
              },
              {
                label: "With Dues",
                value: studentsWithDues,
                color: "#f87171",
                bg: "#450a0a",
              },
              {
                label: "Total Dues",
                value: `₹${totalDues.toLocaleString("en-IN")}`,
                color: "#fbbf24",
                bg: "#451a03",
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-lg px-4 py-3 text-center"
                style={{
                  background: card.bg,
                  border: `1px solid ${card.color}30`,
                }}
              >
                <div
                  className="text-xl font-bold mb-1"
                  style={{ color: card.color }}
                >
                  {card.value}
                </div>
                <div className="text-gray-400 text-[10px]">{card.label}</div>
              </div>
            ))}
          </div>

          {/* Students Table */}
          <div
            className="rounded-lg overflow-hidden border border-gray-700 mb-5"
            style={{ maxHeight: 360, overflowY: "auto" }}
          >
            <table className="w-full text-xs">
              <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr style={{ background: "#0d111c" }}>
                  <th className="px-3 py-2 text-left text-gray-400">#</th>
                  <th className="px-3 py-2 text-left text-gray-400">Adm No.</th>
                  <th className="px-3 py-2 text-left text-gray-400">Name</th>
                  <th className="px-3 py-2 text-left text-gray-400">
                    Current Class
                  </th>
                  <th className="px-3 py-2 text-left text-gray-400">
                    Next Class
                  </th>
                  <th className="px-3 py-2 text-right text-gray-400">Dues</th>
                </tr>
              </thead>
              <tbody>
                {selectedStudents.map((s, i) => {
                  const nextClass = getNextClass(s.className);
                  const isPassOut = nextClass === "PASSED_OUT";
                  const dues = getStudentDues(s.admNo);
                  return (
                    <tr
                      key={s.admNo}
                      style={{
                        background: i % 2 === 0 ? "#111827" : "#0d111c",
                      }}
                      data-ocid={`promote.review.item.${i + 1}`}
                    >
                      <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2 text-blue-400 font-mono">
                        {s.admNo}
                      </td>
                      <td className="px-3 py-2 text-white">{s.name}</td>
                      <td className="px-3 py-2 text-gray-300">
                        {s.className} - {s.section}
                      </td>
                      <td className="px-3 py-2">
                        {isPassOut ? (
                          <span className="text-green-400 font-semibold">
                            🎓 Passed Out
                          </span>
                        ) : (
                          <span className="text-white">{nextClass}</span>
                        )}
                      </td>
                      <td
                        className="px-3 py-2 text-right font-semibold"
                        style={{ color: dues > 0 ? "#f87171" : "#6b7280" }}
                      >
                        {dues > 0 ? `₹${dues.toLocaleString("en-IN")}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div
            className="rounded-lg p-3 mb-5"
            style={{ background: "#450a0a", border: "1px solid #7f1d1d" }}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle
                size={13}
                className="text-red-400 mt-0.5 flex-shrink-0"
              />
              <p className="text-red-200 text-xs">
                <strong>Warning:</strong> This action will permanently move
                students to their next class, archive the current session, and
                update all dues as old balance. Class 10 students will be marked
                as Passed Out. This cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded bg-gray-800 hover:bg-gray-700"
              data-ocid="promote.step3.cancel_button"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleConfirmPromotion}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm px-5 py-2 rounded font-semibold"
              data-ocid="promote.confirm.primary_button"
            >
              <CheckCircle size={14} />
              Confirm &amp; Promote
            </button>
          </div>
        </div>
      )}

      {/* Step 4 */}
      {step === 4 && promotionResult && (
        <div
          className="rounded-xl p-8 max-w-lg text-center"
          style={{ background: "#1a1f2e", border: "1px solid #374151" }}
        >
          <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <h3 className="text-white text-xl font-bold mb-2">
            Promotion Complete!
          </h3>
          <p className="text-gray-400 text-sm mb-6">
            Session{" "}
            <span className="text-yellow-300 font-semibold">
              {currentSession}
            </span>{" "}
            has been archived and students are now in session{" "}
            <span className="text-green-400 font-semibold">{newSession}</span>.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div
              className="rounded-lg px-3 py-3"
              style={{ background: "#1e3a5f", border: "1px solid #3b82f6" }}
            >
              <div className="text-2xl font-bold text-blue-400">
                {promotionResult.promoted}
              </div>
              <div className="text-gray-400 text-[10px] mt-1">Promoted</div>
            </div>
            <div
              className="rounded-lg px-3 py-3"
              style={{ background: "#14532d", border: "1px solid #22c55e" }}
            >
              <div className="text-2xl font-bold text-green-400">
                {promotionResult.passedOut}
              </div>
              <div className="text-gray-400 text-[10px] mt-1">Passed Out</div>
            </div>
            <div
              className="rounded-lg px-3 py-3"
              style={{ background: "#451a03", border: "1px solid #fbbf24" }}
            >
              <div className="text-2xl font-bold text-yellow-400">
                {promotionResult.duesCarried}
              </div>
              <div className="text-gray-400 text-[10px] mt-1">Dues Carried</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              window.location.hash = "/students";
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-6 py-2.5 rounded font-medium mx-auto"
            data-ocid="promote.done.primary_button"
          >
            <Users size={14} />
            View Students
          </button>
        </div>
      )}
    </div>
  );
}
