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
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type { Session } from "../../types";
import { generateId } from "../../utils/localStorage";

function formatYear(label: string): string {
  const [a, b] = label.split("-");
  if (a && b) return `${a}–${b}`;
  return label;
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
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [editTarget, setEditTarget] = useState<Session | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load sessions
  useEffect(() => {
    void loadSessions();
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

  // Merge context sessions on change
  useEffect(() => {
    if (!loading && sessions.length > 0) setLocalSessions(sessions);
  }, [sessions, loading]);

  async function handleAdd() {
    const label = newLabel.trim();
    if (!label) {
      toast.error("Session name is required.");
      return;
    }
    const yearMatch = label.match(/^(\d{4})-(\d{2,4})$/);
    if (!yearMatch) {
      toast.error("Format should be YYYY-YY (e.g. 2025-26)");
      return;
    }

    setAdding(true);
    const startYear = Number.parseInt(yearMatch[1]);
    const endYearFull = startYear + 1;
    const session: Session = {
      id: generateId(),
      label,
      startYear,
      endYear: endYearFull,
      isArchived: false,
      isActive: false,
      createdAt: new Date().toISOString(),
    };

    try {
      await saveData("sessions", session as unknown as Record<string, unknown>);
      toast.success(`Session ${label} created.`);
      setNewLabel("");
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
      // Mark all as inactive
      for (const s of localSessions) {
        if (s.isActive) {
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
    if (a.isActive) return -1;
    if (b.isActive) return 1;
    return b.startYear - a.startYear;
  });

  return (
    <div className="p-4 lg:p-6 max-w-3xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-semibold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" /> Session Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Current session: <strong>{currentSession?.label ?? "None"}</strong>
          </p>
        </div>
        {isSuperAdmin && (
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            data-ocid="sessions.add_button"
          >
            <Plus className="w-4 h-4 mr-1.5" /> New Session
          </Button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && isSuperAdmin && (
        <Card className="p-5 space-y-4 border-primary/20 animate-slide-up">
          <h3 className="font-semibold text-foreground">Create New Session</h3>
          <div className="space-y-1.5">
            <Label htmlFor="session-label">Session Name *</Label>
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
            <p className="text-xs text-muted-foreground">
              Format: YYYY-YY (e.g. 2026-27)
            </p>
          </div>
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
          {sortedSessions.map((session, idx) => (
            <Card
              key={session.id}
              className={`p-4 transition-smooth ${session.isActive ? "border-primary/30 bg-primary/5" : ""}`}
              data-ocid={`sessions.item.${idx + 1}`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${session.isActive ? "bg-primary/10" : "bg-muted"}`}
                  >
                    <Calendar
                      className={`w-5 h-5 ${session.isActive ? "text-primary" : "text-muted-foreground"}`}
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {formatYear(session.label)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.startYear} – {session.endYear}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {session.isActive && (
                      <Badge className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                        <CheckCircle className="w-2.5 h-2.5 mr-1" />
                        Current
                      </Badge>
                    )}
                    {session.isArchived && !session.isActive && (
                      <Badge variant="secondary" className="text-[10px]">
                        <Archive className="w-2.5 h-2.5 mr-1" />
                        Archived
                      </Badge>
                    )}
                  </div>
                </div>

                {isSuperAdmin && (
                  <div className="flex gap-1.5 flex-wrap">
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
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    {!session.isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleArchive(session)}
                        title="Archive session"
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
                        data-ocid={`sessions.delete_button.${idx + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
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
              session.
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
              Update the session name.
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
              undone. Student records for this session may be affected.
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
