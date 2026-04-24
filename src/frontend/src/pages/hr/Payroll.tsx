/**
 * Payroll — Direct API rebuild
 * Loads staff from phpApiService.getStaff().
 * Generates payslips via phpApiService.post("payroll/generate", ...).
 * All salary fields: plain text inputs, NO spinners.
 */
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
  CheckCircle,
  Download,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type { StaffRecord } from "../../utils/phpApiService";
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

interface PayrollSetup {
  staffId: string;
  baseSalary: string;
  hra: string;
  da: string;
  otherAllowance: string;
  pf: string;
  esi: string;
  otherDeduction: string;
}

interface GeneratedPayslip {
  staffId: string;
  staffName: string;
  empId: string;
  designation: string;
  month: string;
  year: number;
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

const CURRENT_YEAR = new Date().getFullYear();

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function blankSetup(staffId: string, staff?: StaffRecord): PayrollSetup {
  const salary = String(staff?.salary ?? "");
  return {
    staffId,
    baseSalary: salary,
    hra: "",
    da: "",
    otherAllowance: "",
    pf: "",
    esi: "",
    otherDeduction: "",
  };
}

function computeGross(s: PayrollSetup) {
  return (
    (Number(s.baseSalary) || 0) +
    (Number(s.hra) || 0) +
    (Number(s.da) || 0) +
    (Number(s.otherAllowance) || 0)
  );
}

function computeDeductions(s: PayrollSetup) {
  return (
    (Number(s.pf) || 0) + (Number(s.esi) || 0) + (Number(s.otherDeduction) || 0)
  );
}

export default function Payroll() {
  const { currentUser } = useApp();
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedMonth, setSelectedMonth] = useState(
    () =>
      MONTHS[
        new Date().getMonth() >= 3
          ? new Date().getMonth() - 3
          : new Date().getMonth() + 9
      ],
  );
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);

  const [setups, setSetups] = useState<Record<string, PayrollSetup>>({});
  const [generatedPayslips, setGeneratedPayslips] = useState<
    GeneratedPayslip[]
  >([]);
  const [generating, setGenerating] = useState(false);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"setup" | "payslips">("setup");

  const canWrite =
    currentUser?.role === "superadmin" || currentUser?.role === "admin";

  useEffect(() => {
    setLoading(true);
    phpApiService
      .getStaff()
      .then((data) => {
        setStaff(data);
        // Pre-fill setup from staff salary
        const initial: Record<string, PayrollSetup> = {};
        for (const s of data) {
          initial[s.id] = blankSetup(s.id, s);
        }
        setSetups((prev) => {
          const merged = { ...initial };
          for (const id of Object.keys(prev)) {
            if (merged[id]) merged[id] = { ...merged[id], ...prev[id] };
          }
          return merged;
        });
      })
      .catch(() => toast.error("Failed to load staff"))
      .finally(() => setLoading(false));
  }, []);

  const activeStaff = useMemo(
    () => staff.filter((s) => s.status !== "inactive"),
    [staff],
  );

  const filteredStaff = useMemo(() => {
    const q = search.toLowerCase();
    return activeStaff.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.empId ?? "").toLowerCase().includes(q),
    );
  }, [activeStaff, search]);

  function setSetupField(
    staffId: string,
    key: keyof Omit<PayrollSetup, "staffId">,
    value: string,
  ) {
    setSetups((prev) => ({
      ...prev,
      [staffId]: {
        ...(prev[staffId] ?? blankSetup(staffId)),
        [key]: value.replace(/[^0-9.]/g, ""),
      },
    }));
  }

  function getSetup(staffId: string, s: StaffRecord): PayrollSetup {
    return setups[staffId] ?? blankSetup(staffId, s);
  }

  const handleGenerateAll = useCallback(async () => {
    if (!selectedMonth) {
      toast.error("Select a month");
      return;
    }
    setGenerating(true);
    try {
      const payslips: GeneratedPayslip[] = [];
      for (const s of filteredStaff) {
        const setup = setups[s.id] ?? blankSetup(s.id, s);
        const gross = computeGross(setup);
        const deductions = computeDeductions(setup);
        const payslip: GeneratedPayslip = {
          staffId: s.id,
          staffName: s.name,
          empId: s.empId ?? "",
          designation: s.designation ?? "",
          month: selectedMonth,
          year: selectedYear,
          baseSalary: Number(setup.baseSalary) || 0,
          hra: Number(setup.hra) || 0,
          da: Number(setup.da) || 0,
          otherAllowance: Number(setup.otherAllowance) || 0,
          grossSalary: gross,
          pf: Number(setup.pf) || 0,
          esi: Number(setup.esi) || 0,
          otherDeduction: Number(setup.otherDeduction) || 0,
          totalDeductions: deductions,
          netSalary: gross - deductions,
          status: "generated",
        };
        payslips.push(payslip);
      }

      // Save to server
      await phpApiService.post("payroll/generate", {
        payslips,
        month: selectedMonth,
        year: selectedYear,
      });

      setGeneratedPayslips(payslips);
      setActiveTab("payslips");
      toast.success(
        `Payroll generated for ${payslips.length} staff — ${selectedMonth} ${selectedYear}`,
      );
    } catch {
      toast.error("Failed to generate payroll. Please retry.");
    } finally {
      setGenerating(false);
    }
  }, [filteredStaff, selectedMonth, selectedYear, setups]);
  function printPayslip(payslip: GeneratedPayslip) {
    setPrintingId(payslip.staffId);
    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) {
      toast.error("Popup blocked — please allow popups");
      setPrintingId(null);
      return;
    }
    win.document.write(`
      <!DOCTYPE html><html><head><title>Payslip — ${payslip.staffName}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
        h2 { text-align: center; margin-bottom: 4px; }
        .subtitle { text-align: center; color: #666; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
        th { background: #f5f5f5; }
        .total { font-weight: bold; background: #eef; }
        .net { font-size: 1.2em; font-weight: bold; color: #005; background: #e8f4ff; }
      </style></head><body>
      <h2>PAYSLIP</h2>
      <div class="subtitle">${payslip.month} ${payslip.year}</div>
      <table>
        <tr><th>Name</th><td>${payslip.staffName}</td><th>Emp ID</th><td>${payslip.empId}</td></tr>
        <tr><th>Designation</th><td colspan="3">${payslip.designation}</td></tr>
      </table>
      <table style="margin-top:16px">
        <tr><th>Earnings</th><th>Amount (₹)</th><th>Deductions</th><th>Amount (₹)</th></tr>
        <tr><td>Basic Salary</td><td>${payslip.baseSalary.toLocaleString("en-IN")}</td><td>PF</td><td>${payslip.pf.toLocaleString("en-IN")}</td></tr>
        <tr><td>HRA</td><td>${payslip.hra.toLocaleString("en-IN")}</td><td>ESI</td><td>${payslip.esi.toLocaleString("en-IN")}</td></tr>
        <tr><td>DA</td><td>${payslip.da.toLocaleString("en-IN")}</td><td>Other Deduction</td><td>${payslip.otherDeduction.toLocaleString("en-IN")}</td></tr>
        <tr><td>Other Allowance</td><td>${payslip.otherAllowance.toLocaleString("en-IN")}</td><td></td><td></td></tr>
        <tr class="total"><td>Gross Salary</td><td>${payslip.grossSalary.toLocaleString("en-IN")}</td><td>Total Deductions</td><td>${payslip.totalDeductions.toLocaleString("en-IN")}</td></tr>
        <tr class="net"><td colspan="2">Net Salary</td><td colspan="2">₹${payslip.netSalary.toLocaleString("en-IN")}</td></tr>
      </table>
      <p style="margin-top:30px; font-size:12px; color:#888; text-align:center;">This is a computer-generated payslip.</p>
      <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; };</script>
      </body></html>
    `);
    win.document.close();
    setPrintingId(null);
  }

  function exportCSV() {
    const rows = [
      [
        "Name",
        "Emp ID",
        "Designation",
        "Month",
        "Year",
        "Basic",
        "HRA",
        "DA",
        "Other Allow",
        "Gross",
        "PF",
        "ESI",
        "Other Ded",
        "Total Ded",
        "Net Salary",
      ],
    ];
    for (const p of generatedPayslips) {
      rows.push([
        p.staffName,
        p.empId,
        p.designation,
        p.month,
        String(p.year),
        String(p.baseSalary),
        String(p.hra),
        String(p.da),
        String(p.otherAllowance),
        String(p.grossSalary),
        String(p.pf),
        String(p.esi),
        String(p.otherDeduction),
        String(p.totalDeductions),
        String(p.netSalary),
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    a.download = `payroll_${selectedMonth}_${selectedYear}.csv`;
    a.click();
  }

  const years = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

  return (
    <div className="space-y-5 p-4 lg:p-6">
      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 bg-muted/40 rounded-lg w-fit">
        {[
          { id: "setup", label: "Payroll Setup" },
          { id: "payslips", label: "Generated Payslips" },
        ].map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id as "setup" | "payslips")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            data-ocid={`payroll.${id}.tab`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Month/Year selector + Generate button */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Month
            </Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-36" data-ocid="payroll.month.select">
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
          <div className="flex flex-col gap-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Year
            </Label>
            <Select
              value={String(selectedYear)}
              onValueChange={(v) => setSelectedYear(Number(v))}
            >
              <SelectTrigger className="w-28" data-ocid="payroll.year.select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {canWrite && (
            <Button
              onClick={() => void handleGenerateAll()}
              disabled={generating}
              data-ocid="payroll.generate.button"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" /> Generate Payroll
                </>
              )}
            </Button>
          )}
          {generatedPayslips.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              data-ocid="payroll.export.button"
            >
              <Download className="w-4 h-4 mr-1.5" /> Export CSV
            </Button>
          )}
        </div>
      </Card>

      {/* Setup tab */}
      {activeTab === "setup" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search staff…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-ocid="payroll.search.input"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setLoading(true);
                phpApiService
                  .getStaff()
                  .then(setStaff)
                  .finally(() => setLoading(false));
              }}
              data-ocid="payroll.refresh.button"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>

          {loading ? (
            <div
              className="flex items-center justify-center py-20"
              data-ocid="payroll.loading_state"
            >
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredStaff.length === 0 ? (
            <Card
              className="p-10 text-center border-dashed"
              data-ocid="payroll.empty_state"
            >
              <p className="text-muted-foreground">No active staff found</p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-semibold text-muted-foreground">
                        Staff
                      </th>
                      <th className="text-right p-3 font-semibold text-muted-foreground">
                        Basic (₹)
                      </th>
                      <th className="text-right p-3 font-semibold text-muted-foreground hidden md:table-cell">
                        HRA (₹)
                      </th>
                      <th className="text-right p-3 font-semibold text-muted-foreground hidden md:table-cell">
                        DA (₹)
                      </th>
                      <th className="text-right p-3 font-semibold text-muted-foreground hidden lg:table-cell">
                        Other Allow (₹)
                      </th>
                      <th className="text-right p-3 font-semibold text-muted-foreground hidden lg:table-cell">
                        PF (₹)
                      </th>
                      <th className="text-right p-3 font-semibold text-muted-foreground hidden xl:table-cell">
                        ESI (₹)
                      </th>
                      <th className="text-right p-3 font-semibold text-muted-foreground">
                        Gross (₹)
                      </th>
                      <th className="text-right p-3 font-semibold text-muted-foreground">
                        Net (₹)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.map((s, idx) => {
                      const setup = getSetup(s.id, s);
                      const gross = computeGross(setup);
                      const deductions = computeDeductions(setup);
                      const net = gross - deductions;
                      return (
                        <tr
                          key={s.id}
                          className="border-t border-border hover:bg-muted/20 transition-colors"
                          data-ocid={`payroll.staff-row.${idx + 1}`}
                        >
                          <td className="p-3">
                            <div>
                              <p className="font-medium text-foreground">
                                {s.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {s.empId} · {s.designation}
                              </p>
                            </div>
                          </td>
                          <td className="p-1">
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={setup.baseSalary}
                              onChange={(e) =>
                                setSetupField(
                                  s.id,
                                  "baseSalary",
                                  e.target.value,
                                )
                              }
                              className="h-8 text-right text-sm w-24"
                              placeholder="0"
                              data-ocid={`payroll.basic-salary.${idx + 1}`}
                            />
                          </td>
                          <td className="p-1 hidden md:table-cell">
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={setup.hra}
                              onChange={(e) =>
                                setSetupField(s.id, "hra", e.target.value)
                              }
                              className="h-8 text-right text-sm w-20"
                              placeholder="0"
                              data-ocid={`payroll.hra.${idx + 1}`}
                            />
                          </td>
                          <td className="p-1 hidden md:table-cell">
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={setup.da}
                              onChange={(e) =>
                                setSetupField(s.id, "da", e.target.value)
                              }
                              className="h-8 text-right text-sm w-20"
                              placeholder="0"
                              data-ocid={`payroll.da.${idx + 1}`}
                            />
                          </td>
                          <td className="p-1 hidden lg:table-cell">
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={setup.otherAllowance}
                              onChange={(e) =>
                                setSetupField(
                                  s.id,
                                  "otherAllowance",
                                  e.target.value,
                                )
                              }
                              className="h-8 text-right text-sm w-20"
                              placeholder="0"
                              data-ocid={`payroll.other-allow.${idx + 1}`}
                            />
                          </td>
                          <td className="p-1 hidden lg:table-cell">
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={setup.pf}
                              onChange={(e) =>
                                setSetupField(s.id, "pf", e.target.value)
                              }
                              className="h-8 text-right text-sm w-20"
                              placeholder="0"
                              data-ocid={`payroll.pf.${idx + 1}`}
                            />
                          </td>
                          <td className="p-1 hidden xl:table-cell">
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={setup.esi}
                              onChange={(e) =>
                                setSetupField(s.id, "esi", e.target.value)
                              }
                              className="h-8 text-right text-sm w-20"
                              placeholder="0"
                              data-ocid={`payroll.esi.${idx + 1}`}
                            />
                          </td>
                          <td className="p-3 text-right font-mono text-foreground">
                            {fmt(gross)}
                          </td>
                          <td
                            className={`p-3 text-right font-mono font-semibold ${net < 0 ? "text-destructive" : "text-foreground"}`}
                          >
                            {fmt(net)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Payslips tab */}
      {activeTab === "payslips" && (
        <div className="space-y-4">
          {generatedPayslips.length === 0 ? (
            <Card
              className="p-12 text-center border-dashed"
              data-ocid="payroll.payslips.empty_state"
            >
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-semibold text-foreground">
                No payslips generated yet
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Go to Payroll Setup tab, set salaries, and click "Generate
                Payroll"
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-border flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-accent" />
                <span className="font-semibold text-foreground">
                  {selectedMonth} {selectedYear} — {generatedPayslips.length}{" "}
                  Payslips
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="text-left p-3 font-semibold text-muted-foreground">
                        #
                      </th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">
                        Staff
                      </th>
                      <th className="text-right p-3 font-semibold text-muted-foreground">
                        Gross (₹)
                      </th>
                      <th className="text-right p-3 font-semibold text-muted-foreground hidden md:table-cell">
                        Deductions (₹)
                      </th>
                      <th className="text-right p-3 font-semibold text-muted-foreground">
                        Net (₹)
                      </th>
                      <th className="text-center p-3 font-semibold text-muted-foreground">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedPayslips.map((p, idx) => (
                      <tr
                        key={p.staffId}
                        className="border-t border-border hover:bg-muted/20 transition-colors"
                        data-ocid={`payroll.payslip-row.${idx + 1}`}
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
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={printingId === p.staffId}
                            onClick={() => printPayslip(p)}
                            data-ocid={`payroll.print.${idx + 1}`}
                          >
                            {printingId === p.staffId ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Printer className="w-3.5 h-3.5 mr-1" /> Print
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/40 border-t border-border">
                    <tr>
                      <td className="p-3" colSpan={2}>
                        <span className="font-semibold text-foreground">
                          TOTAL
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-semibold">
                        {fmt(
                          generatedPayslips.reduce(
                            (sum, p) => sum + p.grossSalary,
                            0,
                          ),
                        )}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-destructive hidden md:table-cell">
                        -
                        {fmt(
                          generatedPayslips.reduce(
                            (sum, p) => sum + p.totalDeductions,
                            0,
                          ),
                        )}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-foreground">
                        {fmt(
                          generatedPayslips.reduce(
                            (sum, p) => sum + p.netSalary,
                            0,
                          ),
                        )}
                      </td>
                      <td className="p-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
