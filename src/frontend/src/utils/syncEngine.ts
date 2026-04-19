/**
 * SHUBH SCHOOL ERP — SyncEngine
 *
 * WhatsApp-style data sync:
 * - On app startup: fetch ALL collections from MySQL in one pass
 * - On user action (add/edit/delete): immediately push ONLY that record to server
 * - If offline: queue pending changes, flush when connection restored
 * - Sync indicator only turns green when server confirms data is saved
 *
 * All data lives in React state (loaded from server on login).
 * Never use localStorage as primary data store.
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

  /** Subscribe to sync status changes. Returns unsubscribe function. */
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
   * Fetches ALL collections from MySQL, stores in memory cache.
   * Never shows partial data — returns ONLY after full load.
   */
  async initialize(token: string): Promise<Record<string, unknown[]>> {
    this.token = token;

    if (!isApiConfigured()) {
      this.setStatus("offline");
      return {};
    }

    this.setStatus("loading");

    try {
      const data = await apiFetchAll(token);
      this.allDataCache = data;
      this.isOnline = true;

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

      // Start polling every 60 seconds for status check
      this.startPolling();

      return data;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load data from server";
      this.isOnline = false;
      this.setStatus("error", msg);
      return {};
    }
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
      // Update cache locally and notify (offline mode)
      this.updateCache(collection, record, action);
      return record;
    }

    if (!this.isOnline) {
      // Queue for later
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
        return saved;
      }
      if (action === "update" && id != null) {
        await apiUpdateRecord(collection, id, record, token);
        const updated = { ...record, _synced: true };
        this.updateCache(collection, updated, "update");
        this.setStatus("synced");
        return updated;
      }
      if (action === "delete" && id != null) {
        await apiDeleteRecord(collection, id, token);
        this.setStatus("synced");
        return record;
      }

      this.setStatus("synced");
      return record;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      // Don't revert optimistic update — queue for retry
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

  /** Flush offline queue when connection restored */
  async flushPendingChanges(): Promise<void> {
    if (this.pendingChanges.size === 0) return;
    if (!isApiConfigured() || !this.isOnline) return;

    const token = this.token ?? null;

    // Group by collection for batch efficiency
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
          // Remove from pending
          for (const change of changes) {
            if (change.action !== "delete") {
              this.pendingChanges.delete(change.id);
            }
          }
        } catch {
          // Increment retries, remove after 3 failures
          for (const change of changes) {
            change.retries++;
            if (change.retries >= 3) {
              this.pendingChanges.delete(change.id);
            }
          }
        }
      }

      // Handle deletes individually
      for (const change of changes.filter((c) => c.action === "delete")) {
        try {
          const id = change.record.id as string | number;
          if (id != null) {
            await apiDeleteRecord(collection, id, token);
          }
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

  /** Update in-memory cache for a record change */
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
      // update
      const idx = existing.findIndex((r) => r.id === id);
      if (idx >= 0) {
        this.allDataCache[collection] = existing.map((r, i) =>
          i === idx ? { ...r, ...record } : r,
        );
      } else {
        // Not found — add it
        this.allDataCache[collection] = [...existing, record];
      }
    }

    this.notify();
  }

  /** Replace an entire collection in the cache (e.g. after bulk import) */
  setCollectionCache(collection: string, records: unknown[]) {
    this.allDataCache[collection] = records;
    this.notify();
  }

  /** Get cached records for a collection */
  getCache(collection: string): unknown[] {
    return this.allDataCache[collection] ?? [];
  }

  /** Get all cached data */
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

  /** Refresh a single collection from the server */
  async refreshCollection(collection: string): Promise<unknown[]> {
    if (!isApiConfigured() || !this.token) {
      return this.getCache(collection);
    }
    try {
      const { fetchCollection } = await import("./api");
      const rows = await fetchCollection<unknown>(collection);
      this.allDataCache[collection] = rows;
      this.notify();
      return rows;
    } catch {
      return this.getCache(collection);
    }
  }

  /** Reset all state (used on logout) */
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

/** Singleton SyncEngine instance */
export const syncEngine = new SyncEngine();
export type { SyncEngine };
