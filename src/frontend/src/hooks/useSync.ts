/**
 * SHUBH SCHOOL ERP — API Sync Status Hook
 *
 * Polls /api/sync/status every 30 s when an API URL is configured.
 * Exposes serverCounts from /sync/status (real MySQL COUNT(*)) for dashboard.
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
  /**
   * Real MySQL COUNT(*) per collection — taken directly from /sync/status response.
   * These are the authoritative counts to display on dashboard stat cards.
   * On fresh devices with empty localStorage this will still show the correct counts.
   */
  serverCounts: Record<string, number>;
  /**
   * In-memory cache counts from DataService (may be partial if fetch is still in flight).
   * Use serverCounts for display; use syncedCounts only for the tooltip breakdown.
   */
  syncedCounts: Record<string, number>;
  /** Manually trigger an immediate sync + data refresh */
  triggerSync: () => Promise<void>;
}

const POLL_INTERVAL_MS = 30_000;
const AUTH_BACKOFF_MS = 30_000;
// Max time (ms) before we stop showing "Syncing" even if dataService is still loading.
// After this, the polling state takes priority so the banner doesn't stay permanently.
const MAX_SYNCING_DISPLAY_MS = 8_000;
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
  /**
   * Real MySQL counts from /sync/status — the authoritative source for all stat displays.
   * Populated on every successful poll (typically within 1-2s of page load).
   */
  const [serverCounts, setServerCounts] = useState<Record<string, number>>({});

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef(true);

  // Subscribe to DataService for live cache counts (tooltip breakdown only)
  const dsMode = useSyncExternalStore(
    dataService.subscribe.bind(dataService),
    () => dataService.getMode(),
  );
  const syncedCounts = dataService.getCounts();

  // Track when we first entered "loading" state so we can cap the syncing display
  const loadingStartRef = useRef<number | null>(null);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  useEffect(() => {
    if (dsMode === "loading") {
      if (loadingStartRef.current === null) {
        loadingStartRef.current = Date.now();
        setLoadingTimedOut(false);
      }
      const elapsed = Date.now() - (loadingStartRef.current ?? Date.now());
      if (elapsed >= MAX_SYNCING_DISPLAY_MS) {
        setLoadingTimedOut(true);
      } else {
        const remaining = MAX_SYNCING_DISPLAY_MS - elapsed;
        const t = setTimeout(() => setLoadingTimedOut(true), remaining);
        return () => clearTimeout(t);
      }
    } else {
      loadingStartRef.current = null;
      setLoadingTimedOut(false);
    }
  }, [dsMode]);

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
        // Store the real MySQL counts from /sync/status for dashboard stat cards.
        // These come from COUNT(*) queries on the server — always accurate.
        if (result.counts && Object.keys(result.counts).length > 0) {
          setServerCounts(result.counts);
        }
        // Restore normal poll interval after auth recovery
        restartPoll(POLL_INTERVAL_MS, runCheck);
        // Trigger DataService to load/refresh all collections when connected.
        // force=true ensures fresh MySQL data is fetched even if init ran before.
        void dataService.init(true);
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

    // Force a fresh server fetch on every app startup (not just first time).
    // This is what ensures Device B sees the same data as Device A after login.
    void dataService.init(true);
    void runCheck();

    intervalRef.current = setInterval(() => {
      void runCheck();
    }, POLL_INTERVAL_MS);

    // When the user switches back to this tab (window focus), re-fetch data.
    // This is the cross-device sync fix: coming back to the ERP always shows fresh data.
    function handleFocus() {
      if (isApiConfigured()) {
        void dataService.init(true);
        void runCheck();
      }
    }
    window.addEventListener("focus", handleFocus);

    return () => {
      activeRef.current = false;
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      window.removeEventListener("focus", handleFocus);
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

  // Merge DataService loading state into the effective mode.
  // If DataService has been "loading" for more than MAX_SYNCING_DISPLAY_MS,
  // fall back to the polling mode so the banner doesn't stay permanently "Syncing".
  const effectiveMode: SyncMode =
    dsMode === "loading" && !loadingTimedOut
      ? "syncing"
      : dsMode === "ready"
        ? "connected"
        : mode;

  return {
    mode: effectiveMode,
    lastSyncTime,
    lastSyncError,
    isSynced: effectiveMode === "connected",
    isPolling: effectiveMode === "syncing",
    needsAuth,
    serverInfo,
    serverCounts,
    syncedCounts,
    triggerSync: runCheck,
  };
}
