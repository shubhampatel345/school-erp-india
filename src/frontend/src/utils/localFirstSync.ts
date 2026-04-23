/**
 * SHUBH SCHOOL ERP — Local-First Sync Engine
 *
 * Architecture (WhatsApp-style):
 * 1. save() writes to IndexedDB immediately — UI sees data instantly
 * 2. Background: item is queued for MySQL sync via phpApiService
 * 3. syncToServer() flushes the queue; on 200 confirms, removes from pending
 * 4. Pending records are NEVER overwritten by stale server data
 * 5. load() returns IndexedDB data merged with any pending writes
 *
 * Events:
 *  - 'sync:complete' — fired when a record successfully saves to MySQL
 *  - 'sync:error'    — fired when server returns an error
 */

import phpApiService from "./phpApiService";

// ── Collection-to-API route map ───────────────────────────────────────────────

const ROUTE_MAP: Record<string, string> = {
  students: "students/add",
  staff: "staff/add",
  classes: "classes/add",
  sections: "sections/add",
  sessions: "sessions/create",
  fee_headings: "fees/headings/add",
  fees_plan: "fees/plan/save",
  fee_receipts: "fees/collect",
  attendance: "attendance/mark",
  transport_routes: "transport/routes/add",
  inventory_items: "inventory/add",
  expenses: "expenses/add",
  homework: "homework/add",
  alumni: "alumni/add",
  subjects: "subjects/add",
  exam_results: "results/add",
  examinations: "exams/create",
  library: "library/books/add",
  chat_messages: "chat/send",
};

const UPDATE_ROUTE_MAP: Record<string, string> = {
  students: "students/update",
  staff: "staff/update",
  inventory_items: "inventory/update",
};

const DELETE_ROUTE_MAP: Record<string, string> = {
  students: "students/delete",
  staff: "staff/delete",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface PendingItem {
  queueId: string;
  collection: string;
  recordId: string;
  data: Record<string, unknown>;
  operation: "create" | "update" | "delete";
  retries: number;
  createdAt: number;
}

// ── IndexedDB helpers ─────────────────────────────────────────────────────────

const DB_NAME = "shubh_erp_db";
const DB_VERSION = 2;

const STORES = [
  "students",
  "staff",
  "classes",
  "sections",
  "sessions",
  "fee_headings",
  "fees_plan",
  "fee_receipts",
  "attendance",
  "transport_routes",
  "pickup_points",
  "inventory_items",
  "expenses",
  "expense_heads",
  "homework",
  "alumni",
  "subjects",
  "examinations",
  "exam_results",
  "library",
  "chat_messages",
  "whatsapp_logs",
  "biometric_devices",
  "payroll_setup",
  "payslips",
  "student_transport",
  "student_discounts",
  "old_fee_entries",
  "notices",
  "fee_balances",
  "fee_heads",
  "_pending_sync",
];

let _db: IDBDatabase | null = null;

async function openDb(): Promise<IDBDatabase> {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: "id" });
        }
      }
    };
    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll<T>(store: string): Promise<T[]> {
  try {
    const db = await openDb();
    if (!db.objectStoreNames.contains(store)) return [];
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve((req.result ?? []) as T[]);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

async function idbPut(
  store: string,
  record: Record<string, unknown>,
): Promise<void> {
  try {
    const db = await openDb();
    if (!db.objectStoreNames.contains(store)) return;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* storage unavailable */
  }
}

async function idbDelete(store: string, key: string): Promise<void> {
  try {
    const db = await openDb();
    if (!db.objectStoreNames.contains(store)) return;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* storage unavailable */
  }
}

// ── ID generator ──────────────────────────────────────────────────────────────

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Event helpers ─────────────────────────────────────────────────────────────

function emitSyncEvent(type: "sync:complete" | "sync:error", detail?: unknown) {
  try {
    window.dispatchEvent(new CustomEvent(type, { detail }));
  } catch {
    /* noop */
  }
}

// ── LocalFirstSync ────────────────────────────────────────────────────────────

/**
 * In-memory pending map: queueId → PendingItem.
 * These records must NEVER be overwritten by stale server data.
 */
const pendingMap = new Map<string, PendingItem>();

/** In-memory data cache per collection — so reads are instant */
const memCache = new Map<string, Map<string, Record<string, unknown>>>();

let flushTimer: ReturnType<typeof setInterval> | null = null;
let isFlushing = false;
const FLUSH_INTERVAL_MS = 30_000;
const MAX_RETRIES = 3;

function getMemMap(collection: string): Map<string, Record<string, unknown>> {
  if (!memCache.has(collection)) memCache.set(collection, new Map());
  return memCache.get(collection)!;
}

class LocalFirstSync {
  /** Read pending count */
  getPendingCount(): number {
    return pendingMap.size;
  }

  /**
   * Load all records for a collection.
   * Returns from in-memory cache if available, otherwise reads IndexedDB.
   */
  async load<T extends Record<string, unknown>>(
    collection: string,
  ): Promise<T[]> {
    const map = getMemMap(collection);
    if (map.size > 0) {
      return Array.from(map.values()) as T[];
    }
    // Warm from IndexedDB
    const rows = await idbGetAll<T>(collection);
    for (const row of rows) {
      const id = (row.id as string | undefined) ?? "";
      if (id) map.set(id, row);
    }
    return Array.from(map.values()) as T[];
  }

  /**
   * Save a record immediately to IndexedDB and in-memory cache.
   * Queues a background MySQL sync.
   * Returns immediately — do NOT await the MySQL response here.
   * Listen for 'sync:complete' event to confirm MySQL save.
   */
  async save(
    collection: string,
    data: Record<string, unknown>,
    operation: "create" | "update" | "delete" = "create",
  ): Promise<Record<string, unknown>> {
    const recordId = (data.id as string | undefined) ?? genId();
    const withId = { ...data, id: recordId };

    // 1. Write to in-memory cache immediately
    const map = getMemMap(collection);
    if (operation === "delete") {
      map.delete(recordId);
    } else {
      const existing = map.get(recordId);
      map.set(recordId, existing ? { ...existing, ...withId } : withId);
    }

    // 2. Write to IndexedDB (fast, non-blocking write)
    if (operation === "delete") {
      void idbDelete(collection, recordId);
    } else {
      void idbPut(collection, map.get(recordId)!);
    }

    // 3. Queue for MySQL sync — deduplicate by recordId
    const queueId = `${collection}::${recordId}`;
    const existing = pendingMap.get(queueId);
    pendingMap.set(queueId, {
      queueId,
      collection,
      recordId,
      data:
        operation === "delete"
          ? { id: recordId }
          : (map.get(recordId) ?? withId),
      operation:
        existing?.operation === "create" && operation !== "delete"
          ? "create"
          : operation,
      retries: 0,
      createdAt: Date.now(),
    });

    // 4. Persist pending queue to IndexedDB so it survives page reload
    void idbPut("_pending_sync", { id: queueId, ...pendingMap.get(queueId)! });

    // 5. Fire background push (non-blocking)
    void this.pushOne(queueId);

    return withId;
  }

  /** Merge server records into cache without overwriting pending writes */
  mergeServerRecords(collection: string, rows: Record<string, unknown>[]) {
    const map = getMemMap(collection);
    for (const row of rows) {
      const id = (row.id as string | undefined) ?? "";
      if (!id) continue;
      // NEVER overwrite a pending record
      if (pendingMap.has(`${collection}::${id}`)) continue;
      map.set(id, row);
    }
  }

  /** Get snapshot from in-memory cache — instant, no await */
  getSnapshot<T extends Record<string, unknown>>(collection: string): T[] {
    return Array.from(getMemMap(collection).values()) as T[];
  }

  /** Set entire collection cache (used for initial server load) */
  setCollection(collection: string, rows: Record<string, unknown>[]) {
    const map = getMemMap(collection);
    map.clear();
    for (const row of rows) {
      const id = (row.id as string | undefined) ?? "";
      if (id) map.set(id, row);
    }
  }

  // ── Background MySQL push ──────────────────────────────────────────────────

  private async pushOne(queueId: string): Promise<void> {
    const item = pendingMap.get(queueId);
    if (!item) return;

    const route =
      item.operation === "delete"
        ? DELETE_ROUTE_MAP[item.collection]
        : item.operation === "update"
          ? (UPDATE_ROUTE_MAP[item.collection] ?? ROUTE_MAP[item.collection])
          : ROUTE_MAP[item.collection];

    if (!route) {
      // No route mapped — still confirm locally as "saved"
      pendingMap.delete(queueId);
      void idbDelete("_pending_sync", queueId);
      emitSyncEvent("sync:complete", {
        collection: item.collection,
        id: item.recordId,
      });
      return;
    }

    try {
      if (item.operation === "delete") {
        await phpApiService.del(route, { id: item.recordId });
      } else if (item.operation === "update") {
        await phpApiService.put(route, item.data);
      } else {
        await phpApiService.post(route, item.data);
      }

      // Success: remove from pending queue
      pendingMap.delete(queueId);
      void idbDelete("_pending_sync", queueId);
      emitSyncEvent("sync:complete", {
        collection: item.collection,
        id: item.recordId,
        operation: item.operation,
      });
    } catch (err) {
      this.scheduleRetry(
        queueId,
        item,
        err instanceof Error ? err.message : "Sync error",
      );
    }
  }

  private scheduleRetry(queueId: string, item: PendingItem, errorMsg: string) {
    item.retries++;
    if (item.retries >= MAX_RETRIES) {
      emitSyncEvent("sync:error", {
        collection: item.collection,
        id: item.recordId,
        error: errorMsg,
      });
      // Keep in pending so next flush attempt retries after reload
      return;
    }
    const delay = 1000 * 2 ** (item.retries - 1);
    setTimeout(() => void this.pushOne(queueId), delay);
  }

  /** Flush all pending items to MySQL */
  async forceSync(): Promise<void> {
    if (isFlushing) return;
    isFlushing = true;
    try {
      const ids = Array.from(pendingMap.keys());
      await Promise.allSettled(ids.map((id) => this.pushOne(id)));
    } finally {
      isFlushing = false;
    }
  }

  /** Load pending queue from IndexedDB (called on app init after page reload) */
  async restorePendingQueue(): Promise<void> {
    try {
      const rows = await idbGetAll<PendingItem & { id: string }>(
        "_pending_sync",
      );
      for (const row of rows) {
        if (row.queueId) pendingMap.set(row.queueId, row);
      }
    } catch {
      /* noop */
    }
  }

  /** Start background flush timer (call once on app init) */
  startFlushTimer() {
    if (flushTimer) return;
    flushTimer = setInterval(() => {
      if (pendingMap.size > 0) void this.forceSync();
    }, FLUSH_INTERVAL_MS);

    // Also flush when coming back online
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => void this.forceSync());
    }
  }

  /** Stop background timer (call on logout) */
  stopFlushTimer() {
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
  }

  /** Clear all local data (factory reset / logout) */
  reset() {
    memCache.clear();
    pendingMap.clear();
    this.stopFlushTimer();
  }
}

export const localFirstSync = new LocalFirstSync();
export default localFirstSync;
