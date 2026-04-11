import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CalendarCheck, Printer, Save } from "lucide-react";
import { useState } from "react";
import type { ClassSection, Staff, Subject } from "../../types";
import { generateId, ls } from "../../utils/localStorage";

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
  const [classes] = useState<ClassSection[]>(() =>
    ls.get<ClassSection[]>("classes", []),
  );
  const [subjects] = useState<Subject[]>(() =>
    ls.get<Subject[]>("academics_subjects", []),
  );
  const [staff] = useState<Staff[]>(() => ls.get<Staff[]>("staff", []));
  const [saved, setSaved] = useState<SavedClassTimetable[]>(() =>
    ls.get<SavedClassTimetable[]>("class_timetables", []),
  );

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
    classes.find((c) => c.className === selClass)?.sections ?? [];
  const classSubjects = selClass
    ? subjects.filter((s) => s.classes.includes(selClass))
    : subjects;

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
        const subj = subjects.find((s) => s.id === value);
        cell.subjectId = value;
        cell.subjectName = subj?.name ?? "";
      } else {
        const member = staff.find((s) => s.id === value);
        cell.staffId = value;
        cell.staffName = member?.name ?? "";
      }
      dayGrid[period] = cell;
      return { ...prev, [day]: dayGrid };
    });
  }

  function handleSave() {
    if (!selClass || !selSection) return alert("Select class and section");
    const entry: SavedClassTimetable = {
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
    const updated = [
      ...saved.filter(
        (s) => !(s.className === selClass && s.section === selSection),
      ),
      entry,
    ];
    setSaved(updated);
    ls.set("class_timetables", updated);
    alert(`Timetable for ${selClass}-${selSection} saved!`);
  }

  function handlePrint() {
    window.print();
  }

  const periodTimes = calcPeriodTimes(
    startTime,
    periodDurations.slice(0, periods),
    breakDuration,
  );

  return (
    <div className="p-4 lg:p-6 space-y-5">
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
            >
              <option value="">Select</option>
              {classes.map((c) => (
                <option key={c.id} value={c.className}>
                  Class {c.className}
                </option>
              ))}
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
              type="number"
              min={1}
              max={10}
              value={periods}
              onChange={(e) => handlePeriodsChange(Number(e.target.value))}
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-card"
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
                Break between periods:
              </label>
              <input
                id="break-duration"
                type="number"
                min={0}
                max={30}
                value={breakDuration}
                onChange={(e) => setBreakDuration(Number(e.target.value))}
                className="w-16 border border-input rounded px-2 py-1 text-xs bg-card"
              />
              <span className="text-xs text-muted-foreground">min</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {periodDurations.slice(0, periods).map((dur, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: period index is stable positional key
                key={`period-${i}`}
                className="flex flex-col items-center gap-1"
              >
                <span className="text-xs text-muted-foreground">P{i + 1}</span>
                <input
                  type="number"
                  min={15}
                  max={120}
                  value={dur}
                  onChange={(e) => {
                    const newDur = [...periodDurations];
                    newDur[i] = Number(e.target.value);
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
                // biome-ignore lint/suspicious/noArrayIndexKey: period time index is stable positional key
                key={`time-${i}`}
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
              Timetable: Class {selClass}-{selSection}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-1" />
                Print
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                data-ocid="save-class-tt-btn"
              >
                <Save className="w-4 h-4 mr-1" />
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
                    // biome-ignore lint/suspicious/noArrayIndexKey: header column index is stable positional key
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
                        // biome-ignore lint/suspicious/noArrayIndexKey: cell column index is stable positional key
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
                            {staff.map((s) => (
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

      {saved.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Saved Timetables ({saved.length})
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {saved.map((tt) => (
              <Card
                key={tt.id}
                className="p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-foreground">
                    Class {tt.className}-{tt.section}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tt.days.length} days · {tt.periods} periods
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={handlePrint}>
                  <Printer className="w-4 h-4" />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
