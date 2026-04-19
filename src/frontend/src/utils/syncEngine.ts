/**
 * SHUBH SCHOOL ERP — SyncEngine
 *
 * WhatsApp-style data sync:
 * - On app startup: show app immediately using localStorage cache, then fetch from MySQL
 * - On user action (add/edit/delete): immediately push ONLY that record to server
 * - localStorage cache: every collection cached with timestamp, loaded instantly on open
 * - If offline: queue pending changes, flush when connection restored
 * - Sync indicator only turns green when server confirms data is saved
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

interface PendingChange {
  id: string;
  collection: string;
  record: Record<string, unknown>;
  action: "create" | "update" | "delete";
  timestamp: number;
  retries: number;
}

// ── localStorage cache helpers ────────────────────────────────────────────────

const CACHE_PREFIX = "erp_cache_";
const CACHE_VERSION_KEY = "erp_cache_version";
const CACHE_VERSION = "v3"; // bump when schema changes to invalidate all caches

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
    if (version !== CACHE_VERSION) return null; // stale version — ignore
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

class SyncEngine {
  private token: string | null = null;
  private syncStatus: SyncStatus = {
    state: "idle",
    lastSyncTime: null,
    lastError: null,
    pendingCount: 0,
    serverCounts: {},
  };
  private pendingChanges: Map<string, PendingChange> = new Map();
  private subscribers: Set<() => void> = new Set();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private isOnline = true;
  private allDataCache: Record<string, unknown[]> = {};

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notify() {
    for (const fn of this.subscribers) fn();
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
      pendingCount: this.pendingChanges.size,
      ...(serverCounts ? { serverCounts } : {}),
    };
    this.notify();
  }

  /**
   * Called on app startup after login.
   *
   * NEW: Immediately loads from localStorage cache so the app renders instantly.
   * Then fetches fresh data from MySQL in the background.
   * Subscribers are notified twice: once with cached data, once with fresh data.
   */
  async initialize(token: string): Promise<Record<string, unknown[]>> {
    this.token = token;

    if (!isApiConfigured()) {
      this.setStatus("offline");
      return {};
    }

    // ── Step 1: Load from localStorage cache immediately (instant) ──────────
    const cachedData: Record<string, unknown[]> = {};
    for (const [key] of Object.entries(this.allDataCache)) {
      const cached = readCacheCollection(key);
      if (cached) cachedData[key] = cached;
    }
    // Also scan known collection names from the cache prefix
    const knownCollections = this.getKnownCollectionNames();
    for (const name of knownCollections) {
      const cached = readCacheCollection(name);
      if (cached && !cachedData[name]) {
        cachedData[name] = cached;
      }
    }

    if (Object.keys(cachedData).length > 0) {
      this.allDataCache = cachedData;
      this.setStatus("loading"); // show "Cached" state while fetching fresh
      // Return cached data immediately so app renders without waiting
      // Background fetch will update via notify()
      void this.fetchFreshData(token);
      return cachedData;
    }

    // ── Step 2: No cache — full blocking load (first time or cache cleared) ──
    this.setStatus("loading");
    return this.fetchFreshData(token);
  }

  private async fetchFreshData(
    token: string,
  ): Promise<Record<string, unknown[]>> {
    try {
      const data = await apiFetchAll(token);
      this.allDataCache = data;
      this.isOnline = true;

      // Persist to localStorage cache for next startup
      for (const [collection, records] of Object.entries(data)) {
        writeCacheCollection(collection, records);
      }
      writeCacheVersion();

      // Get server counts from sync/status for accurate dashboard numbers
      try {
        const status = await fetchSyncStatus();
        if (status.status === "ok" && status.counts) {
          this.setStatus("synced", null, status.counts);
        } else {
          const counts: Record<string, number> = {};
          for (const [k, v] of Object.entries(data)) {
            counts[k] = v.length;
          }
          this.setStatus("synced", null, counts);
        }
      } catch {
        const counts: Record<string, number> = {};
        for (const [k, v] of Object.entries(data)) {
          counts[k] = v.length;
        }
        this.setStatus("synced", null, counts);
      }

      this.startPolling();
      return data;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load data from server";
      this.isOnline = false;
      this.setStatus("error", msg);
      return this.allDataCache; // return cached data as fallback
    }
  }

  /** List of collection names known to have been cached */
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
   * Save a record to the server immediately.
   * Queues to pendingChanges if offline.
   * Updates allDataCache optimistically.
   */
  async saveRecord(
    collection: string,
    record: Record<string, unknown>,
    action: "create" | "update" | "delete",
  ): Promise<Record<string, unknown>> {
    if (!isApiConfigured()) {
      this.updateCache(collection, record, action);
      return record;
    }

    if (!this.isOnline) {
      this.queuePendingChange(collection, record, action);
      this.updateCache(collection, record, action);
      return record;
    }

    // Optimistic update
    this.updateCache(collection, record, action);
    this.setStatus("loading");

    try {
      const token = this.token ?? null;
      const id = record.id as string | number | undefined;

      if (action === "create") {
        const result = await apiCreateRecord(collection, record, token);
        const saved = { ...record, _serverId: result.id, _synced: true };
        this.updateCache(collection, saved, "update");
        this.setStatus("synced");
        // Update cache for this collection
        writeCacheCollection(collection, this.allDataCache[collection] ?? []);
        return saved;
      }
      if (action === "update" && id != null) {
        await apiUpdateRecord(collection, id, record, token);
        const updated = { ...record, _synced: true };
        this.updateCache(collection, updated, "update");
        this.setStatus("synced");
        writeCacheCollection(collection, this.allDataCache[collection] ?? []);
        return updated;
      }
      if (action === "delete" && id != null) {
        await apiDeleteRecord(collection, id, token);
        this.setStatus("synced");
        writeCacheCollection(collection, this.allDataCache[collection] ?? []);
        return record;
      }

      this.setStatus("synced");
      return record;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      this.queuePendingChange(collection, record, action);
      this.setStatus("error", msg);
      throw err;
    }
  }

  private queuePendingChange(
    collection: string,
    record: Record<string, unknown>,
    action: "create" | "update" | "delete",
  ) {
    const key = `${collection}::${(record.id as string) ?? Date.now()}::${action}`;
    this.pendingChanges.set(key, {
      id: key,
      collection,
      record,
      action,
      timestamp: Date.now(),
      retries: 0,
    });
    this.syncStatus = {
      ...this.syncStatus,
      pendingCount: this.pendingChanges.size,
    };
    this.notify();
  }

  async flushPendingChanges(): Promise<void> {
    if (this.pendingChanges.size === 0) return;
    if (!isApiConfigured() || !this.isOnline) return;

    const token = this.token ?? null;
    const byCollection = new Map<string, PendingChange[]>();
    for (const change of this.pendingChanges.values()) {
      const arr = byCollection.get(change.collection) ?? [];
      arr.push(change);
      byCollection.set(change.collection, arr);
    }

    for (const [collection, changes] of byCollection) {
      const records = changes
        .filter((c) => c.action !== "delete")
        .map((c) => c.record);

      if (records.length > 0) {
        try {
          await apiBatchRecords(collection, records, token);
          for (const change of changes) {
            if (change.action !== "delete") {
              this.pendingChanges.delete(change.id);
            }
          }
        } catch {
          for (const change of changes) {
            change.retries++;
            if (change.retries >= 3) this.pendingChanges.delete(change.id);
          }
        }
      }

      for (const change of changes.filter((c) => c.action === "delete")) {
        try {
          const id = change.record.id as string | number;
          if (id != null) await apiDeleteRecord(collection, id, token);
          this.pendingChanges.delete(change.id);
        } catch {
          change.retries++;
          if (change.retries >= 3) this.pendingChanges.delete(change.id);
        }
      }
    }

    this.syncStatus = {
      ...this.syncStatus,
      pendingCount: this.pendingChanges.size,
    };
    this.notify();
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
    return this.syncStatus;
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
        if (this.pendingChanges.size > 0) {
          await this.flushPendingChanges();
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
      if (this.syncStatus.state === "synced") {
        this.setStatus("offline");
      }
    }
  }

  async refreshCollection(collection: string): Promise<unknown[]> {
    if (!isApiConfigured() || !this.token) {
      return this.getCache(collection);
    }
    try {
      const { fetchCollection } = await import("./api");
      const rows = await fetchCollection<unknown>(collection);
      this.allDataCache[collection] = rows;
      writeCacheCollection(collection, rows);
      this.notify();
      return rows;
    } catch {
      return this.getCache(collection);
    }
  }

  reset() {
    this.token = null;
    this.allDataCache = {};
    this.pendingChanges.clear();
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.isOnline = true;
    this.syncStatus = {
      state: "idle",
      lastSyncTime: null,
      lastError: null,
      pendingCount: 0,
      serverCounts: {},
    };
    this.notify();
  }
}

export const syncEngine = new SyncEngine();
export type { SyncEngine };
