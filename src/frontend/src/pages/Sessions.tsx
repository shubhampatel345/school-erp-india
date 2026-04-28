/**
 * SHUBH SCHOOL ERP — Sessions (standalone page)
 * Direct API via apiCall(). No offline sync. No local cache.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Archive,
  Calendar,
  CheckCircle,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { apiCall } from "../utils/api";

interface SessionRow {
  id: string;
  label: string;
  startYear: number;
  endYear: number;
  isActive: boolean;
  isArchived: boolean;
  createdAt?: string;
}

const CLASSES = [
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

const CLASS_NEXT: Record<string, string> = {
  Nursery: "LKG",
  LKG: "UKG",
  UKG: "Class 1",
  "Class 1": "Class 2",
  "Class 2": "Class 3",
  "Class 3": "Class 4",
  "Class 4": "Class 5",
  "Class 5": "Class 6",
  "Class 6": "Class 7",
  "Class 7": "Class 8",
  "Class 8": "Class 9",
  "Class 9": "Class 10",
  "Class 10": "Class 11",
  "Class 11": "Class 12",
  "Class 12": "Alumni",
};

function nextLabel(current: string): string {
  const m = current.match(/^(\d{4})-(\d{2})$/);
  if (!m) return "";
  const yr = Number(m[1]);
  return `${yr + 1}-${String(yr + 2).slice(2)}`;
}

function dateRange(s: SessionRow): string {
  return `Apr ${s.startYear} – Mar ${s.endYear}`;
}

export default function Sessions() {
  const { currentUser, currentSession, switchSession, createSession } =
    useApp();
  const isSuperAdmin = currentUser?.role === "superadmin";

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingCurrent, setSettingCurrent] = useState<string | null>(null);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);

  // Promote wizard
  const [showPromote, setShowPromote] = useState(false);
  const [promoteStep, setPromoteStep] = useState(1);
  const [mapping, setMapping] = useState<Record<string, string>>(CLASS_NEXT);
  const [carryDues, setCarryDues] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [promoteResult, setPromoteResult] = useState<{
    promoted: number;
    skipped: number;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall<SessionRow[]>("sessions/list");
      setSessions(Array.isArray(res) ? res : []);
    } catch {
      try {
        const res2 = await apiCall<{ data?: SessionRow[] }>(
          "academic-sessions/list",
        );
        const rows = Array.isArray((res2 as { data?: SessionRow[] }).data)
          ? (res2 as { data?: SessionRow[] }).data!
          : Array.isArray(res2)
            ? (res2 as SessionRow[])
            : [];
        setSessions(rows);
      } catch {
        setSessions([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Auto-suggest next label
  useEffect(() => {
    if (sessions.length > 0) {
      const sorted = [...sessions].sort((a, b) => b.startYear - a.startYear);
      setNewLabel(nextLabel(sorted[0].label));
    }
  }, [sessions]);

  const handleSetCurrent = async (s: SessionRow) => {
    setSettingCurrent(s.id);
    try {
      await apiCall("sessions/set-current", "POST", { id: s.id });
      switchSession(s.id);
      setSessions((prev) =>
        prev.map((r) => ({ ...r, isActive: r.id === s.id })),
      );
      toast.success(`Session ${s.label} set as current`);
    } catch {
      try {
        await apiCall("academic-sessions/set-current", "POST", { id: s.id });
        switchSession(s.id);
        setSessions((prev) =>
          prev.map((r) => ({ ...r, isActive: r.id === s.id })),
        );
        toast.success(`Session ${s.label} set as current`);
      } catch {
        toast.error("Failed to switch session");
      }
    } finally {
      setSettingCurrent(null);
    }
  };

  const handleAdd = async () => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    if (!/^\d{4}-\d{2}$/.test(trimmed)) {
      toast.error("Format must be YYYY-YY (e.g. 2026-27)");
      return;
    }
    if (sessions.some((s) => s.label === trimmed)) {
      toast.error(`Session ${trimmed} already exists`);
      return;
    }
    setAdding(true);
    const [startStr] = trimmed.split("-");
    const startYear = Number.parseInt(startStr, 10);
    const endYear = startYear + 1;
    try {
      const res = await apiCall<SessionRow>("sessions/add", "POST", {
        label: trimmed,
        startYear,
        endYear,
      });
      const newSession: SessionRow = res ?? {
        id: `sess_${trimmed}`,
        label: trimmed,
        startYear,
        endYear,
        isActive: false,
        isArchived: false,
      };
      setSessions((prev) => [...prev, newSession]);
      createSession(trimmed);
      setShowAdd(false);
      toast.success(`Session ${trimmed} created`);
    } catch {
      // Fallback local
      const local: SessionRow = {
        id: `sess_${Date.now()}`,
        label: trimmed,
        startYear,
        endYear,
        isActive: false,
        isArchived: false,
      };
      setSessions((prev) => [...prev, local]);
      createSession(trimmed);
      setShowAdd(false);
      toast.success(`Session ${trimmed} created (locally)`);
    } finally {
      setAdding(false);
    }
  };

  const handlePromote = async () => {
    setPromoting(true);
    setPromoteResult(null);
    // Find or create next session
    const active = sessions.find((s) => s.isActive);
    if (!active) {
      toast.error("No active session found");
      setPromoting(false);
      return;
    }
    const nextSess = nextLabel(active.label);
    let targetId = sessions.find((s) => s.label === nextSess)?.id;
    if (!targetId) {
      try {
        const [sy] = nextSess.split("-");
        const sYear = Number.parseInt(sy, 10);
        const created = await apiCall<SessionRow>("sessions/add", "POST", {
          label: nextSess,
          startYear: sYear,
          endYear: sYear + 1,
        });
        targetId = created?.id ?? `sess_${Date.now()}`;
        const newS: SessionRow = created ?? {
          id: targetId,
          label: nextSess,
          startYear: sYear,
          endYear: sYear + 1,
          isActive: false,
          isArchived: false,
        };
        setSessions((prev) => [...prev, newS]);
      } catch {
        /* continue */
      }
    }
    try {
      const res = await apiCall<{ promoted?: number; skipped?: number }>(
        "sessions/promote",
        "POST",
        {
          fromSessionId: active.id,
          toSessionLabel: nextSess,
          mapping,
          carryDues,
        },
      );
      setPromoteResult({
        promoted: res?.promoted ?? 0,
        skipped: res?.skipped ?? 0,
      });
      toast.success("Students promoted successfully!");
    } catch {
      toast.error("Promotion failed — please try again");
    } finally {
      setPromoting(false);
    }
  };

  const sorted = [...sessions].sort((a, b) => {
    if (a.isActive && !a.isArchived) return -1;
    if (b.isActive && !b.isArchived) return 1;
    return b.startYear - a.startYear;
  });

  const activeSess = sessions.find((s) => s.isActive && !s.isArchived);

  return (
    <div
      className="p-4 md:p-6 space-y-6 bg-background min-h-screen"
      data-ocid="sessions.page"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">
            Session Management
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Academic sessions 2019-20 through present — {sessions.length}{" "}
            sessions loaded
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            data-ocid="sessions.refresh_button"
          >
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          {isSuperAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowPromote(true);
                  setPromoteStep(1);
                  setPromoteResult(null);
                }}
                data-ocid="sessions.promote_button"
              >
                <GraduationCap className="w-4 h-4 mr-1" /> Promote Students
              </Button>
              <Button
                size="sm"
                onClick={() => setShowAdd(true)}
                data-ocid="sessions.add_button"
              >
                <Plus className="w-4 h-4 mr-1" /> New Session
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Active session banner */}
      {activeSess && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/8 border border-primary/20">
          <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Current Session:{" "}
              <span className="text-primary">{activeSess.label}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {dateRange(activeSess)}
            </p>
          </div>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div
          className="bg-card border border-border rounded-xl p-5 space-y-4 max-w-sm animate-slide-up"
          data-ocid="sessions.add_form"
        >
          <h3 className="font-semibold text-foreground font-display">
            Create New Session
          </h3>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Session Year *
            </Label>
            <Input
              data-ocid="sessions.new_label_input"
              placeholder="e.g. 2026-27"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleAdd();
              }}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              Format: YYYY-YY (April to March)
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => void handleAdd()}
              disabled={adding || !newLabel.trim()}
              data-ocid="sessions.add_submit_button"
            >
              {adding ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : null}
              Create
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAdd(false)}
              data-ocid="sessions.add_cancel_button"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Sessions list */}
      {loading ? (
        <div className="space-y-3" data-ocid="sessions.loading_state">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div
          className="text-center py-16 text-muted-foreground"
          data-ocid="sessions.empty_state"
        >
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No sessions found</p>
          <p className="text-xs mt-1">
            Sessions 2019-20 through 2025-26 will be created automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-2" data-ocid="sessions.list">
          {sorted.map((s, i) => (
            <div
              key={s.id}
              data-ocid={`sessions.item.${i + 1}`}
              className={`bg-card border rounded-xl p-4 flex items-center gap-4 ${
                s.isActive && !s.isArchived
                  ? "border-primary/30 bg-primary/5"
                  : "border-border"
              }`}
            >
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                {s.isArchived ? (
                  <Archive className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Calendar className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">
                    {s.label}
                  </span>
                  {s.isActive && !s.isArchived && (
                    <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">
                      ● Current
                    </Badge>
                  )}
                  {s.isArchived && (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-muted-foreground"
                    >
                      Archived
                    </Badge>
                  )}
                  {s.id === currentSession?.id &&
                    s.id !== sessions.find((x) => x.isActive)?.id && (
                      <Badge variant="secondary" className="text-[10px]">
                        Viewing
                      </Badge>
                    )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {dateRange(s)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* View (switch to) */}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => {
                    switchSession(s.id);
                    toast.success(`Viewing session ${s.label}`);
                  }}
                  data-ocid={`sessions.view_button.${i + 1}`}
                >
                  View
                </Button>
                {/* Set as current */}
                {isSuperAdmin && !s.isActive && !s.isArchived && (
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    disabled={settingCurrent === s.id}
                    onClick={() => void handleSetCurrent(s)}
                    data-ocid={`sessions.set_current_button.${i + 1}`}
                  >
                    {settingCurrent === s.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      "Set Current"
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Promote Students modal */}
      {showPromote && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div
            className="bg-card border border-border rounded-2xl shadow-elevated w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up"
            data-ocid="sessions.promote_dialog"
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="font-display font-semibold text-foreground">
                  Promote Students
                </h2>
                <p className="text-xs text-muted-foreground">
                  Step {promoteStep} of 3
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPromote(false)}
                className="text-muted-foreground hover:text-foreground transition-colors text-xl w-8 h-8 flex items-center justify-center"
                aria-label="Close"
                data-ocid="sessions.promote_close_button"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Step 1: Info */}
              {promoteStep === 1 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <p className="text-sm text-foreground">
                      <strong>Current Session:</strong>{" "}
                      {activeSess?.label ?? "None"}
                      <br />
                      <strong>Next Session:</strong>{" "}
                      {activeSess ? nextLabel(activeSess.label) : "—"}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This will promote all active students to the next class in
                    the next session. Class 12 graduates will be moved to
                    Alumni. Staff and fee headings will be copied automatically.
                  </p>
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <input
                      type="checkbox"
                      id="carry-dues"
                      checked={carryDues}
                      onChange={(e) => setCarryDues(e.target.checked)}
                      className="w-4 h-4"
                      data-ocid="sessions.carry_dues_checkbox"
                    />
                    <label
                      htmlFor="carry-dues"
                      className="text-sm text-foreground cursor-pointer"
                    >
                      Carry forward outstanding fee dues to next session
                    </label>
                  </div>
                  <Button
                    onClick={() => setPromoteStep(2)}
                    className="w-full"
                    data-ocid="sessions.promote_next_button"
                  >
                    Next: Review Class Mapping →
                  </Button>
                </div>
              )}

              {/* Step 2: Class mapping */}
              {promoteStep === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground font-medium">
                    Review and adjust class mapping. Each class will map to the
                    next class in the new session.
                  </p>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {CLASSES.map((cls) => (
                      <div
                        key={cls}
                        className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0"
                      >
                        <span className="w-28 text-sm font-medium text-foreground flex-shrink-0">
                          {cls}
                        </span>
                        <span className="text-muted-foreground text-xs">→</span>
                        <select
                          className="flex-1 border border-input rounded-md px-2 py-1.5 text-sm bg-background"
                          value={mapping[cls] ?? CLASS_NEXT[cls] ?? "Alumni"}
                          onChange={(e) =>
                            setMapping((prev) => ({
                              ...prev,
                              [cls]: e.target.value,
                            }))
                          }
                          data-ocid={`sessions.mapping_select.${cls.replace(/\s/g, "_")}`}
                        >
                          {[...CLASSES, "Alumni", "Discontinue"].map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPromoteStep(1)}
                      className="flex-1"
                      data-ocid="sessions.promote_back_button"
                    >
                      ← Back
                    </Button>
                    <Button
                      onClick={() => setPromoteStep(3)}
                      className="flex-1"
                      data-ocid="sessions.promote_confirm_button"
                    >
                      Next: Confirm →
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Confirm */}
              {promoteStep === 3 && (
                <div className="space-y-4">
                  {promoteResult ? (
                    <div className="space-y-3">
                      <div
                        className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200"
                        data-ocid="sessions.promote_success_state"
                      >
                        <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-emerald-800">
                            Promotion Complete!
                          </p>
                          <p className="text-sm text-emerald-700">
                            {promoteResult.promoted} students promoted ·{" "}
                            {promoteResult.skipped} skipped
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => setShowPromote(false)}
                        className="w-full"
                        data-ocid="sessions.promote_done_button"
                      >
                        Done
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-amber-800">
                            <p className="font-semibold">Are you sure?</p>
                            <p className="mt-1">
                              This will promote ALL active students. This action
                              cannot be undone.
                            </p>
                            <p className="mt-1">
                              Session: <strong>{activeSess?.label}</strong> →{" "}
                              <strong>
                                {activeSess ? nextLabel(activeSess.label) : "—"}
                              </strong>
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setPromoteStep(2)}
                          className="flex-1"
                          data-ocid="sessions.promote_back2_button"
                        >
                          ← Back
                        </Button>
                        <Button
                          className="flex-1 bg-amber-600 hover:bg-amber-700"
                          disabled={promoting}
                          onClick={() => void handlePromote()}
                          data-ocid="sessions.promote_execute_button"
                        >
                          {promoting ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : null}
                          {promoting ? "Promoting…" : "Confirm & Promote"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
