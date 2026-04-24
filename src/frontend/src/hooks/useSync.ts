/**
 * SHUBH SCHOOL ERP — Token Health Check Hook (Online-Only)
 *
 * Replaces the old canister sync hook.
 * - Checks token validity every 4 minutes ONLY after login
 * - Silently refreshes if token is near expiry
 * - Fires 'auth:token-expired' DOM event if refresh fails (AppContext listens)
 * - NEVER shows anything on the login screen (no user = no check)
 */

import { useCallback, useEffect, useRef } from "react";
import phpApiService from "../utils/phpApiService";

// Keep these exported types for backward compatibility with any pages that import them
export type SyncMode =
  | "connected"
  | "syncing"
  | "offline"
  | "local"
  | "auth_error";

export interface SyncState {
  mode: SyncMode;
  lastSyncTime: Date | null;
  lastSyncError: string | null;
  isSynced: boolean;
  isPolling: boolean;
  needsAuth: boolean;
  serverInfo: {
    version?: string;
    db_version?: string;
    last_backup?: string;
  } | null;
  serverCounts: Record<string, number>;
  syncedCounts: Record<string, number>;
  pendingSyncCount: number;
  failedSyncCount: number;
  triggerSync: () => Promise<void>;
}

/** Token validity check interval — 4 minutes */
const CHECK_INTERVAL_MS = 4 * 60 * 1000;

/**
 * useTokenHealth — runs inside AppProvider after login.
 * Pass `isLoggedIn` and `loginTimestamp` to prevent false-positive expiry events.
 */
export function useTokenHealth(
  isLoggedIn: boolean,
  loginTimestamp: number | null,
): void {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkToken = useCallback(async () => {
    if (!isLoggedIn) return;
    // Never check within 5 minutes of login — token was just issued
    if (
      loginTimestamp !== null &&
      Date.now() - loginTimestamp < 5 * 60 * 1000
    ) {
      return;
    }

    if (phpApiService.isTokenExpired()) {
      const refreshed = await phpApiService.silentRefresh();
      if (!refreshed) {
        // silentRefresh already emits 'auth:token-expired'
        // AppContext listens to that event and shows the re-login modal
      }
    }
  }, [isLoggedIn, loginTimestamp]);

  useEffect(() => {
    if (!isLoggedIn) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Start periodic check
    timerRef.current = setInterval(() => {
      void checkToken();
    }, CHECK_INTERVAL_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isLoggedIn, checkToken]);
}

/**
 * useSync — backward-compatible stub.
 * Returns a static "connected" state — actual data is fetched directly
 * by each page via phpApiService. No polling, no pending queue.
 */
export function useSync(): SyncState {
  const noop = useCallback(async () => {}, []);

  return {
    mode: navigator.onLine ? "connected" : "offline",
    lastSyncTime: null,
    lastSyncError: null,
    isSynced: navigator.onLine,
    isPolling: false,
    needsAuth: false,
    serverInfo: null,
    serverCounts: {},
    syncedCounts: {},
    pendingSyncCount: 0,
    failedSyncCount: 0,
    triggerSync: noop,
  };
}
