import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  CheckCircle,
  Info,
  Printer,
  RefreshCw,
  Search,
  Settings2,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { AttendanceRecord, Staff } from "../../types";
import {
  MONTHS,
  formatCurrency,
  generateId,
  ls,
} from "../../utils/localStorage";

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

interface PayrollSettings {
  defaultWorkingDays: number;
}

interface PayrollRecord {
  id: string;
  staffId: string;
  staffName: string;
  empId: string;
  designation: string;
  month: string;
  year: string;
  netSalary: number;
  workingDays: number;
  presentDays: number;
  perDaySalary: number;
  payableSalary: number;
  absentDeduction: number;
  status: "generated" | "paid";
  paidDate?: string;
  generatedAt: string;
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

/** Map month name (academic: Apr=0) to calendar month number (0-based) */
function monthNameToCalendarIndex(monthName: string): number {
  const map: Record<string, number> = {
    April: 3,
    May: 4,
    June: 5,
    July: 6,
    August: 7,
    September: 8,
    October: 9,
    November: 10,
    December: 11,
    January: 0,
    February: 1,
    March: 2,
  };
  return map[monthName] ?? 3;
}

/** Determine calendar year for an academic month in a given academic year */
function monthYear(monthName: string, academicYear: string): number {
  const calIdx = monthNameToCalendarIndex(monthName);
  // Academic year e.g. "2025-26": April–Dec belongs to 2025, Jan–March to 2026
  const startYear = Number.parseInt(
    academicYear.split("-")[0] ?? String(CURRENT_YEAR),
    10,
  );
  // Jan, Feb, Mar belong to the end year
  return calIdx <= 2 ? startYear + 1 : startYear;
}

/** Count present days from attendance records for a staff member in a given month */
function countPresentDays(
  attendance: AttendanceRecord[],
  staffId: string,
  monthName: string,
  year: number,
): number {
  const calMonth = monthNameToCalendarIndex(monthName);
  let count = 0;
  for (const rec of attendance) {
    if (rec.type !== "staff" || rec.staffId !== staffId) continue;
    const d = new Date(rec.date);
    if (d.getFullYear() !== year || d.getMonth() !== calMonth) continue;
    if (rec.status === "Present") count += 1;
    else if (rec.status === "Half Day") count += 0.5;
    // "Late" counts as present for payroll purposes
    else if (rec.status === "Late") count += 1;
  }
  return count;
}

/** Calculate payroll for a single staff member */
function calcRecord(
  s: Staff,
  monthName: string,
  year: string,
  workingDays: number,
  attendance: AttendanceRecord[],
): PayrollRecord {
  const netSalary = s.salary ?? 0;
  const calYear = monthYear(monthName, year);
  const presentDays = countPresentDays(attendance, s.id, monthName, calYear);
  const perDaySalary = workingDays > 0 ? netSalary / workingDays : 0;
  const payableSalary = Math.round(perDaySalary * presentDays);
  const absentDeduction = netSalary - payableSalary;

  return {
    id: generateId(),
    staffId: s.id,
    staffName: s.name,
    empId: s.empId,
    designation: s.designation,
    month: monthName,
    year,
    netSalary,
    workingDays,
    presentDays,
    perDaySalary: Math.round(perDaySalary * 100) / 100,
    payableSalary,
    absentDeduction,
    status: "generated",
    generatedAt: new Date().toISOString(),
  };
}

/** Current academic year label e.g. "2025-26" */
function currentAcademicYear(): string {
  const now = new Date();
  const m = now.getMonth(); // 0=Jan
  const y = now.getFullYear();
  if (m >= 3) return `${y}-${String(y + 1).slice(-2)}`;
  return `${y - 1}-${String(y).slice(-2)}`;
}

// ──────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────

export default function Payroll() {
  const [settings, setSettings] = useState<PayrollSettings>(() =>
    ls.get<PayrollSettings>("payroll_settings", { defaultWorkingDays: 26 }),
  );
  const [records, setRecords] = useState<PayrollRecord[]>(() =>
    ls.get<PayrollRecord[]>("payroll_records", []),
  );
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const m = new Date().getMonth();
    const idx = m >= 3 ? m - 3 : m + 9;
    return MONTHS[idx] ?? "April";
  });
  const [academicYear] = useState(currentAcademicYear);
  const [monthWorkingDays, setMonthWorkingDays] = useState(
    String(settings.defaultWorkingDays),
  );
  const [showSettings, setShowSettings] = useState(false);
  const [defaultWd, setDefaultWd] = useState(
    String(settings.defaultWorkingDays),
  );

  const staff = ls
    .get<Staff[]>("staff", [])
    .filter((s) => (s.status ?? "active") === "active");
  const attendance = ls.get<AttendanceRecord[]>("attendance", []);

  const workingDaysNum = Math.max(1, Number(monthWorkingDays) || 26);

  /** Generate/refresh payroll for current month */
  function generatePayroll() {
    const newRecords: PayrollRecord[] = staff.map((s) =>
      calcRecord(s, selectedMonth, academicYear, workingDaysNum, attendance),
    );

    // Merge: keep paid records, replace generated records for this month
    setRecords((prev) => {
      const otherMonths = prev.filter(
        (r) => !(r.month === selectedMonth && r.year === academicYear),
      );
      const paidThisMonth = prev.filter(
        (r) =>
          r.month === selectedMonth &&
          r.year === academicYear &&
          r.status === "paid",
      );
      // For paid records, just recalc non-payment fields but keep paid status
      const merged = newRecords.map((nr) => {
        const paid = paidThisMonth.find((p) => p.staffId === nr.staffId);
        return paid
          ? {
              ...nr,
              id: paid.id,
              status: "paid" as const,
              paidDate: paid.paidDate,
            }
          : nr;
      });
      const result = [...otherMonths, ...merged];
      ls.set("payroll_records", result);
      return result;
    });
  }

  function markPaid(record: PayrollRecord) {
    setRecords((prev) => {
      const updated = prev.map((r) =>
        r.id === record.id
          ? {
              ...r,
              status: "paid" as const,
              paidDate: new Date().toLocaleDateString("en-IN"),
            }
          : r,
      );
      ls.set("payroll_records", updated);
      return updated;
    });
  }

  function saveSettings() {
    const wdNum = Math.max(1, Number(defaultWd) || 26);
    const updated = { defaultWorkingDays: wdNum };
    setSettings(updated);
    ls.set("payroll_settings", updated);
    setMonthWorkingDays(String(wdNum));
    setShowSettings(false);
  }

  // Records for the selected month
  const monthRecords = useMemo(
    () =>
      records.filter(
        (r) => r.month === selectedMonth && r.year === academicYear,
      ),
    [records, selectedMonth, academicYear],
  );

  // Apply search filter
  const displayRecords = useMemo(
    () =>
      monthRecords.filter(
        (r) =>
          r.staffName.toLowerCase().includes(search.toLowerCase()) ||
          r.designation.toLowerCase().includes(search.toLowerCase()) ||
          r.empId.toLowerCase().includes(search.toLowerCase()),
      ),
    [monthRecords, search],
  );

  // Check if attendance data exists for this month
  const hasAttendanceData = useMemo(() => {
    const calMonth = monthNameToCalendarIndex(selectedMonth);
    const calYear = monthYear(selectedMonth, academicYear);
    return attendance.some((a) => {
      if (a.type !== "staff") return false;
      const d = new Date(a.date);
      return d.getFullYear() === calYear && d.getMonth() === calMonth;
    });
  }, [attendance, selectedMonth, academicYear]);

  // Summary stats
  const totalPayable = displayRecords.reduce((s, r) => s + r.payableSalary, 0);
  const totalPaid = displayRecords
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + r.payableSalary, 0);
  const totalPending = displayRecords
    .filter((r) => r.status !== "paid")
    .reduce((s, r) => s + r.payableSalary, 0);

  function printPayslip(r: PayrollRecord) {
    const school = ls.get<{
      name: string;
      address: string;
      phone: string;
    }>("school_profile", {
      name: "SHUBH SCHOOL ERP",
      address: "",
      phone: "",
    });

    const win = window.open("", "_blank", "width=600,height=750");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payslip — ${r.staffName} — ${r.month} ${r.year}</title>
        <style>
          @page { size: A4; margin: 18mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; }
          .header { text-align: center; border-bottom: 2px solid #1a1a6b; padding-bottom: 10px; margin-bottom: 14px; }
          .header h1 { margin: 0 0 4px; font-size: 20px; color: #1a1a6b; }
          .header p { margin: 2px 0; font-size: 12px; color: #555; }
          .title { text-align: center; font-size: 14px; letter-spacing: 1px; text-transform: uppercase;
                   background: #1a1a6b; color: #fff; padding: 7px; margin: 0 0 14px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          td, th { border: 1px solid #ccc; padding: 7px 10px; }
          th { background: #f5f5f5; text-align: left; font-size: 12px; font-weight: 600; }
          .section-head { background: #e8eaf6; font-weight: bold; font-size: 12px; letter-spacing: 0.5px; }
          .net-row td { background: #1a1a6b; color: #fff; font-weight: bold; font-size: 15px; }
          .deduction-cell { color: #c62828; }
          .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: bold;
                   background: ${r.status === "paid" ? "#c8e6c9" : "#fff3e0"};
                   color: ${r.status === "paid" ? "#1b5e20" : "#e65100"}; }
          .footer { margin-top: 48px; display: flex; justify-content: space-between; font-size: 12px; }
          .footer div { text-align: center; }
          .footer .line { border-top: 1px solid #999; width: 130px; margin: 0 auto 4px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
          .info-grid td { border: 1px solid #ccc; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${school.name}</h1>
          <p>${school.address}${school.phone ? ` | Ph: ${school.phone}` : ""}</p>
        </div>
        <div class="title">Salary Slip — ${r.month} ${r.year}</div>

        <table>
          <tr>
            <th>Employee Name</th><td>${r.staffName}</td>
            <th>Employee ID</th><td>${r.empId}</td>
          </tr>
          <tr>
            <th>Designation</th><td>${r.designation}</td>
            <th>Pay Period</th><td>${r.month} ${r.year}</td>
          </tr>
          <tr>
            <th>Payment Status</th>
            <td><span class="badge">${r.status === "paid" ? "✓ PAID" : "PENDING"}</span>
              ${r.paidDate ? `<span style="font-size:11px;color:#555;margin-left:8px">${r.paidDate}</span>` : ""}
            </td>
            <th>Generated On</th>
            <td>${new Date(r.generatedAt).toLocaleDateString("en-IN")}</td>
          </tr>
        </table>

        <table>
          <thead>
            <tr>
              <th class="section-head" colspan="2">Attendance Details</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th style="width:55%">Working Days (Month)</th>
              <td style="text-align:right">${r.workingDays} days</td>
            </tr>
            <tr>
              <th>Days Present</th>
              <td style="text-align:right">${r.presentDays} days</td>
            </tr>
            <tr>
              <th>Days Absent</th>
              <td style="text-align:right;color:#c62828">${r.workingDays - r.presentDays} days</td>
            </tr>
            <tr>
              <th>Per Day Rate</th>
              <td style="text-align:right">₹${r.perDaySalary.toLocaleString("en-IN")}</td>
            </tr>
          </tbody>
        </table>

        <table>
          <thead>
            <tr>
              <th class="section-head" style="width:55%">Earnings</th>
              <th class="section-head" style="text-align:right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Net Salary (Monthly)</td>
              <td style="text-align:right">₹${r.netSalary.toLocaleString("en-IN")}</td>
            </tr>
          </tbody>
        </table>

        <table>
          <thead>
            <tr>
              <th class="section-head" style="width:55%">Deductions</th>
              <th class="section-head" style="text-align:right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Absent Deduction (${r.workingDays - r.presentDays} days × ₹${r.perDaySalary})</td>
              <td style="text-align:right" class="deduction-cell">₹${r.absentDeduction.toLocaleString("en-IN")}</td>
            </tr>
          </tbody>
        </table>

        <table>
          <tfoot>
            <tr class="net-row">
              <td style="width:55%">NET PAYABLE SALARY</td>
              <td style="text-align:right">₹${r.payableSalary.toLocaleString("en-IN")}</td>
            </tr>
          </tfoot>
        </table>

        <p style="font-size:11px;color:#777;text-align:center;margin-top:4px">
          Net Salary ₹${r.netSalary.toLocaleString("en-IN")} × (${r.presentDays} present / ${r.workingDays} working) = ₹${r.payableSalary.toLocaleString("en-IN")}
        </p>

        <div class="footer">
          <div><div class="line"></div>Employee Signature</div>
          <div><div class="line"></div>Accounts / Cashier</div>
          <div><div class="line"></div>Principal / HOD</div>
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.print();
  }

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* ── Header Controls ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">
            Payroll — {academicYear}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Attendance-based salary calculation
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          data-ocid="payroll-settings-btn"
        >
          <Settings2 className="w-4 h-4 mr-1.5" />
          Settings
        </Button>
      </div>

      {/* ── Settings Panel ─────────────────────────────── */}
      {showSettings && (
        <Card className="p-5 border-primary/30 bg-primary/5 space-y-4 max-w-md">
          <p className="font-semibold text-foreground">Payroll Settings</p>
          <div className="space-y-1.5">
            <Label htmlFor="default-wd">Default Working Days per Month</Label>
            <Input
              id="default-wd"
              type="number"
              min={1}
              max={31}
              value={defaultWd}
              onChange={(e) =>
                setDefaultWd(e.target.value.replace(/^0+(?=\d)/, ""))
              }
              className="w-28"
              data-ocid="payroll-default-wd"
            />
            <p className="text-xs text-muted-foreground">
              Standard is 26 days. This is used when generating payroll.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveSettings}>
              Save Settings
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSettings(false)}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* ── Month Selector + Working Days + Generate ──── */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="space-y-1.5">
            <Label>Select Month</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-40" data-ocid="payroll-month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="month-wd">Working Days — {selectedMonth}</Label>
            <Input
              id="month-wd"
              type="number"
              min={1}
              max={31}
              value={monthWorkingDays}
              onChange={(e) =>
                setMonthWorkingDays(e.target.value.replace(/^0+(?=\d)/, ""))
              }
              className="w-24"
              data-ocid="payroll-working-days"
            />
          </div>

          <Button
            onClick={generatePayroll}
            data-ocid="payroll-generate"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Generate Payroll
          </Button>

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search staff…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-ocid="payroll-search"
            />
          </div>
        </div>
      </Card>

      {/* ── Attendance Warning ─────────────────────────── */}
      {monthRecords.length > 0 && !hasAttendanceData && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">
              No Staff Attendance Data for {selectedMonth}
            </p>
            <p className="text-xs mt-0.5 opacity-80">
              Staff attendance for {selectedMonth} {academicYear} has not been
              recorded yet. All present days show as 0. Please mark staff
              attendance in the Attendance module, then click "Generate Payroll"
              again to recalculate.
            </p>
          </div>
        </div>
      )}

      {/* ── Summary Cards ──────────────────────────────── */}
      {monthRecords.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Total Staff
            </p>
            <p className="text-2xl font-bold font-display text-foreground mt-1">
              {displayRecords.length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Total Payable
            </p>
            <p className="text-xl font-bold font-display text-foreground mt-1">
              {formatCurrency(totalPayable)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Paid
            </p>
            <p className="text-xl font-bold font-display text-accent mt-1">
              {formatCurrency(totalPaid)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Pending
            </p>
            <p className="text-xl font-bold font-display text-destructive mt-1">
              {formatCurrency(totalPending)}
            </p>
          </Card>
        </div>
      )}

      {/* ── Empty State ────────────────────────────────── */}
      {monthRecords.length === 0 && (
        <Card className="p-14 text-center" data-ocid="payroll-empty">
          <Info className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="font-semibold text-foreground mb-1">
            No Payroll Generated for {selectedMonth} {academicYear}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {staff.length === 0
              ? "Add staff members from the Staff Directory tab first."
              : `Click "Generate Payroll" to calculate salaries for all ${staff.length} active staff members based on their attendance.`}
          </p>
          {staff.length > 0 && (
            <Button
              onClick={generatePayroll}
              data-ocid="payroll-generate-empty"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Generate Payroll
            </Button>
          )}
        </Card>
      )}

      {/* ── Payroll Table ──────────────────────────────── */}
      {displayRecords.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground">
                    Staff
                  </th>
                  <th className="text-right px-3 py-3 font-semibold text-muted-foreground hidden sm:table-cell">
                    Net Salary
                  </th>
                  <th className="text-center px-3 py-3 font-semibold text-muted-foreground">
                    Work Days
                  </th>
                  <th className="text-center px-3 py-3 font-semibold text-muted-foreground">
                    Present
                  </th>
                  <th className="text-right px-3 py-3 font-semibold text-muted-foreground hidden md:table-cell">
                    Per Day
                  </th>
                  <th className="text-right px-3 py-3 font-semibold text-muted-foreground">
                    Payable
                  </th>
                  <th className="text-right px-3 py-3 font-semibold text-muted-foreground hidden lg:table-cell">
                    Deduction
                  </th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground">
                    Status
                  </th>
                  <th className="text-right px-3 py-3 font-semibold text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayRecords.map((r) => {
                  const absentDays = r.workingDays - r.presentDays;
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-muted/30 transition-colors"
                      data-ocid={`payroll-row-${r.staffId}`}
                    >
                      <td className="px-3 py-3">
                        <p className="font-medium text-foreground">
                          {r.staffName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.designation} · {r.empId}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-sm hidden sm:table-cell">
                        {formatCurrency(r.netSalary)}
                      </td>
                      <td className="px-3 py-3 text-center text-sm">
                        {r.workingDays}
                      </td>
                      <td className="px-3 py-3 text-center text-sm">
                        <span
                          className={
                            r.presentDays === 0
                              ? "text-destructive font-semibold"
                              : r.presentDays < r.workingDays
                                ? "text-amber-600 dark:text-amber-400 font-medium"
                                : "text-accent font-semibold"
                          }
                        >
                          {r.presentDays}
                        </span>
                        {absentDays > 0 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({absentDays}A)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-muted-foreground hidden md:table-cell">
                        {formatCurrency(r.perDaySalary)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-semibold text-foreground">
                        {formatCurrency(r.payableSalary)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-sm text-destructive hidden lg:table-cell">
                        {r.absentDeduction > 0
                          ? `-${formatCurrency(r.absentDeduction)}`
                          : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <Badge
                          variant={
                            r.status === "paid" ? "default" : "secondary"
                          }
                          className={
                            r.status === "paid"
                              ? "bg-accent/20 text-accent border-accent/30"
                              : ""
                          }
                        >
                          {r.status === "paid" ? "Paid" : "Pending"}
                        </Badge>
                        {r.paidDate && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {r.paidDate}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {r.status !== "paid" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markPaid(r)}
                              className="text-accent border-accent/40 hover:bg-accent/10 text-xs h-7"
                              data-ocid={`pay-staff-${r.staffId}`}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" /> Mark Paid
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => printPayslip(r)}
                            aria-label="Print payslip"
                            data-ocid={`print-payslip-${r.staffId}`}
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {monthRecords.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Payable = Net Salary × (Present Days / Working Days). Present Days
          counted from Staff Attendance records for {selectedMonth}. Half Day =
          0.5 days. Late = 1 day. Click "Generate Payroll" to refresh after
          updating attendance.
        </p>
      )}
    </div>
  );
}
