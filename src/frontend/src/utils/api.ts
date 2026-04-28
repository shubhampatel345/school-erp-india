/**
 * SHUBH SCHOOL ERP — Centralized API Client
 *
 * All API calls go through this module.
 * Token sent as ?token= URL query param (LiteSpeed strips Authorization headers).
 * Super Admin uses ?sa_key= instead of ?token=.
 *
 * API base: https://shubh.psmkgs.com/api/index.php
 */

const API_BASE = "https://shubh.psmkgs.com/api/index.php";
const SA_KEY = "shubh_superadmin_2024_secure_key";

// ── Auth helpers ──────────────────────────────────────────────────────────────

export function getToken(): string | null {
  try {
    return localStorage.getItem("erp_token");
  } catch {
    return null;
  }
}

export function getRole(): string | null {
  try {
    return localStorage.getItem("erp_role");
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem("erp_token", token);
  } catch {
    /* noop */
  }
}

export function setRole(role: string): void {
  try {
    localStorage.setItem("erp_role", role);
  } catch {
    /* noop */
  }
}

export function clearAuth(): void {
  try {
    localStorage.removeItem("erp_token");
    localStorage.removeItem("erp_role");
  } catch {
    /* noop */
  }
}

// ── Core API call ─────────────────────────────────────────────────────────────

export async function apiCall<T = unknown>(
  route: string,
  method: "GET" | "POST" = "GET",
  body?: Record<string, unknown>,
): Promise<T> {
  const token = getToken();
  const role = getRole();

  // Build URL with auth params — LiteSpeed cannot strip query params
  let url = `${API_BASE}?route=${route}`;
  if (role === "super_admin" || role === "superadmin") {
    url += `&sa_key=${SA_KEY}`;
  } else if (token) {
    url += `&token=${encodeURIComponent(token)}`;
  }

  const options: RequestInit = { method };
  if (body && method !== "GET") {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const text = await response.text();

  let json: { success: boolean; data?: T; error?: string; message?: string };
  try {
    json = JSON.parse(text) as typeof json;
  } catch {
    throw new Error(
      `Server error (HTTP ${response.status}): non-JSON response`,
    );
  }

  if (!json.success && json.error) {
    // Fire token-expired event for 401s so AppContext can handle it
    if (
      response.status === 401 ||
      json.error.toLowerCase().includes("unauthorized") ||
      json.error.toLowerCase().includes("token") ||
      json.error.toLowerCase().includes("expired")
    ) {
      window.dispatchEvent(new CustomEvent("auth:token-expired"));
    }
    throw new Error(json.error);
  }

  return json.data ?? (json as unknown as T);
}

// ── Auth calls ────────────────────────────────────────────────────────────────

export interface LoginResult {
  token?: string;
  refresh_token?: string;
  user?: {
    id: string | number;
    username: string;
    role: string;
    fullName?: string;
    name?: string;
    permissions?: Record<
      string,
      {
        canView: boolean;
        canAdd: boolean;
        canEdit: boolean;
        canDelete: boolean;
      }
    >;
  };
}

export async function apiLogin(
  username: string,
  password: string,
): Promise<LoginResult> {
  const url = `${API_BASE}?route=auth/login`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const text = await response.text();
  let json: {
    success: boolean;
    data?: LoginResult;
    error?: string;
    token?: string;
    user?: LoginResult["user"];
  };
  try {
    json = JSON.parse(text) as typeof json;
  } catch {
    throw new Error("Server error: non-JSON response");
  }
  if (!json.success && json.error) throw new Error(json.error);
  // Handle both {data: {token, user}} and {token, user} response shapes
  if (json.data?.token) return json.data;
  return json as unknown as LoginResult;
}

// ── Broadcast (WhatsApp) ─────────────────────────────────────────────────────

export async function apiSendBroadcast(
  message: string,
  phoneNumbers: string[],
): Promise<{ sent: number; failed: number }> {
  const settings = (() => {
    try {
      return JSON.parse(
        localStorage.getItem("shubh_erp_whatsapp_settings") ?? "{}",
      ) as { appKey?: string; authKey?: string };
    } catch {
      return {};
    }
  })();
  const { appKey, authKey } = settings;
  if (!appKey || !authKey) return { sent: 0, failed: phoneNumbers.length };

  let sent = 0;
  let failed = 0;
  for (const phone of phoneNumbers) {
    try {
      const res = await fetch(
        `https://wacoder.in/api/send?route=api&appkey=${appKey}&authkey=${authKey}&to=${encodeURIComponent(phone)}&message=${encodeURIComponent(message)}`,
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

// ── Legacy broadcast re-export (used by Communication module) ─────────────────
export { apiSendBroadcast as apiSendBroadcastFromApi };

import type { BroadcastCampaign } from "../types/index";

/** @deprecated Use apiSendBroadcast directly */
export async function apiSendBroadcastLegacy(
  campaign: BroadcastCampaign,
  phoneNumbers: string[],
): Promise<{ sent: number; failed: number }> {
  return apiSendBroadcast(campaign.message, phoneNumbers);
}

// ── Backward compat stubs ─────────────────────────────────────────────────────

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const canisterService = {
  getCounts: async (): Promise<Record<string, number>> => ({}),
  isReady: () => false,
};

export { apiSendBroadcastLegacy as apiSendBroadcast_ };

// ── Legacy function stubs (used by older pages) ───────────────────────────────

/** Returns JWT token — same as getToken() */
export function getJwt(): string | null {
  return getToken();
}

/** @deprecated Use apiCall() directly */
export function getApiIndexUrl(): string {
  return API_BASE;
}

/** @deprecated Always true in cPanel mode */
export function isApiConfigured(): boolean {
  return true;
}

/** @deprecated Use getApiIndexUrl() */
export function getBaseUrl(): string {
  return "https://shubh.psmkgs.com/api";
}

/** @deprecated Use getApiIndexUrl() */
export function getApiUrl(): string {
  return API_BASE;
}

/** @deprecated Use getApiIndexUrl() */
export function getDefaultApiUrl(): string {
  return API_BASE;
}

/** @deprecated No-op */
export function setApiUrl(_url: string): void {
  /* no-op */
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem("erp_refresh_token");
  } catch {
    return null;
  }
}

export function setRefreshToken(token: string): void {
  try {
    localStorage.setItem("erp_refresh_token", token);
  } catch {
    /* noop */
  }
}

export function clearTokens(): void {
  clearAuth();
  try {
    localStorage.removeItem("erp_refresh_token");
  } catch {
    /* noop */
  }
}

export function isJwtExpired(): boolean {
  const token = getToken();
  if (!token) return true;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return true;
    const payload = JSON.parse(atob(parts[1])) as { exp?: number };
    if (!payload.exp) return false;
    return Date.now() / 1000 > payload.exp;
  } catch {
    return true;
  }
}

export function getJwtRole(): string | null {
  return getRole();
}

export function getSchoolId(): string {
  return "1";
}

export function storeServerCredentials(_u: string, _p: string): void {
  /* no-op */
}

export function getStoredServerPassword(): string {
  return "";
}

export function getStoredServerUsername(): string {
  return "";
}

export interface ApiError {
  message: string;
  status?: number;
  isNetworkError: boolean;
}

/** @deprecated Use phpApiService.login() */
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
  return { success: false, error: "Use phpApiService.login() instead" };
}

/** Updates user permissions via PHP API */
export async function apiUpdatePermissions(
  userId: string,
  permissions: Record<string, unknown>,
  _token: string | null,
): Promise<void> {
  await apiCall("users/permissions", "POST", { userId, permissions });
}

/** @deprecated Use phpApiService directly */
export async function fetchCollection<T>(_collection: string): Promise<T[]> {
  return [];
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

export async function testConnection(): Promise<ConnectionTestResult> {
  const start = Date.now();
  try {
    const url = `${API_BASE}?route=ping`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return { connected: res.ok, latencyMs: Date.now() - start };
  } catch (e) {
    return {
      connected: false,
      latencyMs: Date.now() - start,
      error: String(e),
    };
  }
}

export interface CollectionListResult<T> {
  rows: T[];
  total: number;
  limit: number;
  offset: number;
}

export async function migrateLocalData(): Promise<{
  success: boolean;
  message: string;
}> {
  return { success: true, message: "No migration needed — cPanel/MySQL mode" };
}

/** @deprecated */
export async function apiFetchStudentAnalytics(
  _studentId: string,
): Promise<Record<string, unknown>> {
  return {};
}
