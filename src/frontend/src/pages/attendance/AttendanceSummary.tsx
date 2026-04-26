/**
 * AttendanceSummary — Class-wise, route-wise, and student-level attendance reports
 * All data fetched directly from MySQL via phpApiService.
 * NO getData/saveData context calls.
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
  AlertCircle,
  Bus,
  CalendarCheck,
  CalendarRange,
  Download,
  Loader2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import phpApiService from "../../utils/phpApiService";
import type { AttendanceRecord as ApiAttendance } from "../../utils/phpApiService";

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

interface StudentRow {
  id: string;
  admNo: string;
  fullName: string;
  class: string;
  section: string;
  present: number;
  absent: number;
  leave: number;
  late: number;
  total: number;
  pct: number;
}

interface StudentMin {
  id: string;
  admNo: string;
  fullName: string;
  class: string;
  section: string;
  fatherName?: string;
}

const CLASS_ORDER = [
  "Nursery",
  "LKG",
  "UKG",
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
];

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

// ── Drill-down modal ───────────────────────────────────────────────────────────

interface DrillDownProps {
  row: ClassSectionRow;
  date: string;
  students: StudentMin[];
  records: ApiAttendance[];
  onClose: () => void;
}

function DrillDownModal({
  row,
  date,
  students,
  records,
  onClose,
}: DrillDownProps) {
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
              {row.cls} - Section {row.section}
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
            data-ocid="summary.detail-modal.close_button"
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
                      <td className="p-3 font-medium text-foreground">
                        {s.fullName}
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

// ── Date Range student-wise summary ──────────────────────────────────────────

function DateRangeSummary({
  fromDate,
  toDate,
  students,
  records,
}: {
  fromDate: string;
  toDate: string;
  students: StudentMin[];
  records: ApiAttendance[];
}) {
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("all");

  const classList = useMemo(() => {
    const names = [...new Set(students.map((s) => s.class))];
    return CLASS_ORDER.filter((c) => names.includes(c)).concat(
      names.filter((n) => !CLASS_ORDER.includes(n)),
    );
  }, [students]);

  const workingDays = useMemo(() => {
    const days = new Set(
      records
        .filter((r) => r.date >= fromDate && r.date <= toDate)
        .map((r) => r.date),
    );
    return days.size || 1;
  }, [records, fromDate, toDate]);

  const rangeRecords = useMemo(
    () => records.filter((r) => r.date >= fromDate && r.date <= toDate),
    [records, fromDate, toDate],
  );

  const rows: StudentRow[] = useMemo(() => {
    const filtered = students.filter((s) => {
      if (filterClass !== "all" && s.class !== filterClass) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          s.fullName.toLowerCase().includes(q) ||
          s.admNo.toLowerCase().includes(q)
        );
      }
      return true;
    });
    return filtered.map((s) => {
      const recs = rangeRecords.filter((r) => r.studentId === s.id);
      const present = recs.filter((r) => r.status === "Present").length;
      const absent = recs.filter((r) => r.status === "Absent").length;
      const leave = recs.filter((r) => (r.status as string) === "Leave").length;
      const late = recs.filter((r) => r.status === "Late").length;
      const pct =
        workingDays > 0 ? Math.round((present / workingDays) * 100) : 0;
      return { ...s, present, absent, leave, late, total: workingDays, pct };
    });
  }, [students, filterClass, search, rangeRecords, workingDays]);

  function exportRangeCSV() {
    const rowData = [
      [
        "Adm No",
        "Name",
        "Class",
        "Section",
        "Present",
        "Absent",
        "Leave",
        "Late",
        "Working Days",
        "Attendance%",
      ],
    ];
    for (const r of rows) {
      rowData.push([
        r.admNo,
        r.fullName,
        r.class,
        r.section,
        String(r.present),
        String(r.absent),
        String(r.leave),
        String(r.late),
        String(r.total),
        `${r.pct}%`,
      ]);
    }
    const csv = rowData.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    a.download = `attendance_range_${fromDate}_to_${toDate}.csv`;
    a.click();
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-primary" />
            <h3 className="font-display font-semibold text-foreground">
              Student-wise Attendance ({fromDate} to {toDate})
            </h3>
            <Badge variant="secondary">{workingDays} working days</Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exportRangeCSV}
            data-ocid="summary.range-export.button"
          >
            <Download className="w-4 h-4 mr-1.5" /> Export CSV
          </Button>
        </div>
        <div className="flex gap-3 mt-3 flex-wrap">
          <Input
            placeholder="Search student…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 h-8 text-sm"
            data-ocid="summary.range-search.input"
          />
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger
              className="w-32 h-8 text-sm"
              data-ocid="summary.range-class.select"
            >
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classList.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="overflow-x-auto max-h-96">
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
                Class
              </th>
              <th className="text-right p-3 font-semibold text-muted-foreground">
                Present
              </th>
              <th className="text-right p-3 font-semibold text-muted-foreground">
                Absent
              </th>
              <th className="text-right p-3 font-semibold text-muted-foreground hidden md:table-cell">
                Leave
              </th>
              <th className="text-left p-3 font-semibold text-muted-foreground">
                Attendance %
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-10 text-center text-muted-foreground"
                  data-ocid="summary.range-table.empty_state"
                >
                  No student data available
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className="border-t border-border hover:bg-muted/20 transition-colors"
                  data-ocid={`summary.range-row.${idx + 1}`}
                >
                  <td className="p-3 text-muted-foreground text-xs">
                    {idx + 1}
                  </td>
                  <td className="p-3 font-medium text-foreground">
                    {row.fullName}
                  </td>
                  <td className="p-3 text-muted-foreground hidden sm:table-cell">
                    {row.class}-{row.section}
                  </td>
                  <td className="p-3 text-right text-accent font-semibold">
                    {row.present}
                  </td>
                  <td className="p-3 text-right text-destructive font-semibold">
                    {row.absent}
                  </td>
                  <td className="p-3 text-right text-blue-500 hidden md:table-cell">
                    {row.leave}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden min-w-12">
                        <div
                          className="h-full bg-accent rounded-full transition-all"
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right flex-shrink-0">
                        {row.pct}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AttendanceSummary({
  date,
  onDateChange,
}: AttendanceSummaryProps) {
  const today = new Date().toISOString().split("T")[0];

  const [viewMode, setViewMode] = useState<"single" | "range">("single");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(today);

  const [students, setStudents] = useState<StudentMin[]>([]);
  const [records, setRecords] = useState<ApiAttendance[]>([]);
  const [loading, setLoading] = useState(false);

  const [drillDown, setDrillDown] = useState<ClassSectionRow | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [studResult, recResult] = await Promise.all([
        phpApiService.getStudents({ status: "active", limit: "1000" }),
        phpApiService.getAttendance("", date),
      ]);
      setStudents(
        studResult.data.map((s) => ({
          id: s.id,
          admNo: s.admNo,
          fullName: s.fullName,
          class: s.class,
          section: s.section,
          fatherName: s.fatherName,
        })),
      );
      setRecords(recResult);
    } catch {
      toast.error("Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Class-section summary
  const classSectionData = useMemo<ClassSectionRow[]>(() => {
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
      const rec = records.find((r) => r.studentId === s.id && r.date === date);
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
      const ai = CLASS_ORDER.indexOf(a.cls);
      const bi = CLASS_ORDER.indexOf(b.cls);
      if (ai !== bi) return ai - bi;
      return a.section.localeCompare(b.section);
    });
  }, [students, records, date]);

  const presentIds = useMemo(
    () =>
      new Set(
        records
          .filter((r) => r.status === "Present" && r.date === date)
          .map((r) => r.studentId ?? ""),
      ),
    [records, date],
  );

  const total = students.length;
  const present = students.filter((s) => presentIds.has(s.id)).length;
  const absent = total - present;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

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
      {/* View mode toggle + date pickers */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 p-1 bg-muted/40 rounded-lg">
          <button
            type="button"
            onClick={() => setViewMode("single")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === "single"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-ocid="summary.single-day.tab"
          >
            Single Day
          </button>
          <button
            type="button"
            onClick={() => setViewMode("range")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === "range"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-ocid="summary.date-range.tab"
          >
            <CalendarRange className="w-3.5 h-3.5" />
            Date Range
          </button>
        </div>

        {viewMode === "single" ? (
          <>
            <Input
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-40"
              data-ocid="summary.date-picker"
            />
            {date !== today && <Badge variant="outline">Historical View</Badge>}
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              data-ocid="summary.export-csv.button"
            >
              <Download className="w-4 h-4 mr-1.5" /> Export CSV
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">From</span>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-36"
              data-ocid="summary.from-date.input"
            />
            <span className="text-sm text-muted-foreground">To</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-36"
              data-ocid="summary.to-date.input"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div
          className="flex items-center justify-center py-16 text-muted-foreground"
          data-ocid="summary.loading_state"
        >
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Loading attendance data…</span>
        </div>
      ) : viewMode === "single" ? (
        <>
          {/* Summary cards */}
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

          {/* Class/Section breakdown */}
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
                data-ocid="summary.class-table.empty_state"
              >
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No student data available for {date}</p>
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
                          onKeyDown={(e) =>
                            e.key === "Enter" && setDrillDown(row)
                          }
                          tabIndex={0}
                          data-ocid={`summary.class-row.${idx + 1}`}
                        >
                          <td className="p-3 font-medium text-foreground">
                            {row.cls}
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

          {/* Route-wise placeholder (transport routes not fetched here) */}
          <Card className="p-4 bg-muted/20 border-dashed">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Bus className="w-4 h-4" />
              <p className="text-sm">
                Route-wise breakdown: go to Transport module for route data.
              </p>
            </div>
          </Card>
        </>
      ) : (
        <DateRangeSummary
          fromDate={fromDate}
          toDate={toDate}
          students={students}
          records={records}
        />
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
