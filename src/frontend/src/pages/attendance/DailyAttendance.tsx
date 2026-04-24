/**
 * DailyAttendance — Direct API rebuild
 * Loads classes/students/attendance from phpApiService.
 * Saves attendance only after HTTP 200 confirmation.
 * NO local cache, NO IndexedDB.
 */
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
  Loader2,
  RefreshCw,
  Save,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type { ClassRecord } from "../../utils/phpApiService";
import phpApiService from "../../utils/phpApiService";

interface DailyAttendanceProps {
  date: string;
  onDateChange: (d: string) => void;
}

type AttendStatus = "Present" | "Absent" | "Leave" | "Late" | "Half Day";

const STATUS_CONFIG: { status: AttendStatus; activeClass: string }[] = [
  {
    status: "Present",
    activeClass: "bg-accent text-accent-foreground border-accent",
  },
  {
    status: "Absent",
    activeClass:
      "bg-destructive text-destructive-foreground border-destructive",
  },
  { status: "Leave", activeClass: "bg-blue-500 text-white border-blue-500" },
  { status: "Late", activeClass: "bg-amber-500 text-white border-amber-500" },
  {
    status: "Half Day",
    activeClass: "bg-secondary text-secondary-foreground border-border",
  },
];

function getRowBg(status: AttendStatus) {
  if (status === "Absent") return "bg-destructive/5";
  if (status === "Present") return "bg-accent/5";
  if (status === "Leave") return "bg-blue-500/5";
  if (status === "Late") return "bg-amber-500/5";
  return "";
}

interface StudentRow {
  studentId: string;
  admNo: string;
  fullName: string;
  fatherName: string;
  className: string;
  section: string;
  status: AttendStatus;
  existingRecordId?: string;
}

const CLASS_ORDER = [
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

export default function DailyAttendance({
  date,
  onDateChange,
}: DailyAttendanceProps) {
  const { currentUser } = useApp();

  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);

  const [filterClass, setFilterClass] = useState("");
  const [filterSection, setFilterSection] = useState("");

  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load classes on mount
  useEffect(() => {
    setClassesLoading(true);
    phpApiService
      .getClasses()
      .then((data) => setClasses(data))
      .catch(() => toast.error("Failed to load classes"))
      .finally(() => setClassesLoading(false));
  }, []);

  const sortedClasses = [...classes].sort((a, b) => {
    const ai = CLASS_ORDER.indexOf(a.className);
    const bi = CLASS_ORDER.indexOf(b.className);
    if (ai === -1 && bi === -1) return a.className.localeCompare(b.className);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const sectionList = classes.find((c) => c.className === filterClass)
    ?.sections ?? ["A", "B", "C", "D"];

  async function loadStudents() {
    if (!filterClass) {
      toast.error("Please select a class first");
      return;
    }
    setLoadingStudents(true);
    try {
      const params: Record<string, string> = {
        class: filterClass,
        ...(filterSection ? { section: filterSection } : {}),
        status: "active",
      };
      const result = await phpApiService.getStudents(params);
      const students = result.data;

      if (students.length === 0) {
        toast.info("No students found for selected class/section");
        setRows([]);
        setLoaded(true);
        setLoadingStudents(false);
        return;
      }

      // Load existing attendance for this class/date
      const existing = await phpApiService.getAttendance(filterClass, date);
      const existingMap = new Map(existing.map((r) => [r.studentId ?? "", r]));

      const loadedRows: StudentRow[] = students.map((s) => {
        const rec = existingMap.get(s.id);
        return {
          studentId: s.id,
          admNo: s.admNo,
          fullName: s.fullName,
          fatherName: (s.fatherName as string) ?? "",
          className: s.class,
          section: s.section,
          status: rec ? (rec.status as AttendStatus) : "Present",
          existingRecordId: rec?.id,
        };
      });

      setRows(loadedRows);
      setLoaded(true);
    } catch {
      toast.error("Failed to load students. Please retry.");
    } finally {
      setLoadingStudents(false);
    }
  }

  function setStatus(studentId: string, status: AttendStatus) {
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, status } : r)),
    );
  }

  function markAll(status: AttendStatus) {
    setRows((prev) => prev.map((r) => ({ ...r, status })));
  }

  const handleSave = useCallback(async () => {
    if (rows.length === 0) return;
    setSaving(true);
    const timeIn = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    try {
      const records = rows.map((row) => ({
        id: row.existingRecordId ?? crypto.randomUUID(),
        studentId: row.studentId,
        date,
        status: row.status,
        timeIn,
        markedBy: currentUser?.name ?? currentUser?.username ?? "System",
        type: "student" as const,
        class: row.className,
        section: row.section,
        method: "manual" as const,
      }));

      await phpApiService.markAttendance(records);

      const presentCount = rows.filter((r) => r.status === "Present").length;
      const absentCount = rows.filter((r) => r.status === "Absent").length;
      const leaveCount = rows.filter((r) => r.status === "Leave").length;
      toast.success(
        `Attendance saved — ${presentCount} present, ${absentCount} absent${leaveCount > 0 ? `, ${leaveCount} on leave` : ""}`,
      );
    } catch {
      toast.error("Failed to save attendance. Please retry.");
    } finally {
      setSaving(false);
    }
  }, [rows, date, currentUser]);

  function exportCSV() {
    const rowData = [["Adm No", "Name", "Class", "Section", "Status", "Date"]];
    for (const row of rows) {
      rowData.push([
        row.admNo,
        row.fullName,
        row.className,
        row.section,
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
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Card className="p-4 flex items-center gap-3 bg-primary/5 border-primary/20">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Loaded
            </p>
            <p className="text-xl font-bold font-display text-foreground">
              {rows.length}
            </p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3 bg-accent/5 border-accent/20">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
            <UserCheck className="w-4 h-4 text-accent-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Present
            </p>
            <p className="text-xl font-bold font-display text-foreground">
              {presentInRows}
            </p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3 bg-destructive/5 border-destructive/20">
          <div className="w-9 h-9 rounded-lg bg-destructive flex items-center justify-center flex-shrink-0">
            <UserX className="w-4 h-4 text-destructive-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Absent
            </p>
            <p className="text-xl font-bold font-display text-foreground">
              {absentInRows}
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
              data-ocid="daily.date-picker"
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
                data-ocid="daily.class-select"
                disabled={classesLoading}
              >
                <SelectValue
                  placeholder={classesLoading ? "Loading…" : "Select Class"}
                />
              </SelectTrigger>
              <SelectContent>
                {sortedClasses.map((c) => (
                  <SelectItem key={c.id} value={c.className}>
                    {["Nursery", "LKG", "UKG"].includes(c.className)
                      ? c.className
                      : `Class ${c.className}`}
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
              <SelectTrigger className="w-28" data-ocid="daily.section-select">
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
            onClick={() => void loadStudents()}
            disabled={loadingStudents || !filterClass}
            data-ocid="daily.load-students-button"
            className="mt-auto"
          >
            {loadingStudents ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading…
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" /> Load Students
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Student list */}
      {loaded && rows.length > 0 && (
        <>
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
                data-ocid="daily.mark-all-present-button"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> All Present
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => markAll("Absent")}
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                data-ocid="daily.mark-all-absent-button"
              >
                <UserX className="w-3.5 h-3.5 mr-1.5" /> All Absent
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={exportCSV}
                data-ocid="daily.export-csv-button"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Export
              </Button>
              <Button
                size="sm"
                onClick={() => void handleSave()}
                disabled={saving}
                data-ocid="daily.save-button"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </Card>

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
                      key={row.studentId}
                      className={`border-t border-border transition-colors ${getRowBg(row.status)}`}
                      data-ocid={`daily.student-row.${idx + 1}`}
                    >
                      <td className="p-3 text-muted-foreground font-mono text-xs">
                        {idx + 1}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-sm">
                            {row.fullName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {row.fullName}
                            </p>
                            <p className="text-xs text-muted-foreground sm:hidden">
                              {row.admNo}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground font-mono text-xs hidden sm:table-cell">
                        {row.admNo}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs hidden md:table-cell truncate max-w-[120px]">
                        {row.fatherName || "—"}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {STATUS_CONFIG.map(({ status: s, activeClass }) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setStatus(row.studentId, s)}
                              data-ocid={`daily.status-${s.toLowerCase().replace(" ", "-")}.${idx + 1}`}
                              className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                                row.status === s
                                  ? activeClass
                                  : "bg-transparent text-muted-foreground border-border hover:border-foreground/30"
                              }`}
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

          <div className="flex justify-end gap-3">
            <Button
              onClick={() => void handleSave()}
              disabled={saving}
              size="lg"
              data-ocid="daily.save-bottom-button"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving…" : "Save Attendance"}
            </Button>
          </div>
        </>
      )}

      {loaded && rows.length === 0 && (
        <Card
          className="p-10 flex flex-col items-center gap-4 border-dashed"
          data-ocid="daily.empty-state"
        >
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <Users className="w-7 h-7 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-display font-semibold text-foreground">
              No students found
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              No active students for the selected class/section
            </p>
          </div>
        </Card>
      )}

      {!loaded && !loadingStudents && (
        <Card
          className="p-10 flex flex-col items-center gap-4 border-dashed"
          data-ocid="daily.initial-state"
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
