/**
 * SHUBH SCHOOL ERP — API Sync Status Hook
 *
 * Polls /api/sync/status every 5 s when an API URL is configured.
 * Returns live connection state consumed by Dashboard and other components.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type SyncStatusResponse,
  fetchSyncStatus,
  isApiConfigured,
} from "../utils/api";

export type SyncMode =
  | "local" // no API URL set — purely localStorage
  | "connected" // API reachable
  | "syncing" // in-flight request
  | "offline"; // API configured but unreachable

export interface SyncState {
  mode: SyncMode;
  lastSyncTime: Date | null;
  lastSyncError: string | null;
  isSynced: boolean;
  isPolling: boolean;
  serverInfo: {
    version?: string;
    db_version?: string;
    last_backup?: string;
  } | null;
  /** Manually trigger an immediate sync check */
  triggerSync: () => Promise<void>;
}

const POLL_INTERVAL_MS = 5_000;
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

export function useSync(): SyncState {
  const [mode, setMode] = useState<SyncMode>(() =>
    isApiConfigured() ? "syncing" : "local",
  );
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(loadLastSync);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [serverInfo, setServerInfo] = useState<SyncState["serverInfo"]>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef(true);

  const runCheck = useCallback(async () => {
    if (!isApiConfigured()) {
      setMode("local");
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
        persistLastSync(now);
        setServerInfo({
          version: result.version,
          db_version: result.db_version,
          last_backup: result.last_backup,
        });
      } else {
        setMode("offline");
        setLastSyncError(result.message ?? "Server returned an error");
      }
    } catch (err) {
      if (!activeRef.current) return;
      setMode("offline");
      setLastSyncError(
        err instanceof Error ? err.message : "Connection failed",
      );
    }
  }, []);

  // Start/stop polling based on whether API is configured
  useEffect(() => {
    activeRef.current = true;

    if (!isApiConfigured()) {
      setMode("local");
      return;
    }

    // Initial check immediately
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

  // Re-evaluate when localStorage API URL changes (storage event from other tabs)
  useEffect(() => {
    function handleStorageChange(e: StorageEvent) {
      if (e.key === "shubh_erp_api_url") {
        if (e.newValue) {
          void runCheck();
        } else {
          setMode("local");
          setLastSyncError(null);
          if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }
    }
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [runCheck]);

  return {
    mode,
    lastSyncTime,
    lastSyncError,
    isSynced: mode === "connected",
    isPolling: mode === "syncing",
    serverInfo,
    triggerSync: runCheck,
  };
}
