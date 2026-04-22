/**
 * SHUBH SCHOOL ERP — SyncEngine (Canister-Native)
 *
 * Local-first, canister-backed sync:
 * 1. localState (in-memory Map) is the UI source of truth — reads are instant
 * 2. Every write updates localState immediately → UI re-renders with no wait
 * 3. Background: canister write fires; on confirm, local cache is authoritative
 * 4. pendingWrites tracks writes in-flight until canister confirms
 * 5. On reconnect / online event: flush all pending writes
 *
 * No PHP, no MySQL, no JWT tokens. The canister IS the database.
 */

import type { SyncStatus } from "../types";
import { canisterService, generateId } from "./canisterService";

// ── Cache helpers (localStorage mirror for fast startup) ─────────────────────

const CACHE_PREFIX = "erp_cache_";
const CACHE_VER_KEY = "erp_cache_version";
const CACHE_VER = "c1"; // bump to invalidate when schema changes

function writeCache(collection: string, data: unknown[]) {
  try {
    localStorage.setItem(
      `${CACHE_PREFIX}${collection}`,
      JSON.stringify({ ts: Date.now(), data }),
    );
    localStorage.setItem(CACHE_VER_KEY, CACHE_VER);
  } catch {
    /* storage full — ignore */
  }
}

function readCache(collection: string): unknown[] | null {
  try {
    if (localStorage.getItem(CACHE_VER_KEY) !== CACHE_VER) return null;
    const raw = localStorage.getItem(`${CACHE_PREFIX}${collection}`);
    if (!raw) return null;
    const entry = JSON.parse(raw) as { data: unknown[] };
    return Array.isArray(entry.data) ? entry.data : null;
  } catch {
    return null;
  }
}

// ── Pending write types ───────────────────────────────────────────────────────

interface PendingWrite {
  id: string; // queue entry id
  collection: string;
  recordId: string;
  data: Record<string, unknown>;
  operation: "create" | "update" | "delete";
  createdAt: number;
  retries: number;
}

// ── Callback types ────────────────────────────────────────────────────────────

type CollectionUpdateCallback = (
  collection: string,
  records: unknown[],
) => void;

// ── Known collections ─────────────────────────────────────────────────────────

const KNOWN_COLLECTIONS = [
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
  "notices",
  "examinations",
  "exam_results",
  "library",
] as const;

const MAX_RETRIES = 3;
const FLUSH_INTERVAL_MS = 30_000;

// ── SyncEngine ────────────────────────────────────────────────────────────────

class SyncEngine {
  /** Primary data store: collection → Map<id, record> */
  private localState: Map<string, Map<string, Record<string, unknown>>> =
    new Map();
  /** Writes pending canister confirmation */
  private pendingWrites: Map<string, PendingWrite> = new Map();

  private syncStatus: SyncStatus = {
    state: "idle",
    lastSyncTime: null,
    lastError: null,
    pendingCount: 0,
    serverCounts: {},
  };

  private subscribers: Set<() => void> = new Set();
  private collectionCallbacks: Set<CollectionUpdateCallback> = new Set();
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isOnline = navigator.onLine;
  private isFlushing = false;

  constructor() {
    window.addEventListener("online", () => {
      this.isOnline = true;
      void this.flushPending();
    });
    window.addEventListener("offline", () => {
      this.isOnline = false;
      this.setStatus("offline");
    });
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────

  subscribe(fn: () => void): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  onCollectionUpdated(fn: CollectionUpdateCallback): () => void {
    this.collectionCallbacks.add(fn);
    return () => this.collectionCallbacks.delete(fn);
  }

  private notify() {
    for (const fn of this.subscribers) fn();
  }

  private notifyCollection(collection: string, records: unknown[]) {
    for (const fn of this.collectionCallbacks) fn(collection, records);
  }

  // ── Status ────────────────────────────────────────────────────────────────

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
      pendingCount: this.pendingWrites.size,
      ...(serverCounts ? { serverCounts } : {}),
    };
    this.notify();
  }

  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus, pendingCount: this.pendingWrites.size };
  }

  getQueueStats(): { pending: number; failed: number } {
    let failed = 0;
    for (const pw of this.pendingWrites.values()) {
      if (pw.retries >= MAX_RETRIES) failed++;
    }
    return { pending: this.pendingWrites.size, failed };
  }

  // ── Local collection helpers ───────────────────────────────────────────────

  private getMap(collection: string): Map<string, Record<string, unknown>> {
    if (!this.localState.has(collection)) {
      this.localState.set(collection, new Map());
    }
    return this.localState.get(collection)!;
  }

  /** Returns snapshot array (instant, no await) */
  getLocalCollection(collection: string): unknown[] {
    return Array.from(this.getMap(collection).values());
  }

  getCache(collection: string): unknown[] {
    return this.getLocalCollection(collection);
  }

  getAllCache(): Record<string, unknown[]> {
    const out: Record<string, unknown[]> = {};
    for (const name of KNOWN_COLLECTIONS) {
      out[name] = this.getLocalCollection(name);
    }
    return out;
  }

  setCollectionCache(collection: string, records: unknown[]) {
    const map = this.getMap(collection);
    map.clear();
    for (const r of records as Record<string, unknown>[]) {
      const id = (r.id as string | undefined) ?? generateId();
      map.set(id, { ...r, id });
    }
    writeCache(collection, Array.from(map.values()));
    this.notify();
  }

  // ── LOCAL-FIRST write ─────────────────────────────────────────────────────

  /**
   * saveRecord — instant local update, background canister push.
   * The UI sees the change IMMEDIATELY. No waiting for the canister.
   */
  async saveRecord(
    collection: string,
    record: Record<string, unknown>,
    action: "create" | "update" | "delete",
  ): Promise<Record<string, unknown>> {
    const map = this.getMap(collection);
    const recordId = (record.id as string | undefined) ?? generateId();
    const withId = { ...record, id: recordId };

    // 1. Update localState immediately
    if (action === "delete") {
      map.delete(recordId);
    } else {
      const existing = map.get(recordId);
      map.set(recordId, existing ? { ...existing, ...withId } : withId);
    }

    // 2. Write-through to localStorage cache
    writeCache(collection, Array.from(map.values()));

    // 3. Notify subscribers so UI re-renders instantly
    this.syncStatus = {
      ...this.syncStatus,
      pendingCount: this.pendingWrites.size + 1,
    };
    this.notify();

    // 4. Queue for canister push
    const queueId = `${collection}::${recordId}::${action}::${Date.now()}`;
    this.pendingWrites.set(queueId, {
      id: queueId,
      collection,
      recordId,
      data: action === "delete" ? { id: recordId } : withId,
      operation: action,
      createdAt: Date.now(),
      retries: 0,
    });

    // 5. Fire background push (non-blocking)
    void this.pushOne(queueId);

    return withId;
  }

  // ── Background push ───────────────────────────────────────────────────────

  private async pushOne(queueId: string): Promise<void> {
    const pw = this.pendingWrites.get(queueId);
    if (!pw) return;
    if (!this.isOnline || !canisterService.isReady()) return;

    try {
      let result: { ok: boolean; err: string };
      if (pw.operation === "delete") {
        result = await canisterService.deleteRecord(pw.collection, pw.recordId);
      } else if (pw.operation === "create") {
        result = await canisterService.createRecord(
          pw.collection,
          pw.recordId,
          pw.data,
        );
        // If "already exists" error, fall through to update
        if (!result.ok && result.err.includes("already exists")) {
          result = await canisterService.updateRecord(
            pw.collection,
            pw.recordId,
            pw.data,
          );
        }
      } else {
        result = await canisterService.updateRecord(
          pw.collection,
          pw.recordId,
          pw.data,
        );
        // If "not found" error, create instead
        if (!result.ok && result.err.includes("not found")) {
          result = await canisterService.createRecord(
            pw.collection,
            pw.recordId,
            pw.data,
          );
        }
      }

      if (result.ok) {
        this.pendingWrites.delete(queueId);
        this.setStatus("synced");
        // Notify with current local state (already up-to-date — no server re-fetch needed)
        const records = this.getLocalCollection(pw.collection);
        this.notifyCollection(pw.collection, records);
      } else {
        this.scheduleRetry(queueId, pw);
      }
    } catch {
      this.scheduleRetry(queueId, pw);
    }
  }

  private scheduleRetry(queueId: string, pw: PendingWrite) {
    pw.retries++;
    if (pw.retries >= MAX_RETRIES) {
      // Mark as permanently failed — data is still safe in localState
      this.setStatus(
        "error",
        `Failed to sync ${pw.collection} record after ${MAX_RETRIES} attempts (data saved locally)`,
      );
      return;
    }
    const delay = 1000 * 2 ** (pw.retries - 1);
    setTimeout(() => {
      if (this.isOnline) void this.pushOne(queueId);
    }, delay);
    this.setStatus("offline", "Retrying sync…");
  }

  // ── Flush all pending ─────────────────────────────────────────────────────

  async flushPending(): Promise<void> {
    if (this.isFlushing || !this.isOnline) return;
    this.isFlushing = true;
    try {
      const ids = Array.from(this.pendingWrites.keys());
      await Promise.allSettled(ids.map((id) => this.pushOne(id)));
    } finally {
      this.isFlushing = false;
    }
  }

  // ── Load from canister ────────────────────────────────────────────────────

  /** Load a single collection from the canister and merge into localState */
  async loadFromCanister(collection: string): Promise<void> {
    try {
      const rows = await canisterService.listRecords(collection);
      const map = this.getMap(collection);

      // Overlay: server rows go into map, but pending writes win for same id
      const pendingIds = new Set<string>();
      for (const [, pw] of this.pendingWrites) {
        if (pw.collection === collection) pendingIds.add(pw.recordId);
      }

      for (const row of rows as Record<string, unknown>[]) {
        const id = (row.id as string | undefined) ?? "";
        if (!id || pendingIds.has(id)) continue; // pending write wins
        map.set(id, row);
      }

      writeCache(collection, Array.from(map.values()));
      this.notify();
    } catch {
      /* network error — keep local state */
    }
  }

  /** Load all known collections from the canister in parallel */
  async loadAllFromCanister(): Promise<Record<string, unknown[]>> {
    this.setStatus("loading");
    try {
      await Promise.allSettled(
        KNOWN_COLLECTIONS.map((col) => this.loadFromCanister(col)),
      );
      const counts = await canisterService.getCounts();
      this.setStatus("synced", null, counts);
    } catch {
      this.setStatus("offline", "Could not reach canister");
    }
    return this.getAllCache();
  }

  // ── Initialize ────────────────────────────────────────────────────────────

  /**
   * Initialize:
   * 1. Load localStorage cache immediately (instant — no flicker)
   * 2. Fetch from canister in background
   * 3. Start background flush timer
   */
  async initialize(): Promise<Record<string, unknown[]>> {
    // Step 1: Warm up from localStorage cache
    for (const col of KNOWN_COLLECTIONS) {
      const cached = readCache(col);
      if (cached) {
        const map = this.getMap(col);
        for (const r of cached as Record<string, unknown>[]) {
          const id = (r.id as string | undefined) ?? "";
          if (id && !map.has(id)) map.set(id, r);
        }
      }
    }

    const hasCachedData = Array.from(this.localState.values()).some(
      (m) => m.size > 0,
    );
    this.setStatus(hasCachedData ? "synced" : "loading");
    this.notify();

    // Step 2: Fetch fresh from canister in background (non-blocking)
    void this.loadAllFromCanister();

    // Step 3: Flush any pending writes immediately
    if (this.pendingWrites.size > 0) {
      void this.flushPending();
    }

    // Step 4: Start background flush timer
    if (!this.flushTimer) {
      this.flushTimer = setInterval(() => {
        if (this.pendingWrites.size > 0 && this.isOnline) {
          void this.flushPending();
        }
      }, FLUSH_INTERVAL_MS);
    }

    return this.getAllCache();
  }

  // ── Collection refresh (called post-mutation) ─────────────────────────────

  async refreshCollection(collection: string): Promise<unknown[]> {
    await this.loadFromCanister(collection);
    return this.getLocalCollection(collection);
  }

  // ── Token (no-op — canister auth is platform-managed) ────────────────────

  setToken(_token: string | null) {
    /* no-op for canister */
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  reset() {
    this.localState.clear();
    this.pendingWrites.clear();
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.syncStatus = {
      state: "idle",
      lastSyncTime: null,
      lastError: null,
      pendingCount: 0,
      serverCounts: {},
    };
    this.notify();
  }

  // ── Back-compat shims ─────────────────────────────────────────────────────

  updateCache(
    collection: string,
    record: Record<string, unknown>,
    action: "create" | "update" | "delete",
  ) {
    const map = this.getMap(collection);
    const id = record.id as string | undefined;
    if (!id) return;
    if (action === "delete") {
      map.delete(id);
    } else {
      const existing = map.get(id);
      map.set(id, existing ? { ...existing, ...record } : record);
    }
    this.notify();
  }

  hasPendingRecords(collection: string): boolean {
    for (const pw of this.pendingWrites.values()) {
      if (pw.collection === collection) return true;
    }
    return false;
  }
}

export const syncEngine = new SyncEngine();
export type { SyncEngine };
