/**
 * SHUBH SCHOOL ERP — Canister Sync Status Hook
 *
 * Replaces the old MySQL/cPanel polling hook.
 * - Reads sync state from syncEngine (canister-native)
 * - Fetches getCounts() from canister every 30 s
 * - Exposes triggerFullSync() to manually reload all collections
 *
 * No JWT, no PHP, no server URL configuration needed.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { canisterService } from "../utils/canisterService";
import { dataService } from "../utils/dataService";
import { syncEngine } from "../utils/syncEngine";

export type SyncMode =
  | "local" // canister not yet ready (initialising)
  | "connected" // canister reachable, data loaded
  | "syncing" // in-flight canister fetch
  | "offline" // no network or canister unreachable
  | "auth_error"; // kept for backward compat — canister has no auth errors

export interface SyncState {
  mode: SyncMode;
  lastSyncTime: Date | null;
  lastSyncError: string | null;
  isSynced: boolean;
  isPolling: boolean;
  needsAuth: boolean;
  /** Version info — null for canister (no version endpoint like PHP) */
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

const POLL_INTERVAL_MS = 30_000;

export function useSync(): SyncState {
  const [mode, setMode] = useState<SyncMode>("local");
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [serverCounts, setServerCounts] = useState<Record<string, number>>({});
  const [queueStats, setQueueStats] = useState(() =>
    syncEngine.getQueueStats(),
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef(true);

  // Subscribe to syncEngine for live pending count + status
  useEffect(() => {
    const unsub = syncEngine.subscribe(() => {
      setQueueStats(syncEngine.getQueueStats());
      const status = syncEngine.getSyncStatus();
      if (status.state === "synced") {
        setMode("connected");
        setLastSyncTime(status.lastSyncTime ?? new Date());
        setLastSyncError(null);
        if (Object.keys(status.serverCounts).length > 0) {
          setServerCounts(status.serverCounts);
        }
      } else if (status.state === "loading") {
        setMode("syncing");
      } else if (status.state === "offline") {
        setMode("offline");
        setLastSyncError(status.lastError);
      }
    });
    return unsub;
  }, []);

  // Poll canister getCounts() every 30 s
  const fetchCounts = useCallback(async () => {
    if (!activeRef.current) return;
    try {
      const counts = await canisterService.getCounts();
      if (!activeRef.current) return;
      if (Object.keys(counts).length > 0) {
        setServerCounts(counts);
        setMode("connected");
        setLastSyncTime(new Date());
        setLastSyncError(null);
      }
    } catch {
      if (!activeRef.current) return;
      setMode("offline");
      setLastSyncError("Could not reach canister");
    }
  }, []);

  useEffect(() => {
    activeRef.current = true;
    void fetchCounts();
    intervalRef.current = setInterval(() => {
      void fetchCounts();
    }, POLL_INTERVAL_MS);
    return () => {
      activeRef.current = false;
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchCounts]);

  const triggerSync = useCallback(async () => {
    setMode("syncing");
    await syncEngine.loadAllFromCanister();
    const counts = await canisterService.getCounts();
    setServerCounts(counts);
    setMode("connected");
    setLastSyncTime(new Date());
  }, []);

  const syncedCounts = dataService.getCounts();

  return {
    mode,
    lastSyncTime,
    lastSyncError,
    isSynced: mode === "connected",
    isPolling: mode === "syncing",
    needsAuth: false,
    serverInfo: null,
    serverCounts,
    syncedCounts,
    pendingSyncCount: queueStats.pending,
    failedSyncCount: queueStats.failed,
    triggerSync,
  };
}
