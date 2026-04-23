/**
 * SHUBH SCHOOL ERP — Student Performance Analytics
 * Role-based: SuperAdmin/Teacher → search any student
 *             Parent → tabs for each child
 *             Student → own data only
 */

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Skeleton } from "../../components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { useApp } from "../../context/AppContext";
import type {
  Student,
  StudentAnalytics as StudentAnalyticsType,
} from "../../types";
import { phpApiService } from "../../utils/phpApiService";

// ── Colour helpers ─────────────────────────────────────────────────────────────

function attendanceColor(pct: number): string {
  if (pct >= 75) return "hsl(142 71% 45%)";
  if (pct >= 60) return "hsl(45 96% 53%)";
  return "hsl(0 84% 60%)";
}

function getAttendanceBadgeVariant(
  pct: number,
): "default" | "secondary" | "destructive" {
  if (pct >= 75) return "default";
  if (pct >= 60) return "secondary";
  return "destructive";
}

const SUBJECT_COLORS = [
  "oklch(0.3 0.12 260)",
  "oklch(0.55 0.14 200)",
  "oklch(0.68 0.18 40)",
  "oklch(0.72 0.15 85)",
  "oklch(0.78 0.18 25)",
  "oklch(0.6 0.2 300)",
];

// ── Skeleton loader ────────────────────────────────────────────────────────────

function AnalyticsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["att", "exam", "fees", "lib"] as const).map((k) => (
          <Skeleton key={k} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
      <svg
        aria-hidden="true"
        className="w-10 h-10 opacity-30"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ── Summary stat cards ─────────────────────────────────────────────────────────

function StatCards({ analytics }: { analytics: StudentAnalyticsType }) {
  const { attendanceSummary, marksHistory, feesHistory } = analytics;

  // Attendance %
  const totalPresent = attendanceSummary.reduce((s, m) => s + m.present, 0);
  const totalDays = attendanceSummary.reduce((s, m) => s + m.total, 0);
  const attPct =
    totalDays > 0 ? Math.round((totalPresent / totalDays) * 100) : 0;

  // Latest exam
  const lastExam =
    marksHistory.length > 0 ? marksHistory[marksHistory.length - 1] : null;
  const lastExamPct = lastExam
    ? Math.round((lastExam.score / lastExam.totalMarks) * 100)
    : null;

  // Fees status
  const totalDue = feesHistory.reduce((s, m) => s + m.due, 0);
  const overdueMonths = feesHistory.filter((m) => m.due > 0).length;

  // Library (placeholder — not in current API shape)
  const booksIssued = 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Attendance */}
      <Card data-ocid="analytics.attendance_card">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Attendance</p>
          <p
            className="text-2xl font-bold"
            style={{ color: attendanceColor(attPct) }}
          >
            {totalDays > 0 ? `${attPct}%` : "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {totalPresent}/{totalDays} days
          </p>
          {totalDays > 0 && (
            <Badge
              variant={getAttendanceBadgeVariant(attPct)}
              className="mt-2 text-xs"
            >
              {attPct >= 75 ? "Good" : attPct >= 60 ? "Low" : "Critical"}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Latest exam */}
      <Card data-ocid="analytics.latest_exam_card">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Latest Exam</p>
          {lastExam ? (
            <>
              <p className="text-2xl font-bold text-foreground">
                {lastExam.score}/{lastExam.totalMarks}
              </p>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {lastExam.examTitle}
              </p>
              <Badge
                variant={
                  lastExamPct !== null && lastExamPct >= 40
                    ? "default"
                    : "destructive"
                }
                className="mt-2 text-xs"
              >
                {lastExamPct !== null && lastExamPct >= 40 ? "Pass" : "Fail"}
              </Badge>
            </>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">No exams yet</p>
          )}
        </CardContent>
      </Card>

      {/* Fees */}
      <Card data-ocid="analytics.fees_status_card">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Fees Status</p>
          {feesHistory.length > 0 ? (
            <>
              <p
                className="text-2xl font-bold"
                style={{
                  color: totalDue > 0 ? "hsl(0 84% 60%)" : "hsl(142 71% 45%)",
                }}
              >
                {totalDue > 0 ? `${overdueMonths}` : "✓"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {totalDue > 0
                  ? `${overdueMonths} month${overdueMonths > 1 ? "s" : ""} overdue`
                  : "All paid"}
              </p>
              <Badge
                variant={totalDue > 0 ? "destructive" : "default"}
                className="mt-2 text-xs"
              >
                {totalDue > 0 ? "Overdue" : "Paid"}
              </Badge>
            </>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">No fee data</p>
          )}
        </CardContent>
      </Card>

      {/* Library */}
      <Card data-ocid="analytics.library_card">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Library Books</p>
          <p className="text-2xl font-bold text-foreground">{booksIssued}</p>
          <p className="text-xs text-muted-foreground mt-1">Currently issued</p>
          <Badge variant="secondary" className="mt-2 text-xs">
            {booksIssued === 0 ? "None" : `${booksIssued} issued`}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Marks Trend Line Chart ─────────────────────────────────────────────────────

function MarksTrendChart({ analytics }: { analytics: StudentAnalyticsType }) {
  const { marksHistory } = analytics;
  const subjects = useMemo(
    () => [...new Set(marksHistory.map((e) => e.subject))],
    [marksHistory],
  );
  const [selectedSubject, setSelectedSubject] = useState<string>("all");

  const filtered =
    selectedSubject === "all"
      ? marksHistory
      : marksHistory.filter((e) => e.subject === selectedSubject);

  // Build data grouped by exam date
  const examDates = [...new Set(filtered.map((e) => e.date))].sort();
  const lineData = examDates.map((date) => {
    const row: Record<string, string | number> = { date };
    const entriesOnDate = filtered.filter((e) => e.date === date);
    for (const entry of entriesOnDate) {
      row[entry.subject] = Math.round((entry.score / entry.totalMarks) * 100);
    }
    return row;
  });

  const displaySubjects =
    selectedSubject === "all" ? subjects : [selectedSubject];

  if (marksHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Marks Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState message="No exam data yet" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-ocid="analytics.marks_trend_chart">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Marks Trend (%)</CardTitle>
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger
            className="w-36 h-7 text-xs"
            data-ocid="analytics.subject_filter"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={lineData}
            margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
            <Tooltip
              formatter={(value: number, name: string) => [`${value}%`, name]}
              contentStyle={{ fontSize: 11 }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <ReferenceLine
              y={40}
              stroke="hsl(0 84% 60%)"
              strokeDasharray="4 3"
              label={{ value: "Pass", fontSize: 9, fill: "hsl(0 84% 60%)" }}
            />
            {displaySubjects.map((sub, i) => (
              <Line
                key={sub}
                type="monotone"
                dataKey={sub}
                stroke={SUBJECT_COLORS[i % SUBJECT_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ── Attendance Bar Chart ───────────────────────────────────────────────────────

function AttendanceBarChart({
  analytics,
}: { analytics: StudentAnalyticsType }) {
  const { attendanceSummary } = analytics;

  const data = attendanceSummary.map((m) => {
    const pct = m.total > 0 ? Math.round((m.present / m.total) * 100) : 0;
    return { month: m.month, pct, present: m.present, total: m.total };
  });

  if (attendanceSummary.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Attendance by Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState message="No attendance data yet" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-ocid="analytics.attendance_chart">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Attendance by Month (%)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={data}
            margin={{ top: 15, right: 10, left: -20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
            <Tooltip
              formatter={(
                value: number,
                _: string,
                props: { payload?: { present: number; total: number } },
              ) => [
                `${value}% (${props.payload?.present ?? 0}/${props.payload?.total ?? 0} days)`,
                "Attendance",
              ]}
              contentStyle={{ fontSize: 11 }}
            />
            <Bar
              dataKey="pct"
              radius={[4, 4, 0, 0]}
              label={{
                position: "top",
                fontSize: 9,
                formatter: (v: number) => `${v}%`,
              }}
            >
              {data.map((entry) => (
                <Cell key={entry.month} fill={attendanceColor(entry.pct)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ── Fees History Timeline ──────────────────────────────────────────────────────

function FeesHistoryChart({ analytics }: { analytics: StudentAnalyticsType }) {
  const { feesHistory } = analytics;

  const totalPaid = feesHistory.reduce((s, m) => s + m.paid, 0);
  const totalDue = feesHistory.reduce((s, m) => s + m.due, 0);

  if (feesHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Fees History</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState message="No fees data yet" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-ocid="analytics.fees_chart">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Fees — Paid vs Due
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          Total Paid:{" "}
          <span className="text-green-600 font-medium">
            ₹{totalPaid.toLocaleString()}
          </span>
          &nbsp;·&nbsp; Total Due:{" "}
          <span className="text-red-500 font-medium">
            ₹{totalDue.toLocaleString()}
          </span>
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={feesHistory}
            margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(value: number, name: string) => [
                `₹${value.toLocaleString()}`,
                name,
              ]}
              contentStyle={{ fontSize: 11 }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar
              dataKey="paid"
              name="Paid"
              fill="hsl(142 71% 45%)"
              radius={[3, 3, 0, 0]}
            />
            <Bar
              dataKey="due"
              name="Due"
              fill="hsl(0 84% 60%)"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ── Performance Summary Pie ────────────────────────────────────────────────────

function PerformanceSummaryCard({
  analytics,
}: { analytics: StudentAnalyticsType }) {
  const { marksHistory } = analytics;

  const passCount = marksHistory.filter(
    (e) => e.totalMarks > 0 && (e.score / e.totalMarks) * 100 >= 40,
  ).length;
  const failCount = marksHistory.length - passCount;

  const avgPct =
    marksHistory.length > 0
      ? Math.round(
          marksHistory.reduce(
            (s, e) =>
              s + (e.totalMarks > 0 ? (e.score / e.totalMarks) * 100 : 0),
            0,
          ) / marksHistory.length,
        )
      : 0;

  const pieData = [
    { name: "Pass", value: passCount, fill: "hsl(142 71% 45%)" },
    { name: "Fail", value: failCount, fill: "hsl(0 84% 60%)" },
  ];

  if (marksHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState message="No exam data yet" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-ocid="analytics.performance_summary_card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Performance Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-6">
          <ResponsiveContainer width={140} height={140}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
                paddingAngle={2}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Average Score</p>
              <p className="text-xl font-bold text-foreground">{avgPct}%</p>
            </div>
            <div className="flex gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Pass</p>
                <p className="font-semibold text-green-600">{passCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fail</p>
                <p className="font-semibold text-red-500">{failCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Exams</p>
                <p className="font-semibold text-foreground">
                  {marksHistory.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Student search autocomplete ────────────────────────────────────────────────

interface StudentSearchProps {
  students: Student[];
  onSelect: (s: Student) => void;
  selectedId?: string;
}

function StudentSearch({ students, onSelect, selectedId }: StudentSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return students
      .filter(
        (s) =>
          s.fullName?.toLowerCase().includes(q) ||
          s.admNo?.toLowerCase().includes(q) ||
          s.class?.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [students, query]);

  const selected = students.find((s) => s.id === selectedId);

  return (
    <div className="relative" data-ocid="analytics.student_search">
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={
          selected
            ? selected.fullName
            : "Search student by name or admission no…"
        }
        className="h-9 text-sm"
        data-ocid="analytics.search_input"
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 bg-card border border-border rounded-md shadow-lg mt-1 max-h-56 overflow-y-auto">
          {results.map((s) => (
            <button
              key={s.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-3"
              onMouseDown={() => {
                onSelect(s);
                setQuery("");
                setOpen(false);
              }}
            >
              <span className="font-medium text-foreground">{s.fullName}</span>
              <span className="text-muted-foreground text-xs">
                {s.admNo} · Class {s.class}-{s.section}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Analytics panel (charts + stats for one student) ─────────────────────────

function AnalyticsPanel({ studentId }: { studentId: string }) {
  const [analytics, setAnalytics] = useState<StudentAnalyticsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    setError(null);

    // Build analytics from real MySQL data via phpApiService
    Promise.all([
      phpApiService
        .getAttendance("", "")
        .catch(
          () => [] as import("../../utils/phpApiService").AttendanceRecord[],
        ),
      phpApiService
        .getReceipts(studentId)
        .catch(
          () => [] as import("../../utils/phpApiService").FeeReceiptRecord[],
        ),
      phpApiService
        .getResults({ studentId })
        .catch(() => [] as Record<string, unknown>[]),
    ])
      .then(([attendance, feeReceipts, examResults]) => {
        const stdAttendance = attendance.filter(
          (a) => a.studentId === studentId,
        );
        const monthMap: Record<string, { present: number; total: number }> = {};
        for (const a of stdAttendance) {
          const month = a.date ? a.date.slice(0, 7) : "Unknown";
          if (!monthMap[month]) monthMap[month] = { present: 0, total: 0 };
          monthMap[month].total++;
          if (a.status === "present" || a.status === "P")
            monthMap[month].present++;
        }
        const attendanceSummary = Object.entries(monthMap).map(
          ([month, v]) => ({
            month,
            present: v.present,
            total: v.total,
            percentage:
              v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
          }),
        );

        const marksHistory = examResults.map((r) => ({
          examTitle: String((r as Record<string, unknown>).examTitle ?? "Exam"),
          subject: String((r as Record<string, unknown>).subject ?? "Unknown"),
          score: Number((r as Record<string, unknown>).marks ?? 0),
          totalMarks: Number((r as Record<string, unknown>).maxMarks ?? 100),
          date: String((r as Record<string, unknown>).examDate ?? ""),
        }));

        const feesHistory = feeReceipts.map((r) => ({
          month: Array.isArray((r as Record<string, unknown>).months)
            ? (((r as Record<string, unknown>).months as string[])[0] ?? "")
            : "",
          paid: Number(r.totalAmount ?? 0),
          due: 0,
        }));

        const data: StudentAnalyticsType = {
          studentId,
          marksHistory,
          attendanceSummary,
          feesHistory,
        };
        setAnalytics(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        const msg =
          err instanceof Error ? err.message : "Failed to load analytics";
        setError(msg);
        setLoading(false);
        // Show empty placeholder analytics so charts still render
        setAnalytics({
          studentId,
          marksHistory: [],
          attendanceSummary: [],
          feesHistory: [],
        });
      });
  }, [studentId]);

  if (loading) return <AnalyticsSkeleton />;

  if (error && !analytics) {
    return (
      <div
        data-ocid="analytics.error_state"
        className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2"
      >
        <p className="text-sm text-destructive">{error}</p>
        <Button size="sm" variant="outline" onClick={() => setLoading(true)}>
          Retry
        </Button>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-4" data-ocid="analytics.panel">
      <StatCards analytics={analytics} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MarksTrendChart analytics={analytics} />
        <AttendanceBarChart analytics={analytics} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FeesHistoryChart analytics={analytics} />
        <PerformanceSummaryCard analytics={analytics} />
      </div>
    </div>
  );
}

// ── Print layout ──────────────────────────────────────────────────────────────

function handlePrint() {
  window.print();
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function StudentAnalytics() {
  const { currentUser, getData } = useApp();
  const students = getData("students") as Student[];

  const role = currentUser?.role ?? "student";
  const isAdminOrTeacher =
    role === "superadmin" || role === "admin" || role === "teacher";
  const isParent = role === "parent";
  const isStudent = role === "student";

  // For student: always show their own data
  const selfStudentId = isStudent ? (currentUser?.studentId ?? null) : null;

  // For parent: all children linked by mobile
  const parentMobile = isParent
    ? ((currentUser as { mobile?: string }).mobile ?? "")
    : "";
  const children = useMemo(
    () =>
      isParent
        ? students.filter((s) => {
            const raw = s as unknown as {
              guardianMobile?: string;
              fatherMobile?: string;
            };
            const mob = raw.guardianMobile ?? raw.fatherMobile ?? "";
            return mob === parentMobile && parentMobile.length >= 10;
          })
        : [],
    [students, isParent, parentMobile],
  );

  // Selected student for admin/teacher search
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Active child tab for parent
  const [activeChildId, setActiveChildId] = useState<string>(
    () => children[0]?.id ?? "",
  );

  // Resolve which student ID to show analytics for
  const analyticsStudentId: string | null = (() => {
    if (isStudent) return selfStudentId;
    if (isParent) return activeChildId || children[0]?.id || null;
    return selectedStudent?.id ?? null;
  })();

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto print:p-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap print:hidden">
        <div>
          <h1 className="text-xl font-bold text-foreground font-display">
            Student Performance Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Marks trend, attendance, fees history &amp; performance overview
          </p>
        </div>
        {analyticsStudentId && (
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            data-ocid="analytics.export_pdf_button"
            className="gap-1.5"
          >
            <svg
              aria-hidden="true"
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Print / Export PDF
          </Button>
        )}
      </div>

      {/* Admin / Teacher: search bar */}
      {isAdminOrTeacher && (
        <Card className="print:hidden">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <StudentSearch
                  students={students}
                  onSelect={setSelectedStudent}
                  selectedId={selectedStudent?.id}
                />
              </div>
              {selectedStudent && (
                <div className="hidden md:flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    Class {selectedStudent.class}-{selectedStudent.section}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {selectedStudent.admNo}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSelectedStudent(null)}
                    data-ocid="analytics.clear_student_button"
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parent: child selector tabs */}
      {isParent && children.length > 1 && (
        <Tabs
          value={activeChildId}
          onValueChange={setActiveChildId}
          data-ocid="analytics.child_tabs"
          className="print:hidden"
        >
          <TabsList className="h-8">
            {children.map((c) => (
              <TabsTrigger
                key={c.id}
                value={c.id}
                className="text-xs"
                data-ocid={`analytics.child_tab.${c.id}`}
              >
                {c.fullName}
              </TabsTrigger>
            ))}
          </TabsList>
          {children.map((c) => (
            <TabsContent key={c.id} value={c.id} className="mt-4">
              <AnalyticsPanel studentId={c.id} />
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Parent with single child */}
      {isParent && children.length === 1 && analyticsStudentId && (
        <AnalyticsPanel studentId={analyticsStudentId} />
      )}

      {/* Parent with no children linked */}
      {isParent && children.length === 0 && (
        <div
          data-ocid="analytics.empty_state"
          className="text-center py-16 text-muted-foreground"
        >
          <p className="text-sm">No students linked to your mobile number.</p>
          <p className="text-xs mt-1">Contact your school administrator.</p>
        </div>
      )}

      {/* Student: own data */}
      {isStudent && analyticsStudentId && (
        <AnalyticsPanel studentId={analyticsStudentId} />
      )}

      {isStudent && !analyticsStudentId && (
        <div
          data-ocid="analytics.empty_state"
          className="text-center py-16 text-muted-foreground"
        >
          <p className="text-sm">
            Student profile not found. Please contact your administrator.
          </p>
        </div>
      )}

      {/* Admin/Teacher: no student selected */}
      {isAdminOrTeacher && !selectedStudent && (
        <div
          data-ocid="analytics.empty_state"
          className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2"
        >
          <svg
            aria-hidden="true"
            className="w-12 h-12 opacity-20"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <p className="text-sm font-medium">
            Search for a student to view their analytics
          </p>
          <p className="text-xs">
            Use the search bar above to find a student by name or admission
            number
          </p>
        </div>
      )}

      {/* Admin/Teacher: student selected */}
      {isAdminOrTeacher && selectedStudent && (
        <>
          {/* Print header (visible only when printing) */}
          <div className="hidden print:block mb-4">
            <h2 className="text-lg font-bold">
              {selectedStudent.fullName} — Admission No: {selectedStudent.admNo}
            </h2>
            <p className="text-sm text-muted-foreground">
              Class {selectedStudent.class}-{selectedStudent.section}
            </p>
          </div>
          <AnalyticsPanel studentId={selectedStudent.id} />
        </>
      )}
    </div>
  );
}
