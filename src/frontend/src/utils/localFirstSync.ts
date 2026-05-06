/**
 * SHUBH SCHOOL ERP — Offline-First Data Layer
 *
 * Source of truth: IndexedDB
 * Mutations: write to IndexedDB first → add to sync_queue → push to PHP/MySQL in background
 * Reads: IndexedDB first; if empty → fetch from PHP API → seed IndexedDB
 * Merge: Last Write Wins (updatedAt timestamp)
 *
 * Usage:
 *   import { localFirst } from './localFirstSync';
 *   const students = await localFirst.getAll('students');
 *   const saved = await localFirst.save('students', record, 'create');
 */

import {
  type DbRecord,
  type StoreName,
  type SyncAction,
  dbClear,
  dbDelete,
  dbGetAll,
  dbGetById,
  dbPut,
  dbPutMany,
  enqueueSyncOp,
  openDb,
} from "../lib/db";
import { processSyncQueue } from "./syncEngine";

// ── Helpers ───────────────────────────────────────────────────────────────────

function genId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function now(): number {
  return Date.now();
}

// Last Write Wins: merge server records into IndexedDB.
// If local record is newer (updatedAt > server.updatedAt), keep local.
// Otherwise, replace with server version.
export async function mergeServerRecords(
  store: StoreName,
  serverRecords: Record<string, unknown>[],
): Promise<void> {
  if (serverRecords.length === 0) return;

  try {
    await openDb(); // ensure DB is open
    const toWrite: DbRecord[] = [];

    for (const sr of serverRecords) {
      const serverId = String(sr.id ?? "");
      if (!serverId) continue;

      const serverTs = (sr.updatedAt as number) ?? 0;
      const local = await dbGetById(store, serverId);

      if (!local || local.updatedAt <= serverTs) {
        // Server is newer or no local copy — overwrite
        toWrite.push({
          ...sr,
          id: serverId,
          updatedAt: serverTs || now(),
          synced: true,
          syncAction: "update" as SyncAction,
        } as DbRecord);
      }
      // If local.updatedAt > serverTs → local is newer, keep local (will sync out)
    }

    if (toWrite.length > 0) {
      await dbPutMany(store, toWrite);
    }
  } catch (err) {
    console.warn(
      `[localFirstSync] mergeServerRecords failed for ${store}:`,
      err,
    );
  }
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function getAll<T extends DbRecord>(
  store: StoreName,
): Promise<T[]> {
  try {
    const local = await dbGetAll<T>(store);
    return local;
  } catch {
    return [];
  }
}

export async function getById<T extends DbRecord>(
  store: StoreName,
  id: string,
): Promise<T | null> {
  return dbGetById<T>(store, id);
}

export async function save<T extends Record<string, unknown>>(
  store: StoreName,
  record: T,
  action: SyncAction = "create",
): Promise<T & DbRecord> {
  const id = record.id ? String(record.id) : genId();
  const ts = now();

  const dbRecord: DbRecord = {
    ...record,
    id,
    updatedAt: ts,
    synced: false,
    syncAction: action,
  };

  // 1. Write to IndexedDB immediately
  await dbPut(store, dbRecord);

  // 2. Enqueue sync op
  await enqueueSyncOp(store, id, action, dbRecord);

  // 3. Kick off background sync (non-blocking)
  void processSyncQueue();

  return dbRecord as T & DbRecord;
}

export async function remove(store: StoreName, id: string): Promise<void> {
  // Mark as deleted in IndexedDB (soft delete for sync)
  const existing = await dbGetById(store, id);
  if (existing) {
    await dbPut(store, {
      ...existing,
      syncAction: "delete" as SyncAction,
      synced: false,
      updatedAt: now(),
    });
  }

  // Enqueue delete op
  await enqueueSyncOp(store, id, "delete", { id });

  // Background sync
  void processSyncQueue();
}

// ── Seed from server (call on app start) ──────────────────────────────────────

export async function seedFromServer(
  store: StoreName,
  serverRecords: Record<string, unknown>[],
): Promise<void> {
  await mergeServerRecords(store, serverRecords);
}

// ── Replace store completely (for initial load when DB is empty) ──────────────

export async function setCollection(
  store: StoreName,
  serverRecords: Record<string, unknown>[],
): Promise<void> {
  await dbClear(store);
  const records: DbRecord[] = serverRecords.map((r) => ({
    ...r,
    id: String(r.id ?? genId()),
    updatedAt: (r.updatedAt as number) ?? now(),
    synced: true,
    syncAction: "update" as SyncAction,
  }));
  if (records.length > 0) {
    await dbPutMany(store, records);
  }
}

// ── Delete a local record (hard) ──────────────────────────────────────────────

export async function hardDelete(store: StoreName, id: string): Promise<void> {
  await dbDelete(store, id);
}

// ── Legacy compat object ──────────────────────────────────────────────────────

export const localFirstSync = {
  save: async (col: string, item: Record<string, unknown>, op: string) =>
    save(col as StoreName, item, op as SyncAction),

  load: async (col: string) => getAll(col as StoreName),

  getSnapshot: <T = Record<string, unknown>>(_col: string): T[] => [],

  mergeServerRecords: async (col: string, rows: Record<string, unknown>[]) =>
    mergeServerRecords(col as StoreName, rows),

  setCollection: async (col: string, rows: Record<string, unknown>[]) =>
    setCollection(col as StoreName, rows),

  getPendingCount: async () => {
    const { getPendingCount } = await import("./syncEngine");
    return getPendingCount();
  },

  restorePendingQueue: async () => {},
  forceSync: async () => processSyncQueue(),
  startFlushTimer: () => {},
  stopFlushTimer: () => {},
  reset: () => {},
  resumeAfterTokenRefresh: async () => processSyncQueue(),
};

export default localFirstSync;
