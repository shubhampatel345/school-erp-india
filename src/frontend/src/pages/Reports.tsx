import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  Bus,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  GraduationCap,
  IndianRupee,
  Package,
  Printer,
  Search,
  Users,
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
  accent: string;
  iconBg: string;
}

const REPORT_CARDS: ReportCard[] = [
  {
    key: "students",
    title: "Students Report",
    icon: Users,
    description: "Gender breakdown, class-wise count, category analysis",
    accent: "border-l-blue-500",
    iconBg: "bg-blue-50 text-blue-600",
  },
  {
    key: "finance",
    title: "Finance Report",
    icon: IndianRupee,
    description: "Fees collected, month-wise collection trends",
    accent: "border-l-emerald-500",
    iconBg: "bg-emerald-50 text-emerald-600",
  },
  {
    key: "attendance",
    title: "Attendance Report",
    icon: ClipboardList,
    description: "Class-wise attendance %, present/absent breakdown",
    accent: "border-l-violet-500",
    iconBg: "bg-violet-50 text-violet-600",
  },
  {
    key: "examinations",
    title: "Exam Report",
    icon: BookOpen,
    description: "Class averages, toppers, pass/fail rates",
    accent: "border-l-amber-500",
    iconBg: "bg-amber-50 text-amber-600",
  },
  {
    key: "hr",
    title: "HR Report",
    icon: GraduationCap,
    description: "Staff by designation, salary budget summary",
    accent: "border-l-pink-500",
    iconBg: "bg-pink-50 text-pink-600",
  },
  {
    key: "transport",
    title: "Transport Report",
    icon: Bus,
    description: "Students per route, fare collection",
    accent: "border-l-orange-500",
    iconBg: "bg-orange-50 text-orange-600",
  },
  {
    key: "inventory",
    title: "Inventory Report",
    icon: Package,
    description: "Stock levels, low stock alerts, total value",
    accent: "border-l-teal-500",
    iconBg: "bg-teal-50 text-teal-600",
  },
  {
    key: "feesdue",
    title: "Fees Due Report",
    icon: IndianRupee,
    description: "Outstanding dues by class and student",
    accent: "border-l-red-500",
    iconBg: "bg-red-50 text-red-600",
  },
];

// ── Mini bar chart ────────────────────────────────────────────────────────────
function BarChart({
  data,
  color = "oklch(0.55 0.14 200)",
}: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  if (data.length === 0)
    return (
      <p className="text-sm text-muted-foreground py-4">No data to display.</p>
    );
  return (
    <div className="flex items-end gap-1.5 h-36 overflow-x-auto pb-1">
      {data.map((d) => (
        <div
          key={d.label}
          className="flex flex-col items-center gap-1 min-w-[32px] flex-1"
        >
          <span className="text-xs text-muted-foreground font-mono shrink-0">
            {d.value}
          </span>
          <div
            className="w-full rounded-t transition-all"
            style={{ height: `${(d.value / max) * 88}px`, background: color }}
          />
          <span className="text-[10px] text-muted-foreground truncate w-full text-center leading-tight">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── CSV export helper ─────────────────────────────────────────────────────────
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

// ── Shared filter bar ─────────────────────────────────────────────────────────
function FilterBar({
  classFilter,
  setClassFilter,
  sectionFilter,
  setSectionFilter,
  searchQuery,
  setSearchQuery,
  showSearch = true,
}: {
  classFilter: string;
  setClassFilter: (v: string) => void;
  sectionFilter: string;
  setSectionFilter: (v: string) => void;
  searchQuery?: string;
  setSearchQuery?: (v: string) => void;
  showSearch?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Select value={classFilter} onValueChange={setClassFilter}>
        <SelectTrigger
          className="w-32 h-8 text-xs"
          data-ocid="reports.filter.class_select"
        >
          <SelectValue placeholder="All Classes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Classes</SelectItem>
          {CLASSES.map((c) => (
            <SelectItem key={c} value={c}>
              {c === "Nursery" || c === "LKG" || c === "UKG" ? c : `Class ${c}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={sectionFilter} onValueChange={setSectionFilter}>
        <SelectTrigger
          className="w-28 h-8 text-xs"
          data-ocid="reports.filter.section_select"
        >
          <SelectValue placeholder="All Sections" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sections</SelectItem>
          {["A", "B", "C", "D", "E"].map((s) => (
            <SelectItem key={s} value={s}>
              Section {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showSearch && setSearchQuery && (
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search…"
            value={searchQuery ?? ""}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-8 text-xs"
            data-ocid="reports.filter.search_input"
          />
        </div>
      )}
    </div>
  );
}

// ── Students Report ───────────────────────────────────────────────────────────
function StudentsReport({ students }: { students: Student[] }) {
  const [classFilter, setClassFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (classFilter !== "all" && s.class !== classFilter) return false;
      if (sectionFilter !== "all" && s.section !== sectionFilter) return false;
      if (
        search &&
        !s.fullName?.toLowerCase().includes(search.toLowerCase()) &&
        !s.admNo?.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [students, classFilter, sectionFilter, search]);

  const male = filtered.filter((s) => s.gender === "Male").length;
  const female = filtered.filter((s) => s.gender === "Female").length;
  const classCounts = CLASSES.map((c) => ({
    label: c,
    value: filtered.filter((s) => s.class === c).length,
  })).filter((d) => d.value > 0);

  const doExport = () => {
    downloadCSV("students_report.csv", [
      ["Adm No", "Name", "Class", "Section", "Gender", "Category", "Status"],
      ...filtered.map((s) => [
        s.admNo ?? "",
        s.fullName ?? "",
        s.class ?? "",
        s.section ?? "",
        s.gender ?? "",
        s.category ?? "",
        s.status ?? "",
      ]),
    ]);
  };

  return (
    <div className="space-y-4">
      <FilterBar
        classFilter={classFilter}
        setClassFilter={setClassFilter}
        sectionFilter={sectionFilter}
        setSectionFilter={setSectionFilter}
        searchQuery={search}
        setSearchQuery={setSearch}
      />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: filtered.length, color: "text-primary" },
          { label: "Male", value: male, color: "text-blue-600" },
          { label: "Female", value: female, color: "text-pink-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-3 pb-2 text-center">
              <p className={`text-2xl font-bold font-mono ${s.color}`}>
                {s.value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <p className="text-sm font-semibold mb-2 text-foreground">
          Class-wise Count
        </p>
        <BarChart data={classCounts} color="oklch(0.45 0.15 260)" />
      </div>

      <div className="max-h-64 overflow-y-auto border rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-muted sticky top-0">
            <tr>
              {["Adm No", "Name", "Class", "Gender", "Category"].map((h) => (
                <th
                  key={h}
                  className="text-left px-3 py-2 font-semibold text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                  data-ocid="reports.students.empty_state"
                >
                  No students match the selected filters
                </td>
              </tr>
            ) : (
              filtered.slice(0, 200).map((s, i) => (
                <tr
                  key={s.id}
                  className="border-t hover:bg-muted/30 transition-colors"
                  data-ocid={`reports.students.item.${i + 1}`}
                >
                  <td className="px-3 py-1.5 font-mono text-muted-foreground">
                    {s.admNo}
                  </td>
                  <td className="px-3 py-1.5 font-medium">{s.fullName}</td>
                  <td className="px-3 py-1.5">
                    {s.class}
                    {s.section ? `-${s.section}` : ""}
                  </td>
                  <td className="px-3 py-1.5">{s.gender}</td>
                  <td className="px-3 py-1.5">{s.category}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > 200 && (
        <p className="text-xs text-muted-foreground text-right">
          Showing 200 of {filtered.length} — export CSV for full list
        </p>
      )}

      <div className="flex gap-2" data-print-hide>
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

// ── Finance Report ────────────────────────────────────────────────────────────
function FinanceReport({ receipts }: { receipts: FeeReceipt[] }) {
  const now = new Date();
  const [monthFilter, setMonthFilter] = useState("all");

  const filtered = useMemo(() => {
    if (monthFilter === "all") return receipts.filter((r) => !r.isDeleted);
    return receipts.filter((r) => {
      if (r.isDeleted) return false;
      const d = new Date(r.date);
      return d.toLocaleString("en-US", { month: "long" }) === monthFilter;
    });
  }, [receipts, monthFilter]);

  const thisMonthTotal = useMemo(() => {
    return receipts
      .filter((r) => {
        if (r.isDeleted) return false;
        const d = new Date(r.date);
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      })
      .reduce((s, r) => s + (r.paidAmount ?? r.totalAmount ?? 0), 0);
  }, [receipts, now]);

  const sessionTotal = receipts
    .filter((r) => !r.isDeleted)
    .reduce((s, r) => s + (r.paidAmount ?? r.totalAmount ?? 0), 0);

  const monthData = MONTHS.map((m) => ({
    label: m.slice(0, 3),
    value: Math.round(
      receipts
        .filter((r) => {
          if (r.isDeleted) return false;
          const d = new Date(r.date);
          return d.toLocaleString("en-US", { month: "long" }) === m;
        })
        .reduce((s, r) => s + (r.paidAmount ?? r.totalAmount ?? 0), 0),
    ),
  }));

  const filteredTotal = filtered.reduce(
    (s, r) => s + (r.paidAmount ?? r.totalAmount ?? 0),
    0,
  );

  const doExport = () => {
    downloadCSV("finance_report.csv", [
      ["Receipt No", "Student", "Date", "Amount (₹)"],
      ...filtered.map((r) => [
        r.receiptNo ?? "",
        r.studentName ?? "",
        r.date ?? "",
        String(r.paidAmount ?? r.totalAmount ?? 0),
      ]),
    ]);
  };

  const currentMonth = now.toLocaleString("en-IN", { month: "long" });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger
            className="w-36 h-8 text-xs"
            data-ocid="reports.finance.month_select"
          >
            <SelectValue placeholder="All Months" />
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

      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: `${currentMonth} Collection`,
            value: formatCurrency(thisMonthTotal),
            color: "text-emerald-700",
          },
          {
            label: "Session Total",
            value: formatCurrency(sessionTotal),
            color: "text-emerald-700",
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-3 pb-2 text-center">
              <p className={`text-lg font-bold font-mono ${s.color}`}>
                {s.value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {monthFilter !== "all" && (
        <div className="p-3 rounded-lg bg-muted/40 border">
          <p className="text-sm font-semibold text-foreground">
            {monthFilter}: {formatCurrency(filteredTotal)}{" "}
            <span className="text-muted-foreground font-normal text-xs">
              ({filtered.length} receipts)
            </span>
          </p>
        </div>
      )}

      <div>
        <p className="text-sm font-semibold mb-2 text-foreground">
          Monthly Collection (₹)
        </p>
        <BarChart data={monthData} color="oklch(0.55 0.18 145)" />
      </div>

      <div className="max-h-60 overflow-y-auto border rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-muted sticky top-0">
            <tr>
              {["Receipt No", "Student", "Date", "Amount"].map((h) => (
                <th
                  key={h}
                  className="text-left px-3 py-2 font-semibold text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="text-center py-8 text-muted-foreground"
                  data-ocid="reports.finance.empty_state"
                >
                  No receipts found
                </td>
              </tr>
            ) : (
              filtered.slice(0, 100).map((r, i) => (
                <tr
                  key={r.id}
                  className="border-t hover:bg-muted/30"
                  data-ocid={`reports.finance.item.${i + 1}`}
                >
                  <td className="px-3 py-1.5 font-mono">{r.receiptNo}</td>
                  <td className="px-3 py-1.5">{r.studentName}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">
                    {r.date}
                  </td>
                  <td className="px-3 py-1.5 font-mono text-emerald-700 text-right">
                    {formatCurrency(r.paidAmount ?? r.totalAmount ?? 0)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2" data-print-hide>
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

// ── Attendance Report ─────────────────────────────────────────────────────────
function AttendanceReport({
  attendance,
  students,
}: { attendance: AttendanceRecord[]; students: Student[] }) {
  const [classFilter, setClassFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");

  const stdAtt = attendance.filter((a) => a.type === "student");
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (classFilter !== "all" && s.class !== classFilter) return false;
      if (sectionFilter !== "all" && s.section !== sectionFilter) return false;
      return true;
    });
  }, [students, classFilter, sectionFilter]);

  const filteredIds = new Set(filteredStudents.map((s) => s.id));
  const filteredAtt = stdAtt.filter((a) => filteredIds.has(a.studentId ?? ""));

  const present = filteredAtt.filter((a) => a.status === "Present").length;
  const absent = filteredAtt.filter((a) => a.status === "Absent").length;
  const total = filteredAtt.length;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  const classCounts = CLASSES.map((c) => {
    const ids = new Set(students.filter((s) => s.class === c).map((s) => s.id));
    const cAtt = stdAtt.filter((a) => ids.has(a.studentId ?? ""));
    const p = cAtt.filter((a) => a.status === "Present").length;
    return {
      label: c,
      value: cAtt.length > 0 ? Math.round((p / cAtt.length) * 100) : 0,
    };
  }).filter((d) => d.value > 0);

  const doExport = () => {
    downloadCSV("attendance_report.csv", [
      ["Class", "Attendance %"],
      ...classCounts.map((d) => [d.label, `${d.value}%`]),
    ]);
  };

  return (
    <div className="space-y-4">
      <FilterBar
        classFilter={classFilter}
        setClassFilter={setClassFilter}
        sectionFilter={sectionFilter}
        setSectionFilter={setSectionFilter}
        showSearch={false}
      />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Records", value: total, color: "text-violet-700" },
          { label: "Present", value: present, color: "text-emerald-600" },
          { label: "Attendance %", value: `${pct}%`, color: "text-primary" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-3 pb-2 text-center">
              <p className={`text-2xl font-bold font-mono ${s.color}`}>
                {s.value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {absent > 0 && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
          <span className="font-semibold">{absent}</span> absences recorded
        </div>
      )}

      <div>
        <p className="text-sm font-semibold mb-2 text-foreground">
          Class-wise Attendance %
        </p>
        <BarChart data={classCounts} color="oklch(0.55 0.18 290)" />
      </div>

      <div className="flex gap-2" data-print-hide>
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

// ── Exam Report ───────────────────────────────────────────────────────────────
function ExaminationsReport() {
  return (
    <div className="space-y-4">
      <div
        className="flex flex-col items-center py-10 text-muted-foreground"
        data-ocid="reports.examinations.empty_state"
      >
        <BookOpen className="w-12 h-12 mb-3 opacity-20" />
        <p className="font-medium">No exam results yet</p>
        <p className="text-xs mt-1">
          Exam results will appear here once marks are entered in the
          Examinations module.
        </p>
      </div>
      <div className="flex gap-2" data-print-hide>
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

// ── HR Report ─────────────────────────────────────────────────────────────────
function HRReport({ staff }: { staff: Staff[] }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search) return staff;
    const q = search.toLowerCase();
    return staff.filter(
      (s) =>
        s.fullName?.toLowerCase().includes(q) ||
        s.designation?.toLowerCase().includes(q),
    );
  }, [staff, search]);

  const byDesig = staff.reduce<Record<string, number>>((acc, s) => {
    const d = s.designation || "Unknown";
    acc[d] = (acc[d] ?? 0) + 1;
    return acc;
  }, {});
  const desigData = Object.entries(byDesig)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const totalSalary = staff.reduce((s, st) => s + (st.salary ?? 0), 0);

  const doExport = () => {
    downloadCSV("hr_report.csv", [
      ["Emp ID", "Name", "Designation", "Department", "Salary (₹)", "Mobile"],
      ...filtered.map((s) => [
        s.empId ?? "",
        s.fullName ?? "",
        s.designation ?? "",
        s.department ?? "",
        String(s.salary ?? 0),
        s.mobile ?? "",
      ]),
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-xs">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search staff…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-7 h-8 text-xs"
          data-ocid="reports.hr.search_input"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-3 pb-2 text-center">
            <p className="text-2xl font-bold font-mono text-pink-600">
              {staff.length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Staff</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-2 text-center">
            <p className="text-lg font-bold font-mono text-pink-600">
              {formatCurrency(totalSalary)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Salary Budget
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <p className="text-sm font-semibold mb-2 text-foreground">
          Staff by Designation
        </p>
        <BarChart data={desigData} color="oklch(0.6 0.22 350)" />
      </div>

      <div className="max-h-60 overflow-y-auto border rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-muted sticky top-0">
            <tr>
              {["Emp ID", "Name", "Designation", "Salary"].map((h) => (
                <th
                  key={h}
                  className="text-left px-3 py-2 font-semibold text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="text-center py-6 text-muted-foreground"
                  data-ocid="reports.hr.empty_state"
                >
                  No staff found
                </td>
              </tr>
            ) : (
              filtered.map((s, i) => (
                <tr
                  key={s.id}
                  className="border-t hover:bg-muted/30"
                  data-ocid={`reports.hr.item.${i + 1}`}
                >
                  <td className="px-3 py-1.5 font-mono text-muted-foreground">
                    {s.empId}
                  </td>
                  <td className="px-3 py-1.5 font-medium">{s.fullName}</td>
                  <td className="px-3 py-1.5">{s.designation}</td>
                  <td className="px-3 py-1.5 font-mono text-right">
                    {formatCurrency(s.salary ?? 0)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2" data-print-hide>
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

// ── Transport Report ──────────────────────────────────────────────────────────
function TransportReport({
  routes,
  students,
}: { routes: TransportRoute[]; students: Student[] }) {
  const routeData = routes.map((r) => ({
    route: r,
    count: students.filter(
      (s) => s.transportId === r.id || s.transportRoute === r.routeName,
    ).length,
  }));

  const doExport = () => {
    downloadCSV("transport_report.csv", [
      ["Route Name", "Bus No", "Driver", "Students"],
      ...routeData.map((d) => [
        d.route.routeName ?? "",
        d.route.busNo ?? "",
        d.route.driverName ?? "",
        String(d.count),
      ]),
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-3 pb-2 text-center">
            <p className="text-2xl font-bold font-mono text-orange-600">
              {routes.length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Routes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-2 text-center">
            <p className="text-2xl font-bold font-mono text-orange-600">
              {routeData.reduce((s, d) => s + d.count, 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Students Using Transport
            </p>
          </CardContent>
        </Card>
      </div>

      {routeData.length > 0 ? (
        <>
          <div>
            <p className="text-sm font-semibold mb-2 text-foreground">
              Students per Route
            </p>
            <BarChart
              data={routeData.map((d) => ({
                label: d.route.routeName ?? d.route.busNo,
                value: d.count,
              }))}
              color="oklch(0.65 0.18 55)"
            />
          </div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  {["Route", "Bus No", "Driver", "Students"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2 font-semibold text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {routeData.map((d, i) => (
                  <tr
                    key={d.route.id}
                    className="border-t hover:bg-muted/30"
                    data-ocid={`reports.transport.item.${i + 1}`}
                  >
                    <td className="px-3 py-2 font-medium">
                      {d.route.routeName}
                    </td>
                    <td className="px-3 py-2 font-mono">{d.route.busNo}</td>
                    <td className="px-3 py-2">{d.route.driverName}</td>
                    <td className="px-3 py-2 font-mono text-right">
                      {d.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div
          className="text-center py-10 text-muted-foreground"
          data-ocid="reports.transport.empty_state"
        >
          <Bus className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p>No routes configured yet.</p>
          <p className="text-xs mt-1">Add routes in the Transport module.</p>
        </div>
      )}

      <div className="flex gap-2" data-print-hide>
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

// ── Inventory Report ──────────────────────────────────────────────────────────
function InventoryReport({ items }: { items: InventoryItem[] }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.name?.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q),
    );
  }, [items, search]);

  const lowStock = items.filter((i) => i.quantity <= 5);
  const totalValue = items.reduce(
    (s, i) => s + (i.quantity ?? 0) * (i.sellPrice ?? 0),
    0,
  );
  const catData = Object.entries(
    items.reduce<Record<string, number>>((acc, i) => {
      acc[i.category] = (acc[i.category] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const doExport = () => {
    downloadCSV("inventory_report.csv", [
      ["Name", "Category", "Quantity", "Sell Price (₹)", "Total Value (₹)"],
      ...filtered.map((i) => [
        i.name,
        i.category,
        String(i.quantity),
        String(i.sellPrice ?? 0),
        String((i.quantity ?? 0) * (i.sellPrice ?? 0)),
      ]),
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-xs">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search items…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-7 h-8 text-xs"
          data-ocid="reports.inventory.search_input"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Items", value: items.length, color: "text-teal-600" },
          {
            label: "Low Stock",
            value: lowStock.length,
            color: "text-destructive",
          },
          {
            label: "Total Value",
            value: formatCurrency(totalValue),
            color: "text-teal-600",
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-3 pb-2 text-center">
              <p className={`text-lg font-bold font-mono ${s.color}`}>
                {s.value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {lowStock.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-2 text-destructive">
            Low Stock Alert ({lowStock.length} items)
          </p>
          <div className="flex flex-wrap gap-2">
            {lowStock.map((i) => (
              <Badge
                key={i.id}
                variant="destructive"
                className="text-xs font-normal"
              >
                {i.name}: {i.quantity} left
              </Badge>
            ))}
          </div>
        </div>
      )}

      {catData.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-2 text-foreground">
            By Category
          </p>
          <BarChart data={catData} color="oklch(0.58 0.15 175)" />
        </div>
      )}

      <div className="max-h-60 overflow-y-auto border rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-muted sticky top-0">
            <tr>
              {["Name", "Category", "Qty", "Price", "Value"].map((h) => (
                <th
                  key={h}
                  className="text-left px-3 py-2 font-semibold text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-6 text-muted-foreground"
                  data-ocid="reports.inventory.empty_state"
                >
                  No items found
                </td>
              </tr>
            ) : (
              filtered.map((i, idx) => (
                <tr
                  key={i.id}
                  className={`border-t hover:bg-muted/30 ${i.quantity <= 5 ? "bg-red-50/50" : ""}`}
                  data-ocid={`reports.inventory.item.${idx + 1}`}
                >
                  <td className="px-3 py-1.5 font-medium">{i.name}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">
                    {i.category}
                  </td>
                  <td
                    className={`px-3 py-1.5 font-mono ${i.quantity <= 5 ? "text-destructive font-bold" : ""}`}
                  >
                    {i.quantity}
                  </td>
                  <td className="px-3 py-1.5 font-mono">₹{i.sellPrice ?? 0}</td>
                  <td className="px-3 py-1.5 font-mono text-right">
                    {formatCurrency((i.quantity ?? 0) * (i.sellPrice ?? 0))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2" data-print-hide>
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

// ── Fees Due Report ───────────────────────────────────────────────────────────
function FeesDueReport({
  students,
  receipts,
}: { students: Student[]; receipts: FeeReceipt[] }) {
  const [classFilter, setClassFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [search, setSearch] = useState("");

  const dueStudents = useMemo(() => {
    return students
      .filter((s) => {
        if (classFilter !== "all" && s.class !== classFilter) return false;
        if (sectionFilter !== "all" && s.section !== sectionFilter)
          return false;
        if (
          search &&
          !s.fullName?.toLowerCase().includes(search.toLowerCase()) &&
          !s.admNo?.includes(search)
        )
          return false;
        return true;
      })
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
  }, [students, receipts, classFilter, sectionFilter, search]);

  const totalDues = dueStudents.reduce((s, st) => s + st.balance, 0);

  const doExport = () => {
    downloadCSV("fees_due_report.csv", [
      ["Name", "Adm No", "Class", "Section", "Balance (₹)"],
      ...dueStudents.map((s) => [
        s.fullName ?? "",
        s.admNo ?? "",
        s.class ?? "",
        s.section ?? "",
        String(s.balance),
      ]),
    ]);
  };

  return (
    <div className="space-y-4">
      <FilterBar
        classFilter={classFilter}
        setClassFilter={setClassFilter}
        sectionFilter={sectionFilter}
        setSectionFilter={setSectionFilter}
        searchQuery={search}
        setSearchQuery={setSearch}
      />

      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="destructive" className="text-sm px-3 py-1">
          {dueStudents.length} students with dues
        </Badge>
        <span className="text-sm text-muted-foreground">
          Total Outstanding: {formatCurrency(totalDues)}
        </span>
      </div>

      <div className="max-h-72 overflow-y-auto border rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-muted sticky top-0">
            <tr>
              {["Name", "Adm No", "Class", "Balance"].map((h) => (
                <th
                  key={h}
                  className="text-left px-3 py-2 font-semibold text-muted-foreground"
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
                  className="text-center py-10 text-muted-foreground"
                  data-ocid="reports.feesdue.empty_state"
                >
                  🎉 No outstanding dues
                  {(classFilter !== "all" || sectionFilter !== "all") &&
                    " in selected class"}
                </td>
              </tr>
            ) : (
              dueStudents.map((s, i) => (
                <tr
                  key={s.id}
                  className="border-t hover:bg-muted/30"
                  data-ocid={`reports.feesdue.item.${i + 1}`}
                >
                  <td className="px-3 py-2 font-medium">{s.fullName}</td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">
                    {s.admNo}
                  </td>
                  <td className="px-3 py-2">
                    {s.class}
                    {s.section ? `-${s.section}` : ""}
                  </td>
                  <td className="px-3 py-2 font-mono text-destructive font-bold text-right">
                    {formatCurrency(s.balance)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2" data-print-hide>
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

// ── Loading Skeleton ──────────────────────────────────────────────────────────
function ReportSkeleton() {
  return (
    <div
      className="space-y-4 animate-pulse"
      data-ocid="reports.detail.loading_state"
    >
      <div className="flex gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-36 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Reports() {
  const { getData, syncStatus } = useApp();
  const [activeReport, setActiveReport] = useState<ReportKey | null>(null);

  const students = getData("students") as Student[];
  const staff = getData("staff") as Staff[];
  const attendance = getData("attendance") as AttendanceRecord[];
  const receipts = getData("fee_receipts") as FeeReceipt[];
  const routes = getData("transport_routes") as TransportRoute[];
  const items = getData("inventory_items") as InventoryItem[];

  const isLoading = syncStatus.state === "loading";
  const activeCard = REPORT_CARDS.find((c) => c.key === activeReport);

  const renderDetail = () => {
    if (isLoading) return <ReportSkeleton />;
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
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">
            Reports
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {activeReport
              ? "Drill down into detailed data"
              : "Select a report to view detailed analytics"}
          </p>
        </div>
        {activeReport && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveReport(null)}
            data-ocid="reports.back_button"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> All Reports
          </Button>
        )}
      </div>

      {/* Report cards grid */}
      {!activeReport && (
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
          data-ocid="reports.cards.list"
        >
          {REPORT_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => setActiveReport(card.key)}
                data-ocid={`reports.${card.key}.card`}
                className={`text-left p-4 rounded-xl border border-border border-l-4 ${card.accent} bg-card hover:bg-muted/30 hover:shadow-card transition-all cursor-pointer group`}
              >
                <div
                  className={`inline-flex p-2 rounded-lg mb-3 ${card.iconBg}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <p className="font-semibold text-sm text-foreground leading-tight">
                  {card.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">
                  {card.description}
                </p>
                <div className="flex items-center gap-1 mt-3 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>View Report</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Detail panel */}
      {activeReport && (
        <Card className="animate-slide-up" data-ocid="reports.detail.panel">
          <CardHeader className="pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              {activeCard && (
                <div
                  className={`p-2 rounded-lg ${REPORT_CARDS.find((c) => c.key === activeCard.key)?.iconBg ?? ""}`}
                >
                  <activeCard.icon className="w-5 h-5" />
                </div>
              )}
              <CardTitle className="text-base font-display">
                {activeCard?.title}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">{renderDetail()}</CardContent>
        </Card>
      )}

      {/* All report cards as quick nav when inside a report */}
      {activeReport && (
        <div>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-3">
            Other Reports
          </p>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {REPORT_CARDS.filter((c) => c.key !== activeReport).map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => setActiveReport(card.key)}
                  data-ocid={`reports.nav.${card.key}`}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors text-center"
                >
                  <div className={`p-1.5 rounded-md ${card.iconBg}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground leading-tight">
                    {card.title.replace(" Report", "")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
