/**
 * SHUBH SCHOOL ERP — cPanel MySQL API Client
 *
 * Uses DIRECT FILE ROUTING — no .htaccess needed.
 * ALL API calls go to: https://shubh.psmkgs.com/api/index.php?route=ROUTE_NAME
 */

// ── Fixed API endpoint ─────────────────────────────────────
export const API_BASE = "https://shubh.psmkgs.com/api/index.php";

// ── Key constants (sessionStorage for auth, localStorage for config) ──
const KEY_API_BASE = "shubh_erp_api_base_url";
const KEY_API_URL = "shubh_erp_api_url"; // legacy key
const KEY_JWT = "shubh_erp_jwt_token";
const KEY_JWT_REFRESH = "shubh_erp_jwt_refresh_token";

const DEFAULT_BASE_URL = "https://shubh.psmkgs.com";

// ── URL Migration (auto-correct old wrong URL formats) ─────
(function migrateApiUrl() {
  try {
    const oldStored = localStorage.getItem(KEY_API_URL);
    if (oldStored) {
      let base = oldStored
        .replace(/\/api\/index\.php.*$/, "")
        .replace(/\/api\/?$/, "")
        .replace(/\/$/, "");
      if (base.includes("psmkgs.com") && !base.includes("shubh.psmkgs.com")) {
        base = DEFAULT_BASE_URL;
      }
      if (base) localStorage.setItem(KEY_API_BASE, base);
      localStorage.removeItem(KEY_API_URL);
    }
    const base = localStorage.getItem(KEY_API_BASE);
    if (base) {
      if (base.includes("psmkgs.com") && !base.includes("shubh.psmkgs.com")) {
        localStorage.setItem(KEY_API_BASE, DEFAULT_BASE_URL);
      }
    }
  } catch {
    // ignore
  }
})();

// ── URL helpers ────────────────────────────────────────────

export function getBaseUrl(): string {
  const stored = localStorage.getItem(KEY_API_BASE);
  if (stored) {
    const clean = stored
      .replace(/\/api\/index\.php.*$/, "")
      .replace(/\/api\/?$/, "")
      .replace(/\/$/, "");
    if (clean.includes("psmkgs.com") && !clean.includes("shubh.psmkgs.com")) {
      localStorage.setItem(KEY_API_BASE, DEFAULT_BASE_URL);
      return DEFAULT_BASE_URL;
    }
    return clean;
  }
  return DEFAULT_BASE_URL;
}

export function getApiIndexUrl(): string {
  return `${getBaseUrl()}/api/index.php`;
}

/** @deprecated Use getBaseUrl() + getApiIndexUrl() */
export function getApiUrl(): string {
  return `${getBaseUrl()}/api`;
}

export function getDefaultApiUrl(): string {
  return DEFAULT_BASE_URL;
}

export function setApiUrl(rawUrl: string) {
  if (!rawUrl) {
    localStorage.removeItem(KEY_API_BASE);
    return;
  }
  const clean = rawUrl
    .replace(/\/api\/index\.php.*$/, "")
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");
  localStorage.setItem(KEY_API_BASE, clean);
}

export function isApiConfigured(): boolean {
  return getBaseUrl().length > 0;
}

// ── JWT helpers ────────────────────────────────────────────

export function getJwt(): string | null {
  // Prefer sessionStorage (auth token), fall back to localStorage for compat
  return sessionStorage.getItem(KEY_JWT) ?? localStorage.getItem(KEY_JWT);
}

export function setJwt(token: string) {
  sessionStorage.setItem(KEY_JWT, token);
  // Also store in localStorage for tabs that may not have sessionStorage synced
  try {
    localStorage.setItem(KEY_JWT, token);
  } catch {
    // ignore
  }
}

export function getRefreshToken(): string | null {
  return (
    sessionStorage.getItem(KEY_JWT_REFRESH) ??
    localStorage.getItem(KEY_JWT_REFRESH)
  );
}

export function setRefreshToken(token: string) {
  sessionStorage.setItem(KEY_JWT_REFRESH, token);
  try {
    localStorage.setItem(KEY_JWT_REFRESH, token);
  } catch {
    // ignore
  }
}

export function clearTokens() {
  sessionStorage.removeItem(KEY_JWT);
  sessionStorage.removeItem(KEY_JWT_REFRESH);
  localStorage.removeItem(KEY_JWT);
  localStorage.removeItem(KEY_JWT_REFRESH);
}

// ── JWT payload decoder ────────────────────────────────────

interface JwtPayload {
  sub?: string;
  role?: string;
  school_id?: string | number;
  exp?: number;
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

export function getJwtRole(): string | null {
  const token = getJwt();
  if (!token) return null;
  return decodeJwtPayload(token)?.role ?? null;
}

export function getSchoolId(): string {
  const token = getJwt();
  if (token) {
    const payload = decodeJwtPayload(token);
    if (payload?.school_id) return String(payload.school_id);
  }
  return "1";
}

export function isJwtExpired(): boolean {
  const token = getJwt();
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  return payload.exp < Math.floor(Date.now() / 1000);
}

// ── Credential storage helpers ─────────────────────────────

export function storeServerCredentials(username: string, password: string) {
  try {
    localStorage.setItem("shubh_server_username", username);
    localStorage.setItem("shubh_server_password", password);
  } catch {
    // ignore
  }
}

export function getStoredServerPassword(): string {
  try {
    return localStorage.getItem("shubh_server_password") ?? "admin123";
  } catch {
    return "admin123";
  }
}

export function getStoredServerUsername(): string {
  try {
    return localStorage.getItem("shubh_server_username") ?? "superadmin";
  } catch {
    return "superadmin";
  }
}

// ── API error type ─────────────────────────────────────────

export interface ApiError {
  message: string;
  status?: number;
  isNetworkError: boolean;
  isSuperAdminOnly?: boolean;
}

// ── Safe JSON parser ───────────────────────────────────────

async function safeParseJson<T>(res: Response): Promise<T> {
  const ct = res.headers.get("content-type") ?? "";

  if (ct.includes("text/html") || ct.includes("application/xhtml")) {
    throw new Error(
      "Server returned an HTML page instead of JSON. " +
        "Upload api/index.php to cPanel public_html/api/ and visit " +
        "/api/index.php?route=migrate/run to set up the database.",
    );
  }

  let text = "";
  try {
    text = await res.text();
  } catch {
    throw new Error("Could not read response from server.");
  }

  const trimmed = text.trimStart();
  if (trimmed.startsWith("<") || trimmed.startsWith("<!")) {
    throw new Error(
      "Server returned HTML instead of JSON. " +
        "Upload api/index.php to cPanel public_html/api/. No .htaccess required.",
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `Invalid JSON from server. Response: ${trimmed.substring(0, 200)}`,
    );
  }
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// ── Backend login ──────────────────────────────────────────

export interface BackendLoginResult {
  success: boolean;
  role?: string;
  error?: string;
  token?: string;
  refreshToken?: string;
}

export async function backendLogin(
  username: string,
  password: string,
): Promise<BackendLoginResult> {
  const indexUrl = getApiIndexUrl();
  if (!indexUrl) return { success: false, error: "No API URL configured" };

  try {
    const url = `${indexUrl}?route=auth/login`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.trim(),
        password: password.trim(),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("text/html")) {
      return {
        success: false,
        error:
          "Server returned HTML. Upload api/index.php to cPanel public_html/api/ and visit /api/index.php?route=migrate/run.",
      };
    }

    let raw = "";
    try {
      raw = await res.text();
    } catch {
      return { success: false, error: "Could not read server response" };
    }

    const trimmed = raw.trimStart();
    if (trimmed.startsWith("<") || trimmed.startsWith("<!")) {
      return {
        success: false,
        error:
          "Server returned HTML error page. Check that api/index.php is uploaded to cPanel public_html/api/.",
      };
    }

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {
        success: false,
        error: `Invalid JSON from server. Response: ${raw.substring(0, 200)}`,
      };
    }

    const nestedData = (parsed.data ?? {}) as Record<string, unknown>;
    const token: string =
      (parsed.token as string) ?? (nestedData.token as string) ?? "";
    const refreshToken: string =
      (parsed.refresh_token as string) ??
      (nestedData.refresh_token as string) ??
      "";
    const user = (parsed.user ?? nestedData.user ?? {}) as Record<
      string,
      unknown
    >;
    const role: string =
      (parsed.role as string) ??
      (nestedData.role as string) ??
      (user.role as string) ??
      "";
    const serverMsg: string =
      (parsed.message as string) ?? (nestedData.message as string) ?? "";

    if (res.ok && token) {
      setJwt(token);
      if (refreshToken) setRefreshToken(refreshToken);
      storeServerCredentials(username.trim(), password.trim());
      try {
        const passwords = JSON.parse(
          localStorage.getItem("shubh_erp_user_passwords") ?? "{}",
        ) as Record<string, string>;
        passwords[username.trim()] = password.trim();
        localStorage.setItem(
          "shubh_erp_user_passwords",
          JSON.stringify(passwords),
        );
      } catch {
        // ignore
      }
      return { success: true, role, token, refreshToken };
    }

    const errorMsg =
      serverMsg ||
      (parsed.status === "error"
        ? "Invalid username or password"
        : `Auth failed: HTTP ${res.status}`);
    return { success: false, error: errorMsg };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Network error during login";
    if (msg.includes("timeout") || msg.includes("AbortError")) {
      return {
        success: false,
        error: "Connection timed out. Check the API URL.",
      };
    }
    return { success: false, error: msg };
  }
}

// ── Clean API client (WhatsApp-style sync) ─────────────────
// These functions use the fixed API_BASE and accept an explicit authToken

export async function apiCall<T = unknown>(
  route: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body: unknown = null,
  authToken: string | null = null,
): Promise<T> {
  const url = `${API_BASE}?route=${encodeURIComponent(route)}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const init: RequestInit = { method, headers };
  if (body !== null && method !== "GET") init.body = JSON.stringify(body);

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    throw {
      message: err instanceof Error ? err.message : "Network request failed",
      isNetworkError: true,
    } satisfies ApiError;
  }

  return safeParseJson<T>(res);
}

export async function apiLogin(
  username: string,
  password: string,
): Promise<{
  token: string;
  refreshToken: string;
  user: Record<string, unknown>;
}> {
  const result = await apiCall<Record<string, unknown>>("auth/login", "POST", {
    username,
    password,
  });
  const data = (result.data ?? result) as Record<string, unknown>;
  const token = (data.token ?? result.token ?? "") as string;
  const refreshToken = (data.refresh_token ??
    result.refresh_token ??
    "") as string;
  const user = (data.user ?? result.user ?? {}) as Record<string, unknown>;
  return { token, refreshToken, user };
}

export async function apiVerifyToken(
  token: string,
): Promise<{ valid: boolean; user: Record<string, unknown> }> {
  const result = await apiCall<Record<string, unknown>>(
    "auth/verify",
    "GET",
    null,
    token,
  );
  return {
    valid: (result.valid as boolean) ?? result.status === "ok",
    user: (result.user ?? result.data ?? {}) as Record<string, unknown>,
  };
}

export async function apiRefreshToken(
  refreshToken: string,
): Promise<{ token: string }> {
  const result = await apiCall<Record<string, unknown>>(
    "auth/refresh",
    "POST",
    {
      refresh_token: refreshToken,
    },
  );
  return {
    token: (result.token ??
      (result.data as Record<string, unknown>)?.token ??
      "") as string,
  };
}

export async function apiLogout(token: string): Promise<void> {
  await apiCall("auth/logout", "POST", null, token);
}

export async function apiChangePassword(
  userId: string,
  oldPassword: string,
  newPassword: string,
  token: string,
): Promise<void> {
  await apiCall(
    "auth/change-password",
    "POST",
    { userId, oldPassword, newPassword },
    token,
  );
}

/** Fetch ALL collections in one request — the WhatsApp-style initial load */
export async function apiFetchAll(
  token: string,
): Promise<Record<string, unknown[]>> {
  try {
    const result = await apiCall<Record<string, unknown>>(
      "sync/all",
      "GET",
      null,
      token,
    );
    const data = (result.data ?? result) as Record<string, unknown>;
    // Normalize: each key should be an array
    const out: Record<string, unknown[]> = {};
    for (const [key, val] of Object.entries(data)) {
      if (Array.isArray(val)) {
        out[key] = val;
      }
    }
    return out;
  } catch {
    // sync/all may not exist yet — fall back to empty
    return {};
  }
}

export async function apiFetchSyncStatus(): Promise<SyncStatusResponse> {
  return apiCall<SyncStatusResponse>("sync/status");
}

export async function apiPushBatch(
  collections: Record<string, unknown[]>,
  token: string,
): Promise<Record<string, { pushed: number; errors: string[] }>> {
  const result = await apiCall<Record<string, unknown>>(
    "sync/push-batch",
    "POST",
    { collections },
    token,
  );
  const data = (result.data ?? result) as Record<string, unknown>;
  return data as Record<string, { pushed: number; errors: string[] }>;
}

export async function apiListRecords<T>(
  collection: string,
  params: Record<string, string | number> = {},
  token: string | null = null,
): Promise<T[]> {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  ).toString();
  const route = qs ? `data/${collection}?${qs}` : `data/${collection}`;
  const result = await apiCall<Record<string, unknown>>(
    route,
    "GET",
    null,
    token,
  );
  const data = result.data ?? result;
  if (Array.isArray(data)) return data as T[];
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as Record<string, unknown>).rows)
  ) {
    return (data as { rows: T[] }).rows;
  }
  return [];
}

export async function apiGetRecord<T>(
  collection: string,
  id: string | number,
  token: string | null = null,
): Promise<T> {
  const result = await apiCall<Record<string, unknown>>(
    `data/${collection}/${id}`,
    "GET",
    null,
    token,
  );
  return (result.data ?? result) as T;
}

export async function apiCreateRecord<T extends Record<string, unknown>>(
  collection: string,
  data: T,
  token: string | null = null,
): Promise<{ id: number | string }> {
  const result = await apiCall<Record<string, unknown>>(
    `data/${collection}`,
    "POST",
    data,
    token,
  );
  const d = (result.data ?? result) as Record<string, unknown>;
  return { id: (d.id ?? d.insertId ?? 0) as number | string };
}

export async function apiUpdateRecord<T extends Record<string, unknown>>(
  collection: string,
  id: string | number,
  data: T,
  token: string | null = null,
): Promise<void> {
  await apiCall(`data/${collection}/${id}`, "PUT", data, token);
}

export async function apiDeleteRecord(
  collection: string,
  id: string | number,
  token: string | null = null,
): Promise<void> {
  await apiCall(`data/${collection}/${id}`, "DELETE", null, token);
}

export async function apiBatchRecords<T extends Record<string, unknown>>(
  collection: string,
  records: T[],
  token: string | null = null,
): Promise<{ pushed: number; errors: string[] }> {
  const result = await apiCall<Record<string, unknown>>(
    "sync/batch",
    "POST",
    { collection, items: records },
    token,
  );
  const d = (result.data ?? result) as Record<string, unknown>;
  return {
    pushed: (d.pushed as number) ?? 0,
    errors: (d.errors as string[]) ?? [],
  };
}

export async function apiGetPermissions(
  role: string,
  token: string,
): Promise<Record<string, unknown>> {
  const result = await apiCall<Record<string, unknown>>(
    `permissions/get?role=${encodeURIComponent(role)}`,
    "GET",
    null,
    token,
  );
  return (result.data ?? result) as Record<string, unknown>;
}

export async function apiUpdatePermissions(
  role: string,
  permissions: Record<string, unknown>,
  token: string,
): Promise<void> {
  await apiCall("permissions/update", "POST", { role, permissions }, token);
}

export async function apiGetChangelog(token: string): Promise<unknown[]> {
  const result = await apiCall<Record<string, unknown>>(
    "changelog/list",
    "GET",
    null,
    token,
  );
  const data = result.data ?? result;
  return Array.isArray(data) ? data : [];
}

export async function apiExportBackup(
  token: string,
): Promise<Record<string, unknown>> {
  return apiCall<Record<string, unknown>>("backup/export", "GET", null, token);
}

export async function apiImportBackup(
  data: Record<string, unknown>,
  token: string,
): Promise<void> {
  await apiCall("backup/import", "POST", data, token);
}

export async function apiRunMigration(): Promise<{
  message: string;
  success: boolean;
}> {
  return apiCall<{ message: string; success: boolean }>("migrate/run");
}

export async function apiResetDb(): Promise<{ message: string }> {
  return apiCall<{ message: string }>("migrate/reset-db");
}

export async function apiResetSuperAdmin(): Promise<{ message: string }> {
  return apiCall<{ message: string }>("migrate/reset-superadmin");
}

export async function apiHealthCheck(): Promise<{
  status: string;
  dbConnected: boolean;
}> {
  return apiCall<{ status: string; dbConnected: boolean }>("health");
}

// ── Auto-login helper ──────────────────────────────────────

let _autoLoginInProgress = false;

async function ensureAuthenticated(): Promise<void> {
  const jwt = getJwt();
  if (jwt && !isJwtExpired()) return;

  if (_autoLoginInProgress) return;
  _autoLoginInProgress = true;

  try {
    const storedUser = getStoredServerUsername();
    const storedPass = getStoredServerPassword();
    if (storedUser && storedPass) {
      await backendLogin(storedUser, storedPass);
      return;
    }

    const currentUserRaw = localStorage.getItem("shubh_erp_current_user");
    if (!currentUserRaw) return;

    let username = "";
    try {
      const user = JSON.parse(currentUserRaw) as {
        username?: string;
        role?: string;
      };
      if (user.role !== "superadmin") return;
      username = user.username ?? "superadmin";
    } catch {
      return;
    }

    const passwords = (() => {
      try {
        return JSON.parse(
          localStorage.getItem("shubh_erp_user_passwords") ?? "{}",
        ) as Record<string, string>;
      } catch {
        return {} as Record<string, string>;
      }
    })();
    const password = passwords[username] ?? "admin123";
    await backendLogin(username, password);
  } finally {
    _autoLoginInProgress = false;
  }
}

// ── Internal fetch wrapper ─────────────────────────────────
// Uses ?route= query string — NO .htaccess needed.

async function apiFetch<T>(
  method: string,
  route: string,
  body?: unknown,
  retried = false,
): Promise<T> {
  const indexUrl = getApiIndexUrl();
  if (!indexUrl)
    throw new Error("API not configured — running in offline mode");

  const isAuthEndpoint = route.startsWith("auth/");
  if (!isAuthEndpoint && !retried) {
    await ensureAuthenticated();
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-School-ID": getSchoolId(),
  };
  const jwt = getJwt();
  if (jwt) headers.Authorization = `Bearer ${jwt}`;

  const cleanRoute = route.replace(/^\/+/, "");
  const url = `${indexUrl}?route=${encodeURIComponent(cleanRoute)}`;

  const init: RequestInit = { method, headers };
  if (body !== undefined) init.body = JSON.stringify(body);

  let res: Response;
  try {
    res = await fetch(url, init);
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
        const refreshUrl = `${indexUrl}?route=auth/refresh`;
        const refreshRes = await fetch(refreshUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refresh }),
        });
        if (refreshRes.ok) {
          const data = await safeParseJson<{ token: string }>(refreshRes);
          setJwt(data.token);
          return apiFetch<T>(method, route, body, true);
        }
      } catch {
        clearTokens();
      }
    }
    const storedUser = getStoredServerUsername();
    const storedPass = getStoredServerPassword();
    if (storedUser && storedPass) {
      const loginResult = await backendLogin(storedUser, storedPass);
      if (loginResult.success) {
        return apiFetch<T>(method, route, body, true);
      }
    }
    if (!retried) {
      await ensureAuthenticated();
      return apiFetch<T>(method, route, body, true);
    }
  }

  if (!res.ok) {
    let message = `Request failed: ${res.status} ${res.statusText}`;
    let isSuperAdminOnly = false;
    try {
      const json = await safeParseJson<{ message?: string; status?: string }>(
        res,
      );
      if (json.message) {
        message = json.message;
        isSuperAdminOnly =
          message.toLowerCase().includes("super admin") ||
          message.toLowerCase().includes("superadmin") ||
          message.toLowerCase().includes("unauthorized");
      }
    } catch {
      /* use status text */
    }
    throw {
      message,
      status: res.status,
      isNetworkError: false,
      isSuperAdminOnly,
    } satisfies ApiError;
  }

  return safeParseJson<T>(res);
}

// ── Core typed API functions ───────────────────────────────

export async function apiGet<T>(route: string): Promise<T> {
  return apiFetch<T>("GET", route);
}

export async function apiPost<T, B = unknown>(
  route: string,
  body: B,
): Promise<T> {
  return apiFetch<T>("POST", route, body);
}

export async function apiPut<T, B = unknown>(
  route: string,
  body: B,
): Promise<T> {
  return apiFetch<T>("PUT", route, body);
}

export async function apiDelete<T>(route: string): Promise<T> {
  return apiFetch<T>("DELETE", route);
}

// ── Generic collection CRUD ────────────────────────────────

export interface CollectionListResult<T> {
  rows: T[];
  total: number;
  limit: number;
  offset: number;
}

async function fetchCollectionPage<T>(
  collection: string,
  offset: number,
  pageSize: number,
  filters?: Record<string, string | number>,
): Promise<{ rows: T[]; total: number }> {
  const params = new URLSearchParams({
    limit: String(pageSize),
    offset: String(offset),
    ...Object.fromEntries(
      Object.entries(filters ?? {}).map(([k, v]) => [k, String(v)]),
    ),
  });

  const indexUrl = getApiIndexUrl();
  const url = `${indexUrl}?route=data/${collection}&${params.toString()}`;

  await ensureAuthenticated();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-School-ID": getSchoolId(),
  };
  const jwt = getJwt();
  if (jwt) headers.Authorization = `Bearer ${jwt}`;

  const res = await fetch(url, { method: "GET", headers });

  const parsed = await safeParseJson<{
    status?: string;
    total?: number;
    data?: CollectionListResult<T> | T[];
    rows?: T[];
  }>(res);

  let rows: T[];
  let total = 0;

  if (Array.isArray(parsed.data)) {
    rows = parsed.data as T[];
    total = parsed.total ?? rows.length;
  } else if (
    parsed.data &&
    Array.isArray((parsed.data as CollectionListResult<T>).rows)
  ) {
    const paged = parsed.data as CollectionListResult<T>;
    rows = paged.rows;
    total = paged.total ?? rows.length;
  } else if (Array.isArray(parsed.rows)) {
    rows = parsed.rows;
    total = parsed.total ?? rows.length;
  } else {
    rows = [];
    total = 0;
  }

  return { rows, total };
}

const BULK_PAGE_SIZE = 5000;

export async function fetchCollection<T>(
  collection: string,
  filters?: Record<string, string | number>,
): Promise<T[]> {
  const first = await fetchCollectionPage<T>(
    collection,
    0,
    BULK_PAGE_SIZE,
    filters,
  );

  if (first.rows.length === 0) return [];
  if (first.rows.length < BULK_PAGE_SIZE) return first.rows;

  const reportedTotal = first.total > first.rows.length ? first.total : 0;

  if (reportedTotal === 0) {
    const allRows: T[] = [...first.rows];
    let offset = BULK_PAGE_SIZE;
    for (;;) {
      const page = await fetchCollectionPage<T>(
        collection,
        offset,
        BULK_PAGE_SIZE,
        filters,
      );
      allRows.push(...page.rows);
      if (page.rows.length < BULK_PAGE_SIZE) break;
      offset += BULK_PAGE_SIZE;
    }
    return deduplicateRows(allRows);
  }

  const remainingOffsets: number[] = [];
  for (
    let offset = BULK_PAGE_SIZE;
    offset < reportedTotal;
    offset += BULK_PAGE_SIZE
  ) {
    remainingOffsets.push(offset);
  }

  const pageResults = await Promise.allSettled(
    remainingOffsets.map((offset) =>
      fetchCollectionPage<T>(collection, offset, BULK_PAGE_SIZE, filters),
    ),
  );

  const allRows: T[] = [...first.rows];
  for (const result of pageResults) {
    if (result.status === "fulfilled") {
      allRows.push(...result.value.rows);
    }
  }

  return deduplicateRows(allRows);
}

function deduplicateRows<T>(rows: T[]): T[] {
  const seen = new Map<unknown, T>();
  for (const row of rows) {
    const r = row as Record<string, unknown>;
    const key = r.id ?? r.admNo ?? r.empId ?? JSON.stringify(row);
    seen.set(key, row);
  }
  return Array.from(seen.values());
}

export async function saveCollectionItem<T extends Record<string, unknown>>(
  collection: string,
  item: T,
): Promise<{ id: number }> {
  return apiFetch<{ id: number }>("POST", `data/${collection}`, item);
}

export async function updateCollectionItem<T extends Record<string, unknown>>(
  collection: string,
  id: string | number,
  item: T,
): Promise<void> {
  await apiFetch<void>("PUT", `data/${collection}/${id}`, item);
}

export async function deleteCollectionItem(
  collection: string,
  id: string | number,
): Promise<void> {
  await apiFetch<void>("DELETE", `data/${collection}/${id}`);
}

export async function syncAllCollections(
  collectionNames: string[],
): Promise<Record<string, unknown[]>> {
  const results = await Promise.allSettled(
    collectionNames.map((name) =>
      fetchCollection<unknown>(name).then((rows) => ({ name, rows })),
    ),
  );
  const out: Record<string, unknown[]> = {};
  for (const result of results) {
    if (result.status === "fulfilled") {
      out[result.value.name] = result.value.rows;
    }
  }
  return out;
}

// ── Sync status endpoint ───────────────────────────────────

export interface SyncStatusResponse {
  status: "ok" | "error";
  version: string;
  db_version?: string;
  last_backup?: string;
  timestamp: string;
  counts?: Record<string, number>;
  message?: string;
}

export async function fetchSyncStatus(): Promise<SyncStatusResponse> {
  const indexUrl = getApiIndexUrl();
  const url = `${indexUrl}?route=sync/status`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : "Cannot reach server");
  }

  return safeParseJson<SyncStatusResponse>(res);
}

// ── Migration endpoint ─────────────────────────────────────

export interface MigrateResponse {
  success: boolean;
  message: string;
  records_imported?: number;
}

export async function migrateLocalData(
  data: Record<string, unknown>,
): Promise<MigrateResponse> {
  const indexUrl = getApiIndexUrl();
  if (!isValidUrl(getBaseUrl())) {
    return {
      success: false,
      message: "Database Server URL is invalid. It must start with https://.",
    };
  }

  await ensureAuthenticated();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-School-ID": getSchoolId(),
  };
  const jwt = getJwt();
  if (jwt) headers.Authorization = `Bearer ${jwt}`;

  try {
    const res = await fetch(`${indexUrl}?route=migrate/run`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data }),
    });

    if (!res.ok) {
      try {
        const ct = res.headers.get("content-type") ?? "";
        if (!ct.includes("text/html")) {
          const json = (await res.json()) as { message?: string };
          if (json.message) return { success: false, message: json.message };
        }
      } catch {
        /* ignore */
      }
      return {
        success: false,
        message: `Migration failed: HTTP ${res.status} ${res.statusText}`,
      };
    }
    return await safeParseJson<MigrateResponse>(res);
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Migration failed due to a network error.",
    };
  }
}

// ── Batch push ─────────────────────────────────────────────

export interface BatchPushResult {
  pushed: number;
  total: number;
  errors: string[];
  collection: string;
  table?: string;
}

export async function batchPushCollection(
  collection: string,
  items: unknown[],
): Promise<BatchPushResult> {
  const raw = await apiFetch<unknown>("POST", "sync/batch", {
    collection,
    items,
  });
  const r = raw as Record<string, unknown>;
  if (typeof r.pushed === "number") {
    return r as unknown as BatchPushResult;
  }
  const d = (r.data ?? r) as Record<string, unknown>;
  return {
    pushed: (d.pushed as number) ?? 0,
    total: (d.total as number) ?? items.length,
    errors: (d.errors as string[]) ?? [],
    collection: (d.collection as string) ?? collection,
    table: d.table as string | undefined,
  };
}

// ── Connection test ────────────────────────────────────────

export interface ConnectionTestResult {
  connected: boolean;
  latencyMs: number;
  error?: string;
  version?: string;
  db_version?: string;
  authRole?: string | null;
}

export async function testConnection(
  overrideBaseUrl?: string,
): Promise<ConnectionTestResult> {
  let base = overrideBaseUrl ?? getBaseUrl();
  base = base
    .replace(/\/api\/index\.php.*$/, "")
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");

  if (!base) {
    return { connected: false, latencyMs: 0, error: "No API URL configured" };
  }
  if (!isValidUrl(base)) {
    return {
      connected: false,
      latencyMs: 0,
      error: "URL is invalid. It must start with http:// or https://.",
    };
  }

  const testUrl = `${base}/api/index.php?route=sync/status`;
  const start = performance.now();
  try {
    const res = await fetch(testUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    const latencyMs = Math.round(performance.now() - start);

    let data: SyncStatusResponse | null = null;
    try {
      data = await safeParseJson<SyncStatusResponse>(res);
    } catch (parseErr) {
      const errMsg = parseErr instanceof Error ? parseErr.message : "";
      const isHtml = errMsg.includes("HTML") || errMsg.includes("<!DOCTYPE");
      return {
        connected: false,
        latencyMs,
        error: isHtml
          ? "Server returned HTML. Upload api/index.php to cPanel public_html/api/ and visit /api/index.php?route=migrate/run."
          : errMsg ||
            "API file not found. Upload api/index.php to public_html/api/ on cPanel.",
      };
    }

    if (data?.status === "ok") {
      return {
        connected: true,
        latencyMs,
        version: data.version,
        db_version: data.db_version,
        authRole: getJwtRole(),
      };
    }
    return {
      connected: false,
      latencyMs,
      error: data?.message ?? "Unexpected response from server",
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    const msg = err instanceof Error ? err.message : "Connection failed";
    return { connected: false, latencyMs, error: msg };
  }
}
