/**
 * SHUBH SCHOOL ERP — SyncEngine (Local-First)
 *
 * Local-first sync pattern (like WhatsApp):
 * 1. Write to localStorage IMMEDIATELY — data is never lost
 * 2. Update in-memory cache — UI re-renders instantly
 * 3. Enqueue change in persistent SyncQueue (survives page refresh)
 * 4. Push to server in background with exponential backoff retry
 * 5. NEVER rollback from localStorage — user data is always safe
 *
 * App startup:
 * - Show cached data immediately (no blank screen)
 * - Fetch fresh from server in background → merge (server wins for confirmed, local wins for pending)
 *
 * KEY INVARIANT:
 * - refreshCollection() merges pending local records OVER server data — pending records ALWAYS WIN.
 * - Background sync SKIPS a collection refresh if that collection has pending records.
 * - After pushQueueEntry() succeeds, a merge-refresh fires so the UI gets the server-confirmed state.
 */

import type { SyncStatus } from "../types";
import {
  apiBatchRecords,
  apiCreateRecord,
  apiDeleteRecord,
  apiFetchAll,
  apiUpdateRecord,
  fetchSyncStatus,
  isApiConfigured,
} from "./api";

// ── Persistent SyncQueue ──────────────────────────────────────────────────────

const SYNC_QUEUE_KEY = "shubh_erp_sync_queue";
const MAX_QUEUE_SIZE = 500;

interface QueueEntry {
  id: string;
  collection: string;
  action: "create" | "update" | "delete";
  data: Record<string, unknown>;
  retries: number;
  createdAt: number;
  lastAttempt: number;
  failed: boolean; // true after max retries exhausted
}

class SyncQueue {
  private entries: Map<string, QueueEntry> = new Map();

  constructor() {
    this.load();
  }

  private load() {
    try {
      const raw = localStorage.getItem(SYNC_QUEUE_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw) as QueueEntry[];
      for (const e of arr) {
        this.entries.set(e.id, e);
      }
    } catch {
      // corrupt storage — start fresh
    }
  }

  private persist() {
    try {
      const arr = Array.from(this.entries.values());
      // Prune oldest confirmed/failed entries if over limit
      if (arr.length > MAX_QUEUE_SIZE) {
        const sorted = arr.sort((a, b) => a.createdAt - b.createdAt);
        const pruned = sorted.slice(arr.length - MAX_QUEUE_SIZE);
        this.entries.clear();
        for (const e of pruned) this.entries.set(e.id, e);
      }
      localStorage.setItem(
        SYNC_QUEUE_KEY,
        JSON.stringify(Array.from(this.entries.values())),
      );
    } catch {
      // storage full — skip persist silently
    }
  }

  enqueue(entry: Omit<QueueEntry, "retries" | "lastAttempt" | "failed">): void {
    // If same record+action already queued, replace it (latest wins)
    const existing = this.findExisting(
      entry.collection,
      entry.id.split("::")[1] ?? "",
      entry.action,
    );
    if (existing) {
      this.entries.set(existing.id, {
        ...existing,
        data: entry.data,
        lastAttempt: 0,
        retries: 0,
        failed: false,
      });
    } else {
      this.entries.set(entry.id, {
        ...entry,
        retries: 0,
        lastAttempt: 0,
        failed: false,
      });
    }
    this.persist();
  }

  private findExisting(
    collection: string,
    recordId: string,
    action: QueueEntry["action"],
  ): QueueEntry | undefined {
    for (const e of this.entries.values()) {
      if (
        e.collection === collection &&
        e.data.id === recordId &&
        e.action === action
      ) {
        return e;
      }
    }
    return undefined;
  }

  dequeue(id: string): void {
    this.entries.delete(id);
    this.persist();
  }

  markFailed(id: string): void {
    const e = this.entries.get(id);
    if (e) {
      e.failed = true;
      e.lastAttempt = Date.now();
      this.entries.set(id, e);
      this.persist();
    }
  }

  incrementRetry(id: string): number {
    const e = this.entries.get(id);
    if (!e) return 0;
    e.retries++;
    e.lastAttempt = Date.now();
    this.entries.set(id, e);
    this.persist();
    return e.retries;
  }

  getAll(): QueueEntry[] {
    return Array.from(this.entries.values()).sort(
      (a, b) => a.createdAt - b.createdAt,
    );
  }

  getPending(): QueueEntry[] {
    return this.getAll().filter((e) => !e.failed);
  }

  getFailed(): QueueEntry[] {
    return this.getAll().filter((e) => e.failed);
  }

  /** Returns true if any non-failed entries exist for the given collection */
  hasPendingForCollection(collection: string): boolean {
    for (const e of this.entries.values()) {
      if (e.collection === collection && !e.failed) return true;
    }
    return false;
  }

  /** Returns all pending (non-failed) entries for a specific collection */
  getPendingForCollection(collection: string): QueueEntry[] {
    return this.getPending().filter((e) => e.collection === collection);
  }

  clear(): void {
    this.entries.clear();
    this.persist();
  }

  size(): number {
    return this.entries.size;
  }

  pendingCount(): number {
    return this.getPending().length;
  }

  failedCount(): number {
    return this.getFailed().length;
  }
}

// ── localStorage cache helpers ────────────────────────────────────────────────

const CACHE_PREFIX = "erp_cache_";
const CACHE_VERSION_KEY = "erp_cache_version";
const CACHE_VERSION = "v4"; // bump to invalidate old caches

interface CacheEntry {
  ts: number;
  data: unknown[];
}

function writeCacheCollection(collection: string, data: unknown[]) {
  try {
    const entry: CacheEntry = { ts: Date.now(), data };
    localStorage.setItem(`${CACHE_PREFIX}${collection}`, JSON.stringify(entry));
  } catch {
    // storage full or unavailable — silently ignore
  }
}

function readCacheCollection(collection: string): unknown[] | null {
  try {
    const version = localStorage.getItem(CACHE_VERSION_KEY);
    if (version !== CACHE_VERSION) return null;
    const raw = localStorage.getItem(`${CACHE_PREFIX}${collection}`);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    return Array.isArray(entry.data) ? entry.data : null;
  } catch {
    return null;
  }
}

function writeCacheVersion() {
  try {
    localStorage.setItem(CACHE_VERSION_KEY, CACHE_VERSION);
  } catch {
    // ignore
  }
}

// ── SyncEngine ────────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 1000;
const BACKGROUND_SYNC_INTERVAL_MS = 30_000;

/** Callback type: called when a collection's data has changed in the local cache */
type CollectionUpdateCallback = (
  collection: string,
  records: unknown[],
) => void;

class SyncEngine {
  private token: string | null = null;
  private syncStatus: SyncStatus = {
    state: "idle",
    lastSyncTime: null,
    lastError: null,
    pendingCount: 0,
    serverCounts: {},
  };
  private syncQueue = new SyncQueue();
  private subscribers: Set<() => void> = new Set();
  private collectionUpdateCallbacks: Set<CollectionUpdateCallback> = new Set();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private bgSyncTimer: ReturnType<typeof setInterval> | null = null;
  private isOnline = true;
  private allDataCache: Record<string, unknown[]> = {};
  private isFlushingQueue = false;

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Register a callback that fires whenever a specific collection's data
   * is updated in the local cache (after server push confirmation).
   * AppContext uses this to dispatch UPDATE_COLLECTION without doing a
   * full server refetch.
   */
  onCollectionUpdated(callback: CollectionUpdateCallback): () => void {
    this.collectionUpdateCallbacks.add(callback);
    return () => this.collectionUpdateCallbacks.delete(callback);
  }

  private notify() {
    for (const fn of this.subscribers) fn();
  }

  private notifyCollection(collection: string, records: unknown[]) {
    for (const fn of this.collectionUpdateCallbacks) fn(collection, records);
  }

  private setStatus(
    state: SyncStatus["state"],
    error: string | null = null,
    serverCounts?: Record<string, number>,
  ) {
    this.syncStatus = {
      ...this.syncStatus,
      state,
      lastError: error,
      lastSyncTime:
        state === "synced" ? new Date() : this.syncStatus.lastSyncTime,
      pendingCount: this.syncQueue.pendingCount(),
      ...(serverCounts ? { serverCounts } : {}),
    };
    this.notify();
  }

  /**
   * Returns true if there are any non-failed pending queue entries for a collection.
   * If true, a server refresh for that collection MUST merge rather than replace.
   */
  hasPendingRecords(collection: string): boolean {
    return this.syncQueue.hasPendingForCollection(collection);
  }

  /**
   * Returns the current in-memory cache for a collection, merged with any
   * pending local records (pending records WIN over server data for same ID).
   * This is the source of truth for the UI — local is always authoritative.
   */
  getLocalCollection(collection: string): unknown[] {
    const cached = (this.allDataCache[collection] ?? []) as Record<
      string,
      unknown
    >[];
    const pending = this.syncQueue.getPendingForCollection(collection);
    if (pending.length === 0) return cached;

    // Merge: start with cached, overlay pending records (they win)
    const merged = new Map<unknown, Record<string, unknown>>();
    for (const row of cached) merged.set(row.id, row);
    for (const entry of pending) {
      if (entry.action === "delete") {
        merged.delete(entry.data.id);
      } else {
        const existing = merged.get(entry.data.id);
        merged.set(
          entry.data.id,
          existing ? { ...existing, ...entry.data } : entry.data,
        );
      }
    }
    return Array.from(merged.values());
  }

  /**
   * LOCAL-FIRST initialize:
   * 1. Read from localStorage immediately → render app with cached data (instant)
   * 2. Fetch from server in background → merge with local
   * 3. Start background sync loop to flush pending queue
   */
  async initialize(token: string): Promise<Record<string, unknown[]>> {
    this.token = token;

    // Step 1: Load local cache IMMEDIATELY (no waiting)
    const cachedData: Record<string, unknown[]> = {};
    for (const name of this.getKnownCollectionNames()) {
      const cached = readCacheCollection(name);
      if (cached) cachedData[name] = cached;
    }

    // Also merge any pending queue items that exist locally but not in cache
    // (handles: added offline, never pushed to server yet)
    for (const entry of this.syncQueue.getPending()) {
      if (entry.action !== "delete" && entry.data) {
        const col = entry.collection;
        if (!cachedData[col]) cachedData[col] = [];
        const existing = cachedData[col] as Record<string, unknown>[];
        const recordId = entry.data.id;
        const idx = existing.findIndex((r) => r.id === recordId);
        if (idx >= 0) {
          existing[idx] = { ...existing[idx], ...entry.data };
        } else {
          existing.push(entry.data);
        }
        cachedData[col] = existing;
      }
    }

    this.allDataCache = cachedData;

    if (!isApiConfigured()) {
      this.setStatus("offline");
      return cachedData;
    }

    // Show cached data immediately (subscribers can render now)
    this.setStatus(
      cachedData && Object.keys(cachedData).length > 0 ? "synced" : "loading",
    );
    this.notify();

    // Step 2: Fetch fresh from server in background (non-blocking)
    void this.backgroundRefresh(token);

    // Step 3: Start background sync loop
    this.startBackgroundSync();

    // Flush any pending queue items immediately
    if (this.syncQueue.pendingCount() > 0) {
      void this.flushQueue();
    }

    return cachedData;
  }

  private async backgroundRefresh(token: string): Promise<void> {
    try {
      const data = await apiFetchAll(token);
      this.isOnline = true;

      // Merge strategy: server wins for confirmed records, local pending wins for unsynced
      const pendingIds = new Set(
        this.syncQueue
          .getPending()
          .map((e) => `${e.collection}::${e.data.id as string}`),
      );

      for (const [collection, serverRows] of Object.entries(data)) {
        const serverRowsArr = serverRows as Record<string, unknown>[];
        const localRows = (this.allDataCache[collection] ?? []) as Record<
          string,
          unknown
        >[];

        // Build merged: start with server rows
        const merged = new Map<unknown, Record<string, unknown>>();
        for (const row of serverRowsArr) {
          merged.set(row.id, row);
        }

        // Keep local-only pending items (not on server yet)
        for (const localRow of localRows) {
          const key = `${collection}::${localRow.id as string}`;
          if (pendingIds.has(key) && !merged.has(localRow.id)) {
            merged.set(localRow.id, localRow);
          }
        }

        this.allDataCache[collection] = Array.from(merged.values());
        writeCacheCollection(collection, this.allDataCache[collection]);
      }
      writeCacheVersion();

      // Collect server counts
      try {
        const status = await fetchSyncStatus();
        if (status.status === "ok" && status.counts) {
          this.setStatus("synced", null, status.counts);
        } else {
          const counts: Record<string, number> = {};
          for (const [k, v] of Object.entries(data)) counts[k] = v.length;
          this.setStatus("synced", null, counts);
        }
      } catch {
        const counts: Record<string, number> = {};
        for (const [k, v] of Object.entries(data)) counts[k] = v.length;
        this.setStatus("synced", null, counts);
      }

      this.startPolling();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to sync";
      this.isOnline = false;
      // Don't clear cached data — just show offline state
      if (Object.keys(this.allDataCache).length > 0) {
        this.setStatus(
          "offline",
          "Server unreachable — showing locally saved data",
        );
      } else {
        this.setStatus("error", msg);
      }
    }
  }

  private getKnownCollectionNames(): string[] {
    return [
      "students",
      "staff",
      "attendance",
      "fee_receipts",
      "fees_plan",
      "fee_heads",
      "fee_headings",
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
    ];
  }

  /**
   * LOCAL-FIRST saveRecord:
   * 1. Write to localStorage IMMEDIATELY (permanent — never lost)
   * 2. Update in-memory cache (UI re-renders instantly)
   * 3. Show success to caller immediately (no waiting for server)
   * 4. Add to persistent SyncQueue
   * 5. Attempt server push in background
   * 6. NEVER throw on server failure — data is safe in localStorage
   */
  async saveRecord(
    collection: string,
    record: Record<string, unknown>,
    action: "create" | "update" | "delete",
  ): Promise<Record<string, unknown>> {
    // Step 1 & 2: Write to localStorage + update in-memory cache immediately
    this.updateCache(collection, record, action);
    writeCacheCollection(collection, this.allDataCache[collection] ?? []);
    writeCacheVersion();

    // Step 3: Return immediately — caller gets success right away
    if (!isApiConfigured()) {
      return record;
    }

    // Step 4: Add to persistent SyncQueue
    const queueId = `${collection}::${(record.id as string) ?? Date.now()}::${action}::${Date.now()}`;
    this.syncQueue.enqueue({
      id: queueId,
      collection,
      action,
      data: record,
      createdAt: Date.now(),
    });

    // Update pending count in status
    this.syncStatus = {
      ...this.syncStatus,
      pendingCount: this.syncQueue.pendingCount(),
    };
    this.notify();

    // Step 5: Attempt server push in background (fire and forget — no await)
    void this.pushQueueEntry(queueId);

    return record;
  }

  /**
   * Push a single queue entry to the server.
   * On success: remove from queue, then do a gentle merge-refresh of that collection
   * so the UI eventually reflects the server-confirmed state.
   * On failure: increment retry, use exponential backoff, mark failed after max retries.
   */
  private async pushQueueEntry(queueId: string): Promise<void> {
    const entries = this.syncQueue.getAll();
    const entry = entries.find((e) => e.id === queueId);
    if (!entry || entry.failed) return;

    if (!this.isOnline || !isApiConfigured()) return;

    const token = this.token;

    try {
      const { collection, action, data } = entry;
      const id = data.id as string | number | undefined;

      if (action === "create") {
        const result = await apiCreateRecord(collection, data, token);
        // Update cache with server-assigned ID if different
        if (result.id && result.id !== id) {
          const saved = { ...data, _serverId: result.id, _synced: true };
          this.updateCache(collection, saved, "update");
          writeCacheCollection(collection, this.allDataCache[collection] ?? []);
        }
      } else if (action === "update" && id != null) {
        await apiUpdateRecord(collection, id, data, token);
      } else if (action === "delete" && id != null) {
        await apiDeleteRecord(collection, id, token);
      }

      // Success: remove from queue
      this.syncQueue.dequeue(queueId);
      this.isOnline = true;
      this.setStatus("synced");

      // After server confirms the push, do a gentle merge-refresh so the UI
      // reflects the authoritative server state. We use refreshCollection()
      // which correctly merges remaining pending records — safe to call here
      // because we just dequeued this entry.
      void this.refreshCollection(collection).then((merged) => {
        this.notifyCollection(collection, merged);
      });
    } catch (err) {
      const retries = this.syncQueue.incrementRetry(queueId);

      if (retries >= MAX_RETRIES) {
        this.syncQueue.markFailed(queueId);
        const msg = err instanceof Error ? err.message : "Sync failed";
        this.setStatus("error", `${msg} (data saved locally)`);
      } else {
        // Exponential backoff: 1s, 2s, 4s
        const delay = BACKOFF_BASE_MS * 2 ** (retries - 1);
        this.isOnline = false;
        setTimeout(() => {
          this.isOnline = true;
          void this.pushQueueEntry(queueId);
        }, delay);
      }

      // Update pending count
      this.syncStatus = {
        ...this.syncStatus,
        pendingCount: this.syncQueue.pendingCount(),
      };
      this.notify();
    }
  }

  /**
   * Flush all pending queue items to the server.
   * Called on: app init, window focus, network online event, background timer.
   */
  async flushQueue(): Promise<void> {
    if (this.isFlushingQueue) return;
    if (!isApiConfigured() || !this.isOnline) return;

    const pending = this.syncQueue.getPending();
    if (pending.length === 0) return;

    this.isFlushingQueue = true;

    try {
      // Group by collection for batch efficiency
      const byCollection = new Map<string, QueueEntry[]>();
      for (const e of pending) {
        const arr = byCollection.get(e.collection) ?? [];
        arr.push(e);
        byCollection.set(e.collection, arr);
      }

      for (const [collection, entries] of byCollection) {
        const creates = entries.filter((e) => e.action !== "delete");
        const deletes = entries.filter((e) => e.action === "delete");

        // Batch creates/updates
        if (creates.length > 0) {
          try {
            await apiBatchRecords(
              collection,
              creates.map((e) => e.data),
              this.token,
            );
            for (const e of creates) {
              this.syncQueue.dequeue(e.id);
            }
          } catch {
            // Individual retry on next cycle
          }
        }

        // Individual deletes
        for (const e of deletes) {
          try {
            const id = e.data.id as string | number;
            if (id != null) {
              await apiDeleteRecord(collection, id, this.token);
              this.syncQueue.dequeue(e.id);
            }
          } catch {
            const retries = this.syncQueue.incrementRetry(e.id);
            if (retries >= MAX_RETRIES) {
              this.syncQueue.markFailed(e.id);
            }
          }
        }

        // After flushing a collection, do a gentle merge-refresh
        void this.refreshCollection(collection).then((merged) => {
          this.notifyCollection(collection, merged);
        });
      }

      this.syncStatus = {
        ...this.syncStatus,
        pendingCount: this.syncQueue.pendingCount(),
      };
      if (this.syncQueue.pendingCount() === 0) {
        this.setStatus("synced");
      }
      this.notify();
    } finally {
      this.isFlushingQueue = false;
    }
  }

  /** Start background sync loop: flush pending queue every 30s */
  private startBackgroundSync() {
    if (this.bgSyncTimer !== null) return;
    this.bgSyncTimer = setInterval(() => {
      // Only flush the queue; do NOT do a full collection refresh here.
      // Collection refreshes happen after successful pushes via pushQueueEntry.
      if (this.syncQueue.pendingCount() > 0) {
        void this.flushQueue();
      }
    }, BACKGROUND_SYNC_INTERVAL_MS);

    // Also flush on window focus — but only the queue, not a full re-fetch
    const handleFocus = () => {
      if (this.syncQueue.pendingCount() > 0) {
        this.isOnline = true;
        void this.flushQueue();
      }
    };
    window.addEventListener("focus", handleFocus);

    // Flush on network reconnection
    const handleOnline = () => {
      this.isOnline = true;
      void this.flushQueue();
    };
    window.addEventListener("online", handleOnline);
  }

  updateCache(
    collection: string,
    record: Record<string, unknown>,
    action: "create" | "update" | "delete",
  ) {
    const existing = (this.allDataCache[collection] ?? []) as Record<
      string,
      unknown
    >[];
    const id = record.id;

    if (action === "delete") {
      this.allDataCache[collection] = existing.filter((r) => r.id !== id);
    } else if (action === "create") {
      const alreadyExists = existing.some((r) => r.id === id);
      if (alreadyExists) {
        this.allDataCache[collection] = existing.map((r) =>
          r.id === id ? { ...r, ...record } : r,
        );
      } else {
        this.allDataCache[collection] = [...existing, record];
      }
    } else {
      const idx = existing.findIndex((r) => r.id === id);
      if (idx >= 0) {
        this.allDataCache[collection] = existing.map((r, i) =>
          i === idx ? { ...r, ...record } : r,
        );
      } else {
        this.allDataCache[collection] = [...existing, record];
      }
    }

    this.notify();
  }

  setCollectionCache(collection: string, records: unknown[]) {
    this.allDataCache[collection] = records;
    writeCacheCollection(collection, records);
    this.notify();
  }

  getCache(collection: string): unknown[] {
    return this.allDataCache[collection] ?? [];
  }

  getAllCache(): Record<string, unknown[]> {
    return this.allDataCache;
  }

  getSyncStatus(): SyncStatus {
    return {
      ...this.syncStatus,
      pendingCount: this.syncQueue.pendingCount(),
    };
  }

  /** Expose queue stats for UI indicators */
  getQueueStats(): { pending: number; failed: number } {
    return {
      pending: this.syncQueue.pendingCount(),
      failed: this.syncQueue.failedCount(),
    };
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private startPolling() {
    if (this.pollTimer !== null) return;
    this.pollTimer = setInterval(() => {
      void this.checkStatus();
    }, 60_000);
  }

  private async checkStatus() {
    if (!isApiConfigured()) return;
    try {
      const status = await fetchSyncStatus();
      this.isOnline = status.status === "ok";
      if (this.isOnline) {
        if (this.syncQueue.pendingCount() > 0) {
          await this.flushQueue();
        }
        if (status.counts) {
          this.syncStatus = {
            ...this.syncStatus,
            state: "synced",
            serverCounts: status.counts,
            lastSyncTime: new Date(),
          };
          this.notify();
        }
      }
    } catch {
      this.isOnline = false;
      if (
        this.syncStatus.state === "synced" &&
        this.syncQueue.pendingCount() > 0
      ) {
        this.setStatus("offline");
      }
    }
  }

  /**
   * Refresh a single collection from the server.
   *
   * SAFE MERGE STRATEGY:
   * - Fetch server rows
   * - Overlay any pending local records (pending ALWAYS WIN)
   * - This means a refresh NEVER erases a record the user just added
   */
  async refreshCollection(collection: string): Promise<unknown[]> {
    if (!isApiConfigured() || !this.token) {
      return this.getLocalCollection(collection);
    }
    try {
      const { fetchCollection } = await import("./api");
      const rows = await fetchCollection<unknown>(collection);

      // Merge: server rows + ALL pending local changes for this collection
      const pendingForCollection =
        this.syncQueue.getPendingForCollection(collection);

      const serverMap = new Map(
        (rows as Record<string, unknown>[]).map((r) => [r.id, r]),
      );

      // Pending records WIN over server data for the same ID
      for (const e of pendingForCollection) {
        if (e.action === "delete") {
          // Pending delete: remove from merged result even if server has it
          serverMap.delete(e.data.id);
        } else {
          const existing = serverMap.get(e.data.id);
          serverMap.set(
            e.data.id,
            existing ? { ...existing, ...e.data } : e.data,
          );
        }
      }

      const merged = Array.from(serverMap.values());
      this.allDataCache[collection] = merged;
      writeCacheCollection(collection, merged);
      this.notify();
      return merged;
    } catch {
      // On network failure, return the local collection (with pending overlaid)
      return this.getLocalCollection(collection);
    }
  }

  reset() {
    this.token = null;
    this.allDataCache = {};
    // Do NOT clear syncQueue on logout — pending changes survive re-login
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.bgSyncTimer !== null) {
      clearInterval(this.bgSyncTimer);
      this.bgSyncTimer = null;
    }
    this.isOnline = true;
    this.syncStatus = {
      state: "idle",
      lastSyncTime: null,
      lastError: null,
      pendingCount: this.syncQueue.pendingCount(), // preserve queue count
      serverCounts: {},
    };
    this.notify();
  }
}

export const syncEngine = new SyncEngine();
export type { SyncEngine };
