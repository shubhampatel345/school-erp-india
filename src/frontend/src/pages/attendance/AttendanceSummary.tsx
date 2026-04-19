import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  Bus,
  CalendarCheck,
  Download,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import type {
  AttendanceRecord,
  ClassSection,
  Student,
  TransportRoute,
} from "../../types";
import { CLASSES, SECTIONS } from "../../utils/localStorage";

interface AttendanceSummaryProps {
  date: string;
  onDateChange: (d: string) => void;
}

interface ClassSectionRow {
  cls: string;
  section: string;
  total: number;
  present: number;
  absent: number;
  leave: number;
  late: number;
}

function SummaryCard({
  label,
  value,
  sub,
  icon: Icon,
  colorCls,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  colorCls: string;
}) {
  return (
    <Card className="p-5 flex items-start gap-4">
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colorCls}`}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
          {label}
        </p>
        <p className="text-2xl font-bold font-display text-foreground mt-0.5">
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}

interface DrillDownModalProps {
  row: ClassSectionRow;
  date: string;
  students: Student[];
  records: AttendanceRecord[];
  onClose: () => void;
}

function DrillDownModal({
  row,
  date,
  students,
  records,
  onClose,
}: DrillDownModalProps) {
  const classStudents = students.filter(
    (s) => s.class === row.cls && s.section === row.section,
  );

  function getStatus(studentId: string): string {
    const rec = records.find(
      (r) => r.studentId === studentId && r.date === date,
    );
    return rec?.status ?? "Not Marked";
  }

  const statusColor: Record<string, string> = {
    Present: "text-accent",
    Absent: "text-destructive",
    Leave: "text-blue-500",
    Late: "text-amber-500",
    "Half Day": "text-secondary-foreground",
    "Not Marked": "text-muted-foreground",
  };

  return (
    <dialog
      open
      className="fixed inset-0 z-50 bg-transparent border-0 p-0 w-full h-full max-w-none max-h-none flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      onClick={onClose}
      data-ocid="summary.detail-modal.dialog"
    >
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="font-display font-bold text-foreground text-lg">
              Class {row.cls} - Section {row.section}
            </h3>
            <p className="text-sm text-muted-foreground">
              {date} · {classStudents.length} students
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Close"
            data-ocid="summary.detail-modal.close-button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 px-4 py-3 border-b border-border flex-wrap">
          <Badge variant="secondary" className="text-accent">
            {row.present} Present
          </Badge>
          <Badge
            variant="outline"
            className="text-destructive border-destructive/30"
          >
            {row.absent} Absent
          </Badge>
          {row.leave > 0 && (
            <Badge
              variant="outline"
              className="text-blue-500 border-blue-500/30"
            >
              {row.leave} Leave
            </Badge>
          )}
          {row.late > 0 && (
            <Badge
              variant="outline"
              className="text-amber-500 border-amber-500/30"
            >
              {row.late} Late
            </Badge>
          )}
        </div>

        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 sticky top-0">
              <tr>
                <th className="text-left p-3 font-semibold text-muted-foreground">
                  #
                </th>
                <th className="text-left p-3 font-semibold text-muted-foreground">
                  Student
                </th>
                <th className="text-left p-3 font-semibold text-muted-foreground hidden sm:table-cell">
                  Adm No.
                </th>
                <th className="text-left p-3 font-semibold text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {classStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-muted-foreground text-sm"
                  >
                    No students in this class/section
                  </td>
                </tr>
              ) : (
                classStudents.map((s, idx) => {
                  const status = getStatus(s.id);
                  return (
                    <tr
                      key={s.id}
                      className="border-t border-border hover:bg-muted/20 transition-colors"
                      data-ocid={`summary.detail-row.${idx + 1}`}
                    >
                      <td className="p-3 text-muted-foreground text-xs">
                        {idx + 1}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 overflow-hidden">
                            {s.photo ? (
                              <img
                                src={s.photo}
                                alt={s.fullName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              s.fullName.charAt(0)
                            )}
                          </div>
                          <span className="font-medium text-foreground truncate">
                            {s.fullName}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground font-mono text-xs hidden sm:table-cell">
                        {s.admNo}
                      </td>
                      <td
                        className={`p-3 font-semibold text-xs ${statusColor[status] ?? "text-muted-foreground"}`}
                      >
                        {status}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </dialog>
  );
}

export default function AttendanceSummary({
  date,
  onDateChange,
}: AttendanceSummaryProps) {
  const { getData, currentSession } = useApp();
  const [drillDown, setDrillDown] = useState<ClassSectionRow | null>(null);

  const students = useMemo(
    () =>
      (getData("students") as Student[]).filter(
        (s) =>
          s.sessionId === (currentSession?.id ?? "") && s.status === "active",
      ),
    [getData, currentSession],
  );

  const records = useMemo(
    () =>
      (getData("attendance") as AttendanceRecord[]).filter(
        (r) => r.date === date && r.type === "student",
      ),
    [getData, date],
  );

  const classSections = useMemo(
    () => getData("classes") as ClassSection[],
    [getData],
  );

  const routes = useMemo(
    () => getData("transport_routes") as TransportRoute[],
    [getData],
  );

  // Build sorted class list
  const sortedClasses = useMemo(() => {
    if (classSections.length > 0) return classSections.map((c) => c.className);
    return CLASSES;
  }, [classSections]);

  const presentIds = useMemo(
    () =>
      new Set(
        records.filter((r) => r.status === "Present").map((r) => r.studentId),
      ),
    [records],
  );

  const total = students.length;
  const present = students.filter((s) => presentIds.has(s.id)).length;
  const absent = total - present;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  const classSectionData = useMemo(() => {
    const map: Record<string, ClassSectionRow> = {};
    for (const s of students) {
      const key = `${s.class}-${s.section}`;
      if (!map[key]) {
        map[key] = {
          cls: s.class,
          section: s.section,
          total: 0,
          present: 0,
          absent: 0,
          leave: 0,
          late: 0,
        };
      }
      map[key].total++;
      const rec = records.find((r) => r.studentId === s.id);
      if (rec) {
        const st = rec.status as string;
        if (st === "Present") map[key].present++;
        else if (st === "Absent") map[key].absent++;
        else if (st === "Leave") map[key].leave++;
        else if (st === "Late") map[key].late++;
        else map[key].absent++;
      } else {
        map[key].absent++;
      }
    }
    return Object.values(map).sort((a, b) => {
      const ai = sortedClasses.indexOf(a.cls);
      const bi = sortedClasses.indexOf(b.cls);
      if (ai !== bi) return ai - bi;
      return SECTIONS.indexOf(a.section) - SECTIONS.indexOf(b.section);
    });
  }, [students, records, sortedClasses]);

  const routeData = useMemo(
    () =>
      routes.map((route) => {
        const routeStudents = students.filter((s) =>
          route.students.includes(s.id),
        );
        const routePresent = routeStudents.filter((s) =>
          presentIds.has(s.id),
        ).length;
        return {
          route: route.routeName,
          bus: route.busNo,
          total: routeStudents.length,
          present: routePresent,
          absent: routeStudents.length - routePresent,
        };
      }),
    [routes, students, presentIds],
  );

  function exportCSV() {
    const rows = [
      [
        "Class",
        "Section",
        "Total",
        "Present",
        "Absent",
        "Leave",
        "Late",
        "Attendance%",
        "Date",
      ],
    ];
    for (const row of classSectionData) {
      const rowPct =
        row.total > 0 ? Math.round((row.present / row.total) * 100) : 0;
      rows.push([
        row.cls,
        row.section,
        String(row.total),
        String(row.present),
        String(row.absent),
        String(row.leave),
        String(row.late),
        `${rowPct}%`,
        date,
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    a.download = `attendance_summary_${date}.csv`;
    a.click();
  }

  return (
    <div className="space-y-6">
      {/* Date selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">
          Viewing date:
        </span>
        <Input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-40"
          data-ocid="summary.date-picker"
        />
        {date !== new Date().toISOString().split("T")[0] && (
          <Badge variant="outline">Historical View</Badge>
        )}
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={exportCSV}
          data-ocid="summary.export-csv.button"
        >
          <Download className="w-4 h-4 mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Students"
          value={total}
          sub="Active enrollments"
          icon={Users}
          colorCls="bg-primary"
        />
        <SummaryCard
          label="Present Today"
          value={present}
          sub={`${pct}% attendance rate`}
          icon={CalendarCheck}
          colorCls="bg-accent"
        />
        <SummaryCard
          label="Absent Today"
          value={absent}
          sub={`${100 - pct}% absent`}
          icon={AlertCircle}
          colorCls="bg-orange-500"
        />
        <SummaryCard
          label="Attendance %"
          value={`${pct}%`}
          sub={`${present}/${total} students`}
          icon={TrendingUp}
          colorCls="bg-emerald-600"
        />
      </div>

      {/* Class/Section Breakdown */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="font-display font-semibold text-foreground">
            Class &amp; Section Wise Attendance
          </h3>
          <span className="text-xs text-muted-foreground ml-1">
            (click a row for student-wise detail)
          </span>
        </div>
        {classSectionData.length === 0 ? (
          <div
            className="py-10 text-center text-muted-foreground"
            data-ocid="summary.class-table.empty-state"
          >
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No student data available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="text-left p-3 font-semibold text-muted-foreground">
                    Class
                  </th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">
                    Section
                  </th>
                  <th className="text-right p-3 font-semibold text-muted-foreground">
                    Total
                  </th>
                  <th className="text-right p-3 font-semibold text-muted-foreground">
                    Present
                  </th>
                  <th className="text-right p-3 font-semibold text-muted-foreground">
                    Absent
                  </th>
                  <th className="text-right p-3 font-semibold text-muted-foreground hidden sm:table-cell">
                    Leave
                  </th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">
                    Attendance
                  </th>
                </tr>
              </thead>
              <tbody>
                {classSectionData.map((row, idx) => {
                  const rowPct =
                    row.total > 0
                      ? Math.round((row.present / row.total) * 100)
                      : 0;
                  return (
                    <tr
                      key={`${row.cls}-${row.section}`}
                      className="border-t border-border hover:bg-primary/5 cursor-pointer transition-colors"
                      onClick={() => setDrillDown(row)}
                      onKeyDown={(e) => e.key === "Enter" && setDrillDown(row)}
                      tabIndex={0}
                      data-ocid={`summary.class-row.${idx + 1}`}
                    >
                      <td className="p-3 font-medium text-foreground">
                        Class {row.cls}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {row.section}
                      </td>
                      <td className="p-3 text-right text-muted-foreground">
                        {row.total}
                      </td>
                      <td className="p-3 text-right text-accent font-semibold">
                        {row.present}
                      </td>
                      <td className="p-3 text-right text-orange-500 font-semibold">
                        {row.absent}
                      </td>
                      <td className="p-3 text-right text-blue-500 hidden sm:table-cell">
                        {row.leave}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden min-w-16">
                            <div
                              className="h-full bg-accent rounded-full transition-all"
                              style={{ width: `${rowPct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right flex-shrink-0">
                            {rowPct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Route-wise Breakdown */}
      {routes.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Bus className="w-4 h-4 text-primary" />
            <h3 className="font-display font-semibold text-foreground">
              Route / Transport Wise Attendance
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="text-left p-3 font-semibold text-muted-foreground">
                    Route
                  </th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">
                    Bus No.
                  </th>
                  <th className="text-right p-3 font-semibold text-muted-foreground">
                    Total
                  </th>
                  <th className="text-right p-3 font-semibold text-muted-foreground">
                    Present
                  </th>
                  <th className="text-right p-3 font-semibold text-muted-foreground">
                    Absent
                  </th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">
                    Attendance
                  </th>
                </tr>
              </thead>
              <tbody>
                {routeData.map((row, idx) => {
                  const rowPct =
                    row.total > 0
                      ? Math.round((row.present / row.total) * 100)
                      : 0;
                  return (
                    <tr
                      key={row.route}
                      className="border-t border-border hover:bg-muted/30 transition-colors"
                      data-ocid={`summary.route-row.${idx + 1}`}
                    >
                      <td className="p-3 font-medium text-foreground">
                        {row.route}
                      </td>
                      <td className="p-3 text-muted-foreground">{row.bus}</td>
                      <td className="p-3 text-right text-muted-foreground">
                        {row.total}
                      </td>
                      <td className="p-3 text-right text-accent font-semibold">
                        {row.present}
                      </td>
                      <td className="p-3 text-right text-orange-500 font-semibold">
                        {row.absent}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden min-w-16">
                            <div
                              className="h-full bg-accent rounded-full transition-all"
                              style={{ width: `${rowPct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right flex-shrink-0">
                            {rowPct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="p-5 border-dashed">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Bus className="w-5 h-5 opacity-40" />
            <p className="text-sm">
              No transport routes configured. Add routes in the Transport module
              to see route-wise attendance here.
            </p>
          </div>
        </Card>
      )}

      {/* Drill-down modal */}
      {drillDown && (
        <DrillDownModal
          row={drillDown}
          date={date}
          students={students}
          records={records}
          onClose={() => setDrillDown(null)}
        />
      )}
    </div>
  );
}
