/**
 * ManualAttendance — Manual attendance entry with search and individual toggle
 * Used as a sub-mode within the QR/Face tabs for fallback manual entry.
 * All saves go directly to MySQL via phpApiService.
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
  CheckCircle2,
  Loader2,
  RefreshCw,
  Save,
  Search,
  UserCheck,
  UserX,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import phpApiService from "../../utils/phpApiService";

interface ManualAttendanceProps {
  date: string;
}

type AttendStatus = "Present" | "Absent" | "Leave" | "Late" | "Half Day";

interface StudentRow {
  studentId: string;
  admNo: string;
  fullName: string;
  fatherName: string;
  className: string;
  section: string;
  status: AttendStatus;
}

const STATUS_COLORS: Record<AttendStatus, string> = {
  Present: "bg-accent text-accent-foreground border-accent",
  Absent: "bg-destructive text-destructive-foreground border-destructive",
  Leave: "bg-blue-500 text-white border-blue-500",
  Late: "bg-amber-500 text-white border-amber-500",
  "Half Day": "bg-secondary text-secondary-foreground border-border",
};

const ALL_CLASSES = [
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

export default function ManualAttendance({ date }: ManualAttendanceProps) {
  const { currentUser } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [filteredRows, setFilteredRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRows(rows);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredRows(
        rows.filter(
          (r) =>
            r.fullName.toLowerCase().includes(q) ||
            r.admNo.toLowerCase().includes(q) ||
            r.fatherName.toLowerCase().includes(q),
        ),
      );
    }
  }, [rows, searchQuery]);

  async function loadStudents() {
    if (!filterClass) {
      toast.error("Select a class first");
      return;
    }
    setLoading(true);
    try {
      const params: Record<string, string> = {
        class: filterClass,
        status: "active",
      };
      if (filterSection) params.section = filterSection;
      const result = await phpApiService.getStudents(params);
      if (result.data.length === 0) {
        toast.info("No students found for selected class/section");
        setRows([]);
        setLoaded(true);
        return;
      }
      const existing = await phpApiService.getAttendance(filterClass, date);
      const existingMap = new Map(existing.map((r) => [r.studentId ?? "", r]));
      setRows(
        result.data.map((s) => {
          const rec = existingMap.get(s.id);
          return {
            studentId: s.id,
            admNo: s.admNo,
            fullName: s.fullName,
            fatherName: (s.fatherName as string) ?? "",
            className: s.class,
            section: s.section,
            status: rec ? (rec.status as AttendStatus) : "Present",
          };
        }),
      );
      setLoaded(true);
    } catch {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  }

  function setStatus(studentId: string, status: AttendStatus) {
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, status } : r)),
    );
  }

  const handleSave = useCallback(async () => {
    if (rows.length === 0) return;
    setSaving(true);
    const timeIn = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    try {
      await phpApiService.markAttendance(
        rows.map((row) => ({
          id: crypto.randomUUID(),
          studentId: row.studentId,
          date,
          status: row.status,
          timeIn,
          markedBy: currentUser?.name ?? currentUser?.username ?? "System",
          type: "student" as const,
          class: row.className,
          section: row.section,
          method: "manual" as const,
        })),
      );
      const presentCount = rows.filter((r) => r.status === "Present").length;
      const absentCount = rows.filter((r) => r.status === "Absent").length;
      toast.success(
        `Attendance saved — ${presentCount} present, ${absentCount} absent`,
      );
    } catch {
      toast.error("Failed to save attendance. Please retry.");
    } finally {
      setSaving(false);
    }
  }, [rows, date, currentUser]);

  const presentCount = rows.filter((r) => r.status === "Present").length;
  const absentCount = rows.filter((r) => r.status === "Absent").length;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
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
              <SelectTrigger className="w-36" data-ocid="manual.class-select">
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {ALL_CLASSES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
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
              <SelectTrigger className="w-28" data-ocid="manual.section-select">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {["A", "B", "C", "D", "E"].map((s) => (
                  <SelectItem key={s} value={s}>
                    Section {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => void loadStudents()}
            disabled={loading || !filterClass}
            data-ocid="manual.load-button"
            className="mt-auto"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading…
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Load
              </>
            )}
          </Button>
        </div>
      </Card>

      {loaded && rows.length > 0 && (
        <>
          {/* Summary bar */}
          <Card className="p-3 bg-muted/30">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium text-foreground">
                {rows.length} students
              </span>
              <Badge variant="secondary" className="text-accent">
                {presentCount} Present
              </Badge>
              <Badge
                variant="outline"
                className="text-destructive border-destructive/30"
              >
                {absentCount} Absent
              </Badge>
              <div className="flex-1 min-w-48">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search student…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-7 text-xs"
                    data-ocid="manual.search.input"
                  />
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setRows((p) =>
                    p.map((r) => ({ ...r, status: "Present" as AttendStatus })),
                  )
                }
                className="text-accent border-accent/30"
                data-ocid="manual.mark-all-present.button"
              >
                <UserCheck className="w-3.5 h-3.5 mr-1" /> All Present
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setRows((p) =>
                    p.map((r) => ({ ...r, status: "Absent" as AttendStatus })),
                  )
                }
                className="text-destructive border-destructive/30"
                data-ocid="manual.mark-all-absent.button"
              >
                <UserX className="w-3.5 h-3.5 mr-1" /> All Absent
              </Button>
              <Button
                size="sm"
                onClick={() => void handleSave()}
                disabled={saving}
                data-ocid="manual.save-button"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5 mr-1" />
                )}
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </Card>

          {/* Student list */}
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
                    <th className="text-center p-3 font-semibold text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, idx) => (
                    <tr
                      key={row.studentId}
                      className="border-t border-border transition-colors"
                      data-ocid={`manual.student-row.${idx + 1}`}
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
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {(
                            [
                              "Present",
                              "Absent",
                              "Leave",
                              "Late",
                              "Half Day",
                            ] as AttendStatus[]
                          ).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setStatus(row.studentId, s)}
                              data-ocid={`manual.status-${s.toLowerCase().replace(" ", "-")}.${idx + 1}`}
                              className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                                row.status === s
                                  ? STATUS_COLORS[s]
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

          <div className="flex justify-end">
            <Button
              onClick={() => void handleSave()}
              disabled={saving}
              size="lg"
              data-ocid="manual.save-bottom.button"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Save Attendance
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {!loaded && !loading && (
        <Card
          className="p-10 flex flex-col items-center gap-4 border-dashed"
          data-ocid="manual.initial.empty_state"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <UserCheck className="w-7 h-7 text-primary/60" />
          </div>
          <div className="text-center">
            <p className="font-display font-semibold text-foreground">
              Manual Attendance
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              Select a class and click Load to begin
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
