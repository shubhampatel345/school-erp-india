/**
 * Payslips — View, print, and send payslips
 * Fetches payslip records from server via payroll/payslips API.
 * Falls back to localStorage payroll_records for backward compat.
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
import {
  FileText,
  Loader2,
  MessageSquare,
  Printer,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import phpApiService from "../../utils/phpApiService";

const MONTHS = [
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
  "January",
  "February",
  "March",
];

const CURRENT_YEAR = new Date().getFullYear();

interface PayslipRecord {
  id: string;
  staffId: string;
  staffName: string;
  empId: string;
  designation: string;
  department?: string;
  month: string;
  year: string | number;
  baseSalary: number;
  hra: number;
  da: number;
  otherAllowance: number;
  grossSalary: number;
  pf: number;
  esi: number;
  otherDeduction: number;
  totalDeductions: number;
  netSalary: number;
  status: "generated" | "paid";
}

function fmt(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

function loadLocalPayslips(): PayslipRecord[] {
  try {
    const raw = localStorage.getItem("payroll_records");
    if (!raw) return [];
    return JSON.parse(raw) as PayslipRecord[];
  } catch {
    return [];
  }
}

export default function Payslips() {
  const [payslips, setPayslips] = useState<PayslipRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState(String(CURRENT_YEAR));
  const [viewing, setViewing] = useState<PayslipRecord | null>(null);

  useEffect(() => {
    setLoading(true);
    phpApiService
      .apiGet<PayslipRecord[]>("payroll/payslips")
      .then((rows) => {
        if (rows && rows.length > 0) {
          setPayslips(rows);
        } else {
          // Fall back to locally stored payslips from Payroll tab
          setPayslips(loadLocalPayslips());
        }
      })
      .catch(() => {
        setPayslips(loadLocalPayslips());
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return payslips.filter((p) => {
      const matchSearch =
        !search ||
        p.staffName.toLowerCase().includes(search.toLowerCase()) ||
        p.empId.toLowerCase().includes(search.toLowerCase());
      const matchMonth = filterMonth === "all" || p.month === filterMonth;
      const matchYear = !filterYear || String(p.year) === filterYear;
      return matchSearch && matchMonth && matchYear;
    });
  }, [payslips, search, filterMonth, filterYear]);

  const years = [
    String(CURRENT_YEAR - 1),
    String(CURRENT_YEAR),
    String(CURRENT_YEAR + 1),
  ];

  function printPayslip(p: PayslipRecord) {
    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) {
      toast.error("Popup blocked — allow popups to print");
      return;
    }
    win.document.write(`
      <!DOCTYPE html><html><head><title>Payslip — ${p.staffName}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:30px;color:#333}
        h2{text-align:center;margin-bottom:4px}
        .sub{text-align:center;color:#666;margin-bottom:20px;font-size:13px}
        table{width:100%;border-collapse:collapse;margin-top:14px}
        th,td{border:1px solid #ccc;padding:8px 12px;text-align:left;font-size:12px}
        th{background:#f5f5f5}
        .total{font-weight:700;background:#f9f9f9}
        .net{font-size:1.1em;font-weight:700;color:#003;background:#e8f0fe}
        .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600}
        .paid{background:#dcfce7;color:#166534}
        .gen{background:#fef9c3;color:#854d0e}
      </style></head><body>
      <h2>PAYSLIP</h2>
      <div class="sub">Month: ${p.month} ${p.year} &nbsp;|&nbsp; Status: <span class="${p.status === "paid" ? "badge paid" : "badge gen"}">${p.status === "paid" ? "PAID" : "GENERATED"}</span></div>
      <table>
        <tr><th>Name</th><td>${p.staffName}</td><th>Emp ID</th><td>${p.empId}</td></tr>
        <tr><th>Designation</th><td>${p.designation}</td><th>Dept</th><td>${p.department ?? "—"}</td></tr>
      </table>
      <table style="margin-top:16px">
        <tr><th>Earnings</th><th>Amount (₹)</th><th>Deductions</th><th>Amount (₹)</th></tr>
        <tr><td>Basic Salary</td><td>${p.baseSalary.toLocaleString("en-IN")}</td><td>PF</td><td>${p.pf.toLocaleString("en-IN")}</td></tr>
        <tr><td>HRA</td><td>${p.hra.toLocaleString("en-IN")}</td><td>ESI</td><td>${p.esi.toLocaleString("en-IN")}</td></tr>
        <tr><td>DA</td><td>${p.da.toLocaleString("en-IN")}</td><td>Other Deduction</td><td>${p.otherDeduction.toLocaleString("en-IN")}</td></tr>
        <tr><td>Other Allowance</td><td>${p.otherAllowance.toLocaleString("en-IN")}</td><td></td><td></td></tr>
        <tr class="total"><td>Gross</td><td>${p.grossSalary.toLocaleString("en-IN")}</td><td>Total Deductions</td><td>${p.totalDeductions.toLocaleString("en-IN")}</td></tr>
        <tr class="net"><td colspan="2">Net Salary</td><td colspan="2">₹${p.netSalary.toLocaleString("en-IN")}</td></tr>
      </table>
      <p style="margin-top:30px;font-size:11px;color:#888;text-align:center">Computer-generated payslip. No signature required.</p>
      <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};</script>
      </body></html>
    `);
    win.document.close();
  }

  function sendWhatsApp(p: PayslipRecord) {
    const msg = `Payslip for ${p.month} ${p.year}\n\nDear ${p.staffName},\n\nGross: ₹${p.grossSalary.toLocaleString("en-IN")}\nDeductions: ₹${p.totalDeductions.toLocaleString("en-IN")}\nNet Salary: ₹${p.netSalary.toLocaleString("en-IN")}\n\nStatus: ${p.status === "paid" ? "PAID" : "GENERATED"}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display font-bold text-foreground">
            Payslips
          </h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} payslip{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search staff…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-ocid="payslips.search.input"
          />
        </div>
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-32" data-ocid="payslips.month.select">
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
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-24" data-ocid="payslips.year.select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div
          className="flex items-center justify-center py-20"
          data-ocid="payslips.loading_state"
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card
          className="p-12 text-center border-dashed"
          data-ocid="payslips.empty_state"
        >
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-semibold text-foreground">No payslips found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Generate payroll from the Payroll Setup tab first
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-3 font-semibold text-muted-foreground">
                    #
                  </th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">
                    Staff
                  </th>
                  <th className="text-left p-3 font-semibold text-muted-foreground hidden sm:table-cell">
                    Month / Year
                  </th>
                  <th className="text-right p-3 font-semibold text-muted-foreground">
                    Gross
                  </th>
                  <th className="text-right p-3 font-semibold text-muted-foreground hidden md:table-cell">
                    Deductions
                  </th>
                  <th className="text-right p-3 font-semibold text-muted-foreground">
                    Net
                  </th>
                  <th className="text-center p-3 font-semibold text-muted-foreground">
                    Status
                  </th>
                  <th className="text-center p-3 font-semibold text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, idx) => (
                  <tr
                    key={p.id}
                    className="border-t border-border hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => setViewing(p)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setViewing(p);
                    }}
                    data-ocid={`payslips.item.${idx + 1}`}
                  >
                    <td className="p-3 text-muted-foreground">{idx + 1}</td>
                    <td className="p-3">
                      <p className="font-medium text-foreground">
                        {p.staffName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.empId} · {p.designation}
                      </p>
                    </td>
                    <td className="p-3 hidden sm:table-cell text-muted-foreground">
                      {p.month} {p.year}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {fmt(p.grossSalary)}
                    </td>
                    <td className="p-3 text-right font-mono text-destructive hidden md:table-cell">
                      -{fmt(p.totalDeductions)}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-foreground">
                      {fmt(p.netSalary)}
                    </td>
                    <td className="p-3 text-center">
                      <Badge
                        variant={p.status === "paid" ? "default" : "secondary"}
                        className={`text-xs ${p.status === "paid" ? "bg-emerald-500/10 text-emerald-700 border-emerald-400/30" : ""}`}
                      >
                        {p.status === "paid" ? "Paid" : "Generated"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div
                        className="flex gap-1 justify-center"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => printPayslip(p)}
                          data-ocid={`payslips.print_button.${idx + 1}`}
                          aria-label="Print"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => sendWhatsApp(p)}
                          data-ocid={`payslips.whatsapp_button.${idx + 1}`}
                          aria-label="WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
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

      {/* View modal */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          data-ocid="payslips.dialog"
        >
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-display font-semibold text-foreground">
                Payslip — {viewing.staffName}
              </h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => printPayslip(viewing)}
                  data-ocid="payslips.print_modal_button"
                >
                  <Printer className="w-4 h-4 mr-1.5" /> Print
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => sendWhatsApp(viewing)}
                  data-ocid="payslips.whatsapp_modal_button"
                >
                  <MessageSquare className="w-4 h-4 mr-1.5" /> WhatsApp
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setViewing(null)}
                  data-ocid="payslips.close_button"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Name", viewing.staffName],
                  ["Emp ID", viewing.empId],
                  ["Designation", viewing.designation],
                  ["Month", `${viewing.month} ${viewing.year}`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-medium text-foreground">{value}</p>
                  </div>
                ))}
              </div>
              <Card className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2.5 font-semibold text-muted-foreground">
                        Earnings
                      </th>
                      <th className="text-right p-2.5 font-semibold text-muted-foreground">
                        ₹
                      </th>
                      <th className="text-left p-2.5 font-semibold text-muted-foreground border-l border-border">
                        Deductions
                      </th>
                      <th className="text-right p-2.5 font-semibold text-muted-foreground">
                        ₹
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {[
                      {
                        e: "Basic",
                        ev: viewing.baseSalary,
                        d: "PF",
                        dv: viewing.pf,
                      },
                      { e: "HRA", ev: viewing.hra, d: "ESI", dv: viewing.esi },
                      {
                        e: "DA",
                        ev: viewing.da,
                        d: "Other",
                        dv: viewing.otherDeduction,
                      },
                      {
                        e: "Other Allow",
                        ev: viewing.otherAllowance,
                        d: "",
                        dv: 0,
                      },
                    ].map((row) => (
                      <tr key={row.e} className="border-t border-border">
                        <td className="p-2.5">{row.e}</td>
                        <td className="p-2.5 text-right font-mono">
                          {row.ev.toLocaleString("en-IN")}
                        </td>
                        <td className="p-2.5 border-l border-border">
                          {row.d}
                        </td>
                        <td className="p-2.5 text-right font-mono">
                          {row.dv > 0 ? row.dv.toLocaleString("en-IN") : ""}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                      <td className="p-2.5">Gross</td>
                      <td className="p-2.5 text-right font-mono">
                        {viewing.grossSalary.toLocaleString("en-IN")}
                      </td>
                      <td className="p-2.5 border-l border-border">
                        Total Ded
                      </td>
                      <td className="p-2.5 text-right font-mono text-destructive">
                        {viewing.totalDeductions.toLocaleString("en-IN")}
                      </td>
                    </tr>
                    <tr className="border-t border-border bg-primary/5">
                      <td
                        className="p-2.5 font-bold text-foreground"
                        colSpan={2}
                      >
                        Net Salary
                      </td>
                      <td
                        className="p-2.5 text-right font-mono font-bold text-primary text-base"
                        colSpan={2}
                      >
                        {fmt(viewing.netSalary)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
