import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  CheckCircle2,
  Download,
  Save,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type { AttendanceRecord, Student, TransportRoute } from "../../types";
import { CLASSES, SECTIONS, generateId, ls } from "../../utils/localStorage";
import { buildAbsentMessage, sendWhatsApp } from "../../utils/whatsapp";

interface ManualAttendanceProps {
  date: string;
  onDateChange: (d: string) => void;
}

type AttendStatus = "Present" | "Absent" | "Leave" | "Late" | "Half Day";

const STATUS_CONFIG: { status: AttendStatus; color: string }[] = [
  {
    status: "Present",
    color:
      "data-[active=true]:bg-accent data-[active=true]:text-accent-foreground data-[active=true]:border-accent",
  },
  {
    status: "Absent",
    color:
      "data-[active=true]:bg-destructive data-[active=true]:text-destructive-foreground data-[active=true]:border-destructive",
  },
  {
    status: "Leave",
    color:
      "data-[active=true]:bg-blue-500 data-[active=true]:text-white data-[active=true]:border-blue-500",
  },
  {
    status: "Late",
    color:
      "data-[active=true]:bg-amber-500 data-[active=true]:text-white data-[active=true]:border-amber-500",
  },
  {
    status: "Half Day",
    color:
      "data-[active=true]:bg-secondary data-[active=true]:text-secondary-foreground data-[active=true]:border-border",
  },
];

interface StudentRow {
  student: Student;
  status: AttendStatus;
}

export default function ManualAttendance({
  date,
  onDateChange,
}: ManualAttendanceProps) {
  const { addNotification, currentSession, currentUser } = useApp();

  const [filterClass, setFilterClass] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showRouteBreakdown, setShowRouteBreakdown] = useState(false);

  const allStudents = useMemo(
    () =>
      ls
        .get<Student[]>("students", [])
        .filter(
          (s) =>
            s.sessionId === (currentSession?.id ?? "") && s.status === "active",
        ),
    [currentSession],
  );

  const routes = useMemo(
    () => ls.get<TransportRoute[]>("transport_routes", []),
    [],
  );

  const schoolName = ls.get<{ name: string }>("school_profile", {
    name: "SHUBH SCHOOL ERP",
  }).name;

  // Summary stats (from all records today)
  const todayRecords = useMemo(
    () =>
      ls
        .get<AttendanceRecord[]>("attendance", [])
        .filter((r) => r.date === date && r.type === "student"),
    [date],
  );

  const presentTodayIds = useMemo(
    () =>
      new Set(
        todayRecords
          .filter((r) => r.status === "Present")
          .map((r) => r.studentId),
      ),
    [todayRecords],
  );

  const totalStudents = allStudents.length;
  const presentCount = allStudents.filter((s) =>
    presentTodayIds.has(s.id),
  ).length;

  function loadStudents() {
    if (!filterClass) {
      toast.error("Please select a class first");
      return;
    }
    const matching = allStudents.filter(
      (s) =>
        s.class === filterClass &&
        (filterSection ? s.section === filterSection : true),
    );
    if (matching.length === 0) {
      toast.info("No students found for selected class/section");
      return;
    }
    // Load existing attendance for this date/class
    const existing = ls.get<AttendanceRecord[]>("attendance", []);
    const loadedRows: StudentRow[] = matching.map((student) => {
      const rec = existing.find(
        (r) => r.date === date && r.studentId === student.id,
      );
      return {
        student,
        status: rec ? (rec.status as AttendStatus) : "Present",
      };
    });
    setRows(loadedRows);
    setLoaded(true);
  }

  function setStatus(studentId: string, status: AttendStatus) {
    setRows((prev) =>
      prev.map((r) => (r.student.id === studentId ? { ...r, status } : r)),
    );
  }

  function markAll(status: AttendStatus) {
    setRows((prev) => prev.map((r) => ({ ...r, status })));
  }

  const handleSave = useCallback(async () => {
    if (rows.length === 0) return;
    setSaving(true);
    const all = ls.get<AttendanceRecord[]>("attendance", []);
    const now = new Date();
    const timeIn = now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const absentStudents: Student[] = [];
    const updated = [...all];

    for (const row of rows) {
      const idx = updated.findIndex(
        (r) => r.date === date && r.studentId === row.student.id,
      );
      if (idx !== -1) {
        updated[idx].status = row.status as AttendanceRecord["status"];
        updated[idx].timeIn = timeIn;
        updated[idx].markedBy = currentUser?.name ?? "System";
      } else {
        updated.push({
          id: generateId(),
          studentId: row.student.id,
          date,
          status: row.status as AttendanceRecord["status"],
          timeIn,
          markedBy: currentUser?.name ?? "System",
          type: "student",
          class: row.student.class,
          section: row.student.section,
          sessionId: currentSession?.id,
          method: "manual",
        });
      }
      if (row.status === "Absent") {
        absentStudents.push(row.student);
      }
    }

    ls.set("attendance", updated);
    const presentCount_ = rows.filter((r) => r.status === "Present").length;
    const absentCount = rows.filter((r) => r.status === "Absent").length;
    const leaveCount = rows.filter((r) => r.status === "Leave").length;

    toast.success(
      `Attendance saved — ${presentCount_} present, ${absentCount} absent${leaveCount > 0 ? `, ${leaveCount} on leave` : ""}`,
    );
    addNotification(
      `✅ Attendance saved for Class ${filterClass}${filterSection ? `-${filterSection}` : ""} on ${date}`,
      "success",
      "✅",
    );

    // Send WhatsApp alerts for absent students
    const formattedDate = new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    for (const student of absentStudents) {
      const mobile =
        student.fatherMobile ?? student.guardianMobile ?? student.mobile;
      if (mobile) {
        const msg = buildAbsentMessage(
          student.fullName,
          formattedDate,
          schoolName,
        );
        sendWhatsApp(mobile, msg).catch(() => {});
      }
    }

    setSaving(false);
  }, [
    rows,
    date,
    currentUser,
    currentSession,
    filterClass,
    filterSection,
    addNotification,
    schoolName,
  ]);

  function exportCSV() {
    const rowData = [["Adm No", "Name", "Class", "Section", "Status", "Date"]];
    for (const row of rows) {
      rowData.push([
        row.student.admNo,
        row.student.fullName,
        row.student.class,
        row.student.section,
        row.status,
        date,
      ]);
    }
    const csv = rowData.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    a.download = `attendance_${filterClass}${filterSection || ""}_${date}.csv`;
    a.click();
  }

  // Route-wise present/absent
  const routeBreakdown = useMemo(
    () =>
      routes.map((route) => {
        const rs = allStudents.filter((s) => route.students.includes(s.id));
        const rPresent = rs.filter((s) => presentTodayIds.has(s.id)).length;
        return {
          name: route.routeName,
          bus: route.busNo,
          total: rs.length,
          present: rPresent,
          absent: rs.length - rPresent,
        };
      }),
    [routes, allStudents, presentTodayIds],
  );

  const presentInRows = rows.filter((r) => r.status === "Present").length;
  const absentInRows = rows.filter((r) => r.status === "Absent").length;

  function getRowBg(status: AttendStatus) {
    if (status === "Absent") return "bg-destructive/5";
    if (status === "Present") return "bg-accent/5";
    if (status === "Leave") return "bg-blue-500/5";
    if (status === "Late") return "bg-amber-500/5";
    return "";
  }

  return (
    <div className="space-y-5">
      {/* Summary Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 flex items-center gap-3 bg-primary/5 border-primary/20">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Total Students
            </p>
            <p className="text-xl font-bold font-display text-foreground">
              {totalStudents}
            </p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3 bg-accent/5 border-accent/20">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
            <UserCheck className="w-4 h-4 text-accent-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Present Today
            </p>
            <p className="text-xl font-bold font-display text-foreground">
              {presentCount}
            </p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3 bg-destructive/5 border-destructive/20">
          <div className="w-9 h-9 rounded-lg bg-destructive flex items-center justify-center flex-shrink-0">
            <UserX className="w-4 h-4 text-destructive-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Absent Today
            </p>
            <p className="text-xl font-bold font-display text-foreground">
              {totalStudents - presentCount}
            </p>
          </div>
        </Card>
        <Card
          className="p-4 flex items-center gap-3 bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors"
          onClick={() => setShowRouteBreakdown((v) => !v)}
          data-ocid="route-breakdown-toggle"
        >
          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
            <Bus className="w-4 h-4 text-secondary-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Routes
            </p>
            <p className="text-xl font-bold font-display text-foreground">
              {routes.length}
            </p>
          </div>
        </Card>
      </div>

      {/* Route Breakdown Panel */}
      {showRouteBreakdown && routeBreakdown.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-3 border-b border-border flex items-center gap-2 bg-muted/30">
            <Bus className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm text-foreground">
              Route-wise Present / Absent
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  {["Route", "Bus No", "Total", "Present", "Absent"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left p-2.5 font-semibold text-muted-foreground"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {routeBreakdown.map((r) => (
                  <tr
                    key={r.name}
                    className="border-t border-border hover:bg-muted/20"
                  >
                    <td className="p-2.5 font-medium text-foreground">
                      {r.name}
                    </td>
                    <td className="p-2.5 text-muted-foreground">{r.bus}</td>
                    <td className="p-2.5 text-muted-foreground">{r.total}</td>
                    <td className="p-2.5 text-accent font-semibold">
                      {r.present}
                    </td>
                    <td className="p-2.5 text-destructive font-semibold">
                      {r.absent}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Controls */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Date
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                onDateChange(e.target.value);
                setLoaded(false);
                setRows([]);
              }}
              className="h-9 px-3 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              data-ocid="manual-date-picker"
              aria-label="Attendance date"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Class
            </span>
            <Select
              value={filterClass}
              onValueChange={(v) => {
                setFilterClass(v);
                setLoaded(false);
                setRows([]);
              }}
            >
              <SelectTrigger
                className="w-32"
                data-ocid="manual-class-select"
                aria-label="Select class"
              >
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {CLASSES.map((c) => (
                  <SelectItem key={c} value={c}>
                    Class {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Section
            </span>
            <Select
              value={filterSection}
              onValueChange={(v) => {
                setFilterSection(v === "all" ? "" : v);
                setLoaded(false);
                setRows([]);
              }}
            >
              <SelectTrigger
                className="w-28"
                data-ocid="manual-section-select"
                aria-label="Select section"
              >
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {SECTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    Section {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={loadStudents}
            data-ocid="manual-load-btn"
            className="mt-auto"
          >
            Load Students
          </Button>
        </div>
      </Card>

      {/* Student List */}
      {loaded && rows.length > 0 && (
        <>
          {/* Bulk actions bar */}
          <Card className="p-3 bg-muted/30">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium text-foreground">
                {rows.length} students loaded
              </span>
              <Badge variant="secondary" className="text-accent">
                {presentInRows} Present
              </Badge>
              <Badge
                variant="outline"
                className="text-destructive border-destructive/30"
              >
                {absentInRows} Absent
              </Badge>
              <div className="flex-1" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => markAll("Present")}
                className="text-accent border-accent/30 hover:bg-accent/10"
                data-ocid="mark-all-present-btn"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                All Present
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => markAll("Absent")}
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                data-ocid="mark-all-absent-btn"
              >
                <UserX className="w-3.5 h-3.5 mr-1.5" />
                All Absent
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={exportCSV}
                data-ocid="manual-export-csv"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Export
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                data-ocid="manual-save-btn"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </Card>

          {/* Student rows */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
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
                    <th className="text-left p-3 font-semibold text-muted-foreground hidden md:table-cell">
                      Father
                    </th>
                    <th className="text-center p-3 font-semibold text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr
                      key={row.student.id}
                      className={`border-t border-border transition-colors ${getRowBg(row.status)}`}
                      data-ocid={`student-row-${row.student.admNo}`}
                    >
                      <td className="p-3 text-muted-foreground font-mono text-xs">
                        {idx + 1}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-muted">
                            {row.student.photo ? (
                              <img
                                src={row.student.photo}
                                alt={row.student.fullName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-sm">
                                {row.student.fullName.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {row.student.fullName}
                            </p>
                            <p className="text-xs text-muted-foreground sm:hidden">
                              {row.student.admNo}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground font-mono text-xs hidden sm:table-cell">
                        {row.student.admNo}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs hidden md:table-cell truncate max-w-[120px]">
                        {row.student.fatherName || "—"}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {STATUS_CONFIG.map(({ status: s, color }) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setStatus(row.student.id, s)}
                              data-active={row.status === s}
                              data-ocid={`status-${s.toLowerCase().replace(" ", "-")}-${row.student.admNo}`}
                              className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all bg-transparent text-muted-foreground border-border hover:border-foreground/30 ${color}`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Save button at bottom */}
          <div className="flex justify-end gap-3">
            <Button
              onClick={handleSave}
              disabled={saving}
              size="lg"
              data-ocid="manual-save-bottom-btn"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving…" : "Save Attendance"}
            </Button>
          </div>
        </>
      )}

      {/* Empty state */}
      {!loaded && (
        <Card className="p-10 flex flex-col items-center gap-4 border-dashed">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-primary/60" />
          </div>
          <div className="text-center">
            <p className="font-display font-semibold text-foreground">
              No students loaded
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              Select a class and date above, then click{" "}
              <span className="font-medium text-foreground">Load Students</span>
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
