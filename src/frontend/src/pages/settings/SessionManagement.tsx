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
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import type { Session } from "../../types";
import { dataService } from "../../utils/dataService";
import { generateId, ls } from "../../utils/localStorage";

export default function SessionManagement() {
  const { currentSession, switchSession, addNotification } = useApp();

  const [newLabel, setNewLabel] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Load sessions from server (or localStorage fallback) on mount ──────────
  useEffect(() => {
    async function loadSessions() {
      setLoading(true);
      try {
        // Try server first
        const fromServer = await dataService.getAsync<Session>("sessions");
        if (fromServer.length > 0) {
          setSessions(fromServer);
          ls.set("sessions", fromServer);
        } else {
          // Fall back to localStorage; ensure a default session exists
          const local = ls.get<Session[]>("sessions", []);
          if (local.length === 0) {
            const defaultSession: Session = {
              id: "sess_2025",
              label: "2025-26",
              startYear: 2025,
              endYear: 2026,
              isArchived: false,
              isActive: true,
              createdAt: new Date().toISOString(),
            };
            ls.set("sessions", [defaultSession]);
            setSessions([defaultSession]);
          } else {
            setSessions(local);
          }
        }
      } catch {
        const local = ls.get<Session[]>("sessions", []);
        setSessions(local.length > 0 ? local : []);
      } finally {
        setLoading(false);
      }
    }
    void loadSessions();
  }, []);

  async function handleCreate() {
    const label = newLabel.trim();
    if (!label.match(/^\d{4}-\d{2}$/)) {
      alert("Session label must be in YYYY-YY format (e.g. 2026-27)");
      return;
    }
    const existing = sessions.find((s) => s.label === label);
    if (existing) {
      alert("Session already exists");
      return;
    }

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

    // Archive existing active sessions
    const updated = sessions.map((s) => ({
      ...s,
      isActive: false,
      isArchived: true,
    }));
    const all = [...updated, newSession];

    setSessions(all);
    ls.set("sessions", all);
    ls.set("current_session", newSession.id);
    switchSession(newSession.id);

    // Persist each session to server
    for (const s of all) {
      void dataService.save(
        "sessions",
        s as unknown as Record<string, unknown>,
      );
    }

    addNotification(`New session created: ${label}`, "success", "📅");
    setNewLabel("");
  }

  async function handleDelete(session: Session) {
    if (session.isActive) {
      alert("Cannot delete the active session.");
      return;
    }
    const updated = sessions.filter((s) => s.id !== session.id);
    setSessions(updated);
    ls.set("sessions", updated);

    // Delete from server
    try {
      await dataService.delete("sessions", session.id);
    } catch {
      // best-effort
    }
    setDeleteTarget(null);
  }

  function getSessionStats(sessionId: string): {
    students: number;
    receipts: number;
  } {
    const students = dataService.get<{ sessionId: string }>("students");
    const receipts = dataService.get<{
      sessionId: string;
      isDeleted?: boolean;
    }>("fee_receipts");
    return {
      students: students.filter((s) => s.sessionId === sessionId).length,
      receipts: receipts.filter(
        (r) => r.sessionId === sessionId && !r.isDeleted,
      ).length,
    };
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
            {(() => {
              const stats = getSessionStats(currentSession.id);
              return (
                <div className="flex gap-4 text-right">
                  <div>
                    <p className="text-lg font-bold font-display text-foreground">
                      {stats.students}
                    </p>
                    <p className="text-xs text-muted-foreground">Students</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold font-display text-foreground">
                      {stats.receipts}
                    </p>
                    <p className="text-xs text-muted-foreground">Receipts</p>
                  </div>
                </div>
              );
            })()}
          </div>
        </Card>
      )}

      {/* Create New Session */}
      <Card className="p-5">
        <h2 className="font-display font-semibold text-foreground mb-1">
          Create New Session
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Creating a new session archives the current one. Use Promote Students
          to move students.
        </p>
        <div className="flex gap-3">
          <Input
            data-ocid="session-label-input"
            placeholder="e.g. 2026-27"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="max-w-xs"
            onKeyDown={(e) => e.key === "Enter" && void handleCreate()}
          />
          <Button
            onClick={() => void handleCreate()}
            data-ocid="session-create"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Create Session
          </Button>
        </div>
      </Card>

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
          ) : (
            sorted.map((session) => {
              const stats = getSessionStats(session.id);
              const isCurrentActive = currentSession?.id === session.id;
              return (
                <div
                  key={session.id}
                  className="flex items-center gap-4 px-5 py-4"
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
                        <GraduationCap className="w-3 h-3" />
                        {stats.students} students
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {stats.receipts} receipts
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
                    {!isCurrentActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        data-ocid={`session-switch-${session.id}`}
                        onClick={() => {
                          switchSession(session.id);
                          addNotification(
                            `Switched to session: ${session.label}`,
                            "info",
                            "📅",
                          );
                        }}
                      >
                        Switch
                      </Button>
                    )}
                    {isCurrentActive && (
                      <Badge className="text-xs px-3 py-1 bg-accent/10 text-accent border-accent/20">
                        Current
                      </Badge>
                    )}
                    {!session.isActive && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(session)}
                        aria-label="Delete session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {!loading && sessions.length === 0 && (
            <div className="px-5 py-8 text-center text-muted-foreground text-sm">
              No sessions found.
            </div>
          )}
        </div>
      </Card>

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
            <AlertDialogCancel data-ocid="session-delete-cancel">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="session-delete-confirm"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && void handleDelete(deleteTarget)}
            >
              {/* Show spinner while deleting */}
              {deleteTarget ? (
                "Delete"
              ) : (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
