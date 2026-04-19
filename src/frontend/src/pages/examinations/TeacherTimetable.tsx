import { useCallback, useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useApp } from "../../context/AppContext";
import type { Staff } from "../../types";
import { CLASSES, SECTIONS, generateId, ls } from "../../utils/localStorage";

// ── Types ─────────────────────────────────────────────────────────────────────
interface TTPeriod {
  day: string;
  period: number; // 0-based
  staffId: string;
  staffName: string;
  subject: string;
}

interface TTConfig {
  id: string;
  sessionId: string;
  classKey: string; // "Class 6A"
  periodsPerDay: number;
  startTime: string; // "09:00"
  periodDuration: number; // minutes
  breakAfterPeriod: number; // break after this period index
  breakDuration: number;
  periods: TTPeriod[];
  savedAt: string;
}

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const PERIOD_KEYS = [
  "p1",
  "p2",
  "p3",
  "p4",
  "p5",
  "p6",
  "p7",
  "p8",
  "p9",
  "p10",
  "p11",
  "p12",
];

function timeAfterMinutes(start: string, minutes: number): string {
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function getPeriodTimes(
  startTime: string,
  periodDuration: number,
  periodsPerDay: number,
  breakAfterPeriod: number,
  breakDuration: number,
): string[] {
  const times: string[] = [];
  let cur = startTime;
  for (let i = 0; i < periodsPerDay; i++) {
    times.push(cur);
    cur = timeAfterMinutes(cur, periodDuration);
    if (i === breakAfterPeriod - 1) cur = timeAfterMinutes(cur, breakDuration);
  }
  return times;
}

export default function TeacherTimetable() {
  const { currentSession, getData, saveData, deleteData, addNotification } =
    useApp();
  const sessionId = currentSession?.id ?? "sess_2025";

  const [configs, setConfigs] = useState<TTConfig[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [editConfig, setEditConfig] = useState<TTConfig | null>(null);
  const [viewConfig, setViewConfig] = useState<TTConfig | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [periodsPerDay, setPeriodsPerDay] = useState(8);
  const [startTime, setStartTime] = useState("09:00");
  const [periodDuration, setPeriodDuration] = useState(45);
  const [breakAfterPeriod, setBreakAfterPeriod] = useState(4);
  const [breakDuration, setBreakDuration] = useState(20);
  const [periods, setPeriods] = useState<TTPeriod[]>([]);

  const allStaff = getData("staff") as Staff[];
  const teachers = allStaff.filter(
    (s) => s.designation === "Teacher" || (s.subjects?.length ?? 0) > 0,
  );

  const classSections = CLASSES.flatMap((c) =>
    SECTIONS.slice(0, 3).map((s) => `Class ${c}${s}`),
  );

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    const rows = getData("teacherTimetables") as TTConfig[];
    // Also fall back to localStorage
    const localRows = ls.get<TTConfig[]>("teacher_timetables_v2", []);
    const merged = rows.length > 0 ? rows : localRows;
    setConfigs(merged.filter((c) => c.sessionId === sessionId));
    setLoading(false);
  }, [getData, sessionId]);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const initPeriodsForClass = useCallback((classKey: string, ppd: number) => {
    const newPeriods: TTPeriod[] = [];
    for (const day of DAYS) {
      for (let p = 0; p < ppd; p++) {
        newPeriods.push({
          day,
          period: p,
          staffId: "",
          staffName: "",
          subject: "",
        });
      }
    }
    setPeriods(newPeriods);
    void classKey;
  }, []);

  const handleNew = () => {
    if (!selectedClass) return;
    setEditConfig(null);
    setPeriodsPerDay(8);
    setStartTime("09:00");
    setPeriodDuration(45);
    setBreakAfterPeriod(4);
    setBreakDuration(20);
    initPeriodsForClass(selectedClass, 8);
    setEditConfig({
      id: generateId(),
      sessionId,
      classKey: selectedClass,
      periodsPerDay: 8,
      startTime: "09:00",
      periodDuration: 45,
      breakAfterPeriod: 4,
      breakDuration: 20,
      periods: [],
      savedAt: "",
    });
  };

  const handlePeriodsPerDayChange = (val: number) => {
    setPeriodsPerDay(val);
    initPeriodsForClass(editConfig?.classKey ?? "", val);
  };

  const updatePeriod = (
    day: string,
    periodIdx: number,
    field: keyof TTPeriod,
    value: string,
  ) => {
    setPeriods((prev) =>
      prev.map((p) => {
        if (p.day === day && p.period === periodIdx) {
          if (field === "staffId") {
            const staff = teachers.find((t) => t.id === value);
            return { ...p, staffId: value, staffName: staff?.name ?? "" };
          }
          return { ...p, [field]: value };
        }
        return p;
      }),
    );
  };

  const handleSave = async () => {
    if (!editConfig) return;
    const config: TTConfig = {
      ...editConfig,
      periodsPerDay,
      startTime,
      periodDuration,
      breakAfterPeriod,
      breakDuration,
      periods,
      savedAt: new Date().toISOString(),
    };
    await saveData(
      "teacherTimetables",
      config as unknown as Record<string, unknown>,
    );
    // Also save locally for cross-compatibility
    const local = ls.get<TTConfig[]>("teacher_timetables_v2", []);
    const updated = [config, ...local.filter((c) => c.id !== config.id)];
    ls.set("teacher_timetables_v2", updated);
    setEditConfig(null);
    addNotification(
      `Teacher timetable saved for ${config.classKey}`,
      "success",
      "📅",
    );
    await loadConfigs();
  };

  const handleDelete = async (id: string) => {
    await deleteData("teacherTimetables", id);
    const local = ls.get<TTConfig[]>("teacher_timetables_v2", []);
    ls.set(
      "teacher_timetables_v2",
      local.filter((c) => c.id !== id),
    );
    await loadConfigs();
    if (viewConfig?.id === id) setViewConfig(null);
  };

  const periodTimes = editConfig
    ? getPeriodTimes(
        startTime,
        periodDuration,
        periodsPerDay,
        breakAfterPeriod,
        breakDuration,
      )
    : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Teacher Timetable Maker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <div className="space-y-1.5 flex-1 min-w-48">
              <Label>Class &amp; Section</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                data-ocid="tt-class-select"
              >
                <option value="">— Select Class —</option>
                {classSections.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleNew}
                disabled={!selectedClass}
                data-ocid="tt-new-btn"
              >
                + New Timetable
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Form */}
      {editConfig && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Timetable — {editConfig.classKey}
              </CardTitle>
              <button
                type="button"
                onClick={() => setEditConfig(null)}
                className="text-muted-foreground hover:text-foreground text-xl"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Periods/Day</Label>
                <Input
                  type="number"
                  min={4}
                  max={12}
                  value={periodsPerDay}
                  onChange={(e) =>
                    handlePeriodsPerDayChange(Number(e.target.value) || 8)
                  }
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Start Time</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Period (min)</Label>
                <Input
                  type="number"
                  min={30}
                  max={90}
                  value={periodDuration}
                  onChange={(e) =>
                    setPeriodDuration(Number(e.target.value) || 45)
                  }
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Break After Period</Label>
                <Input
                  type="number"
                  min={1}
                  max={periodsPerDay}
                  value={breakAfterPeriod}
                  onChange={(e) =>
                    setBreakAfterPeriod(Number(e.target.value) || 4)
                  }
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Break (min)</Label>
                <Input
                  type="number"
                  min={5}
                  max={60}
                  value={breakDuration}
                  onChange={(e) =>
                    setBreakDuration(Number(e.target.value) || 20)
                  }
                  className="h-8"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs min-w-max">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-3 py-2 text-left font-semibold w-28">
                      Period / Time
                    </th>
                    {DAYS.map((d) => (
                      <th
                        key={d}
                        className="px-2 py-2 text-center font-semibold min-w-40"
                      >
                        {d.slice(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERIOD_KEYS.slice(0, periodsPerDay).map((pKey, pi) => (
                    <tr
                      key={pKey}
                      className={`border-t border-border ${pi % 2 === 0 ? "bg-background" : "bg-muted/10"}`}
                    >
                      <td className="px-3 py-1.5 font-mono text-muted-foreground whitespace-nowrap">
                        <div>P{pi + 1}</div>
                        <div className="text-[10px]">
                          {periodTimes[pi] ?? ""}
                        </div>
                        {pi === breakAfterPeriod - 1 && (
                          <div className="text-[10px] text-primary mt-0.5">
                            ↓ Break {breakDuration}m
                          </div>
                        )}
                      </td>
                      {DAYS.map((day) => {
                        const p = periods.find(
                          (pp) => pp.day === day && pp.period === pi,
                        );
                        return (
                          <td
                            key={day}
                            className="px-2 py-1 border-l border-border/30"
                          >
                            <div className="space-y-1">
                              <select
                                className="w-full h-7 rounded border border-input bg-background px-1.5 text-xs"
                                value={p?.staffId ?? ""}
                                onChange={(e) =>
                                  updatePeriod(
                                    day,
                                    pi,
                                    "staffId",
                                    e.target.value,
                                  )
                                }
                              >
                                <option value="">— Teacher —</option>
                                {teachers.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}
                                  </option>
                                ))}
                              </select>
                              <Input
                                placeholder="Subject"
                                value={p?.subject ?? ""}
                                onChange={(e) =>
                                  updatePeriod(
                                    day,
                                    pi,
                                    "subject",
                                    e.target.value,
                                  )
                                }
                                className="h-7 text-xs"
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditConfig(null)}>
                Cancel
              </Button>
              <Button onClick={handleSave} data-ocid="tt-save-btn">
                Save Timetable
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : configs.length === 0 ? (
        <div
          className="text-center py-14 text-muted-foreground"
          data-ocid="tt.empty_state"
        >
          <p className="text-3xl mb-2">📅</p>
          <p className="font-medium">No timetables saved</p>
          <p className="text-sm mt-1">
            Select a class above and click "+ New Timetable"
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {configs.map((cfg) => (
            <div
              key={cfg.id}
              className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="font-semibold">{cfg.classKey}</p>
                <p className="text-xs text-muted-foreground">
                  {cfg.periodsPerDay} periods/day · {cfg.periodDuration}min ·
                  Start {cfg.startTime}
                  {cfg.savedAt && (
                    <> · {new Date(cfg.savedAt).toLocaleDateString("en-IN")}</>
                  )}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setViewConfig(viewConfig?.id === cfg.id ? null : cfg)
                  }
                  data-ocid={`tt-view-${cfg.id}`}
                >
                  {viewConfig?.id === cfg.id ? "Hide" : "View"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  data-ocid={`tt-print-${cfg.id}`}
                >
                  Print
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(cfg.id)}
                  data-ocid={`tt-delete-${cfg.id}`}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inline view */}
      {viewConfig && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {viewConfig.classKey} — Timetable View
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs min-w-max">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-3 py-2 text-left font-semibold">
                      Period
                    </th>
                    {DAYS.map((d) => (
                      <th
                        key={d}
                        className="px-3 py-2 text-center font-semibold min-w-32"
                      >
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERIOD_KEYS.slice(0, viewConfig.periodsPerDay).map(
                    (_pKey, pi) => {
                      const times = getPeriodTimes(
                        viewConfig.startTime,
                        viewConfig.periodDuration,
                        viewConfig.periodsPerDay,
                        viewConfig.breakAfterPeriod,
                        viewConfig.breakDuration,
                      );
                      return (
                        <tr
                          key={PERIOD_KEYS[pi]}
                          className={`border-t border-border ${pi % 2 === 0 ? "bg-background" : "bg-muted/10"}`}
                        >
                          <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">
                            P{pi + 1}{" "}
                            <span className="text-[10px]">{times[pi]}</span>
                          </td>
                          {DAYS.map((day) => {
                            const p = viewConfig.periods.find(
                              (pp) => pp.day === day && pp.period === pi,
                            );
                            return (
                              <td
                                key={day}
                                className="px-3 py-2 text-center border-l border-border/30"
                              >
                                {p?.subject ? (
                                  <>
                                    <div className="font-medium">
                                      {p.subject}
                                    </div>
                                    <div className="text-muted-foreground text-[10px]">
                                      {p.staffName}
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground/40">
                                    —
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
