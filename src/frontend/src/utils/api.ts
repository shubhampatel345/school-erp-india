/**
 * SHUBH SCHOOL ERP — cPanel MySQL API Client
 *
 * Uses DIRECT FILE ROUTING — no .htaccess needed.
 * ALL API calls go to: {baseUrl}/api/index.php?route=ROUTE_NAME
 *
 * Storage keys:
 *   shubh_erp_api_base_url      — base URL e.g. https://shubh.psmkgs.com
 *   shubh_erp_jwt_token         — JWT returned by auth/login
 *   shubh_erp_jwt_refresh_token — refresh token
 */

// ── Key constants ─────────────────────────────────────────
const KEY_API_URL = "shubh_erp_api_url";
const KEY_API_BASE = "shubh_erp_api_base_url";
const KEY_JWT = "shubh_erp_jwt_token";
const KEY_JWT_REFRESH = "shubh_erp_jwt_refresh_token";

/** Default base domain — NO /api suffix here */
const DEFAULT_BASE_URL = "https://shubh.psmkgs.com";

// ── URL Migration (auto-correct old wrong URL formats) ────────────────
(function migrateApiUrl() {
  try {
    // Migrate from old KEY_API_URL that stored the full /api path
    const oldStored = localStorage.getItem(KEY_API_URL);
    if (oldStored) {
      // Extract the base domain from whatever was stored
      let base = oldStored
        .replace(/\/api\/index\.php.*$/, "")
        .replace(/\/api\/?$/, "")
        .replace(/\/$/, "");
      // Fix missing subdomain
      if (base.includes("psmkgs.com") && !base.includes("shubh.psmkgs.com")) {
        base = DEFAULT_BASE_URL;
      }
      if (base) {
        localStorage.setItem(KEY_API_BASE, base);
      }
      localStorage.removeItem(KEY_API_URL);
    }
    // Fix bad base URL
    const base = localStorage.getItem(KEY_API_BASE);
    if (base) {
      const needsFix =
        base.includes("psmkgs.com") && !base.includes("shubh.psmkgs.com");
      if (needsFix) {
        localStorage.setItem(KEY_API_BASE, DEFAULT_BASE_URL);
      }
    }
  } catch {
    // ignore
  }
})();

// ── URL helpers ───────────────────────────────────────────

/** Returns the stored base URL (e.g. https://shubh.psmkgs.com), never with /api */
export function getBaseUrl(): string {
  const stored = localStorage.getItem(KEY_API_BASE);
  if (stored) {
    // Strip any accidental /api suffix
    const clean = stored
      .replace(/\/api\/index\.php.*$/, "")
      .replace(/\/api\/?$/, "")
      .replace(/\/$/, "");
    // Auto-fix missing subdomain
    if (clean.includes("psmkgs.com") && !clean.includes("shubh.psmkgs.com")) {
      localStorage.setItem(KEY_API_BASE, DEFAULT_BASE_URL);
      return DEFAULT_BASE_URL;
    }
    return clean;
  }
  return DEFAULT_BASE_URL;
}

/** Returns the full path to index.php: {base}/api/index.php */
export function getApiIndexUrl(): string {
  return `${getBaseUrl()}/api/index.php`;
}

/**
 * @deprecated Use getBaseUrl() + getApiIndexUrl()
 * Legacy helper that returns base/api — kept for backward compatibility
 * in components that show the URL to the user.
 */
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
  // Accept either "https://domain.com" or "https://domain.com/api" — store just the base
  const clean = rawUrl
    .replace(/\/api\/index\.php.*$/, "")
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");
  localStorage.setItem(KEY_API_BASE, clean);
}

export function isApiConfigured(): boolean {
  return getBaseUrl().length > 0;
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

// ── JWT payload decoder ───────────────────────────────────

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

// ── Backend login ─────────────────────────────────────────

export interface BackendLoginResult {
  success: boolean;
  role?: string;
  error?: string;
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
          "Server returned an HTML page. The api/ folder is not uploaded to cPanel, or index.php is missing. Upload the api/ folder to public_html/ and visit /api/index.php?route=migrate/run to set up the database.",
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
          "Server returned an HTML error page instead of JSON. Check that api/index.php is uploaded to cPanel public_html/api/.",
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: Record<string, any> = {};
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {
        success: false,
        error: `Invalid JSON from server. Response was: ${raw.substring(0, 200)}`,
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

      try {
        const passwords = JSON.parse(
          localStorage.getItem("shubh_erp_user_passwords") ?? "{}",
        ) as Record<string, string>;
        passwords[username.trim()] = password.trim();
        localStorage.setItem(
          "shubh_erp_user_passwords",
          JSON.stringify(passwords),
        );
        localStorage.setItem("shubh_server_password", password.trim());
      } catch {
        // ignore
      }

      return { success: true, role };
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
        error:
          "Connection timed out. The server did not respond within 10 seconds. Check the API URL.",
      };
    }
    return { success: false, error: msg };
  }
}

// ── Auto-login helper ─────────────────────────────────────

let _autoLoginInProgress = false;

async function ensureAuthenticated(): Promise<void> {
  const jwt = getJwt();
  if (jwt && !isJwtExpired()) return;

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

  if (_autoLoginInProgress) return;
  _autoLoginInProgress = true;

  try {
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

// ── API error type ────────────────────────────────────────

export interface ApiError {
  message: string;
  status?: number;
  isNetworkError: boolean;
  isSuperAdminOnly?: boolean;
}

// ── Safe JSON parser ──────────────────────────────────────

async function safeParseJson<T>(res: Response): Promise<T> {
  const ct = res.headers.get("content-type") ?? "";

  if (ct.includes("text/html") || ct.includes("application/xhtml")) {
    throw new Error(
      "Server returned an HTML page instead of JSON. " +
        "This usually means the api/ folder is not uploaded to cPanel, " +
        "or api/index.php is missing. " +
        "Upload api/ to public_html/ and visit /api/index.php?route=migrate/run.",
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
        "Please upload api/index.php to your cPanel public_html/api/ directory. " +
        "No .htaccess required — use direct file routing.",
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `Invalid JSON from server. Response was: ${trimmed.substring(0, 200)}`,
    );
  }
}

// ── URL validator ─────────────────────────────────────────

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// ── Internal fetch wrapper ────────────────────────────────
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

  // Strip leading slash from route
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

// ── Core typed API functions ──────────────────────────────

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

// ── Generic collection CRUD ───────────────────────────────

export interface CollectionListResult<T> {
  rows: T[];
  total: number;
  limit: number;
  offset: number;
}

export async function fetchCollection<T>(
  collection: string,
  filters?: Record<string, string | number>,
): Promise<T[]> {
  const params = new URLSearchParams({
    limit: "500",
    ...Object.fromEntries(
      Object.entries(filters ?? {}).map(([k, v]) => [k, String(v)]),
    ),
  });

  // Build the full URL manually to combine route= and additional params
  const indexUrl = getApiIndexUrl();
  const url = `${indexUrl}?route=data/${collection}&${params.toString()}`;

  await ensureAuthenticated();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-School-ID": getSchoolId(),
  };
  const jwt = getJwt();
  if (jwt) headers.Authorization = `Bearer ${jwt}`;

  let res: Response;
  try {
    res = await fetch(url, { method: "GET", headers });
  } catch (err) {
    console.error(
      `[DataService] fetchCollection(${collection}) network error:`,
      err,
    );
    throw err;
  }

  const parsed = await safeParseJson<{
    status?: string;
    data?: CollectionListResult<T> | T[];
    rows?: T[];
  }>(res);

  // Support multiple response shapes:
  // { data: [...] }          — from handle_data_collection (json_success(array))
  // { data: { rows: [...] } } — legacy paginated shape
  // { rows: [...] }           — direct rows
  if (Array.isArray(parsed.data)) return parsed.data as T[];
  if (
    parsed.data &&
    Array.isArray((parsed.data as CollectionListResult<T>).rows)
  )
    return (parsed.data as CollectionListResult<T>).rows;
  if (Array.isArray(parsed.rows)) return parsed.rows;
  return [];
}

export async function saveCollectionItem<T extends Record<string, unknown>>(
  collection: string,
  item: T,
): Promise<{ id: number }> {
  return apiFetch<{ id: number }>("POST", `data/${collection}`, item);
}

export async function updateCollectionItem<T extends Record<string, unknown>>(
  collection: string,
  id: number,
  item: T,
): Promise<void> {
  await apiFetch<void>("PUT", `data/${collection}/${id}`, item);
}

export async function deleteCollectionItem(
  collection: string,
  id: number,
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
    } else {
      console.warn("[DataService] Failed to sync collection:", result.reason);
    }
  }
  return out;
}

// ── Sync status endpoint ──────────────────────────────────

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
  // Public endpoint — call directly without auth to avoid auth loops
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

// ── Migration endpoint ────────────────────────────────────

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

// ── Batch push ────────────────────────────────────────────

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
  // Use sync/batch for single-collection pushes — returns { pushed, total, errors, collection, table }
  // sync/push also accepts this format (via auto-redirect), but sync/batch is more explicit.
  const raw = await apiFetch<unknown>("POST", "sync/batch", {
    collection,
    items,
  });
  // Handle both direct shape { pushed, errors } and wrapped { data: { pushed, errors } }
  const r = raw as Record<string, unknown>;
  if (typeof r.pushed === "number") {
    return r as unknown as BatchPushResult;
  }
  // Unwrap nested data field if present
  const d = (r.data ?? r) as Record<string, unknown>;
  return {
    pushed: (d.pushed as number) ?? 0,
    total: (d.total as number) ?? items.length,
    errors: (d.errors as string[]) ?? [],
    collection: (d.collection as string) ?? collection,
    table: d.table as string | undefined,
  };
}

// ── Connection test ───────────────────────────────────────

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
  // Accept "https://domain.com/api" or "https://domain.com" — normalize to base
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
      error:
        "URL is invalid. It must start with http:// or https:// and be a valid web address.",
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
          ? "Server returned HTML instead of JSON. Upload api/index.php to cPanel public_html/api/ and visit /api/index.php?route=migrate/run to set up the database. No .htaccess required."
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
    return {
      connected: false,
      latencyMs,
      error: msg,
    };
  }
}
