/**
 * SessionSwitcher — Header dropdown that shows all academic sessions.
 *
 * Sessions are loaded and pre-created (2019-20 → 2025-26) automatically
 * in AppContext on app startup. This component just renders them.
 *
 * Sorted newest-first. Current session highlighted in primary colour.
 * Archived sessions show an Archive icon. Super Admin can create new sessions.
 */

import { Archive, ChevronDown, Plus, X } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import type { Session } from "../types";
import { nextSessionLabel } from "../types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

function sessionDateRange(session: Session): string {
  return `Apr ${session.startYear} – Mar ${session.endYear}`;
}

// ── Mini create-session modal ────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function CreateSessionMiniModal({ onClose, onCreated }: CreateModalProps) {
  const { createSession, sessions } = useApp();
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (sessions.length === 0) return;
    const sorted = [...sessions].sort((a, b) => b.startYear - a.startYear);
    const latest = sorted[0];
    const suggested = nextSessionLabel(latest.label);
    if (suggested) setLabel(suggested);
  }, [sessions]);

  async function handleCreate() {
    setError("");
    const trimmed = label.trim();
    if (!trimmed) {
      setError("Session name is required.");
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(trimmed)) {
      setError("Format must be YYYY-YY (e.g. 2026-27)");
      return;
    }
    if (sessions.some((s) => s.label === trimmed)) {
      setError(`Session ${trimmed} already exists.`);
      return;
    }
    setCreating(true);
    try {
      createSession(trimmed);
      onCreated();
    } catch {
      setError("Failed to create session. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
      <div
        className="bg-card border border-border rounded-2xl shadow-elevated w-full max-w-sm animate-slide-up"
        data-ocid="create-session.dialog"
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-display font-semibold text-foreground">
            New Session
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
            data-ocid="create-session.close_button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ss-label">Session Year *</Label>
            <Input
              id="ss-label"
              placeholder="e.g. 2026-27"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreate();
              }}
              autoFocus
              data-ocid="create-session.label_input"
            />
            <p className="text-xs text-muted-foreground">
              Format: YYYY-YY (April to March)
            </p>
          </div>
          {error && (
            <p
              className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg"
              data-ocid="create-session.field_error"
            >
              {error}
            </p>
          )}
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              data-ocid="create-session.cancel_button"
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={() => void handleCreate()}
              disabled={creating}
              data-ocid="create-session.submit_button"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Creating…
                </>
              ) : (
                "Create Session"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SessionSwitcher ──────────────────────────────────────────────────────────

interface SessionSwitcherProps {
  /** If true, "New Session" button shown and create modal accessible */
  allowCreate?: boolean;
}

export default function SessionSwitcher({
  allowCreate = false,
}: SessionSwitcherProps) {
  const { currentSession, sessions, switchSession, currentUser } = useApp();
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isSuperAdmin = currentUser?.role === "superadmin";

  // Sort: current/active first, then newest-first by startYear
  const sorted = [...sessions].sort((a, b) => {
    if (a.isActive && !a.isArchived) return -1;
    if (b.isActive && !b.isArchived) return 1;
    return b.startYear - a.startYear;
  });

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <div className="relative flex-shrink-0" ref={ref}>
        <button
          type="button"
          data-ocid="session-switcher.toggle"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors"
        >
          <span className="text-xs font-semibold text-primary leading-none">
            {currentSession ? currentSession.label : "No Session"}
          </span>
          {currentSession?.isActive && !currentSession.isArchived && (
            <span className="hidden sm:inline text-[9px] bg-emerald-100 text-emerald-700 px-1.5 rounded font-bold leading-none">
              Current
            </span>
          )}
          {currentSession?.isArchived && (
            <span className="hidden sm:inline text-[10px] bg-amber-100 text-amber-700 px-1 rounded leading-none">
              Archived
            </span>
          )}
          <ChevronDown className="w-3 h-3 text-primary flex-shrink-0" />
        </button>

        {open && (
          <div
            className="absolute left-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-elevated z-50 overflow-hidden animate-slide-up"
            style={{ minWidth: "260px" }}
          >
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border bg-muted/30 flex items-center justify-between">
              <span>Switch Session</span>
              {isSuperAdmin && allowCreate && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setShowCreate(true);
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-semibold hover:bg-primary/20 transition-colors"
                  data-ocid="session-switcher.create_button"
                >
                  <Plus className="w-3 h-3" /> New Session
                </button>
              )}
            </div>

            {sorted.length === 0 ? (
              <div className="px-3 py-3 text-sm text-muted-foreground">
                No sessions found
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto">
                {sorted.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    data-ocid="session-switcher.option"
                    onClick={() => {
                      switchSession(s.id);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 hover:bg-muted flex items-start justify-between gap-2 transition-colors border-b border-border/40 last:border-0 ${
                      s.id === currentSession?.id ? "bg-primary/10" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      {s.isArchived && !s.isActive && (
                        <Archive className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-semibold leading-none truncate ${s.id === currentSession?.id ? "text-primary" : "text-foreground"}`}
                        >
                          {s.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {sessionDateRange(s)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {s.isActive && !s.isArchived && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                          ● Current
                        </span>
                      )}
                      {s.isArchived && (
                        <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                          Archived
                        </span>
                      )}
                      {s.id === currentSession?.id && (
                        <span className="text-[9px] text-primary font-bold">
                          ✓ Viewing
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="px-3 py-2 text-[10px] text-muted-foreground border-t border-border bg-muted/20">
              Manage sessions in Settings → Sessions
            </div>
          </div>
        )}
      </div>

      {showCreate && isSuperAdmin && (
        <CreateSessionMiniModal
          onClose={() => setShowCreate(false)}
          onCreated={() => setShowCreate(false)}
        />
      )}
    </>
  );
}
