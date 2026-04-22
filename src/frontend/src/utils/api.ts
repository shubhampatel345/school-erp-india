/**
 * SHUBH SCHOOL ERP — PHP API Stub
 *
 * The MySQL/cPanel PHP API has been replaced by the Internet Computer canister.
 * This file is kept to avoid import errors in legacy code paths, but all PHP
 * API functions now throw immediately.
 *
 * Use canisterService for all data operations.
 * Use syncEngine / dataService for local-first write patterns.
 */

// ── Re-exports for backward compat ────────────────────────────────────────────
export { canisterService, generateId } from "./canisterService";

// ── Stubs that throw ──────────────────────────────────────────────────────────

const PHP_REMOVED = "PHP API removed — use canisterService instead";

/** @deprecated PHP API removed */
export function getBaseUrl(): string {
  throw new Error(PHP_REMOVED);
}
/** @deprecated PHP API removed */
export function getApiUrl(): string {
  throw new Error(PHP_REMOVED);
}
/** @deprecated PHP API removed */
export function getApiIndexUrl(): string {
  throw new Error(PHP_REMOVED);
}
/** @deprecated PHP API removed */
export function getDefaultApiUrl(): string {
  throw new Error(PHP_REMOVED);
}
/** @deprecated PHP API removed */
export function setApiUrl(_url: string): void {
  /* no-op */
}
/** @deprecated Always false — canister needs no API URL config */
export function isApiConfigured(): boolean {
  return true;
}
/** @deprecated PHP API removed */
export function getJwt(): string | null {
  return null;
}
/** @deprecated PHP API removed */
export function setJwt(_token: string): void {
  /* no-op */
}
/** @deprecated PHP API removed */
export function getRefreshToken(): string | null {
  return null;
}
/** @deprecated PHP API removed */
export function setRefreshToken(_token: string): void {
  /* no-op */
}
/** @deprecated PHP API removed */
export function clearTokens(): void {
  /* no-op */
}
/** @deprecated PHP API removed */
export function isJwtExpired(): boolean {
  return true;
}
/** @deprecated PHP API removed */
export function getJwtRole(): string | null {
  return null;
}
/** @deprecated PHP API removed */
export function getSchoolId(): string {
  return "1";
}
/** @deprecated PHP API removed */
export function storeServerCredentials(_u: string, _p: string): void {
  /* no-op */
}
/** @deprecated PHP API removed */
export function getStoredServerPassword(): string {
  return "";
}
/** @deprecated PHP API removed */
export function getStoredServerUsername(): string {
  return "";
}

export interface ApiError {
  message: string;
  status?: number;
  isNetworkError: boolean;
}

/** @deprecated PHP API removed */
export async function backendLogin(
  _username: string,
  _password: string,
): Promise<{
  success: boolean;
  role?: string;
  error?: string;
  token?: string;
  refreshToken?: string;
}> {
  return { success: false, error: PHP_REMOVED };
}

/** @deprecated PHP API removed */
export async function apiCall<T = unknown>(): Promise<T> {
  throw new Error(PHP_REMOVED);
}

/** @deprecated PHP API removed */
export async function fetchCollection<T>(_collection: string): Promise<T[]> {
  throw new Error(PHP_REMOVED);
}

/** @deprecated PHP API removed */
export async function saveCollectionItem<T extends Record<string, unknown>>(
  _collection: string,
  _item: T,
): Promise<{ id: number }> {
  throw new Error(PHP_REMOVED);
}

/** @deprecated PHP API removed */
export async function updateCollectionItem<T extends Record<string, unknown>>(
  _collection: string,
  _id: string | number,
  _item: T,
): Promise<void> {
  throw new Error(PHP_REMOVED);
}

/** @deprecated PHP API removed */
export async function deleteCollectionItem(
  _collection: string,
  _id: string | number,
): Promise<void> {
  throw new Error(PHP_REMOVED);
}

/** @deprecated PHP API removed */
export async function syncAllCollections(
  _collectionNames: string[],
): Promise<Record<string, unknown[]>> {
  throw new Error(PHP_REMOVED);
}

/** @deprecated PHP API removed */
export async function fetchSyncStatus(): Promise<{
  status: string;
  counts?: Record<string, number>;
  version: string;
  timestamp: string;
}> {
  throw new Error(PHP_REMOVED);
}

/** @deprecated PHP API removed */
export async function apiFetchAll(
  _token: string,
): Promise<Record<string, unknown[]>> {
  throw new Error(PHP_REMOVED);
}

/** @deprecated PHP API removed */
export async function apiCreateRecord<T extends Record<string, unknown>>(
  _collection: string,
  _data: T,
  _token: string | null,
): Promise<{ id: number | string }> {
  throw new Error(PHP_REMOVED);
}

/** @deprecated PHP API removed */
export async function apiUpdateRecord<T extends Record<string, unknown>>(
  _collection: string,
  _id: string | number,
  _data: T,
  _token: string | null,
): Promise<void> {
  throw new Error(PHP_REMOVED);
}

/** @deprecated PHP API removed */
export async function apiDeleteRecord(
  _collection: string,
  _id: string | number,
  _token: string | null,
): Promise<void> {
  throw new Error(PHP_REMOVED);
}

/** @deprecated PHP API removed */
export async function apiListRecords<T extends Record<string, unknown>>(
  _collection: string,
  _filters: Record<string, unknown>,
  _token: string | null,
): Promise<T[]> {
  throw new Error(PHP_REMOVED);
}

/** @deprecated PHP API removed */
export async function apiUpdatePermissions(
  _userId: string,
  _permissions: Record<string, unknown>,
  _token: string | null,
): Promise<void> {
  throw new Error(PHP_REMOVED);
}

/** @deprecated PHP API removed */
export async function apiFetchStudentAnalytics(
  _studentId: string,
): Promise<Record<string, unknown>> {
  throw new Error(PHP_REMOVED);
}

/** @deprecated PHP API removed */
export async function apiBatchRecords<T extends Record<string, unknown>>(
  _collection: string,
  _records: T[],
  _token: string | null,
): Promise<{ pushed: number; errors: string[] }> {
  throw new Error(PHP_REMOVED);
}

export interface SyncStatusResponse {
  status: "ok" | "error";
  version: string;
  timestamp: string;
  counts?: Record<string, number>;
  message?: string;
}

export interface BatchPushResult {
  pushed: number;
  total: number;
  errors: string[];
  collection: string;
}

export interface ConnectionTestResult {
  connected: boolean;
  latencyMs: number;
  error?: string;
}

/** @deprecated PHP API removed */
export async function testConnection(): Promise<ConnectionTestResult> {
  return { connected: false, latencyMs: 0, error: PHP_REMOVED };
}

/** @deprecated PHP API removed */
export async function migrateLocalData(): Promise<{
  success: boolean;
  message: string;
}> {
  return { success: false, message: PHP_REMOVED };
}

/** @deprecated PHP API removed */
export async function batchPushCollection(): Promise<BatchPushResult> {
  throw new Error(PHP_REMOVED);
}

export interface CollectionListResult<T> {
  rows: T[];
  total: number;
  limit: number;
  offset: number;
}

// Broadcast stubs (WhatsApp via external API still works — not PHP)
import type { BroadcastCampaign } from "../types/index";

export async function apiSendBroadcast(
  campaign: BroadcastCampaign,
  phoneNumbers: string[],
): Promise<{ sent: number; failed: number }> {
  const whatsAppSettings = (() => {
    try {
      return JSON.parse(
        localStorage.getItem("shubh_erp_whatsapp_settings") ?? "{}",
      ) as { appKey?: string; authKey?: string };
    } catch {
      return {};
    }
  })();
  const { appKey, authKey } = whatsAppSettings;
  if (!appKey || !authKey) return { sent: 0, failed: phoneNumbers.length };

  let sent = 0;
  let failed = 0;
  for (const phone of phoneNumbers) {
    try {
      const res = await fetch(
        `https://wacoder.in/api/send?route=api&appkey=${appKey}&authkey=${authKey}&to=${encodeURIComponent(phone)}&message=${encodeURIComponent(campaign.message)}`,
        { signal: AbortSignal.timeout(8_000) },
      );
      if (res.ok) sent++;
      else failed++;
    } catch {
      failed++;
    }
  }
  return { sent, failed };
}
