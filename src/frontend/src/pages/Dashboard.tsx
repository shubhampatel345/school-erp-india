import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  ArrowUpRight,
  BarChart2,
  Bus,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  IndianRupee,
  Info,
  LineChart,
  Loader2,
  Plus,
  RefreshCw,
  Server,
  ShieldAlert,
  TrendingUp,
  Users,
  WifiOff,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type React from "react";
import { useApp } from "../context/AppContext";
import { useSync } from "../hooks/useSync";
import type { AttendanceRecord, FeeReceipt, Staff, Student } from "../types";
import { isApiConfigured } from "../utils/api";
import { dataService } from "../utils/dataService";
import { MONTHS, formatCurrency, ls } from "../utils/localStorage";

// ── Stat card ──────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number | React.ReactNode;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  onClick?: () => void;
  "data-ocid"?: string;
  children?: React.ReactNode;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  onClick,
  "data-ocid": ocid,
  children,
}: StatCardProps) {
  return (
    <Card
      data-ocid={
        ocid ?? `dashboard-card-${label.toLowerCase().replace(/\s+/g, "-")}`
      }
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
        <p className="text-2xl font-bold text-foreground font-display mt-0.5 truncate">
          {value}
        </p>
        {sub && (
          <p className="text-muted-foreground text-xs mt-0.5 truncate">{sub}</p>
        )}
        {children}
      </div>
      {onClick && (
        <ArrowUpRight className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
      )}
    </Card>
  );
}

// ── Sync status bar ────────────────────────────────────────

function SyncBar() {
  const {
    mode,
    lastSyncTime,
    lastSyncError,
    triggerSync,
    isPolling,
    serverInfo,
    needsAuth,
    serverCounts,
    syncedCounts,
    pendingSyncCount,
    failedSyncCount,
  } = useSync();
  const [showTooltip, setShowTooltip] = useState(false);

  const displayCounts =
    Object.keys(serverCounts).length > 0 ? serverCounts : syncedCounts;

  const countSummary = (() => {
    const parts: string[] = [];
    if (displayCounts.students)
      parts.push(`${displayCounts.students} students`);
    if (displayCounts.fee_receipts)
      parts.push(`${displayCounts.fee_receipts} receipts`);
    if (displayCounts.staff) parts.push(`${displayCounts.staff} staff`);
    return parts.join(", ");
  })();

  const barConfig = {
    local: {
      bg: "bg-card border-b border-border",
      icon: <Info className="w-4 h-4 text-muted-foreground flex-shrink-0" />,
      label: "Local Mode — data on this device only",
      labelClass: "text-xs font-medium text-muted-foreground",
      badgeCls: "bg-muted text-muted-foreground border-border",
      badgeText: "Local",
    },
    connected: {
      bg: "bg-emerald-50 dark:bg-emerald-950/20 border-b border-emerald-200/60",
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />,
      label: countSummary
        ? `Synced to MySQL — ${countSummary} — all devices share this data`
        : "Synced to MySQL server — all devices see the same data",
      labelClass: "text-xs font-medium text-emerald-700",
      badgeCls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
      badgeText: "Synced",
    },
    syncing: {
      bg: "bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200/60",
      icon: (
        <Loader2 className="w-4 h-4 text-amber-600 animate-spin flex-shrink-0" />
      ),
      label: "Loading data from server…",
      labelClass: "text-xs font-medium text-amber-700",
      badgeCls: "bg-amber-500/10 text-amber-700 border-amber-500/30",
      badgeText: "Syncing",
    },
    offline: {
      bg: "bg-destructive/5 border-b border-destructive/20",
      icon: <WifiOff className="w-4 h-4 text-destructive flex-shrink-0" />,
      label: "Offline Mode — server unreachable, data saved locally only",
      labelClass: "text-xs font-medium text-destructive",
      badgeCls: "bg-destructive/10 text-destructive border-destructive/30",
      badgeText: "Offline",
    },
    auth_error: {
      bg: "bg-amber-50 dark:bg-amber-950/20 border-b border-amber-300/60",
      icon: <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />,
      label: "Server auth required — data not syncing. Open Settings to fix",
      labelClass: "text-xs font-medium text-amber-700",
      badgeCls: "bg-amber-500/10 text-amber-700 border-amber-500/30",
      badgeText: "Auth Required",
    },
  };

  const cfg = barConfig[mode] ?? barConfig.offline;

  function handleAuthClick() {
    const event = new CustomEvent("erp:navigate", { detail: "settings" });
    window.dispatchEvent(event);
  }

  return (
    <div
      className={`${cfg.bg} px-6 py-2 flex items-center gap-2`}
      data-ocid="dashboard.sync_status"
      style={{ cursor: needsAuth ? "pointer" : "default" }}
      onClick={needsAuth ? handleAuthClick : undefined}
      onKeyDown={
        needsAuth
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") handleAuthClick();
            }
          : undefined
      }
      role={needsAuth ? "button" : undefined}
      tabIndex={needsAuth ? 0 : undefined}
      title={needsAuth ? "Click to open Settings and authenticate" : undefined}
    >
      {cfg.icon}
      <span className={cfg.labelClass}>{cfg.label}</span>

      {lastSyncTime && mode === "connected" && (
        <span className="text-xs text-emerald-600 ml-1">
          ·{" "}
          {lastSyncTime.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      )}

      <Badge
        variant="outline"
        className={`text-[10px] px-1.5 py-0.5 ml-1 border ${cfg.badgeCls}`}
        data-ocid={`dashboard.sync_badge.${mode}`}
      >
        {cfg.badgeText}
      </Badge>

      {/* Pending sync queue indicator — shown when changes are waiting to push to server */}
      {pendingSyncCount > 0 && (
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/30 flex items-center gap-1"
          title={`${pendingSyncCount} change${pendingSyncCount !== 1 ? "s" : ""} saved locally, syncing to server in background`}
          data-ocid="dashboard.sync_pending_badge"
        >
          <Loader2 className="w-2.5 h-2.5 animate-spin" />
          {pendingSyncCount} pending
        </span>
      )}

      {/* Failed sync indicator */}
      {failedSyncCount > 0 && (
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/30"
          title={`${failedSyncCount} change${failedSyncCount !== 1 ? "s" : ""} failed to sync. Data is safe locally. Check Settings to fix.`}
          data-ocid="dashboard.sync_failed_badge"
        >
          {failedSyncCount} sync failed
        </span>
      )}

      {mode === "offline" && lastSyncError && (
        <span className="text-xs text-destructive/70 ml-1 truncate max-w-[200px]">
          {lastSyncError}
        </span>
      )}

      {needsAuth && (
        <Button
          size="sm"
          variant="outline"
          className="ml-2 h-6 text-[10px] px-2 border-amber-500/50 text-amber-700 hover:bg-amber-500/10"
          onClick={(e) => {
            e.stopPropagation();
            handleAuthClick();
          }}
          data-ocid="dashboard.sync_auth.button"
        >
          Fix in Settings
        </Button>
      )}

      {mode !== "local" && !needsAuth && (
        <button
          type="button"
          onClick={() => void triggerSync()}
          disabled={isPolling}
          className="ml-1 p-0.5 rounded hover:bg-black/5 transition-colors"
          title="Refresh sync"
          aria-label="Refresh sync"
          data-ocid="dashboard.sync_refresh.button"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-muted-foreground ${isPolling ? "animate-spin" : ""}`}
          />
        </button>
      )}

      {/* Info tooltip */}
      <div
        className="ml-1 relative"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
        {showTooltip && (
          <div className="absolute left-0 top-6 z-50 w-80 bg-card border border-border rounded-lg shadow-elevated p-3 text-xs text-foreground">
            <p className="font-semibold mb-1 flex items-center gap-1.5">
              {mode === "connected" ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />{" "}
                  MySQL Server
                </>
              ) : mode === "local" ? (
                <>
                  <Info className="w-3.5 h-3.5 text-muted-foreground" />{" "}
                  Device-Local Storage
                </>
              ) : mode === "auth_error" ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> Server
                  Auth Required
                </>
              ) : mode === "offline" ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-destructive" /> Server
                  Unreachable
                </>
              ) : (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading data…
                </>
              )}
            </p>
            {mode === "connected" && (
              <div className="space-y-0.5 text-muted-foreground">
                {serverInfo?.db_version && <p>MySQL {serverInfo.db_version}</p>}
                {serverInfo?.version && <p>API v{serverInfo.version}</p>}
                <div className="mt-1 pt-1 border-t border-border/50">
                  <p className="font-medium text-foreground mb-0.5">
                    Records in MySQL:
                  </p>
                  {Object.entries(displayCounts)
                    .filter(([, count]) => count > 0)
                    .map(([col, count]) => (
                      <p key={col} className="flex justify-between">
                        <span className="capitalize">
                          {col.replace(/_/g, " ")}
                        </span>
                        <span className="font-medium text-foreground">
                          {count}
                        </span>
                      </p>
                    ))}
                </div>
              </div>
            )}
            {mode === "local" && (
              <p className="text-muted-foreground leading-relaxed">
                Data is stored in this browser only. Configure a MySQL server in
                Settings → Data Management to sync across devices.
              </p>
            )}
            {mode === "auth_error" && (
              <p className="text-muted-foreground leading-relaxed">
                Go to{" "}
                <strong>Settings → Data Management → Database Server</strong>{" "}
                and click <strong>Authenticate Now</strong>.
              </p>
            )}
            {mode === "offline" && (
              <p className="text-muted-foreground leading-relaxed">
                Server is configured but unreachable. Check your internet
                connection or server status.
              </p>
            )}
          </div>
        )}
      </div>

      {mode === "local" && (
        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-primary cursor-pointer transition-colors">
          <Server className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Configure Server</span>
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { currentSession, currentUser, isReadOnly } = useApp();
  const sessionId = currentSession?.id ?? "";
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  const { serverCounts, mode: syncMode } = useSync();

  const serverCountsLoaded =
    Object.keys(serverCounts).length > 0 ||
    syncMode === "offline" ||
    syncMode === "local" ||
    syncMode === "auth_error";

  const schoolSettings = useMemo(
    () =>
      ls.get<{ dashboardBackground?: string; name?: string }>(
        "school_profile",
        {},
      ),
    [],
  );

  const stats = useMemo(() => {
    const cachedStudents = dataService.get<Student>("students");
    const cachedStaff = dataService.get<Staff>("staff");

    // Total students — always prefer server count (real MySQL)
    const totalStudentsCount: number | "—" =
      serverCounts.students != null
        ? serverCounts.students
        : syncMode === "offline" ||
            syncMode === "local" ||
            syncMode === "auth_error"
          ? cachedStudents.filter(
              (s) => s.sessionId === sessionId && s.status === "active",
            ).length
          : "—";

    const totalTeachersCount =
      serverCounts.teachers != null
        ? serverCounts.teachers
        : cachedStaff.filter(
            (s) =>
              s.designation?.toLowerCase().includes("teacher") ||
              s.designation?.toLowerCase() === "pgt" ||
              s.designation?.toLowerCase() === "tgt" ||
              s.designation?.toLowerCase() === "prt",
          ).length;

    const totalStaffCount =
      serverCounts.staff ?? (cachedStaff.length > 0 ? cachedStaff.length : 0);

    const sessionStudents = cachedStudents.filter(
      (s) => s.sessionId === sessionId && s.status === "active",
    );

    const today = new Date().toISOString().split("T")[0];
    const allAttendance = dataService.get<AttendanceRecord>("attendance");
    const todayAttendance = allAttendance.filter(
      (a) => a.date === today && a.type === "student",
    );
    const presentCount = todayAttendance.filter(
      (a) => a.status === "Present",
    ).length;

    const receipts = dataService
      .get<FeeReceipt>("fee_receipts")
      .filter((r) => r.sessionId === sessionId && !r.isDeleted);
    const todayReceipts = receipts.filter((r) => r.date === today);
    const collectedToday = todayReceipts.reduce(
      (sum, r) => sum + r.totalAmount,
      0,
    );
    const totalCollectedSession = receipts.reduce(
      (sum, r) => sum + r.totalAmount,
      0,
    );

    const jsMonth = new Date().getMonth();
    const currentAcademicMonthIndex = (jsMonth + 9) % 12;

    const paidSet = new Set(
      receipts.flatMap((r) => r.items.map((i) => `${r.studentId}_${i.month}`)),
    );
    const feeHeadings = ls.get<
      Array<{ id: string; months: string[]; amount: number }>
    >("fee_headings", []);
    const feesPlan = ls.get<
      Array<{
        headingId: string;
        classId: string;
        sectionId: string;
        amount: number;
      }>
    >("fees_plan", []);

    const studentTransportV2 = ls.get<
      Array<{ studentId: string; routeId: string; pickupPointId: string }>
    >("student_transport_v2", []);
    const transportRouteData = ls.get<
      Array<{
        id: string;
        pickupPoints: Array<{ id: string; stopName: string; fare?: number }>;
      }>
    >("transport_routes_v2", []);
    const studentTransportMonthsAll = ls.get<Record<string, string[]>>(
      "student_transport_months",
      {},
    );

    const paidTransportSet = new Set(
      receipts.flatMap((r) =>
        r.items
          .filter((i) => i.headingId.startsWith("transport_"))
          .map((i) => `${r.studentId}_${i.month}`),
      ),
    );

    let dueStudents = 0;
    let totalDueAmount = 0;
    let transportDueStudents = 0;
    let totalTransportDue = 0;

    for (const s of sessionStudents) {
      let studentHasFeesDue = false;
      let studentHasTransportDue = false;

      for (const h of feeHeadings) {
        for (const month of h.months) {
          const monthAcademicIndex = MONTHS.indexOf(month);
          if (
            monthAcademicIndex < 0 ||
            monthAcademicIndex > currentAcademicMonthIndex
          )
            continue;
          if (!paidSet.has(`${s.id}_${month}`)) {
            studentHasFeesDue = true;
            const plan =
              feesPlan.find(
                (p) =>
                  p.headingId === h.id &&
                  p.classId === s.class &&
                  p.sectionId === s.section,
              ) ??
              feesPlan.find(
                (p) => p.headingId === h.id && p.classId === s.class,
              );
            totalDueAmount += plan?.amount ?? h.amount;
          }
        }
      }

      const stAssign = studentTransportV2.find((t) => t.studentId === s.id);
      if (stAssign) {
        const route = transportRouteData.find((r) => r.id === stAssign.routeId);
        const pp = route?.pickupPoints.find(
          (p) => p.id === stAssign.pickupPointId,
        );
        const fare = pp?.fare ?? 0;
        if (fare > 0) {
          const applicableMonths = studentTransportMonthsAll[s.id] ?? MONTHS;
          for (const month of applicableMonths) {
            const monthAcademicIndex = MONTHS.indexOf(month);
            if (
              monthAcademicIndex < 0 ||
              monthAcademicIndex > currentAcademicMonthIndex
            )
              continue;
            if (!paidTransportSet.has(`${s.id}_${month}`)) {
              studentHasTransportDue = true;
              totalTransportDue += fare;
            }
          }
        }
      }

      if (studentHasFeesDue) dueStudents++;
      if (studentHasTransportDue) transportDueStudents++;
    }

    const uniqueClassesFromStudents = new Set(
      sessionStudents.map((s) => s.class).filter(Boolean),
    ).size;
    const localClassesCount = ls.get<Array<{ id: string }>>(
      "classes",
      [],
    ).length;
    const uniqueClasses =
      serverCounts.classes != null && serverCounts.classes > 0
        ? serverCounts.classes
        : uniqueClassesFromStudents > 0
          ? uniqueClassesFromStudents
          : localClassesCount;

    const transportRoutes = ls.get<Array<{ id: string }>>(
      "transport_routes_v2",
      [],
    );

    const classCounts: Record<string, { present: number; total: number }> = {};
    for (const s of sessionStudents) {
      const key = `Class ${s.class}`;
      if (!classCounts[key]) classCounts[key] = { present: 0, total: 0 };
      classCounts[key].total++;
      const rec = todayAttendance.find((a) => a.studentId === s.id);
      if (rec?.status === "Present") classCounts[key].present++;
    }

    const studentTransports = ls.get<
      Array<{ studentId: string; routeName: string; busNo: string }>
    >("student_transport_v2", []);
    const routeCounts: Record<string, { present: number; total: number }> = {};
    for (const s of sessionStudents) {
      const transport = studentTransports.find((t) => t.studentId === s.id);
      const routeKey = transport
        ? `Bus ${transport.busNo} – ${(transport as unknown as { routeName?: string }).routeName ?? ""}`
        : "Walk-in";
      if (!routeCounts[routeKey])
        routeCounts[routeKey] = { present: 0, total: 0 };
      routeCounts[routeKey].total++;
      const rec = todayAttendance.find((a) => a.studentId === s.id);
      if (rec?.status === "Present") routeCounts[routeKey].present++;
    }

    const currentMonthName =
      MONTHS[
        new Date().getMonth() >= 3
          ? new Date().getMonth() - 3
          : new Date().getMonth() + 9
      ];

    const displayStudentsNum =
      typeof totalStudentsCount === "number" ? totalStudentsCount : 0;

    return {
      students: totalStudentsCount,
      teachers: totalTeachersCount,
      totalStaff: totalStaffCount,
      presentCount,
      presentPct:
        displayStudentsNum > 0
          ? Math.round((presentCount / displayStudentsNum) * 100)
          : 0,
      collectedToday,
      totalCollectedSession,
      dueStudents,
      totalDueAmount,
      transportDueStudents,
      totalTransportDue,
      grandTotalDue: totalDueAmount + totalTransportDue,
      uniqueClasses,
      transportRoutes: transportRoutes.length,
      classCounts,
      routeCounts,
      today,
      currentMonthName,
    };
  }, [sessionId, serverCounts, syncMode]);

  const recentReceipts = useMemo(() => {
    const allReceipts =
      dataService.get<FeeReceipt>("fee_receipts").length > 0
        ? dataService.get<FeeReceipt>("fee_receipts")
        : ls.get<FeeReceipt[]>("fee_receipts", []);
    return allReceipts
      .filter((r) => r.sessionId === sessionId && !r.isDeleted)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [sessionId]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const quickActions = [
    {
      label: "Add Student",
      icon: Plus,
      page: "students",
      color: "bg-primary/10 text-primary hover:bg-primary/20",
    },
    {
      label: "Collect Fees",
      icon: IndianRupee,
      page: "fees",
      color: "bg-accent/10 text-accent hover:bg-accent/20",
    },
    {
      label: "Mark Attendance",
      icon: CalendarCheck,
      page: "attendance",
      color: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
    },
    {
      label: "View Reports",
      icon: ClipboardList,
      page: "reports",
      color: "bg-orange-100 text-orange-700 hover:bg-orange-200",
    },
  ];

  // Show skeleton only when API configured and server hasn't responded yet
  const showLoadingSkeleton = isApiConfigured() && !serverCountsLoaded;

  return (
    <div className="flex flex-col gap-0">
      {/* Hero Banner */}
      <div
        className="relative w-full min-h-[120px] flex items-center px-6 py-5 overflow-hidden"
        style={
          schoolSettings.dashboardBackground
            ? {
                backgroundImage: `url(${schoolSettings.dashboardBackground})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <div
          className={`absolute inset-0 ${
            schoolSettings.dashboardBackground
              ? "bg-black/55"
              : "bg-gradient-to-r from-primary/90 via-primary/70 to-accent/60"
          }`}
        />
        <div className="relative z-10 flex-1 min-w-0">
          {isReadOnly && (
            <div className="bg-amber-500/90 text-amber-950 rounded-lg px-3 py-1.5 flex items-center gap-2 mb-3 w-fit">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-xs font-semibold">
                Viewing archived session:{" "}
                <strong>{currentSession?.label}</strong> — Read Only
              </p>
            </div>
          )}
          <h1 className="text-xl sm:text-2xl font-bold font-display text-white drop-shadow">
            {greeting()},{" "}
            {
              (currentUser?.fullName ?? currentUser?.name ?? "User").split(
                " ",
              )[0]
            }{" "}
            👋
          </h1>
          <p className="text-white/80 text-sm mt-0.5">
            Session:{" "}
            <strong className="text-white">{currentSession?.label}</strong>
            &nbsp;•&nbsp;
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          {schoolSettings.name && (
            <p className="text-white/70 text-xs mt-1 font-medium">
              {schoolSettings.name}
            </p>
          )}
        </div>
        <Badge
          variant="secondary"
          className="relative z-10 text-xs px-3 py-1.5 flex-shrink-0 bg-white/20 text-white border-white/30 backdrop-blur-sm"
        >
          {new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Badge>
      </div>

      {/* Sync status bar */}
      <SyncBar />

      <div className="p-4 lg:p-6 space-y-6">
        {/* KPI stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Students"
            value={
              showLoadingSkeleton ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                stats.students
              )
            }
            sub={
              showLoadingSkeleton
                ? "Loading from server…"
                : "Active enrollments"
            }
            icon={Users}
            color="bg-primary"
            onClick={() => onNavigate("students")}
            data-ocid="dashboard.students.card"
          />
          <StatCard
            label="Total Teachers"
            value={
              showLoadingSkeleton ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                stats.teachers
              )
            }
            sub={`${stats.totalStaff} total staff`}
            icon={GraduationCap}
            color="bg-purple-600"
            onClick={() => onNavigate("hr")}
            data-ocid="dashboard.teachers.card"
          />
          <StatCard
            label="Classes"
            value={stats.uniqueClasses}
            sub="Active classes"
            icon={ClipboardList}
            color="bg-sky-600"
            data-ocid="dashboard.classes.card"
          />
          <StatCard
            label="Fees Collected Today"
            value={formatCurrency(stats.collectedToday)}
            sub={`Session: ${formatCurrency(stats.totalCollectedSession)}`}
            icon={IndianRupee}
            color="bg-emerald-600"
            onClick={() => onNavigate("fees")}
            data-ocid="dashboard.fees_collected.card"
          />
          <StatCard
            label="Student Present Today"
            value={`${stats.presentPct}%`}
            sub={`${stats.presentCount} / ${stats.students}`}
            icon={CalendarCheck}
            color="bg-accent"
            onClick={() => setShowAttendanceModal(true)}
            data-ocid="dashboard.present_today.card"
          />

          {/* Fees Awaiting */}
          <Card
            data-ocid="dashboard.fees_awaiting.card"
            onClick={() => onNavigate("fees")}
            className="p-5 flex items-start gap-4 cursor-pointer hover:shadow-elevated transition-shadow col-span-2 sm:col-span-1"
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-orange-500">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Fees Awaiting
              </p>
              <p className="text-2xl font-bold text-foreground font-display mt-0.5">
                {formatCurrency(stats.grandTotalDue)}
              </p>
              <div className="mt-1.5 space-y-0.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-muted-foreground">Tuition/Fees</span>
                  <span className="font-semibold text-orange-600">
                    {formatCurrency(stats.totalDueAmount)}
                    <span className="text-muted-foreground font-normal ml-1">
                      ({stats.dueStudents} std)
                    </span>
                  </span>
                </div>
                {stats.totalTransportDue > 0 && (
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-muted-foreground flex items-center gap-0.5">
                      <Bus className="w-3 h-3" /> Transport
                    </span>
                    <span className="font-semibold text-blue-600">
                      {formatCurrency(stats.totalTransportDue)}
                      <span className="text-muted-foreground font-normal ml-1">
                        ({stats.transportDueStudents} std)
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
          </Card>

          <StatCard
            label="Transport"
            value={stats.transportRoutes}
            sub="Active routes"
            icon={Bus}
            color="bg-rose-600"
            onClick={() => onNavigate("transport")}
            data-ocid="dashboard.transport.card"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Attendance by Class */}
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-foreground">
                Today's Attendance
              </h2>
              <button
                type="button"
                onClick={() => onNavigate("attendance")}
                className="text-xs text-primary hover:underline"
              >
                View all →
              </button>
            </div>
            {Object.keys(stats.classCounts).length === 0 ? (
              <div
                className="py-8 text-center text-muted-foreground"
                data-ocid="dashboard.attendance.empty_state"
              >
                <CalendarCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No attendance recorded today</p>
                <button
                  type="button"
                  onClick={() => onNavigate("attendance")}
                  className="text-primary text-sm hover:underline mt-1"
                >
                  Mark Attendance →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(stats.classCounts)
                  .slice(0, 8)
                  .map(([cls, data]) => {
                    const pct =
                      data.total > 0 ? (data.present / data.total) * 100 : 0;
                    return (
                      <div key={cls} className="flex items-center gap-3">
                        <span className="text-sm text-foreground w-20 flex-shrink-0 font-medium">
                          {cls}
                        </span>
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-24 text-right flex-shrink-0">
                          {data.present}/{data.total} ({Math.round(pct)}%)
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>

          {/* Recent Receipts */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-foreground">
                Recent Receipts
              </h2>
              <button
                type="button"
                onClick={() => onNavigate("fees")}
                className="text-xs text-primary hover:underline"
              >
                View all →
              </button>
            </div>
            {recentReceipts.length === 0 ? (
              <div
                className="py-6 text-center text-muted-foreground"
                data-ocid="dashboard.receipts.empty_state"
              >
                <IndianRupee className="w-7 h-7 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No receipts yet</p>
                <button
                  type="button"
                  onClick={() => onNavigate("fees")}
                  className="text-primary text-sm hover:underline mt-1"
                >
                  Collect Fees →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentReceipts.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 py-1">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <IndianRupee className="w-4 h-4 text-emerald-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {r.studentName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.date} · #{r.receiptNo}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-700 flex-shrink-0">
                      ₹{r.totalAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="p-5">
          <h2 className="font-display font-semibold text-foreground mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.page}
                  variant="ghost"
                  data-ocid={`quick-action-${action.page.replace("/", "-")}`}
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

        {/* Student Performance Analytics widget */}
        <Card
          className="p-5 border-primary/20 bg-gradient-to-r from-primary/5 via-background to-accent/5 cursor-pointer hover:shadow-elevated transition-shadow"
          onClick={() => onNavigate("analytics")}
          data-ocid="dashboard.analytics.card"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                <LineChart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-foreground">
                  Student Performance Analytics
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  View detailed charts for marks trends, attendance %, and fees
                  history per student
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 ml-4">
              <div className="hidden sm:flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-muted/60 rounded-lg px-3 py-1.5">
                  <BarChart2 className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-foreground">
                    Marks Trend
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-muted/60 rounded-lg px-3 py-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-accent" />
                  <span className="text-xs font-medium text-foreground">
                    Attendance %
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-primary/30 text-primary hover:bg-primary/10"
                data-ocid="dashboard.analytics.view_button"
              >
                View Analytics
                <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Fee due alert */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Fee Due Date: 15th of every month
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Current month: {stats.currentMonthName} · {stats.dueStudents}{" "}
              students have pending dues · Total outstanding:{" "}
              {formatCurrency(stats.grandTotalDue)}
              {stats.totalTransportDue > 0 &&
                ` (incl. ${formatCurrency(stats.totalTransportDue)} transport)`}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate("fees")}
            className="ml-auto flex-shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100"
            data-ocid="dashboard.view_dues.button"
          >
            View Dues
          </Button>
        </div>
      </div>

      {/* Attendance modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div
            className="bg-card rounded-2xl shadow-elevated w-full max-w-2xl border border-border max-h-[85vh] flex flex-col"
            data-ocid="dashboard.attendance.dialog"
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-display font-semibold text-foreground">
                Today's Attendance — {new Date().toLocaleDateString("en-IN")}
              </h2>
              <button
                type="button"
                onClick={() => setShowAttendanceModal(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
                data-ocid="dashboard.attendance.close_button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-6">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-primary/5 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-primary font-display">
                    {stats.presentCount}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Present
                  </p>
                </div>
                <div className="bg-destructive/5 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-destructive font-display">
                    {typeof stats.students === "number"
                      ? stats.students - stats.presentCount
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Absent</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground font-display">
                    {stats.students}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Total</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                  Class Wise
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left p-2 text-xs font-medium text-muted-foreground">
                          Class
                        </th>
                        <th className="text-center p-2 text-xs font-medium text-muted-foreground">
                          Present
                        </th>
                        <th className="text-center p-2 text-xs font-medium text-muted-foreground">
                          Absent
                        </th>
                        <th className="text-center p-2 text-xs font-medium text-muted-foreground">
                          Total
                        </th>
                        <th className="text-center p-2 text-xs font-medium text-muted-foreground">
                          %
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(stats.classCounts).map(([cls, data]) => {
                        const pct =
                          data.total > 0
                            ? Math.round((data.present / data.total) * 100)
                            : 0;
                        return (
                          <tr key={cls} className="border-t border-border/50">
                            <td className="p-2 text-sm font-medium text-foreground">
                              {cls}
                            </td>
                            <td className="p-2 text-center text-sm text-green-600 font-semibold">
                              {data.present}
                            </td>
                            <td className="p-2 text-center text-sm text-destructive font-semibold">
                              {data.total - data.present}
                            </td>
                            <td className="p-2 text-center text-sm text-muted-foreground">
                              {data.total}
                            </td>
                            <td className="p-2 text-center">
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pct >= 75 ? "bg-accent/20 text-accent" : "bg-orange-100 text-orange-700"}`}
                              >
                                {pct}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {Object.keys(stats.classCounts).length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-4 text-center text-muted-foreground text-sm"
                          >
                            No attendance recorded today
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide flex items-center gap-1.5">
                  <Bus className="w-4 h-4" /> Route Wise
                </h3>
                <div className="space-y-2">
                  {Object.entries(stats.routeCounts).map(([route, data]) => {
                    const pct =
                      data.total > 0
                        ? Math.round((data.present / data.total) * 100)
                        : 0;
                    return (
                      <div
                        key={route}
                        className="flex items-center justify-between py-2 border-b border-border/50"
                      >
                        <span className="text-sm font-medium text-foreground">
                          {route}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {data.present}/{data.total}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {pct}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(stats.routeCounts).length === 0 && (
                    <p className="text-muted-foreground text-sm">
                      No transport data available
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
