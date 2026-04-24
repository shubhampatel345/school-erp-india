/**
 * SHUBH SCHOOL ERP — Canister Library Stub
 *
 * This project uses cPanel/MySQL via phpApiService — no Internet Computer.
 * All methods are stubs for backward compatibility.
 */

export { canisterService, generateId } from "../utils/canisterService";

export interface BatchResult {
  ok: boolean;
  count: number;
  errors?: string[];
}

export interface ImportResult {
  ok: boolean;
  count: number;
}

export interface WriteResult {
  ok: boolean;
  err: string;
}

import { generateId } from "../utils/canisterService";

const noopWriteResult: WriteResult = { ok: false, err: "Not implemented" };

export async function createRecord(
  _collection: string,
  _data: Record<string, unknown>,
): Promise<WriteResult> {
  return noopWriteResult;
}

export async function updateRecord(
  _collection: string,
  _id: string,
  _data: Record<string, unknown>,
): Promise<WriteResult> {
  return noopWriteResult;
}

export async function deleteRecord(
  _collection: string,
  _id: string,
): Promise<WriteResult> {
  return noopWriteResult;
}

export async function getRecord(
  _collection: string,
  _id: string,
): Promise<Record<string, unknown> | null> {
  return null;
}

export async function listRecords<T = Record<string, unknown>>(
  _collection: string,
): Promise<T[]> {
  return [];
}

export async function batchUpsert(
  _collection: string,
  _records: Array<Record<string, unknown>>,
): Promise<BatchResult> {
  return { ok: false, count: 0 };
}

export async function deleteCollection(
  _collection: string,
): Promise<{ ok: boolean; count: number }> {
  return { ok: false, count: 0 };
}

export async function getCounts(): Promise<Record<string, number>> {
  return {};
}

export async function exportAll(): Promise<
  Record<string, Record<string, unknown>[]>
> {
  return {};
}

export async function importAll(
  _data: Record<string, Record<string, unknown>[]>,
): Promise<ImportResult> {
  return { ok: false, count: 0 };
}

// Keep generateId re-export accessible
export { generateId as newId };
