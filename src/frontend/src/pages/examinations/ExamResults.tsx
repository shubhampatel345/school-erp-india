/**
 * ExamResults — Direct API rebuild (cPanel/MySQL)
 * All data via phpApiService. No getData()/ls.
 * Features:
 * - List/create result sheets by exam/class
 * - Enter marks per student per subject (inline grid)
 * - Grade calculation (A+/A/B+/B/C/D/F)
 * - Export to Excel
 * - Print marksheet using active template from ResultDesigner
 * - Bulk WhatsApp broadcast of results
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Progress } from "../../components/ui/progress";
import { CLASSES, SECTIONS, generateId } from "../../utils/localStorage";
import { phpApiService } from "../../utils/phpApiService";
import { getWhatsAppSettings, sendWhatsApp } from "../../utils/whatsapp";
import ResultTemplateDesigner from "./ResultTemplateDesigner";
import type { ResultTemplate } from "./ResultTemplateDesigner";

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

interface SavedTimetable {
  id: string;
  examName: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  tables: Array<{
    classKey: string;
    rows: Array<{ date: string; day: string; subject: string }>;
  }>;
  sessionId: string;
  savedAt: string;
}

interface StudentRecord {
  id: string;
  admNo: string;
  fullName: string;
  class: string;
  section: string;
  guardianMobile?: string;
  fatherMobile?: string;
  [key: string]: unknown;
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

function getSchoolName(): string {
  try {
    const p = localStorage.getItem("school_profile");
    if (p)
      return (JSON.parse(p) as { name?: string }).name ?? "SHUBH SCHOOL ERP";
  } catch {
    /* noop */
  }
  return "SHUBH SCHOOL ERP";
}

function buildResultMessage(
  result: StudentResult,
  examName: string,
  schoolName: string,
): string {
  const total = result.subjects.reduce((s, r) => s + r.marksObtained, 0);
  const maxTotal = result.subjects.reduce((s, r) => s + r.maxMarks, 0);
  const pct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
  const grade = calcGrade(pct);
  const subjectLines = result.subjects
    .map((s) => {
      const sp =
        s.maxMarks > 0 ? Math.round((s.marksObtained / s.maxMarks) * 100) : 0;
      return `  ${s.subject.padEnd(14, " ")} ${String(s.marksObtained).padStart(3)}/${s.maxMarks}  ${calcGrade(sp)}`;
    })
    .join("\n");
  return `📊 *Result Card - ${schoolName}*\n\nDear Parent,\n\n*${result.studentName}* | Adm No: ${result.admNo}\n*Exam:* ${examName}\n\n${"─".repeat(34)}\n*Subject*       *Marks*  *Grade*\n${"─".repeat(34)}\n${subjectLines}\n${"─".repeat(34)}\n*Total:* ${total}/${maxTotal}  *Overall:* ${grade}  *%:* ${pct}%\n*Result:* ${pct >= 40 ? "✅ PASS" : "❌ FAIL"}\n\n${schoolName}`;
}

function exportToExcel(group: ExamResultGroup) {
  const headers = [
    "Student",
    "Adm. No.",
    ...group.subjects,
    "Total",
    "%",
    "Grade",
    "Result",
  ];
  const rows = group.studentResults.map((r) => {
    const total = r.subjects.reduce((s, sub) => s + sub.marksObtained, 0);
    const maxTotal = r.subjects.reduce((s, sub) => s + sub.maxMarks, 0);
    const pct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
    return [
      r.studentName,
      r.admNo,
      ...r.subjects.map((s) => s.marksObtained),
      `${total}/${maxTotal}`,
      `${pct}%`,
      calcGrade(pct),
      pct >= 40 ? "PASS" : "FAIL",
    ];
  });
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${c}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${group.examName}_${group.classKey}_results.csv`.replace(
    /\s+/g,
    "_",
  );
  a.click();
  URL.revokeObjectURL(url);
}

// ── WhatsApp Sender Dialog ────────────────────────────────────────────────────

function SendResultsDialog({
  group,
  allStudents,
  onClose,
}: {
  group: ExamResultGroup;
  allStudents: StudentRecord[];
  onClose: () => void;
}) {
  const schoolName = getSchoolName();
  const waSettings = getWhatsAppSettings();
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const abortRef = useRef(false);

  const studentMap = new Map(allStudents.map((s) => [s.id, s]));
  const withPhone = group.studentResults.filter((r) => {
    const s = studentMap.get(r.studentId);
    return s && (s.guardianMobile || s.fatherMobile);
  });

  if (!waSettings.enabled) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      >
        <div
          className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-elevated"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={() => {}}
        >
          <h3 className="font-semibold text-lg mb-3">
            WhatsApp Not Configured
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Go to <strong>Settings → Communication → WhatsApp</strong> to
            configure your API key.
          </p>
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    );
  }

  const handleSend = async () => {
    setSending(true);
    abortRef.current = false;
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < withPhone.length; i++) {
      if (abortRef.current) break;
      const r = withPhone[i];
      const s = studentMap.get(r.studentId);
      if (!s) {
        setDone(i + 1);
        continue;
      }
      const phone = String(s.guardianMobile || s.fatherMobile || "");
      const res = await sendWhatsApp(
        phone,
        buildResultMessage(r, group.examName, schoolName),
      );
      if (res.success) sent++;
      else failed++;
      setSentCount(sent);
      setFailedCount(failed);
      setDone(i + 1);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    setSending(false);
    setFinished(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={!sending ? onClose : undefined}
      onKeyDown={(e) => e.key === "Escape" && !sending && onClose()}
    >
      <div
        className="bg-card border border-border rounded-xl w-full max-w-md shadow-elevated"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
      >
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-base">Send Results via WhatsApp</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {group.examName} — {group.classKey}
          </p>
        </div>
        <div className="p-5 space-y-4">
          {!sending && !finished && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/40 border border-border text-center">
                  <p className="text-2xl font-bold">
                    {group.studentResults.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total Students
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {withPhone.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Have Phone No.
                  </p>
                </div>
              </div>
            </div>
          )}
          {sending && (
            <div className="space-y-3" data-ocid="result-wa-send.loading_state">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>
                  Sending {done} of {withPhone.length}…
                </span>
                <button
                  type="button"
                  onClick={() => {
                    abortRef.current = true;
                  }}
                  className="text-xs text-destructive hover:underline"
                >
                  Cancel
                </button>
              </div>
              <Progress
                value={
                  withPhone.length > 0
                    ? Math.round((done / withPhone.length) * 100)
                    : 0
                }
                className="h-2"
              />
              <div className="flex gap-3 text-xs">
                <span className="text-green-600">✓ Sent: {sentCount}</span>
                <span className="text-destructive">
                  ✗ Failed: {failedCount}
                </span>
              </div>
            </div>
          )}
          {finished && (
            <div
              className="space-y-3 text-center"
              data-ocid="result-wa-send.success_state"
            >
              <div className="text-3xl">📱</div>
              <p className="font-semibold">Broadcast Complete</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-xl font-bold text-green-600">
                    {sentCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Sent</p>
                </div>
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-xl font-bold text-destructive">
                    {failedCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={sending}
            data-ocid="result-wa-send.cancel_button"
          >
            {finished ? "Close" : "Cancel"}
          </Button>
          {!finished && (
            <Button
              onClick={handleSend}
              disabled={sending || withPhone.length === 0}
              data-ocid="result-wa-send.confirm_button"
            >
              {sending ? "Sending…" : `Send to ${withPhone.length} Parents`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Print Marksheet Dialog ────────────────────────────────────────────────────

function PrintMarksheetDialog({
  result,
  examName,
  group,
  template,
  onClose,
}: {
  result: StudentResult | "all";
  examName: string;
  group: ExamResultGroup;
  template: ResultTemplate | null;
  onClose: () => void;
}) {
  const school = getSchoolName();
  const [watermark, setWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState("OFFICIAL COPY");
  const [stamp, setStamp] = useState(false);
  const results = result === "all" ? group.studentResults : [result];

  return (
    <>
      <style>{`
        @media print {
          body > *:not(#print-marksheet-root) { display: none !important; }
          #print-marksheet-root { display: block !important; }
          .print-page { page-break-after: always; }
          .print-page:last-child { page-break-after: avoid; }
          .no-print { display: none !important; }
        }
        @media screen { #print-marksheet-root { display: none; } }
      `}</style>
      <div id="print-marksheet-root">
        {results.map((r) => {
          const total = r.subjects.reduce((s, sub) => s + sub.marksObtained, 0);
          const maxTotal = r.subjects.reduce((s, sub) => s + sub.maxMarks, 0);
          const pct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
          const grade = calcGrade(pct);
          return (
            <div
              key={r.studentId}
              className="print-page"
              style={{
                width: "210mm",
                minHeight: "297mm",
                position: "relative",
                padding: "15mm",
                fontFamily: "serif",
                background: "#fff",
                color: "#000",
              }}
            >
              {template?.backgroundImage && (
                <img
                  src={template.backgroundImage}
                  alt=""
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: 0.15,
                    zIndex: 0,
                  }}
                />
              )}
              {watermark && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1,
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      fontSize: "72px",
                      fontWeight: "bold",
                      color: "rgba(0,0,0,0.07)",
                      transform: "rotate(-30deg)",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                      userSelect: "none",
                    }}
                  >
                    {watermarkText || "OFFICIAL COPY"}
                  </div>
                </div>
              )}
              <div style={{ position: "relative", zIndex: 2 }}>
                {template && template.fields.length > 0 ? (
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      minHeight: "267mm",
                    }}
                  >
                    {template.fields.map((f) => {
                      let content = f.label;
                      if (f.type === "studentName") content = r.studentName;
                      else if (f.type === "admNo") content = r.admNo;
                      else if (f.type === "examName") content = examName;
                      else if (f.type === "schoolName") content = school;
                      else if (f.type === "totalMarks")
                        content = `${total}/${maxTotal}`;
                      else if (f.type === "percentage") content = `${pct}%`;
                      else if (f.type === "grade") content = grade;
                      else if (f.type === "result")
                        content = pct >= 40 ? "PASS" : "FAIL";
                      else if (f.type === "date")
                        content = new Date().toLocaleDateString("en-IN");
                      else if (f.type === "subjectMarks") {
                        return (
                          <div
                            key={f.id}
                            style={{
                              position: "absolute",
                              left: `${f.x}%`,
                              top: `${f.y}%`,
                              fontSize: `${f.fontSize}px`,
                              color: f.color,
                              fontWeight: f.bold ? "bold" : "normal",
                              fontStyle: f.italic ? "italic" : "normal",
                            }}
                          >
                            <table
                              style={{
                                borderCollapse: "collapse",
                                minWidth: "240px",
                              }}
                            >
                              <thead>
                                <tr style={{ borderBottom: "1px solid #333" }}>
                                  {["Subject", "Max", "Obtained", "Grade"].map(
                                    (h) => (
                                      <th
                                        key={h}
                                        style={{
                                          textAlign:
                                            h === "Subject" ? "left" : "center",
                                          padding: "2px 8px",
                                          fontSize: "inherit",
                                        }}
                                      >
                                        {h}
                                      </th>
                                    ),
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {r.subjects.map((s) => {
                                  const sp =
                                    s.maxMarks > 0
                                      ? Math.round(
                                          (s.marksObtained / s.maxMarks) * 100,
                                        )
                                      : 0;
                                  return (
                                    <tr
                                      key={s.subject}
                                      style={{ borderBottom: "1px solid #ddd" }}
                                    >
                                      <td
                                        style={{
                                          padding: "2px 8px 2px 0",
                                          fontSize: "inherit",
                                        }}
                                      >
                                        {s.subject}
                                      </td>
                                      <td
                                        style={{
                                          padding: "2px 8px",
                                          textAlign: "center",
                                          fontSize: "inherit",
                                        }}
                                      >
                                        {s.maxMarks}
                                      </td>
                                      <td
                                        style={{
                                          padding: "2px 8px",
                                          textAlign: "center",
                                          fontSize: "inherit",
                                        }}
                                      >
                                        {s.marksObtained}
                                      </td>
                                      <td
                                        style={{
                                          padding: "2px 8px",
                                          textAlign: "center",
                                          fontSize: "inherit",
                                        }}
                                      >
                                        {calcGrade(sp)}
                                      </td>
                                    </tr>
                                  );
                                })}
                                <tr
                                  style={{
                                    borderTop: "2px solid #333",
                                    fontWeight: "bold",
                                  }}
                                >
                                  <td style={{ padding: "2px 8px 2px 0" }}>
                                    TOTAL
                                  </td>
                                  <td
                                    style={{
                                      padding: "2px 8px",
                                      textAlign: "center",
                                    }}
                                  >
                                    {maxTotal}
                                  </td>
                                  <td
                                    style={{
                                      padding: "2px 8px",
                                      textAlign: "center",
                                    }}
                                  >
                                    {total}
                                  </td>
                                  <td
                                    style={{
                                      padding: "2px 8px",
                                      textAlign: "center",
                                    }}
                                  >
                                    {grade}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={f.id}
                          style={{
                            position: "absolute",
                            left: `${f.x}%`,
                            top: `${f.y}%`,
                            fontSize: `${f.fontSize}px`,
                            fontWeight: f.bold ? "bold" : "normal",
                            fontStyle: f.italic ? "italic" : "normal",
                            color: f.color,
                            textAlign: f.align,
                          }}
                        >
                          {content}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        textAlign: "center",
                        borderBottom: "2px solid #333",
                        paddingBottom: "10px",
                        marginBottom: "16px",
                      }}
                    >
                      <h1
                        style={{
                          fontSize: "22px",
                          fontWeight: "bold",
                          margin: 0,
                        }}
                      >
                        {school}
                      </h1>
                      <h2
                        style={{
                          fontSize: "16px",
                          fontWeight: "600",
                          marginTop: "8px",
                        }}
                      >
                        MARKSHEET — {examName}
                      </h2>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "6px",
                        fontSize: "13px",
                        marginBottom: "16px",
                        background: "#f5f5f5",
                        padding: "10px",
                        borderRadius: "6px",
                      }}
                    >
                      <div>
                        <strong>Student:</strong> {r.studentName}
                      </div>
                      <div>
                        <strong>Adm. No.:</strong> {r.admNo}
                      </div>
                      <div>
                        <strong>Class:</strong> {group.classKey}
                      </div>
                      <div>
                        <strong>Date:</strong>{" "}
                        {new Date().toLocaleDateString("en-IN")}
                      </div>
                    </div>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "13px",
                        marginBottom: "16px",
                      }}
                    >
                      <thead>
                        <tr style={{ background: "#eee" }}>
                          {[
                            "Subject",
                            "Max Marks",
                            "Obtained",
                            "%",
                            "Grade",
                          ].map((h) => (
                            <th
                              key={h}
                              style={{
                                border: "1px solid #ccc",
                                padding: "6px 8px",
                                textAlign: h === "Subject" ? "left" : "center",
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {r.subjects.map((s) => {
                          const sp =
                            s.maxMarks > 0
                              ? Math.round((s.marksObtained / s.maxMarks) * 100)
                              : 0;
                          return (
                            <tr key={s.subject}>
                              <td
                                style={{
                                  border: "1px solid #ccc",
                                  padding: "5px 8px",
                                }}
                              >
                                {s.subject}
                              </td>
                              <td
                                style={{
                                  border: "1px solid #ccc",
                                  padding: "5px 8px",
                                  textAlign: "center",
                                }}
                              >
                                {s.maxMarks}
                              </td>
                              <td
                                style={{
                                  border: "1px solid #ccc",
                                  padding: "5px 8px",
                                  textAlign: "center",
                                  fontWeight: "bold",
                                }}
                              >
                                {s.marksObtained}
                              </td>
                              <td
                                style={{
                                  border: "1px solid #ccc",
                                  padding: "5px 8px",
                                  textAlign: "center",
                                }}
                              >
                                {sp}%
                              </td>
                              <td
                                style={{
                                  border: "1px solid #ccc",
                                  padding: "5px 8px",
                                  textAlign: "center",
                                  fontWeight: "bold",
                                }}
                              >
                                {calcGrade(sp)}
                              </td>
                            </tr>
                          );
                        })}
                        <tr
                          style={{ fontWeight: "bold", background: "#f5f5f5" }}
                        >
                          <td
                            style={{
                              border: "1px solid #ccc",
                              padding: "5px 8px",
                            }}
                          >
                            TOTAL
                          </td>
                          <td
                            style={{
                              border: "1px solid #ccc",
                              padding: "5px 8px",
                              textAlign: "center",
                            }}
                          >
                            {maxTotal}
                          </td>
                          <td
                            style={{
                              border: "1px solid #ccc",
                              padding: "5px 8px",
                              textAlign: "center",
                            }}
                          >
                            {total}
                          </td>
                          <td
                            style={{
                              border: "1px solid #ccc",
                              padding: "5px 8px",
                              textAlign: "center",
                            }}
                          >
                            {pct}%
                          </td>
                          <td
                            style={{
                              border: "1px solid #ccc",
                              padding: "5px 8px",
                              textAlign: "center",
                            }}
                          >
                            {grade}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        borderTop: "1px solid #ccc",
                        paddingTop: "10px",
                        fontSize: "13px",
                      }}
                    >
                      <div>
                        <strong>Result:</strong>{" "}
                        {pct >= 40 ? "PASS ✓" : "FAIL ✗"} &nbsp;{" "}
                        <strong>Overall Grade:</strong> {grade}
                      </div>
                      <div>Principal Signature: ___________</div>
                    </div>
                  </>
                )}
                {stamp && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "10mm",
                      right: "10mm",
                      zIndex: 3,
                    }}
                  >
                    <div
                      style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "50%",
                        border: "3px double #1a3a6b",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        padding: "6px",
                        backgroundColor: "rgba(255,255,255,0.85)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "7px",
                          fontWeight: "bold",
                          color: "#1a3a6b",
                          lineHeight: "1.2",
                          wordBreak: "break-word",
                          textTransform: "uppercase",
                        }}
                      >
                        {school}
                      </span>
                      <div
                        style={{
                          width: "50px",
                          height: "1px",
                          background: "#1a3a6b",
                          margin: "3px 0",
                        }}
                      />
                      <span style={{ fontSize: "6px", color: "#1a3a6b" }}>
                        OFFICIAL
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div
        className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 no-print"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      >
        <div
          className="bg-card border border-border rounded-xl w-full max-w-md shadow-elevated"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={() => {}}
          data-ocid="print-marksheet.dialog"
        >
          <div className="p-5 border-b border-border">
            <h3 className="font-semibold text-base">Print Marksheet</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {result === "all"
                ? `All ${group.studentResults.length} students`
                : (result as StudentResult).studentName}{" "}
              — {examName}
            </p>
          </div>
          <div className="p-5 space-y-4">
            <div
              className={`flex items-center gap-2 p-3 rounded-lg text-sm ${template ? "bg-primary/5 border border-primary/20" : "bg-muted/40 border border-border"}`}
            >
              <span className="text-lg">{template ? "🎨" : "📋"}</span>
              <div>
                <p className="font-medium text-xs">
                  {template ? `Template: ${template.name}` : "Default Layout"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {template
                    ? "Custom template will be applied"
                    : "Standard table layout"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              <input
                type="checkbox"
                id="watermark-toggle"
                checked={watermark}
                onChange={(e) => setWatermark(e.target.checked)}
                className="mt-0.5"
                data-ocid="print.watermark.toggle"
              />
              <div className="flex-1">
                <label
                  htmlFor="watermark-toggle"
                  className="text-sm font-medium cursor-pointer"
                >
                  Add Watermark
                </label>
                <p className="text-xs text-muted-foreground">
                  Diagonal faint text across result sheet
                </p>
                {watermark && (
                  <Input
                    className="mt-2 h-8 text-sm"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="Watermark text"
                    data-ocid="print.watermark-text.input"
                  />
                )}
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              <input
                type="checkbox"
                id="stamp-toggle"
                checked={stamp}
                onChange={(e) => setStamp(e.target.checked)}
                className="mt-0.5"
                data-ocid="print.stamp.toggle"
              />
              <div>
                <label
                  htmlFor="stamp-toggle"
                  className="text-sm font-medium cursor-pointer"
                >
                  Add School Stamp
                </label>
                <p className="text-xs text-muted-foreground">
                  Circular stamp in bottom-right corner
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 px-5 pb-5 border-t border-border pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              data-ocid="print-marksheet.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={() => window.print()}
              data-ocid="print-marksheet.print_button"
            >
              🖨️ Print
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Marks Entry Table ─────────────────────────────────────────────────────────

function MarksEntryTable({
  group,
  onSave,
  onClose,
}: {
  group: ExamResultGroup;
  onSave: (updated: ExamResultGroup) => void;
  onClose: () => void;
}) {
  const [results, setResults] = useState<StudentResult[]>(group.studentResults);

  const updateMark = (si: number, sj: number, value: string) => {
    const num = Math.min(
      group.maxMarks,
      Math.max(0, Number(value.replace(/[^0-9]/g, "")) || 0),
    );
    setResults((prev) =>
      prev.map((r, rsi) =>
        rsi === si
          ? {
              ...r,
              subjects: r.subjects.map((s, rsj) =>
                rsj === sj ? { ...s, marksObtained: num } : s,
              ),
            }
          : r,
      ),
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-elevated">
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Marks Entry — {group.examName}</h2>
            <p className="text-xs text-muted-foreground">
              {group.classKey} · Max marks: {group.maxMarks} per subject
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="overflow-auto flex-1 p-5">
          <table className="w-full text-sm min-w-max border-collapse">
            <thead className="sticky top-0">
              <tr className="bg-muted/50">
                <th className="px-3 py-2.5 text-left font-semibold border border-border bg-muted/50 sticky left-0 z-10 min-w-40">
                  Student
                </th>
                <th className="px-3 py-2.5 text-left font-semibold border border-border bg-muted/50 w-24">
                  Adm. No.
                </th>
                {group.subjects.map((subj) => (
                  <th
                    key={subj}
                    className="px-3 py-2.5 text-center font-semibold border border-border bg-muted/50 min-w-28 whitespace-nowrap"
                  >
                    {subj}
                    <span className="block text-xs font-normal text-muted-foreground">
                      /{group.maxMarks}
                    </span>
                  </th>
                ))}
                <th className="px-3 py-2.5 text-center font-semibold border border-border bg-muted/50 w-20">
                  Total
                </th>
                <th className="px-3 py-2.5 text-center font-semibold border border-border bg-muted/50 w-16">
                  %
                </th>
                <th className="px-3 py-2.5 text-center font-semibold border border-border bg-muted/50 w-16">
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
                return (
                  <tr
                    key={r.studentId}
                    className={`border-b border-border ${si % 2 === 0 ? "bg-background" : "bg-muted/10"}`}
                  >
                    <td className="px-3 py-2 font-medium border border-border sticky left-0 bg-inherit">
                      {r.studentName}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground text-xs border border-border font-mono">
                      {r.admNo}
                    </td>
                    {r.subjects.map((s, sj) => (
                      <td
                        key={s.subject}
                        className="px-2 py-1 border border-border"
                      >
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={s.marksObtained}
                          onChange={(e) => updateMark(si, sj, e.target.value)}
                          className="h-8 text-center w-full min-w-16"
                          data-ocid={`marks-${si}-${sj}`}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-mono font-semibold border border-border">
                      {total}/{maxTotal}
                    </td>
                    <td className="px-3 py-2 text-center font-semibold border border-border">
                      {pct}%
                    </td>
                    <td className="px-3 py-2 text-center border border-border">
                      <Badge
                        className={`${gradeBadgeClass(calcGrade(pct))} text-xs`}
                      >
                        {calcGrade(pct)}
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
          <Button
            onClick={() => onSave({ ...group, studentResults: results })}
            data-ocid="marks-save"
          >
            Save Marks
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ExamResults() {
  const [activeSubTab, setActiveSubTab] = useState<"results" | "designer">(
    "results",
  );
  const [groups, setGroups] = useState<ExamResultGroup[]>([]);
  const [savedTimetables, setSavedTimetables] = useState<SavedTimetable[]>([]);
  const [allStudents, setAllStudents] = useState<StudentRecord[]>([]);
  const [savedTemplate, setSavedTemplate] = useState<ResultTemplate | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const [filterExam, setFilterExam] = useState("all");
  const [filterClass, setFilterClass] = useState("all");
  const [search, setSearch] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [editGroup, setEditGroup] = useState<ExamResultGroup | null>(null);
  const [printTarget, setPrintTarget] = useState<{
    result: StudentResult | "all";
    group: ExamResultGroup;
  } | null>(null);
  const [waTarget, setWaTarget] = useState<ExamResultGroup | null>(null);

  const [newExamId, setNewExamId] = useState("");
  const [newClassKey, setNewClassKey] = useState("");
  const [newMaxMarks, setNewMaxMarks] = useState(100);
  const [newSubjects, setNewSubjects] = useState<string[]>([]);

  // Load all data from server
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [timetableRes, groupsRes, studentRes] = await Promise.all([
        phpApiService
          .get<Record<string, unknown>[]>("exams/timetables")
          .catch(() => [] as Record<string, unknown>[]),
        phpApiService
          .get<Record<string, unknown>[]>("exams/result-groups")
          .catch(() => [] as Record<string, unknown>[]),
        phpApiService
          .getStudents({ limit: "500", status: "active" })
          .catch(() => ({ data: [] as StudentRecord[], total: 0 })),
      ]);

      const parseTimetables = (timetableRes as Record<string, unknown>[]).map(
        (r) => ({
          id: String(r.id ?? ""),
          examName: String(r.examName ?? ""),
          startDate: String(r.startDate ?? ""),
          endDate: String(r.endDate ?? ""),
          startTime: String(r.startTime ?? ""),
          endTime: String(r.endTime ?? ""),
          tables: (() => {
            try {
              return JSON.parse(String(r.tablesData ?? r.tables ?? "[]"));
            } catch {
              return [];
            }
          })(),
          sessionId: String(r.sessionId ?? ""),
          savedAt: String(r.savedAt ?? ""),
        }),
      ) as SavedTimetable[];

      // Fallback to localStorage for timetables created in UI
      if (parseTimetables.length === 0) {
        try {
          const local = JSON.parse(
            localStorage.getItem("exam_timetables") ?? "[]",
          ) as SavedTimetable[];
          setSavedTimetables(local);
        } catch {
          setSavedTimetables([]);
        }
      } else {
        setSavedTimetables(parseTimetables);
      }

      const parseGroups = (groupsRes as Record<string, unknown>[]).map((r) => ({
        id: String(r.id ?? ""),
        examName: String(r.examName ?? ""),
        classKey: String(r.classKey ?? ""),
        subjects: (() => {
          try {
            return JSON.parse(String(r.subjects ?? "[]")) as string[];
          } catch {
            return [];
          }
        })(),
        maxMarks: Number(r.maxMarks ?? 100),
        studentResults: (() => {
          try {
            return JSON.parse(
              String(r.studentResultsData ?? r.studentResults ?? "[]"),
            ) as StudentResult[];
          } catch {
            return [];
          }
        })(),
        sessionId: String(r.sessionId ?? ""),
        savedAt: String(r.savedAt ?? ""),
      })) as ExamResultGroup[];

      if (parseGroups.length === 0) {
        try {
          const local = JSON.parse(
            localStorage.getItem("exam_result_groups") ?? "[]",
          ) as ExamResultGroup[];
          setGroups(local);
        } catch {
          setGroups([]);
        }
      } else {
        setGroups(parseGroups);
      }

      setAllStudents((studentRes.data ?? []) as StudentRecord[]);

      // Load saved template
      try {
        const tmplRes = await phpApiService
          .get<Record<string, unknown>[]>(
            "settings/get&key=exam_result_template",
          )
          .catch(() => [] as Record<string, unknown>[]);
        if (Array.isArray(tmplRes) && tmplRes.length > 0 && tmplRes[0]?.value) {
          setSavedTemplate(
            JSON.parse(String(tmplRes[0].value)) as ResultTemplate,
          );
        } else {
          const local = localStorage.getItem("exam_result_template");
          if (local) setSavedTemplate(JSON.parse(local) as ResultTemplate);
        }
      } catch {
        /* noop */
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedTimetable = savedTimetables.find((t) => t.id === newExamId);
  const availableClasses =
    selectedTimetable?.tables.map((t) => t.classKey) ?? [];

  useEffect(() => {
    if (!selectedTimetable || !newClassKey) {
      setNewSubjects([]);
      return;
    }
    const ct = selectedTimetable.tables.find((t) => t.classKey === newClassKey);
    if (ct) setNewSubjects([...new Set(ct.rows.map((r) => r.subject))]);
  }, [selectedTimetable, newClassKey]);

  const studentsForClass = newClassKey
    ? allStudents.filter((s) => {
        const cls = newClassKey.replace("Class ", "").replace(/[A-Z]$/, "");
        const sec = newClassKey.replace("Class ", "").slice(-1);
        return s.class === cls && s.section === sec;
      })
    : [];

  const handleCreateGroup = async () => {
    if (!selectedTimetable || !newClassKey || newSubjects.length === 0) return;
    const cls = newClassKey.replace("Class ", "").replace(/[A-Z]$/, "");
    const sec = newClassKey.replace("Class ", "").slice(-1);

    let classStudents = studentsForClass;
    if (classStudents.length === 0) {
      const res = await phpApiService
        .getStudents({ class: cls, section: sec, limit: "200" })
        .catch(() => ({ data: [] as StudentRecord[], total: 0 }));
      classStudents = (res.data ?? []) as StudentRecord[];
    }

    const newGroup: ExamResultGroup = {
      id: generateId(),
      examName: selectedTimetable.examName,
      classKey: newClassKey,
      subjects: newSubjects,
      maxMarks: newMaxMarks,
      studentResults: classStudents.map((s) => ({
        studentId: s.id,
        studentName: s.fullName,
        admNo: s.admNo,
        subjects: newSubjects.map((subj) => ({
          subject: subj,
          maxMarks: newMaxMarks,
          marksObtained: 0,
        })),
      })),
      sessionId: new Date().getFullYear().toString(),
      savedAt: new Date().toISOString(),
    };

    await phpApiService
      .post("exams/result-groups/add", {
        ...newGroup,
        subjects: JSON.stringify(newGroup.subjects),
        studentResultsData: JSON.stringify(newGroup.studentResults),
      })
      .catch(() => {
        // Fallback: save locally
        const local = JSON.parse(
          localStorage.getItem("exam_result_groups") ?? "[]",
        ) as ExamResultGroup[];
        localStorage.setItem(
          "exam_result_groups",
          JSON.stringify([newGroup, ...local]),
        );
      });

    setGroups((prev) => [newGroup, ...prev]);
    setShowNewForm(false);
    setNewExamId("");
    setNewClassKey("");
    setNewSubjects([]);
    setNewMaxMarks(100);
    setEditGroup(newGroup);
  };

  const handleSaveGroup = async (updated: ExamResultGroup) => {
    await phpApiService
      .post("exams/result-groups/update", {
        ...updated,
        subjects: JSON.stringify(updated.subjects),
        studentResultsData: JSON.stringify(updated.studentResults),
      })
      .catch(() => {
        const local = JSON.parse(
          localStorage.getItem("exam_result_groups") ?? "[]",
        ) as ExamResultGroup[];
        localStorage.setItem(
          "exam_result_groups",
          JSON.stringify(local.map((g) => (g.id === updated.id ? updated : g))),
        );
      });
    setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    setEditGroup(null);
  };

  const handleDeleteGroup = async (id: string) => {
    await phpApiService.post("exams/result-groups/delete", { id }).catch(() => {
      const local = JSON.parse(
        localStorage.getItem("exam_result_groups") ?? "[]",
      ) as ExamResultGroup[];
      localStorage.setItem(
        "exam_result_groups",
        JSON.stringify(local.filter((g) => g.id !== id)),
      );
    });
    setGroups((prev) => prev.filter((g) => g.id !== id));
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

  return (
    <div className="space-y-4">
      {/* Sub-tab */}
      <div
        className="flex gap-1 bg-muted/40 rounded-lg p-1 w-fit"
        role="tablist"
      >
        {(["results", "designer"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeSubTab === tab}
            onClick={() => setActiveSubTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeSubTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            data-ocid={`exam.${tab}.tab`}
          >
            {tab === "results" ? "Result Sheets" : "Template Designer"}
          </button>
        ))}
      </div>

      {activeSubTab === "designer" && <ResultTemplateDesigner />}

      {activeSubTab === "results" && (
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-2" data-ocid="exam.results.loading_state">
              {[1, 2, 3].map((k) => (
                <div
                  key={k}
                  className="h-16 rounded-xl bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : (
            <>
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
                <Button
                  onClick={() => setShowNewForm(true)}
                  data-ocid="result-add"
                >
                  + New Result Sheet
                </Button>
              </div>

              {showNewForm && (
                <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Create Result Sheet</h3>
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
                      <p className="font-medium">No saved timetables</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Create and save an exam timetable first
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <Label>Select Exam</Label>
                        <select
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
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
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
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
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={newMaxMarks}
                          onChange={(e) =>
                            setNewMaxMarks(
                              Number(e.target.value.replace(/[^0-9]/g, "")) ||
                                100,
                            )
                          }
                          data-ocid="new-result-max-marks"
                        />
                      </div>
                      <div className="space-y-1.5 flex flex-col justify-end">
                        <Button
                          onClick={handleCreateGroup}
                          disabled={
                            !newExamId ||
                            !newClassKey ||
                            newSubjects.length === 0
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
                      <Label>Subjects (from timetable)</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {newSubjects.map((s) => (
                          <Badge
                            key={s}
                            variant="secondary"
                            className="px-2.5 py-1"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                      {studentsForClass.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {studentsForClass.length} students found in{" "}
                          {newClassKey}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {filteredGroups.length === 0 ? (
                <div
                  className="bg-card border border-dashed border-border rounded-xl py-16 text-center"
                  data-ocid="result.empty_state"
                >
                  <p className="text-4xl mb-3">📋</p>
                  <p className="font-semibold text-lg">No results yet</p>
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
                        <div className="flex items-center justify-between p-4 border-b border-border/50 flex-wrap gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold">{g.examName}</p>
                              <Badge variant="secondary">{g.classKey}</Badge>
                              <Badge className="bg-muted text-muted-foreground">
                                {g.subjects.length} subjects
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {totalStudents} students · {filledCount} marks
                              entered · Avg: {avgPct}%
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0 flex-wrap justify-end">
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
                              variant="outline"
                              onClick={() => exportToExcel(g)}
                              data-ocid={`result-export-${g.id}`}
                            >
                              Export CSV
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setPrintTarget({ result: "all", group: g })
                              }
                              data-ocid={`result-print-all-${g.id}`}
                            >
                              🖨️ Print All
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-200"
                              onClick={() => setWaTarget(g)}
                              data-ocid={`result-wa-${g.id}`}
                            >
                              📱 WhatsApp
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => void handleDeleteGroup(g.id)}
                              data-ocid={`result-delete-${g.id}`}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
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
                                  .map((r) => {
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
                                    return (
                                      <tr
                                        key={r.studentId}
                                        className="border-t border-border/50 hover:bg-muted/20"
                                      >
                                        <td className="px-4 py-2 font-medium">
                                          {r.studentName}
                                        </td>
                                        <td className="px-4 py-2 text-xs text-muted-foreground font-mono">
                                          {r.admNo}
                                        </td>
                                        {r.subjects.map((s) => (
                                          <td
                                            key={s.subject}
                                            className="px-3 py-2 text-center font-mono"
                                          >
                                            {s.marksObtained}
                                          </td>
                                        ))}
                                        <td className="px-3 py-2 text-center font-mono font-semibold">
                                          {total}/{maxTotal}
                                        </td>
                                        <td className="px-3 py-2 text-center font-semibold">
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
                                              pct >= 40
                                                ? "bg-accent/20 text-accent text-xs"
                                                : "bg-destructive/20 text-destructive text-xs"
                                            }
                                          >
                                            {pct >= 40 ? "PASS" : "FAIL"}
                                          </Badge>
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                              setPrintTarget({
                                                result: r,
                                                group: g,
                                              })
                                            }
                                            data-ocid={`result-print-${g.id}-${r.admNo}`}
                                          >
                                            🖨️ Marksheet
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
            </>
          )}
        </div>
      )}

      {editGroup && (
        <MarksEntryTable
          group={editGroup}
          onSave={(updated) => void handleSaveGroup(updated)}
          onClose={() => setEditGroup(null)}
        />
      )}

      {printTarget && (
        <PrintMarksheetDialog
          result={printTarget.result}
          examName={printTarget.group.examName}
          group={printTarget.group}
          template={savedTemplate}
          onClose={() => setPrintTarget(null)}
        />
      )}

      {waTarget && (
        <SendResultsDialog
          group={waTarget}
          allStudents={allStudents}
          onClose={() => setWaTarget(null)}
        />
      )}
    </div>
  );
}
