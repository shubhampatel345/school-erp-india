/**
 * ClassTimetable — 6-day grid (Mon–Sat) × periods
 * Class/section selector, assign subject+teacher per cell.
 * Print / export functionality.
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
import { CalendarCheck, Loader2, Printer, RefreshCw, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type { ClassRecord, StaffRecord } from "../../utils/phpApiService";
import phpApiService from "../../utils/phpApiService";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

interface TimetableCell {
  subjectId: string;
  subjectName: string;
  staffId: string;
  staffName: string;
}

// Grid keyed by "Day_Period" string for simpler access
type Grid = Record<string, TimetableCell>;

interface SubjectItem {
  id: string;
  name: string;
}

const EMPTY_CELL: TimetableCell = {
  subjectId: "",
  subjectName: "",
  staffId: "",
  staffName: "",
};

function cellKey(day: string, period: number): string {
  return `${day}_${period}`;
}

export default function ClassTimetable() {
  const { currentUser } = useApp();
  const canWrite =
    currentUser?.role === "superadmin" || currentUser?.role === "admin";

  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selClass, setSelClass] = useState("");
  const [selSection, setSelSection] = useState("");
  const [grid, setGrid] = useState<Grid>({});
  const [savedTimetables, setSavedTimetables] = useState<Record<string, Grid>>(
    {},
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rawClasses, rawSubjects, rawStaff, rawTimetables] =
        await Promise.all([
          phpApiService.getClasses(),
          phpApiService.getSubjects(),
          phpApiService.getStaff(),
          phpApiService
            .apiGet<Record<string, Grid>>("academics/timetables")
            .catch(() => ({})),
        ]);
      setClasses(rawClasses);
      setSubjects(
        (rawSubjects as Record<string, unknown>[]).map((s) => ({
          id: String(s.id ?? ""),
          name: String(s.name ?? ""),
        })),
      );
      setStaff(rawStaff.filter((sf) => sf.status !== "inactive"));
      setSavedTimetables(rawTimetables ?? {});
    } catch {
      toast.error("Failed to load timetable data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Load saved timetable when class/section changes
  useEffect(() => {
    if (!selClass) return;
    const key = `${selClass}_${selSection}`;
    setGrid(savedTimetables[key] ?? {});
  }, [selClass, selSection, savedTimetables]);

  function updateCell(
    day: string,
    period: number,
    field: keyof TimetableCell,
    value: string,
  ) {
    setGrid((prev) => {
      const k = cellKey(day, period);
      const existing = prev[k] ?? { ...EMPTY_CELL };
      let updated = { ...existing, [field]: value };
      // Auto-fill name fields
      if (field === "subjectId") {
        const subj = subjects.find((s) => s.id === value);
        updated = { ...updated, subjectName: subj?.name ?? "" };
      }
      if (field === "staffId") {
        const sf = staff.find((s) => s.id === value);
        updated = { ...updated, staffName: sf?.name ?? "" };
      }
      return { ...prev, [k]: updated };
    });
  }

  async function handleSave() {
    if (!selClass) {
      toast.error("Select a class first");
      return;
    }
    setSaving(true);
    try {
      const key = `${selClass}_${selSection}`;
      await phpApiService.apiPost("academics/timetables/save", {
        key,
        className: selClass,
        section: selSection,
        grid,
      });
      setSavedTimetables((prev) => ({ ...prev, [key]: grid }));
      toast.success("Timetable saved");
    } catch {
      toast.error("Failed to save timetable");
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    const cls = selClass || "Class";
    const sec = selSection ? ` - ${selSection}` : "";
    const win = window.open("", "_blank", "width=1000,height=700");
    if (!win) {
      toast.error("Popup blocked — allow popups to print");
      return;
    }
    const rows = DAYS.map((day) => {
      const cells = PERIODS.map((p) => {
        const cell = grid[cellKey(day, p)];
        if (!cell?.subjectName) return `<td class="empty">-</td>`;
        return `<td><strong>${cell.subjectName}</strong><br><small>${cell.staffName || ""}</small></td>`;
      }).join("");
      return `<tr><td class="day">${day}</td>${cells}</tr>`;
    }).join("");
    const heads = PERIODS.map((p) => `<th>P${p}</th>`).join("");
    win.document.write(`
      <!DOCTYPE html><html><head><title>Timetable — ${cls}${sec}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:20px}
        h2{text-align:center;margin-bottom:16px}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #ccc;padding:8px 6px;text-align:center;font-size:12px}
        th{background:#f0f0f0;font-weight:600}
        .day{font-weight:600;text-align:left;background:#f8f8f8}
        .empty{color:#aaa}
        small{color:#666;display:block;margin-top:2px}
      </style></head><body>
      <h2>Class Timetable — ${cls}${sec}</h2>
      <table><thead><tr><th>Day</th>${heads}</tr></thead><tbody>${rows}</tbody></table>
      <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};</script>
      </body></html>
    `);
    win.document.close();
  }

  const sectionsForClass = (classes.find((c) => c.className === selClass)
    ?.sections ?? []) as string[];

  const timetableKey = `${selClass}_${selSection}`;
  const hasSaved = !!savedTimetables[timetableKey];
  const hasChanges =
    JSON.stringify(grid) !==
    JSON.stringify(savedTimetables[timetableKey] ?? {});

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-display font-bold text-foreground">
            Class Timetable
          </h2>
          <p className="text-sm text-muted-foreground">
            Assign subjects and teachers per period
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => void load()}
            aria-label="Refresh"
            data-ocid="timetable.refresh_button"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {selClass && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              data-ocid="timetable.print_button"
            >
              <Printer className="w-4 h-4 mr-1.5" /> Print
            </Button>
          )}
          {canWrite && selClass && hasChanges && (
            <Button
              size="sm"
              onClick={() => void handleSave()}
              disabled={saving}
              data-ocid="timetable.save_button"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1.5" />
              )}
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Class/Section selector */}
      <Card className="p-4">
        <div className="flex gap-3 flex-wrap items-end">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Class
            </p>
            <Select
              value={selClass}
              onValueChange={(v) => {
                setSelClass(v);
                setSelSection("");
              }}
            >
              <SelectTrigger
                className="w-36"
                data-ocid="timetable.class.select"
              >
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.className}>
                    {c.className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Section
            </p>
            <Select
              value={selSection}
              onValueChange={setSelSection}
              disabled={!selClass}
            >
              <SelectTrigger
                className="w-28"
                data-ocid="timetable.section.select"
              >
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                {sectionsForClass.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasSaved && !hasChanges && (
            <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-xs">
              Saved
            </Badge>
          )}
          {hasChanges && selClass && (
            <Badge
              variant="outline"
              className="text-xs text-amber-600 border-amber-400"
            >
              Unsaved changes
            </Badge>
          )}
        </div>
      </Card>

      {/* Timetable grid */}
      {loading ? (
        <div
          className="flex items-center justify-center py-20"
          data-ocid="timetable.loading_state"
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !selClass ? (
        <Card
          className="p-12 text-center border-dashed"
          data-ocid="timetable.empty_state"
        >
          <CalendarCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-semibold text-foreground">
            Select a class to view timetable
          </p>
        </Card>
      ) : (
        <Card className="overflow-x-auto" data-ocid="timetable.table">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left p-3 font-semibold text-muted-foreground w-24">
                  Day
                </th>
                {PERIODS.map((p) => (
                  <th
                    key={p}
                    className="text-center p-3 font-semibold text-muted-foreground"
                  >
                    Period {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day) => (
                <tr key={day} className="border-t border-border">
                  <td className="p-3 font-semibold text-foreground bg-muted/20 text-sm">
                    {day.slice(0, 3)}
                  </td>
                  {PERIODS.map((period) => {
                    const cell = grid[cellKey(day, period)] ?? EMPTY_CELL;
                    return (
                      <td
                        key={period}
                        className="p-1 border-l border-border/50 min-w-[110px]"
                      >
                        {canWrite ? (
                          <div className="space-y-1">
                            <Select
                              value={cell.subjectId}
                              onValueChange={(v) =>
                                updateCell(day, period, "subjectId", v)
                              }
                            >
                              <SelectTrigger
                                className="h-7 text-xs px-2"
                                data-ocid={`timetable.subject.${day}_${period}`}
                              >
                                <SelectValue placeholder="Subject" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">—</SelectItem>
                                {subjects.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={cell.staffId}
                              onValueChange={(v) =>
                                updateCell(day, period, "staffId", v)
                              }
                            >
                              <SelectTrigger
                                className="h-7 text-xs px-2"
                                data-ocid={`timetable.teacher.${day}_${period}`}
                              >
                                <SelectValue placeholder="Teacher" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">—</SelectItem>
                                {staff.map((sf) => (
                                  <SelectItem key={sf.id} value={sf.id}>
                                    {sf.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="p-1 text-center">
                            {cell.subjectName ? (
                              <>
                                <p className="font-medium text-xs text-foreground">
                                  {cell.subjectName}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {cell.staffName}
                                </p>
                              </>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                —
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
