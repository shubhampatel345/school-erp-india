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
import { CheckCircle, Printer, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Staff } from "../../types";
import {
  MONTHS,
  formatCurrency,
  generateId,
  ls,
} from "../../utils/localStorage";

interface PayrollRecord {
  id: string;
  staffId: string;
  staffName: string;
  designation: string;
  salary: number;
  deductions: number;
  netPay: number;
  month: string;
  year: string;
  status: "paid" | "unpaid";
  paidDate?: string;
}

const CURRENT_YEAR = new Date().getFullYear().toString();

// Default deduction rate (PF 12% of basic)
function calcDeductions(salary: number): number {
  return Math.round(salary * 0.12);
}

export default function Payroll() {
  const staff = ls.get<Staff[]>("staff", []);
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
    MONTHS[
      new Date().getMonth() >= 3
        ? new Date().getMonth() - 3
        : new Date().getMonth() + 9
    ],
  );
  const [records, setRecords] = useState<PayrollRecord[]>(() =>
    ls.get<PayrollRecord[]>("payroll", []),
  );

  const displayRecords = useMemo(() => {
    const existing = records.filter(
      (r) => r.month === selectedMonth && r.year === CURRENT_YEAR,
    );
    const existingIds = new Set(existing.map((r) => r.staffId));
    const generated: PayrollRecord[] = staff
      .filter((s) => !existingIds.has(s.id))
      .map((s) => {
        const salary = s.salary ?? 0;
        const deductions = calcDeductions(salary);
        return {
          id: generateId(),
          staffId: s.id,
          staffName: s.name,
          designation: s.designation,
          salary,
          deductions,
          netPay: salary - deductions,
          month: selectedMonth,
          year: CURRENT_YEAR,
          status: "unpaid" as const,
        };
      });
    return [...existing, ...generated].filter(
      (r) =>
        r.staffName.toLowerCase().includes(search.toLowerCase()) ||
        r.designation.toLowerCase().includes(search.toLowerCase()),
    );
  }, [records, selectedMonth, staff, search]);

  function markPaid(record: PayrollRecord) {
    const updated = {
      ...record,
      status: "paid" as const,
      paidDate: new Date().toLocaleDateString("en-IN"),
    };
    setRecords((prev) => {
      const exists = prev.findIndex((r) => r.id === record.id);
      const newRecords =
        exists >= 0
          ? prev.map((r) => (r.id === record.id ? updated : r))
          : [...prev, updated];
      ls.set("payroll", newRecords);
      return newRecords;
    });
  }

  function printPayslip(r: PayrollRecord) {
    const school = ls.get<{ name: string; address: string; phone: string }>(
      "school_profile",
      { name: "SHUBH SCHOOL ERP", address: "", phone: "" },
    );
    const win = window.open("", "_blank", "width=550,height=700");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html><head><title>Payslip — ${r.staffName}</title>
      <style>
        @page { margin: 16mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; }
        .header { text-align: center; border-bottom: 2px solid #1a1a6b; padding-bottom: 10px; margin-bottom: 16px; }
        .header h1 { margin: 0; font-size: 18px; color: #1a1a6b; }
        .header p { margin: 2px 0; font-size: 12px; color: #555; }
        h3 { text-align: center; font-size: 14px; letter-spacing: 1px; text-transform: uppercase;
             background: #1a1a6b; color: #fff; padding: 6px; margin: 0 0 12px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        td, th { border: 1px solid #ccc; padding: 7px 10px; }
        th { background: #f5f5f5; text-align: left; font-size: 12px; }
        .earnings { background: #e8f5e9; }
        .deductions { background: #fbe9e7; }
        .net { background: #e3f2fd; font-weight: bold; }
        .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; }
        .footer div { text-align: center; }
        .footer .line { border-top: 1px solid #aaa; width: 120px; margin: 0 auto 4px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;
                 background: ${r.status === "paid" ? "#c8e6c9" : "#fff3e0"};
                 color: ${r.status === "paid" ? "#1b5e20" : "#e65100"}; }
      </style></head><body>
        <div class="header">
          <h1>${school.name}</h1>
          <p>${school.address}${school.phone ? ` | Ph: ${school.phone}` : ""}</p>
        </div>
        <h3>Salary Slip — ${r.month} ${r.year}</h3>

        <table>
          <tr><th>Employee Name</th><td>${r.staffName}</td>
              <th>Designation</th><td>${r.designation}</td></tr>
          <tr><th>Month / Year</th><td>${r.month} ${r.year}</td>
              <th>Status</th><td><span class="badge">${r.status === "paid" ? "PAID" : "PENDING"}</span></td></tr>
          ${r.paidDate ? `<tr><th>Paid On</th><td colspan="3">${r.paidDate}</td></tr>` : ""}
        </table>

        <table>
          <thead>
            <tr class="earnings">
              <th style="width:50%">Earnings</th><th style="text-align:right">Amount (₹)</th>
              <th style="width:50%">Deductions</th><th style="text-align:right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Basic Salary</td><td style="text-align:right">₹${r.salary.toLocaleString("en-IN")}</td>
              <td>PF (Employee 12%)</td><td style="text-align:right">₹${r.deductions.toLocaleString("en-IN")}</td>
            </tr>
            <tr>
              <td></td><td></td>
              <td>Total Deductions</td><td style="text-align:right">₹${r.deductions.toLocaleString("en-IN")}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="net">
              <td colspan="3">Net Payable Salary</td>
              <td style="text-align:right">₹${r.netPay.toLocaleString("en-IN")}</td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          <div><div class="line"></div>Employee Signature</div>
          <div><div class="line"></div>Accountant</div>
          <div><div class="line"></div>Principal / HOD</div>
        </div>
      </body></html>
    `);
    win.document.close();
    win.print();
  }

  const totalPaid = displayRecords
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + (r.netPay ?? r.salary), 0);
  const totalPending = displayRecords
    .filter((r) => r.status === "unpaid")
    .reduce((s, r) => s + (r.netPay ?? r.salary), 0);
  const totalDeductions = displayRecords.reduce(
    (s, r) => s + (r.deductions ?? 0),
    0,
  );

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
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
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Summary Cards */}
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
            Paid (Net)
          </p>
          <p className="text-xl font-bold font-display text-accent mt-1">
            {formatCurrency(totalPaid)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Pending (Net)
          </p>
          <p className="text-xl font-bold font-display text-destructive mt-1">
            {formatCurrency(totalPending)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Total Deductions
          </p>
          <p className="text-xl font-bold font-display text-muted-foreground mt-1">
            {formatCurrency(totalDeductions)}
          </p>
        </Card>
      </div>

      {/* Table */}
      {displayRecords.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <p>No staff records. Add staff from the Staff Directory tab.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">
                    Designation
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                    Basic Salary
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground hidden lg:table-cell">
                    Deductions
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                    Net Pay
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayRecords.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-muted/30 transition-colors"
                    data-ocid={`payroll-row-${r.id}`}
                  >
                    <td className="px-4 py-3 font-medium">{r.staffName}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {r.designation}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatCurrency(r.salary)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-destructive hidden lg:table-cell">
                      -{formatCurrency(r.deductions)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                      {formatCurrency(r.netPay)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={r.status === "paid" ? "default" : "secondary"}
                        className={
                          r.status === "paid" ? "bg-accent/20 text-accent" : ""
                        }
                      >
                        {r.status === "paid" ? "Paid" : "Pending"}
                      </Badge>
                      {r.paidDate && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {r.paidDate}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {r.status === "unpaid" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markPaid(r)}
                            className="text-accent border-accent hover:bg-accent/10 text-xs h-7"
                            data-ocid={`pay-staff-${r.id}`}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" /> Mark Paid
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => printPayslip(r)}
                          aria-label="Print payslip"
                          data-ocid={`print-payslip-${r.id}`}
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
      <p className="text-xs text-muted-foreground">
        Deductions: PF (12% of basic salary). Net Pay = Basic − Deductions.
        Print payslip using the print icon per row.
      </p>
    </div>
  );
}
