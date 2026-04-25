/**
 * SessionContext — thin wrapper that re-exports session state from AppContext.
 *
 * This allows components to import session data from a dedicated context
 * without duplicating state. The actual session list and switching logic
 * live in AppContext (which owns auth + session lifecycle).
 *
 * Pre-loaded sessions (2019-20 through 2025-26) are auto-created during
 * AppContext initialization via ensurePreloadedSessions().
 */

import { createContext, useContext } from "react";
import type { Session } from "../types";

export interface SessionContextValue {
  currentSession: Session | null;
  sessions: Session[];
  switchSession: (sessionId: string) => void;
  createSession: (label: string, description?: string) => Session;
  isSuperAdmin: boolean;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useSessionContext(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx)
    throw new Error(
      "useSessionContext must be used within SessionContext.Provider",
    );
  return ctx;
}
