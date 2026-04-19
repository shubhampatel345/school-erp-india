import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen,
  Bus,
  ChevronRight,
  ClipboardList,
  Download,
  GraduationCap,
  IndianRupee,
  Package,
  Printer,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import type {
  AttendanceRecord,
  FeeReceipt,
  InventoryItem,
  Staff,
  Student,
  TransportRoute,
} from "../types";
import { CLASSES, MONTHS, formatCurrency } from "../utils/localStorage";

type ReportKey =
  | "students"
  | "finance"
  | "attendance"
  | "examinations"
  | "hr"
  | "transport"
  | "inventory"
  | "feesdue";

interface ReportCard {
  key: ReportKey;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
}

const REPORT_CARDS: ReportCard[] = [
  {
    key: "students",
    title: "Students Report",
    icon: Users,
    description: "Total, gender breakdown, class-wise count",
    color: "bg-blue-50 border-blue-200 text-blue-700",
  },
  {
    key: "finance",
    title: "Finance Report",
    icon: IndianRupee,
    description: "Fees collected this month/session, dues",
    color: "bg-green-50 border-green-200 text-green-700",
  },
  {
    key: "attendance",
    title: "Attendance Report",
    icon: ClipboardList,
    description: "Present/absent rates by class",
    color: "bg-purple-50 border-purple-200 text-purple-700",
  },
  {
    key: "examinations",
    title: "Examinations Report",
    icon: BookOpen,
    description: "Pass/fail rates, top performers",
    color: "bg-yellow-50 border-yellow-200 text-yellow-700",
  },
  {
    key: "hr",
    title: "HR Report",
    icon: GraduationCap,
    description: "Staff count by designation, payroll summary",
    color: "bg-pink-50 border-pink-200 text-pink-700",
  },
  {
    key: "transport",
    title: "Transport Report",
    icon: Bus,
    description: "Route-wise student count, fees collected",
    color: "bg-orange-50 border-orange-200 text-orange-700",
  },
  {
    key: "inventory",
    title: "Inventory Report",
    icon: Package,
    description: "Stock levels, items below reorder",
    color: "bg-teal-50 border-teal-200 text-teal-700",
  },
  {
    key: "feesdue",
    title: "Fees Due Report",
    icon: IndianRupee,
    description: "Students with outstanding balance",
    color: "bg-red-50 border-red-200 text-red-700",
  },
];

// ── Simple Bar Chart ──────────────────────────────────────────────────────────
function BarChart({
  data,
  color = "#3b82f6",
}: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d) => (
        <div
          key={d.label}
          className="flex flex-col items-center gap-1 flex-1 min-w-0"
        >
          <span className="text-xs text-muted-foreground font-mono">
            {d.value}
          </span>
          <div
            className="w-full rounded-t transition-all"
            style={{ height: `${(d.value / max) * 80}px`, background: color }}
          />
          <span className="text-xs text-muted-foreground truncate w-full text-center">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── CSV Export ─────────────────────────────────────────────────────────────────
function downloadCSV(filename: string, rows: string[][]): void {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Report Detail Panels ───────────────────────────────────────────────────────

function StudentsReport({ students }: { students: Student[] }) {
  const male = students.filter((s) => s.gender === "Male").length;
  const female = students.filter((s) => s.gender === "Female").length;
  const other = students.length - male - female;
  const classCounts = CLASSES.map((c) => ({
    label: c,
    value: students.filter((s) => s.class === c).length,
  })).filter((d) => d.value > 0);

  const doExport = () => {
    const rows = [
      ["Class", "Count"],
      ...classCounts.map((d) => [d.label, String(d.value)]),
    ];
    downloadCSV("students_report.csv", rows);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Total Students",
            value: students.length,
            color: "text-primary",
          },
          { label: "Male", value: male, color: "text-blue-600" },
          { label: "Female", value: female, color: "text-pink-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3 text-center">
              <p className={`text-2xl font-bold font-mono ${s.color}`}>
                {s.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {other > 0 && (
        <p className="text-xs text-muted-foreground">
          Other/Not specified: {other}
        </p>
      )}
      <div>
        <p className="text-sm font-semibold mb-2 text-foreground">
          Class-wise Count
        </p>
        <BarChart data={classCounts} color="oklch(0.55 0.14 200)" />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={doExport}
          data-ocid="reports.students.export_button"
        >
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.print()}
          data-ocid="reports.students.print_button"
        >
          <Printer className="w-4 h-4 mr-1" /> Print
        </Button>
      </div>
    </div>
  );
}

function FinanceReport({ receipts }: { receipts: FeeReceipt[] }) {
  const now = new Date();
  const currentMonth = now.toLocaleString("en-IN", { month: "long" });
  const thisMonthReceipts = receipts.filter((r) => {
    const d = new Date(r.date);
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  });
  const thisMonthTotal = thisMonthReceipts.reduce(
    (s, r) => s + (r.paidAmount ?? r.totalAmount ?? 0),
    0,
  );
  const sessionTotal = receipts.reduce(
    (s, r) => s + (r.paidAmount ?? r.totalAmount ?? 0),
    0,
  );
  const monthData = MONTHS.map((m) => ({
    label: m.slice(0, 3),
    value: Math.round(
      receipts
        .filter((r) => {
          const d = new Date(r.date);
          const mn = d.toLocaleString("en-US", { month: "long" });
          return mn === m;
        })
        .reduce((s, r) => s + (r.paidAmount ?? r.totalAmount ?? 0), 0),
    ),
  }));

  const doExport = () => {
    const rows = [
      ["Month", "Amount (₹)"],
      ...monthData.map((d) => [d.label, String(d.value)]),
    ];
    downloadCSV("finance_report.csv", rows);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: `This Month (${currentMonth})`,
            value: formatCurrency(thisMonthTotal),
          },
          { label: "This Session Total", value: formatCurrency(sessionTotal) },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-xl font-bold font-mono text-green-700">
                {s.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div>
        <p className="text-sm font-semibold mb-2 text-foreground">
          Monthly Collection
        </p>
        <BarChart data={monthData} color="oklch(0.6 0.18 145)" />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={doExport}
          data-ocid="reports.finance.export_button"
        >
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.print()}
          data-ocid="reports.finance.print_button"
        >
          <Printer className="w-4 h-4 mr-1" /> Print
        </Button>
      </div>
    </div>
  );
}

function AttendanceReport({
  attendance,
  students,
}: { attendance: AttendanceRecord[]; students: Student[] }) {
  const stdAtt = attendance.filter((a) => a.type === "student");
  const present = stdAtt.filter((a) => a.status === "Present").length;
  const total = stdAtt.length;
  const presentPct = total > 0 ? Math.round((present / total) * 100) : 0;
  const classCounts = CLASSES.map((c) => {
    const classStudents = students
      .filter((s) => s.class === c)
      .map((s) => s.id);
    const classAtt = stdAtt.filter((a) =>
      classStudents.includes(a.studentId ?? ""),
    );
    const p = classAtt.filter((a) => a.status === "Present").length;
    return {
      label: c,
      value: classAtt.length > 0 ? Math.round((p / classAtt.length) * 100) : 0,
    };
  }).filter((d) => d.value > 0);

  const doExport = () => {
    const rows = [
      ["Class", "Attendance %"],
      ...classCounts.map((d) => [d.label, String(d.value)]),
    ];
    downloadCSV("attendance_report.csv", rows);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Records", value: total },
          { label: "Present", value: present },
          { label: "Attendance %", value: `${presentPct}%` },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold font-mono text-purple-700">
                {s.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div>
        <p className="text-sm font-semibold mb-2 text-foreground">
          Class-wise Attendance %
        </p>
        <BarChart data={classCounts} color="oklch(0.6 0.18 290)" />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={doExport}
          data-ocid="reports.attendance.export_button"
        >
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.print()}
          data-ocid="reports.attendance.print_button"
        >
          <Printer className="w-4 h-4 mr-1" /> Print
        </Button>
      </div>
    </div>
  );
}

function ExaminationsReport() {
  const doExport = () => {
    downloadCSV("examinations_report.csv", [
      ["Message"],
      ["No exam results data available yet."],
    ]);
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Examination results will appear here once exam marks are entered.
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={doExport}
          data-ocid="reports.examinations.export_button"
        >
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.print()}
          data-ocid="reports.examinations.print_button"
        >
          <Printer className="w-4 h-4 mr-1" /> Print
        </Button>
      </div>
    </div>
  );
}

function HRReport({ staff }: { staff: Staff[] }) {
  const byDesig = staff.reduce<Record<string, number>>((acc, s) => {
    const d = s.designation || "Unknown";
    acc[d] = (acc[d] ?? 0) + 1;
    return acc;
  }, {});
  const desigData = Object.entries(byDesig).map(([label, value]) => ({
    label,
    value,
  }));
  const totalSalary = staff.reduce((s, st) => s + (st.salary ?? 0), 0);

  const doExport = () => {
    const rows = [
      ["Designation", "Count"],
      ...desigData.map((d) => [d.label, String(d.value)]),
    ];
    downloadCSV("hr_report.csv", rows);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold font-mono text-pink-700">
              {staff.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total Staff</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xl font-bold font-mono text-pink-700">
              {formatCurrency(totalSalary)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Total Salary Budget
            </p>
          </CardContent>
        </Card>
      </div>
      <div>
        <p className="text-sm font-semibold mb-2 text-foreground">
          Staff by Designation
        </p>
        <BarChart data={desigData} color="oklch(0.65 0.2 350)" />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={doExport}
          data-ocid="reports.hr.export_button"
        >
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.print()}
          data-ocid="reports.hr.print_button"
        >
          <Printer className="w-4 h-4 mr-1" /> Print
        </Button>
      </div>
    </div>
  );
}

function TransportReport({
  routes,
  students,
}: { routes: TransportRoute[]; students: Student[] }) {
  const routeData = routes.map((r) => ({
    label: r.routeName ?? r.busNo,
    value: students.filter(
      (s) => s.transportId === r.id || s.transportRoute === r.routeName,
    ).length,
  }));

  const doExport = () => {
    const rows = [
      ["Route", "Students"],
      ...routeData.map((d) => [d.label, String(d.value)]),
    ];
    downloadCSV("transport_report.csv", rows);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 pb-3 text-center">
          <p className="text-2xl font-bold font-mono text-orange-700">
            {routes.length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Total Routes</p>
        </CardContent>
      </Card>
      {routeData.length > 0 ? (
        <div>
          <p className="text-sm font-semibold mb-2 text-foreground">
            Students per Route
          </p>
          <BarChart data={routeData} color="oklch(0.65 0.18 55)" />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No routes configured.</p>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={doExport}
          data-ocid="reports.transport.export_button"
        >
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.print()}
          data-ocid="reports.transport.print_button"
        >
          <Printer className="w-4 h-4 mr-1" /> Print
        </Button>
      </div>
    </div>
  );
}

function InventoryReport({ items }: { items: InventoryItem[] }) {
  const lowStock = items.filter((i) => i.quantity <= 5);
  const catData = Object.entries(
    items.reduce<Record<string, number>>((acc, i) => {
      acc[i.category] = (acc[i.category] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([label, value]) => ({ label, value }));

  const doExport = () => {
    const rows = [
      ["Name", "Category", "Quantity", "Sell Price"],
      ...items.map((i) => [
        i.name,
        i.category,
        String(i.quantity),
        String(i.sellPrice),
      ]),
    ];
    downloadCSV("inventory_report.csv", rows);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold font-mono text-teal-700">
              {items.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total Items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold font-mono text-red-600">
              {lowStock.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Low Stock (&le;5)
            </p>
          </CardContent>
        </Card>
      </div>
      {lowStock.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-2 text-foreground">
            Low Stock Items
          </p>
          <div className="space-y-1">
            {lowStock.map((i) => (
              <div
                key={i.id}
                className="flex justify-between text-sm px-3 py-1.5 bg-red-50 rounded border border-red-100"
              >
                <span>{i.name}</span>
                <Badge variant="destructive">{i.quantity} left</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
      {catData.length > 0 && (
        <BarChart data={catData} color="oklch(0.6 0.15 175)" />
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={doExport}
          data-ocid="reports.inventory.export_button"
        >
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.print()}
          data-ocid="reports.inventory.print_button"
        >
          <Printer className="w-4 h-4 mr-1" /> Print
        </Button>
      </div>
    </div>
  );
}

function FeesDueReport({
  students,
  receipts,
}: { students: Student[]; receipts: FeeReceipt[] }) {
  const dueStudents = useMemo(() => {
    return students
      .map((s) => {
        const sReceipts = receipts.filter(
          (r) => r.studentId === s.id && !r.isDeleted,
        );
        const lastBalance =
          sReceipts.length > 0
            ? (sReceipts[sReceipts.length - 1].balance ?? 0)
            : 0;
        return { ...s, balance: lastBalance };
      })
      .filter((s) => s.balance > 0)
      .sort((a, b) => b.balance - a.balance);
  }, [students, receipts]);

  const doExport = () => {
    const rows = [
      ["Name", "Adm No", "Class", "Section", "Balance (₹)"],
      ...dueStudents.map((s) => [
        s.fullName,
        s.admNo,
        s.class,
        s.section,
        String(s.balance),
      ]),
    ];
    downloadCSV("fees_due_report.csv", rows);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Badge variant="destructive" className="text-base px-3 py-1">
          {dueStudents.length} students with dues
        </Badge>
        <span className="text-sm text-muted-foreground">
          Total:{" "}
          {formatCurrency(dueStudents.reduce((s, st) => s + st.balance, 0))}
        </span>
      </div>
      <div className="max-h-72 overflow-y-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-muted sticky top-0">
            <tr>
              {["Name", "Adm No", "Class", "Balance"].map((h) => (
                <th
                  key={h}
                  className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dueStudents.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  No outstanding dues
                </td>
              </tr>
            ) : (
              dueStudents.map((s, i) => (
                <tr
                  key={s.id}
                  className="border-t"
                  data-ocid={`reports.feesdue.item.${i + 1}`}
                >
                  <td className="px-3 py-2">{s.fullName}</td>
                  <td className="px-3 py-2 text-muted-foreground">{s.admNo}</td>
                  <td className="px-3 py-2">
                    {s.class}-{s.section}
                  </td>
                  <td className="px-3 py-2 font-mono text-red-600 font-semibold">
                    {formatCurrency(s.balance)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={doExport}
          data-ocid="reports.feesdue.export_button"
        >
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.print()}
          data-ocid="reports.feesdue.print_button"
        >
          <Printer className="w-4 h-4 mr-1" /> Print
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Reports() {
  const { getData } = useApp();
  const [activeReport, setActiveReport] = useState<ReportKey | null>(null);

  const students = getData("students") as Student[];
  const staff = getData("staff") as Staff[];
  const attendance = getData("attendance") as AttendanceRecord[];
  const receipts = getData("fee_receipts") as FeeReceipt[];
  const routes = getData("transport_routes") as TransportRoute[];
  const items = getData("inventory_items") as InventoryItem[];

  const activeCard = REPORT_CARDS.find((c) => c.key === activeReport);

  const renderDetail = () => {
    switch (activeReport) {
      case "students":
        return <StudentsReport students={students} />;
      case "finance":
        return <FinanceReport receipts={receipts} />;
      case "attendance":
        return <AttendanceReport attendance={attendance} students={students} />;
      case "examinations":
        return <ExaminationsReport />;
      case "hr":
        return <HRReport staff={staff} />;
      case "transport":
        return <TransportReport routes={routes} students={students} />;
      case "inventory":
        return <InventoryReport items={items} />;
      case "feesdue":
        return <FeesDueReport students={students} receipts={receipts} />;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 bg-background min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-display">
          Reports
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Click any report card to view details
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {REPORT_CARDS.map((card) => {
          const Icon = card.icon;
          const isActive = activeReport === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setActiveReport(isActive ? null : card.key)}
              data-ocid={`reports.${card.key}.card`}
              className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${isActive ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card hover:border-primary/40 hover:shadow-sm"}`}
            >
              <div className={`inline-flex p-2 rounded-lg mb-3 ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="font-semibold text-sm text-foreground leading-tight">
                {card.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">
                {card.description}
              </p>
              <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                <span>{isActive ? "Close" : "View"}</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </button>
          );
        })}
      </div>

      {activeReport && (
        <Card data-ocid="reports.detail.panel">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">{activeCard?.title}</CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setActiveReport(null)}
              data-ocid="reports.detail.close_button"
            >
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>{renderDetail()}</CardContent>
        </Card>
      )}
    </div>
  );
}
