import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowUpRight,
  BookOpen,
  CalendarCheck,
  FileText,
  IndianRupee,
  MessageSquare,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { formatCurrency } from "../../types";
import phpApiService from "../../utils/phpApiService";

interface ChildInfo {
  id: string;
  admNo: string;
  fullName: string;
  class: string;
  section: string;
}

interface AttendanceSummary {
  present: number;
  total: number;
}

interface FeesDue {
  month: string;
  amount: number;
}

interface ExamResult {
  subject: string;
  marks: number;
  total: number;
  grade: string;
}

interface Props {
  onNavigate: (page: string) => void;
}

export default function ParentDashboard({ onNavigate }: Props) {
  const { currentUser, currentSession } = useApp();
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [feesDue, setFeesDue] = useState<FeesDue[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Load children on mount
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const students = await phpApiService.getStudents({
          session: currentSession?.id,
        });
        if (!cancelled && students?.data) {
          const parentMobile = currentUser?.username ?? "";
          type StudentWithMobile = {
            guardianMobile?: string;
            fatherMobile?: string;
          };
          const myChildren = students.data.filter(
            (s) =>
              (s as unknown as StudentWithMobile).guardianMobile ===
                parentMobile ||
              (s as unknown as StudentWithMobile).fatherMobile === parentMobile,
          );
          const childList =
            myChildren.length > 0 ? myChildren : students.data.slice(0, 3);
          setChildren(
            childList.map((s) => ({
              id: s.id,
              admNo: s.admNo,
              fullName: s.fullName,
              class: s.class,
              section: s.section,
            })),
          );
          if (childList.length > 0) setSelectedChildId(childList[0].id);
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
  }, [currentSession?.id, currentUser?.username]);

  // Load selected child data
  useEffect(() => {
    if (!selectedChildId) return;
    // Mock attendance and fee data for now
    setAttendance({ present: 18, total: 22 });
    setFeesDue([
      { month: "February", amount: 3500 },
      { month: "March", amount: 3500 },
    ]);
    setResults([
      { subject: "Mathematics", marks: 87, total: 100, grade: "A" },
      { subject: "Science", marks: 91, total: 100, grade: "A+" },
      { subject: "English", marks: 78, total: 100, grade: "B+" },
      { subject: "Social Studies", marks: 82, total: 100, grade: "A" },
    ]);
  }, [selectedChildId]);

  const selectedChild = children.find((c) => c.id === selectedChildId);
  const totalDue = feesDue.reduce((s, f) => s + f.amount, 0);
  const attendancePct = attendance
    ? Math.round((attendance.present / attendance.total) * 100)
    : 0;

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
              (currentUser?.fullName ?? currentUser?.name ?? "Parent").split(
                " ",
              )[0]
            }{" "}
            👋
          </h1>
          <p className="text-white/80 text-sm mt-0.5">
            Parent Portal · Session:{" "}
            <strong className="text-white">{currentSession?.label}</strong>
          </p>
        </div>
      </div>

      <div className="p-4 lg:p-6 space-y-6">
        {/* Child selector */}
        {children.length > 1 && (
          <Card className="p-4" data-ocid="parent.child_selector.card">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Users className="w-4 h-4" /> Select Child:
              </span>
              {children.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  data-ocid={`parent.child.select.${c.admNo}`}
                  onClick={() => setSelectedChildId(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedChildId === c.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {c.fullName.split(" ")[0]} · {c.class} {c.section}
                </button>
              ))}
            </div>
          </Card>
        )}

        {selectedChild && (
          <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {selectedChild.fullName}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedChild.class} {selectedChild.section} · Adm:{" "}
                {selectedChild.admNo}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Attendance */}
              <Card className="p-5" data-ocid="parent.attendance.card">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarCheck className="w-4 h-4 text-emerald-600" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Attendance This Month
                  </p>
                </div>
                <p className="text-3xl font-bold text-foreground font-display">
                  {attendancePct}%
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {attendance?.present} / {attendance?.total} days present
                </p>
                <div className="mt-3 w-full bg-muted rounded-full h-2">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${attendancePct}%` }}
                  />
                </div>
              </Card>

              {/* Pending Fees */}
              <Card
                className="p-5 cursor-pointer hover:shadow-elevated transition-shadow"
                onClick={() => onNavigate("fees")}
                data-ocid="parent.fees_due.card"
              >
                <div className="flex items-center gap-2 mb-2">
                  <IndianRupee className="w-4 h-4 text-orange-600" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Pending Fees
                  </p>
                </div>
                <p className="text-3xl font-bold text-foreground font-display">
                  {formatCurrency(totalDue)}
                </p>
                <div className="mt-2 space-y-1">
                  {feesDue.map((f) => (
                    <div
                      key={f.month}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-muted-foreground">{f.month}</span>
                      <span className="font-medium text-orange-600">
                        ₹{f.amount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-primary">
                  <span>Pay Now</span>
                  <ArrowUpRight className="w-3 h-3" />
                </div>
              </Card>

              {/* Quick Actions */}
              <Card className="p-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Quick Actions
                </p>
                <div className="space-y-2">
                  {[
                    {
                      label: "Pay Fees",
                      icon: IndianRupee,
                      page: "fees",
                      color: "text-emerald-600",
                    },
                    {
                      label: "View Results",
                      icon: FileText,
                      page: "examinations",
                      color: "text-violet-600",
                    },
                    {
                      label: "Contact School",
                      icon: MessageSquare,
                      page: "communication",
                      color: "text-primary",
                    },
                    {
                      label: "Timetable",
                      icon: BookOpen,
                      page: "academics",
                      color: "text-sky-600",
                    },
                  ].map((a) => {
                    const Icon = a.icon;
                    return (
                      <button
                        key={a.page}
                        type="button"
                        data-ocid={`parent.quick_action.${a.page}`}
                        onClick={() => onNavigate(a.page)}
                        className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/60 transition-colors text-left"
                      >
                        <Icon className={`w-4 h-4 flex-shrink-0 ${a.color}`} />
                        <span className="text-sm font-medium text-foreground">
                          {a.label}
                        </span>
                        <ArrowUpRight className="w-3 h-3 text-muted-foreground ml-auto" />
                      </button>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* Last Exam Results */}
            <Card className="p-5" data-ocid="parent.results.card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-violet-600" />
                  <h2 className="font-display font-semibold text-foreground text-sm">
                    Last Exam Results
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
          </>
        )}
      </div>
    </div>
  );
}
