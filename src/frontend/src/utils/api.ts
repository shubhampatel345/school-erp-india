/**
 * SHUBH SCHOOL ERP — cPanel MySQL API Client
 *
 * Provides typed fetch-based wrappers for the PHP REST API.
 * Falls back to localStorage-only mode when no API URL is configured.
 *
 * Storage keys used:
 *   shubh_erp_api_url    — base URL e.g. https://yourschool.com/api
 *   shubh_erp_jwt_token  — JWT returned by /api/auth/login
 *   shubh_erp_jwt_refresh_token — refresh token for JWT auto-renewal
 */

// ── Key constants ─────────────────────────────────────────
const KEY_API_URL = "shubh_erp_api_url";
const KEY_JWT = "shubh_erp_jwt_token";
const KEY_JWT_REFRESH = "shubh_erp_jwt_refresh_token";

// ── URL helpers ───────────────────────────────────────────

export function getApiUrl(): string {
  return localStorage.getItem(KEY_API_URL)?.replace(/\/$/, "") ?? "";
}

export function setApiUrl(url: string) {
  if (url) {
    localStorage.setItem(KEY_API_URL, url.replace(/\/$/, ""));
  } else {
    localStorage.removeItem(KEY_API_URL);
  }
}

export function isApiConfigured(): boolean {
  return getApiUrl().length > 0;
}

// ── JWT helpers ───────────────────────────────────────────

export function getJwt(): string | null {
  return localStorage.getItem(KEY_JWT);
}

export function setJwt(token: string) {
  localStorage.setItem(KEY_JWT, token);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(KEY_JWT_REFRESH);
}

export function setRefreshToken(token: string) {
  localStorage.setItem(KEY_JWT_REFRESH, token);
}

export function clearTokens() {
  localStorage.removeItem(KEY_JWT);
  localStorage.removeItem(KEY_JWT_REFRESH);
}

// ── API error type ────────────────────────────────────────

export interface ApiError {
  message: string;
  status?: number;
  isNetworkError: boolean;
}

// ── Internal fetch wrapper ────────────────────────────────

async function apiFetch<T>(
  method: string,
  path: string,
  body?: unknown,
  retried = false,
): Promise<T> {
  const baseUrl = getApiUrl();
  if (!baseUrl) throw new Error("API not configured — running in offline mode");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const jwt = getJwt();
  if (jwt) headers.Authorization = `Bearer ${jwt}`;

  const init: RequestInit = { method, headers };
  if (body !== undefined) init.body = JSON.stringify(body);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, init);
  } catch (err) {
    throw {
      message: err instanceof Error ? err.message : "Network request failed",
      isNetworkError: true,
    } satisfies ApiError;
  }

  // Auto-refresh on 401
  if (res.status === 401 && !retried) {
    const refresh = getRefreshToken();
    if (refresh) {
      try {
        const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refresh }),
        });
        if (refreshRes.ok) {
          const data = (await refreshRes.json()) as { token: string };
          setJwt(data.token);
          return apiFetch<T>(method, path, body, true);
        }
      } catch {
        clearTokens();
      }
    }
  }

  if (!res.ok) {
    let message = `Request failed: ${res.status} ${res.statusText}`;
    try {
      const json = (await res.json()) as { message?: string };
      if (json.message) message = json.message;
    } catch {
      /* use status text */
    }
    throw {
      message,
      status: res.status,
      isNetworkError: false,
    } satisfies ApiError;
  }

  return res.json() as Promise<T>;
}

// ── Core typed API functions ──────────────────────────────

export async function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>("GET", path);
}

export async function apiPost<T, B = unknown>(
  path: string,
  body: B,
): Promise<T> {
  return apiFetch<T>("POST", path, body);
}

export async function apiPut<T, B = unknown>(
  path: string,
  body: B,
): Promise<T> {
  return apiFetch<T>("PUT", path, body);
}

export async function apiDelete<T>(path: string): Promise<T> {
  return apiFetch<T>("DELETE", path);
}

// ── Sync status endpoint ──────────────────────────────────

export interface SyncStatusResponse {
  status: "ok" | "error";
  version: string;
  db_version?: string;
  last_backup?: string;
  timestamp: string;
  message?: string;
}

export async function fetchSyncStatus(): Promise<SyncStatusResponse> {
  return apiGet<SyncStatusResponse>("/sync/status");
}

// ── Migration endpoint ────────────────────────────────────

export interface MigrateResponse {
  success: boolean;
  message: string;
  records_imported?: number;
}

export async function migrateLocalData(
  data: Record<string, unknown>,
): Promise<MigrateResponse> {
  const baseUrl = getApiUrl();
  if (!baseUrl) throw new Error("API not configured");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const jwt = getJwt();
  if (jwt) headers.Authorization = `Bearer ${jwt}`;

  const res = await fetch(`${baseUrl}/migrate.php`, {
    method: "POST",
    headers,
    body: JSON.stringify({ data }),
  });

  if (!res.ok)
    throw new Error(`Migration failed: ${res.status} ${res.statusText}`);
  return res.json() as Promise<MigrateResponse>;
}

// ── Connection test ───────────────────────────────────────

export interface ConnectionTestResult {
  connected: boolean;
  latencyMs: number;
  error?: string;
  version?: string;
  db_version?: string;
}

export async function testConnection(
  overrideUrl?: string,
): Promise<ConnectionTestResult> {
  const urlToTest = overrideUrl?.replace(/\/$/, "") ?? getApiUrl();
  if (!urlToTest) {
    return { connected: false, latencyMs: 0, error: "No API URL configured" };
  }

  const start = performance.now();
  try {
    const headers: Record<string, string> = {};
    const jwt = getJwt();
    if (jwt) headers.Authorization = `Bearer ${jwt}`;

    const res = await fetch(`${urlToTest}/sync/status`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(8_000),
    });
    const latencyMs = Math.round(performance.now() - start);

    if (!res.ok) {
      return {
        connected: false,
        latencyMs,
        error: `HTTP ${res.status} ${res.statusText}`,
      };
    }

    const data = (await res.json()) as SyncStatusResponse;
    if (data?.status === "ok") {
      return {
        connected: true,
        latencyMs,
        version: data.version,
        db_version: data.db_version,
      };
    }
    return {
      connected: false,
      latencyMs,
      error: data?.message ?? "Unexpected response",
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      connected: false,
      latencyMs,
      error: err instanceof Error ? err.message : "Connection failed",
    };
  }
}
