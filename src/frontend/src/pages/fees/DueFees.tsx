import { useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { useApp } from "../../context/AppContext";
import type { FeeReceipt, FeesPlan, Student } from "../../types";
import { CLASSES, MONTHS, formatCurrency, ls } from "../../utils/localStorage";
import { buildFeesDueMessage, sendWhatsApp } from "../../utils/whatsapp";

interface DueRow {
  student: Student;
  dueMonths: string[];
  dueAmount: number;
}

// Current academic month index (April=0, March=11)
function getCurrentAcademicMonthIdx(): number {
  const jsMonth = new Date().getMonth(); // 0=Jan
  return jsMonth >= 3 ? jsMonth - 3 : jsMonth + 9;
}

export default function DueFees() {
  const { getData, currentSession } = useApp();
  const [classFilter, setClassFilter] = useState("");
  const [dueRows, setDueRows] = useState<DueRow[]>([]);
  const [generated, setGenerated] = useState(false);
  const [waSending, setWaSending] = useState(false);
  const [waStatus, setWaStatus] = useState<string | null>(null);

  const currentAcademicIdx = getCurrentAcademicMonthIdx();
  // Only months up to and including the current month
  const dueTillMonths = MONTHS.slice(0, currentAcademicIdx + 1);

  function generate() {
    if (!currentSession) return;

    const students = (getData("students") as Student[]).filter(
      (s) => s.status === "active" && (!classFilter || s.class === classFilter),
    );
    const receipts = (getData("fee_receipts") as FeeReceipt[]).filter(
      (r) => r.sessionId === currentSession.id && !r.isDeleted,
    );
    const plans = getData("fees_plan") as FeesPlan[];

    const rows: DueRow[] = [];
    for (const student of students) {
      const paidMonths: string[] = [];
      for (const r of receipts.filter((r) => r.studentId === student.id)) {
        for (const item of r.items) {
          if (!paidMonths.includes(item.month)) paidMonths.push(item.month);
        }
      }

      const studentPlans = plans.filter(
        (p) => p.classId === student.class && p.sectionId === student.section,
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

    setDueRows(rows);
    setGenerated(true);
  }

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
    const html = `<!DOCTYPE html><html><head><title>Dues Report</title><style>body{font-family:Arial,sans-serif;font-size:12px;padding:20px}h2{text-align:center}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 10px}th{background:#f5f5f5;font-weight:bold}.total{font-weight:bold;background:#f0f0f0}</style></head><body>
    <h2>${school.name}</h2>
    <p style="text-align:center;color:#555">Dues Report till ${MONTHS[currentAcademicIdx]} | Class: ${classFilter || "All"}</p>
    <table><thead><tr><th>#</th><th>Student Name</th><th>Adm No</th><th>Class</th><th>Months Due</th><th>Amount Due</th></tr></thead><tbody>
    ${dueRows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.student.fullName}</td><td>${r.student.admNo}</td><td>${r.student.class}-${r.student.section}</td><td>${r.dueMonths.join(", ")}</td><td>₹${r.dueAmount}</td></tr>`).join("")}
    <tr class="total"><td colspan="5">Grand Total</td><td>₹${dueRows.reduce((s, r) => s + r.dueAmount, 0)}</td></tr>
    </tbody></table></body></html>`;

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

  async function handleWhatsAppReminder() {
    setWaSending(true);
    setWaStatus(null);
    const school = ls.get<{ name: string }>("school_profile", {
      name: "School",
    });
    let sent = 0;
    let failed = 0;
    for (const row of dueRows) {
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

  const uniqueClasses = [
    ...new Set((getData("students") as Student[]).map((s) => s.class)),
  ].sort();
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

      {/* Filters + Generate */}
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
            {uniqueClasses.map((c) => (
              <option key={c} value={c}>
                Class {c}
              </option>
            ))}
          </select>
        </div>
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
          onClick={generate}
          data-ocid="generate-dues-btn"
          className="ml-auto"
        >
          Generate Report
        </Button>
      </div>

      {/* Results */}
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
                onClick={handleWhatsAppReminder}
                disabled={waSending}
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
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border bg-muted/30 font-bold">
                    <td colSpan={5} className="px-3 py-2 text-right">
                      Grand Total
                    </td>
                    <td className="px-3 py-2 text-right text-red-600">
                      {formatCurrency(grandTotal)}
                    </td>
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
