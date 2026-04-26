/**
 * SHUBH SCHOOL ERP — PHP API Service
 *
 * Single source of truth for all API calls to cPanel/PHP/MySQL backend.
 *
 * API URL format: {API_BASE}/index.php?route=ROUTE_NAME
 * Hardcoded base: https://shubh.psmkgs.com/api
 * Override via localStorage 'erp_server_url' for dev/testing.
 *
 * Auth: JWT Bearer token stored in localStorage ('erp_token').
 * Token grace period: 10 minutes after fresh login (erp_login_time).
 *
 * All cPanel routes MUST use POST (not PUT/DELETE — cPanel may block them).
 */

// ── API Base ──────────────────────────────────────────────────────────────────

const DEFAULT_API_BASE = "https://shubh.psmkgs.com/api";

function getApiBase(): string {
  try {
    const stored = localStorage.getItem("erp_server_url");
    if (stored?.trim()) return stored.trim().replace(/\/$/, "");
  } catch {
    /* noop */
  }
  return DEFAULT_API_BASE;
}

// ── Internal types ────────────────────────────────────────────────────────────

interface ApiResponseInternal<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  total?: number;
  page?: number;
}

// ── Public exported types ─────────────────────────────────────────────────────

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
  isEnabled?: boolean;
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

// ── JWT helpers ───────────────────────────────────────────────────────────────

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ── PhpApiService class ───────────────────────────────────────────────────────

class PhpApiService {
  private _token: string | null = null;
  private isRefreshing = false;
  private refreshQueue: Array<{
    resolve: (token: string | null) => void;
    reject: (err: Error) => void;
  }> = [];

  /**
   * Returns true if the current user is superadmin (locally authenticated).
   * Superadmin does NOT use a PHP JWT token — they authenticate locally.
   * When in superadmin mode, ALL token validation is bypassed.
   */
  private isSuperAdmin(): boolean {
    try {
      const raw = sessionStorage.getItem("shubh_current_user");
      if (!raw) return false;
      const u = JSON.parse(raw) as { role?: string };
      return u.role === "superadmin";
    } catch {
      return false;
    }
  }

  // ── Token management ───────────────────────────────────────────────────────

  getToken(): string | null {
    if (this._token) return this._token;
    try {
      return localStorage.getItem("erp_token");
    } catch {
      return null;
    }
  }

  setToken(token: string | null): void {
    this._token = token;
    try {
      if (token) {
        localStorage.setItem("erp_token", token);
      } else {
        localStorage.removeItem("erp_token");
      }
    } catch {
      /* noop */
    }
  }

  clearToken(): void {
    this._token = null;
    try {
      localStorage.removeItem("erp_token");
      localStorage.removeItem("erp_refresh_token");
    } catch {
      /* noop */
    }
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  storeCredentials(username: string, password: string): void {
    try {
      localStorage.setItem("erp_username", username);
      localStorage.setItem("erp_password", password);
    } catch {
      /* noop */
    }
  }

  storeRefreshToken(rt: string): void {
    try {
      localStorage.setItem("erp_refresh_token", rt);
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

  getLastTokenRefresh(): number | null {
    try {
      const v = localStorage.getItem("lastTokenRefresh");
      return v ? Number(v) : null;
    } catch {
      return null;
    }
  }

  private recordTokenRefresh(): void {
    try {
      localStorage.setItem("lastTokenRefresh", Date.now().toString());
    } catch {
      /* noop */
    }
  }

  // ── Token expiry ───────────────────────────────────────────────────────────

  /**
   * Returns true if the token is expired or expiring within 30 seconds.
   * Tokens without an exp claim are treated as always valid.
   */
  isTokenExpired(): boolean {
    // Superadmin uses local auth — token is never "expired" for them
    if (this.isSuperAdmin()) return false;
    const token = this.getToken();
    if (!token) return true;
    const payload = decodeJwtPayload(token);
    if (!payload) return true;
    const exp = payload.exp as number | undefined;
    if (!exp) return false;
    return exp < Math.floor(Date.now() / 1000) + 30;
  }

  /**
   * Returns true if a fresh login happened within the last N minutes.
   * Reads from localStorage 'erp_login_time' (written by login() and AppContext).
   */
  private isWithinGracePeriod(minutes = 10): boolean {
    try {
      const v = localStorage.getItem("erp_login_time");
      if (!v) return false;
      return Date.now() - Number(v) < minutes * 60 * 1000;
    } catch {
      return false;
    }
  }

  /**
   * Ensure the current token is valid.
   * Superadmin is always considered valid (no PHP token needed).
   * Skips expiry check if within the 10-minute grace period after login.
   * Returns true if valid (or refreshed), false if all refresh attempts failed.
   */
  async ensureValidToken(): Promise<boolean> {
    // Superadmin uses local auth — no PHP JWT token required
    if (this.isSuperAdmin()) return true;
    if (this.isWithinGracePeriod(10)) return true;
    if (!this.isTokenExpired()) return true;
    return this.silentRefresh();
  }

  /**
   * Attempt silent re-authentication.
   * Strategy: try /auth/refresh with refresh_token first, then re-login with stored credentials.
   * If a refresh is in progress, queue and wait.
   */
  async silentRefresh(): Promise<boolean> {
    // Superadmin uses local auth — never needs PHP token refresh
    if (this.isSuperAdmin()) return true;

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
      // Step 1: Try refresh token endpoint
      const storedRt = this.getStoredRefreshToken();
      if (storedRt) {
        try {
          const url = `${getApiBase()}/index.php?route=auth/refresh`;
          const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: storedRt }),
          });
          if (resp.ok) {
            const json =
              (await resp.json()) as ApiResponseInternal<LoginResult>;
            if (json.success && json.data?.token) {
              this.setToken(json.data.token);
              if (json.data.refresh_token)
                this.storeRefreshToken(json.data.refresh_token);
              this.recordTokenRefresh();
              this.emitTokenRefreshed();
              for (const q of this.refreshQueue) q.resolve(json.data.token);
              this.refreshQueue = [];
              return true;
            }
          }
        } catch {
          /* network error — fall through */
        }
      }

      // Step 2: Re-login with stored credentials
      const creds = this.getStoredCredentials();
      if (!creds) {
        this.clearToken();
        this.emitTokenExpired();
        for (const q of this.refreshQueue)
          q.reject(new Error("No credentials"));
        this.refreshQueue = [];
        return false;
      }

      const url = `${getApiBase()}/index.php?route=auth/login`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
      });
      const json = (await resp.json()) as ApiResponseInternal<LoginResult>;
      if (!resp.ok || !json.success || !json.data?.token) {
        this.clearToken();
        this.emitTokenExpired();
        for (const q of this.refreshQueue)
          q.reject(new Error("Re-auth failed"));
        this.refreshQueue = [];
        return false;
      }

      const newToken = json.data.token;
      this.setToken(newToken);
      if (json.data.refresh_token)
        this.storeRefreshToken(json.data.refresh_token);
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

  private emitTokenExpired(): void {
    try {
      window.dispatchEvent(new CustomEvent("auth:token-expired"));
    } catch {
      /* noop */
    }
  }

  private emitTokenRefreshed(): void {
    try {
      window.dispatchEvent(new CustomEvent("auth:token-refreshed"));
    } catch {
      /* noop */
    }
  }

  // ── Core request method ────────────────────────────────────────────────────

  private getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  private async request<T>(
    route: string,
    options: RequestInit = {},
    isRetry = false,
  ): Promise<ApiResponseInternal<T>> {
    const isAuthRoute =
      route.startsWith("auth/login") || route.startsWith("auth/refresh");

    // Superadmin uses local auth — skip ALL PHP token validation
    const superAdmin = this.isSuperAdmin();

    if (!isAuthRoute && !isRetry && !superAdmin) {
      const ok = await this.ensureValidToken();
      if (!ok) {
        this.emitTokenExpired();
        throw new Error("Session expired — please log in again");
      }
    }

    const url = `${getApiBase()}/index.php?route=${route}`;
    const headers = {
      ...this.getAuthHeaders(),
      ...((options.headers as Record<string, string>) ?? {}),
    };

    try {
      const response = await fetch(url, { ...options, headers });

      if (
        (response.status === 401 || response.status === 403) &&
        !isRetry &&
        !superAdmin
      ) {
        const refreshed = await this.silentRefresh();
        if (!refreshed)
          throw new Error("Session expired — please log in again");
        return this.request<T>(
          route,
          {
            ...options,
            headers: {
              ...headers,
              Authorization: `Bearer ${this.getToken() ?? ""}`,
            },
          },
          true,
        );
      }

      let data: ApiResponseInternal<T>;
      try {
        data = (await response.json()) as ApiResponseInternal<T>;
      } catch {
        throw new Error(
          `Server returned non-JSON response (HTTP ${response.status})`,
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ??
            data.message ??
            `Request failed (HTTP ${response.status})`,
        );
      }
      return data;
    } catch (err) {
      if (err instanceof Error) throw err;
      throw new Error("Network error — could not reach server");
    }
  }

  // ── Public GET / POST helpers ──────────────────────────────────────────────

  async apiGet<T>(route: string, params?: Record<string, string>): Promise<T> {
    const qs =
      params && Object.keys(params).length
        ? `&${new URLSearchParams(params).toString()}`
        : "";
    const res = await this.request<T>(`${route}${qs}`);
    return res.data as T;
  }

  async apiPost<T>(route: string, body: unknown): Promise<T> {
    const res = await this.request<T>(route, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.data as T;
  }

  /** Alias for apiGet — used by some legacy callers */
  async get<T>(route: string, params?: Record<string, string>): Promise<T> {
    return this.apiGet<T>(route, params);
  }

  /** Alias for apiPost — used by some legacy callers */
  async post<T>(route: string, body: unknown): Promise<T> {
    return this.apiPost<T>(route, body);
  }

  /** POST with ?id= appended to route (for updates) */
  async postWithId<T>(route: string, id: string, body: unknown): Promise<T> {
    const res = await this.request<T>(`${route}&id=${encodeURIComponent(id)}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.data as T;
  }

  // ── Auth ───────────────────────────────────────────────────────────────────

  async login(username: string, password: string): Promise<LoginResult | null> {
    try {
      const res = await this.request<LoginResult>("auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      if (res.data?.token) {
        this.setToken(res.data.token);
        this.recordTokenRefresh();
        if (res.data.refresh_token)
          this.storeRefreshToken(res.data.refresh_token);
        this.storeCredentials(username, password);
        try {
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

  async logout(): Promise<void> {
    try {
      await this.apiPost("auth/logout", {});
    } catch {
      /* noop */
    }
    this.clearToken();
  }

  async verifyToken(): Promise<LoginResult["user"] | null> {
    try {
      return await this.apiGet<LoginResult["user"]>("auth/me");
    } catch {
      return null;
    }
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────

  async getStats(): Promise<StatsResult> {
    try {
      return await this.apiGet<StatsResult>("dashboard/stats");
    } catch {
      return { students: 0, staff: 0, classes: 0, fees_today: 0 };
    }
  }

  async getDashboardFeeChart(): Promise<Record<string, unknown>[]> {
    try {
      return await this.apiGet<Record<string, unknown>[]>(
        "dashboard/fee-chart",
      );
    } catch {
      return [];
    }
  }

  async getDashboardRecentActivity(): Promise<Record<string, unknown>[]> {
    try {
      return await this.apiGet<Record<string, unknown>[]>(
        "dashboard/recent-activity",
      );
    } catch {
      return [];
    }
  }

  // ── Students ───────────────────────────────────────────────────────────────

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
    return this.apiPost<StudentRecord>("students/add", student);
  }

  async updateStudent(
    student: Partial<StudentRecord> & { id: string },
  ): Promise<StudentRecord> {
    const { id, ...body } = student;
    return this.postWithId<StudentRecord>("students/update", id, body);
  }

  async deleteStudent(id: string): Promise<void> {
    await this.apiPost("students/delete", { id });
  }

  async bulkImportStudents(
    students: Partial<StudentRecord>[],
  ): Promise<{ count: number }> {
    return this.apiPost<{ count: number }>("students/import", { students });
  }

  async getStudentCount(): Promise<number> {
    try {
      const result = await this.apiGet<{ count: number }>("students/count");
      return result.count ?? 0;
    } catch {
      return 0;
    }
  }

  // ── Classes ────────────────────────────────────────────────────────────────

  async getClasses(sessionId?: string): Promise<ClassRecord[]> {
    try {
      const params: Record<string, string> = {};
      if (sessionId) params.session_id = sessionId;
      const raw = await this.apiGet<
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
    const sid = cls.sessionId ?? currentSessionId;
    if (sid) payload.session_id = sid;
    payload.is_enabled =
      cls.is_enabled !== undefined
        ? cls.is_enabled
        : cls.isEnabled !== undefined
          ? cls.isEnabled
            ? 1
            : 0
          : 1;
    if (cls.sections) payload.sections = cls.sections;
    return this.apiPost<ClassRecord>("academics/classes/save", payload);
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
    return this.apiPost<ClassRecord>("academics/classes/save", payload);
  }

  async deleteClass(id: string): Promise<void> {
    await this.apiPost("academics/classes/delete", { id });
  }

  async addSection(section: { classId: string; name: string }): Promise<{
    id: string;
    name: string;
  }> {
    return this.apiPost<{ id: string; name: string }>(
      "academics/sections/save",
      {
        class_id: section.classId,
        name: section.name,
      },
    );
  }

  async getSections(classId: string): Promise<Record<string, unknown>[]> {
    try {
      return await this.apiGet<Record<string, unknown>[]>(
        "academics/sections",
        { class_id: classId },
      );
    } catch {
      return [];
    }
  }

  async getSectionsByClass(
    classId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.getSections(classId);
  }

  // ── Subjects ───────────────────────────────────────────────────────────────

  async getSubjects(classId?: string): Promise<Record<string, unknown>[]> {
    try {
      return await this.apiGet<Record<string, unknown>[]>(
        "academics/subjects",
        classId ? { class_id: classId } : undefined,
      );
    } catch {
      return [];
    }
  }

  async saveSubject(
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.apiPost<Record<string, unknown>>(
      "academics/subjects/save",
      data,
    );
  }

  async deleteSubject(id: string): Promise<void> {
    await this.apiPost("academics/subjects/delete", { id });
  }

  // ── Staff ──────────────────────────────────────────────────────────────────

  async getStaff(): Promise<StaffRecord[]> {
    try {
      return await this.apiGet<StaffRecord[]>("staff/list");
    } catch {
      return [];
    }
  }

  async addStaff(staff: Partial<StaffRecord>): Promise<StaffRecord> {
    return this.apiPost<StaffRecord>("staff/add", staff);
  }

  async updateStaff(
    staff: Partial<StaffRecord> & { id: string },
  ): Promise<StaffRecord> {
    const { id, ...body } = staff;
    return this.postWithId<StaffRecord>("staff/update", id, body);
  }

  async deleteStaff(id: string): Promise<void> {
    await this.apiPost("staff/delete", { id });
  }

  async bulkImportStaff(
    staffList: Partial<StaffRecord>[],
  ): Promise<{ count: number }> {
    return this.apiPost<{ count: number }>("staff/import", {
      staff: staffList,
    });
  }

  // ── Payroll ────────────────────────────────────────────────────────────────

  async getPayroll(params?: { month?: string; year?: string }): Promise<
    Record<string, unknown>[]
  > {
    try {
      return await this.apiGet<Record<string, unknown>[]>(
        "payroll/list",
        params as Record<string, string>,
      );
    } catch {
      return [];
    }
  }

  async savePayroll(data: Record<string, unknown>): Promise<void> {
    await this.apiPost("payroll/save", data);
  }

  async generatePayslip(
    staffId: string,
    month: string,
  ): Promise<Record<string, unknown>> {
    return this.apiPost<Record<string, unknown>>("payroll/payslip", {
      staffId,
      month,
    });
  }

  // ── Attendance ─────────────────────────────────────────────────────────────

  async getAttendanceByClass(
    classId: string,
    sectionId: string,
    date: string,
  ): Promise<AttendanceRecord[]> {
    try {
      return await this.apiGet<AttendanceRecord[]>("attendance/daily", {
        class: classId,
        section: sectionId,
        date,
      });
    } catch {
      return [];
    }
  }

  async getAttendance(
    className: string,
    date: string,
  ): Promise<AttendanceRecord[]> {
    try {
      return await this.apiGet<AttendanceRecord[]>("attendance/daily", {
        class: className,
        date,
      });
    } catch {
      return [];
    }
  }

  async markAttendance(records: AttendanceRecord[]): Promise<void> {
    await this.apiPost("attendance/save", { records });
  }

  async saveFaceAttendance(data: {
    studentId: string;
    date: string;
    time: string;
  }): Promise<void> {
    await this.apiPost("attendance/face", data);
  }

  async getAttendanceSummary(): Promise<Record<string, unknown>> {
    try {
      return await this.apiGet<Record<string, unknown>>("attendance/summary");
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
      return await this.apiGet<Record<string, unknown>[]>(
        "attendance/student",
        params,
      );
    } catch {
      return [];
    }
  }

  // ── Sessions ───────────────────────────────────────────────────────────────

  async getSessions(): Promise<SessionRecord[]> {
    try {
      const raw = await this.apiGet<
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
    return this.apiPost<SessionRecord>("academic-sessions/create", {
      name: session.label,
      start_year: session.startYear,
      end_year: session.endYear,
    });
  }

  async setActiveSession(id: string): Promise<void> {
    await this.apiPost("academic-sessions/set-current", { session_id: id });
  }

  async promoteStudents(data: Record<string, unknown>): Promise<void> {
    await this.apiPost("academic-sessions/promote", data);
  }

  // ── Fee Headings ───────────────────────────────────────────────────────────

  async getFeeHeadings(): Promise<FeeHeadingRecord[]> {
    try {
      return await this.apiGet<FeeHeadingRecord[]>("fees/headings");
    } catch {
      return [];
    }
  }

  async addFeeHeading(
    heading: Partial<FeeHeadingRecord>,
  ): Promise<FeeHeadingRecord> {
    return this.apiPost<FeeHeadingRecord>("fees/headings/save", heading);
  }

  async updateFeeHeading(
    heading: Partial<FeeHeadingRecord>,
  ): Promise<FeeHeadingRecord> {
    return this.apiPost<FeeHeadingRecord>("fees/headings/save", heading);
  }

  async deleteFeeHeading(id: string): Promise<void> {
    await this.apiPost("fees/headings/delete", { id });
  }

  // ── Fee Plan ───────────────────────────────────────────────────────────────

  async getFeePlan(
    className: string,
    sectionName: string,
  ): Promise<FeePlanRecord[]> {
    try {
      return await this.apiGet<FeePlanRecord[]>("fees/plan", {
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
    await this.apiPost("fees/plan/save", data);
  }

  // ── Fee Collection ─────────────────────────────────────────────────────────

  async getStudentFeeDetails(
    studentId: string,
  ): Promise<Record<string, unknown>> {
    try {
      return await this.apiGet<Record<string, unknown>>(
        "fees/collect/student",
        { studentId },
      );
    } catch {
      return {};
    }
  }

  async collectFees(
    receipt: Record<string, unknown>,
  ): Promise<{ receiptNo: string; id: string }> {
    return this.apiPost<{ receiptNo: string; id: string }>(
      "fees/collect/save",
      receipt,
    );
  }

  async getReceipts(studentId: string): Promise<FeeReceiptRecord[]> {
    try {
      return await this.apiGet<FeeReceiptRecord[]>("fees/receipts", {
        studentId,
      });
    } catch {
      return [];
    }
  }

  async deleteReceipt(id: string): Promise<void> {
    await this.apiPost("fees/receipt/delete", { id });
  }

  async getFeeDue(): Promise<Record<string, unknown>[]> {
    try {
      return await this.apiGet<Record<string, unknown>[]>("fees/due");
    } catch {
      return [];
    }
  }

  async getFeeCollectionChart(): Promise<Record<string, unknown>[]> {
    try {
      return await this.apiGet<Record<string, unknown>[]>(
        "fees/collection-chart",
      );
    } catch {
      return [];
    }
  }

  // ── Transport ──────────────────────────────────────────────────────────────

  async getRoutes(): Promise<Record<string, unknown>[]> {
    try {
      return await this.apiGet<Record<string, unknown>[]>("transport/routes");
    } catch {
      return [];
    }
  }

  async addRoute(
    route: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.apiPost<Record<string, unknown>>(
      "transport/routes/save",
      route,
    );
  }

  async deleteRoute(id: string): Promise<void> {
    await this.apiPost("transport/routes/delete", { id });
  }

  async getBuses(): Promise<Record<string, unknown>[]> {
    try {
      return await this.apiGet<Record<string, unknown>[]>("transport/buses");
    } catch {
      return [];
    }
  }

  async saveBus(
    bus: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.apiPost<Record<string, unknown>>("transport/buses/save", bus);
  }

  async getPickupPoints(routeId?: string): Promise<Record<string, unknown>[]> {
    try {
      return await this.apiGet<Record<string, unknown>[]>(
        "transport/pickup-points",
        routeId ? { route_id: routeId } : undefined,
      );
    } catch {
      return [];
    }
  }

  async addPickupPoint(
    point: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.apiPost<Record<string, unknown>>(
      "transport/pickup-points/save",
      point,
    );
  }

  async getDriverStudents(
    driverId?: string,
  ): Promise<Record<string, unknown>[]> {
    try {
      return await this.apiGet<Record<string, unknown>[]>(
        "transport/driver-students",
        driverId ? { driver_id: driverId } : undefined,
      );
    } catch {
      return [];
    }
  }

  // ── Library ────────────────────────────────────────────────────────────────

  async getBooks(): Promise<Record<string, unknown>[]> {
    try {
      return await this.apiGet<Record<string, unknown>[]>("library/books");
    } catch {
      return [];
    }
  }

  async addBook(
    book: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.apiPost<Record<string, unknown>>("library/books/add", book);
  }

  async updateBook(
    book: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.apiPost<Record<string, unknown>>("library/books/update", book);
  }

  async issueBook(
    issue: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.apiPost<Record<string, unknown>>("library/issue", issue);
  }

  async returnBook(
    ret: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.apiPost<Record<string, unknown>>("library/return", ret);
  }

  async getOverdueBooks(): Promise<Record<string, unknown>[]> {
    try {
      return await this.apiGet<Record<string, unknown>[]>("library/overdue");
    } catch {
      return [];
    }
  }

  // ── Inventory ──────────────────────────────────────────────────────────────

  async getInventory(): Promise<Record<string, unknown>[]> {
    try {
      return await this.apiGet<Record<string, unknown>[]>("inventory/items");
    } catch {
      return [];
    }
  }

  async addInventoryItem(
    item: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.apiPost<Record<string, unknown>>("inventory/items/add", item);
  }

  async updateInventoryItem(
    item: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.apiPost<Record<string, unknown>>(
      "inventory/items/update",
      item,
    );
  }

  async deleteInventoryItem(id: string): Promise<void> {
    await this.apiPost("inventory/items/delete", { id });
  }

  async addInventoryTransaction(
    transaction: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.apiPost<Record<string, unknown>>(
      "inventory/transactions/add",
      transaction,
    );
  }

  // ── Exams ──────────────────────────────────────────────────────────────────

  async getExams(): Promise<Record<string, unknown>[]> {
    try {
      return await this.apiGet<Record<string, unknown>[]>("exams/list");
    } catch {
      return [];
    }
  }

  async createExam(
    exam: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.apiPost<Record<string, unknown>>("exams/save", exam);
  }

  async getExamTimetable(examId?: string): Promise<Record<string, unknown>[]> {
    try {
      return await this.apiGet<Record<string, unknown>[]>(
        "exams/timetable",
        examId ? { exam_id: examId } : undefined,
      );
    } catch {
      return [];
    }
  }

  async saveExamTimetable(
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.apiPost<Record<string, unknown>>("exams/timetable/save", data);
  }

  async getResults(params?: {
    studentId?: string;
    class?: string;
    examId?: string;
  }): Promise<Record<string, unknown>[]> {
    try {
      return await this.apiGet<Record<string, unknown>[]>(
        "exams/results",
        params as Record<string, string>,
      );
    } catch {
      return [];
    }
  }

  async addResults(
    results: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.apiPost<Record<string, unknown>>("exams/results/save", results);
  }

  // ── Expenses ───────────────────────────────────────────────────────────────

  async getExpenses(): Promise<Record<string, unknown>[]> {
    try {
      return await this.apiGet<Record<string, unknown>[]>("expenses");
    } catch {
      return [];
    }
  }

  async addExpense(
    expense: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.apiPost<Record<string, unknown>>("expenses/add", expense);
  }

  async deleteExpense(id: string): Promise<void> {
    await this.apiPost("expenses/delete", { id });
  }

  // ── Homework ───────────────────────────────────────────────────────────────

  async getHomework(className?: string): Promise<Record<string, unknown>[]> {
    try {
      return await this.apiGet<Record<string, unknown>[]>(
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
    return this.apiPost<Record<string, unknown>>("homework/add", hw);
  }

  async deleteHomework(id: string): Promise<void> {
    await this.apiPost("homework/delete", { id });
  }

  // ── Communication ──────────────────────────────────────────────────────────

  async sendWhatsApp(
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.apiPost<Record<string, unknown>>(
      "communication/whatsapp/send",
      data,
    );
  }

  async getBroadcastHistory(): Promise<Record<string, unknown>[]> {
    try {
      return await this.apiGet<Record<string, unknown>[]>(
        "communication/broadcast-history",
      );
    } catch {
      return [];
    }
  }

  async scheduleNotification(
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.apiPost<Record<string, unknown>>(
      "communication/notification/schedule",
      data,
    );
  }

  async getNotifications(): Promise<Record<string, unknown>[]> {
    try {
      return await this.apiGet<Record<string, unknown>[]>(
        "communication/notifications",
      );
    } catch {
      return [];
    }
  }

  async markNotificationsRead(ids?: string[]): Promise<void> {
    await this.apiPost("communication/notifications/mark-read", {
      ids: ids ?? [],
    });
  }

  // ── Chat ───────────────────────────────────────────────────────────────────

  async getChatRooms(): Promise<Record<string, unknown>[]> {
    try {
      return await this.apiGet<Record<string, unknown>[]>("chat/rooms");
    } catch {
      return [];
    }
  }

  async createChatRoom(
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.apiPost<Record<string, unknown>>("chat/rooms/create", data);
  }

  async getChatMessages(roomId?: string): Promise<Record<string, unknown>[]> {
    try {
      return await this.apiGet<Record<string, unknown>[]>(
        "chat/messages",
        roomId ? { room_id: roomId } : undefined,
      );
    } catch {
      return [];
    }
  }

  async sendChatMessage(
    msg: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.apiPost<Record<string, unknown>>("chat/messages/send", msg);
  }

  // ── Settings ───────────────────────────────────────────────────────────────

  async getSettings(): Promise<Record<string, unknown>> {
    try {
      return await this.apiGet<Record<string, unknown>>("settings/all");
    } catch {
      return {};
    }
  }

  async saveSettings(settings: Record<string, unknown>): Promise<void> {
    await this.apiPost("settings/save", settings);
  }

  // ── User Management ────────────────────────────────────────────────────────

  async getUsers(): Promise<Record<string, unknown>[]> {
    try {
      return await this.apiGet<Record<string, unknown>[]>("settings/users");
    } catch {
      return [];
    }
  }

  async createUser(
    user: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.apiPost<Record<string, unknown>>("settings/users/create", user);
  }

  async updateUser(
    user: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.apiPost<Record<string, unknown>>("settings/users/update", user);
  }

  async deleteUser(id: string): Promise<void> {
    await this.apiPost("settings/users/delete", { id });
  }

  async resetPassword(id: string, newPassword: string): Promise<void> {
    await this.apiPost("settings/users/reset-password", { id, newPassword });
  }

  // ── Reports ────────────────────────────────────────────────────────────────

  async getStudentsReport(
    params?: Record<string, string>,
  ): Promise<Record<string, unknown>[]> {
    try {
      return await this.apiGet<Record<string, unknown>[]>(
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
      return await this.apiGet<Record<string, unknown>[]>(
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
      return await this.apiGet<Record<string, unknown>[]>(
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
      return await this.apiGet<Record<string, unknown>[]>(
        "reports/fee-register",
        params,
      );
    } catch {
      return [];
    }
  }

  // ── Backup ─────────────────────────────────────────────────────────────────

  async exportBackup(): Promise<Record<string, unknown>> {
    return this.apiGet<Record<string, unknown>>("backup/export");
  }

  async importBackup(
    data: Record<string, unknown>,
  ): Promise<{ count: number }> {
    return this.apiPost<{ count: number }>("backup/import", data);
  }

  // ── Health ─────────────────────────────────────────────────────────────────

  async checkHealth(): Promise<boolean> {
    try {
      await this.apiGet("ping");
      return true;
    } catch {
      return false;
    }
  }

  // ── Changelog ──────────────────────────────────────────────────────────────

  async logChange(entry: Record<string, unknown>): Promise<void> {
    try {
      await this.apiPost("changelog/add", entry);
    } catch {
      /* non-critical */
    }
  }

  async getChangelog(): Promise<Record<string, unknown>[]> {
    try {
      return await this.apiGet<Record<string, unknown>[]>("changelog/list");
    } catch {
      return [];
    }
  }

  // ── Backward-compat shims ──────────────────────────────────────────────────

  /** @deprecated Use apiPost() */
  async put<T>(route: string, body: unknown): Promise<T> {
    return this.apiPost<T>(route, body);
  }

  /** @deprecated Use apiPost('route/delete', { id }) */
  async del<T>(route: string, body?: unknown): Promise<T> {
    return this.apiPost<T>(route, body ?? {});
  }

  /** @deprecated No-op — online-only mode */
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

  /** @deprecated No-op */
  async pushChanges(_changes: Record<string, unknown>[]): Promise<void> {
    /* no-op */
  }
}

export const phpApiService = new PhpApiService();
export default phpApiService;
