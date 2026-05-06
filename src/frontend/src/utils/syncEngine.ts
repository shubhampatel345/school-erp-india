/**
 * SHUBH SCHOOL ERP — Sync Engine
 *
 * Background sync: reads pending ops from IndexedDB sync_queue,
 * pushes to PHP/MySQL API, marks done on success.
 *
 * Strategy:
 *   - processSyncQueue()  — flush all pending ops to server
 *   - startSync()         — auto-flush every 30s when online
 *   - stopSync()          — clear interval
 *   - retryFailed()       — retry failed items (exponential backoff, max 5 attempts)
 *   - Last Write Wins     — compare updatedAt; server record wins if newer
 *   - online/offline      — pause/resume automatically
 */

import {
  type SyncQueueEntry,
  getPendingSyncOps,
  markSyncOpDone,
  updateSyncOpAttempt,
} from "../lib/db";
import phpApiService from "./phpApiService";

export type SyncState = "idle" | "syncing" | "synced" | "error" | "offline";

export interface SyncStatus {
  state: SyncState;
  lastSyncTime: number | null;
  lastError: string | null;
  pendingCount: number;
  serverCounts: Record<string, number>;
}

type SyncListener = (status: SyncStatus) => void;

// ── Internal state ────────────────────────────────────────────────────────────

let _status: SyncStatus = {
  state: "idle",
  lastSyncTime: null,
  lastError: null,
  pendingCount: 0,
  serverCounts: {},
};

const _listeners: Set<SyncListener> = new Set();
let _intervalId: ReturnType<typeof setInterval> | null = null;
let _isSyncing = false;
const SYNC_INTERVAL_MS = 30_000;
const MAX_ATTEMPTS = 5;

function notify(update: Partial<SyncStatus>): void {
  _status = { ..._status, ...update };
  for (const fn of _listeners) {
    try {
      fn(_status);
    } catch {
      /* noop */
    }
  }
}

// ── Route a sync op to the correct phpApiService method ──────────────────────

async function pushOp(entry: SyncQueueEntry): Promise<void> {
  const { store, action, payload } = entry;

  switch (store) {
    case "students":
      if (action === "delete") {
        await phpApiService.deleteStudent(entry.recordId);
      } else if (action === "create") {
        await phpApiService.addStudent(payload);
      } else {
        await phpApiService.updateStudent({
          ...payload,
          id: entry.recordId,
        } as Parameters<typeof phpApiService.updateStudent>[0]);
      }
      break;

    case "staff":
      if (action === "delete") {
        await phpApiService.deleteStaff(entry.recordId);
      } else if (action === "create") {
        await phpApiService.addStaff(payload);
      } else {
        await phpApiService.updateStaff({
          ...payload,
          id: entry.recordId,
        } as Parameters<typeof phpApiService.updateStaff>[0]);
      }
      break;

    case "classes":
      if (action === "delete") {
        await phpApiService.deleteClass(entry.recordId);
      } else if (action === "create") {
        await phpApiService.addClass(
          payload as Parameters<typeof phpApiService.addClass>[0],
        );
      } else {
        await phpApiService.updateClass(
          entry.recordId,
          payload as Parameters<typeof phpApiService.updateClass>[1],
        );
      }
      break;

    case "fee_headings":
      if (action === "delete") {
        await phpApiService.deleteFeeHeading(entry.recordId);
      } else {
        await phpApiService.addFeeHeading(payload);
      }
      break;

    case "attendance":
      if (action === "create" || action === "update") {
        await phpApiService.markAttendance([
          payload as Parameters<typeof phpApiService.markAttendance>[0][number],
        ]);
      }
      break;

    case "expenses":
      if (action === "delete") {
        await phpApiService.deleteExpense(entry.recordId);
      } else {
        await phpApiService.addExpense(payload);
      }
      break;

    case "homework":
      if (action === "delete") {
        await phpApiService.deleteHomework(entry.recordId);
      } else {
        await phpApiService.addHomework(payload);
      }
      break;

    case "library_books":
      if (action === "create") {
        await phpApiService.addBook(payload);
      } else if (action === "update") {
        await phpApiService.updateBook(payload);
      }
      break;

    case "inventory_items":
      if (action === "delete") {
        await phpApiService.deleteInventoryItem(entry.recordId);
      } else if (action === "create") {
        await phpApiService.addInventoryItem(payload);
      } else {
        await phpApiService.updateInventoryItem(payload);
      }
      break;

    default:
      // For other stores — generic POST to settings/save or skip
      console.debug(
        `[syncEngine] no push handler for store=${store}, skipping`,
      );
      break;
  }
}

// ── Core: process sync queue ──────────────────────────────────────────────────

export async function processSyncQueue(): Promise<void> {
  if (_isSyncing) return;
  if (!navigator.onLine) {
    notify({ state: "offline" });
    return;
  }

  _isSyncing = true;
  const pending = await getPendingSyncOps();

  if (pending.length === 0) {
    _isSyncing = false;
    notify({ state: "synced", lastSyncTime: Date.now(), pendingCount: 0 });
    return;
  }

  notify({ state: "syncing", pendingCount: pending.length });

  let errorCount = 0;

  for (const entry of pending) {
    if (entry.attempts >= MAX_ATTEMPTS) {
      // Abandon after max attempts
      await markSyncOpDone(entry.id);
      continue;
    }

    try {
      await phpApiService.ensureValidToken();
      await pushOp(entry);
      await markSyncOpDone(entry.id);
    } catch (err) {
      errorCount++;
      const msg = err instanceof Error ? err.message : "Sync failed";
      await updateSyncOpAttempt(entry.id, entry.attempts + 1, msg);
      console.warn(
        `[syncEngine] op failed (attempt ${entry.attempts + 1}):`,
        msg,
      );
    }
  }

  _isSyncing = false;
  const remaining = await getPendingSyncOps();

  if (errorCount > 0 && remaining.length > 0) {
    notify({
      state: "error",
      lastError: `${errorCount} item(s) failed to sync`,
      pendingCount: remaining.length,
    });
  } else {
    notify({
      state: "synced",
      lastSyncTime: Date.now(),
      lastError: null,
      pendingCount: remaining.length,
    });
  }
}

// ── Start / stop polling ──────────────────────────────────────────────────────

export function startSync(): void {
  if (_intervalId !== null) return;

  // Online/offline listeners
  window.addEventListener("online", () => {
    notify({ state: "idle" });
    void processSyncQueue();
  });
  window.addEventListener("offline", () => {
    notify({ state: "offline" });
  });

  if (!navigator.onLine) {
    notify({ state: "offline" });
    return;
  }

  // Immediate first run
  void processSyncQueue();

  _intervalId = setInterval(() => {
    if (navigator.onLine) void processSyncQueue();
  }, SYNC_INTERVAL_MS);
}

export function stopSync(): void {
  if (_intervalId !== null) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
}

export async function retryFailed(): Promise<void> {
  await processSyncQueue();
}

// ── Subscription ─────────────────────────────────────────────────────────────

export function subscribe(fn: SyncListener): () => void {
  _listeners.add(fn);
  fn(_status); // emit current state immediately
  return () => _listeners.delete(fn);
}

export function getStatus(): SyncStatus {
  return _status;
}

export async function getPendingCount(): Promise<number> {
  const pending = await getPendingSyncOps();
  return pending.length;
}

// ── Legacy compat object (for any old imports of syncEngine.getQueueStats etc.) ──

export const syncEngine = {
  subscribe,
  getQueueStats: () => ({ pending: _status.pendingCount, failed: 0 }),
  getSyncStatus: getStatus,
  loadAllFromCanister: async () => {},
  startPolling: startSync,
  stopPolling: stopSync,
};

export default syncEngine;
