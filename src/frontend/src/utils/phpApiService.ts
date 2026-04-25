/**
 * SHUBH SCHOOL ERP — PHP API Service
 *
 * Calls the cPanel/PHP/MySQL backend at /api.
 * All data operations go through this service — no canister, no IC.
 *
 * Auth: JWT Bearer token stored in localStorage ('erp_token').
 * Token lifecycle:
 *   - isTokenExpired(): reads JWT exp field, returns true if expiring within 30s
 *   - ensureValidToken(): checks expiry, calls silentRefresh() if needed
 *     BUT: skips check if a fresh login happened in the last 10 minutes
 *   - silentRefresh(): tries /auth/refresh first, then re-login with stored creds
 *   - Every authenticated API call calls ensureValidToken() first
 * If all refresh methods fail, emits 'auth:token-expired' DOM event.
 *
 * API URL format: {serverUrl}/index.php?route=ROUTE_NAME
 * Default: 'https://shubh.psmkgs.com/api' (hardcoded for production).
 * Override via localStorage 'erp_server_url' for dev/testing.
 *
 * VALID ROUTES (must match backend exactly):
 * auth/login, auth/logout, auth/refresh, auth/me,
 * migrate/run,
 * students/list, students/get, students/add, students/update, students/delete,
 * students/import, students/count,
 * fees/headings, fees/headings/save, fees/headings/delete,
 * fees/plan, fees/plan/save,
 * fees/collect/student, fees/collect/save,
 * fees/receipts, fees/receipt, fees/receipt/delete,
 * fees/due, fees/collection-chart,
 * attendance/daily, attendance/save, attendance/summary, attendance/student,
 * attendance/face,
 * staff/list, staff/get, staff/add, staff/update, staff/delete, staff/import,
 * payroll/list, payroll/save, payroll/payslip,
 * academics/classes, academics/classes/save, academics/classes/delete,
 * academics/sections, academics/sections/save,
 * academics/subjects, academics/subjects/save, academics/subjects/delete,
 * academic-sessions/list, academic-sessions/create,
 * academic-sessions/set-current, academic-sessions/promote,
 * exams/list, exams/save, exams/timetable, exams/timetable/save,
 * exams/results, exams/results/save,
 * transport/routes, transport/routes/save, transport/routes/delete,
 * transport/buses, transport/buses/save,
 * transport/pickup-points, transport/pickup-points/save,
 * transport/driver-students,
 * library/books, library/books/add, library/books/update,
 * library/issue, library/return, library/overdue,
 * inventory/items, inventory/items/add, inventory/items/update,
 * inventory/items/delete, inventory/transactions/add,
 * communication/whatsapp/send, communication/broadcast-history,
 * communication/notification/schedule, communication/notifications,
 * communication/notifications/mark-read,
 * chat/rooms, chat/rooms/create, chat/messages, chat/messages/send,
 * dashboard/stats, dashboard/fee-chart, dashboard/recent-activity,
 * settings/all, settings/save, settings/users, settings/users/create,
 * settings/users/update, settings/users/delete, settings/users/reset-password,
 * reports/students, reports/finance, reports/attendance, reports/fee-register,
 * expenses, expenses/add, expenses/delete,
 * homework, homework/add, homework/delete,
 * backup/export, backup/import,
 * ping
 */

/**
 * Return the API base URL.
 * Hardcoded to https://shubh.psmkgs.com/api for production.
 * Can be overridden via localStorage 'erp_server_url' for dev/testing.
 */
function getApiBase(): string {
  try {
    const stored = localStorage.getItem("erp_server_url");
    if (stored) return stored.replace(/\/$/, "");
  } catch {
    /* noop */
  }
  return "https://shubh.psmkgs.com/api";
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  total?: number;
  page?: number;
}

export interface StudentListResult {
  data: StudentRecord[];
  total: number;
}

export interface StudentRecord extends Record<string, unknown> {
  id: string;
  admNo: string;
  fullName: string;
  class: string;
  section: string;
  sessionId?: string;
  fatherName?: string;
  fatherMobile?: string;
  motherName?: string;
  motherMobile?: string;
  guardianName?: string;
  guardianMobile?: string;
  mobile?: string;
  address?: string;
  dob?: string;
  gender?: string;
  status?: string;
  createdAt?: string;
}

export interface StaffRecord extends Record<string, unknown> {
  id: string;
  empId?: string;
  name: string;
  designation?: string;
  mobile?: string;
  email?: string;
  salary?: number;
  status?: string;
}

export interface ClassRecord extends Record<string, unknown> {
  id: string;
  className: string;
  sections: string[];
  displayOrder?: number;
}

export interface SessionRecord extends Record<string, unknown> {
  id: string;
  label: string;
  startYear: number;
  endYear: number;
  isActive: boolean;
  isArchived: boolean;
  createdAt?: string;
}

export interface FeeHeadingRecord extends Record<string, unknown> {
  id: string;
  name: string;
  months?: string[];
  amount?: number;
  isActive?: boolean;
}

export interface FeePlanRecord extends Record<string, unknown> {
  id: string;
  classId: string;
  sectionId?: string;
  headingId: string;
  headingName: string;
  amount: number;
  amounts?: Record<string, number>;
  sessionId?: string;
}

export interface FeeReceiptRecord extends Record<string, unknown> {
  id: string;
  receiptNo: string;
  studentId: string;
  studentName: string;
  date: string;
  totalAmount: number;
  paymentMode: string;
}

export interface AttendanceRecord extends Record<string, unknown> {
  id: string;
  studentId?: string;
  staffId?: string;
  date: string;
  status: string;
  class?: string;
  section?: string;
}

export interface LoginResult {
  token: string;
  refresh_token?: string;
  user: {
    id: string;
    username: string;
    role: string;
    fullName?: string;
    name?: string;
    permissions?: Record<string, Record<string, boolean>>;
  };
}

export interface StatsResult {
  students: number;
  staff: number;
  classes: number;
  fees_today: number;
}

// ── Token helpers ──────────────────────────────────────────────────────────────

/** Decode JWT payload (base64url) without verifying signature */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // Base64url → base64 → decode
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ── PhpApiService ──────────────────────────────────────────────────────────────

class PhpApiService {
  private token: string | null = null;
  /** True while a silent re-auth is in progress — prevents re-entrancy */
  private isRefreshing = false;
  /** Resolve/reject callbacks queued while refresh is in progress */
  private refreshQueue: Array<{
    resolve: (token: string | null) => void;
    reject: (err: Error) => void;
  }> = [];

  setToken(token: string | null): void {
    this.token = token;
    try {
      if (token) {
        localStorage.setItem("erp_token", token);
      } else {
        localStorage.removeItem("erp_token");
      }
    } catch {
      /* storage unavailable */
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    try {
      return localStorage.getItem("erp_token");
    } catch {
      return null;
    }
  }

  clearToken(): void {
    this.setToken(null);
    try {
      localStorage.removeItem("erp_refresh_token");
    } catch {
      /* noop */
    }
  }

  /** Store credentials for silent re-auth — called by Login on success */
  storeCredentials(username: string, password: string): void {
    try {
      localStorage.setItem("erp_username", username);
      localStorage.setItem("erp_password", password);
    } catch {
      /* storage unavailable */
    }
  }

  /** Store refresh token — called after successful login */
  storeRefreshToken(refreshToken: string): void {
    try {
      localStorage.setItem("erp_refresh_token", refreshToken);
    } catch {
      /* noop */
    }
  }

  private getStoredRefreshToken(): string | null {
    try {
      return localStorage.getItem("erp_refresh_token");
    } catch {
      return null;
    }
  }

  private getStoredCredentials(): {
    username: string;
    password: string;
  } | null {
    try {
      const u = localStorage.getItem("erp_username");
      const p = localStorage.getItem("erp_password");
      if (u && p) return { username: u, password: p };
    } catch {
      /* noop */
    }
    return null;
  }

  /** Record the time of the last successful token refresh */
  private recordTokenRefresh(): void {
    try {
      localStorage.setItem("lastTokenRefresh", Date.now().toString());
    } catch {
      /* noop */
    }
  }

  /** Get last token refresh timestamp (ms) or null */
  getLastTokenRefresh(): number | null {
    try {
      const v = localStorage.getItem("lastTokenRefresh");
      return v ? Number(v) : null;
    } catch {
      return null;
    }
  }

  /** Emit 'auth:token-expired' so the UI can prompt re-login */
  private emitTokenExpired(): void {
    try {
      window.dispatchEvent(new CustomEvent("auth:token-expired"));
    } catch {
      /* noop */
    }
  }

  /** Emit 'auth:token-refreshed' after a successful silent re-auth */
  private emitTokenRefreshed(): void {
    try {
      window.dispatchEvent(new CustomEvent("auth:token-refreshed"));
    } catch {
      /* noop */
    }
  }

  /**
   * Check whether the current token is expired (or expiring within 30 seconds).
   * Returns true if the token needs to be refreshed.
   */
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    const payload = decodeJwtPayload(token);
    if (!payload) return true;
    const exp = payload.exp as number | undefined;
    if (!exp) return false; // no expiry claim — treat as valid
    // Refresh 30 seconds before actual expiry to avoid race conditions
    return exp < Math.floor(Date.now() / 1000) + 30;
  }

  /**
   * Ensure the current token is valid. If expired, attempts a silent refresh.
   * Returns true if token is valid (or was refreshed), false if all methods failed.
   * Does NOT throw.
   *
   * IMPORTANT: If a fresh login happened within the last 10 minutes, the token
   * was just issued and is always valid — skip the expiry check entirely.
   * This prevents false "session expired" errors right after login.
   */
  async ensureValidToken(): Promise<boolean> {
    try {
      const loginTimeStr = localStorage.getItem("erp_login_time");
      if (loginTimeStr) {
        const loginTime = Number(loginTimeStr);
        if (Date.now() - loginTime < 10 * 60 * 1000) {
          // Fresh login within 10 minutes — token is certainly valid
          return true;
        }
      }
    } catch {
      /* noop */
    }
    if (!this.isTokenExpired()) return true;
    return this.silentRefresh();
  }

  /**
   * Attempt silent re-authentication.
   * Strategy: try /auth/refresh with stored refresh_token first (lightweight).
   * If that fails or no refresh_token, fall back to full re-login with stored credentials.
   * If a refresh is already in progress, queue the caller.
   * Returns true on success, false on failure (never throws).
   */
  async silentRefresh(): Promise<boolean> {
    // If already refreshing, queue and wait
    if (this.isRefreshing) {
      return new Promise<boolean>((resolve) => {
        this.refreshQueue.push({
          resolve: (token) => resolve(token !== null),
          reject: () => resolve(false),
        });
      });
    }

    this.isRefreshing = true;
    try {
      // Step 1: Try refresh_token endpoint first (lightweight)
      const storedRefreshToken = this.getStoredRefreshToken();
      if (storedRefreshToken) {
        try {
          const refreshUrl = `${getApiBase()}/?route=auth/refresh`;
          const refreshResp = await fetch(refreshUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: storedRefreshToken }),
          });
          if (refreshResp.ok) {
            const refreshData =
              (await refreshResp.json()) as ApiResponse<LoginResult>;
            if (refreshData.success && refreshData.data?.token) {
              const newToken = refreshData.data.token;
              this.setToken(newToken);
              if (refreshData.data.refresh_token) {
                this.storeRefreshToken(refreshData.data.refresh_token);
              }
              this.recordTokenRefresh();
              this.emitTokenRefreshed();
              for (const q of this.refreshQueue) q.resolve(newToken);
              this.refreshQueue = [];
              return true;
            }
          }
          // refresh_token invalid/expired — fall through to credential re-login
        } catch {
          /* network error — fall through */
        }
      }

      // Step 2: Fall back to re-login with stored credentials
      const creds = this.getStoredCredentials();
      if (!creds) {
        this.clearToken();
        this.emitTokenExpired();
        for (const q of this.refreshQueue)
          q.reject(new Error("No credentials"));
        this.refreshQueue = [];
        return false;
      }

      const url = `${getApiBase()}/?route=auth/login`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
      });
      const data = (await resp.json()) as ApiResponse<LoginResult>;
      if (!resp.ok || !data.success || !data.data?.token) {
        this.clearToken();
        this.emitTokenExpired();
        for (const q of this.refreshQueue)
          q.reject(new Error("Re-auth failed"));
        this.refreshQueue = [];
        return false;
      }
      const newToken = data.data.token;
      this.setToken(newToken);
      if (data.data.refresh_token) {
        this.storeRefreshToken(data.data.refresh_token);
      }
      this.recordTokenRefresh();
      this.emitTokenRefreshed();

      for (const q of this.refreshQueue) q.resolve(newToken);
      this.refreshQueue = [];
      return true;
    } catch {
      this.clearToken();
      this.emitTokenExpired();
      for (const q of this.refreshQueue) q.reject(new Error("Re-auth failed"));
      this.refreshQueue = [];
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Internal request method.
   * Calls ensureValidToken() before every request.
   * On 401/403: attempt silent re-auth, then retry exactly once.
   */
  private async request<T>(
    route: string,
    options: RequestInit = {},
    isRetry = false,
  ): Promise<ApiResponse<T>> {
    // Ensure token is valid before making the request (skip for auth routes)
    const isAuthRoute =
      route.startsWith("auth/login") || route.startsWith("auth/refresh");
    if (!isAuthRoute && !isRetry) {
      const tokenOk = await this.ensureValidToken();
      if (!tokenOk) {
        this.emitTokenExpired();
        throw new Error("Session expired — please log in again");
      }
    }

    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // Use getApiBase() for dynamic server URL support (configurable in Settings)
    const url = `${getApiBase()}/?route=${route}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...((options.headers as Record<string, string>) ?? {}),
        },
      });

      // Handle auth errors with silent re-auth (only once)
      if ((response.status === 401 || response.status === 403) && !isRetry) {
        const refreshed = await this.silentRefresh();
        if (!refreshed) {
          throw new Error("Session expired — please log in again");
        }
        const newToken = this.getToken();
        return this.request<T>(
          route,
          {
            ...options,
            headers: {
              ...((options.headers as Record<string, string>) ?? {}),
              Authorization: `Bearer ${newToken ?? ""}`,
            },
          },
          true,
        );
      }

      let data: ApiResponse<T>;
      try {
        data = (await response.json()) as ApiResponse<T>;
      } catch {
        throw new Error(
          `Server returned non-JSON response (HTTP ${response.status})`,
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ?? `Request failed (HTTP ${response.status})`,
        );
      }
      return data;
    } catch (err) {
      if (err instanceof Error) throw err;
      throw new Error("Network error — could not reach server");
    }
  }

  async get<T>(route: string, params?: Record<string, string>): Promise<T> {
    const qs = params ? `&${new URLSearchParams(params).toString()}` : "";
    const res = await this.request<T>(`${route}${qs}`);
    return res.data as T;
  }

  async post<T>(route: string, body: unknown): Promise<T> {
    const res = await this.request<T>(route, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.data as T;
  }

  /**
   * POST with ?id= as query parameter (for updates).
   * Never use PUT or DELETE — cPanel often blocks those HTTP methods.
   */
  async postWithId<T>(route: string, id: string, body: unknown): Promise<T> {
    const res = await this.request<T>(`${route}&id=${encodeURIComponent(id)}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.data as T;
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  async login(username: string, password: string): Promise<LoginResult | null> {
    try {
      const res = await this.request<LoginResult>("auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      if (res.data?.token) {
        this.setToken(res.data.token);
        this.recordTokenRefresh();
        const rt = res.data.refresh_token ?? "";
        if (rt) {
          this.storeRefreshToken(rt);
          try {
            localStorage.setItem("refreshToken", rt);
          } catch {
            /* noop */
          }
        }
        this.storeCredentials(username, password);
        try {
          localStorage.setItem("storedUsername", username);
          localStorage.setItem("storedPassword", password);
          localStorage.setItem("lastTokenRefresh", Date.now().toString());
          localStorage.setItem("erp_login_time", Date.now().toString());
        } catch {
          /* noop */
        }
      }
      return res.data ?? null;
    } catch {
      return null;
    }
  }

  /** Verify current token with backend — uses auth/me (not auth/verify) */
  async verifyToken(): Promise<LoginResult["user"] | null> {
    try {
      return await this.get<LoginResult["user"]>("auth/me");
    } catch {
      return null;
    }
  }

  // ── Dashboard Stats ───────────────────────────────────────────────────────

  async getStats(): Promise<StatsResult> {
    try {
      return await this.get<StatsResult>("dashboard/stats");
    } catch {
      return { students: 0, staff: 0, classes: 0, fees_today: 0 };
    }
  }

  async getDashboardFeeChart(): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>("dashboard/fee-chart");
    } catch {
      return [];
    }
  }

  async getDashboardRecentActivity(): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>(
        "dashboard/recent-activity",
      );
    } catch {
      return [];
    }
  }

  // ── Students ──────────────────────────────────────────────────────────────

  async getStudents(params?: {
    page?: string;
    limit?: string;
    class?: string;
    section?: string;
    session?: string;
    search?: string;
    status?: string;
  }): Promise<StudentListResult> {
    const qs = params
      ? `&${new URLSearchParams(params as Record<string, string>).toString()}`
      : "";
    const res = await this.request<StudentRecord[]>(`students/list${qs}`);
    return { data: res.data ?? [], total: res.total ?? res.data?.length ?? 0 };
  }

  async addStudent(student: Partial<StudentRecord>): Promise<StudentRecord> {
    return this.post<StudentRecord>("students/add", student);
  }

  /**
   * Update student — uses POST with ?id= query param.
   * Never use PUT — cPanel often blocks it.
   */
  async updateStudent(
    student: Partial<StudentRecord> & { id: string },
  ): Promise<StudentRecord> {
    const { id, ...body } = student;
    return this.postWithId<StudentRecord>("students/update", id, body);
  }

  /**
   * Delete student — uses POST to students/delete with id in body.
   * Never use DELETE method — cPanel often blocks it.
   */
  async deleteStudent(id: string): Promise<void> {
    await this.post("students/delete", { id });
  }

  /**
   * Bulk import students — route is students/import (not students/bulk-import).
   */
  async bulkImportStudents(
    students: Partial<StudentRecord>[],
  ): Promise<{ count: number }> {
    return this.post<{ count: number }>("students/import", { students });
  }

  async getStudentCount(): Promise<number> {
    try {
      const result = await this.get<{ count: number }>("students/count");
      return result.count ?? 0;
    } catch {
      return 0;
    }
  }

  // ── Classes ───────────────────────────────────────────────────────────────

  async getClasses(sessionId?: string): Promise<ClassRecord[]> {
    try {
      const params: Record<string, string> = {};
      if (sessionId) params.session_id = sessionId;
      const raw = await this.get<
        Array<{
          id: string;
          name: string;
          display_order?: number;
          is_enabled?: number;
          sections?: string[];
        }>
      >("academics/classes", Object.keys(params).length ? params : undefined);
      return (raw ?? []).map((c) => ({
        id: String(c.id),
        className: c.name ?? "",
        displayOrder: c.display_order ?? 0,
        isEnabled: c.is_enabled !== 0,
        sections: Array.isArray(c.sections) ? c.sections : [],
      }));
    } catch {
      return [];
    }
  }

  async addClass(cls: {
    name?: string;
    className?: string;
    display_order?: number;
    sections?: string[];
    is_enabled?: number;
    isEnabled?: boolean;
    sessionId?: string;
  }): Promise<ClassRecord> {
    const currentSessionId = (() => {
      try {
        return localStorage.getItem("erp_current_session_id") ?? undefined;
      } catch {
        return undefined;
      }
    })();
    const payload: Record<string, unknown> = {
      name: cls.name ?? cls.className ?? "",
      display_order: cls.display_order ?? 0,
    };
    if (cls.sessionId ?? currentSessionId) {
      payload.session_id = cls.sessionId ?? currentSessionId;
    }
    payload.is_enabled =
      cls.is_enabled !== undefined
        ? cls.is_enabled
        : cls.isEnabled !== undefined
          ? cls.isEnabled
            ? 1
            : 0
          : 1;
    if (cls.sections) payload.sections = cls.sections;
    return this.post<ClassRecord>("academics/classes/save", payload);
  }

  async updateClass(
    id: string,
    data: {
      name?: string;
      display_order?: number;
      is_enabled?: number;
      isEnabled?: boolean;
      sections?: string[];
    },
  ): Promise<ClassRecord> {
    const payload: Record<string, unknown> = { id };
    if (data.name !== undefined) payload.name = data.name;
    if (data.display_order !== undefined)
      payload.display_order = data.display_order;
    if (data.sections !== undefined) payload.sections = data.sections;
    payload.is_enabled =
      data.is_enabled !== undefined
        ? data.is_enabled
        : data.isEnabled !== undefined
          ? data.isEnabled
            ? 1
            : 0
          : 1;
    return this.post<ClassRecord>("academics/classes/save", payload);
  }

  async deleteClass(id: string): Promise<void> {
    await this.post("academics/classes/delete", { id });
  }

  async addSection(section: { classId: string; name: string }): Promise<{
    id: string;
    name: string;
  }> {
    return this.post<{ id: string; name: string }>("academics/sections/save", {
      class_id: section.classId,
      name: section.name,
    });
  }

  async getSectionsByClass(
    classId: string,
  ): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>("academics/sections", {
        class_id: classId,
      });
    } catch {
      return [];
    }
  }

  // ── Subjects ──────────────────────────────────────────────────────────────

  /**
   * Get subjects — route is academics/subjects (not subjects/list).
   */
  async getSubjects(classId?: string): Promise<Record<string, unknown>[]> {
    try {
      const params: Record<string, string> = classId
        ? { class_id: classId }
        : {};
      return await this.get<Record<string, unknown>[]>(
        "academics/subjects",
        Object.keys(params).length ? params : undefined,
      );
    } catch {
      return [];
    }
  }

  /**
   * Save subject — route is academics/subjects/save (not subjects/add).
   */
  async saveSubject(
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>("academics/subjects/save", data);
  }

  async deleteSubject(id: string): Promise<void> {
    await this.post("academics/subjects/delete", { id });
  }

  async getSections(classId: string): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>("academics/sections", {
        class_id: classId,
      });
    } catch {
      return [];
    }
  }

  // ── Staff ─────────────────────────────────────────────────────────────────

  async getStaff(): Promise<StaffRecord[]> {
    try {
      return await this.get<StaffRecord[]>("staff/list");
    } catch {
      return [];
    }
  }

  async addStaff(staff: Partial<StaffRecord>): Promise<StaffRecord> {
    return this.post<StaffRecord>("staff/add", staff);
  }

  /**
   * Update staff — uses POST with ?id= query param (not PUT).
   */
  async updateStaff(
    staff: Partial<StaffRecord> & { id: string },
  ): Promise<StaffRecord> {
    const { id, ...body } = staff;
    return this.postWithId<StaffRecord>("staff/update", id, body);
  }

  /**
   * Delete staff — uses POST to staff/delete with id in body (not DELETE).
   */
  async deleteStaff(id: string): Promise<void> {
    await this.post("staff/delete", { id });
  }

  /**
   * Bulk import staff — route is staff/import.
   */
  async bulkImportStaff(
    staffList: Partial<StaffRecord>[],
  ): Promise<{ count: number }> {
    return this.post<{ count: number }>("staff/import", { staff: staffList });
  }

  // ── Payroll ───────────────────────────────────────────────────────────────

  async getPayroll(params?: { month?: string; year?: string }): Promise<
    Record<string, unknown>[]
  > {
    try {
      return await this.get<Record<string, unknown>[]>(
        "payroll/list",
        params as Record<string, string>,
      );
    } catch {
      return [];
    }
  }

  async savePayroll(data: Record<string, unknown>): Promise<void> {
    await this.post("payroll/save", data);
  }

  /**
   * Generate payslip — route is payroll/payslip (not payroll/generate-payslip).
   */
  async generatePayslip(
    staffId: string,
    month: string,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>("payroll/payslip", {
      staffId,
      month,
    });
  }

  // ── Attendance ────────────────────────────────────────────────────────────

  /**
   * Save face attendance — route is attendance/face (not attendance/face-mark).
   */
  async saveFaceAttendance(data: {
    studentId: string;
    date: string;
    time: string;
  }): Promise<void> {
    await this.post("attendance/face", data);
  }

  /**
   * Get attendance by class — route is attendance/daily (not attendance/list).
   */
  async getAttendanceByClass(
    classId: string,
    sectionId: string,
    date: string,
  ): Promise<AttendanceRecord[]> {
    try {
      return await this.get<AttendanceRecord[]>("attendance/daily", {
        class: classId,
        section: sectionId,
        date,
      });
    } catch {
      return [];
    }
  }

  /**
   * Save attendance records — route is attendance/save (not attendance/mark).
   */
  async markAttendance(records: AttendanceRecord[]): Promise<void> {
    await this.post("attendance/save", { records });
  }

  /**
   * Get attendance records — route is attendance/daily (not attendance/list).
   */
  async getAttendance(
    className: string,
    date: string,
  ): Promise<AttendanceRecord[]> {
    try {
      return await this.get<AttendanceRecord[]>("attendance/daily", {
        class: className,
        date,
      });
    } catch {
      return [];
    }
  }

  async getAttendanceSummary(): Promise<Record<string, unknown>> {
    try {
      return await this.get<Record<string, unknown>>("attendance/summary");
    } catch {
      return {};
    }
  }

  async getStudentAttendance(
    studentId: string,
    month?: string,
  ): Promise<Record<string, unknown>[]> {
    try {
      const params: Record<string, string> = { studentId };
      if (month) params.month = month;
      return await this.get<Record<string, unknown>[]>(
        "attendance/student",
        params,
      );
    } catch {
      return [];
    }
  }

  // ── Sessions ──────────────────────────────────────────────────────────────

  async getSessions(): Promise<SessionRecord[]> {
    try {
      const raw = await this.get<
        Array<{
          id: string;
          name?: string;
          label?: string;
          start_year?: number;
          startYear?: number;
          end_year?: number;
          endYear?: number;
          is_current?: number;
          isActive?: boolean;
          is_archived?: number;
          isArchived?: boolean;
          created_at?: string;
          createdAt?: string;
        }>
      >("academic-sessions/list");
      return (raw ?? []).map((s) => ({
        id: String(s.id),
        label: s.name ?? s.label ?? "",
        startYear: s.start_year ?? s.startYear ?? 0,
        endYear: s.end_year ?? s.endYear ?? 0,
        isActive: s.is_current === 1 || s.isActive === true,
        isArchived: s.is_archived === 1 || s.isArchived === true,
        createdAt: s.created_at ?? s.createdAt ?? new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  }

  async createSession(session: {
    label: string;
    startYear: number;
    endYear: number;
  }): Promise<SessionRecord> {
    return this.post<SessionRecord>("academic-sessions/create", {
      name: session.label,
      start_year: session.startYear,
      end_year: session.endYear,
    });
  }

  async setActiveSession(id: string): Promise<void> {
    await this.post("academic-sessions/set-current", { session_id: id });
  }

  async promoteStudents(data: Record<string, unknown>): Promise<void> {
    await this.post("academic-sessions/promote", data);
  }

  // ── Fee headings ──────────────────────────────────────────────────────────

  async getFeeHeadings(): Promise<FeeHeadingRecord[]> {
    try {
      return await this.get<FeeHeadingRecord[]>("fees/headings");
    } catch {
      return [];
    }
  }

  /**
   * Add/save fee heading — route is fees/headings/save (not fees/headings/add).
   */
  async addFeeHeading(
    heading: Partial<FeeHeadingRecord>,
  ): Promise<FeeHeadingRecord> {
    return this.post<FeeHeadingRecord>("fees/headings/save", heading);
  }

  async deleteFeeHeading(id: string): Promise<void> {
    await this.post("fees/headings/delete", { id });
  }

  // ── Fee plan ──────────────────────────────────────────────────────────────

  async getFeePlan(
    className: string,
    sectionName: string,
  ): Promise<FeePlanRecord[]> {
    try {
      return await this.get<FeePlanRecord[]>("fees/plan", {
        class: className,
        section: sectionName,
      });
    } catch {
      return [];
    }
  }

  async saveFeePlan(data: {
    classId: string;
    sectionId?: string;
    items: Array<{ headingId: string; amounts: Record<string, number> }>;
    sessionId?: string;
  }): Promise<void> {
    await this.post("fees/plan/save", data);
  }

  // ── Fee collection ────────────────────────────────────────────────────────

  /**
   * Get student fee details — route is fees/collect/student.
   */
  async getStudentFeeDetails(
    studentId: string,
  ): Promise<Record<string, unknown>> {
    try {
      return await this.get<Record<string, unknown>>("fees/collect/student", {
        studentId,
      });
    } catch {
      return {};
    }
  }

  /**
   * Save fee collection receipt — route is fees/collect/save.
   */
  async collectFees(
    receipt: Record<string, unknown>,
  ): Promise<{ receiptNo: string; id: string }> {
    return this.post<{ receiptNo: string; id: string }>(
      "fees/collect/save",
      receipt,
    );
  }

  async getReceipts(studentId: string): Promise<FeeReceiptRecord[]> {
    try {
      return await this.get<FeeReceiptRecord[]>("fees/receipts", { studentId });
    } catch {
      return [];
    }
  }

  async deleteReceipt(id: string): Promise<void> {
    await this.post("fees/receipt/delete", { id });
  }

  async getFeeDue(): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>("fees/due");
    } catch {
      return [];
    }
  }

  async getFeeCollectionChart(): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>("fees/collection-chart");
    } catch {
      return [];
    }
  }

  // ── Transport ─────────────────────────────────────────────────────────────

  async getRoutes(): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>("transport/routes");
    } catch {
      return [];
    }
  }

  /**
   * Add/save route — route is transport/routes/save (not transport/routes/add).
   */
  async addRoute(
    route: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>("transport/routes/save", route);
  }

  async deleteRoute(id: string): Promise<void> {
    await this.post("transport/routes/delete", { id });
  }

  async getBuses(): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>("transport/buses");
    } catch {
      return [];
    }
  }

  async saveBus(
    bus: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>("transport/buses/save", bus);
  }

  async getPickupPoints(routeId?: string): Promise<Record<string, unknown>[]> {
    try {
      const params = routeId ? { route_id: routeId } : undefined;
      return await this.get<Record<string, unknown>[]>(
        "transport/pickup-points",
        params,
      );
    } catch {
      return [];
    }
  }

  /**
   * Add/save pickup point — route is transport/pickup-points/save
   * (not transport/pickup/add).
   */
  async addPickupPoint(
    point: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>(
      "transport/pickup-points/save",
      point,
    );
  }

  async getDriverStudents(
    driverId?: string,
  ): Promise<Record<string, unknown>[]> {
    try {
      const params = driverId ? { driver_id: driverId } : undefined;
      return await this.get<Record<string, unknown>[]>(
        "transport/driver-students",
        params,
      );
    } catch {
      return [];
    }
  }

  // ── Library ───────────────────────────────────────────────────────────────

  async getBooks(): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>("library/books");
    } catch {
      return [];
    }
  }

  async addBook(
    book: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>("library/books/add", book);
  }

  async updateBook(
    book: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>("library/books/update", book);
  }

  async issueBook(
    issue: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>("library/issue", issue);
  }

  async returnBook(
    ret: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>("library/return", ret);
  }

  async getOverdueBooks(): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>("library/overdue");
    } catch {
      return [];
    }
  }

  // ── Inventory ─────────────────────────────────────────────────────────────

  /**
   * Get inventory items — route is inventory/items (not inventory/list).
   */
  async getInventory(): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>("inventory/items");
    } catch {
      return [];
    }
  }

  /**
   * Add inventory item — route is inventory/items/add (not inventory/add).
   */
  async addInventoryItem(
    item: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>("inventory/items/add", item);
  }

  /**
   * Update inventory item — route is inventory/items/update (not inventory/update).
   * Uses POST (not PUT).
   */
  async updateInventoryItem(
    item: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>("inventory/items/update", item);
  }

  async deleteInventoryItem(id: string): Promise<void> {
    await this.post("inventory/items/delete", { id });
  }

  async addInventoryTransaction(
    transaction: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>(
      "inventory/transactions/add",
      transaction,
    );
  }

  // ── Exams ─────────────────────────────────────────────────────────────────

  async getExams(): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>("exams/list");
    } catch {
      return [];
    }
  }

  /**
   * Create/save exam — route is exams/save (not exams/create).
   */
  async createExam(
    exam: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>("exams/save", exam);
  }

  async getExamTimetable(examId?: string): Promise<Record<string, unknown>[]> {
    try {
      const params = examId ? { exam_id: examId } : undefined;
      return await this.get<Record<string, unknown>[]>(
        "exams/timetable",
        params,
      );
    } catch {
      return [];
    }
  }

  async saveExamTimetable(
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>("exams/timetable/save", data);
  }

  /**
   * Get results — route is exams/results (not results/list).
   */
  async getResults(params?: {
    studentId?: string;
    class?: string;
    examId?: string;
  }): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>(
        "exams/results",
        params as Record<string, string>,
      );
    } catch {
      return [];
    }
  }

  /**
   * Save results — route is exams/results/save (not results/add).
   */
  async addResults(
    results: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>("exams/results/save", results);
  }

  // ── Expenses ──────────────────────────────────────────────────────────────

  /**
   * Get expenses — route is expenses (not expenses/list).
   */
  async getExpenses(): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>("expenses");
    } catch {
      return [];
    }
  }

  async addExpense(
    expense: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>("expenses/add", expense);
  }

  async deleteExpense(id: string): Promise<void> {
    await this.post("expenses/delete", { id });
  }

  // ── Homework ──────────────────────────────────────────────────────────────

  /**
   * Get homework — route is homework (not homework/list).
   */
  async getHomework(className?: string): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>(
        "homework",
        className ? { class: className } : undefined,
      );
    } catch {
      return [];
    }
  }

  async addHomework(
    hw: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>("homework/add", hw);
  }

  async deleteHomework(id: string): Promise<void> {
    await this.post("homework/delete", { id });
  }

  // ── Communication ─────────────────────────────────────────────────────────

  async sendWhatsApp(
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>(
      "communication/whatsapp/send",
      data,
    );
  }

  async getBroadcastHistory(): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>(
        "communication/broadcast-history",
      );
    } catch {
      return [];
    }
  }

  async scheduleNotification(
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>(
      "communication/notification/schedule",
      data,
    );
  }

  async getNotifications(): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>(
        "communication/notifications",
      );
    } catch {
      return [];
    }
  }

  async markNotificationsRead(ids?: string[]): Promise<void> {
    await this.post("communication/notifications/mark-read", {
      ids: ids ?? [],
    });
  }

  // ── Chat ──────────────────────────────────────────────────────────────────

  async getChatRooms(): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>("chat/rooms");
    } catch {
      return [];
    }
  }

  async createChatRoom(
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>("chat/rooms/create", data);
  }

  async getChatMessages(roomId?: string): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>(
        "chat/messages",
        roomId ? { room_id: roomId } : undefined,
      );
    } catch {
      return [];
    }
  }

  /**
   * Send chat message — route is chat/messages/send (not chat/send).
   */
  async sendChatMessage(
    msg: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>("chat/messages/send", msg);
  }

  // ── Settings ──────────────────────────────────────────────────────────────

  /**
   * Get settings — route is settings/all (not settings/get).
   */
  async getSettings(): Promise<Record<string, unknown>> {
    try {
      return await this.get<Record<string, unknown>>("settings/all");
    } catch {
      return {};
    }
  }

  async saveSettings(settings: Record<string, unknown>): Promise<void> {
    await this.post("settings/save", settings);
  }

  // ── User Management ───────────────────────────────────────────────────────

  /**
   * Get users — route is settings/users (not users/list).
   */
  async getUsers(): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>("settings/users");
    } catch {
      return [];
    }
  }

  /**
   * Create user — route is settings/users/create (not users/create).
   */
  async createUser(
    user: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>("settings/users/create", user);
  }

  /**
   * Update user — route is settings/users/update (not users/update).
   */
  async updateUser(
    user: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>("settings/users/update", user);
  }

  /**
   * Delete user — route is settings/users/delete (not users/delete).
   */
  async deleteUser(id: string): Promise<void> {
    await this.post("settings/users/delete", { id });
  }

  /**
   * Reset user password — route is settings/users/reset-password.
   */
  async resetPassword(id: string, newPassword: string): Promise<void> {
    await this.post("settings/users/reset-password", { id, newPassword });
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  async getStudentsReport(
    params?: Record<string, string>,
  ): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>(
        "reports/students",
        params,
      );
    } catch {
      return [];
    }
  }

  async getFinanceReport(
    params?: Record<string, string>,
  ): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>(
        "reports/finance",
        params,
      );
    } catch {
      return [];
    }
  }

  async getAttendanceReport(
    params?: Record<string, string>,
  ): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>(
        "reports/attendance",
        params,
      );
    } catch {
      return [];
    }
  }

  async getFeeRegisterReport(
    params?: Record<string, string>,
  ): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>(
        "reports/fee-register",
        params,
      );
    } catch {
      return [];
    }
  }

  // ── Backup ────────────────────────────────────────────────────────────────

  async exportBackup(): Promise<Record<string, unknown>> {
    return this.get<Record<string, unknown>>("backup/export");
  }

  async importBackup(
    data: Record<string, unknown>,
  ): Promise<{ count: number }> {
    return this.post<{ count: number }>("backup/import", data);
  }

  // ── Health / Ping ─────────────────────────────────────────────────────────

  /**
   * Check API health — route is ping (not health).
   */
  async checkHealth(): Promise<boolean> {
    try {
      await this.get("ping");
      return true;
    } catch {
      return false;
    }
  }

  // ── Changelog ─────────────────────────────────────────────────────────────

  async logChange(entry: Record<string, unknown>): Promise<void> {
    try {
      await this.post("changelog/add", entry);
    } catch {
      /* non-critical — fail silently */
    }
  }

  async getChangelog(): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>("changelog/list");
    } catch {
      return [];
    }
  }

  // ── Compatibility shims (legacy callers) ──────────────────────────────────

  /**
   * @deprecated Use postWithId() instead of put().
   * PUT may be blocked by cPanel; use POST with ?id= param.
   * This shim forwards to POST for backward compatibility.
   */
  async put<T>(route: string, body: unknown): Promise<T> {
    const res = await this.request<T>(route, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.data as T;
  }

  /**
   * @deprecated Use post('route/delete', { id }) instead of del().
   * DELETE method may be blocked by cPanel.
   * This shim forwards to POST for backward compatibility.
   */
  async del<T>(route: string, body?: unknown): Promise<T> {
    const res = await this.request<T>(route, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return res.data as T;
  }

  /**
   * @deprecated sync/all route no longer exists — returns empty data shell.
   * All data is fetched per-module via individual endpoints.
   */
  async loadAll(): Promise<Record<string, unknown[]>> {
    return {
      students: [],
      staff: [],
      classes: [],
      sessions: [],
      fee_headings: [],
      fees_plan: [],
      fee_receipts: [],
      attendance: [],
      transport_routes: [],
      inventory_items: [],
      expenses: [],
      homework: [],
      alumni: [],
      subjects: [],
    };
  }

  /**
   * @deprecated sync/push route no longer exists — no-op.
   */
  async pushChanges(_changes: Record<string, unknown>[]): Promise<void> {
    /* no-op: online-only mode, no pending queue */
  }
}

export const phpApiService = new PhpApiService();
export default phpApiService;
