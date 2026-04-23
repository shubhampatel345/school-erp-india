/**
 * SHUBH SCHOOL ERP — SyncEngine (Canister-Native, Local-First)
 *
 * Architecture:
 * 1. localState (in-memory Map) is the UI source of truth — reads are instant
 * 2. Every write updates localState immediately → UI re-renders with no wait
 * 3. Background: canister write fires; on confirm, local cache is authoritative
 * 4. pendingWrites Set tracks writes in-flight — background fetch NEVER
 *    overwrites a record that has a pending write queued for it
 * 5. On reconnect / online event: flush all pending writes
 *
 * CRITICAL INVARIANT: A record in pendingWrites can never be overwritten
 * by a server fetch. The pending write is the source of truth until confirmed.
 */

import type { SyncStatus } from "../types";
import { canisterService, generateId } from "./canisterService";

// ── localStorage cache helpers ────────────────────────────────────────────────

const CACHE_PREFIX = "erp_cache_";
const CACHE_VER_KEY = "erp_cache_version";
const CACHE_VER = "c2"; // bump to invalidate stale caches

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

// ── Collection update callback type ──────────────────────────────────────────

type CollectionUpdateCallback = (
  collection: string,
  records: unknown[],
) => void;

// ── Known collections (exhaustive list) ──────────────────────────────────────

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

  /**
   * CRITICAL: pendingWrites tracks every write queued for the canister.
   * Key is `collection::recordId` — so per-record tracking is O(1).
   * Background fetches MUST check this set before overwriting any record.
   */
  private pendingWrites: Map<string, PendingWrite> = new Map();

  /**
   * In-flight record IDs per collection: `collection::recordId` → true.
   * These records must never be overwritten by server data until confirmed.
   */
  private inFlightIds: Set<string> = new Set();

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
  private isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  private isFlushing = false;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.isOnline = true;
        void this.flushPending();
      });
      window.addEventListener("offline", () => {
        this.isOnline = false;
        this.setStatus("offline");
      });
    }
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
   *
   * The UI sees the change IMMEDIATELY via localState update.
   * The record is tracked in inFlightIds until the canister confirms.
   * Background fetches will never overwrite a record in inFlightIds.
   */
  async saveRecord(
    collection: string,
    record: Record<string, unknown>,
    action: "create" | "update" | "delete",
  ): Promise<Record<string, unknown>> {
    const map = this.getMap(collection);
    const recordId = (record.id as string | undefined) ?? generateId();
    const withId = { ...record, id: recordId };

    // 1. Mark this record as in-flight BEFORE any async work
    const inFlightKey = `${collection}::${recordId}`;
    this.inFlightIds.add(inFlightKey);

    // 2. Update localState immediately — UI re-renders instantly
    if (action === "delete") {
      map.delete(recordId);
    } else {
      const existing = map.get(recordId);
      map.set(recordId, existing ? { ...existing, ...withId } : withId);
    }

    // 3. Write-through to localStorage cache
    writeCache(collection, Array.from(map.values()));

    // 4. Update pending count and notify subscribers so UI re-renders
    this.syncStatus = {
      ...this.syncStatus,
      pendingCount: this.pendingWrites.size + 1,
    };
    this.notify();

    // 5. Add to write queue
    // Use collection::recordId as key so we deduplicate per-record
    // (latest write for same record wins)
    const queueId = `${collection}::${recordId}`;
    // If there's already a pending write for this record, replace it
    // (e.g. two quick edits — only push the latest)
    const existing = this.pendingWrites.get(queueId);
    this.pendingWrites.set(queueId, {
      id: queueId,
      collection,
      recordId,
      data: action === "delete" ? { id: recordId } : withId,
      operation:
        existing?.operation === "create" && action !== "delete"
          ? "create" // preserve "create" if it's never been confirmed
          : action,
      createdAt: Date.now(),
      retries: 0,
    });

    // 6. Fire background push (non-blocking)
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
        // Remove from inFlightIds only after canister confirms
        this.inFlightIds.delete(`${pw.collection}::${pw.recordId}`);
        this.setStatus("synced");
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
      // Max retries — data is safe in localState; inFlight stays set
      // to protect data until user explicitly retries or reloads
      this.setStatus(
        "error",
        `Failed to sync ${pw.collection} after ${MAX_RETRIES} attempts (data saved locally)`,
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

  /**
   * Load a single collection from the canister and merge into localState.
   *
   * CRITICAL: Any record whose `collection::id` key is in inFlightIds
   * is SKIPPED — the local pending write is authoritative.
   */
  async loadFromCanister(collection: string): Promise<void> {
    try {
      const rows = await canisterService.listRecords(collection);
      const map = this.getMap(collection);

      for (const row of rows as Record<string, unknown>[]) {
        const id = (row.id as string | undefined) ?? "";
        if (!id) continue;
        // CRITICAL: skip records that have a pending or in-flight write
        if (this.inFlightIds.has(`${collection}::${id}`)) continue;
        // Also check pendingWrites by queueId (belt + suspenders)
        if (this.pendingWrites.has(`${collection}::${id}`)) continue;
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
   * 1. Warm localStorage cache instantly (no server round-trip, no flicker)
   * 2. Fetch fresh from canister in background (non-blocking)
   * 3. Start background flush timer for pending writes
   */
  async initialize(): Promise<Record<string, unknown[]>> {
    // Step 1: Warm from localStorage cache
    for (const col of KNOWN_COLLECTIONS) {
      const cached = readCache(col);
      if (cached) {
        const map = this.getMap(col);
        for (const r of cached as Record<string, unknown>[]) {
          const id = (r.id as string | undefined) ?? "";
          // Don't overwrite records that are in-flight
          if (id && !map.has(id) && !this.inFlightIds.has(`${col}::${id}`)) {
            map.set(id, r);
          }
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

  // ── Collection refresh (called after mutations) ───────────────────────────

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
    this.inFlightIds.clear();
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
