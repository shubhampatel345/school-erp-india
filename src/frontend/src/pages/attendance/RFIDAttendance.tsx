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
  Clock,
  Download,
  Fingerprint,
  Save,
  Users,
  Zap,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type {
  AttendanceRecord,
  ClassSection,
  Staff,
  Student,
} from "../../types";
import { generateId } from "../../utils/localStorage";

interface RFIDAttendanceProps {
  date: string;
  onDateChange: (d: string) => void;
}

/** Broadcast scan event to WelcomeDisplay (same tab) */
function broadcastScan(
  personId: string,
  personType: "student" | "staff",
  record: AttendanceRecord,
) {
  window.dispatchEvent(
    new CustomEvent("attendance_scan", {
      detail: { personId, personType, record },
    }),
  );
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

export default function RFIDAttendance({
  date,
  onDateChange,
}: RFIDAttendanceProps) {
  const { getData, saveData, addNotification, currentSession, currentUser } =
    useApp();
  const [query, setQuery] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  const [bulkClass, setBulkClass] = useState("");
  const [bulkSection, setBulkSection] = useState("");
  const [saving, setSaving] = useState(false);

  const students = useMemo(
    () =>
      (getData("students") as Student[]).filter(
        (s) =>
          s.sessionId === (currentSession?.id ?? "") && s.status === "active",
      ),
    [getData, currentSession],
  );

  const staff = useMemo(() => getData("staff") as Staff[], [getData]);

  const classSections = useMemo(
    () => getData("classes") as ClassSection[],
    [getData],
  );

  const classList = useMemo(() => {
    if (classSections.length > 0) {
      const names = classSections.map((c) => c.className);
      return CLASS_ORDER.filter((c) => names.includes(c)).concat(
        names.filter((n) => !CLASS_ORDER.includes(n)),
      );
    }
    return CLASS_ORDER;
  }, [classSections]);

  const sectionList = useMemo(() => {
    if (!bulkClass) return ["A", "B", "C", "D", "E"];
    const cs = classSections.find((c) => c.className === bulkClass);
    return cs?.sections?.length ? cs.sections : ["A", "B", "C", "D", "E"];
  }, [bulkClass, classSections]);

  const allAttendance = useMemo(
    () => getData("attendance") as AttendanceRecord[],
    [getData],
  );

  const todayRecords = useMemo(
    () => allAttendance.filter((r) => r.date === date),
    [allAttendance, date],
  );

  /**
   * First scan = time-in (Present). Second scan = time-out.
   */
  const handleScan = useCallback(
    async (
      personId: string,
      personType: "student" | "staff",
    ): Promise<"in" | "out" | "already-out"> => {
      const existing = allAttendance.find(
        (r) =>
          r.date === date &&
          (r.studentId === personId || r.staffId === personId),
      );
      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (!existing) {
        // First scan → time-in
        const student =
          personType === "student"
            ? students.find((s) => s.id === personId)
            : undefined;
        const rec: AttendanceRecord = {
          id: generateId(),
          ...(personType === "student"
            ? { studentId: personId }
            : { staffId: personId }),
          date,
          status: "Present",
          timeIn: timeStr,
          markedBy: currentUser?.username ?? currentUser?.name ?? "System",
          type: personType,
          method: "rfid",
          sessionId: currentSession?.id,
          ...(student
            ? { class: student.class, section: student.section }
            : {}),
        };
        await saveData("attendance", rec as unknown as Record<string, unknown>);
        broadcastScan(personId, personType, rec);
        return "in";
      }

      if (existing.timeOut) return "already-out";

      // Second scan → time-out
      const updated = {
        ...(existing as unknown as Record<string, unknown>),
        timeOut: timeStr,
      };
      await saveData("attendance", updated);
      broadcastScan(personId, personType, {
        ...existing,
        timeOut: timeStr,
      });
      return "out";
    },
    [allAttendance, date, students, currentUser, currentSession, saveData],
  );

  function handleManualEntry() {
    if (!query.trim()) return;
    const q = query.trim().toLowerCase();
    const student = students.find(
      (s) => s.admNo.toLowerCase() === q || s.fullName.toLowerCase() === q,
    );
    if (student) {
      void handleScan(student.id, "student").then((result) => {
        if (result === "in") {
          toast.success(`✅ Time-In: ${student.fullName}`);
          addNotification(`📍 ${student.fullName} checked in`, "info", "📍");
        } else if (result === "out") {
          toast.success(`🚪 Time-Out: ${student.fullName}`);
          addNotification(`🚪 ${student.fullName} checked out`, "info", "🚪");
        } else {
          toast.info(`${student.fullName} already signed in and out today`);
        }
      });
      setQuery("");
      return;
    }
    const staffMember = staff.find(
      (s) =>
        s.empId.toLowerCase() === q ||
        (s.name ?? s.fullName ?? "").toLowerCase() === q,
    );
    if (staffMember) {
      void handleScan(staffMember.id, "staff").then((result) => {
        const name = staffMember.name ?? staffMember.fullName ?? "Staff";
        if (result === "in") {
          toast.success(`✅ Time-In: ${name}`);
          addNotification(`📍 ${name} checked in`, "info", "📍");
        } else if (result === "out") {
          toast.success(`🚪 Time-Out: ${name}`);
        } else {
          toast.info(`${name} already signed in and out today`);
        }
      });
      setQuery("");
      return;
    }
    toast.error("No student or staff found with that ID");
  }

  function simulateRFID() {
    const unmarked = students.filter(
      (s) =>
        !allAttendance.find((r) => r.date === date && r.studentId === s.id),
    );
    if (unmarked.length === 0) {
      toast.info("All students already marked for today");
      return;
    }
    const pick = unmarked[Math.floor(Math.random() * unmarked.length)];
    void handleScan(pick.id, "student").then((result) => {
      if (result === "in") {
        toast.success(
          `📡 RFID Scan: ${pick.fullName} (${pick.admNo}) — Time In`,
        );
        addNotification(`📡 RFID: ${pick.fullName} checked in`, "info", "📡");
      }
    });
  }

  const markAllPresent = useCallback(async () => {
    if (!bulkClass) {
      toast.error("Select a class first");
      return;
    }
    const targets = students.filter(
      (s) =>
        s.class === bulkClass &&
        (bulkSection && bulkSection !== "all"
          ? s.section === bulkSection
          : true) &&
        !allAttendance.find((r) => r.date === date && r.studentId === s.id),
    );
    if (targets.length === 0) {
      toast.info("All selected students already marked");
      return;
    }
    setSaving(true);
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    try {
      const promises = targets.map((s) => {
        const rec: AttendanceRecord = {
          id: generateId(),
          studentId: s.id,
          date,
          status: "Present",
          timeIn: timeStr,
          markedBy: currentUser?.username ?? currentUser?.name ?? "System",
          type: "student",
          method: "rfid",
          sessionId: currentSession?.id,
          class: s.class,
          section: s.section,
        };
        return saveData(
          "attendance",
          rec as unknown as Record<string, unknown>,
        );
      });
      await Promise.allSettled(promises);
      toast.success(
        `Marked ${targets.length} students present (Class ${bulkClass}${bulkSection && bulkSection !== "all" ? `-${bulkSection}` : ""})`,
      );
      addNotification(
        `✅ Bulk attendance saved for Class ${bulkClass}`,
        "success",
        "✅",
      );
    } catch {
      toast.error("Some records failed to save. Please retry.");
    } finally {
      setSaving(false);
    }
  }, [
    bulkClass,
    bulkSection,
    students,
    allAttendance,
    date,
    currentUser,
    currentSession,
    saveData,
    addNotification,
  ]);

  function exportCSV() {
    const rows = [
      [
        "Adm No",
        "Name",
        "Class",
        "Section",
        "Time In",
        "Time Out",
        "Status",
        "Type",
      ],
    ];
    for (const rec of todayRecords) {
      if (rec.type === "student") {
        const s = students.find((x) => x.id === rec.studentId);
        if (s)
          rows.push([
            s.admNo,
            s.fullName,
            s.class,
            s.section,
            rec.timeIn ?? "",
            rec.timeOut ?? "",
            rec.status,
            "Student",
          ]);
      } else {
        const m = staff.find((x) => x.id === rec.staffId);
        if (m)
          rows.push([
            m.empId,
            m.name ?? m.fullName ?? "",
            "-",
            "-",
            rec.timeIn ?? "",
            rec.timeOut ?? "",
            rec.status,
            "Staff",
          ]);
      }
    }
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    a.download = `attendance_rfid_${date}.csv`;
    a.click();
  }

  const filteredRecords = todayRecords.filter((r) => {
    if (r.type === "student") {
      const s = students.find((x) => x.id === r.studentId);
      if (!s) return false;
      if (filterClass !== "all" && s.class !== filterClass) return false;
      if (filterSection !== "all" && s.section !== filterSection) return false;
    }
    return true;
  });

  const presentCount = todayRecords.filter(
    (r) => r.type === "student" && r.status === "Present",
  ).length;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center bg-primary/5 border-primary/20">
          <p className="text-2xl font-bold font-display text-foreground">
            {students.length}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wide">
            Total Students
          </p>
        </Card>
        <Card className="p-4 text-center bg-accent/5 border-accent/20">
          <p className="text-2xl font-bold font-display text-foreground">
            {presentCount}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wide">
            Present Today
          </p>
        </Card>
        <Card className="p-4 text-center bg-muted/40">
          <p className="text-2xl font-bold font-display text-foreground">
            {todayRecords.length}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wide">
            Total Scans
          </p>
        </Card>
      </div>

      {/* Scan Input Row */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="h-9 px-3 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            data-ocid="rfid.date-picker"
            aria-label="Attendance date"
          />
          <div className="flex flex-1 min-w-56 gap-2">
            <Input
              placeholder="Admission No. / Employee ID / Name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleManualEntry()}
              data-ocid="rfid.manual.input"
              className="flex-1"
            />
            <Button
              onClick={handleManualEntry}
              data-ocid="rfid.manual.submit-button"
            >
              Scan / Mark
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={simulateRFID}
            data-ocid="rfid.simulate.button"
          >
            <Zap className="w-4 h-4 mr-1.5" />
            Simulate RFID
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          💡 First scan = Time-In (Present) · Second scan = Time-Out
        </p>
      </Card>

      {/* Bulk Mark */}
      <Card className="p-4 bg-muted/30">
        <div className="flex flex-wrap gap-3 items-center">
          <Fingerprint className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Bulk Mark Present:
          </span>
          <Select value={bulkClass} onValueChange={setBulkClass}>
            <SelectTrigger className="w-32" data-ocid="rfid.bulk-class.select">
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
          <Select value={bulkSection} onValueChange={setBulkSection}>
            <SelectTrigger
              className="w-28"
              data-ocid="rfid.bulk-section.select"
            >
              <SelectValue placeholder="All Sections" />
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
          <Button
            size="sm"
            onClick={() => {
              void markAllPresent();
            }}
            disabled={saving}
            data-ocid="rfid.bulk-mark.button"
          >
            <Users className="w-4 h-4 mr-1.5" />
            {saving ? "Saving…" : "Mark All Present"}
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            data-ocid="rfid.export-csv.button"
          >
            <Download className="w-4 h-4 mr-1.5" /> Export CSV
          </Button>
          <Button
            size="sm"
            onClick={() => {
              addNotification(
                `✅ RFID Attendance saved for ${date} (${todayRecords.length} records)`,
                "success",
                "✅",
              );
              toast.success("Attendance saved successfully!");
            }}
            data-ocid="rfid.save.button"
          >
            <Save className="w-4 h-4 mr-1.5" /> Save
          </Button>
        </div>
      </Card>

      {/* Filter Row */}
      <div className="flex gap-3 items-center flex-wrap">
        <span className="text-sm text-muted-foreground">Filter log:</span>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-32" data-ocid="rfid.filter-class.select">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classList.map((c) => (
              <SelectItem key={c} value={c}>
                {["Nursery", "LKG", "UKG"].includes(c) ? c : `Class ${c}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSection} onValueChange={setFilterSection}>
          <SelectTrigger
            className="w-28"
            data-ocid="rfid.filter-section.select"
          >
            <SelectValue placeholder="All Sections" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {["A", "B", "C", "D", "E"].map((s) => (
              <SelectItem key={s} value={s}>
                Section {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary">{filteredRecords.length} records</Badge>
      </div>

      {/* Scan Log Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="text-left p-3 font-semibold text-muted-foreground">
                  Name
                </th>
                <th className="text-left p-3 font-semibold text-muted-foreground">
                  ID / Adm No.
                </th>
                <th className="text-left p-3 font-semibold text-muted-foreground hidden sm:table-cell">
                  Class
                </th>
                <th className="text-left p-3 font-semibold text-muted-foreground">
                  Time In
                </th>
                <th className="text-left p-3 font-semibold text-muted-foreground">
                  Time Out
                </th>
                <th className="text-left p-3 font-semibold text-muted-foreground hidden md:table-cell">
                  Type
                </th>
                <th className="text-left p-3 font-semibold text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-muted-foreground"
                    data-ocid="rfid.log.empty-state"
                  >
                    <Fingerprint className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>No scan records for {date}</p>
                    <p className="text-xs mt-1">
                      Enter an Admission No. or simulate an RFID scan above
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, idx) => {
                  const student =
                    rec.type === "student"
                      ? students.find((s) => s.id === rec.studentId)
                      : null;
                  const staffMember =
                    rec.type === "staff"
                      ? staff.find((s) => s.id === rec.staffId)
                      : null;
                  const person = student ?? staffMember;
                  if (!person) return null;
                  return (
                    <tr
                      key={rec.id}
                      className="border-t border-border hover:bg-muted/30 transition-colors"
                      data-ocid={`rfid.log.item.${idx + 1}`}
                    >
                      <td className="p-3 font-medium text-foreground">
                        {"fullName" in person ? person.fullName : person.name}
                      </td>
                      <td className="p-3 text-muted-foreground font-mono text-xs">
                        {"admNo" in person ? person.admNo : person.empId}
                      </td>
                      <td className="p-3 text-muted-foreground hidden sm:table-cell">
                        {student
                          ? `${student.class}-${student.section}`
                          : (staffMember?.designation ?? "-")}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {rec.timeIn ?? "-"}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {rec.timeOut ? (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {rec.timeOut}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50 text-xs">
                            —
                          </span>
                        )}
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <Badge
                          variant={
                            rec.type === "student" ? "default" : "secondary"
                          }
                          className="text-xs"
                        >
                          {rec.type === "student" ? "Student" : "Staff"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 text-accent text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
