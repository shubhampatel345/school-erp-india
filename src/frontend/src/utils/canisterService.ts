/**
 * SHUBH SCHOOL ERP — CanisterService
 *
 * All data operations go through the Internet Computer canister backend.
 * No PHP, no MySQL, no cPanel. The canister IS the database.
 *
 * The actor is lazily initialised via a Promise so the singleton is safe to
 * import at module scope without blocking the render tree.
 */

import type { backendInterface } from "../backend.d.ts";

// ── ID generator ──────────────────────────────────────────────────────────────

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Actor accessor (lazy, Promise-based) ─────────────────────────────────────
// The actor is provided by the platform via a global set in main.tsx.
// We defer resolution so imports at module-load time don't crash.

type ActorProvider = () => backendInterface | null;

let _actorProvider: ActorProvider = () => null;

export function setActorProvider(fn: ActorProvider) {
  _actorProvider = fn;
}

function getActor(): backendInterface | null {
  return _actorProvider();
}

// ── Shared result types ───────────────────────────────────────────────────────

export interface WriteResult {
  ok: boolean;
  err: string;
}

export interface BatchResult {
  ok: boolean;
  count: number;
  err: string;
}

export interface ImportResult {
  ok: boolean;
  count: number;
}

// ── CanisterService ───────────────────────────────────────────────────────────

class CanisterServiceClass {
  // ── Write operations ──────────────────────────────────────────────────────

  async createRecord(
    collection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<WriteResult> {
    const actor = getActor();
    if (!actor) return { ok: false, err: "Canister not initialised yet" };
    try {
      const result = await actor.createRecord(
        collection,
        id,
        JSON.stringify(data),
      );
      return { ok: result.ok, err: result.err };
    } catch (e) {
      return { ok: false, err: e instanceof Error ? e.message : String(e) };
    }
  }

  async updateRecord(
    collection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<WriteResult> {
    const actor = getActor();
    if (!actor) return { ok: false, err: "Canister not initialised yet" };
    try {
      const result = await actor.updateRecord(
        collection,
        id,
        JSON.stringify(data),
      );
      return { ok: result.ok, err: result.err };
    } catch (e) {
      return { ok: false, err: e instanceof Error ? e.message : String(e) };
    }
  }

  async deleteRecord(collection: string, id: string): Promise<WriteResult> {
    const actor = getActor();
    if (!actor) return { ok: false, err: "Canister not initialised yet" };
    try {
      const result = await actor.deleteRecord(collection, id);
      return { ok: result.ok, err: result.err };
    } catch (e) {
      return { ok: false, err: e instanceof Error ? e.message : String(e) };
    }
  }

  // ── Read operations ───────────────────────────────────────────────────────

  async getRecord(
    collection: string,
    id: string,
  ): Promise<Record<string, unknown> | null> {
    const actor = getActor();
    if (!actor) return null;
    try {
      const raw = await actor.getRecord(collection, id);
      if (!raw) return null;
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  async listRecords<T = Record<string, unknown>>(
    collection: string,
  ): Promise<T[]> {
    const actor = getActor();
    if (!actor) return [];
    try {
      const raws = await actor.listRecords(collection);
      return raws.map((r) => JSON.parse(r) as T);
    } catch {
      return [];
    }
  }

  // ── Batch operations ──────────────────────────────────────────────────────

  async batchUpsert(
    collection: string,
    records: Array<Record<string, unknown>>,
  ): Promise<BatchResult> {
    const actor = getActor();
    if (!actor)
      return { ok: false, count: 0, err: "Canister not initialised yet" };
    try {
      const items = records.map((r) => {
        const id = (r.id as string | undefined) ?? generateId();
        return { id, data: JSON.stringify({ ...r, id }) };
      });
      const result = await actor.batchUpsert(collection, items);
      return {
        ok: result.ok,
        count: Number(result.count),
        err: result.err,
      };
    } catch (e) {
      return {
        ok: false,
        count: 0,
        err: e instanceof Error ? e.message : String(e),
      };
    }
  }

  // ── Aggregates ────────────────────────────────────────────────────────────

  async getCounts(): Promise<Record<string, number>> {
    const actor = getActor();
    if (!actor) return {};
    try {
      const pairs = await actor.getCounts();
      const out: Record<string, number> = {};
      for (const [col, cnt] of pairs) {
        out[col] = Number(cnt);
      }
      return out;
    } catch {
      return {};
    }
  }

  async getChangelog(sinceMs: number): Promise<Record<string, unknown>[]> {
    const actor = getActor();
    if (!actor) return [];
    try {
      // canister uses nanoseconds; sinceMs is milliseconds
      const sinceNs = BigInt(sinceMs) * BigInt(1_000_000);
      const raws = await actor.getChangelog(sinceNs);
      return raws.map((r) => {
        try {
          return JSON.parse(r) as Record<string, unknown>;
        } catch {
          return { raw: r };
        }
      });
    } catch {
      return [];
    }
  }

  // ── Backup / restore ──────────────────────────────────────────────────────

  async exportAll(): Promise<Record<string, Record<string, unknown>[]>> {
    const actor = getActor();
    if (!actor) return {};
    try {
      const raw = await actor.exportAll();
      const out: Record<string, Record<string, unknown>[]> = {};
      for (const [col, pairs] of raw) {
        out[col] = pairs.map(([, data]) => {
          try {
            return JSON.parse(data) as Record<string, unknown>;
          } catch {
            return {};
          }
        });
      }
      return out;
    } catch {
      return {};
    }
  }

  async importAll(
    data: Record<string, Record<string, unknown>[]>,
  ): Promise<ImportResult> {
    const actor = getActor();
    if (!actor) return { ok: false, count: 0 };
    try {
      const payload: Array<[string, Array<[string, string]>]> = Object.entries(
        data,
      ).map(([col, records]) => [
        col,
        records.map((r) => {
          const id = (r.id as string | undefined) ?? generateId();
          return [id, JSON.stringify({ ...r, id })] as [string, string];
        }),
      ]);
      const result = await actor.importAll(payload);
      return { ok: result.ok, count: Number(result.count) };
    } catch {
      return { ok: false, count: 0 };
    }
  }

  // ── Health ────────────────────────────────────────────────────────────────

  async ping(): Promise<boolean> {
    const actor = getActor();
    if (!actor) return false;
    try {
      await actor.ping();
      return true;
    } catch {
      return false;
    }
  }

  isReady(): boolean {
    return getActor() !== null;
  }
}

export const canisterService = new CanisterServiceClass();
