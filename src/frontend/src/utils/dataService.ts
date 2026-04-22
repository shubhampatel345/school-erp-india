/**
 * SHUBH SCHOOL ERP — DataService (Canister-Native)
 *
 * Thin wrapper around syncEngine. All reads are instant (from memory).
 * All writes are local-first — instant UI update, background canister push.
 *
 * No MySQL, no PHP, no JWT tokens.
 */

import { generateId } from "./canisterService";
import { syncEngine } from "./syncEngine";

export { generateId };

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

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    for (const fn of this.listeners) fn();
  }

  getMode(): "idle" | "loading" | "ready" | "offline" {
    const state = syncEngine.getSyncStatus().state;
    if (state === "synced") return "ready";
    if (state === "loading") return "loading";
    if (state === "offline") return "offline";
    return "idle";
  }

  getCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const col of COLLECTIONS) {
      counts[col] = syncEngine.getLocalCollection(col).length;
    }
    return counts;
  }

  /** Get records from in-memory cache — instant, no await */
  get<T>(collection: string): T[] {
    return syncEngine.getLocalCollection(collection) as T[];
  }

  /** Async read — same as get() since all data is in memory */
  async getAsync<T>(collection: string): Promise<T[]> {
    return this.get<T>(collection);
  }

  /** Load a single collection fresh from the canister */
  async refreshFromServer<T>(collection: string): Promise<T[]> {
    await syncEngine.loadFromCanister(collection);
    this.notify();
    return this.get<T>(collection);
  }

  /** Save a new item (local-first, background canister push) */
  async save<T extends Record<string, unknown>>(
    collection: string,
    item: T,
  ): Promise<T> {
    const id = (item.id as string | undefined) ?? generateId();
    const withId = { ...item, id } as T;
    const saved = await syncEngine.saveRecord(collection, withId, "create");
    this.notify();
    return saved as T;
  }

  /** Update an existing item */
  async update<T extends Record<string, unknown>>(
    collection: string,
    localId: string,
    changes: Partial<T>,
  ): Promise<void> {
    const existing = this.get<T>(collection).find(
      (r) => (r as Record<string, unknown>).id === localId,
    );
    const merged = { ...(existing ?? {}), ...changes, id: localId } as Record<
      string,
      unknown
    >;
    await syncEngine.saveRecord(collection, merged, "update");
    this.notify();
  }

  /** Delete an item */
  async delete(collection: string, localId: string): Promise<void> {
    await syncEngine.saveRecord(collection, { id: localId }, "delete");
    this.notify();
  }

  /** Refresh a single collection */
  async refresh(collection: string): Promise<void> {
    await syncEngine.loadFromCanister(collection);
    this.notify();
  }

  /** Bulk-replace a collection (for import/restore) */
  setAll<T>(collection: string, items: T[]): void {
    syncEngine.setCollectionCache(collection, items as unknown[]);
    this.notify();
  }

  /** Initialize: load all data from canister (called on app startup) */
  async initializeFromCanister(): Promise<void> {
    await syncEngine.initialize();
    this.notify();
  }

  /** Alias for backward compatibility */
  async init(_force = false): Promise<void> {
    return this.initializeFromCanister();
  }

  reset(): void {
    syncEngine.reset();
    this.notify();
  }

  isReady(): boolean {
    return this.getMode() === "ready";
  }

  waitForInit(): Promise<void> {
    return Promise.resolve();
  }
}

export const dataService = new DataService();
