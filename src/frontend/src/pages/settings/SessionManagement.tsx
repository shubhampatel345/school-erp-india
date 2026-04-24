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
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type { Session, Student } from "../../types";
import { nextSessionLabel } from "../../types";
import { generateId } from "../../utils/localStorage";

function dateRange(session: Session): string {
  return `Apr ${session.startYear} – Mar ${session.endYear}`;
}

export default function SessionManagement() {
  const {
    currentUser,
    currentSession,
    sessions,
    switchSession,
    getData,
    saveData,
    updateData,
    deleteData,
    refreshCollection,
  } = useApp();

  const isSuperAdmin = currentUser?.role === "superadmin";

  const [localSessions, setLocalSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const [newLabel, setNewLabel] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Auto-fill next label when form is opened
  useEffect(() => {
    if (!showAddForm) return;
    if (newLabel) return; // already typed
    const sorted = [...localSessions].sort((a, b) => b.startYear - a.startYear);
    const latest = sorted[0];
    if (latest) setNewLabel(nextSessionLabel(latest.label));
  }, [showAddForm, localSessions, newLabel]);

  const [editTarget, setEditTarget] = useState<Session | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Load sessions ───────────────────────────────────────────────────────────
  useEffect(() => {
    void loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSessions() {
    setLoading(true);
    try {
      await refreshCollection("sessions");
      const rows = getData("sessions") as Session[];
      setLocalSessions(rows.length > 0 ? rows : sessions);
    } catch {
      setLocalSessions(sessions);
    } finally {
      setLoading(false);
    }
  }

  // Merge context sessions
  useEffect(() => {
    if (!loading && sessions.length > 0) setLocalSessions(sessions);
  }, [sessions, loading]);

  // ── Student counts per session ──────────────────────────────────────────────
  const allStudents = useMemo(
    () => getData("students") as Student[],
    [getData],
  );

  const studentCountBySession = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of allStudents) {
      if (s.sessionId) {
        map[s.sessionId] = (map[s.sessionId] ?? 0) + 1;
      }
    }
    return map;
  }, [allStudents]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function handleAdd() {
    const label = newLabel.trim();
    if (!label) {
      toast.error("Session name is required.");
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(label)) {
      toast.error("Format should be YYYY-YY (e.g. 2025-26)");
      return;
    }
    if (localSessions.some((s) => s.label === label)) {
      toast.error(`Session ${label} already exists.`);
      return;
    }

    setAdding(true);
    const startYear = Number.parseInt(label.split("-")[0]);
    const session: Session = {
      id: generateId(),
      label,
      startYear,
      endYear: startYear + 1,
      isArchived: false,
      isActive: false,
      createdAt: new Date().toISOString(),
      description: newDescription.trim() || undefined,
    };

    try {
      await saveData("sessions", session as unknown as Record<string, unknown>);
      toast.success(`Session ${label} created.`);
      setNewLabel("");
      setNewDescription("");
      setShowAddForm(false);
      await loadSessions();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create session.",
      );
    } finally {
      setAdding(false);
    }
  }

  async function handleSetCurrent(session: Session) {
    if (!isSuperAdmin) {
      toast.error("Only Super Admin can change the current session.");
      return;
    }
    try {
      // Mark old active as archived
      for (const s of localSessions) {
        if (s.isActive && s.id !== session.id) {
          await updateData("sessions", s.id, {
            isActive: false,
            isArchived: true,
          });
        }
      }
      await updateData("sessions", session.id, {
        isActive: true,
        isArchived: false,
      });
      switchSession(session.id);
      toast.success(`${session.label} is now the current session.`);
      await loadSessions();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update session.",
      );
    }
  }

  async function handleArchive(session: Session) {
    if (!isSuperAdmin) {
      toast.error("Only Super Admin can archive sessions.");
      return;
    }
    if (session.isActive) {
      toast.error("Cannot archive the current active session.");
      return;
    }
    try {
      await updateData("sessions", session.id, {
        isArchived: true,
        isActive: false,
      });
      toast.success(`${session.label} archived.`);
      await loadSessions();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to archive session.",
      );
    }
  }

  async function handleSaveEdit() {
    if (!editTarget || !editLabel.trim()) return;
    setSaving(true);
    try {
      await updateData("sessions", editTarget.id, { label: editLabel.trim() });
      toast.success("Session updated.");
      setEditTarget(null);
      await loadSessions();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update session.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.isActive) {
      toast.error("Cannot delete the current session.");
      return;
    }
    setDeleting(true);
    try {
      await deleteData("sessions", deleteTarget.id);
      toast.success(`Session ${deleteTarget.label} deleted.`);
      setDeleteTarget(null);
      await loadSessions();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete session.",
      );
    } finally {
      setDeleting(false);
    }
  }

  const sortedSessions = [...localSessions].sort((a, b) => {
    if (a.isActive && !a.isArchived) return -1;
    if (b.isActive && !b.isArchived) return 1;
    return b.startYear - a.startYear;
  });

  return (
    <div className="p-4 lg:p-6 max-w-3xl space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-semibold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Session Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Current session: <strong>{currentSession?.label ?? "None"}</strong>
            {currentSession && (
              <span className="text-muted-foreground/70 ml-2 text-xs">
                ({dateRange(currentSession)})
              </span>
            )}
          </p>
        </div>
        {isSuperAdmin && (
          <Button
            onClick={() => {
              setShowAddForm(!showAddForm);
              if (showAddForm) {
                setNewLabel("");
                setNewDescription("");
              }
            }}
            data-ocid="sessions.add_button"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Session
          </Button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && isSuperAdmin && (
        <Card className="p-5 space-y-4 border-primary/20 animate-slide-up">
          <h3 className="font-semibold text-foreground">Create New Session</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="session-label">Session Year *</Label>
              <Input
                id="session-label"
                placeholder="e.g. 2026-27"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleAdd();
                }}
                data-ocid="sessions.new_label.input"
              />
              <p className="text-xs text-muted-foreground">Format: YYYY-YY</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="session-desc">Description (optional)</Label>
              <Input
                id="session-desc"
                placeholder="e.g. Academic Year 2026-27"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                data-ocid="sessions.new_description.input"
              />
            </div>
          </div>
          {newLabel && /^\d{4}-\d{2}$/.test(newLabel.trim()) && (
            <p className="text-xs text-primary bg-primary/5 px-3 py-2 rounded-lg border border-primary/20">
              Date range: Apr {newLabel.split("-")[0]} – Mar{" "}
              {Number(newLabel.split("-")[0]) + 1}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              onClick={() => void handleAdd()}
              disabled={adding || !newLabel}
              data-ocid="sessions.new.save_button"
            >
              {adding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Session
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowAddForm(false);
                setNewLabel("");
                setNewDescription("");
              }}
              data-ocid="sessions.new.cancel_button"
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Sessions List */}
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading sessions…
        </div>
      ) : sortedSessions.length === 0 ? (
        <Card className="p-8 text-center" data-ocid="sessions.empty_state">
          <Calendar className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium text-muted-foreground">No sessions found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create your first session to get started.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedSessions.map((session, idx) => {
            const isViewing = session.id === currentSession?.id;
            const studentCount = studentCountBySession[session.id] ?? 0;
            const isReadOnly = session.isArchived && !session.isActive;

            return (
              <Card
                key={session.id}
                className={`p-4 transition-smooth ${session.isActive && !session.isArchived ? "border-primary/30 bg-primary/5" : isReadOnly ? "bg-muted/20 opacity-80" : ""}`}
                data-ocid={`sessions.item.${idx + 1}`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  {/* Info */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        session.isActive && !session.isArchived
                          ? "bg-primary/10"
                          : "bg-muted"
                      }`}
                    >
                      <Calendar
                        className={`w-5 h-5 ${session.isActive && !session.isArchived ? "text-primary" : "text-muted-foreground"}`}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground">
                          {session.label}
                        </p>
                        {/* Status badges */}
                        {session.isActive && !session.isArchived && (
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
                        {isViewing && !session.isActive && (
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
                      {session.description && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                          {session.description}
                        </p>
                      )}
                      {/* Student count */}
                      <div className="flex items-center gap-1 mt-1.5">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {studentCount === 0
                            ? "No students"
                            : `${studentCount} student${studentCount !== 1 ? "s" : ""}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {isSuperAdmin && (
                    <div className="flex gap-1.5 flex-wrap flex-shrink-0">
                      {!session.isActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleSetCurrent(session)}
                          data-ocid={`sessions.set_current.${idx + 1}`}
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          Set Current
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
                        title="Edit session"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      {!session.isActive && !isReadOnly && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleArchive(session)}
                          title="Archive session (read-only)"
                          data-ocid={`sessions.archive_button.${idx + 1}`}
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {!session.isActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(session)}
                          title="Delete session"
                          data-ocid={`sessions.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Archived read-only notice */}
                {isReadOnly && (
                  <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 mt-3">
                    This session is archived — data is read-only and cannot be
                    edited.
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Promote Students Info */}
      <Card className="p-4 bg-muted/30 border-dashed">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-8 h-8 text-primary/50" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Promote Students
            </p>
            <p className="text-xs text-muted-foreground">
              Go to Students → Promote Students to bulk-promote to the next
              session with class mapping.
            </p>
          </div>
        </div>
      </Card>

      {/* Edit Dialog */}
      <AlertDialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Session</AlertDialogTitle>
            <AlertDialogDescription>
              Update the session label. Format must be YYYY-YY.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Session Name</Label>
              <Input
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                placeholder="e.g. 2026-27"
                data-ocid="sessions.edit_label.input"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSaveEdit();
                }}
              />
            </div>
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
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Changes"
              )}
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
              undone. All student and fee data tagged to this session may be
              affected.
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
