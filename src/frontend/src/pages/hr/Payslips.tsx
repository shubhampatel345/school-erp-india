/**
 * Payslips — View, print, and send payslips for HR module
 * Data sourced from payroll_records (localStorage) and staff context
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, MessageSquare, Printer, Search, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type { Staff } from "../../types";
import { MONTHS, formatCurrency, ls } from "../../utils/localStorage";

interface PayrollRecord {
  id: string;
  staffId: string;
  staffName: string;
  empId: string;
  designation: string;
  department?: string;
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

function currentAcademicYear(): string {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  if (m >= 3) return `${y}-${String(y + 1).slice(-2)}`;
  return `${y - 1}-${String(y).slice(-2)}`;
}

interface PayslipViewProps {
  record: PayrollRecord;
  staff: Staff | undefined;
  schoolName: string;
  onClose: () => void;
}

function PayslipView({ record, staff, schoolName, onClose }: PayslipViewProps) {
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payslip - ${record.staffName} - ${record.month} ${record.year}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 0; padding: 16px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            th, td { border: 1px solid #ccc; padding: 6px 10px; }
            th { background: #f3f3f3; font-weight: 600; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 16px; }
            .header h1 { font-size: 18px; margin: 0 0 4px; }
            .header p { margin: 2px 0; font-size: 11px; color: #555; }
            .title { font-size: 14px; font-weight: 700; text-align: center; letter-spacing: 1px; margin: 10px 0; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 14px; }
            .info-item { display: flex; gap: 8px; font-size: 11px; }
            .info-label { font-weight: 600; min-width: 90px; }
            .total-row td { font-weight: 700; background: #f9f9f9; }
            .net-row td { font-weight: 700; font-size: 14px; background: #e8f0fe; }
            .footer { margin-top: 20px; display: flex; justify-content: space-between; font-size: 11px; }
            .status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
            .paid { background: #dcfce7; color: #166534; }
            .pending { background: #fef9c3; color: #854d0e; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 400);
  }

  function handleWhatsApp() {
    const msg = `Payslip for ${record.month} ${record.year}\n\nDear ${record.staffName},\n\nYour salary details:\nGross Salary: ${formatCurrency(record.grossSalary)}\nTotal Deductions: ${formatCurrency(record.totalDeductions)}\nNet Salary: ${formatCurrency(record.payableSalary)}\n\nStatus: ${record.status === "paid" ? "PAID" : "PENDING"}\n\nThank you,\n${schoolName}`;
    const phone = staff?.mobile?.replace(/\D/g, "") ?? "";
    const waUrl = `https://wa.me/${phone.startsWith("91") ? phone : `91${phone}`}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
    toast.success("Opening WhatsApp…");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card rounded-xl shadow-elevated w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Modal header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-foreground font-display">
            Payslip — {record.staffName}
          </h3>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleWhatsApp}
              data-ocid="payslip.whatsapp_button"
            >
              <MessageSquare className="w-4 h-4 mr-1" />
              WhatsApp
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              data-ocid="payslip.print_button"
            >
              <Printer className="w-4 h-4 mr-1" />
              Print
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-1"
              data-ocid="payslip.close_button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable content */}
        <div className="overflow-auto flex-1 p-5">
          <div ref={printRef}>
            {/* School header */}
            <div className="header text-center border-b-2 border-border pb-4 mb-5">
              <h1 className="text-lg font-bold font-display text-foreground">
                {schoolName}
              </h1>
              <p className="text-sm text-muted-foreground">
                Salary Slip for the Month of {record.month} {record.year}
              </p>
            </div>

            {/* Employee info grid */}
            <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
              {[
                ["Employee ID", record.empId],
                ["Employee Name", record.staffName],
                ["Designation", record.designation],
                ["Department", record.department ?? staff?.department ?? "—"],
                ["Month/Year", `${record.month} / ${record.year}`],
                ["Working Days", String(record.workingDays)],
                ["Present Days", String(record.presentDays)],
                [
                  "Leave Days",
                  record.leaveDays > 0 ? String(record.leaveDays) : "0",
                ],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-2">
                  <span className="font-semibold text-muted-foreground min-w-[110px]">
                    {label}:
                  </span>
                  <span className="text-foreground">{value}</span>
                </div>
              ))}
            </div>

            {/* Earnings & Deductions table */}
            <div className="overflow-x-auto rounded-lg border border-border mb-4">
              <table className="w-full text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">
                      Earnings
                    </th>
                    <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">
                      Amount
                    </th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground border-l border-border">
                      Deductions
                    </th>
                    <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      earn: "Basic Salary",
                      earnAmt: record.baseSalary,
                      ded: "Provident Fund (PF)",
                      dedAmt: record.pf,
                    },
                    {
                      earn: "HRA",
                      earnAmt: record.hra,
                      ded: "ESI",
                      dedAmt: record.esi,
                    },
                    {
                      earn: "DA",
                      earnAmt: record.da,
                      ded: "Other Deduction",
                      dedAmt: record.otherDeduction,
                    },
                    {
                      earn: "Other Allowance",
                      earnAmt: record.otherAllowance,
                      ded: "Absent Deduction",
                      dedAmt: record.absentDeduction,
                    },
                  ].map((row) => (
                    <tr key={row.earn} className="border-t border-border">
                      <td className="px-4 py-2 text-foreground">{row.earn}</td>
                      <td className="px-4 py-2 text-right font-mono text-foreground">
                        {row.earnAmt > 0 ? formatCurrency(row.earnAmt) : "—"}
                      </td>
                      <td className="px-4 py-2 text-foreground border-l border-border">
                        {row.ded}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-foreground">
                        {row.dedAmt > 0 ? formatCurrency(row.dedAmt) : "—"}
                      </td>
                    </tr>
                  ))}
                  {/* Totals */}
                  <tr className="border-t-2 border-border bg-muted/40 font-semibold">
                    <td className="px-4 py-2.5 text-foreground">
                      Gross Salary
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-foreground">
                      {formatCurrency(record.grossSalary)}
                    </td>
                    <td className="px-4 py-2.5 text-foreground border-l border-border">
                      Total Deductions
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-destructive">
                      {record.totalDeductions + record.absentDeduction > 0
                        ? formatCurrency(
                            record.totalDeductions + record.absentDeduction,
                          )
                        : "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Net salary */}
            <div className="rounded-lg bg-primary/10 border border-primary/20 px-5 py-4 flex items-center justify-between">
              <span className="font-bold text-foreground text-base">
                Net Salary Payable
              </span>
              <div className="text-right">
                <p className="text-2xl font-bold font-mono text-primary">
                  {formatCurrency(record.payableSalary)}
                </p>
                <Badge
                  variant={record.status === "paid" ? "default" : "secondary"}
                  className="text-xs mt-1"
                >
                  {record.status === "paid"
                    ? `Paid on ${record.paidDate}`
                    : "Pending"}
                </Badge>
              </div>
            </div>

            {/* Signature area */}
            <div className="flex justify-between mt-8 pt-4 border-t border-border text-sm text-muted-foreground">
              <div className="text-center">
                <div className="w-32 border-b border-border mb-1" />
                <p>Employee Signature</p>
              </div>
              <div className="text-center">
                <div className="w-32 border-b border-border mb-1" />
                <p>Authorised Signatory</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Payslips() {
  const { getData } = useApp();
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState("all");
  const [viewRecord, setViewRecord] = useState<PayrollRecord | null>(null);

  const allStaff = getData("staff") as Staff[];
  const records = ls.get<PayrollRecord[]>("payroll_records", []);
  const academicYear = currentAcademicYear();

  const schoolName = useMemo(() => {
    try {
      const raw = localStorage.getItem("school_profile");
      if (raw)
        return (
          (JSON.parse(raw) as { name?: string }).name ?? "SHUBH SCHOOL ERP"
        );
    } catch {}
    return "SHUBH SCHOOL ERP";
  }, []);

  const filtered = useMemo(() => {
    return records
      .filter((r) => r.year === academicYear)
      .filter((r) => filterMonth === "all" || r.month === filterMonth)
      .filter(
        (r) =>
          !search ||
          r.staffName.toLowerCase().includes(search.toLowerCase()) ||
          r.empId.toLowerCase().includes(search.toLowerCase()) ||
          r.designation.toLowerCase().includes(search.toLowerCase()),
      )
      .sort((a, b) => {
        const mi = MONTHS.indexOf(a.month) - MONTHS.indexOf(b.month);
        if (mi !== 0) return mi;
        return a.staffName.localeCompare(b.staffName);
      });
  }, [records, academicYear, filterMonth, search]);

  const viewStaff = viewRecord
    ? allStaff.find((s) => s.id === viewRecord.staffId)
    : undefined;

  if (records.filter((r) => r.year === academicYear).length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold font-display text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Payslips
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              View and print salary slips for all staff
            </p>
          </div>
        </div>
        <Card className="p-10 text-center" data-ocid="payslips.empty_state">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium text-foreground mb-1">No payslips yet</p>
          <p className="text-sm text-muted-foreground">
            Generate payroll from the Payroll tab first to create payslips.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold font-display text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Payslips
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {academicYear} · {filtered.length} records
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search staff…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-ocid="payslips.search_input"
          />
        </div>
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger
            className="w-[160px]"
            data-ocid="payslips.month_select"
          >
            <SelectValue placeholder="All months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {MONTHS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card className="p-8 text-center" data-ocid="payslips.empty_state">
          <p className="text-muted-foreground text-sm">
            No payslips match your filters.
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                  Staff
                </th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">
                  Month
                </th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                  Gross
                </th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">
                  Deductions
                </th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                  Net Pay
                </th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">
                  Status
                </th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((rec, idx) => (
                <tr
                  key={rec.id}
                  className={`border-t border-border transition-colors hover:bg-muted/20 ${idx % 2 === 0 ? "bg-card" : "bg-muted/10"}`}
                  data-ocid={`payslips.item.${idx + 1}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground truncate max-w-[150px]">
                      {rec.staffName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {rec.empId} · {rec.designation}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-foreground hidden sm:table-cell">
                    {rec.month} {rec.year}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">
                    {formatCurrency(rec.grossSalary)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-destructive hidden md:table-cell">
                    {rec.totalDeductions + rec.absentDeduction > 0
                      ? formatCurrency(
                          rec.totalDeductions + rec.absentDeduction,
                        )
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-primary">
                    {formatCurrency(rec.payableSalary)}
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    <Badge
                      variant={rec.status === "paid" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {rec.status === "paid" ? "Paid" : "Pending"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewRecord(rec)}
                      data-ocid={`payslips.view_button.${idx + 1}`}
                    >
                      <FileText className="w-3.5 h-3.5 mr-1" />
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payslip modal */}
      {viewRecord && (
        <PayslipView
          record={viewRecord}
          staff={viewStaff}
          schoolName={schoolName}
          onClose={() => setViewRecord(null)}
        />
      )}
    </div>
  );
}
