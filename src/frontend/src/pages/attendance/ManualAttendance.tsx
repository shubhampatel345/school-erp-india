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
import type { AttendanceRecord, ClassSection, Student } from "../../types";
import { generateId } from "../../utils/localStorage";
import {
  getPushPreferences,
  sendLocalNotification,
} from "../../utils/notifications";

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
  existingId?: string;
}

function getRowBg(status: AttendStatus) {
  if (status === "Absent") return "bg-destructive/5";
  if (status === "Present") return "bg-accent/5";
  if (status === "Leave") return "bg-blue-500/5";
  if (status === "Late") return "bg-amber-500/5";
  return "";
}

export default function ManualAttendance({
  date,
  onDateChange,
}: ManualAttendanceProps) {
  const {
    getData,
    saveData,
    updateData,
    addNotification,
    currentSession,
    currentUser,
  } = useApp();

  const [filterClass, setFilterClass] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  // Derived data from context
  const allStudents = useMemo(() => {
    return (getData("students") as Student[]).filter(
      (s) =>
        s.sessionId === (currentSession?.id ?? "") && s.status === "active",
    );
  }, [getData, currentSession]);

  const classSections = useMemo(
    () => getData("classes") as ClassSection[],
    [getData],
  );

  // Build sorted class list from context, fallback to fixed list
  const classList = useMemo(() => {
    const order = [
      "Nursery",
      "LKG",
      "UKG",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
    ];
    if (classSections.length > 0) {
      const names = classSections.map((c) => c.className);
      return order
        .filter((c) => names.includes(c))
        .concat(names.filter((n) => !order.includes(n)));
    }
    return order;
  }, [classSections]);

  // Available sections for selected class
  const sectionList = useMemo(() => {
    if (!filterClass) return ["A", "B", "C", "D", "E"];
    const cs = classSections.find((c) => c.className === filterClass);
    return cs?.sections?.length ? cs.sections : ["A", "B", "C", "D", "E"];
  }, [filterClass, classSections]);

  // Stats
  const allAttendance = useMemo(
    () =>
      (getData("attendance") as AttendanceRecord[]).filter(
        (r) => r.date === date && r.type === "student",
      ),
    [getData, date],
  );

  const presentTodayIds = useMemo(
    () =>
      new Set(
        allAttendance
          .filter((r) => r.status === "Present")
          .map((r) => r.studentId),
      ),
    [allAttendance],
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
    // Pre-fill with existing attendance for this date
    const existing = getData("attendance") as AttendanceRecord[];
    const loadedRows: StudentRow[] = matching.map((student) => {
      const rec = existing.find(
        (r) => r.date === date && r.studentId === student.id,
      );
      return {
        student,
        status: rec ? (rec.status as AttendStatus) : "Present",
        existingId: rec?.id,
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
    const now = new Date();
    const timeIn = now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    try {
      const savePromises = rows.map((row) => {
        const base: AttendanceRecord = {
          id: row.existingId ?? generateId(),
          studentId: row.student.id,
          date,
          status: row.status as AttendanceRecord["status"],
          timeIn,
          markedBy: currentUser?.username ?? currentUser?.name ?? "System",
          type: "student",
          class: row.student.class,
          section: row.student.section,
          sessionId: currentSession?.id,
          method: "manual",
        };
        if (row.existingId) {
          return updateData(
            "attendance",
            row.existingId,
            base as unknown as Record<string, unknown>,
          );
        }
        return saveData(
          "attendance",
          base as unknown as Record<string, unknown>,
        );
      });

      await Promise.allSettled(savePromises);

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

      // Send local push notifications for absent students
      const pushPrefs = getPushPreferences();
      if (pushPrefs.attendanceAbsent) {
        const absentRows = rows.filter((r) => r.status === "Absent");
        for (const row of absentRows) {
          sendLocalNotification(
            "Attendance Alert",
            `${row.student.fullName} was marked absent today (${date})`,
            "attendance",
            "/",
          );
        }
      }

      // Update existingId so re-saves become updates
      setRows((prev) =>
        prev.map((r) => ({ ...r, existingId: r.existingId ?? r.student.id })),
      );
    } catch {
      toast.error("Failed to save some attendance records. Please retry.");
    } finally {
      setSaving(false);
    }
  }, [
    rows,
    date,
    currentUser,
    currentSession,
    filterClass,
    filterSection,
    addNotification,
    saveData,
    updateData,
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

  const presentInRows = rows.filter((r) => r.status === "Present").length;
  const absentInRows = rows.filter((r) => r.status === "Absent").length;

  return (
    <div className="space-y-5">
      {/* Summary Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
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
      </div>

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
              data-ocid="manual.date-picker"
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
                setFilterSection("");
                setLoaded(false);
                setRows([]);
              }}
            >
              <SelectTrigger
                className="w-36"
                data-ocid="manual.class-select"
                aria-label="Select class"
              >
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {classList.map((c) => (
                  <SelectItem key={c} value={c}>
                    {["Nursery", "LKG", "UKG"].includes(c) ? c : `Class ${c}`}
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
                data-ocid="manual.section-select"
                aria-label="Select section"
              >
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {sectionList.map((s) => (
                  <SelectItem key={s} value={s}>
                    Section {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={loadStudents}
            data-ocid="manual.load-students-button"
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
                data-ocid="manual.mark-all-present-button"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                All Present
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => markAll("Absent")}
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                data-ocid="manual.mark-all-absent-button"
              >
                <UserX className="w-3.5 h-3.5 mr-1.5" />
                All Absent
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={exportCSV}
                data-ocid="manual.export-csv-button"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Export
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  void handleSave();
                }}
                disabled={saving}
                data-ocid="manual.save-button"
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
                      data-ocid={`manual.student-row.${idx + 1}`}
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
                              data-ocid={`manual.status-${s.toLowerCase().replace(" ", "-")}.${idx + 1}`}
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
              onClick={() => {
                void handleSave();
              }}
              disabled={saving}
              size="lg"
              data-ocid="manual.save-bottom-button"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving…" : "Save Attendance"}
            </Button>
          </div>
        </>
      )}

      {/* Empty state */}
      {!loaded && (
        <Card
          className="p-10 flex flex-col items-center gap-4 border-dashed"
          data-ocid="manual.empty-state"
        >
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
