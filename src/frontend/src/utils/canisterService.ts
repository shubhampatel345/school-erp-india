/**
 * SHUBH SCHOOL ERP — CanisterService (PHP/MySQL shim)
 *
 * The real data layer is phpApiService (PHP/MySQL on cPanel).
 * This file provides generateId() and stub no-op methods so TypeScript
 * compiles cleanly. Pages must use phpApiService for all real data.
 */

// ── ID generator ──────────────────────────────────────────────────────────────

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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

// ── Actor accessor (minimal, ping only) ─────────────────────────────────────

import type { backendInterface } from "../backend.d.ts";

type ActorProvider = () => backendInterface | null;

let _actorProvider: ActorProvider = () => null;

export function setActorProvider(fn: ActorProvider) {
  _actorProvider = fn;
}

// ── CanisterService (stub — real data via phpApiService) ──────────────────────

class CanisterServiceClass {
  // ── Write stubs ───────────────────────────────────────────────────────────

  async createRecord(
    _collection: string,
    _id: string,
    _data: Record<string, unknown>,
  ): Promise<WriteResult> {
    return { ok: true, err: "" };
  }

  async updateRecord(
    _collection: string,
    _id: string,
    _data: Record<string, unknown>,
  ): Promise<WriteResult> {
    return { ok: true, err: "" };
  }

  async deleteRecord(_collection: string, _id: string): Promise<WriteResult> {
    return { ok: true, err: "" };
  }

  // ── Read stubs ────────────────────────────────────────────────────────────

  async getRecord(
    _collection: string,
    _id: string,
  ): Promise<Record<string, unknown> | null> {
    return null;
  }

  async listRecords<T = Record<string, unknown>>(
    _collection: string,
  ): Promise<T[]> {
    return [];
  }

  // ── Batch stubs ───────────────────────────────────────────────────────────

  async batchUpsert(
    _collection: string,
    _records: Array<Record<string, unknown>>,
  ): Promise<BatchResult> {
    return { ok: true, count: 0, err: "" };
  }

  // ── Aggregate stubs ───────────────────────────────────────────────────────

  async getCounts(): Promise<Record<string, number>> {
    return {};
  }

  async getChangelog(_sinceMs: number): Promise<Record<string, unknown>[]> {
    return [];
  }

  // ── Backup stubs ──────────────────────────────────────────────────────────

  async exportAll(): Promise<Record<string, Record<string, unknown>[]>> {
    return {};
  }

  async importAll(
    _data: Record<string, Record<string, unknown>[]>,
  ): Promise<ImportResult> {
    return { ok: true, count: 0 };
  }

  // ── Health ────────────────────────────────────────────────────────────────

  async ping(): Promise<boolean> {
    const actor = _actorProvider();
    if (!actor) return false;
    try {
      await actor.ping();
      return true;
    } catch {
      return false;
    }
  }

  isReady(): boolean {
    return _actorProvider() !== null;
  }
}

export const canisterService = new CanisterServiceClass();
