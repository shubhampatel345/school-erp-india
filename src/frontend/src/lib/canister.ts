/**
 * SHUBH SCHOOL ERP — Canister Library
 *
 * Thin facade over canisterService for direct actor operations.
 * All data operations go through the Internet Computer canister.
 * No PHP, no MySQL. The canister IS the database.
 */

export {
  canisterService,
  generateId,
  setActorProvider,
} from "../utils/canisterService";
export type {
  BatchResult,
  ImportResult,
  WriteResult,
} from "../utils/canisterService";

import { canisterService, generateId } from "../utils/canisterService";

// ── Convenience wrappers ──────────────────────────────────────────────────────

/** Create a new record in the canister. Returns ok/err. */
export async function createRecord(
  collection: string,
  data: Record<string, unknown>,
) {
  const id = (data.id as string | undefined) ?? generateId();
  return canisterService.createRecord(collection, id, { ...data, id });
}

/** Update an existing record. Falls back to create if not found. */
export async function updateRecord(
  collection: string,
  id: string,
  data: Record<string, unknown>,
) {
  const result = await canisterService.updateRecord(collection, id, {
    ...data,
    id,
  });
  if (!result.ok && result.err.includes("not found")) {
    return canisterService.createRecord(collection, id, { ...data, id });
  }
  return result;
}

/** Delete a record from the canister. */
export async function deleteRecord(collection: string, id: string) {
  return canisterService.deleteRecord(collection, id);
}

/** Get a single record by id. Returns null if not found. */
export async function getRecord(
  collection: string,
  id: string,
): Promise<Record<string, unknown> | null> {
  return canisterService.getRecord(collection, id);
}

/** List all records in a collection. */
export async function listRecords<T = Record<string, unknown>>(
  collection: string,
): Promise<T[]> {
  return canisterService.listRecords<T>(collection);
}

/** Batch upsert records into a collection. */
export async function batchUpsert(
  collection: string,
  records: Array<Record<string, unknown>>,
) {
  return canisterService.batchUpsert(collection, records);
}

/** Delete an entire collection. */
export async function deleteCollection(collection: string) {
  const { canisterService: svc } = await import("../utils/canisterService");
  // Access the underlying actor for deleteCollection
  const actor = (
    svc as unknown as {
      _getActor?: () => { deleteCollection?: (c: string) => Promise<unknown> };
    }
  )._getActor?.();
  if (actor?.deleteCollection) {
    return actor.deleteCollection(collection);
  }
  return { ok: false, count: 0 };
}

/** Get per-collection record counts from the canister. */
export async function getCounts(): Promise<Record<string, number>> {
  return canisterService.getCounts();
}

/** Export all data for backup. */
export async function exportAll(): Promise<
  Record<string, Record<string, unknown>[]>
> {
  return canisterService.exportAll();
}

/** Import data from a backup. */
export async function importAll(
  data: Record<string, Record<string, unknown>[]>,
) {
  return canisterService.importAll(data);
}
