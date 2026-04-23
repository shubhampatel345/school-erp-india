/**
 * SHUBH SCHOOL ERP — DataService (PHP/MySQL)
 *
 * High-level data operations using localFirstSync (IndexedDB) + phpApiService (MySQL).
 *
 * - save(): writes to IndexedDB immediately → background MySQL push
 * - get(): returns in-memory cache instantly; server fetch merges in background
 * - refresh(): fetches from MySQL and merges into local cache
 *
 * No canister, no Internet Computer, no syncEngine.
 */

import { localFirstSync } from "./localFirstSync";
import phpApiService from "./phpApiService";

export { localFirstSync };

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

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

class DataService {
  private listeners: Set<() => void> = new Set();
  private _ready = false;

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    for (const fn of this.listeners) fn();
  }

  getMode(): "idle" | "loading" | "ready" | "offline" {
    return this._ready ? "ready" : "loading";
  }

  isReady(): boolean {
    return this._ready;
  }

  getCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const col of COLLECTIONS) {
      counts[col] = localFirstSync.getSnapshot(col).length;
    }
    return counts;
  }

  /** Instant read from in-memory cache — no await */
  get<T>(collection: string): T[] {
    return localFirstSync.getSnapshot(collection) as T[];
  }

  /** Async read — loads IndexedDB if cache is empty */
  async getAsync<T>(collection: string): Promise<T[]> {
    const rows = await localFirstSync.load(collection);
    return rows as T[];
  }

  /**
   * Save a new record (local-first, background MySQL push).
   * Returns immediately — data is visible instantly.
   */
  async save<T>(collection: string, item: T): Promise<T> {
    const rec = item as Record<string, unknown>;
    const id = (rec.id as string | undefined) ?? generateId();
    const withId = { ...rec, id };
    const saved = await localFirstSync.save(collection, withId, "create");
    this.notify();
    return saved as T;
  }

  /** Update an existing record */
  async update(
    collection: string,
    localId: string,
    changes: Record<string, unknown>,
  ): Promise<void> {
    const existing = (this.get(collection) as Record<string, unknown>[]).find(
      (r) => r.id === localId,
    );
    const merged = { ...(existing ?? {}), ...changes, id: localId };
    await localFirstSync.save(collection, merged, "update");
    this.notify();
  }

  /** Delete a record */
  async delete(collection: string, localId: string): Promise<void> {
    await localFirstSync.save(collection, { id: localId }, "delete");
    this.notify();
  }

  /** Load a collection fresh from MySQL and merge (preserving pending writes) */
  async refreshFromServer<T>(collection: string): Promise<T[]> {
    try {
      const data = await phpApiService.loadAll();
      const rows = (data[collection] ?? []) as Record<string, unknown>[];
      localFirstSync.mergeServerRecords(collection, rows);
    } catch {
      /* network error — keep local data */
    }
    this.notify();
    return this.get(collection) as T[];
  }

  /** Alias for backward compatibility */
  async refresh(collection: string): Promise<void> {
    await this.refreshFromServer(collection);
  }

  /** Bulk-replace a collection (for import/restore) */
  setAll(collection: string, items: unknown[]): void {
    localFirstSync.setCollection(
      collection,
      items as Record<string, unknown>[],
    );
    this.notify();
  }

  /**
   * Initialize: warm from IndexedDB immediately, then fetch from MySQL.
   * Called once on login.
   */
  async initializeFromServer(): Promise<Record<string, unknown[]>> {
    // 1. Warm from IndexedDB immediately (no server round-trip)
    await Promise.allSettled(
      COLLECTIONS.map((col) => localFirstSync.load(col)),
    );
    this._ready = true;
    this.notify();

    // 2. Restore any pending writes from IndexedDB (surviving page reload)
    await localFirstSync.restorePendingQueue();

    // 3. Flush pending writes first
    await localFirstSync.forceSync();

    // 4. Fetch fresh data from MySQL
    try {
      const allData = await phpApiService.loadAll();
      for (const [col, rows] of Object.entries(allData)) {
        if (Array.isArray(rows)) {
          localFirstSync.mergeServerRecords(
            col,
            rows as Record<string, unknown>[],
          );
        }
      }
      this.notify();
      return allData as Record<string, unknown[]>;
    } catch {
      // Server unreachable — serve from IndexedDB (offline mode)
      const out: Record<string, unknown[]> = {};
      for (const col of COLLECTIONS) {
        out[col] = localFirstSync.getSnapshot(col);
      }
      return out;
    } finally {
      localFirstSync.startFlushTimer();
    }
  }

  /** Alias for backward compatibility */
  async init(_force = false): Promise<void> {
    await this.initializeFromServer();
  }

  /** Alias used by AppContext */
  async initializeFromCanister(): Promise<void> {
    await this.initializeFromServer();
  }

  reset(): void {
    localFirstSync.reset();
    this._ready = false;
    this.notify();
  }

  waitForInit(): Promise<void> {
    return Promise.resolve();
  }
}

export const dataService = new DataService();
