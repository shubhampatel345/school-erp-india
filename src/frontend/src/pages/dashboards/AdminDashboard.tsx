import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowUpRight,
  BookOpen,
  Bus,
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import phpApiService from "../../utils/phpApiService";

interface AdminStats {
  totalStudents: number;
  attendancePercent: number;
  examsThisMonth: number;
  homeworkDue: number;
}

interface RecentStudent {
  id: string;
  fullName: string;
  class: string;
  section: string;
  admNo: string;
  createdAt?: string;
}

interface Props {
  onNavigate: (page: string) => void;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  onClick,
  ocid,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  onClick?: () => void;
  ocid?: string;
}) {
  return (
    <Card
      data-ocid={ocid}
      onClick={onClick}
      className={`p-5 flex items-start gap-4 transition-shadow ${onClick ? "cursor-pointer hover:shadow-elevated" : ""}`}
    >
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          {label}
        </p>
        <p className="text-2xl font-bold text-foreground font-display mt-0.5">
          {value}
        </p>
        {sub && <p className="text-muted-foreground text-xs mt-0.5">{sub}</p>}
      </div>
      {onClick && (
        <ArrowUpRight className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
      )}
    </Card>
  );
}

export default function AdminDashboard({ onNavigate }: Props) {
  const { currentUser, currentSession } = useApp();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentStudents, setRecentStudents] = useState<RecentStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const [rawStats, studentsRes] = await Promise.allSettled([
          phpApiService.getStats(),
          phpApiService.getStudents({ session: currentSession?.id }),
        ]);
        if (cancelled) return;
        const s = rawStats.status === "fulfilled" ? rawStats.value : null;
        if (s) {
          setStats({
            totalStudents:
              studentsRes.status === "fulfilled"
                ? (studentsRes.value.total ?? s.students ?? 0)
                : 0,
            attendancePercent: 0,
            examsThisMonth: 0,
            homeworkDue: 0,
          });
        }
        if (studentsRes.status === "fulfilled") {
          setRecentStudents(
            studentsRes.value.data.slice(0, 5).map((s) => ({
              id: s.id,
              fullName: s.fullName,
              class: s.class,
              section: s.section,
              admNo: s.admNo,
              createdAt: String(s.createdAt ?? ""),
            })),
          );
        }
      } catch {
        /* server unreachable */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentSession?.id]);

  const quickActions = [
    {
      label: "Students",
      icon: Users,
      page: "students",
      color: "bg-primary/10 text-primary hover:bg-primary/20",
    },
    {
      label: "Attendance",
      icon: CalendarCheck,
      page: "attendance",
      color: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
    },
    {
      label: "Examinations",
      icon: ClipboardList,
      page: "examinations",
      color: "bg-violet-100 text-violet-700 hover:bg-violet-200",
    },
    {
      label: "Transport",
      icon: Bus,
      page: "transport",
      color: "bg-sky-100 text-sky-700 hover:bg-sky-200",
    },
  ];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="flex flex-col gap-0">
      <div className="relative w-full min-h-[110px] flex items-center px-6 py-5 overflow-hidden bg-gradient-to-r from-primary/90 via-primary/70 to-accent/60">
        <div className="relative z-10 flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold font-display text-white drop-shadow">
            {greeting()},{" "}
            {
              (currentUser?.fullName ?? currentUser?.name ?? "Admin").split(
                " ",
              )[0]
            }{" "}
            👋
          </h1>
          <p className="text-white/80 text-sm mt-0.5">
            Admin Dashboard · Session:{" "}
            <strong className="text-white">{currentSession?.label}</strong>
          </p>
        </div>
      </div>

      <div className="p-4 lg:p-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total Students"
            value={loading ? "—" : (stats?.totalStudents ?? "—")}
            sub="Active enrollments"
            icon={Users}
            color="bg-primary"
            onClick={() => onNavigate("students")}
            ocid="admin.students.card"
          />
          <StatCard
            label="Attendance Today"
            value={loading ? "—" : `${stats?.attendancePercent ?? 0}%`}
            sub="Students present"
            icon={CalendarCheck}
            color="bg-emerald-600"
            onClick={() => onNavigate("attendance")}
            ocid="admin.attendance.card"
          />
          <StatCard
            label="Exams This Month"
            value={loading ? "—" : (stats?.examsThisMonth ?? 0)}
            sub="Scheduled exams"
            icon={ClipboardList}
            color="bg-violet-600"
            onClick={() => onNavigate("examinations")}
            ocid="admin.exams.card"
          />
          <StatCard
            label="Homework Due"
            value={loading ? "—" : (stats?.homeworkDue ?? 0)}
            sub="Pending submissions"
            icon={BookOpen}
            color="bg-orange-500"
            onClick={() => onNavigate("homework")}
            ocid="admin.homework.card"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card className="p-5">
            <h2 className="font-display font-semibold text-foreground mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.page}
                    variant="ghost"
                    data-ocid={`admin.quick_action.${action.page}`}
                    onClick={() => onNavigate(action.page)}
                    className={`flex flex-col items-center gap-2 h-auto py-4 rounded-xl ${action.color}`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm font-medium text-center">
                      {action.label}
                    </span>
                  </Button>
                );
              })}
            </div>
          </Card>

          {/* Recent Students */}
          <Card className="p-5" data-ocid="admin.recent_students.card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-foreground text-sm">
                Recently Added Students
              </h2>
              <button
                type="button"
                onClick={() => onNavigate("students")}
                className="text-xs text-primary hover:underline"
              >
                View all →
              </button>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : recentStudents.length === 0 ? (
              <div
                className="py-6 text-center text-muted-foreground"
                data-ocid="admin.recent_students.empty_state"
              >
                <GraduationCap className="w-7 h-7 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No students yet</p>
                <button
                  type="button"
                  onClick={() => onNavigate("students")}
                  className="text-primary text-sm hover:underline mt-1"
                >
                  Add Students →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentStudents.map((s, i) => (
                  <div
                    key={s.id}
                    data-ocid={`admin.student.item.${i + 1}`}
                    className="flex items-center gap-3 py-1.5 border-b border-border/50 last:border-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {s.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.class} {s.section} · #{s.admNo}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
