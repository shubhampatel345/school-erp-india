/**
 * SHUBH SCHOOL ERP — IndexedDB Wrapper (db.ts)
 *
 * Local-first persistence layer.
 * - All ERP collections stored in IndexedDB for instant offline access
 * - SyncQueue: pending operations waiting for canister confirmation
 * - CRITICAL: Background canister polls MUST NOT overwrite pending records
 *
 * This layer sits below syncEngine — syncEngine uses it for durability.
 */

// ── DB Configuration ──────────────────────────────────────────────────────────

const DB_NAME = "shubh_erp";
const DB_VERSION = 2;
const STORE_DATA = "erp_data"; // { key: "collection/id", value: record }
const STORE_QUEUE = "sync_queue"; // pending operations

// ── Known collections ─────────────────────────────────────────────────────────

export const DB_COLLECTIONS = [
  "students",
  "staff",
  "attendance",
  "fee_receipts",
  "fees_plan",
  "fee_headings",
  "fee_heads",
  "fee_balances",
  "transport_routes",
  "pickup_points",
  "inventory_items",
  "expenses",
  "expense_heads",
  "homework",
  "alumni",
  "sessions",
  "classes",
  "sections",
  "subjects",
  "notifications",
  "biometric_devices",
  "payroll_setup",
  "payslips",
  "whatsapp_logs",
  "old_fee_entries",
  "student_transport",
  "student_discounts",
  "notices",
  "examinations",
  "exam_results",
  "library",
] as const;

export type DBCollection = (typeof DB_COLLECTIONS)[number];

// ── Sync Queue Entry ──────────────────────────────────────────────────────────

export interface SyncQueueEntry {
  queueId: string;
  collection: string;
  recordId: string;
  operation: "add" | "edit" | "delete";
  data: Record<string, unknown>;
  createdAt: number;
  retries: number;
  isPending: true;
}

// ── IDB helpers ───────────────────────────────────────────────────────────────

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_DATA)) {
        db.createObjectStore(STORE_DATA); // key: "collection/id"
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        const qs = db.createObjectStore(STORE_QUEUE, { keyPath: "queueId" });
        qs.createIndex("by_collection", "collection", { unique: false });
      }
    };

    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result;
      resolve(_db);
    };

    req.onerror = (e) => {
      reject((e.target as IDBOpenDBRequest).error);
    };
  });
}

function tx(
  db: IDBDatabase,
  stores: string | string[],
  mode: IDBTransactionMode = "readonly",
): IDBTransaction {
  return db.transaction(Array.isArray(stores) ? stores : [stores], mode);
}

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Get all records in a collection from IndexedDB. */
export async function getAll<T = Record<string, unknown>>(
  collection: string,
): Promise<T[]> {
  try {
    const db = await openDB();
    const t = tx(db, STORE_DATA);
    const store = t.objectStore(STORE_DATA);
    const prefix = `${collection}/`;

    return new Promise<T[]>((resolve) => {
      const results: T[] = [];
      const range = IDBKeyRange.bound(prefix, `${prefix}\uffff`);
      const cursor = store.openCursor(range);
      cursor.onsuccess = (e) => {
        const c = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (c) {
          results.push(c.value as T);
          c.continue();
        } else {
          resolve(results);
        }
      };
      cursor.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/** Get a single record by id. */
export async function get<T = Record<string, unknown>>(
  collection: string,
  id: string,
): Promise<T | null> {
  try {
    const db = await openDB();
    const t = tx(db, STORE_DATA);
    const result = await promisify(
      t.objectStore(STORE_DATA).get(`${collection}/${id}`),
    );
    return (result as T) ?? null;
  } catch {
    return null;
  }
}

/** Upsert a record into IndexedDB. */
export async function put(
  collection: string,
  id: string,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const db = await openDB();
    const t = tx(db, STORE_DATA, "readwrite");
    await promisify(
      t.objectStore(STORE_DATA).put({ ...data, id }, `${collection}/${id}`),
    );
  } catch {
    /* ignore write errors */
  }
}

/** Delete a record from IndexedDB. */
export async function remove(collection: string, id: string): Promise<void> {
  try {
    const db = await openDB();
    const t = tx(db, STORE_DATA, "readwrite");
    await promisify(t.objectStore(STORE_DATA).delete(`${collection}/${id}`));
  } catch {
    /* ignore */
  }
}

/** Clear all records in a collection. */
export async function clear(collection: string): Promise<void> {
  try {
    const db = await openDB();
    const t = tx(db, STORE_DATA, "readwrite");
    const store = t.objectStore(STORE_DATA);
    const prefix = `${collection}/`;

    await new Promise<void>((resolve) => {
      const range = IDBKeyRange.bound(prefix, `${prefix}\uffff`);
      const req = store.openCursor(range);
      req.onsuccess = (e) => {
        const c = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (c) {
          c.delete();
          c.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

/** Get all collections and their record arrays. */
export async function getAllCollections(): Promise<
  Record<string, Record<string, unknown>[]>
> {
  const result: Record<string, Record<string, unknown>[]> = {};
  for (const col of DB_COLLECTIONS) {
    result[col] = await getAll(col);
  }
  return result;
}

// ── Sync Queue ─────────────────────────────────────────────────────────────────

/** Add an operation to the sync queue. */
export async function queueOperation(
  collection: string,
  recordId: string,
  operation: "add" | "edit" | "delete",
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const db = await openDB();
    const t = tx(db, STORE_QUEUE, "readwrite");
    const entry: SyncQueueEntry = {
      queueId: `${collection}::${recordId}::${operation}::${Date.now()}`,
      collection,
      recordId,
      operation,
      data,
      createdAt: Date.now(),
      retries: 0,
      isPending: true,
    };
    await promisify(t.objectStore(STORE_QUEUE).put(entry));
  } catch {
    /* ignore — data is in memory */
  }
}

/** Get all pending queue entries. */
export async function getPendingQueue(): Promise<SyncQueueEntry[]> {
  try {
    const db = await openDB();
    const t = tx(db, STORE_QUEUE);
    const all = await promisify(
      t.objectStore(STORE_QUEUE).getAll() as IDBRequest<SyncQueueEntry[]>,
    );
    return all ?? [];
  } catch {
    return [];
  }
}

/** Remove a processed entry from the sync queue. */
export async function dequeue(queueId: string): Promise<void> {
  try {
    const db = await openDB();
    const t = tx(db, STORE_QUEUE, "readwrite");
    await promisify(t.objectStore(STORE_QUEUE).delete(queueId));
  } catch {
    /* ignore */
  }
}

/** Check if a collection has any pending operations in the queue. */
export async function hasPending(collection: string): Promise<boolean> {
  try {
    const pending = await getPendingQueue();
    return pending.some((e) => e.collection === collection);
  } catch {
    return false;
  }
}

/** Clear the entire sync queue (e.g. after full re-sync). */
export async function clearQueue(): Promise<void> {
  try {
    const db = await openDB();
    const t = tx(db, STORE_QUEUE, "readwrite");
    await promisify(t.objectStore(STORE_QUEUE).clear());
  } catch {
    /* ignore */
  }
}
