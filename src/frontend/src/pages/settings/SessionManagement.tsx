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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Archive,
  CheckCircle,
  FileText,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type { Session } from "../../types";
import { generateId } from "../../utils/localStorage";

export default function SessionManagement() {
  const {
    currentUser,
    currentSession,
    switchSession,
    addNotification,
    getData,
    saveData,
    updateData,
    deleteData,
    refreshCollection,
  } = useApp();

  const isSuperAdmin = currentUser?.role === "superadmin";

  const [newLabel, setNewLabel] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null);
  const [editTarget, setEditTarget] = useState<Session | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [sessions, setSessions] = useState<Session[]>([]);

  // Load sessions from server on mount
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        await refreshCollection("sessions");
      } catch {
        // fallback to in-memory
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [refreshCollection]);

  // Sync sessions from context data
  useEffect(() => {
    const raw = getData("sessions") as Session[];
    if (raw.length > 0) {
      setSessions(raw);
    } else {
      setLoading(false);
    }
  }, [getData]);

  async function handleCreate() {
    const label = newLabel.trim();
    if (!label.match(/^\d{4}-\d{2}$/)) {
      toast.error("Session label must be in YYYY-YY format (e.g. 2026-27)");
      return;
    }
    if (sessions.find((s) => s.label === label)) {
      toast.error("Session already exists.");
      return;
    }

    setSaving(true);
    const [startStr] = label.split("-");
    const startYear = Number.parseInt(startStr, 10);
    const newSession: Session = {
      id: generateId(),
      label,
      startYear,
      endYear: startYear + 1,
      isArchived: false,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    try {
      // Archive all current active sessions
      for (const s of sessions.filter((x) => x.isActive)) {
        await updateData("sessions", s.id, {
          isActive: false,
          isArchived: true,
        });
      }
      await saveData(
        "sessions",
        newSession as unknown as Record<string, unknown>,
      );
      switchSession(newSession.id);
      addNotification(`New session created: ${label}`, "success", "📅");
      setNewLabel("");
      toast.success(`Session ${label} created.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create session.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(session: Session) {
    if (session.isActive) {
      toast.error("Cannot delete the active session.");
      return;
    }
    setSaving(true);
    try {
      await deleteData("sessions", session.id);
      toast.success(`Session ${session.label} deleted.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete session.",
      );
    } finally {
      setDeleteTarget(null);
      setSaving(false);
    }
  }

  async function handleEdit() {
    if (!editTarget) return;
    const label = editLabel.trim();
    if (!label) {
      toast.error("Session label cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await updateData("sessions", editTarget.id, { label });
      toast.success("Session updated.");
      setEditTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update session.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSetCurrent(session: Session) {
    setSaving(true);
    try {
      // Mark all as inactive/archived first, then set selected as active
      for (const s of sessions.filter(
        (x) => x.isActive && x.id !== session.id,
      )) {
        await updateData("sessions", s.id, {
          isActive: false,
          isArchived: true,
        });
      }
      await updateData("sessions", session.id, {
        isActive: true,
        isArchived: false,
      });
      switchSession(session.id);
      addNotification(`Switched to session: ${session.label}`, "info", "📅");
      toast.success(`Active session: ${session.label}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to switch session.",
      );
    } finally {
      setSaving(false);
    }
  }

  function getStudentCount(sessionId: string): number {
    const students = getData("students") as Array<{ sessionId?: string }>;
    return students.filter((s) => s.sessionId === sessionId).length;
  }

  function getReceiptCount(sessionId: string): number {
    const receipts = getData("fee_receipts") as Array<{
      sessionId?: string;
      isDeleted?: boolean;
    }>;
    return receipts.filter((r) => r.sessionId === sessionId && !r.isDeleted)
      .length;
  }

  const sorted = [...sessions].sort((a, b) => b.startYear - a.startYear);

  return (
    <div className="p-4 lg:p-6 max-w-2xl space-y-6">
      {/* Current Session Banner */}
      {currentSession && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">
                Active Session: {currentSession.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                All data operations are scoped to this session
              </p>
            </div>
            <div className="flex gap-4 text-right">
              <div>
                <p className="text-lg font-bold font-display text-foreground">
                  {getStudentCount(currentSession.id)}
                </p>
                <p className="text-xs text-muted-foreground">Students</p>
              </div>
              <div>
                <p className="text-lg font-bold font-display text-foreground">
                  {getReceiptCount(currentSession.id)}
                </p>
                <p className="text-xs text-muted-foreground">Receipts</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Create New Session — Super Admin only */}
      {isSuperAdmin && (
        <Card className="p-5">
          <h2 className="font-display font-semibold text-foreground mb-1">
            Create New Session
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Creating a new session archives the current one. Use Promote
            Students to move students forward.
          </p>
          <div className="flex gap-3">
            <Input
              data-ocid="sessions.label.input"
              placeholder="e.g. 2026-27"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="max-w-xs"
              onKeyDown={(e) => e.key === "Enter" && void handleCreate()}
            />
            <Button
              onClick={() => void handleCreate()}
              data-ocid="sessions.create.button"
              disabled={saving || !newLabel.trim()}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-1.5" />
              )}
              Create Session
            </Button>
          </div>
        </Card>
      )}

      {/* Session List */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-display font-semibold text-foreground">
            All Sessions
          </h2>
          <span className="text-xs text-muted-foreground">
            {loading
              ? "Loading…"
              : `${sessions.length} session${sessions.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        <div className="divide-y divide-border">
          {loading ? (
            <div className="px-5 py-6 space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="w-10 h-10 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div
              className="px-5 py-8 text-center text-muted-foreground text-sm"
              data-ocid="sessions.empty_state"
            >
              No sessions found. Create your first session above.
            </div>
          ) : (
            sorted.map((session, idx) => {
              const isCurrentActive = currentSession?.id === session.id;
              return (
                <div
                  key={session.id}
                  className="flex items-center gap-4 px-5 py-4"
                  data-ocid={`sessions.item.${idx + 1}`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      session.isActive ? "bg-primary/10" : "bg-muted"
                    }`}
                  >
                    {session.isActive ? (
                      <CheckCircle className="w-5 h-5 text-primary" />
                    ) : (
                      <Archive className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground">
                        {session.label}
                      </p>
                      {session.isActive && (
                        <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                          Active
                        </Badge>
                      )}
                      {session.isArchived && !session.isActive && (
                        <Badge variant="secondary" className="text-xs">
                          Archived
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" />{" "}
                        {getStudentCount(session.id)} students
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileText className="w-3 h-3" />{" "}
                        {getReceiptCount(session.id)} receipts
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Created:{" "}
                        {new Date(session.createdAt).toLocaleDateString(
                          "en-IN",
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isCurrentActive ? (
                      <Badge className="text-xs px-3 py-1 bg-accent/10 text-accent border-accent/20">
                        Current
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        data-ocid={`sessions.switch.${idx + 1}`}
                        onClick={() => void handleSetCurrent(session)}
                        disabled={saving}
                      >
                        Set Active
                      </Button>
                    )}

                    {isSuperAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditTarget(session);
                          setEditLabel(session.label);
                        }}
                        aria-label="Edit session"
                        data-ocid={`sessions.edit_button.${idx + 1}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}

                    {isSuperAdmin && !session.isActive && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(session)}
                        aria-label="Delete session"
                        data-ocid={`sessions.delete_button.${idx + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Edit Dialog */}
      <AlertDialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Session</AlertDialogTitle>
            <AlertDialogDescription>
              Change the label for session <strong>{editTarget?.label}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Input
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              placeholder="e.g. 2025-26"
              data-ocid="sessions.edit.label.input"
              onKeyDown={(e) => e.key === "Enter" && void handleEdit()}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="sessions.edit.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="sessions.edit.confirm_button"
              onClick={() => void handleEdit()}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : null}
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete session{" "}
              <strong>{deleteTarget?.label}</strong> and all its archived data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="sessions.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="sessions.delete.confirm_button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && void handleDelete(deleteTarget)}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
