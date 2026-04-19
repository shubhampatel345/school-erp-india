/**
 * SHUBH SCHOOL ERP — DataService
 *
 * Server-first data layer. All module pages MUST read/write through this
 * service instead of calling ls.get/ls.set directly.
 *
 * On app startup (after login): loads ALL collections from the PHP API.
 * On any write: calls the API first, then updates the in-memory cache.
 * If the API is not reachable: falls back to localStorage transparently.
 *
 * Usage:
 *   import { dataService } from '../utils/dataService';
 *   const students = dataService.get<Student[]>('students');
 *   await dataService.save('students', newStudent);   // creates via API
 *   await dataService.update('students', id, updated); // updates via API
 *   await dataService.delete('students', id);           // soft-deletes via API
 */

import {
  deleteCollectionItem,
  fetchCollection,
  isApiConfigured,
  saveCollectionItem,
  syncAllCollections,
  updateCollectionItem,
} from "./api";
import { generateId, ls } from "./localStorage";

// ── Known collections (mirrors PHP whitelist in data.php) ─────────────────────
export const COLLECTIONS = [
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
] as const;

export type CollectionName = (typeof COLLECTIONS)[number];

// ── Item shape we add to every record stored locally ──────────────────────────
interface WithServerId {
  _serverId?: number;
  _synced?: boolean;
}

type SyncMode = "idle" | "loading" | "ready" | "offline";

// ── DataService class ─────────────────────────────────────────────────────────

class DataService {
  private cache: Map<string, unknown[]> = new Map();
  private mode: SyncMode = "idle";
  private listeners: Set<() => void> = new Set();
  private initPromise: Promise<void> | null = null;
  private counts: Record<string, number> = {};
  /** Timestamp of the last successful full-server sync (ms) */
  private lastSyncMs = 0;
  /** Per-collection in-flight fetch promises (avoids duplicate parallel fetches) */
  private fetchPromises: Map<string, Promise<unknown[]>> = new Map();

  /** Subscribe to cache changes (re-render consumers) */
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    for (const fn of this.listeners) fn();
  }

  /** Current sync mode */
  getMode(): SyncMode {
    return this.mode;
  }

  /** Counts of each synced collection (for dashboard display) */
  getCounts(): Record<string, number> {
    return { ...this.counts };
  }

  /**
   * Initialize: load all collections from the server.
   * - In server-connected mode: ALWAYS fetches fresh data from MySQL.
   *   The previous guard (`if (this.isInitialized && !force)`) was the root
   *   cause of cross-device sync being broken — it silently skipped the server
   *   fetch after the first call, leaving Device B with empty localStorage data.
   * - In offline mode: loads from localStorage as before.
   * - Safe to call multiple times — debounced to 60 s when not forced.
   */
  async init(force = false): Promise<void> {
    // If API is configured, always allow re-fetch (server is the source of truth).
    // Debounce to 60 s to avoid hammering on rapid re-calls, but ALWAYS run on force=true.
    if (isApiConfigured()) {
      const age = Date.now() - this.lastSyncMs;
      if (!force && age < 60_000 && this.mode === "ready") {
        // Recently synced — skip, but return the existing promise if still in flight
        return this.initPromise ?? Promise.resolve();
      }
      // Start a fresh full sync
      this.initPromise = this._doInit();
      return this.initPromise;
    }

    // Offline mode: only init once
    if (this.initPromise && !force) return this.initPromise;
    this.initPromise = this._doInit();
    return this.initPromise;
  }

  private async _doInit(): Promise<void> {
    if (!isApiConfigured()) {
      this.mode = "offline";
      this.notify();
      return;
    }

    this.mode = "loading";
    this.notify();

    try {
      const data = await syncAllCollections(COLLECTIONS as unknown as string[]);
      for (const [name, rows] of Object.entries(data)) {
        this.cache.set(name, rows as unknown[]);
        this.counts[name] = (rows as unknown[]).length;
        // Mirror to localStorage as offline fallback
        ls.set(this.lsKey(name), rows);
      }
      this.lastSyncMs = Date.now();
      this.mode = "ready";
    } catch {
      // Fall back to localStorage
      for (const name of COLLECTIONS) {
        const local = ls.get<unknown[]>(this.lsKey(name), []);
        this.cache.set(name, local);
        this.counts[name] = local.length;
      }
      this.mode = "offline";
    }

    this.notify();
  }

  /** Get all records from a collection (from cache only — no localStorage fallback when API configured) */
  get<T>(collection: string): T[] {
    if (this.cache.has(collection)) {
      return this.cache.get(collection) as T[];
    }
    // Only fall back to localStorage in offline mode (API not configured)
    if (!isApiConfigured()) {
      return ls.get<T[]>(this.lsKey(collection), []);
    }
    // API is configured but cache is empty — return empty rather than stale localStorage
    // (component should call getAsync() to get real server data)
    return [];
  }

  /**
   * Fetch a collection asynchronously — always from the server when API is configured.
   * This is the PRIMARY read method for all page components.
   * - If the API is configured: fetches fresh data from MySQL, updates cache + localStorage
   * - If the API is not configured: returns localStorage data
   * - Deduplicates concurrent calls (only one fetch per collection at a time)
   */
  async getAsync<T>(collection: string): Promise<T[]> {
    if (!isApiConfigured()) {
      return ls.get<T[]>(this.lsKey(collection), []);
    }
    return this.refreshFromServer<T>(collection);
  }

  /**
   * Fetch a single collection DIRECTLY from the server, update cache + localStorage,
   * and return the fresh rows. Falls back to cache if API is unreachable.
   *
   * Deduplicates parallel calls — if a fetch for this collection is already in flight,
   * returns the same promise instead of firing a duplicate request.
   */
  async refreshFromServer<T>(collection: string): Promise<T[]> {
    if (!isApiConfigured()) {
      return this.get<T>(collection);
    }
    // Dedup: if already fetching this collection, await the same promise
    const existing = this.fetchPromises.get(collection);
    if (existing) {
      return existing as Promise<T[]>;
    }
    const promise = fetchCollection<T>(collection)
      .then((rows) => {
        this.cache.set(collection, rows as unknown[]);
        this.counts[collection] = rows.length;
        ls.set(this.lsKey(collection), rows);
        this.notify();
        return rows;
      })
      .catch(() => {
        // Return whatever is in cache / localStorage as last resort
        const cached = this.cache.get(collection) as T[] | undefined;
        return cached ?? ls.get<T[]>(this.lsKey(collection), []);
      })
      .finally(() => {
        this.fetchPromises.delete(collection);
      });
    this.fetchPromises.set(collection, promise as Promise<unknown[]>);
    return promise;
  }

  /**
   * Save a new item to a collection.
   * - Tries API first; updates cache + localStorage on success.
   * - If API unavailable, falls back to localStorage-only.
   * Returns the saved item (with _serverId if API succeeded).
   */
  async save<T extends Record<string, unknown>>(
    collection: string,
    item: T,
  ): Promise<T & WithServerId> {
    // Ensure local ID exists
    const localId =
      (item.id as string | undefined) ??
      (item.admNo ? String(item.admNo) : undefined) ??
      generateId();
    const withId = { ...item, id: localId } as T & WithServerId;

    if (isApiConfigured()) {
      try {
        const res = await saveCollectionItem(
          collection,
          withId as Record<string, unknown>,
        );
        withId._serverId = res.id;
        withId._synced = true;
      } catch {
        withId._synced = false;
      }
    }

    // Update cache
    const existing = this.get<T>(collection);
    const idx = existing.findIndex(
      (r) => (r as Record<string, unknown>).id === localId,
    );
    let updated: T[];
    if (idx >= 0) {
      updated = existing.map((r, i) => (i === idx ? withId : r));
    } else {
      updated = [...existing, withId];
    }
    this.cache.set(collection, updated as unknown[]);
    this.counts[collection] = updated.length;
    ls.set(this.lsKey(collection), updated);
    this.notify();
    return withId;
  }

  /**
   * Update an existing item (by local `id` field).
   */
  async update<T extends Record<string, unknown>>(
    collection: string,
    localId: string,
    changes: Partial<T>,
  ): Promise<void> {
    const existing = this.get<T>(collection);
    const idx = existing.findIndex(
      (r) => (r as Record<string, unknown>).id === localId,
    );
    if (idx < 0) return;

    const current = existing[idx] as T & WithServerId;
    const merged = { ...current, ...changes } as T & WithServerId;

    // Use _serverId (numeric MySQL autoincrement) if available, otherwise fall
    // back to the string UUID `id`. Items loaded from server via getAsync() won't
    // have _serverId but their string `id` is always present and valid in the DB.
    const apiId: string | number | undefined =
      current._serverId ?? (localId || undefined);
    if (isApiConfigured() && apiId) {
      try {
        await updateCollectionItem(
          collection,
          apiId,
          merged as Record<string, unknown>,
        );
        merged._synced = true;
      } catch {
        merged._synced = false;
      }
    }

    const updated = existing.map((r, i) => (i === idx ? merged : r));
    this.cache.set(collection, updated as unknown[]);
    ls.set(this.lsKey(collection), updated);
    this.notify();
  }

  /**
   * Delete an item (by local `id` field).
   * Soft-deletes on server; removes from local cache.
   */
  async delete(collection: string, localId: string): Promise<void> {
    const existing = this.get<Record<string, unknown>>(collection);
    const item = existing.find((r) => r.id === localId) as
      | (Record<string, unknown> & WithServerId)
      | undefined;

    // Use _serverId if available; fall back to the string UUID `localId`
    const apiId: string | number | undefined =
      item?._serverId ?? (localId || undefined);
    if (isApiConfigured() && apiId) {
      try {
        await deleteCollectionItem(collection, apiId);
      } catch {
        // best-effort
      }
    }

    const updated = existing.filter((r) => r.id !== localId);
    this.cache.set(collection, updated as unknown[]);
    this.counts[collection] = updated.length;
    ls.set(this.lsKey(collection), updated);
    this.notify();
  }

  /**
   * Re-fetch a single collection from the server and update cache.
   */
  async refresh(collection: string): Promise<void> {
    if (!isApiConfigured()) return;
    try {
      const rows = await fetchCollection<unknown>(collection);
      this.cache.set(collection, rows);
      this.counts[collection] = rows.length;
      ls.set(this.lsKey(collection), rows);
      this.notify();
    } catch {
      // keep existing cache
    }
  }

  /** Set an entire collection (bulk-replace) — for import/restore */
  setAll<T>(collection: string, items: T[]): void {
    this.cache.set(collection, items as unknown[]);
    this.counts[collection] = items.length;
    ls.set(this.lsKey(collection), items);
    this.notify();
  }

  /** Reset all caches (used during factory reset) */
  reset(): void {
    this.cache.clear();
    this.counts = {};
    this.mode = "idle";
    this.initPromise = null;
    this.notify();
  }

  /**
   * Wait for DataService initialization to complete.
   * Returns immediately if already ready or offline.
   * If init is in flight, resolves when it completes.
   */
  waitForInit(): Promise<void> {
    if (this.mode === "ready" || this.mode === "offline")
      return Promise.resolve();
    if (this.initPromise) return this.initPromise;
    // Not yet started — kick off an init and wait for it
    return this.init();
  }

  /** True only when data has been loaded from the server */
  isReady(): boolean {
    return this.mode === "ready";
  }

  private lsKey(collection: string): string {
    // Map collection names to their localStorage keys used by legacy code
    const legacy: Record<string, string> = {
      fee_heads: "fee_headings",
      fee_headings: "fee_headings",
      transport_routes: "transport_routes_v2",
      pickup_points: "transport_routes_v2", // stored inside routes
      sections: "class_sections",
      expense_heads: "expense_heads",
      fee_balances: "old_balances",
      student_transport: "student_transport_v2",
      student_discounts: "student_discounts",
      old_fee_entries: "old_fee_entries",
    };
    return legacy[collection] ?? collection;
  }
}

/** Singleton DataService — import and use directly in any module */
export const dataService = new DataService();
