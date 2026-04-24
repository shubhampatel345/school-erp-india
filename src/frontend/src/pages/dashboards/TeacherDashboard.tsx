import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowUpRight,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  FileText,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import phpApiService from "../../utils/phpApiService";

interface MyClass {
  class: string;
  section: string;
  studentCount: number;
}

interface TimetablePeriod {
  period: number;
  subject: string;
  class_: string;
  section: string;
  time: string;
}

interface PendingHomework {
  id: string;
  title: string;
  class: string;
  section: string;
  dueDate: string;
  subject: string;
}

interface Props {
  onNavigate: (page: string) => void;
}

export default function TeacherDashboard({ onNavigate }: Props) {
  const { currentUser } = useApp();
  const [myClasses, setMyClasses] = useState<MyClass[]>([]);
  const [timetable, setTimetable] = useState<TimetablePeriod[]>([]);
  const [pendingHomework, setPendingHomework] = useState<PendingHomework[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const staffResult = await phpApiService.getStaff();
        if (!cancelled && Array.isArray(staffResult)) {
          const myName = currentUser?.fullName ?? currentUser?.name ?? "";
          const myStaff = staffResult.find((s) => s.name === myName);
          if (myStaff) {
            const subs = myStaff.subjects as
              | Array<{ subject?: string; classFrom?: string }>
              | undefined;
            if (Array.isArray(subs)) {
              const classes: MyClass[] = subs.map((sub) => ({
                class: sub.classFrom ?? "—",
                section: "",
                studentCount: 0,
              }));
              setMyClasses(classes.slice(0, 8));
            }
          }
        }

        const homeworkResult = await phpApiService.getHomework();
        if (!cancelled && Array.isArray(homeworkResult)) {
          const myName = currentUser?.fullName ?? currentUser?.name ?? "";
          const mine = homeworkResult.filter(
            (hw) => (hw as Record<string, unknown>).assignedBy === myName,
          );
          setPendingHomework(
            mine.slice(0, 5).map((hw) => ({
              id: String((hw as Record<string, unknown>).id ?? ""),
              title: String((hw as Record<string, unknown>).title ?? ""),
              class: String((hw as Record<string, unknown>).class ?? ""),
              section: String((hw as Record<string, unknown>).section ?? ""),
              dueDate: String((hw as Record<string, unknown>).dueDate ?? ""),
              subject: String((hw as Record<string, unknown>).subject ?? ""),
            })),
          );
        }

        if (!cancelled) {
          setTimetable([
            {
              period: 1,
              subject: "Mathematics",
              class_: "Class 9",
              section: "A",
              time: "8:00–8:45",
            },
            {
              period: 2,
              subject: "Mathematics",
              class_: "Class 10",
              section: "B",
              time: "8:45–9:30",
            },
            {
              period: 3,
              subject: "Physics",
              class_: "Class 11",
              section: "A",
              time: "9:45–10:30",
            },
            {
              period: 4,
              subject: "Mathematics",
              class_: "Class 8",
              section: "A",
              time: "11:00–11:45",
            },
          ]);
        }
      } catch {
        /* offline — show empty state */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex flex-col gap-0">
      <div className="relative w-full min-h-[110px] flex items-center px-6 py-5 bg-gradient-to-r from-primary/90 via-primary/70 to-accent/60">
        <div className="relative z-10 flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold font-display text-white drop-shadow">
            {greeting()},{" "}
            {
              (currentUser?.fullName ?? currentUser?.name ?? "Teacher").split(
                " ",
              )[0]
            }{" "}
            👋
          </h1>
          <p className="text-white/80 text-sm mt-0.5">
            Teacher Dashboard · {today}
          </p>
        </div>
      </div>

      <div className="p-4 lg:p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Timetable */}
          <Card
            className="p-5 lg:col-span-2"
            data-ocid="teacher.timetable.card"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CalendarCheck className="w-4 h-4 text-primary" />
                </div>
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
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : timetable.length === 0 ? (
              <div
                className="py-6 text-center text-muted-foreground"
                data-ocid="teacher.timetable.empty_state"
              >
                <CalendarCheck className="w-7 h-7 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No classes scheduled today</p>
              </div>
            ) : (
              <div className="space-y-2">
                {timetable.map((p) => (
                  <div
                    key={p.period}
                    data-ocid={`teacher.timetable.item.${p.period}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors"
                  >
                    <Badge
                      variant="outline"
                      className="text-xs w-16 text-center flex-shrink-0"
                    >
                      P{p.period}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {p.subject}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.class_} {p.section}
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

          {/* My Classes */}
          <Card className="p-5" data-ocid="teacher.classes.card">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-accent" />
              </div>
              <h2 className="font-display font-semibold text-foreground text-sm">
                My Classes
              </h2>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : myClasses.length === 0 ? (
              <div
                className="py-4 text-center text-muted-foreground"
                data-ocid="teacher.classes.empty_state"
              >
                <Users className="w-7 h-7 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No classes assigned</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myClasses.map((c, i) => (
                  <div
                    key={`${c.class}-${c.section}`}
                    data-ocid={`teacher.class.item.${i + 1}`}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {c.class} {c.section}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {c.studentCount} students
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Pending Homework + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-5" data-ocid="teacher.homework.card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-orange-600" />
                </div>
                <h2 className="font-display font-semibold text-foreground text-sm">
                  Pending Homework
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("homework")}
                className="text-xs text-primary hover:underline"
              >
                View all →
              </button>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : pendingHomework.length === 0 ? (
              <div
                className="py-4 text-center text-muted-foreground"
                data-ocid="teacher.homework.empty_state"
              >
                <ClipboardList className="w-7 h-7 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No pending homework</p>
                <button
                  type="button"
                  onClick={() => onNavigate("homework")}
                  className="text-primary text-sm hover:underline mt-1"
                >
                  Assign Homework →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingHomework.map((hw, i) => (
                  <div
                    key={hw.id}
                    data-ocid={`teacher.homework.item.${i + 1}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {hw.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {hw.subject} · {hw.class} {hw.section} · Due:{" "}
                        {hw.dueDate}
                      </p>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-display font-semibold text-foreground mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Mark Attendance",
                  icon: CalendarCheck,
                  page: "attendance",
                  color: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
                },
                {
                  label: "Assign Homework",
                  icon: ClipboardList,
                  page: "homework",
                  color: "bg-orange-100 text-orange-700 hover:bg-orange-200",
                },
                {
                  label: "View Results",
                  icon: FileText,
                  page: "examinations",
                  color: "bg-violet-100 text-violet-700 hover:bg-violet-200",
                },
                {
                  label: "Timetable",
                  icon: BookOpen,
                  page: "academics",
                  color: "bg-sky-100 text-sky-700 hover:bg-sky-200",
                },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.page}
                    variant="ghost"
                    data-ocid={`teacher.quick_action.${action.page}`}
                    onClick={() => onNavigate(action.page)}
                    className={`flex flex-col items-center gap-2 h-auto py-4 rounded-xl ${action.color}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium text-center">
                      {action.label}
                    </span>
                  </Button>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
