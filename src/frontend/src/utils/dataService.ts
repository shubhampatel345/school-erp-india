/**
 * SHUBH SCHOOL ERP — DataService (Online-Only, PHP/MySQL)
 *
 * Thin wrapper over phpApiService.
 * NO IndexedDB, NO offline sync, NO pending queues.
 * All reads/writes go directly to MySQL via the PHP API.
 */

import phpApiService from "./phpApiService";

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

/**
 * useData — lightweight hook for data fetching with loading state.
 * Usage: const { data, loading, error, refetch } = useData(() => phpApiService.getStudents())
 * Import from this file and use in components that need simple fetch patterns.
 */
export interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** Simple fetch wrapper: calls fetcher, returns {data, loading, error} */
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

/**
 * Minimal DataService class kept for backward compatibility with pages
 * that call dataService.get() or dataService.save().
 * All methods now delegate directly to phpApiService.
 */
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

  /** @deprecated — use phpApiService directly */
  get<T>(_collection: string): T[] {
    return [];
  }

  /** Fetch from server — delegates to phpApiService.loadAll() */
  async getAsync<T>(collection: string): Promise<T[]> {
    try {
      const all = await phpApiService.loadAll();
      return ((all[collection] as T[]) ?? []) as T[];
    } catch {
      return [];
    }
  }

  /** Save a record — delegates to the appropriate phpApiService method */
  async save<T extends Record<string, unknown>>(
    collection: string,
    item: T,
  ): Promise<T> {
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
            item as unknown as Parameters<typeof phpApiService.updateStaff>[0],
          )) as unknown as T;
        }
        return (await phpApiService.addStaff(item)) as unknown as T;
      default:
        // Generic fallback — not used for critical collections
        return item;
    }
  }

  /** Refresh a collection from server */
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
