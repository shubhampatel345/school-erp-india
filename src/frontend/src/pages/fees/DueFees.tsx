/**
 * DueFees.tsx — Direct phpApiService (no getData)
 *
 * Loads students and receipts from server, calculates dues.
 * Filter by class/section. WhatsApp bulk reminder. Export CSV.
 */
import { useCallback, useEffect, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { useApp } from "../../context/AppContext";
import type { FeeReceipt, FeesPlan, Student } from "../../types";
import { MONTHS, formatCurrency, ls } from "../../utils/localStorage";
import phpApiService, { type StudentRecord } from "../../utils/phpApiService";
import { buildFeesDueMessage, sendWhatsApp } from "../../utils/whatsapp";

interface DueRow {
  student: Student;
  dueMonths: string[];
  dueAmount: number;
}

function getCurrentAcademicMonthIdx(): number {
  const jsMonth = new Date().getMonth();
  return jsMonth >= 3 ? jsMonth - 3 : jsMonth + 9;
}

function toStudent(r: StudentRecord): Student {
  const s = r as unknown as Record<string, unknown>;
  return {
    id: r.id,
    admNo: r.admNo ?? "",
    fullName: r.fullName ?? "",
    fatherName: (s.fatherName as string) ?? "",
    motherName: (s.motherName as string) ?? "",
    fatherMobile: r.fatherMobile ?? "",
    guardianMobile: (s.guardianMobile as string) ?? r.fatherMobile ?? "",
    mobile: r.mobile ?? "",
    dob: r.dob ?? "",
    gender: (r.gender as Student["gender"]) ?? "Male",
    class: r.class ?? "",
    section: r.section ?? "",
    category: (s.category as string) ?? "",
    address: r.address ?? "",
    status: (s.status as string) === "discontinued" ? "discontinued" : "active",
    sessionId: r.sessionId ?? "",
  } as Student;
}

const CLASSES = [
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

export default function DueFees() {
  const { currentSession } = useApp();
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [dueRows, setDueRows] = useState<DueRow[]>([]);
  const [generated, setGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [waSending, setWaSending] = useState(false);
  const [waStatus, setWaStatus] = useState<string | null>(null);

  const currentAcademicIdx = getCurrentAcademicMonthIdx();
  const dueTillMonths = MONTHS.slice(0, currentAcademicIdx + 1);

  // Load sections when class changes
  useEffect(() => {
    if (!classFilter) {
      setAvailableSections([]);
      setSectionFilter("");
      return;
    }
    phpApiService
      .getClasses()
      .then((cls) => {
        const found = cls.find((c) => c.className === classFilter);
        if (found) {
          const sections = Array.isArray(found.sections)
            ? found.sections.map(String)
            : [];
          setAvailableSections(sections);
        } else {
          setAvailableSections([]);
        }
        setSectionFilter("");
      })
      .catch(() => setAvailableSections([]));
  }, [classFilter]);

  const generate = useCallback(async () => {
    if (!currentSession) return;
    setGenerating(true);
    try {
      const params: Record<string, string> = { limit: "500" };
      if (classFilter) params.class = classFilter;
      if (sectionFilter) params.section = sectionFilter;
      const studentResult = await phpApiService.getStudents(params);
      const students = (studentResult.data ?? [])
        .map(toStudent)
        .filter((s) => s.status === "active");

      const receipts = await phpApiService.get<FeeReceipt[]>(
        "fees/receipts/all",
        { sessionId: currentSession.id },
      );

      const allPlans: FeesPlan[] = [];
      const uniqueClasses = [...new Set(students.map((s) => s.class))];
      for (const cls of uniqueClasses) {
        const plans = await phpApiService.getFeePlan(cls, "");
        allPlans.push(...(plans as unknown as FeesPlan[]));
      }

      const rows: DueRow[] = [];
      for (const student of students) {
        const paidMonths: string[] = [];
        for (const r of (receipts ?? []).filter(
          (x) => x.studentId === student.id && !x.isDeleted,
        )) {
          for (const item of r.items) {
            if (!paidMonths.includes(item.month)) paidMonths.push(item.month);
          }
        }
        const studentPlans = allPlans.filter(
          (p) =>
            ((p as unknown as Record<string, string>).class ??
              p.classId ??
              "") === student.class,
        );
        const dueMonths = dueTillMonths.filter((m) => !paidMonths.includes(m));
        if (dueMonths.length === 0) continue;
        let dueAmount = 0;
        for (const plan of studentPlans) {
          if (plan.amount > 0) dueAmount += plan.amount * dueMonths.length;
        }
        if (dueAmount === 0) continue;
        rows.push({ student, dueMonths, dueAmount });
      }
      setDueRows(rows.sort((a, b) => b.dueAmount - a.dueAmount));
      setGenerated(true);
    } catch {
      setDueRows([]);
      setGenerated(true);
    } finally {
      setGenerating(false);
    }
  }, [currentSession, classFilter, sectionFilter, dueTillMonths]);

  function handleExport() {
    const header = [
      "#",
      "Student Name",
      "Adm No",
      "Class",
      "Section",
      "Months Due",
      "Amount Due",
    ];
    const rows = dueRows.map((r, i) => [
      i + 1,
      r.student.fullName,
      r.student.admNo,
      r.student.class,
      r.student.section,
      r.dueMonths.join("; "),
      r.dueAmount,
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    a.download = "dues_report.csv";
    a.click();
  }

  function handlePrint() {
    const school = ls.get<{ name: string; address: string }>("school_profile", {
      name: "SHUBH SCHOOL ERP",
      address: "",
    });
    const html = `<!DOCTYPE html><html><head><title>Dues Report</title><style>body{font-family:Arial,sans-serif;font-size:12px;padding:20px}h2{text-align:center}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 10px}th{background:#f5f5f5;font-weight:bold}.total{font-weight:bold;background:#f0f0f0}</style></head><body><h2>${school.name}</h2><p style="text-align:center;color:#555">Dues Report till ${MONTHS[currentAcademicIdx]} | Class: ${classFilter || "All"}</p><table><thead><tr><th>#</th><th>Student Name</th><th>Adm No</th><th>Class</th><th>Months Due</th><th>Amount Due</th></tr></thead><tbody>${dueRows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.student.fullName}</td><td>${r.student.admNo}</td><td>${r.student.class}-${r.student.section}</td><td>${r.dueMonths.join(", ")}</td><td>₹${r.dueAmount}</td></tr>`).join("")}<tr class="total"><td colspan="5">Grand Total</td><td>₹${dueRows.reduce((s, r) => s + r.dueAmount, 0)}</td></tr></tbody></table></body></html>`;
    const existing = document.getElementById(
      "shubh-print-frame",
    ) as HTMLIFrameElement | null;
    if (existing) existing.remove();
    const frame = document.createElement("iframe");
    frame.id = "shubh-print-frame";
    frame.style.cssText =
      "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;";
    document.body.appendChild(frame);
    const frameDoc = frame.contentDocument ?? frame.contentWindow?.document;
    if (!frameDoc) {
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(html);
        w.document.close();
        w.print();
      }
      return;
    }
    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();
    setTimeout(() => {
      try {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
      } catch {
        const w = window.open("", "_blank");
        if (w) {
          w.document.write(html);
          w.document.close();
          setTimeout(() => w.print(), 300);
        }
      }
      setTimeout(() => frame.remove(), 5000);
    }, 400);
  }

  async function handleWhatsAppReminder(single?: DueRow) {
    setWaSending(true);
    setWaStatus(null);
    const school = ls.get<{ name: string }>("school_profile", {
      name: "School",
    });
    const targets = single ? [single] : dueRows;
    let sent = 0;
    let failed = 0;
    for (const row of targets) {
      const phone = row.student.guardianMobile || row.student.mobile;
      if (!phone) {
        failed++;
        continue;
      }
      const msg = buildFeesDueMessage(
        row.student.fullName,
        row.dueMonths,
        row.dueAmount,
        school.name,
      );
      const res = await sendWhatsApp(phone, msg);
      if (res.success) sent++;
      else failed++;
    }
    setWaSending(false);
    setWaStatus(`Sent: ${sent}, Failed: ${failed}`);
  }

  const grandTotal = dueRows.reduce((s, r) => s + r.dueAmount, 0);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-foreground">Due Fees</h3>
        <p className="text-sm text-muted-foreground">
          Shows dues up to{" "}
          <span className="font-medium text-foreground">
            {MONTHS[currentAcademicIdx]}
          </span>{" "}
          (current month)
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Filter by Class
          </p>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground"
            data-ocid="due-fees-class-filter"
          >
            <option value="">All Classes</option>
            {CLASSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        {availableSections.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Filter by Section
            </p>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground"
              data-ocid="due-fees-section-filter"
            >
              <option value="">All Sections</option>
              {availableSections.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Months covered
          </p>
          <div className="flex flex-wrap gap-1">
            {dueTillMonths.map((m) => (
              <Badge key={m} variant="secondary" className="text-xs">
                {m.slice(0, 3)}
              </Badge>
            ))}
          </div>
        </div>
        <Button
          onClick={() => void generate()}
          data-ocid="generate-dues-btn"
          className="ml-auto"
          disabled={generating}
        >
          {generating ? "Generating…" : "Generate Report"}
        </Button>
      </div>

      {generated && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-semibold">
                Dues Report — Till {MONTHS[currentAcademicIdx]}
              </p>
              <p className="text-sm text-muted-foreground">
                {dueRows.length} student(s) with pending fees · Grand Total:{" "}
                <span className="font-bold text-red-600">
                  {formatCurrency(grandTotal)}
                </span>
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrint}
                data-ocid="dues-print-btn"
              >
                🖨️ Print
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExport}
                data-ocid="dues-excel-btn"
              >
                📊 Export CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleWhatsAppReminder()}
                disabled={waSending || dueRows.length === 0}
                data-ocid="dues-whatsapp-btn"
              >
                {waSending ? "Sending..." : "💬 WhatsApp All"}
              </Button>
            </div>
          </div>

          {waStatus && (
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 text-blue-700 text-sm">
              WhatsApp result: {waStatus}
            </div>
          )}

          {dueRows.length === 0 ? (
            <div
              className="p-10 text-center text-muted-foreground"
              data-ocid="due-fees.empty_state"
            >
              <p className="text-2xl mb-2">🎉</p>
              <p className="font-medium">No dues found!</p>
              <p className="text-sm mt-1">
                All students are up to date with payments till{" "}
                {MONTHS[currentAcademicIdx]}.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Student Name</th>
                    <th className="px-3 py-2 text-left">Adm No</th>
                    <th className="px-3 py-2 text-left">Class</th>
                    <th className="px-3 py-2 text-left">Months Due</th>
                    <th className="px-3 py-2 text-right">Amount Due</th>
                    <th className="px-3 py-2 text-center">Remind</th>
                  </tr>
                </thead>
                <tbody>
                  {dueRows.map((row, i) => (
                    <tr
                      key={row.student.id}
                      className="border-t border-border hover:bg-muted/20"
                      data-ocid={`due-fees-row.item.${i + 1}`}
                    >
                      <td className="px-3 py-2 text-muted-foreground">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2 font-medium">
                        {row.student.fullName}
                      </td>
                      <td className="px-3 py-2">{row.student.admNo}</td>
                      <td className="px-3 py-2">
                        <Badge variant="secondary">
                          {row.student.class}-{row.student.section}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {row.dueMonths.map((m) => m.slice(0, 3)).join(", ")}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-red-600">
                        {formatCurrency(row.dueAmount)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => void handleWhatsAppReminder(row)}
                          disabled={waSending}
                          className="text-xs px-2 py-0.5 rounded border border-border hover:bg-muted/50 transition-colors"
                          data-ocid={`dues-whatsapp-single.${i + 1}`}
                        >
                          💬
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border bg-muted/30 font-bold">
                    <td colSpan={5} className="px-3 py-2 text-right">
                      Grand Total
                    </td>
                    <td className="px-3 py-2 text-right text-red-600">
                      {formatCurrency(grandTotal)}
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
