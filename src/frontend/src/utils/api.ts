/**
 * SHUBH SCHOOL ERP — cPanel MySQL API Client
 *
 * Provides typed fetch-based wrappers for the PHP REST API.
 * Falls back to localStorage-only mode when no API URL is configured.
 *
 * Storage keys used:
 *   shubh_erp_api_url         — base URL e.g. https://yourschool.com/api
 *   shubh_erp_jwt_token       — JWT returned by /api/auth/login
 *   shubh_erp_jwt_refresh_token — refresh token for JWT auto-renewal
 */

// ── Key constants ─────────────────────────────────────────
const KEY_API_URL = "shubh_erp_api_url";
const KEY_JWT = "shubh_erp_jwt_token";
const KEY_JWT_REFRESH = "shubh_erp_jwt_refresh_token";

/** Production API default — used when no override is saved in localStorage */
const DEFAULT_API_URL = "https://shubh.psmkgs.com/api";

// ── URL Migration (auto-correct old wrong URLs on module load) ────────────────
// Covers all known bad URL patterns: missing subdomain, bare domain, http, etc.
(function migrateApiUrl() {
  try {
    const stored = localStorage.getItem(KEY_API_URL);
    if (!stored) return;
    const needsFix =
      stored === "https://psmkgs.com/api" ||
      stored === "https://psmkgs.com" ||
      stored === "http://psmkgs.com/api" ||
      stored === "http://psmkgs.com" ||
      stored === "psmkgs.com/api" ||
      stored === "psmkgs.com" ||
      stored.startsWith("https://psmkgs.com/") ||
      stored.startsWith("http://psmkgs.com/") ||
      // catches "psmkgs.com" without protocol prefix
      (stored.includes("psmkgs.com") && !stored.includes("shubh.psmkgs.com"));
    if (needsFix) {
      localStorage.setItem(KEY_API_URL, DEFAULT_API_URL);
    }
  } catch {
    // ignore — localStorage may not be available
  }
})();

// ── URL helpers ───────────────────────────────────────────

export function getApiUrl(): string {
  const stored = localStorage.getItem(KEY_API_URL);
  if (stored) {
    // Inline correction on every read — never return a bad URL
    const clean = stored.replace(/\/$/, "");
    if (clean.includes("psmkgs.com") && !clean.includes("shubh.psmkgs.com")) {
      localStorage.setItem(KEY_API_URL, DEFAULT_API_URL);
      return DEFAULT_API_URL;
    }
    return clean;
  }
  // Fall back to the production default so the app auto-connects on first load
  return DEFAULT_API_URL;
}

export function getDefaultApiUrl(): string {
  return DEFAULT_API_URL;
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
    // pad base64url to base64
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
  // expired if exp < now (seconds)
  return payload.exp < Math.floor(Date.now() / 1000);
}

// ── Backend login ─────────────────────────────────────────
// Attempts to log in to the backend and stores JWT on success.
// Returns true if successful, false if failed.
// Never throws — failures are silent (local auth continues to work).

export interface BackendLoginResult {
  success: boolean;
  role?: string;
  error?: string;
}

export async function backendLogin(
  username: string,
  password: string,
): Promise<BackendLoginResult> {
  const baseUrl = getApiUrl();
  if (!baseUrl) return { success: false, error: "No API URL configured" };

  try {
    const res = await fetch(`${baseUrl}/auth/login`, {
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
          "Server returned an HTML page. This means: (1) The api/ folder is not uploaded to cPanel, or (2) The .htaccess file is missing. Upload api/ to public_html/ and visit /api/migrate/run to set up the database.",
      };
    }

    let raw = "";
    try {
      raw = await res.text();
    } catch {
      return { success: false, error: "Could not read server response" };
    }

    // Guard against HTML slipping through (e.g. content-type not set by server)
    const trimmed = raw.trimStart();
    if (trimmed.startsWith("<") || trimmed.startsWith("<!")) {
      return {
        success: false,
        error:
          "Server returned an HTML error page instead of JSON. Check that the api/ folder is uploaded to cPanel and .htaccess is in place.",
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

    // The API wraps success in { status, message, data: { token, refresh_token, user } }
    // but some older builds return token at root level — handle both.
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

      // Store password so auto-re-auth works after token expiry
      try {
        const passwords = JSON.parse(
          localStorage.getItem("shubh_erp_user_passwords") ?? "{}",
        ) as Record<string, string>;
        passwords[username.trim()] = password.trim();
        localStorage.setItem(
          "shubh_erp_user_passwords",
          JSON.stringify(passwords),
        );
        // Also persist under 'shubh_server_password' for direct access
        localStorage.setItem("shubh_server_password", password.trim());
      } catch {
        // ignore localStorage errors
      }

      return { success: true, role };
    }

    // Failed login — return the exact server message so the UI can show it
    const errorMsg =
      serverMsg ||
      (parsed.status === "error"
        ? "Invalid username or password"
        : `Auth failed: HTTP ${res.status}`);
    return { success: false, error: errorMsg };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Network error during login";
    // Improve timeout message
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
// Called lazily before protected API calls when no JWT is present.
// Uses stored superadmin password (defaults to admin123).
// Returns false silently — the original call proceeds regardless.

let _autoLoginInProgress = false;

async function ensureAuthenticated(): Promise<void> {
  // Already have a valid JWT
  const jwt = getJwt();
  if (jwt && !isJwtExpired()) return;

  // Only attempt auto-login for superadmin
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

  // Prevent concurrent auto-login storms
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
// Checks BOTH content-type AND response body prefix before calling .json()
// so an HTML error page (404/403/500 from cPanel) never causes
// "Unexpected token '<', '<!DOCTYPE ...' is not valid JSON" crashes.

async function safeParseJson<T>(res: Response): Promise<T> {
  const ct = res.headers.get("content-type") ?? "";

  // Check content-type first
  if (ct.includes("text/html") || ct.includes("application/xhtml")) {
    throw new Error(
      "Server returned an HTML page instead of JSON. " +
        "This usually means the api/ folder is not uploaded to cPanel, " +
        "or the .htaccess rewrite rules are not working. " +
        "See api/README.md for setup instructions.",
    );
  }

  let text = "";
  try {
    text = await res.text();
  } catch {
    throw new Error("Could not read response from server.");
  }

  // Extra guard: if body starts with HTML tag regardless of content-type
  const trimmed = text.trimStart();
  if (trimmed.startsWith("<") || trimmed.startsWith("<!")) {
    throw new Error(
      "Server returned HTML instead of JSON. " +
        "Please upload the api/ folder to your cPanel public_html directory " +
        "and ensure mod_rewrite is enabled. See api/README.md.",
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

async function apiFetch<T>(
  method: string,
  path: string,
  body?: unknown,
  retried = false,
): Promise<T> {
  const baseUrl = getApiUrl();
  if (!baseUrl) throw new Error("API not configured — running in offline mode");

  // Ensure JWT before making protected calls (skip for auth endpoints)
  const isAuthEndpoint = path.startsWith("/auth/");
  if (!isAuthEndpoint && !retried) {
    await ensureAuthenticated();
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-School-ID": getSchoolId(),
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
          const data = await safeParseJson<{ token: string }>(refreshRes);
          setJwt(data.token);
          return apiFetch<T>(method, path, body, true);
        }
      } catch {
        clearTokens();
      }
    }
    // Attempt full re-login on 401 with no refresh token
    if (!retried) {
      await ensureAuthenticated();
      return apiFetch<T>(method, path, body, true);
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
  if (!baseUrl) {
    return {
      success: false,
      message:
        "Database Server URL is not configured. Go to Settings → Data Management to set it.",
    };
  }
  if (!isValidUrl(baseUrl)) {
    return {
      success: false,
      message:
        "Database Server URL is invalid. It must start with http:// or https://.",
    };
  }

  // Ensure we're authenticated before migrating
  await ensureAuthenticated();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-School-ID": getSchoolId(),
  };
  const jwt = getJwt();
  if (jwt) headers.Authorization = `Bearer ${jwt}`;

  try {
    const res = await fetch(`${baseUrl}/migrate/run`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data }),
    });

    if (!res.ok) {
      // Try to parse a meaningful error message
      try {
        const ct = res.headers.get("content-type") ?? "";
        if (!ct.includes("text/html")) {
          const json = (await res.json()) as { message?: string };
          if (json.message) {
            return { success: false, message: json.message };
          }
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
  overrideUrl?: string,
): Promise<ConnectionTestResult> {
  const urlToTest = overrideUrl?.replace(/\/$/, "") ?? getApiUrl();
  if (!urlToTest) {
    return { connected: false, latencyMs: 0, error: "No API URL configured" };
  }
  if (!isValidUrl(urlToTest)) {
    return {
      connected: false,
      latencyMs: 0,
      error:
        "URL is invalid. It must start with http:// or https:// and be a valid web address.",
    };
  }

  const start = performance.now();
  try {
    // sync/status is a public endpoint — no JWT or X-School-ID required
    const res = await fetch(`${urlToTest}/sync/status`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    const latencyMs = Math.round(performance.now() - start);

    // Even a non-200 is ok if it's JSON — parse it
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
          ? "Server returned an HTML page. This means either: (1) The api/ folder is not uploaded to cPanel, or (2) The api/.htaccess file is missing. Download your build and upload the public_html/api/ folder to cPanel, then try again."
          : errMsg ||
            "API files not found. Please upload the api/ folder to your cPanel hosting. See api/README.md for instructions.",
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
    // Add helpful hint for the most common error
    const hint =
      msg.includes("HTML") || msg.includes("JSON")
        ? ` Make sure api/ folder is uploaded to ${urlToTest.replace(/\/api$/, "")}/api/ on cPanel.`
        : "";
    return {
      connected: false,
      latencyMs,
      error: msg + hint,
    };
  }
}
