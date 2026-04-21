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
  Download,
  Info,
  Printer,
  RefreshCw,
  Save,
  Settings2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import type { AttendanceRecord, Staff } from "../../types";
import {
  MONTHS,
  formatCurrency,
  generateId,
  ls,
} from "../../utils/localStorage";

// ── Types ─────────────────────────────────────────────────

interface PayrollSetup {
  staffId: string;
  baseSalary: number;
  hra: number;
  da: number;
  otherAllowance: number;
  pf: number;
  esi: number;
  otherDeduction: number;
}

interface PayrollRecord {
  id: string;
  staffId: string;
  staffName: string;
  empId: string;
  designation: string;
  month: string;
  year: string;
  baseSalary: number;
  hra: number;
  da: number;
  otherAllowance: number;
  grossSalary: number;
  pf: number;
  esi: number;
  otherDeduction: number;
  totalDeductions: number;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  perDaySalary: number;
  payableSalary: number;
  absentDeduction: number;
  status: "generated" | "paid";
  paidDate?: string;
  generatedAt: string;
}

// ── Sub-tabs ──────────────────────────────────────────────
const PAYROLL_TABS = [
  { id: "setup", label: "Payroll Setup" },
  { id: "generate", label: "Generate Payroll" },
] as const;
type PayrollTabId = (typeof PAYROLL_TABS)[number]["id"];

// ── Helpers ───────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

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

function monthCalYear(monthName: string, academicYear: string): number {
  const calIdx = monthNameToCalendarIndex(monthName);
  const startYear = Number.parseInt(
    academicYear.split("-")[0] ?? String(CURRENT_YEAR),
    10,
  );
  return calIdx <= 2 ? startYear + 1 : startYear;
}

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
    else if (rec.status === "Late") count += 1;
  }
  return count;
}

function countApprovedLeaveDays(
  leaves: Array<{
    staffId: string;
    fromDate: string;
    toDate: string;
    totalDays: number;
    status: string;
  }>,
  staffId: string,
  monthName: string,
  year: number,
): number {
  const calMonth = monthNameToCalendarIndex(monthName);
  let count = 0;
  for (const leave of leaves) {
    if (leave.staffId !== staffId || leave.status !== "Approved") continue;
    const from = new Date(leave.fromDate);
    if (from.getFullYear() === year && from.getMonth() === calMonth) {
      count += leave.totalDays;
    }
  }
  return count;
}

function getSetupForStaff(staffId: string): PayrollSetup {
  const stored = ls.get<Record<string, Partial<PayrollSetup>>>(
    "payroll_setup",
    {},
  );
  const s = stored[staffId] ?? {};
  return {
    staffId,
    baseSalary: s.baseSalary ?? 0,
    hra: s.hra ?? 0,
    da: s.da ?? 0,
    otherAllowance: s.otherAllowance ?? 0,
    pf: s.pf ?? 0,
    esi: s.esi ?? 0,
    otherDeduction: s.otherDeduction ?? 0,
  };
}

function calcPayrollRecord(
  s: Staff,
  setup: PayrollSetup,
  monthName: string,
  year: string,
  workingDays: number,
  attendance: AttendanceRecord[],
  leaves: Array<{
    staffId: string;
    fromDate: string;
    toDate: string;
    totalDays: number;
    status: string;
  }>,
): PayrollRecord {
  const calYear = monthCalYear(monthName, year);
  const presentDays = countPresentDays(attendance, s.id, monthName, calYear);
  const leaveDays = countApprovedLeaveDays(leaves, s.id, monthName, calYear);
  const effectivePresentDays = Math.min(presentDays + leaveDays, workingDays);

  const grossSalary =
    setup.baseSalary + setup.hra + setup.da + setup.otherAllowance;
  const totalDeductions = setup.pf + setup.esi + setup.otherDeduction;
  const perDaySalary = workingDays > 0 ? grossSalary / workingDays : 0;
  const payableSalary =
    Math.round(perDaySalary * effectivePresentDays) - totalDeductions;
  const absentDeduction = Math.round(
    perDaySalary * Math.max(0, workingDays - effectivePresentDays),
  );

  return {
    id: generateId(),
    staffId: s.id,
    staffName: s.name ?? s.fullName ?? "",
    empId: s.empId,
    designation: s.designation,
    month: monthName,
    year,
    baseSalary: setup.baseSalary,
    hra: setup.hra,
    da: setup.da,
    otherAllowance: setup.otherAllowance,
    grossSalary,
    pf: setup.pf,
    esi: setup.esi,
    otherDeduction: setup.otherDeduction,
    totalDeductions,
    workingDays,
    presentDays,
    leaveDays,
    perDaySalary: Math.round(perDaySalary * 100) / 100,
    payableSalary: Math.max(0, payableSalary),
    absentDeduction,
    status: "generated",
    generatedAt: new Date().toISOString(),
  };
}

function currentAcademicYear(): string {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  if (m >= 3) return `${y}-${String(y + 1).slice(-2)}`;
  return `${y - 1}-${String(y).slice(-2)}`;
}

// ── Payroll Setup Tab ─────────────────────────────────────

interface SetupRowProps {
  staff: Staff;
  onSaved: () => void;
}

function SetupRow({ staff, onSaved }: SetupRowProps) {
  const setup = getSetupForStaff(staff.id);
  const [base, setBase] = useState(
    setup.baseSalary > 0
      ? String(setup.baseSalary)
      : (staff.baseSalary ?? staff.salary)
        ? String(staff.baseSalary ?? staff.salary ?? 0)
        : "",
  );
  const [hra, setHra] = useState(setup.hra > 0 ? String(setup.hra) : "");
  const [da, setDa] = useState(setup.da > 0 ? String(setup.da) : "");
  const [otherAllow, setOtherAllow] = useState(
    setup.otherAllowance > 0 ? String(setup.otherAllowance) : "",
  );
  const [pf, setPf] = useState(setup.pf > 0 ? String(setup.pf) : "");
  const [esi, setEsi] = useState(setup.esi > 0 ? String(setup.esi) : "");
  const [otherDed, setOtherDed] = useState(
    setup.otherDeduction > 0 ? String(setup.otherDeduction) : "",
  );
  const [saved, setSaved] = useState(false);

  const gross =
    (Number(base) || 0) +
    (Number(hra) || 0) +
    (Number(da) || 0) +
    (Number(otherAllow) || 0);
  const ded = (Number(pf) || 0) + (Number(esi) || 0) + (Number(otherDed) || 0);
  const net = gross - ded;

  function save() {
    const newSetup: Partial<PayrollSetup> = {
      baseSalary: Number(base) || 0,
      hra: Number(hra) || 0,
      da: Number(da) || 0,
      otherAllowance: Number(otherAllow) || 0,
      pf: Number(pf) || 0,
      esi: Number(esi) || 0,
      otherDeduction: Number(otherDed) || 0,
    };
    const all = ls.get<Record<string, Partial<PayrollSetup>>>(
      "payroll_setup",
      {},
    );
    all[staff.id] = newSetup;
    ls.set("payroll_setup", all);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSaved();
  }

  return (
    <tr className="border-b border-border hover:bg-muted/20 transition-colors">
      <td className="px-3 py-3">
        <p className="font-medium text-foreground text-sm">{staff.name}</p>
        <p className="text-xs text-muted-foreground">
          {staff.empId} · {staff.designation}
        </p>
      </td>
      <td className="px-2 py-2">
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={base}
          onChange={(e) =>
            setBase(
              e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"),
            )
          }
          className="w-24 h-8 text-sm"
          placeholder="0"
        />
      </td>
      <td className="px-2 py-2">
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={hra}
          onChange={(e) =>
            setHra(
              e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"),
            )
          }
          className="w-24 h-8 text-sm"
          placeholder="0"
        />
      </td>
      <td className="px-2 py-2">
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={da}
          onChange={(e) =>
            setDa(
              e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"),
            )
          }
          className="w-24 h-8 text-sm"
          placeholder="0"
        />
      </td>
      <td className="px-2 py-2 hidden xl:table-cell">
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={otherAllow}
          onChange={(e) =>
            setOtherAllow(
              e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"),
            )
          }
          className="w-24 h-8 text-sm"
          placeholder="0"
        />
      </td>
      <td className="px-2 py-2">
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={pf}
          onChange={(e) =>
            setPf(
              e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"),
            )
          }
          className="w-24 h-8 text-sm"
          placeholder="0"
        />
      </td>
      <td className="px-2 py-2 hidden lg:table-cell">
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={esi}
          onChange={(e) =>
            setEsi(
              e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"),
            )
          }
          className="w-24 h-8 text-sm"
          placeholder="0"
        />
      </td>
      <td className="px-2 py-2 hidden lg:table-cell">
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={otherDed}
          onChange={(e) =>
            setOtherDed(
              e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"),
            )
          }
          className="w-24 h-8 text-sm"
          placeholder="0"
        />
      </td>
      <td className="px-3 py-3 text-right font-mono font-semibold text-sm text-primary">
        ₹{net > 0 ? net.toLocaleString("en-IN") : "—"}
      </td>
      <td className="px-3 py-3 text-right">
        <Button
          size="sm"
          variant={saved ? "outline" : "default"}
          className={`h-8 text-xs ${saved ? "text-accent border-accent/40" : ""}`}
          onClick={save}
        >
          {saved ? (
            <>
              <CheckCircle className="w-3 h-3 mr-1 text-accent" />
              Saved
            </>
          ) : (
            <>
              <Save className="w-3 h-3 mr-1" />
              Save
            </>
          )}
        </Button>
      </td>
    </tr>
  );
}

// ── Main Component ────────────────────────────────────────

export default function Payroll() {
  const { getData, saveData, addNotification } = useApp();

  const [activeTab, setActiveTab] = useState<PayrollTabId>("setup");
  const [defaultWorkingDays, setDefaultWorkingDays] = useState(() =>
    ls.get<number>("payroll_default_wd", 26),
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
    String(defaultWorkingDays),
  );
  const [showSettings, setShowSettings] = useState(false);
  const [settingsWd, setSettingsWd] = useState(String(defaultWorkingDays));
  const [saving, setSaving] = useState(false);
  const [setupKey, setSetupKey] = useState(0); // force re-read after save

  const allStaff = getData("staff") as Staff[];
  const attendance = getData("attendance") as AttendanceRecord[];
  const leaveRecords = getData("leave_records") as Array<{
    staffId: string;
    fromDate: string;
    toDate: string;
    totalDays: number;
    status: string;
  }>;

  const activeStaff = allStaff.filter(
    (s) => (s.status ?? "active") === "active",
  );

  const workingDaysNum = Math.max(1, Number(monthWorkingDays) || 26);

  // ── Generate payroll ──────────────────────────────────────

  function generatePayroll() {
    const newRecords: PayrollRecord[] = activeStaff.map((s) => {
      const setup = getSetupForStaff(s.id);
      // If no payroll setup, fall back to staff salary
      if (setup.baseSalary === 0 && (s.baseSalary ?? s.salary)) {
        setup.baseSalary = s.baseSalary ?? s.salary ?? 0;
      }
      return calcPayrollRecord(
        s,
        setup,
        selectedMonth,
        academicYear,
        workingDaysNum,
        attendance,
        leaveRecords,
      );
    });

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

    addNotification(
      `Payroll generated for ${selectedMonth} ${academicYear} — ${newRecords.length} staff`,
      "success",
    );
  }

  // ── Mark paid ─────────────────────────────────────────────

  async function markPaid(record: PayrollRecord) {
    setSaving(true);
    const updated = {
      ...record,
      status: "paid" as const,
      paidDate: new Date().toLocaleDateString("en-IN"),
    };
    setRecords((prev) => {
      const next = prev.map((r) => (r.id === record.id ? updated : r));
      ls.set("payroll_records", next);
      return next;
    });
    try {
      await saveData(
        "payroll_records",
        updated as unknown as Record<string, unknown>,
      );
      addNotification(`Payroll marked paid: ${record.staffName}`, "success");
    } catch {
      addNotification(
        "Saved locally; sync to server failed.",
        "warning" as "info",
      );
    } finally {
      setSaving(false);
    }
  }

  function saveSettings() {
    const wdNum = Math.max(1, Number(settingsWd) || 26);
    setDefaultWorkingDays(wdNum);
    ls.set("payroll_default_wd", wdNum);
    setMonthWorkingDays(String(wdNum));
    setShowSettings(false);
  }

  // ── Derived ───────────────────────────────────────────────

  const monthRecords = useMemo(
    () =>
      records.filter(
        (r) => r.month === selectedMonth && r.year === academicYear,
      ),
    [records, selectedMonth, academicYear],
  );

  const displayRecords = useMemo(
    () =>
      monthRecords.filter(
        (r) =>
          !search ||
          r.staffName.toLowerCase().includes(search.toLowerCase()) ||
          r.designation.toLowerCase().includes(search.toLowerCase()) ||
          r.empId.toLowerCase().includes(search.toLowerCase()),
      ),
    [monthRecords, search],
  );

  const hasAttendanceData = useMemo(() => {
    const calMonth = monthNameToCalendarIndex(selectedMonth);
    const calYear = monthCalYear(selectedMonth, academicYear);
    return attendance.some((a) => {
      if (a.type !== "staff") return false;
      const d = new Date(a.date);
      return d.getFullYear() === calYear && d.getMonth() === calMonth;
    });
  }, [attendance, selectedMonth, academicYear]);

  const totalPayable = displayRecords.reduce((s, r) => s + r.payableSalary, 0);
  const totalPaid = displayRecords
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + r.payableSalary, 0);
  const totalPending = displayRecords
    .filter((r) => r.status !== "paid")
    .reduce((s, r) => s + r.payableSalary, 0);

  // ── Export ────────────────────────────────────────────────

  function exportCSV() {
    if (displayRecords.length === 0) return;
    const headers = [
      "EmpID",
      "Name",
      "Designation",
      "Month",
      "Year",
      "Base Salary",
      "HRA",
      "DA",
      "Other Allow.",
      "Gross Salary",
      "PF",
      "ESI",
      "Other Ded.",
      "Total Deductions",
      "Working Days",
      "Present Days",
      "Leave Days",
      "Per Day Rate",
      "Payable Salary",
      "Status",
      "Paid Date",
    ];
    const rows = displayRecords.map((r) => [
      r.empId,
      r.staffName,
      r.designation,
      r.month,
      r.year,
      String(r.baseSalary),
      String(r.hra),
      String(r.da),
      String(r.otherAllowance),
      String(r.grossSalary),
      String(r.pf),
      String(r.esi),
      String(r.otherDeduction),
      String(r.totalDeductions),
      String(r.workingDays),
      String(r.presentDays),
      String(r.leaveDays),
      String(r.perDaySalary),
      String(r.payableSalary),
      r.status,
      r.paidDate ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${c}"`).join(","))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `payroll_${selectedMonth}_${academicYear}.csv`;
    a.click();
  }

  // ── Print payslip ─────────────────────────────────────────

  function printPayslip(r: PayrollRecord) {
    const school = ls.get<{ name: string; address: string; phone: string }>(
      "school_profile",
      { name: "SCHOOL LEDGER ERP", address: "", phone: "" },
    );
    const win = window.open("", "_blank", "width=640,height=800");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Payslip — ${r.staffName} — ${r.month} ${r.year}</title>
      <style>
        @page{size:A4;margin:18mm}*{box-sizing:border-box}
        body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a}
        .hdr{text-align:center;border-bottom:2px solid #1a1a6b;padding-bottom:10px;margin-bottom:14px}
        .hdr h1{margin:0 0 4px;font-size:20px;color:#1a1a6b}
        .hdr p{margin:2px 0;font-size:12px;color:#555}
        .title{text-align:center;font-size:14px;letter-spacing:1px;text-transform:uppercase;
               background:#1a1a6b;color:#fff;padding:7px;margin:0 0 14px;font-weight:bold}
        table{width:100%;border-collapse:collapse;margin-bottom:12px}
        td,th{border:1px solid #ccc;padding:7px 10px}
        th{background:#f5f5f5;text-align:left;font-size:12px;font-weight:600}
        .sh{background:#e8eaf6;font-weight:bold;font-size:12px}
        .net td{background:#1a1a6b;color:#fff;font-weight:bold;font-size:15px}
        .ded{color:#c62828}
        .badge{display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:bold;
               background:${r.status === "paid" ? "#c8e6c9" : "#fff3e0"};
               color:${r.status === "paid" ? "#1b5e20" : "#e65100"}}
        .foot{margin-top:48px;display:flex;justify-content:space-between;font-size:12px}
        .foot div{text-align:center}
        .line{border-top:1px solid #999;width:130px;margin:0 auto 4px}
        .two-col{display:flex;gap:20px}
        .two-col>div{flex:1}
      </style></head><body>
      <div class="hdr">
        <h1>${school.name}</h1>
        <p>${school.address}${school.phone ? ` | Ph: ${school.phone}` : ""}</p>
      </div>
      <div class="title">Salary Slip — ${r.month} ${r.year}</div>
      <table>
        <tr><th>Employee Name</th><td>${r.staffName}</td><th>Employee ID</th><td>${r.empId}</td></tr>
        <tr><th>Designation</th><td>${r.designation}</td><th>Pay Period</th><td>${r.month} ${r.year}</td></tr>
        <tr>
          <th>Payment Status</th>
          <td><span class="badge">${r.status === "paid" ? "✓ PAID" : "PENDING"}</span>${r.paidDate ? `<span style="font-size:11px;color:#555;margin-left:8px">${r.paidDate}</span>` : ""}</td>
          <th>Generated On</th>
          <td>${new Date(r.generatedAt).toLocaleDateString("en-IN")}</td>
        </tr>
      </table>

      <table>
        <thead><tr><th class="sh" colspan="4">Attendance</th></tr></thead>
        <tbody>
          <tr>
            <th style="width:25%">Working Days</th><td style="width:25%;text-align:right">${r.workingDays}</td>
            <th style="width:25%">Present Days</th><td style="width:25%;text-align:right">${r.presentDays}</td>
          </tr>
          <tr>
            <th>Leave Days</th><td style="text-align:right">${r.leaveDays}</td>
            <th>Absent Days</th><td style="text-align:right;color:#c62828">${Math.max(0, r.workingDays - r.presentDays - r.leaveDays)}</td>
          </tr>
        </tbody>
      </table>

      <div class="two-col">
        <div>
          <table>
            <thead><tr><th class="sh">Earnings</th><th class="sh" style="text-align:right">Amount (₹)</th></tr></thead>
            <tbody>
              <tr><td>Basic Salary</td><td style="text-align:right">₹${r.baseSalary.toLocaleString("en-IN")}</td></tr>
              ${r.hra > 0 ? `<tr><td>HRA</td><td style="text-align:right">₹${r.hra.toLocaleString("en-IN")}</td></tr>` : ""}
              ${r.da > 0 ? `<tr><td>DA</td><td style="text-align:right">₹${r.da.toLocaleString("en-IN")}</td></tr>` : ""}
              ${r.otherAllowance > 0 ? `<tr><td>Other Allowance</td><td style="text-align:right">₹${r.otherAllowance.toLocaleString("en-IN")}</td></tr>` : ""}
              <tr style="font-weight:bold"><td>Gross Salary</td><td style="text-align:right">₹${r.grossSalary.toLocaleString("en-IN")}</td></tr>
            </tbody>
          </table>
        </div>
        <div>
          <table>
            <thead><tr><th class="sh">Deductions</th><th class="sh" style="text-align:right">Amount (₹)</th></tr></thead>
            <tbody>
              ${r.pf > 0 ? `<tr><td>PF</td><td style="text-align:right" class="ded">₹${r.pf.toLocaleString("en-IN")}</td></tr>` : ""}
              ${r.esi > 0 ? `<tr><td>ESI</td><td style="text-align:right" class="ded">₹${r.esi.toLocaleString("en-IN")}</td></tr>` : ""}
              ${r.otherDeduction > 0 ? `<tr><td>Other</td><td style="text-align:right" class="ded">₹${r.otherDeduction.toLocaleString("en-IN")}</td></tr>` : ""}
              ${r.absentDeduction > 0 ? `<tr><td>Absent Ded.</td><td style="text-align:right" class="ded">₹${r.absentDeduction.toLocaleString("en-IN")}</td></tr>` : ""}
              <tr style="font-weight:bold"><td>Total Deductions</td><td style="text-align:right" class="ded">₹${(r.totalDeductions + r.absentDeduction).toLocaleString("en-IN")}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <table><tfoot><tr class="net">
        <td style="width:55%">NET PAYABLE SALARY</td>
        <td style="text-align:right">₹${r.payableSalary.toLocaleString("en-IN")}</td>
      </tr></tfoot></table>

      <div class="foot">
        <div><div class="line"></div>Employee Signature</div>
        <div><div class="line"></div>Accounts / Cashier</div>
        <div><div class="line"></div>Principal / HOD</div>
      </div>
      </body></html>`);
    win.document.close();
    win.print();
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="flex flex-col">
      {/* Sub-tab bar */}
      <div className="flex gap-1 px-4 lg:px-6 border-b bg-muted/30">
        {PAYROLL_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            data-ocid={`payroll.${tab.id}.tab`}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Setup Tab ──────────────────────────────────────── */}
      {activeTab === "setup" && (
        <div className="p-4 lg:p-6 space-y-4">
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">
              Payroll Setup
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configure salary components for each staff member. Used when
              generating payroll.
            </p>
          </div>

          {activeStaff.length === 0 ? (
            <Card
              className="p-12 text-center"
              data-ocid="payroll.setup.empty_state"
            >
              <Info className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground font-medium">
                No active staff found. Add staff from the Staff Directory tab
                first.
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-3 font-semibold text-muted-foreground">
                        Staff
                      </th>
                      <th className="text-left px-2 py-3 font-semibold text-muted-foreground">
                        Base (₹)
                      </th>
                      <th className="text-left px-2 py-3 font-semibold text-muted-foreground">
                        HRA (₹)
                      </th>
                      <th className="text-left px-2 py-3 font-semibold text-muted-foreground">
                        DA (₹)
                      </th>
                      <th className="text-left px-2 py-3 font-semibold text-muted-foreground hidden xl:table-cell">
                        Other Allow (₹)
                      </th>
                      <th className="text-left px-2 py-3 font-semibold text-muted-foreground">
                        PF (₹)
                      </th>
                      <th className="text-left px-2 py-3 font-semibold text-muted-foreground hidden lg:table-cell">
                        ESI (₹)
                      </th>
                      <th className="text-left px-2 py-3 font-semibold text-muted-foreground hidden lg:table-cell">
                        Other Ded (₹)
                      </th>
                      <th className="text-right px-3 py-3 font-semibold text-muted-foreground">
                        Net (₹)
                      </th>
                      <th className="text-right px-3 py-3 font-semibold text-muted-foreground">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeStaff.map((s) => (
                      <SetupRow
                        key={`${s.id}-${setupKey}`}
                        staff={s}
                        onSaved={() => setSetupKey((k) => k + 1)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <p className="text-xs text-muted-foreground">
            Tip: You can also set payroll components when adding/editing a staff
            member from Staff Directory.
          </p>
        </div>
      )}

      {/* ── Generate Tab ───────────────────────────────────── */}
      {activeTab === "generate" && (
        <div className="p-4 lg:p-6 space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div>
              <h2 className="text-xl font-display font-bold text-foreground">
                Payroll — {academicYear}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Attendance-based salary calculation with leave integration
              </p>
            </div>
            <div className="flex gap-2">
              {monthRecords.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportCSV}
                  data-ocid="payroll.export_button"
                >
                  <Download className="w-4 h-4 mr-1.5" /> Export CSV
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                data-ocid="payroll.settings_button"
              >
                <Settings2 className="w-4 h-4 mr-1.5" />
                Settings
              </Button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <Card className="p-5 border-primary/30 bg-primary/5 space-y-4 max-w-md">
              <p className="font-semibold text-foreground">Payroll Settings</p>
              <div className="space-y-1.5">
                <Label htmlFor="wd-default">
                  Default Working Days per Month
                </Label>
                <Input
                  id="wd-default"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={settingsWd}
                  onChange={(e) =>
                    setSettingsWd(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  className="w-28"
                  data-ocid="payroll.default_wd_input"
                />
                <p className="text-xs text-muted-foreground">
                  Standard is 26 days (6-day week).
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={saveSettings}
                  data-ocid="payroll.save_settings_button"
                >
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

          {/* Month Selector */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-end flex-wrap">
              <div className="space-y-1.5">
                <Label>Select Month</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger
                    className="w-40"
                    data-ocid="payroll.month_select"
                  >
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
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={monthWorkingDays}
                  onChange={(e) =>
                    setMonthWorkingDays(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  className="w-24"
                  data-ocid="payroll.working_days_input"
                />
              </div>

              <Button
                onClick={generatePayroll}
                data-ocid="payroll.generate_button"
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Generate Payroll
              </Button>

              <div className="flex-1 min-w-[180px] max-w-xs">
                <Input
                  placeholder="Search staff…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-ocid="payroll.search_input"
                />
              </div>
            </div>
          </Card>

          {/* No attendance warning */}
          {monthRecords.length > 0 && !hasAttendanceData && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">
                  No Staff Attendance for {selectedMonth}
                </p>
                <p className="text-xs mt-0.5 opacity-80">
                  Mark staff attendance in the Attendance module, then click
                  "Generate Payroll" again to recalculate.
                </p>
              </div>
            </div>
          )}

          {/* Summary */}
          {monthRecords.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Staff", value: String(displayRecords.length) },
                { label: "Total Payable", value: formatCurrency(totalPayable) },
                {
                  label: "Paid",
                  value: formatCurrency(totalPaid),
                  green: true,
                },
                {
                  label: "Pending",
                  value: formatCurrency(totalPending),
                  red: true,
                },
              ].map((c) => (
                <Card className="p-4" key={c.label}>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {c.label}
                  </p>
                  <p
                    className={`text-xl font-bold font-display mt-1 ${
                      c.green
                        ? "text-accent"
                        : c.red
                          ? "text-destructive"
                          : "text-foreground"
                    }`}
                  >
                    {c.value}
                  </p>
                </Card>
              ))}
            </div>
          )}

          {/* Empty state */}
          {monthRecords.length === 0 && (
            <Card className="p-14 text-center" data-ocid="payroll.empty_state">
              <Info className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="font-semibold text-foreground mb-1">
                No Payroll Generated for {selectedMonth} {academicYear}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {activeStaff.length === 0
                  ? "Add staff from the Staff Directory tab first."
                  : `Click "Generate Payroll" to calculate salaries for all ${activeStaff.length} active staff members.`}
              </p>
              {activeStaff.length > 0 && (
                <Button
                  onClick={generatePayroll}
                  data-ocid="payroll.generate_empty_button"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate Payroll
                </Button>
              )}
            </Card>
          )}

          {/* Payroll table */}
          {displayRecords.length > 0 && (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-3 font-semibold text-muted-foreground">
                        Staff
                      </th>
                      <th className="text-right px-3 py-3 font-semibold text-muted-foreground hidden md:table-cell">
                        Gross
                      </th>
                      <th className="text-center px-3 py-3 font-semibold text-muted-foreground">
                        Work Days
                      </th>
                      <th className="text-center px-3 py-3 font-semibold text-muted-foreground">
                        Present
                      </th>
                      <th className="text-center px-3 py-3 font-semibold text-muted-foreground hidden sm:table-cell">
                        Leave
                      </th>
                      <th className="text-right px-3 py-3 font-semibold text-muted-foreground hidden lg:table-cell">
                        Deductions
                      </th>
                      <th className="text-right px-3 py-3 font-semibold text-muted-foreground">
                        Payable
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
                    {displayRecords.map((r, idx) => (
                      <tr
                        key={r.id}
                        className="hover:bg-muted/30 transition-colors"
                        data-ocid={`payroll.item.${idx + 1}`}
                      >
                        <td className="px-3 py-3">
                          <p className="font-medium text-foreground">
                            {r.staffName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {r.designation} · {r.empId}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-sm hidden md:table-cell">
                          {formatCurrency(r.grossSalary)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {r.workingDays}
                        </td>
                        <td className="px-3 py-3 text-center">
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
                        </td>
                        <td className="px-3 py-3 text-center hidden sm:table-cell">
                          <span
                            className={
                              r.leaveDays > 0
                                ? "text-primary font-medium"
                                : "text-muted-foreground"
                            }
                          >
                            {r.leaveDays}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-sm text-destructive hidden lg:table-cell">
                          {r.totalDeductions + r.absentDeduction > 0
                            ? `-${formatCurrency(r.totalDeductions + r.absentDeduction)}`
                            : "—"}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-semibold text-foreground">
                          {formatCurrency(r.payableSalary)}
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
                                onClick={() => void markPaid(r)}
                                disabled={saving}
                                className="text-accent border-accent/40 hover:bg-accent/10 text-xs h-7"
                                data-ocid={`payroll.mark_paid_button.${idx + 1}`}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" /> Mark
                                Paid
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => printPayslip(r)}
                              aria-label="Print payslip"
                              data-ocid={`payroll.print_button.${idx + 1}`}
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {monthRecords.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Net Payable = (Gross Salary × Present+Leave Days / Working Days) −
              Fixed Deductions. Approved leaves count as present. Half Day = 0.5
              days.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
