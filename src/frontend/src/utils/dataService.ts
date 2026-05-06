/**
 * SHUBH SCHOOL ERP — DataService
 *
 * Main data access layer for all modules.
 * Architecture: IndexedDB (source of truth) → phpApiService (sync target)
 *
 * On read:  load from IndexedDB; if empty, fetch from PHP API → seed IndexedDB
 * On write: write to IndexedDB first, add to sync_queue, background push to PHP API
 *
 * Modules that already use phpApiService directly continue to work — this is
 * an additive layer, not a replacement.
 */

import { type DbRecord, type StoreName, dbGetAll } from "../lib/db";
import {
  getAll,
  mergeServerRecords,
  remove,
  save,
  setCollection,
} from "./localFirstSync";
import phpApiService from "./phpApiService";
import { processSyncQueue } from "./syncEngine";

export { phpApiService };

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const COLLECTIONS = [
  "students",
  "staff",
  "attendance",
  "fee_receipts",
  "fees_plan",
  "fee_headings",
  "transport_routes",
  "pickup_points",
  "inventory_items",
  "expenses",
  "homework",
  "alumni",
  "sessions",
  "classes",
  "sections",
  "subjects",
] as const;

export type CollectionName = (typeof COLLECTIONS)[number];

export interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export async function fetchData<T>(
  fetcher: () => Promise<T>,
): Promise<DataState<T>> {
  try {
    const data = await fetcher();
    return { data, loading: false, error: null };
  } catch (err) {
    return {
      data: null,
      loading: false,
      error: err instanceof Error ? err.message : "Failed to load data",
    };
  }
}

// ── Offline-first helpers ─────────────────────────────────────────────────────

/**
 * Get all records from IndexedDB.
 * If IndexedDB is empty, fetch from PHP API and seed IndexedDB first.
 * Returns IndexedDB records (fast, always available).
 */
export async function getLocalOrFetch<T extends DbRecord>(
  store: StoreName,
  fetcher: () => Promise<T[]>,
): Promise<T[]> {
  try {
    const local = await getAll<T>(store);
    if (local.length > 0) return local;

    // IndexedDB empty — fetch from server and seed
    try {
      const serverRecords = await fetcher();
      await setCollection(
        store,
        serverRecords as unknown as Record<string, unknown>[],
      );
      return getAll<T>(store);
    } catch {
      return [];
    }
  } catch {
    // IndexedDB unavailable — fallback to direct API
    try {
      return fetcher();
    } catch {
      return [];
    }
  }
}

/**
 * Refresh a store from the server (merge new server data into IndexedDB).
 */
export async function refreshFromServer(
  store: StoreName,
  fetcher: () => Promise<Record<string, unknown>[]>,
): Promise<void> {
  try {
    const serverRecords = await fetcher();
    await mergeServerRecords(store, serverRecords);
  } catch (err) {
    console.warn(`[dataService] refreshFromServer failed for ${store}:`, err);
  }
}

// ── Students ──────────────────────────────────────────────────────────────────

export async function getStudents(): Promise<DbRecord[]> {
  return getLocalOrFetch<DbRecord>("students", async () => {
    const result = await phpApiService.getStudents();
    return result.data as unknown as DbRecord[];
  });
}

export async function saveStudent(
  student: Record<string, unknown>,
): Promise<DbRecord> {
  const isNew = !student.id;
  const action = isNew ? "create" : "update";
  const saved = await save("students", student, action);
  return saved as DbRecord;
}

export async function deleteStudent(id: string): Promise<void> {
  await remove("students", id);
}

// ── Classes ───────────────────────────────────────────────────────────────────

export async function getClasses(): Promise<DbRecord[]> {
  return getLocalOrFetch<DbRecord>("classes", async () => {
    const classes = await phpApiService.getClasses();
    return classes as unknown as DbRecord[];
  });
}

export async function saveClass(
  cls: Record<string, unknown>,
): Promise<DbRecord> {
  const isNew = !cls.id;
  const action = isNew ? "create" : "update";
  return save("classes", cls, action) as Promise<DbRecord>;
}

export async function deleteClass(id: string): Promise<void> {
  await remove("classes", id);
}

// ── Generic DataService class (backward compat) ──────────────────────────────

class DataService {
  private _ready = true;

  isReady(): boolean {
    return this._ready;
  }
  getMode(): "ready" {
    return "ready";
  }
  getCounts(): Record<string, number> {
    return {};
  }

  /** @deprecated — use getLocalOrFetch or phpApiService directly */
  get<T>(_collection: string): T[] {
    return [];
  }

  async getAsync<T>(collection: string): Promise<T[]> {
    try {
      const local = await dbGetAll(collection as StoreName);
      if (local.length > 0) return local as unknown as T[];
      const all = await phpApiService.loadAll();
      return ((all[collection] as T[]) ?? []) as T[];
    } catch {
      return [];
    }
  }

  async save<T extends Record<string, unknown>>(
    collection: string,
    item: T,
  ): Promise<T> {
    // Write to IndexedDB + sync queue first, then let background sync handle PHP
    const action = item.id ? "update" : "create";
    try {
      const saved = await save(
        collection as StoreName,
        item as Record<string, unknown>,
        action,
      );
      return saved as unknown as T;
    } catch {
      // Fallback: direct API call
      switch (collection) {
        case "students":
          if (item.id) {
            return (await phpApiService.updateStudent(
              item as unknown as Parameters<
                typeof phpApiService.updateStudent
              >[0],
            )) as unknown as T;
          }
          return (await phpApiService.addStudent(item)) as unknown as T;
        case "staff":
          if (item.id) {
            return (await phpApiService.updateStaff(
              item as unknown as Parameters<
                typeof phpApiService.updateStaff
              >[0],
            )) as unknown as T;
          }
          return (await phpApiService.addStaff(item)) as unknown as T;
        default:
          return item;
      }
    }
  }

  async refreshFromServer<T>(collection: string): Promise<T[]> {
    return this.getAsync<T>(collection);
  }

  async refresh(collection: string): Promise<void> {
    await this.refreshFromServer(collection);
  }

  async initializeFromServer(): Promise<Record<string, unknown[]>> {
    return {};
  }
  async init(): Promise<void> {}
  async initializeFromCanister(): Promise<void> {}
  reset(): void {}
  waitForInit(): Promise<void> {
    return Promise.resolve();
  }
}

export const dataService = new DataService();
export default dataService;

// Re-export for convenience
export {
  getAll,
  save,
  remove,
  mergeServerRecords,
  setCollection,
  processSyncQueue,
};
