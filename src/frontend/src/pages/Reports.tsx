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
import { useState } from "react";
import { useApp } from "../context/AppContext";
import type {
  AttendanceRecord,
  FeeReceipt,
  InventoryItem,
  Staff,
  Student,
  TransportRoute,
} from "../types";
import { CLASSES, MONTHS, formatCurrency, ls } from "../utils/localStorage";

// ─────────────────────────────────────────────
// Report Card definitions
// ─────────────────────────────────────────────

type ReportKey =
  | "students"
  | "finance"
  | "attendance"
  | "examinations"
  | "hr"
  | "transport"
  | "inventory"
  | "fees-due";

interface ReportCardDef {
  key: ReportKey;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const REPORT_CARDS: ReportCardDef[] = [
  {
    key: "students",
    title: "Students Report",
    description: "Class-wise count, gender breakdown, active vs discontinued",
    icon: <Users className="w-6 h-6" />,
    color: "bg-primary/10 text-primary",
  },
  {
    key: "finance",
    title: "Finance Report",
    description: "Total fees collected, month-wise collection, pending dues",
    icon: <IndianRupee className="w-6 h-6" />,
    color: "bg-accent/10 text-accent",
  },
  {
    key: "attendance",
    title: "Attendance Report",
    description: "Class-wise attendance, monthly trend, top absentees",
    icon: <ClipboardList className="w-6 h-6" />,
    color: "bg-blue-100 text-blue-700",
  },
  {
    key: "examinations",
    title: "Examinations Report",
    description: "Saved exam timetables and schedule summary",
    icon: <BookOpen className="w-6 h-6" />,
    color: "bg-purple-100 text-purple-700",
  },
  {
    key: "hr",
    title: "HR Report",
    description: "Total staff, designation-wise count, active vs inactive",
    icon: <GraduationCap className="w-6 h-6" />,
    color: "bg-orange-100 text-orange-700",
  },
  {
    key: "transport",
    title: "Transport Report",
    description: "Routes, student count, driver-wise assignments",
    icon: <Bus className="w-6 h-6" />,
    color: "bg-teal-100 text-teal-700",
  },
  {
    key: "inventory",
    title: "Inventory Report",
    description: "Stock levels, low stock alerts, category-wise value",
    icon: <Package className="w-6 h-6" />,
    color: "bg-yellow-100 text-yellow-700",
  },
  {
    key: "fees-due",
    title: "Fees Due Report",
    description: "Month-wise outstanding, class-wise dues, student details",
    icon: <IndianRupee className="w-6 h-6" />,
    color: "bg-red-100 text-red-700",
  },
];

// ─────────────────────────────────────────────
// Data readers
// ─────────────────────────────────────────────

function useReportData(key: ReportKey, sessionId: string) {
  const students = ls
    .get<Student[]>("students", [])
    .filter((s) => s.sessionId === sessionId);
  const staff = ls.get<Staff[]>("staff", []);
  const receipts = ls
    .get<FeeReceipt[]>("fee_receipts", [])
    .filter((r) => r.sessionId === sessionId && !r.isDeleted);
  const attendance = ls
    .get<AttendanceRecord[]>("attendance", [])
    .filter((r) => r.sessionId === sessionId);
  const transport = ls.get<TransportRoute[]>("transport", []);
  const inventory = ls.get<InventoryItem[]>("inventory_items", []);

  switch (key) {
    case "students": {
      const active = students.filter((s) => s.status === "active");
      const discontinued = students.filter((s) => s.status === "discontinued");
      const byClass: Record<string, number> = {};
      for (const cls of CLASSES) {
        const count = active.filter((s) => s.class === cls).length;
        if (count > 0) byClass[cls] = count;
      }
      const byGender = {
        Male: active.filter((s) => s.gender === "Male").length,
        Female: active.filter((s) => s.gender === "Female").length,
        Other: active.filter((s) => s.gender === "Other").length,
      };
      return {
        total: students.length,
        active: active.length,
        discontinued: discontinued.length,
        byClass,
        byGender,
      };
    }
    case "finance": {
      const totalCollected = receipts.reduce(
        (sum, r) => sum + r.totalAmount,
        0,
      );
      const byMonth: Record<string, number> = {};
      for (const r of receipts) {
        const m = new Date(r.date).toLocaleString("en-IN", {
          month: "short",
          year: "numeric",
        });
        byMonth[m] = (byMonth[m] ?? 0) + r.totalAmount;
      }
      const modes: Record<string, number> = {};
      for (const r of receipts) {
        modes[r.paymentMode] = (modes[r.paymentMode] ?? 0) + r.totalAmount;
      }
      return { totalCollected, byMonth, modes, receiptCount: receipts.length };
    }
    case "attendance": {
      const studentRecords = attendance.filter((r) => r.type === "student");
      const presentCount = studentRecords.filter(
        (r) => r.status === "Present",
      ).length;
      const absentCount = studentRecords.filter(
        (r) => r.status === "Absent",
      ).length;
      const totalRecords = studentRecords.length;
      const pct =
        totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;
      const byClass: Record<string, { present: number; absent: number }> = {};
      for (const r of studentRecords) {
        if (!r.class) continue;
        if (!byClass[r.class]) byClass[r.class] = { present: 0, absent: 0 };
        if (r.status === "Present") byClass[r.class].present++;
        else byClass[r.class].absent++;
      }
      // Top 5 absentees
      const absenteeMap: Record<string, number> = {};
      for (const r of studentRecords.filter(
        (r) => r.status === "Absent" && r.studentId,
      )) {
        absenteeMap[r.studentId!] = (absenteeMap[r.studentId!] ?? 0) + 1;
      }
      const topAbsentees = Object.entries(absenteeMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, count]) => ({
          name: students.find((s) => s.id === id)?.fullName ?? id,
          count,
        }));
      return {
        presentCount,
        absentCount,
        totalRecords,
        pct,
        byClass,
        topAbsentees,
      };
    }
    case "examinations": {
      const timetables = ls.get<
        {
          id: string;
          name: string;
          startDate: string;
          endDate: string;
          classes: string[];
          isSaved: boolean;
        }[]
      >("exam_timetables", []);
      return {
        timetables,
        total: timetables.length,
        saved: timetables.filter((t) => t.isSaved).length,
      };
    }
    case "hr": {
      const active = staff.filter((s) => s.status !== "inactive");
      const inactive = staff.filter((s) => s.status === "inactive");
      const byDesig: Record<string, number> = {};
      for (const s of staff) {
        const d = s.designation || "Unknown";
        byDesig[d] = (byDesig[d] ?? 0) + 1;
      }
      return {
        total: staff.length,
        active: active.length,
        inactive: inactive.length,
        byDesig,
      };
    }
    case "transport": {
      const totalStudentsWithTransport = students.filter(
        (s) => s.transportId || s.transportRoute || s.transportBusNo,
      ).length;
      const byRoute: Record<string, number> = {};
      for (const r of transport) {
        byRoute[r.routeName] = (r.students ?? []).length;
      }
      return {
        totalRoutes: transport.length,
        totalStudentsWithTransport,
        byRoute,
        transport,
      };
    }
    case "inventory": {
      const totalItems = inventory.length;
      const lowStock = inventory.filter((i) => i.quantity <= 5);
      const byCategory: Record<string, { count: number; value: number }> = {};
      for (const item of inventory) {
        const cat = item.category || "Uncategorized";
        if (!byCategory[cat]) byCategory[cat] = { count: 0, value: 0 };
        byCategory[cat].count++;
        byCategory[cat].value += item.quantity * item.purchasePrice;
      }
      const totalValue = inventory.reduce(
        (s, i) => s + i.quantity * i.purchasePrice,
        0,
      );
      return { totalItems, lowStock, byCategory, totalValue };
    }
    case "fees-due": {
      const paidByStudent: Record<string, Set<string>> = {};
      for (const r of receipts) {
        if (!paidByStudent[r.studentId]) paidByStudent[r.studentId] = new Set();
        for (const item of r.items) paidByStudent[r.studentId].add(item.month);
      }
      const dueStudents = students
        .filter((s) => s.status === "active")
        .map((s) => {
          const paid = paidByStudent[s.id] ?? new Set<string>();
          const unpaid = MONTHS.filter((m) => !paid.has(m));
          return { ...s, unpaidMonths: unpaid };
        })
        .filter((s) => s.unpaidMonths.length > 0);

      const byMonth: Record<string, number> = {};
      for (const s of dueStudents) {
        for (const m of s.unpaidMonths) {
          byMonth[m] = (byMonth[m] ?? 0) + 1;
        }
      }
      const byClass: Record<string, number> = {};
      for (const s of dueStudents) {
        byClass[s.class] = (byClass[s.class] ?? 0) + 1;
      }
      return {
        dueStudents,
        byMonth,
        byClass,
        totalDueStudents: dueStudents.length,
      };
    }
    default:
      return {};
  }
}

// ─────────────────────────────────────────────
// Report views
// ─────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="p-4 bg-muted/30 rounded-xl space-y-0.5">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm font-medium text-foreground">{label}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ReportView({
  reportKey,
  sessionId,
}: { reportKey: ReportKey; sessionId: string }) {
  const data = useReportData(reportKey, sessionId);

  function exportCSV(rows: string[][], filename: string) {
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  function printReport() {
    window.print();
  }

  if (reportKey === "students") {
    const d = data as ReturnType<typeof useReportData> & {
      total: number;
      active: number;
      discontinued: number;
      byClass: Record<string, number>;
      byGender: Record<string, number>;
    };
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard label="Total Students" value={d.total} />
          <StatCard label="Active" value={d.active} sub="Currently enrolled" />
          <StatCard
            label="Discontinued"
            value={d.discontinued}
            sub="Left / Passed Out"
          />
          <StatCard label="Male" value={d.byGender?.Male ?? 0} />
          <StatCard label="Female" value={d.byGender?.Female ?? 0} />
          <StatCard label="Other" value={d.byGender?.Other ?? 0} />
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Class
                </th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                  Students
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(d.byClass ?? {}).map(([cls, count]) => (
                <tr
                  key={cls}
                  className="border-t border-border hover:bg-muted/20"
                >
                  <td className="px-4 py-2.5 font-medium">Class {cls}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Badge variant="secondary">{count}</Badge>
                  </td>
                </tr>
              ))}
              {Object.keys(d.byClass ?? {}).length === 0 && (
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No student data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={printReport}
            className="gap-1.5"
          >
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportCSV(
                [
                  ["Class", "Count"],
                  ...Object.entries(d.byClass ?? {}).map(([k, v]) => [
                    k,
                    String(v),
                  ]),
                ],
                "students-report.csv",
              )
            }
            className="gap-1.5"
          >
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>
    );
  }

  if (reportKey === "finance") {
    const d = data as {
      totalCollected: number;
      byMonth: Record<string, number>;
      modes: Record<string, number>;
      receiptCount: number;
    };
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard
            label="Total Collected"
            value={formatCurrency(d.totalCollected ?? 0)}
            sub="This session"
          />
          <StatCard label="Total Receipts" value={d.receiptCount ?? 0} />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                    Month
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                    Collected
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(d.byMonth ?? {}).map(([m, amt]) => (
                  <tr
                    key={m}
                    className="border-t border-border hover:bg-muted/20"
                  >
                    <td className="px-4 py-2.5">{m}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-accent">
                      {formatCurrency(amt)}
                    </td>
                  </tr>
                ))}
                {Object.keys(d.byMonth ?? {}).length === 0 && (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No receipts yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                    Payment Mode
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(d.modes ?? {}).map(([mode, amt]) => (
                  <tr
                    key={mode}
                    className="border-t border-border hover:bg-muted/20"
                  >
                    <td className="px-4 py-2.5">{mode}</td>
                    <td className="px-4 py-2.5 text-right font-medium">
                      {formatCurrency(amt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={printReport}
            className="gap-1.5"
          >
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportCSV(
                [
                  ["Month", "Amount"],
                  ...Object.entries(d.byMonth ?? {}).map(([k, v]) => [
                    k,
                    String(v),
                  ]),
                ],
                "finance-report.csv",
              )
            }
            className="gap-1.5"
          >
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>
    );
  }

  if (reportKey === "attendance") {
    const d = data as {
      presentCount: number;
      absentCount: number;
      totalRecords: number;
      pct: number;
      byClass: Record<string, { present: number; absent: number }>;
      topAbsentees: { name: string; count: number }[];
    };
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Overall Attendance" value={`${d.pct ?? 0}%`} />
          <StatCard label="Present Records" value={d.presentCount ?? 0} />
          <StatCard label="Absent Records" value={d.absentCount ?? 0} />
          <StatCard label="Total Records" value={d.totalRecords ?? 0} />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                    Class
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                    Present
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                    Absent
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(d.byClass ?? {}).map(
                  ([cls, { present, absent }]) => (
                    <tr
                      key={cls}
                      className="border-t border-border hover:bg-muted/20"
                    >
                      <td className="px-4 py-2.5 font-medium">Class {cls}</td>
                      <td className="px-4 py-2.5 text-right text-accent">
                        {present}
                      </td>
                      <td className="px-4 py-2.5 text-right text-destructive">
                        {absent}
                      </td>
                    </tr>
                  ),
                )}
                {Object.keys(d.byClass ?? {}).length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No attendance records
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <p className="px-4 py-2.5 font-semibold text-sm text-muted-foreground border-b border-border">
              Top Absentees
            </p>
            <table className="w-full text-sm">
              <tbody>
                {(d.topAbsentees ?? []).map(({ name, count }) => (
                  <tr
                    key={name}
                    className="border-t border-border hover:bg-muted/20"
                  >
                    <td className="px-4 py-2.5">{name}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Badge
                        variant="secondary"
                        className="bg-red-100 text-red-700"
                      >
                        {count} absent
                      </Badge>
                    </td>
                  </tr>
                ))}
                {(d.topAbsentees ?? []).length === 0 && (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No absences recorded
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={printReport}
            className="gap-1.5"
          >
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportCSV(
                [
                  ["Class", "Present", "Absent"],
                  ...Object.entries(d.byClass ?? {}).map(([k, v]) => [
                    k,
                    String(v.present),
                    String(v.absent),
                  ]),
                ],
                "attendance-report.csv",
              )
            }
            className="gap-1.5"
          >
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>
    );
  }

  if (reportKey === "examinations") {
    const d = data as {
      timetables: {
        id: string;
        name: string;
        startDate: string;
        endDate: string;
        classes: string[];
        isSaved: boolean;
      }[];
      total: number;
      saved: number;
    };
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total Exams" value={d.total ?? 0} />
          <StatCard label="Saved Timetables" value={d.saved ?? 0} />
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Exam Name
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Start
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  End
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Classes
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {(d.timetables ?? []).map((t) => (
                <tr
                  key={t.id}
                  className="border-t border-border hover:bg-muted/20"
                >
                  <td className="px-4 py-2.5 font-medium">{t.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {t.startDate || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {t.endDate || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {(t.classes ?? []).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={t.isSaved ? "default" : "secondary"}>
                      {t.isSaved ? "Saved" : "Draft"}
                    </Badge>
                  </td>
                </tr>
              ))}
              {(d.timetables ?? []).length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No exam timetables created
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (reportKey === "hr") {
    const d = data as {
      total: number;
      active: number;
      inactive: number;
      byDesig: Record<string, number>;
    };
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Total Staff" value={d.total ?? 0} />
          <StatCard label="Active" value={d.active ?? 0} />
          <StatCard label="Inactive" value={d.inactive ?? 0} />
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Designation
                </th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                  Count
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(d.byDesig ?? {}).map(([des, count]) => (
                <tr
                  key={des}
                  className="border-t border-border hover:bg-muted/20"
                >
                  <td className="px-4 py-2.5 font-medium">{des}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Badge variant="secondary">{count}</Badge>
                  </td>
                </tr>
              ))}
              {Object.keys(d.byDesig ?? {}).length === 0 && (
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No staff records
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={printReport}
            className="gap-1.5"
          >
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportCSV(
                [
                  ["Designation", "Count"],
                  ...Object.entries(d.byDesig ?? {}).map(([k, v]) => [
                    k,
                    String(v),
                  ]),
                ],
                "hr-report.csv",
              )
            }
            className="gap-1.5"
          >
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>
    );
  }

  if (reportKey === "transport") {
    const d = data as {
      totalRoutes: number;
      totalStudentsWithTransport: number;
      byRoute: Record<string, number>;
      transport: TransportRoute[];
    };
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total Routes" value={d.totalRoutes ?? 0} />
          <StatCard
            label="Students Using Transport"
            value={d.totalStudentsWithTransport ?? 0}
          />
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Route
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Bus No.
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Driver
                </th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                  Students
                </th>
              </tr>
            </thead>
            <tbody>
              {(d.transport ?? []).map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-border hover:bg-muted/20"
                >
                  <td className="px-4 py-2.5 font-medium">{r.routeName}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {r.busNo}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {r.driverName}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Badge variant="secondary">
                      {(r.students ?? []).length}
                    </Badge>
                  </td>
                </tr>
              ))}
              {(d.transport ?? []).length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No transport routes configured
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (reportKey === "inventory") {
    const d = data as {
      totalItems: number;
      lowStock: InventoryItem[];
      byCategory: Record<string, { count: number; value: number }>;
      totalValue: number;
    };
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard label="Total Items" value={d.totalItems ?? 0} />
          <StatCard
            label="Total Stock Value"
            value={formatCurrency(d.totalValue ?? 0)}
          />
          <StatCard
            label="Low Stock Items"
            value={(d.lowStock ?? []).length}
            sub="≤ 5 units"
          />
        </div>
        {(d.lowStock ?? []).length > 0 && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
            <p className="text-sm font-semibold text-destructive mb-2">
              ⚠️ Low Stock Alert
            </p>
            <div className="flex flex-wrap gap-2">
              {(d.lowStock ?? []).map((item) => (
                <Badge key={item.id} variant="destructive" className="text-xs">
                  {item.name} ({item.quantity} {item.unit})
                </Badge>
              ))}
            </div>
          </div>
        )}
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Category
                </th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                  Items
                </th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                  Stock Value
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(d.byCategory ?? {}).map(
                ([cat, { count, value }]) => (
                  <tr
                    key={cat}
                    className="border-t border-border hover:bg-muted/20"
                  >
                    <td className="px-4 py-2.5 font-medium">{cat}</td>
                    <td className="px-4 py-2.5 text-right">{count}</td>
                    <td className="px-4 py-2.5 text-right font-medium">
                      {formatCurrency(value)}
                    </td>
                  </tr>
                ),
              )}
              {Object.keys(d.byCategory ?? {}).length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No inventory items
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (reportKey === "fees-due") {
    const d = data as {
      dueStudents: (Student & { unpaidMonths: string[] })[];
      byMonth: Record<string, number>;
      byClass: Record<string, number>;
      totalDueStudents: number;
    };
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard
            label="Students with Dues"
            value={d.totalDueStudents ?? 0}
          />
          <StatCard
            label="Months Tracked"
            value={Object.keys(d.byMonth ?? {}).length}
          />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="overflow-x-auto rounded-xl border border-border">
            <p className="px-4 py-2.5 font-semibold text-sm text-muted-foreground border-b border-border">
              Month-wise Dues Count
            </p>
            <table className="w-full text-sm">
              <tbody>
                {MONTHS.filter((m) => (d.byMonth?.[m] ?? 0) > 0).map((m) => (
                  <tr
                    key={m}
                    className="border-t border-border hover:bg-muted/20"
                  >
                    <td className="px-4 py-2.5">{m}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Badge
                        variant="secondary"
                        className="bg-red-100 text-red-700"
                      >
                        {d.byMonth?.[m]} students due
                      </Badge>
                    </td>
                  </tr>
                ))}
                {Object.keys(d.byMonth ?? {}).length === 0 && (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-8 text-center text-muted-foreground text-xs"
                    >
                      No dues pending
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <p className="px-4 py-2.5 font-semibold text-sm text-muted-foreground border-b border-border">
              Class-wise Dues
            </p>
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(d.byClass ?? {}).map(([cls, count]) => (
                  <tr
                    key={cls}
                    className="border-t border-border hover:bg-muted/20"
                  >
                    <td className="px-4 py-2.5 font-medium">Class {cls}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Badge variant="secondary">{count} students</Badge>
                    </td>
                  </tr>
                ))}
                {Object.keys(d.byClass ?? {}).length === 0 && (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-8 text-center text-muted-foreground text-xs"
                    >
                      No dues pending
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border max-h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Student
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Class
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Adm. No.
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Unpaid Months
                </th>
              </tr>
            </thead>
            <tbody>
              {(d.dueStudents ?? []).map((s) => (
                <tr
                  key={s.id}
                  className="border-t border-border hover:bg-muted/20"
                >
                  <td className="px-4 py-2.5 font-medium">{s.fullName}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {s.class}-{s.section}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                    {s.admNo}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {s.unpaidMonths.map((m) => (
                        <Badge
                          key={m}
                          variant="secondary"
                          className="text-xs bg-red-50 text-red-700 border-red-200"
                        >
                          {m.slice(0, 3)}
                        </Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {(d.dueStudents ?? []).length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    All fees are cleared 🎉
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5"
          >
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const rows = [["Student", "Class", "Adm.No", "Unpaid Months"]];
              for (const s of d.dueStudents ?? []) {
                rows.push([
                  s.fullName,
                  `${s.class}-${s.section}`,
                  s.admNo,
                  s.unpaidMonths.join("|"),
                ]);
              }
              const csv = rows.map((r) => r.join(",")).join("\n");
              const a = document.createElement("a");
              a.href = URL.createObjectURL(
                new Blob([csv], { type: "text/csv" }),
              );
              a.download = "fees-due-report.csv";
              a.click();
            }}
            className="gap-1.5"
          >
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

export default function Reports() {
  const { currentSession } = useApp();
  const [openReport, setOpenReport] = useState<ReportKey | null>(null);
  const sessionId = currentSession?.id ?? "";

  const openDef = REPORT_CARDS.find((r) => r.key === openReport);

  if (openReport && openDef) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpenReport(null)}
            className="gap-1"
          >
            <ChevronRight className="w-4 h-4 rotate-180" /> Back
          </Button>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${openDef.color}`}
          >
            {openDef.icon}
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">
              {openDef.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {openDef.description}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={() => setOpenReport(null)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <ReportView reportKey={openReport} sessionId={sessionId} />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">
            Reports
          </h1>
          <p className="text-sm text-muted-foreground">
            Session: {currentSession?.label ?? "—"} — Click any report to view
            live data
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {REPORT_CARDS.map((card) => (
          <Card
            key={card.key}
            className="hover:shadow-lg transition-all cursor-pointer group border-border hover:border-primary/30"
            onClick={() => setOpenReport(card.key)}
            data-ocid={`report-card-${card.key}`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.color}`}
                >
                  {card.icon}
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-1" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors mb-1">
                {card.title}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
