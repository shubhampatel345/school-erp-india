/**
 * ClassTimetable — rebuild using useApp() context
 * Saves timetable records via saveData
 */
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CalendarCheck, Loader2, Printer, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type { ClassSection, Staff, Subject } from "../../types";
import { generateId } from "../../utils/localStorage";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface TimetableCell {
  subjectId: string;
  subjectName: string;
  staffId: string;
  staffName: string;
}

interface SavedClassTimetable {
  id: string;
  className: string;
  section: string;
  days: string[];
  periods: number;
  startTime: string;
  periodDurations: number[];
  breakDuration: number;
  grid: Record<string, Record<number, TimetableCell>>;
  savedAt: string;
}

function calcPeriodTimes(
  start: string,
  durations: number[],
  breakMin: number,
): { from: string; to: string }[] {
  const [h, m] = start.split(":").map(Number);
  let totalMin = h * 60 + m;
  return durations.map((dur, i) => {
    const from = `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
    totalMin += dur;
    const to = `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
    if (i < durations.length - 1) totalMin += breakMin;
    return { from, to };
  });
}

export default function ClassTimetable() {
  const { getData, saveData, deleteData } = useApp();
  const [saving, setSaving] = useState(false);

  const classesData = getData("classes") as ClassSection[];
  const subjectsData = getData("subjects") as Subject[];
  const staffData = getData("staff") as Staff[];
  const savedTimetables = getData("class_timetables") as SavedClassTimetable[];

  const [selClass, setSelClass] = useState("");
  const [selSection, setSelSection] = useState("");
  const [selDays, setSelDays] = useState<string[]>(DAYS.slice(0, 5));
  const [periods, setPeriods] = useState(7);
  const [startTime, setStartTime] = useState("08:00");
  const [periodDurations, setPeriodDurations] = useState<number[]>(
    Array(7).fill(45),
  );
  const [breakDuration, setBreakDuration] = useState(5);
  const [grid, setGrid] = useState<
    Record<string, Record<number, TimetableCell>>
  >({});

  const availableSections =
    classesData.find((c) => (c.name ?? c.className ?? "") === selClass)
      ?.sections ?? [];

  const classSubjects = selClass
    ? subjectsData.filter((s) => s.classes.includes(selClass))
    : subjectsData;

  function handlePeriodsChange(n: number) {
    const clamped = Math.max(1, Math.min(10, n));
    setPeriods(clamped);
    setPeriodDurations((prev) => {
      const arr = [...prev];
      while (arr.length < clamped) arr.push(45);
      return arr.slice(0, clamped);
    });
  }

  function toggleDay(day: string) {
    setSelDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  function updateCell(
    day: string,
    period: number,
    field: "subjectId" | "staffId",
    value: string,
  ) {
    setGrid((prev) => {
      const dayGrid = { ...(prev[day] ?? {}) };
      const cell = {
        ...(dayGrid[period] ?? {
          subjectId: "",
          subjectName: "",
          staffId: "",
          staffName: "",
        }),
      };
      if (field === "subjectId") {
        const subj = subjectsData.find((s) => s.id === value);
        cell.subjectId = value;
        cell.subjectName = subj?.name ?? "";
      } else {
        const member = staffData.find((s) => s.id === value);
        cell.staffId = value;
        cell.staffName = member?.name ?? "";
      }
      dayGrid[period] = cell;
      return { ...prev, [day]: dayGrid };
    });
  }

  async function handleSave() {
    if (!selClass || !selSection) {
      toast.error("Select class and section first");
      return;
    }
    setSaving(true);
    try {
      const entry: Record<string, unknown> = {
        id: generateId(),
        className: selClass,
        section: selSection,
        days: selDays,
        periods,
        startTime,
        periodDurations: periodDurations.slice(0, periods),
        breakDuration,
        grid,
        savedAt: new Date().toISOString(),
      };
      await saveData("class_timetables", entry);
      toast.success(`Timetable for ${selClass}-${selSection} saved!`);
    } catch {
      toast.error("Failed to save timetable");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTimetable(id: string) {
    if (!confirm("Delete this timetable?")) return;
    await deleteData("class_timetables", id);
    toast.success("Timetable deleted");
  }

  const periodTimes = calcPeriodTimes(
    startTime,
    periodDurations.slice(0, periods),
    breakDuration,
  );

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold font-display text-foreground flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-primary" />
            Class Timetable
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Build and save period timetables for each class
          </p>
        </div>
      </div>

      {/* Config Panel */}
      <Card className="p-5 space-y-4">
        <p className="font-semibold text-foreground">Setup</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Class
            </span>
            <select
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-card"
              value={selClass}
              onChange={(e) => {
                setSelClass(e.target.value);
                setSelSection("");
                setGrid({});
              }}
              data-ocid="classtimetable.class-select"
            >
              <option value="">Select class</option>
              {classesData.map((c) => {
                const n = c.name ?? c.className ?? "";
                return (
                  <option key={c.id} value={n}>
                    {n === "Nursery" || n === "LKG" || n === "UKG"
                      ? n
                      : `Class ${n}`}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Section
            </span>
            <select
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-card"
              value={selSection}
              onChange={(e) => setSelSection(e.target.value)}
              disabled={!selClass}
              data-ocid="classtimetable.section-select"
            >
              <option value="">Select</option>
              {availableSections.map((s) => (
                <option key={s} value={s}>
                  {selClass}-{s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Periods/Day
            </span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={periods}
              onChange={(e) =>
                handlePeriodsChange(
                  Number(e.target.value.replace(/[^0-9]/g, "")) || 1,
                )
              }
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-card"
              data-ocid="classtimetable.periods-input"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Start Time
            </span>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-card"
            />
          </div>
        </div>

        {/* Days */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Days
          </span>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => (
              <label
                key={d}
                className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer border transition-colors ${
                  selDays.includes(d)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selDays.includes(d)}
                  onChange={() => toggleDay(d)}
                />
                {d.slice(0, 3)}
              </label>
            ))}
          </div>
        </div>

        {/* Period durations */}
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Period Durations (min)
            </span>
            <div className="flex items-center gap-2">
              <label
                htmlFor="break-duration"
                className="text-xs text-muted-foreground"
              >
                Break:
              </label>
              <input
                id="break-duration"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={breakDuration}
                onChange={(e) =>
                  setBreakDuration(
                    Number(e.target.value.replace(/[^0-9]/g, "")) || 0,
                  )
                }
                className="w-14 border border-input rounded px-2 py-1 text-xs bg-card"
              />
              <span className="text-xs text-muted-foreground">min</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {periodDurations.slice(0, periods).map((dur, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: period index is stable positional key
                key={`pd-${i}`}
                className="flex flex-col items-center gap-1"
              >
                <span className="text-xs text-muted-foreground">P{i + 1}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={dur}
                  onChange={(e) => {
                    const newDur = [...periodDurations];
                    newDur[i] =
                      Number(e.target.value.replace(/[^0-9]/g, "")) || 0;
                    setPeriodDurations(newDur);
                  }}
                  className="w-14 border border-input rounded px-2 py-1 text-xs bg-card text-center"
                />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {periodTimes.map((pt, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: stable positional key
                key={`pt-${i}`}
                className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded"
              >
                P{i + 1}: {pt.from}–{pt.to}
              </span>
            ))}
          </div>
        </div>
      </Card>

      {/* Timetable Grid */}
      {selClass && selSection && selDays.length > 0 && periods > 0 && (
        <Card className="p-4 overflow-x-auto">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-foreground">
              Timetable: {selClass}-{selSection}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.print()}
              >
                <Printer className="w-4 h-4 mr-1" />
                Print
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                data-ocid="classtimetable.save_button"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                Save
              </Button>
            </div>
          </div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="border border-border px-3 py-2 bg-muted/50 text-left font-semibold text-muted-foreground">
                  Day
                </th>
                {Array.from({ length: periods }, (_, i) => (
                  <th
                    // biome-ignore lint/suspicious/noArrayIndexKey: stable positional key
                    key={`header-${i}`}
                    className="border border-border px-2 py-2 bg-muted/50 text-center font-semibold text-muted-foreground min-w-[120px]"
                  >
                    P{i + 1}
                    <br />
                    <span className="font-normal text-muted-foreground/70">
                      {periodTimes[i]?.from}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selDays.map((day) => (
                <tr key={day}>
                  <td className="border border-border px-3 py-2 font-medium bg-muted/20 whitespace-nowrap">
                    {day.slice(0, 3)}
                  </td>
                  {Array.from({ length: periods }, (_, pi) => {
                    const cell = grid[day]?.[pi];
                    return (
                      <td
                        // biome-ignore lint/suspicious/noArrayIndexKey: stable positional key
                        key={`cell-${pi}`}
                        className="border border-border px-1 py-1"
                      >
                        <div className="space-y-1">
                          <select
                            className="w-full text-xs border-0 bg-transparent outline-none cursor-pointer"
                            value={cell?.subjectId ?? ""}
                            onChange={(e) =>
                              updateCell(day, pi, "subjectId", e.target.value)
                            }
                          >
                            <option value="">Subject</option>
                            {classSubjects.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                          <select
                            className="w-full text-xs border-0 bg-transparent outline-none cursor-pointer text-muted-foreground"
                            value={cell?.staffId ?? ""}
                            onChange={(e) =>
                              updateCell(day, pi, "staffId", e.target.value)
                            }
                          >
                            <option value="">Teacher</option>
                            {staffData.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Saved Timetables */}
      {savedTimetables.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Saved Timetables ({savedTimetables.length})
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {savedTimetables.map((tt, idx) => (
              <Card
                key={tt.id}
                className="p-4 flex items-center justify-between"
                data-ocid={`classtimetable.item.${idx + 1}`}
              >
                <div>
                  <p className="font-semibold text-foreground">
                    {tt.className}-{tt.section}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tt.days.length} days · {tt.periods} periods
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.print()}
                  >
                    <Printer className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteTimetable(tt.id)}
                  >
                    ×
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
