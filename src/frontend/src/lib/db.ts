/**
 * SHUBH SCHOOL ERP — IndexedDB Schema
 *
 * Full IndexedDB implementation using raw API (no idb library dependency).
 * Stores: students, staff, classes, sections, subjects, sessions,
 *         fee_headings, fee_plans, fee_receipts, attendance, exams,
 *         results, homework, library_books, inventory_items,
 *         transport_routes, expenses, notifications, chat_messages,
 *         sync_queue, settings
 *
 * Each record shape:
 *   { id, ...fields, updatedAt: number, synced: boolean, syncAction: 'create'|'update'|'delete' }
 */

export const DB_NAME = "shubh-erp-db";
export const DB_VERSION = 1;

export type SyncAction = "create" | "update" | "delete";

export interface SyncQueueEntry {
  id: string;
  store: string;
  recordId: string;
  action: SyncAction;
  syncAction: SyncAction; // alias for DbRecord compatibility
  payload: Record<string, unknown>;
  updatedAt: number;
  attempts: number;
  lastError: string | null;
  synced: boolean;
  [key: string]: unknown;
}

export interface DbRecord {
  id: string;
  updatedAt: number;
  synced: boolean;
  syncAction: SyncAction;
  [key: string]: unknown;
}

export const STORES = [
  "students",
  "staff",
  "classes",
  "sections",
  "subjects",
  "sessions",
  "fee_headings",
  "fee_plans",
  "fee_receipts",
  "attendance",
  "exams",
  "results",
  "homework",
  "library_books",
  "inventory_items",
  "transport_routes",
  "expenses",
  "notifications",
  "chat_messages",
  "sync_queue",
  "settings",
] as const;

export type StoreName = (typeof STORES)[number];

// ── Open / upgrade ────────────────────────────────────────────────────────────

let _db: IDBDatabase | null = null;
let _openPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  if (_openPromise) return _openPromise;

  _openPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      for (const storeName of STORES) {
        if (!db.objectStoreNames.contains(storeName)) {
          if (storeName === "sync_queue") {
            const store = db.createObjectStore(storeName, { keyPath: "id" });
            store.createIndex("synced", "synced", { unique: false });
            store.createIndex("store", "store", { unique: false });
          } else if (storeName === "settings") {
            db.createObjectStore(storeName, { keyPath: "id" });
          } else {
            const store = db.createObjectStore(storeName, { keyPath: "id" });
            store.createIndex("updatedAt", "updatedAt", { unique: false });
            store.createIndex("synced", "synced", { unique: false });
          }
        }
      }
    };

    req.onsuccess = (event) => {
      _db = (event.target as IDBOpenDBRequest).result;
      _db.onclose = () => {
        _db = null;
        _openPromise = null;
      };
      _db.onerror = (e) => console.error("[db] IDBDatabase error", e);
      resolve(_db);
    };

    req.onerror = () => {
      _openPromise = null;
      reject(req.error ?? new Error("IndexedDB open failed"));
    };

    req.onblocked = () => {
      console.warn("[db] IndexedDB open blocked — close other tabs");
    };
  });

  return _openPromise;
}

// ── Low-level helpers ─────────────────────────────────────────────────────────

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function transaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    tx.onerror = () => reject(tx.error);
    try {
      const result = fn(store);
      if (result instanceof IDBRequest) {
        result.onsuccess = () => resolve(result.result as T);
        result.onerror = () => reject(result.error);
      } else {
        (result as Promise<T>).then(resolve).catch(reject);
      }
    } catch (err) {
      reject(err);
    }
  });
}

// ── CRUD operations ───────────────────────────────────────────────────────────

export async function dbGetAll<T extends DbRecord>(
  store: StoreName,
): Promise<T[]> {
  try {
    const db = await openDb();
    return new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => {
        const rows = (req.result as T[]).filter(
          (r) => r.syncAction !== "delete",
        );
        resolve(rows);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function dbGetById<T extends DbRecord>(
  store: StoreName,
  id: string,
): Promise<T | null> {
  try {
    const db = await openDb();
    return new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const req = tx.objectStore(store).get(id);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function dbPut<T extends DbRecord>(
  store: StoreName,
  record: T,
): Promise<void> {
  try {
    await transaction(store, "readwrite", (s) => s.put(record));
  } catch (err) {
    console.error(`[db] put failed on ${store}:`, err);
    throw err;
  }
}

export async function dbPutMany<T extends DbRecord>(
  store: StoreName,
  records: T[],
): Promise<void> {
  if (records.length === 0) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      const s = tx.objectStore(store);
      for (const r of records) s.put(r);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error(`[db] putMany failed on ${store}:`, err);
    throw err;
  }
}

export async function dbDelete(store: StoreName, id: string): Promise<void> {
  try {
    await transaction(store, "readwrite", (s) => s.delete(id));
  } catch (err) {
    console.error(`[db] delete failed on ${store}:`, err);
  }
}

export async function dbClear(store: StoreName): Promise<void> {
  try {
    await transaction(store, "readwrite", (s) => s.clear());
  } catch (err) {
    console.error(`[db] clear failed on ${store}:`, err);
  }
}

// ── Sync queue ─────────────────────────────────────────────────────────────────

export async function enqueueSyncOp(
  store: StoreName,
  recordId: string,
  action: SyncAction,
  payload: Record<string, unknown>,
): Promise<void> {
  const entry: SyncQueueEntry = {
    id: `${store}_${recordId}_${Date.now()}`,
    store,
    recordId,
    action,
    syncAction: action, // DbRecord compatibility
    payload,
    updatedAt: Date.now(),
    attempts: 0,
    lastError: null,
    synced: false,
  };
  try {
    await dbPut<SyncQueueEntry>(
      "sync_queue",
      entry as unknown as DbRecord & SyncQueueEntry,
    );
  } catch (err) {
    console.warn("[db] enqueueSyncOp failed:", err);
  }
}

export async function getPendingSyncOps(): Promise<SyncQueueEntry[]> {
  try {
    const db = await openDb();
    return new Promise<SyncQueueEntry[]>((resolve, reject) => {
      const tx = db.transaction("sync_queue", "readonly");
      const idx = tx.objectStore("sync_queue").index("synced");
      const req = idx.getAll(IDBKeyRange.only(false));
      req.onsuccess = () => resolve(req.result as SyncQueueEntry[]);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function markSyncOpDone(id: string): Promise<void> {
  try {
    await dbDelete("sync_queue", id);
  } catch {
    /* noop */
  }
}

export async function updateSyncOpAttempt(
  id: string,
  attempts: number,
  lastError: string,
): Promise<void> {
  try {
    const db = await openDb();
    const entry = await idbRequest<SyncQueueEntry>(
      db
        .transaction("sync_queue", "readonly")
        .objectStore("sync_queue")
        .get(id),
    );
    if (!entry) return;
    entry.attempts = attempts;
    entry.lastError = lastError;
    await dbPut<SyncQueueEntry>(
      "sync_queue",
      entry as unknown as DbRecord & SyncQueueEntry,
    );
  } catch {
    /* noop */
  }
}

// ── Bulk export (for backup) ──────────────────────────────────────────────────

export async function exportAllStores(): Promise<Record<string, unknown[]>> {
  const result: Record<string, unknown[]> = {};
  for (const store of STORES) {
    if (store === "sync_queue") continue;
    try {
      result[store] = await dbGetAll(store as StoreName);
    } catch {
      result[store] = [];
    }
  }
  return result;
}

// ── Bulk import (for restore) ─────────────────────────────────────────────────

export async function importAllStores(
  data: Record<string, unknown[]>,
): Promise<void> {
  for (const [store, records] of Object.entries(data)) {
    if (!STORES.includes(store as StoreName)) continue;
    if (store === "sync_queue") continue;
    try {
      await dbPutMany(store as StoreName, records as DbRecord[]);
    } catch (err) {
      console.warn(`[db] importAllStores failed for ${store}:`, err);
    }
  }
}

export default {
  openDb,
  dbGetAll,
  dbGetById,
  dbPut,
  dbPutMany,
  dbDelete,
  dbClear,
  enqueueSyncOp,
  getPendingSyncOps,
  markSyncOpDone,
  exportAllStores,
  importAllStores,
};
