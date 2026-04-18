/**
 * SHUBH SCHOOL ERP — API Sync Status Hook
 *
 * Polls /api/sync/status every 30 s when an API URL is configured.
 * Also exposes syncedCounts from the DataService for the dashboard display.
 * Returns live connection state consumed by Dashboard and other components.
 *
 * Special handling: if the server returns "Super Admin only" the hook
 * sets needsAuth=true and backs off for 30 s instead of retrying every 30 s.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  type SyncStatusResponse,
  fetchSyncStatus,
  isApiConfigured,
} from "../utils/api";
import { dataService } from "../utils/dataService";

export type SyncMode =
  | "local" // no API URL set — purely localStorage
  | "connected" // API reachable + data loaded
  | "syncing" // in-flight request
  | "offline" // API configured but unreachable
  | "auth_error"; // API reachable but auth rejected (Super Admin only)

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
  /** Counts of synced records per collection e.g. {students: 142, fee_receipts: 890} */
  syncedCounts: Record<string, number>;
  /** Manually trigger an immediate sync + data refresh */
  triggerSync: () => Promise<void>;
}

const POLL_INTERVAL_MS = 30_000;
const AUTH_BACKOFF_MS = 30_000;
const LS_LAST_SYNC_KEY = "shubh_erp_last_sync_time";

function persistLastSync(ts: Date) {
  try {
    localStorage.setItem(LS_LAST_SYNC_KEY, ts.toISOString());
  } catch {
    // ignore
  }
}

function loadLastSync(): Date | null {
  try {
    const raw = localStorage.getItem(LS_LAST_SYNC_KEY);
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function isSuperAdminOnlyError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes("super admin") ||
    lower.includes("superadmin") ||
    lower.includes("super_admin") ||
    lower.includes("unauthorized") ||
    lower.includes("unauthenticated") ||
    lower.includes("forbidden")
  );
}

export function useSync(): SyncState {
  const [mode, setMode] = useState<SyncMode>(() =>
    isApiConfigured() ? "syncing" : "local",
  );
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(loadLastSync);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [serverInfo, setServerInfo] = useState<SyncState["serverInfo"]>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef(true);

  // Subscribe to DataService for live counts
  const dsMode = useSyncExternalStore(
    dataService.subscribe.bind(dataService),
    () => dataService.getMode(),
  );
  const syncedCounts = dataService.getCounts();

  // Stable ref to restart polling at a given interval
  const restartPoll = useCallback(
    (intervalMs: number, checkFn: () => Promise<void>) => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      intervalRef.current = setInterval(() => {
        void checkFn();
      }, intervalMs);
    },
    [],
  );

  const runCheck = useCallback(async () => {
    if (!isApiConfigured()) {
      setMode("local");
      setNeedsAuth(false);
      return;
    }
    setMode("syncing");
    try {
      const result: SyncStatusResponse = await fetchSyncStatus();
      if (!activeRef.current) return;

      if (result.status === "ok") {
        // Only set connected if server responds with ok status
        // counts may be undefined on first run (tables just created)
        const now = new Date();
        setMode("connected");
        setLastSyncTime(now);
        setLastSyncError(null);
        setNeedsAuth(false);
        persistLastSync(now);
        setServerInfo({
          version: result.version,
          db_version: result.db_version,
          last_backup: result.last_backup,
        });
        // Restore normal poll interval after auth recovery
        restartPoll(POLL_INTERVAL_MS, runCheck);
        // Trigger DataService to load/refresh all collections when connected
        void dataService.init();
      } else {
        const msg = result.message ?? "Server returned an error";
        if (isSuperAdminOnlyError(msg)) {
          setMode("auth_error");
          setNeedsAuth(true);
          setLastSyncError(
            "Server requires Super Admin authentication. Go to Settings → Data Management → Database Server to authenticate.",
          );
          restartPoll(AUTH_BACKOFF_MS, runCheck);
        } else {
          setMode("offline");
          setNeedsAuth(false);
          setLastSyncError(msg);
        }
      }
    } catch (err) {
      if (!activeRef.current) return;
      const msg = err instanceof Error ? err.message : "Connection failed";
      if (isSuperAdminOnlyError(msg)) {
        setMode("auth_error");
        setNeedsAuth(true);
        setLastSyncError(
          "Server requires Super Admin authentication. Go to Settings → Data Management → Database Server to authenticate.",
        );
        restartPoll(AUTH_BACKOFF_MS, runCheck);
      } else {
        setMode("offline");
        setNeedsAuth(false);
        setLastSyncError(msg);
      }
    }
  }, [restartPoll]);

  // Start/stop polling based on whether API is configured
  useEffect(() => {
    activeRef.current = true;

    if (!isApiConfigured()) {
      setMode("local");
      return;
    }

    void runCheck();

    intervalRef.current = setInterval(() => {
      void runCheck();
    }, POLL_INTERVAL_MS);

    return () => {
      activeRef.current = false;
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [runCheck]);

  // Re-evaluate when localStorage API URL or JWT changes (storage event from other tabs)
  useEffect(() => {
    function handleStorageChange(e: StorageEvent) {
      if (e.key === "shubh_erp_api_url") {
        if (e.newValue) {
          restartPoll(POLL_INTERVAL_MS, runCheck);
          void runCheck();
        } else {
          if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setMode("local");
          setLastSyncError(null);
          setNeedsAuth(false);
        }
      }
      // If JWT was updated (e.g. authenticated from Settings), retry immediately
      if (e.key === "shubh_erp_jwt_token" && e.newValue) {
        setNeedsAuth(false);
        restartPoll(POLL_INTERVAL_MS, runCheck);
        void runCheck();
      }
    }
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [runCheck, restartPoll]);

  // Merge DataService loading state into the effective mode
  const effectiveMode: SyncMode =
    dsMode === "loading" ? "syncing" : dsMode === "ready" ? "connected" : mode;

  return {
    mode: effectiveMode,
    lastSyncTime,
    lastSyncError,
    isSynced: effectiveMode === "connected",
    isPolling: effectiveMode === "syncing",
    needsAuth,
    serverInfo,
    syncedCounts,
    triggerSync: runCheck,
  };
}
