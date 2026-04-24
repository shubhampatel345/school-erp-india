/**
 * SHUBH SCHOOL ERP — PHP API Service
 *
 * Calls the cPanel/PHP/MySQL backend at /api.
 * All data operations go through this service — no canister, no IC.
 *
 * Auth: JWT Bearer token stored in localStorage ('erp_token').
 * Silent re-auth: on 401/403, auto re-authenticates using stored credentials
 *   (erp_username / erp_password) and retries the request once.
 * If re-auth fails, emits 'auth:token-expired' DOM event.
 */

const API_BASE = "/api";

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

export interface AllDataResult {
  students: StudentRecord[];
  staff: StaffRecord[];
  classes: ClassRecord[];
  sessions: SessionRecord[];
  fee_headings: FeeHeadingRecord[];
  fees_plan: FeePlanRecord[];
  fee_receipts: FeeReceiptRecord[];
  attendance: AttendanceRecord[];
  transport_routes: Record<string, unknown>[];
  inventory_items: Record<string, unknown>[];
  expenses: Record<string, unknown>[];
  homework: Record<string, unknown>[];
  alumni: Record<string, unknown>[];
  subjects: Record<string, unknown>[];
  [key: string]: unknown[];
}

// ── PhpApiService ──────────────────────────────────────────────────────────────

class PhpApiService {
  private token: string | null = null;
  /** True while a silent re-auth is in progress — prevents re-entrancy */
  private isRefreshing = false;
  /** Resolve/reject callbacks queued while refresh is in progress */
  private refreshQueue: Array<{
    resolve: (token: string) => void;
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
   * Attempt silent re-authentication.
   * Strategy: try /auth/refresh with stored refresh_token first (lightweight).
   * If that fails or no refresh_token, fall back to full re-login with stored credentials.
   * If a refresh is already in progress, queue the caller.
   * Returns the new token on success, throws on failure.
   */
  private async silentRefresh(): Promise<string> {
    // If already refreshing, queue and wait
    if (this.isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        this.refreshQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;
    try {
      // Step 1: Try refresh_token endpoint first (lightweight)
      const storedRefreshToken = this.getStoredRefreshToken();
      if (storedRefreshToken) {
        try {
          const refreshUrl = `${API_BASE}/?route=auth/refresh`;
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
              // Update refresh token if a new one was returned
              if (refreshData.data.refresh_token) {
                this.storeRefreshToken(refreshData.data.refresh_token);
              } else {
                // Keep existing refresh token (still valid for JWT_REFRESH window)
              }
              this.emitTokenRefreshed();
              for (const q of this.refreshQueue) q.resolve(newToken);
              this.refreshQueue = [];
              return newToken;
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
        throw new Error("Session expired — please log in again");
      }

      const url = `${API_BASE}/?route=auth/login`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
      });
      const data = (await resp.json()) as ApiResponse<LoginResult>;
      if (!resp.ok || !data.success || !data.data?.token) {
        throw new Error("Re-authentication failed");
      }
      const newToken = data.data.token;
      this.setToken(newToken);
      // Store new refresh token if returned
      if (data.data.refresh_token) {
        this.storeRefreshToken(data.data.refresh_token);
      }
      this.emitTokenRefreshed();

      // Resolve all queued callers
      for (const q of this.refreshQueue) q.resolve(newToken);
      this.refreshQueue = [];
      return newToken;
    } catch (err) {
      this.clearToken();
      this.emitTokenExpired();
      const error = err instanceof Error ? err : new Error("Re-auth failed");
      for (const q of this.refreshQueue) q.reject(error);
      this.refreshQueue = [];
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Internal request method.
   * On 401/403: attempt silent re-auth, then retry exactly once.
   */
  private async request<T>(
    route: string,
    options: RequestInit = {},
    isRetry = false,
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const url = `${API_BASE}/?route=${route}`;

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
        const newToken = await this.silentRefresh();
        // Retry original request with the new token
        return this.request<T>(
          route,
          {
            ...options,
            headers: {
              ...((options.headers as Record<string, string>) ?? {}),
              Authorization: `Bearer ${newToken}`,
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

  async put<T>(route: string, body: unknown): Promise<T> {
    const res = await this.request<T>(route, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    return res.data as T;
  }

  async del<T>(route: string, body?: unknown): Promise<T> {
    const res = await this.request<T>(route, {
      method: "DELETE",
      body: body !== undefined ? JSON.stringify(body) : undefined,
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
        // Store refresh token if returned
        if (res.data.refresh_token) {
          this.storeRefreshToken(res.data.refresh_token);
        }
      }
      return res.data ?? null;
    } catch {
      return null;
    }
  }

  async verifyToken(): Promise<LoginResult["user"] | null> {
    try {
      return await this.get<LoginResult["user"]>("auth/verify");
    } catch {
      return null;
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  async getStats(): Promise<StatsResult> {
    try {
      return await this.get<StatsResult>("stats");
    } catch {
      return { students: 0, staff: 0, classes: 0, fees_today: 0 };
    }
  }

  // ── Initial load ──────────────────────────────────────────────────────────

  async loadAll(): Promise<AllDataResult> {
    return this.get<AllDataResult>("sync/all");
  }

  async pushChanges(changes: Record<string, unknown>[]): Promise<void> {
    await this.post("sync/push", { changes });
  }

  // ── Students ──────────────────────────────────────────────────────────────

  async getStudents(params?: {
    page?: string;
    class?: string;
    section?: string;
    session?: string;
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

  async updateStudent(
    student: Partial<StudentRecord> & { id: string },
  ): Promise<StudentRecord> {
    return this.put<StudentRecord>("students/update", student);
  }

  async deleteStudent(id: string): Promise<void> {
    await this.del("students/delete", { id });
  }

  async bulkImportStudents(
    students: Partial<StudentRecord>[],
  ): Promise<{ count: number }> {
    return this.post<{ count: number }>("students/bulk-import", { students });
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

  async getClasses(): Promise<ClassRecord[]> {
    try {
      return await this.get<ClassRecord[]>("classes/list");
    } catch {
      return [];
    }
  }

  async addClass(cls: {
    className: string;
    sections?: string[];
  }): Promise<ClassRecord> {
    return this.post<ClassRecord>("classes/add", cls);
  }

  async addSection(section: { classId: string; name: string }): Promise<{
    id: string;
    name: string;
  }> {
    return this.post<{ id: string; name: string }>("sections/add", section);
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

  async updateStaff(
    staff: Partial<StaffRecord> & { id: string },
  ): Promise<StaffRecord> {
    return this.put<StaffRecord>("staff/update", staff);
  }

  // ── Sessions ──────────────────────────────────────────────────────────────

  async getSessions(): Promise<SessionRecord[]> {
    try {
      return await this.get<SessionRecord[]>("sessions/list");
    } catch {
      return [];
    }
  }

  async createSession(session: {
    label: string;
    startYear: number;
    endYear: number;
  }): Promise<SessionRecord> {
    return this.post<SessionRecord>("sessions/create", session);
  }

  async setActiveSession(id: string): Promise<void> {
    await this.put("sessions/set-active", { id });
  }

  // ── Fee headings ──────────────────────────────────────────────────────────

  async getFeeHeadings(): Promise<FeeHeadingRecord[]> {
    try {
      return await this.get<FeeHeadingRecord[]>("fees/headings");
    } catch {
      return [];
    }
  }

  async addFeeHeading(
    heading: Partial<FeeHeadingRecord>,
  ): Promise<FeeHeadingRecord> {
    return this.post<FeeHeadingRecord>("fees/headings/add", heading);
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

  async collectFees(
    receipt: Record<string, unknown>,
  ): Promise<{ receiptNo: string; id: string }> {
    return this.post<{ receiptNo: string; id: string }>(
      "fees/collect",
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

  async getFeeDue(): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>("fees/due");
    } catch {
      return [];
    }
  }

  // ── Attendance ────────────────────────────────────────────────────────────

  async markAttendance(records: AttendanceRecord[]): Promise<void> {
    await this.post("attendance/mark", { records });
  }

  async getAttendance(
    className: string,
    date: string,
  ): Promise<AttendanceRecord[]> {
    try {
      return await this.get<AttendanceRecord[]>("attendance/list", {
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

  // ── Transport ─────────────────────────────────────────────────────────────

  async getRoutes(): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>("transport/routes");
    } catch {
      return [];
    }
  }

  async addRoute(
    route: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>("transport/routes/add", route);
  }

  async addPickupPoint(
    point: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>("transport/pickup/add", point);
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

  // ── Inventory ─────────────────────────────────────────────────────────────

  async getInventory(): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>("inventory/list");
    } catch {
      return [];
    }
  }

  async addInventoryItem(
    item: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>("inventory/add", item);
  }

  async updateInventoryItem(
    item: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.put<Record<string, unknown>>("inventory/update", item);
  }

  // ── Exams ─────────────────────────────────────────────────────────────────

  async getExams(): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>("exams/list");
    } catch {
      return [];
    }
  }

  async createExam(
    exam: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>("exams/create", exam);
  }

  async addResults(
    results: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>("results/add", results);
  }

  async getResults(params?: { studentId?: string; class?: string }): Promise<
    Record<string, unknown>[]
  > {
    try {
      return await this.get<Record<string, unknown>[]>(
        "results/list",
        params as Record<string, string>,
      );
    } catch {
      return [];
    }
  }

  // ── Expenses ──────────────────────────────────────────────────────────────

  async getExpenses(): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>("expenses/list");
    } catch {
      return [];
    }
  }

  async addExpense(
    expense: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>("expenses/add", expense);
  }

  // ── Homework ──────────────────────────────────────────────────────────────

  async getHomework(className?: string): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>(
        "homework/list",
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

  // ── Chat ──────────────────────────────────────────────────────────────────

  async getChatMessages(groupId?: string): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>(
        "chat/messages",
        groupId ? { groupId } : undefined,
      );
    } catch {
      return [];
    }
  }

  async sendChatMessage(
    msg: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>("chat/send", msg);
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

  // ── Settings ──────────────────────────────────────────────────────────────

  async getSettings(): Promise<Record<string, unknown>> {
    try {
      return await this.get<Record<string, unknown>>("settings/get");
    } catch {
      return {};
    }
  }

  async saveSettings(settings: Record<string, unknown>): Promise<void> {
    await this.post("settings/save", settings);
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  async getUsers(): Promise<Record<string, unknown>[]> {
    try {
      return await this.get<Record<string, unknown>[]>("users/list");
    } catch {
      return [];
    }
  }

  async createUser(
    user: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>("users/create", user);
  }

  async updateUser(
    user: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>("users/update", user);
  }

  async deleteUser(id: string): Promise<void> {
    await this.post("users/delete", { id });
  }

  async resetPassword(id: string, newPassword: string): Promise<void> {
    await this.post("users/reset-password", { id, newPassword });
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

  // ── Health ────────────────────────────────────────────────────────────────

  async checkHealth(): Promise<boolean> {
    try {
      await this.get("health");
      return true;
    } catch {
      return false;
    }
  }
}

export const phpApiService = new PhpApiService();
export default phpApiService;
