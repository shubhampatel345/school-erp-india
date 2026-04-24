import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowUpRight,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  FileText,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import phpApiService from "../../utils/phpApiService";

interface TimetablePeriod {
  period: number;
  subject: string;
  teacher: string;
  time: string;
}

interface HomeworkItem {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
}

interface ExamResult {
  subject: string;
  marks: number;
  total: number;
  grade: string;
}

interface UpcomingExam {
  subject: string;
  date: string;
  time: string;
}

interface Props {
  onNavigate: (page: string) => void;
}

export default function StudentDashboard({ onNavigate }: Props) {
  const { currentUser, currentSession } = useApp();
  const [timetable, setTimetable] = useState<TimetablePeriod[]>([]);
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<UpcomingExam[]>([]);
  const [attendancePct, setAttendancePct] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        // Fetch homework for this student's class/section
        if (currentUser?.studentId) {
          const hwResult =
            (await phpApiService.getHomework()) as unknown as HomeworkItem[];
          if (!cancelled && Array.isArray(hwResult))
            setHomework(hwResult.slice(0, 5));
        }
        // Static demo data (replace with real API calls when endpoints exist)
        if (!cancelled) {
          setAttendancePct(88);
          setTimetable([
            {
              period: 1,
              subject: "Mathematics",
              teacher: "Mr. Sharma",
              time: "8:00–8:45",
            },
            {
              period: 2,
              subject: "English",
              teacher: "Ms. Verma",
              time: "8:45–9:30",
            },
            {
              period: 3,
              subject: "Science",
              teacher: "Mr. Patel",
              time: "9:45–10:30",
            },
            {
              period: 4,
              subject: "Social Studies",
              teacher: "Mrs. Singh",
              time: "11:00–11:45",
            },
            {
              period: 5,
              subject: "Hindi",
              teacher: "Mr. Kumar",
              time: "12:30–1:15",
            },
          ]);
          setResults([
            { subject: "Mathematics", marks: 87, total: 100, grade: "A" },
            { subject: "Science", marks: 91, total: 100, grade: "A+" },
            { subject: "English", marks: 78, total: 100, grade: "B+" },
          ]);
          setUpcomingExams([
            { subject: "Mathematics", date: "28 Apr 2026", time: "9:00 AM" },
            { subject: "Science", date: "30 Apr 2026", time: "9:00 AM" },
          ]);
        }
      } catch {
        /* offline */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.studentId]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="flex flex-col gap-0">
      <div className="relative w-full min-h-[110px] flex items-center px-6 py-5 bg-gradient-to-r from-primary/90 via-primary/70 to-accent/60">
        <div className="relative z-10 flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold font-display text-white drop-shadow">
            {greeting()},{" "}
            {
              (currentUser?.fullName ?? currentUser?.name ?? "Student").split(
                " ",
              )[0]
            }{" "}
            👋
          </h1>
          <p className="text-white/80 text-sm mt-0.5">
            Student Portal · Session:{" "}
            <strong className="text-white">{currentSession?.label}</strong>
          </p>
        </div>
      </div>

      <div className="p-4 lg:p-6 space-y-6">
        {/* Top stat strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Attendance",
              value: `${attendancePct}%`,
              icon: CalendarCheck,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
              page: "attendance",
            },
            {
              label: "Pending HW",
              value: homework.length,
              icon: ClipboardList,
              color: "text-orange-600",
              bg: "bg-orange-50",
              page: "homework",
            },
            {
              label: "Upcoming Exams",
              value: upcomingExams.length,
              icon: FileText,
              color: "text-violet-600",
              bg: "bg-violet-50",
              page: "examinations",
            },
            {
              label: "Avg Score",
              value: results.length
                ? `${Math.round(results.reduce((s, r) => s + (r.marks / r.total) * 100, 0) / results.length)}%`
                : "—",
              icon: BookOpen,
              color: "text-primary",
              bg: "bg-primary/5",
              page: "examinations",
            },
          ].map(({ label, value, icon: Icon, color, bg, page }) => (
            <Card
              key={label}
              className="p-4 cursor-pointer hover:shadow-elevated transition-shadow"
              onClick={() => onNavigate(page)}
              data-ocid={`student.stat.${label.toLowerCase().replace(/\s+/g, "_")}`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${bg}`}
              >
                <Icon className={`w-4.5 h-4.5 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground font-display">
                {value}
              </p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Timetable */}
          <Card
            className="p-5 lg:col-span-2"
            data-ocid="student.timetable.card"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-primary" />
                <h2 className="font-display font-semibold text-foreground text-sm">
                  Today's Timetable
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("academics")}
                className="text-xs text-primary hover:underline"
              >
                Full timetable →
              </button>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {timetable.map((p) => (
                  <div
                    key={p.period}
                    data-ocid={`student.timetable.item.${p.period}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/40"
                  >
                    <Badge
                      variant="outline"
                      className="text-xs w-7 text-center flex-shrink-0"
                    >
                      P{p.period}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {p.subject}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.teacher}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {p.time}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Upcoming Exams + Homework */}
          <div className="space-y-4">
            <Card className="p-5" data-ocid="student.upcoming_exams.card">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-violet-600" />
                <h2 className="font-display font-semibold text-foreground text-sm">
                  Upcoming Exams
                </h2>
              </div>
              {upcomingExams.length === 0 ? (
                <p
                  className="text-xs text-muted-foreground"
                  data-ocid="student.exams.empty_state"
                >
                  No upcoming exams
                </p>
              ) : (
                <div className="space-y-2">
                  {upcomingExams.map((e) => (
                    <div
                      key={e.subject}
                      className="flex items-center justify-between p-2 rounded-lg bg-violet-50"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {e.subject}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {e.date} · {e.time}
                        </p>
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-5" data-ocid="student.homework.card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-orange-600" />
                  <h2 className="font-display font-semibold text-foreground text-sm">
                    Homework Due
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate("homework")}
                  className="text-xs text-primary hover:underline"
                >
                  All →
                </button>
              </div>
              {homework.length === 0 ? (
                <p
                  className="text-xs text-muted-foreground"
                  data-ocid="student.homework.empty_state"
                >
                  No pending homework
                </p>
              ) : (
                <div className="space-y-2">
                  {homework.map((hw, i) => (
                    <div
                      key={hw.id}
                      data-ocid={`student.homework.item.${i + 1}`}
                      className="p-2 rounded-lg bg-orange-50"
                    >
                      <p className="text-sm font-medium text-foreground truncate">
                        {hw.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {hw.subject} · Due: {hw.dueDate}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Recent Results */}
        <Card className="p-5" data-ocid="student.results.card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-violet-600" />
              <h2 className="font-display font-semibold text-foreground text-sm">
                Recent Exam Results
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("examinations")}
              className="text-xs text-primary hover:underline"
            >
              View all →
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {results.map((r) => (
              <div
                key={r.subject}
                className="rounded-xl bg-muted/40 p-3 text-center"
              >
                <p className="text-xs text-muted-foreground truncate mb-1">
                  {r.subject}
                </p>
                <p className="text-xl font-bold text-foreground font-display">
                  {r.marks}
                </p>
                <p className="text-xs text-muted-foreground">/{r.total}</p>
                <Badge variant="outline" className="text-[10px] mt-1">
                  {r.grade}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
