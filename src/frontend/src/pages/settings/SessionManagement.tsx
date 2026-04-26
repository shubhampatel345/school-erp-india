/**
 * SessionManagement — Direct PHP API
 * List, create, set current, archive sessions.
 * 2019-20 through 2025-26 pre-loaded on first load.
 * Includes Promote Students wizard link.
 */
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Archive,
  Calendar,
  CheckCircle,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import { nextSessionLabel } from "../../types";
import type { SessionRecord } from "../../utils/phpApiService";
import phpApiService from "../../utils/phpApiService";

interface Props {
  onNavigate?: (page: string) => void;
}

// Sessions to seed on first run
const SEED_SESSIONS = [
  { label: "2019-20", startYear: 2019, endYear: 2020 },
  { label: "2020-21", startYear: 2020, endYear: 2021 },
  { label: "2021-22", startYear: 2021, endYear: 2022 },
  { label: "2022-23", startYear: 2022, endYear: 2023 },
  { label: "2023-24", startYear: 2023, endYear: 2024 },
  { label: "2024-25", startYear: 2024, endYear: 2025 },
  { label: "2025-26", startYear: 2025, endYear: 2026 },
];

function dateRange(s: SessionRecord): string {
  return `Apr ${s.startYear} – Mar ${s.endYear}`;
}

export default function SessionManagement({ onNavigate }: Props) {
  const { currentUser, currentSession, switchSession } = useApp();
  const isSuperAdmin = currentUser?.role === "superadmin";

  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);

  // Edit dialog
  const [editTarget, setEditTarget] = useState<SessionRecord | null>(null);
  const [editLabel, setEditLabel] = useState("");

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<SessionRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Load & seed ──────────────────────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      let rows = await phpApiService.getSessions();

      // Seed missing historical sessions
      const existingLabels = new Set(rows.map((r) => r.label));
      const missing = SEED_SESSIONS.filter((s) => !existingLabels.has(s.label));
      if (missing.length > 0) {
        setSeeding(true);
        for (const seed of missing) {
          try {
            const created = await phpApiService.createSession(seed);
            rows = [...rows, created];
          } catch {
            // Seed failed — create a local placeholder so UI shows it
            rows = [
              ...rows,
              {
                id: `local_${seed.label}`,
                label: seed.label,
                startYear: seed.startYear,
                endYear: seed.endYear,
                isActive: seed.label === "2025-26",
                isArchived: seed.label !== "2025-26",
              },
            ];
          }
        }
        setSeeding(false);
      }

      setSessions(sortSessions(rows));
    } catch {
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
      setSeeding(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  // Auto-fill next label when opening add form
  useEffect(() => {
    if (!showAdd || newLabel) return;
    const sorted = [...sessions].sort((a, b) => b.startYear - a.startYear);
    const latest = sorted[0];
    if (latest) setNewLabel(nextSessionLabel(latest.label));
  }, [showAdd, sessions, newLabel]);

  function sortSessions(list: SessionRecord[]): SessionRecord[] {
    return [...list].sort((a, b) => {
      if (a.isActive && !a.isArchived) return -1;
      if (b.isActive && !b.isArchived) return 1;
      return b.startYear - a.startYear;
    });
  }

  // ── Create session ───────────────────────────────────────────────────────────
  async function handleAdd() {
    const label = newLabel.trim();
    if (!label || !/^\d{4}-\d{2}$/.test(label)) {
      toast.error("Format must be YYYY-YY (e.g. 2026-27)");
      return;
    }
    if (sessions.some((s) => s.label === label)) {
      toast.error(`Session ${label} already exists`);
      return;
    }
    setAdding(true);
    try {
      const startYear = Number.parseInt(label.split("-")[0], 10);
      await phpApiService.createSession({
        label,
        startYear,
        endYear: startYear + 1,
      });
      toast.success(`Session ${label} created`);
      setNewLabel("");
      setShowAdd(false);
      void loadSessions();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create session",
      );
    } finally {
      setAdding(false);
    }
  }

  // ── Set current session ──────────────────────────────────────────────────────
  async function handleSetCurrent(session: SessionRecord) {
    if (!isSuperAdmin) {
      toast.error("Only Super Admin can change the current session");
      return;
    }
    try {
      await phpApiService.setActiveSession(session.id);
      switchSession(session.id);
      toast.success(`${session.label} is now the current session`);
      void loadSessions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to set session");
    }
  }

  // ── Archive session ──────────────────────────────────────────────────────────
  async function handleArchive(session: SessionRecord) {
    if (!isSuperAdmin) {
      toast.error("Only Super Admin can archive sessions");
      return;
    }
    if (session.isActive) {
      toast.error("Cannot archive the current session");
      return;
    }
    try {
      await phpApiService.apiPost("academic-sessions/archive", {
        session_id: session.id,
      });
      toast.success(`${session.label} archived`);
      void loadSessions();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to archive session",
      );
    }
  }

  // ── Edit session label ───────────────────────────────────────────────────────
  async function handleSaveEdit() {
    if (!editTarget || !editLabel.trim()) return;
    setSaving(true);
    try {
      await phpApiService.apiPost("academic-sessions/update", {
        session_id: editTarget.id,
        name: editLabel.trim(),
      });
      toast.success("Session updated");
      setEditTarget(null);
      void loadSessions();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update session",
      );
    } finally {
      setSaving(false);
    }
  }

  // ── Delete session ───────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.isActive) {
      toast.error("Cannot delete the current session");
      return;
    }
    setDeleting(true);
    try {
      await phpApiService.apiPost("academic-sessions/delete", {
        session_id: deleteTarget.id,
      });
      toast.success(`Session ${deleteTarget.label} deleted`);
      setDeleteTarget(null);
      void loadSessions();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete session",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-display font-semibold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Session Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Current session: <strong>{currentSession?.label ?? "None"}</strong>
          </p>
        </div>
        {isSuperAdmin && (
          <Button
            onClick={() => {
              setShowAdd(!showAdd);
              if (showAdd) setNewLabel("");
            }}
            data-ocid="sessions.add_button"
          >
            <Plus className="w-4 h-4 mr-1.5" /> New Session
          </Button>
        )}
      </div>

      {/* Seeding indicator */}
      {seeding && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm bg-muted/30 border border-border rounded-lg px-4 py-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          Setting up historical sessions (2019-20 to 2025-26)…
        </div>
      )}

      {/* Add Form */}
      {showAdd && isSuperAdmin && (
        <Card className="p-4 space-y-3 border-primary/20">
          <h3 className="font-semibold text-foreground text-sm">
            Create New Session
          </h3>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="space-y-1.5 flex-1 max-w-xs">
              <Label htmlFor="new-session-label" className="text-xs">
                Session Year * (Format: YYYY-YY)
              </Label>
              <Input
                id="new-session-label"
                placeholder="e.g. 2026-27"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleAdd();
                }}
                data-ocid="sessions.label.input"
              />
            </div>
            <Button
              onClick={() => void handleAdd()}
              disabled={adding}
              data-ocid="sessions.create_button"
            >
              {adding ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-1.5" />
              )}
              Create
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowAdd(false);
                setNewLabel("");
              }}
              data-ocid="sessions.cancel_button"
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Sessions list */}
      {loading ? (
        <div
          className="flex items-center gap-2 text-muted-foreground py-8"
          data-ocid="sessions.loading_state"
        >
          <Loader2 className="w-4 h-4 animate-spin" /> Loading sessions…
        </div>
      ) : sessions.length === 0 ? (
        <Card className="p-8 text-center" data-ocid="sessions.empty_state">
          <Calendar className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium text-muted-foreground">No sessions found</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session, idx) => {
            const isCurrent = session.isActive && !session.isArchived;
            const isReadOnly = session.isArchived && !session.isActive;
            const isViewing = session.id === currentSession?.id;

            return (
              <Card
                key={session.id}
                className={`p-4 transition-smooth ${
                  isCurrent
                    ? "border-primary/30 bg-primary/5"
                    : isReadOnly
                      ? "bg-muted/20 opacity-80"
                      : ""
                }`}
                data-ocid={`sessions.item.${idx + 1}`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  {/* Info */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isCurrent ? "bg-primary/10" : "bg-muted"
                      }`}
                    >
                      <Calendar
                        className={`w-5 h-5 ${isCurrent ? "text-primary" : "text-muted-foreground"}`}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground">
                          {session.label}
                        </p>
                        {isCurrent && (
                          <Badge className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30 px-1.5">
                            <CheckCircle className="w-2.5 h-2.5 mr-1" />
                            Current
                          </Badge>
                        )}
                        {isReadOnly && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5"
                          >
                            <Archive className="w-2.5 h-2.5 mr-1" />
                            Archived
                          </Badge>
                        )}
                        {isViewing && !isCurrent && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 text-primary border-primary/30"
                          >
                            Viewing
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {dateRange(session)}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Super Admin can enter historical data in any session
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {isSuperAdmin && (
                    <div className="flex gap-1.5 flex-wrap flex-shrink-0">
                      {!isCurrent && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleSetCurrent(session)}
                          data-ocid={`sessions.set_current.${idx + 1}`}
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Set
                          Current
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditTarget(session);
                          setEditLabel(session.label);
                        }}
                        data-ocid={`sessions.edit_button.${idx + 1}`}
                        aria-label="Edit session"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      {!isCurrent && !isReadOnly && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleArchive(session)}
                          data-ocid={`sessions.archive_button.${idx + 1}`}
                          aria-label="Archive"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {!isCurrent && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(session)}
                          data-ocid={`sessions.delete_button.${idx + 1}`}
                          aria-label="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {isReadOnly && (
                  <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 mt-3">
                    {isSuperAdmin
                      ? "Archived — Super Admin can switch to this session to view or add historical data."
                      : "Archived — data is read-only."}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Promote Students card */}
      <Card className="p-4 bg-muted/30 border-dashed">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-primary/50 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Promote Students
              </p>
              <p className="text-xs text-muted-foreground">
                Bulk-promote students to next session with automatic class
                mapping
              </p>
            </div>
          </div>
          {isSuperAdmin && onNavigate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate("promote")}
              data-ocid="sessions.promote_button"
            >
              <GraduationCap className="w-4 h-4 mr-1.5" /> Promote Students
            </Button>
          )}
        </div>
      </Card>

      {/* Edit Dialog */}
      <AlertDialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Session</AlertDialogTitle>
            <AlertDialogDescription>
              Update session label (format: YYYY-YY)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="edit-session-label">Session Name</Label>
            <Input
              id="edit-session-label"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSaveEdit();
              }}
              data-ocid="sessions.edit_label.input"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="sessions.edit.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleSaveEdit()}
              disabled={saving}
              data-ocid="sessions.edit.confirm_button"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : null}
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteTarget?.label}</strong>? This cannot be
              undone. All data tagged to this session may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="sessions.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleDelete()}
              disabled={deleting}
              data-ocid="sessions.delete.confirm_button"
            >
              {deleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                "Delete Session"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
