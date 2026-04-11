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
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type { AttendanceRecord, Staff, Student } from "../../types";
import { CLASSES, SECTIONS, generateId, ls } from "../../utils/localStorage";

interface RFIDAttendanceProps {
  date: string;
  onDateChange: (d: string) => void;
}

/** Broadcast scan event to WelcomeDisplay via localStorage key */
function broadcastScan(
  personId: string,
  personType: "student" | "staff",
  record: AttendanceRecord,
) {
  ls.set("last_scan", { personId, personType, record, ts: Date.now() });
  window.dispatchEvent(
    new CustomEvent("attendance_scan", {
      detail: { personId, personType, record },
    }),
  );
}

export default function RFIDAttendance({
  date,
  onDateChange,
}: RFIDAttendanceProps) {
  const { addNotification, currentSession, currentUser } = useApp();
  const [query, setQuery] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  const [bulkClass, setBulkClass] = useState("");
  const [bulkSection, setBulkSection] = useState("");

  const students = useMemo(
    () =>
      ls
        .get<Student[]>("students", [])
        .filter(
          (s) =>
            s.sessionId === (currentSession?.id ?? "") && s.status === "active",
        ),
    [currentSession],
  );

  const staff = useMemo(() => ls.get<Staff[]>("staff", []), []);

  const [records, setRecords] = useState<AttendanceRecord[]>(() =>
    ls.get<AttendanceRecord[]>("attendance", []),
  );

  const todayRecords = useMemo(
    () => records.filter((r) => r.date === date),
    [records, date],
  );

  function saveRecords(updated: AttendanceRecord[]) {
    setRecords(updated);
    ls.set("attendance", updated);
  }

  /**
   * First scan of the day = time-in (Present).
   * Second scan = time-out (updates existing record with timeOut).
   * Returns "in" | "out" | "already-out"
   */
  function handleScan(
    personId: string,
    personType: "student" | "staff",
  ): "in" | "out" | "already-out" {
    const existingIdx = records.findIndex(
      (r) =>
        r.date === date && (r.studentId === personId || r.staffId === personId),
    );
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (existingIdx === -1) {
      // First scan → time-in
      const rec: AttendanceRecord = {
        id: generateId(),
        ...(personType === "student"
          ? { studentId: personId }
          : { staffId: personId }),
        date,
        status: "Present",
        timeIn: timeStr,
        markedBy: currentUser?.name ?? "System",
        type: personType,
        method: "rfid",
      };
      const updated = [...records, rec];
      saveRecords(updated);
      broadcastScan(personId, personType, rec);
      return "in";
    }

    const existing = records[existingIdx];
    if (existing.timeOut) {
      return "already-out";
    }

    // Second scan → time-out
    const updated = [...records];
    updated[existingIdx] = { ...existing, timeOut: timeStr };
    saveRecords(updated);
    broadcastScan(personId, personType, updated[existingIdx]);
    return "out";
  }

  function handleManualEntry() {
    if (!query.trim()) return;
    const q = query.trim().toLowerCase();
    const student = students.find(
      (s) => s.admNo.toLowerCase() === q || s.fullName.toLowerCase() === q,
    );
    if (student) {
      const result = handleScan(student.id, "student");
      if (result === "in") {
        toast.success(`✅ Time-In: ${student.fullName}`);
        addNotification(`📍 ${student.fullName} checked in`, "info", "📍");
      } else if (result === "out") {
        toast.success(`🚪 Time-Out: ${student.fullName}`);
        addNotification(`🚪 ${student.fullName} checked out`, "info", "🚪");
      } else {
        toast.info(`${student.fullName} already signed in and out today`);
      }
      setQuery("");
      return;
    }
    const staffMember = staff.find(
      (s) => s.empId.toLowerCase() === q || s.name.toLowerCase() === q,
    );
    if (staffMember) {
      const result = handleScan(staffMember.id, "staff");
      if (result === "in") {
        toast.success(`✅ Time-In: ${staffMember.name}`);
        addNotification(`📍 ${staffMember.name} checked in`, "info", "📍");
      } else if (result === "out") {
        toast.success(`🚪 Time-Out: ${staffMember.name}`);
      } else {
        toast.info(`${staffMember.name} already signed in and out today`);
      }
      setQuery("");
      return;
    }
    toast.error("No student or staff found with that ID");
  }

  function simulateRFID() {
    const unmarked = students.filter(
      (s) => !records.find((r) => r.date === date && r.studentId === s.id),
    );
    if (unmarked.length === 0) {
      // Simulate a time-out instead
      const needsOut = students.find((s) => {
        const rec = records.find(
          (r) => r.date === date && r.studentId === s.id,
        );
        return rec && !rec.timeOut;
      });
      if (needsOut) {
        const result = handleScan(needsOut.id, "student");
        if (result === "out") {
          toast.success(`🚪 RFID Time-Out: ${needsOut.fullName}`);
        }
        return;
      }
      toast.info("All students already marked for today");
      return;
    }
    const pick = unmarked[Math.floor(Math.random() * unmarked.length)];
    const result = handleScan(pick.id, "student");
    if (result === "in") {
      toast.success(`📡 RFID Scan: ${pick.fullName} (${pick.admNo}) — Time In`);
      addNotification(`📡 RFID: ${pick.fullName} checked in`, "info", "📡");
    }
  }

  function markAllPresent() {
    if (!bulkClass) {
      toast.error("Select a class first");
      return;
    }
    const targets = students.filter(
      (s) =>
        s.class === bulkClass &&
        (bulkSection ? s.section === bulkSection : true) &&
        !records.find((r) => r.date === date && r.studentId === s.id),
    );
    if (targets.length === 0) {
      toast.info("All selected students already marked");
      return;
    }
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const newRecs: AttendanceRecord[] = targets.map((s) => ({
      id: generateId(),
      studentId: s.id,
      date,
      status: "Present",
      timeIn: timeStr,
      markedBy: currentUser?.name ?? "System",
      type: "student",
      method: "rfid",
    }));
    const updated = [...records, ...newRecs];
    saveRecords(updated);
    toast.success(
      `Marked ${newRecs.length} students present (Class ${bulkClass}${bulkSection ? `-${bulkSection}` : ""})`,
    );
    addNotification(
      `✅ Bulk attendance saved for Class ${bulkClass}`,
      "success",
      "✅",
    );
  }

  function saveAttendance() {
    addNotification(
      `✅ Attendance saved for ${date} (${todayRecords.length} records)`,
      "success",
      "✅",
    );
    toast.success("Attendance saved successfully!");
  }

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
            m.name,
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

  return (
    <div className="space-y-5">
      {/* Scan Input Row */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="h-9 px-3 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            data-ocid="rfid-date-picker"
          />
          <div className="flex flex-1 min-w-56 gap-2">
            <Input
              placeholder="Admission No. / Employee ID / Name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleManualEntry()}
              data-ocid="rfid-manual-input"
              className="flex-1"
            />
            <Button onClick={handleManualEntry} data-ocid="rfid-manual-submit">
              Scan / Mark
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={simulateRFID}
            data-ocid="rfid-simulate-btn"
          >
            <Zap className="w-4 h-4 mr-1.5" />
            Simulate RFID
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          💡 First scan = Time-In (Present) · Second scan = Time-Out
        </p>
      </Card>

      {/* Bulk Mark + Export + Save */}
      <Card className="p-4 bg-muted/30">
        <div className="flex flex-wrap gap-3 items-center">
          <Fingerprint className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Bulk Mark Present:
          </span>
          <Select value={bulkClass} onValueChange={setBulkClass}>
            <SelectTrigger className="w-28" data-ocid="bulk-class-select">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              {CLASSES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={bulkSection} onValueChange={setBulkSection}>
            <SelectTrigger className="w-24" data-ocid="bulk-section-select">
              <SelectValue placeholder="Section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {SECTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={markAllPresent} data-ocid="bulk-mark-btn">
            <Users className="w-4 h-4 mr-1.5" /> Mark All
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            data-ocid="rfid-export-csv"
          >
            <Download className="w-4 h-4 mr-1.5" /> Export CSV
          </Button>
          <Button size="sm" onClick={saveAttendance} data-ocid="rfid-save-btn">
            <Save className="w-4 h-4 mr-1.5" /> Save
          </Button>
        </div>
      </Card>

      {/* Filter Row */}
      <div className="flex gap-3 items-center flex-wrap">
        <span className="text-sm text-muted-foreground">Filter log:</span>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-32" data-ocid="rfid-filter-class">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {CLASSES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSection} onValueChange={setFilterSection}>
          <SelectTrigger className="w-28" data-ocid="rfid-filter-section">
            <SelectValue placeholder="All Sections" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {SECTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
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
                  >
                    <Fingerprint className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>No scan records for {date}</p>
                    <p className="text-xs mt-1">
                      Enter an Admission No. or simulate an RFID scan above
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
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
                      data-ocid={`rfid-log-row-${rec.id}`}
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
