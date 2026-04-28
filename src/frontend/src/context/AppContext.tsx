/**
 * SHUBH SCHOOL ERP — AppContext (Online-Only, cPanel/MySQL)
 *
 * Auth: JWT via phpApiService.login() — token stored in localStorage.
 * Super Admin: uses SA_KEY (?sa_key=) — no JWT needed.
 * Role from DB: 'super_admin' (underscore) — normalized to 'superadmin' internally.
 *
 * NO: pendingWrites, syncStatus, offlineQueue, IndexedDB, syncEngine.
 *
 * ── Session Expired modal rules ────────────────────────────────────────────
 *  - NEVER shown on login screen (currentUser is null)
 *  - NEVER shown within 120 seconds of a fresh login (_loginTime guard)
 *  - Only shown after token genuinely expires mid-session AND silent refresh fails
 *
 * ── loginTime: module-level variable ────────────────────────────────────────
 *  Module-level (outside React) so ALL closures see it immediately.
 */

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import type {
  AppUser,
  Notification,
  Permission,
  PermissionMatrix,
  Session,
  UserRole,
} from "../types";
import phpApiService from "../utils/phpApiService";
import type { SessionRecord } from "../utils/phpApiService";

// ── Module-level login timestamp ──────────────────────────────────────────────
// Using module-level (not React state/ref) ensures ALL closures see the latest
// value immediately — no stale-closure issues.
let _loginTime = 0;

export function setLoginTime(t: number): void {
  _loginTime = t;
  try {
    localStorage.setItem("erp_login_time", String(t));
  } catch {
    /* storage unavailable */
  }
}

export function getLoginTime(): number {
  return _loginTime;
}

/** Returns true if a fresh login happened within the last N seconds */
function isWithinGracePeriod(seconds = 120): boolean {
  if (_loginTime === 0) return false;
  return Date.now() - _loginTime < seconds * 1000;
}

// ── localStorage helpers ──────────────────────────────────────────────────────

function lsGet<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Role normalization ────────────────────────────────────────────────────────
// DB stores 'super_admin' (underscore) — normalize to 'superadmin' for internal use

function normalizeRole(role: string): UserRole {
  if (role === "super_admin") return "superadmin";
  return (role as UserRole) || "teacher";
}

// ── Pre-loaded session years ──────────────────────────────────────────────────

const PRELOADED_SESSIONS = [
  { label: "2019-20", startYear: 2019, endYear: 2020 },
  { label: "2020-21", startYear: 2020, endYear: 2021 },
  { label: "2021-22", startYear: 2021, endYear: 2022 },
  { label: "2022-23", startYear: 2022, endYear: 2023 },
  { label: "2023-24", startYear: 2023, endYear: 2024 },
  { label: "2024-25", startYear: 2024, endYear: 2025 },
  { label: "2025-26", startYear: 2025, endYear: 2026 },
];

async function ensurePreloadedSessions(
  existing: SessionRecord[],
): Promise<SessionRecord[]> {
  const existingLabels = new Set(existing.map((s) => s.label));
  const missing = PRELOADED_SESSIONS.filter(
    (p) => !existingLabels.has(p.label),
  );
  if (missing.length === 0) return existing;

  const created: SessionRecord[] = [];
  for (const m of missing) {
    try {
      const s = await phpApiService.createSession({
        label: m.label,
        startYear: m.startYear,
        endYear: m.endYear,
      });
      created.push(s);
    } catch {
      created.push({
        id: `preloaded_${m.label}`,
        label: m.label,
        startYear: m.startYear,
        endYear: m.endYear,
        isActive: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
      });
    }
  }
  return [...existing, ...created];
}

// ── Default permissions per role ──────────────────────────────────────────────

const ALL_MODULES = [
  "dashboard",
  "students",
  "fees",
  "attendance",
  "hr",
  "academics",
  "transport",
  "inventory",
  "expenses",
  "homework",
  "communication",
  "examinations",
  "certificates",
  "alumni",
  "reports",
  "settings",
  "chat",
  "calling",
  "virtualclasses",
  "library",
  "analytics",
  "promote",
];

function buildMatrix(
  canView: boolean,
  canAdd: boolean,
  canEdit: boolean,
  canDelete: boolean,
): PermissionMatrix {
  const matrix: PermissionMatrix = {};
  for (const m of ALL_MODULES) {
    matrix[m] = { module: m, canView, canAdd, canEdit, canDelete };
  }
  return matrix;
}

const ROLE_DEFAULTS: Record<UserRole, PermissionMatrix> = {
  superadmin: {} as PermissionMatrix,
  admin: buildMatrix(true, true, true, true),
  teacher: buildMatrix(true, false, false, false),
  receptionist: buildMatrix(true, true, false, false),
  accountant: buildMatrix(true, true, false, false),
  librarian: buildMatrix(true, true, false, false),
  driver: buildMatrix(true, false, false, false),
  parent: buildMatrix(true, false, false, false),
  student: buildMatrix(true, false, false, false),
};

// ── App state ─────────────────────────────────────────────────────────────────

interface AppState {
  currentUser: AppUser | null;
  isInitializing: boolean;
  initError: string | null;
  currentSession: Session | null;
  sessions: Session[];
  permissions: PermissionMatrix;
  notifications: Notification[];
  serverConnected: boolean;
}

type AppAction =
  | { type: "SET_USER"; user: AppUser }
  | { type: "LOGOUT" }
  | { type: "SET_INIT_START" }
  | { type: "SET_INIT_DONE"; sessions: Session[] }
  | { type: "SET_INIT_ERROR"; error: string }
  | { type: "SET_SESSION"; sessionId: string }
  | { type: "ADD_SESSION"; session: Session }
  | { type: "SET_PERMISSIONS"; permissions: PermissionMatrix }
  | { type: "ADD_NOTIFICATION"; notification: Notification }
  | { type: "MARK_ALL_READ" }
  | { type: "CLEAR_NOTIFICATIONS" }
  | { type: "SET_SERVER_CONNECTED"; connected: boolean };

function makeDefaultSession(): Session {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    id: `sess_${year}`,
    label: `${year}-${String(year + 1).slice(2)}`,
    startYear: year,
    endYear: year + 1,
    isArchived: false,
    isActive: true,
    createdAt: now.toISOString(),
  };
}

const INITIAL_STATE: AppState = {
  currentUser: null,
  isInitializing: false,
  initError: null,
  currentSession: null,
  sessions: [],
  permissions: {} as PermissionMatrix,
  notifications: [],
  serverConnected: false,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_USER":
      return {
        ...state,
        currentUser: action.user,
        isInitializing: true,
        initError: null,
        permissions:
          ROLE_DEFAULTS[action.user.role] ??
          buildMatrix(true, false, false, false),
      };

    case "LOGOUT":
      return { ...INITIAL_STATE };

    case "SET_INIT_START":
      return { ...state, isInitializing: true, initError: null };

    case "SET_INIT_DONE": {
      const serverSessions =
        action.sessions.length > 0 ? action.sessions : [makeDefaultSession()];
      const activeSession =
        serverSessions.find((s) => s.isActive && !s.isArchived) ??
        serverSessions.find((s) => s.isActive) ??
        serverSessions[serverSessions.length - 1];
      return {
        ...state,
        isInitializing: false,
        initError: null,
        sessions: serverSessions,
        currentSession: activeSession ?? null,
      };
    }

    case "SET_INIT_ERROR":
      return { ...state, isInitializing: false, initError: action.error };

    case "SET_SESSION": {
      const session = state.sessions.find((s) => s.id === action.sessionId);
      return { ...state, currentSession: session ?? state.currentSession };
    }

    case "ADD_SESSION":
      return { ...state, sessions: [...state.sessions, action.session] };

    case "SET_PERMISSIONS":
      return { ...state, permissions: action.permissions };

    case "ADD_NOTIFICATION":
      return {
        ...state,
        notifications: [action.notification, ...state.notifications].slice(
          0,
          50,
        ),
      };

    case "MARK_ALL_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      };

    case "CLEAR_NOTIFICATIONS":
      return { ...state, notifications: [] };

    case "SET_SERVER_CONNECTED":
      return { ...state, serverConnected: action.connected };

    default:
      return state;
  }
}

// ── Context value ─────────────────────────────────────────────────────────────

interface AppContextValue {
  currentUser: AppUser | null;
  currentSession: Session | null;
  sessions: Session[];
  notifications: Notification[];
  unreadCount: number;
  isReadOnly: boolean;
  canWrite: boolean;
  serverConnected: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (userId: string, newPassword: string) => boolean;
  switchSession: (sessionId: string) => void;
  createSession: (label: string, description?: string) => Session;
  addNotification: (
    message: string,
    type?: Notification["type"],
    icon?: string,
  ) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
  hasPermission: (
    module: string,
    action?: keyof Omit<Permission, "module">,
  ) => boolean;
  getData: (collection: string) => unknown[];
  saveData: (
    collection: string,
    item: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  updateData: (
    collection: string,
    id: string,
    changes: Record<string, unknown>,
  ) => Promise<void>;
  deleteData: (collection: string, id: string) => Promise<void>;
  refreshCollection: (collection: string) => Promise<void>;
  // Backward compat stubs (no sync)
  isSyncLoading: boolean;
  syncStatus: {
    state: "idle" | "synced";
    lastSyncTime: null;
    lastError: null;
    pendingCount: 0;
    serverCounts: Record<string, number>;
  };
  serverCounts: Record<string, number>;
  syncCounts: Record<string, number>;
}

const AppContext = createContext<AppContextValue | null>(null);

// ── Local Admin Users (always work even if PHP server is down) ────────────────

const SUPER_ADMIN_USER: AppUser = {
  id: "su1",
  username: "superadmin",
  role: "superadmin",
  fullName: "Super Admin",
  name: "Super Admin",
};

const LOCAL_ADMIN_USER: AppUser = {
  id: "su2",
  username: "admin",
  role: "superadmin",
  fullName: "Administrator",
  name: "Administrator",
};

// ── App Loading Screen ────────────────────────────────────────────────────────

function AppLoading({
  error,
  onRetry,
}: { error: string | null; onRetry: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-background">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-elevated"
          style={{ background: "oklch(0.3 0.12 260)" }}
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            role="img"
          >
            <title>SHUBH School ERP</title>
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-foreground font-display tracking-tight">
            SHUBH SCHOOL ERP
          </p>
          {error ? (
            <>
              <p className="text-sm text-destructive mt-3 max-w-xs bg-destructive/10 px-3 py-2 rounded-lg">
                {error}
              </p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                data-ocid="app-loading.retry_button"
              >
                Retry
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mt-2">Loading…</p>
              <div className="flex items-center gap-1.5 justify-center mt-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary animate-pulse"
                    style={{ animationDelay: `${i * 200}ms` }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Session Expired Modal ─────────────────────────────────────────────────────

function SessionExpiredModal({ onLogout }: { onLogout: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      data-ocid="relogin.dialog"
    >
      <div className="bg-card border border-border rounded-2xl shadow-elevated max-w-sm w-full p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-amber-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-foreground font-display">
              Session Expired
            </p>
            <p className="text-xs text-muted-foreground">
              Please log in again to continue
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Your login session has expired. Please log out and sign in again.
        </p>
        <button
          type="button"
          onClick={onLogout}
          data-ocid="relogin.logout_button"
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Log Out &amp; Sign In Again
        </button>
      </div>
    </div>
  );
}

// ── AppProvider ───────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, INITIAL_STATE);
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const initStartedRef = useRef(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  });

  // ── Listen for token-expired events ──────────────────────────────────────
  useEffect(() => {
    const handleExpired = async () => {
      // Guard 1: nobody logged in
      if (!stateRef.current.currentUser) return;
      // Guard 2: super admin uses SA_KEY, no token to expire
      if (stateRef.current.currentUser.role === "superadmin") return;
      // Guard 3: within 120s grace period after fresh login
      if (isWithinGracePeriod(120)) return;
      // Try silent refresh
      const refreshed = await phpApiService.silentRefresh();
      if (refreshed) return;
      // Show modal only after all guards pass
      if (!isWithinGracePeriod(120) && stateRef.current.currentUser) {
        setShowExpiredModal(true);
      }
    };
    const listener = () => {
      void handleExpired();
    };
    window.addEventListener("auth:token-expired", listener);
    return () => window.removeEventListener("auth:token-expired", listener);
  }, []);

  // ── Restore session on page reload ────────────────────────────────────────
  useEffect(() => {
    const storedRaw = sessionStorage.getItem("shubh_current_user");
    if (!storedRaw) return;
    try {
      const user = JSON.parse(storedRaw) as AppUser;
      const token = phpApiService.getToken();
      if (token || user.role === "superadmin") {
        // Page reload = fresh start: reset grace period
        setLoginTime(Date.now());
        dispatch({ type: "SET_USER", user });
      } else {
        sessionStorage.removeItem("shubh_current_user");
      }
    } catch {
      /* corrupt storage */
    }
  }, []);

  // ── Initialize after login ────────────────────────────────────────────────
  useEffect(() => {
    if (!state.currentUser || !state.isInitializing) return;
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    void (async () => {
      dispatch({ type: "SET_INIT_START" });
      try {
        let sessions: Session[] = [];
        try {
          const rawSessions = await phpApiService.getSessions();
          const allSessions = await ensurePreloadedSessions(rawSessions);
          sessions = allSessions.map((s) => ({
            id: s.id,
            label: s.label,
            startYear: s.startYear,
            endYear: s.endYear,
            isArchived: s.isArchived,
            isActive: s.isActive,
            createdAt: s.createdAt ?? new Date().toISOString(),
          }));
          const active =
            sessions.find((s) => s.isActive) ?? sessions[sessions.length - 1];
          if (active) {
            try {
              localStorage.setItem("erp_current_session_id", active.id);
            } catch {
              /* noop */
            }
          }
        } catch {
          // Server unreachable — use default session
        }

        dispatch({ type: "SET_INIT_DONE", sessions });
        dispatch({ type: "SET_SERVER_CONNECTED", connected: true });

        void phpApiService.checkHealth().then((ok) => {
          dispatch({ type: "SET_SERVER_CONNECTED", connected: ok });
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to initialize";
        dispatch({ type: "SET_INIT_ERROR", error: msg });
        initStartedRef.current = false;
      }
    })();
  }, [state.currentUser, state.isInitializing]);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      // 1. Super Admin local check — always works regardless of server
      if (username === "superadmin") {
        const passwords = lsGet<Record<string, string>>("user_passwords", {});
        const validPw = passwords[username] ?? "admin123";
        if (password !== validPw) return false;
        setLoginTime(Date.now()); // FIRST: before any state update
        sessionStorage.setItem(
          "shubh_current_user",
          JSON.stringify(SUPER_ADMIN_USER),
        );
        localStorage.setItem("erp_role", "superadmin");
        initStartedRef.current = false;
        dispatch({ type: "SET_USER", user: SUPER_ADMIN_USER });
        return true;
      }

      // 2. PHP API login
      try {
        const result = await phpApiService.login(username, password);
        if (result?.token && result.user) {
          const su = result.user;
          // Normalize role: 'super_admin' from DB → 'superadmin' internally
          const normalizedRole = normalizeRole(
            (su.role as string) ?? "teacher",
          );
          const user: AppUser = {
            id: String(su.id),
            username: su.username,
            role: normalizedRole,
            fullName: su.fullName ?? su.name ?? username,
            name: su.name ?? su.fullName ?? username,
          };
          // Store role (normalized) for API calls
          localStorage.setItem("erp_role", normalizedRole);
          sessionStorage.setItem("shubh_current_user", JSON.stringify(user));
          if (result.refresh_token)
            phpApiService.storeRefreshToken(result.refresh_token);
          if (su.permissions) {
            const matrix: PermissionMatrix = {};
            for (const [mod, perms] of Object.entries(su.permissions)) {
              const p = perms as {
                canView?: boolean;
                canAdd?: boolean;
                canEdit?: boolean;
                canDelete?: boolean;
              };
              matrix[mod] = {
                module: mod,
                canView: p.canView ?? true,
                canAdd: p.canAdd ?? false,
                canEdit: p.canEdit ?? false,
                canDelete: p.canDelete ?? false,
              };
            }
            dispatch({ type: "SET_PERMISSIONS", permissions: matrix });
          }
          setLoginTime(Date.now()); // FIRST: before any state update
          initStartedRef.current = false;
          dispatch({ type: "SET_USER", user });
          return true;
        }
      } catch {
        /* server down — try local fallbacks */
      }

      // 3. Local 'admin' fallback (server down or not seeded yet)
      if (username === "admin") {
        const passwords = lsGet<Record<string, string>>("user_passwords", {});
        const validPw = passwords.admin ?? "admin123";
        if (password === validPw) {
          setLoginTime(Date.now());
          localStorage.setItem("erp_role", "superadmin");
          sessionStorage.setItem(
            "shubh_current_user",
            JSON.stringify(LOCAL_ADMIN_USER),
          );
          initStartedRef.current = false;
          dispatch({ type: "SET_USER", user: LOCAL_ADMIN_USER });
          return true;
        }
      }

      // 4. Local staff fallback
      const staffList = lsGet<
        Array<{
          id: string;
          name: string;
          mobile: string;
          designation: string;
          credentials: { username: string; password: string };
        }>
      >("staff", []);
      const staffMember = staffList.find(
        (s) =>
          s.credentials?.username === username &&
          s.credentials?.password === password,
      );
      if (staffMember) {
        const designation = (staffMember.designation ?? "").toLowerCase();
        const role: UserRole =
          designation === "driver"
            ? "driver"
            : designation === "librarian"
              ? "librarian"
              : designation === "accountant"
                ? "accountant"
                : designation === "receptionist"
                  ? "receptionist"
                  : "teacher";
        const user: AppUser = {
          id: staffMember.id,
          username,
          role,
          fullName: staffMember.name ?? "Staff",
          name: staffMember.name ?? "Staff",
          staffId: staffMember.id,
          mobile: staffMember.mobile,
        };
        setLoginTime(Date.now());
        localStorage.setItem("erp_role", role);
        sessionStorage.setItem("shubh_current_user", JSON.stringify(user));
        initStartedRef.current = false;
        dispatch({ type: "SET_USER", user });
        return true;
      }

      return false;
    },
    [],
  );

  const logout = useCallback(() => {
    sessionStorage.removeItem("shubh_current_user");
    localStorage.removeItem("erp_role");
    phpApiService.clearToken();
    initStartedRef.current = false;
    setLoginTime(0);
    setShowExpiredModal(false);
    dispatch({ type: "LOGOUT" });
  }, []);

  const retryInit = useCallback(() => {
    initStartedRef.current = false;
    dispatch({ type: "SET_INIT_START" });
  }, []);

  const addNotification = useCallback(
    (message: string, type: Notification["type"] = "info", icon?: string) => {
      const notif: Notification = {
        id: generateId(),
        message,
        type,
        timestamp: Date.now(),
        isRead: false,
        icon,
      };
      dispatch({ type: "ADD_NOTIFICATION", notification: notif });
    },
    [],
  );

  useEffect(() => {
    (window as unknown as Record<string, unknown>).addErpNotification = (
      msg: string,
      type?: string,
      icon?: string,
    ) => addNotification(msg, (type as Notification["type"]) ?? "info", icon);
  }, [addNotification]);

  const changePassword = useCallback(
    (userId: string, newPassword: string): boolean => {
      let username: string | undefined;
      if (userId === SUPER_ADMIN_USER.id) username = "superadmin";
      else {
        const custom = lsGet<AppUser[]>("custom_users", []).find(
          (u) => u.id === userId,
        );
        if (custom) username = custom.username;
      }
      if (!username) return false;
      const passwords = lsGet<Record<string, string>>("user_passwords", {});
      passwords[username] = newPassword;
      lsSet("user_passwords", passwords);
      void phpApiService.resetPassword(userId, newPassword);
      return true;
    },
    [],
  );

  const switchSession = useCallback((sessionId: string) => {
    dispatch({ type: "SET_SESSION", sessionId });
    lsSet("current_session", sessionId);
  }, []);

  const createSession = useCallback(
    (label: string, description?: string): Session => {
      const [startStr] = label.split("-");
      const startYear = Number.parseInt(startStr, 10);
      const session: Session = {
        id: generateId(),
        label,
        startYear,
        endYear: startYear + 1,
        isArchived: false,
        isActive: false,
        createdAt: new Date().toISOString(),
        description,
      };
      dispatch({ type: "ADD_SESSION", session });
      void phpApiService.createSession({
        label: session.label,
        startYear: session.startYear,
        endYear: session.endYear,
      });
      return session;
    },
    [],
  );

  const markAllRead = useCallback(
    () => dispatch({ type: "MARK_ALL_READ" }),
    [],
  );
  const clearNotifications = useCallback(
    () => dispatch({ type: "CLEAR_NOTIFICATIONS" }),
    [],
  );

  const hasPermission = useCallback(
    (
      module: string,
      action: keyof Omit<Permission, "module"> = "canView",
    ): boolean => {
      if (!state.currentUser) return false;
      if (state.currentUser.role === "superadmin") return true;
      const perm = state.permissions[module];
      if (!perm) return false;
      return perm[action] === true;
    },
    [state.currentUser, state.permissions],
  );

  // ── Legacy data delegates ─────────────────────────────────────────────────

  const getData = useCallback((_collection: string): unknown[] => [], []);
  const refreshCollection = useCallback(
    async (_collection: string): Promise<void> => {
      /* no-op */
    },
    [],
  );

  const saveData = useCallback(
    async (
      collection: string,
      item: Record<string, unknown>,
    ): Promise<Record<string, unknown>> => {
      if (collection === "students") {
        if (item.id)
          return phpApiService.updateStudent(
            item as Parameters<typeof phpApiService.updateStudent>[0],
          );
        return phpApiService.addStudent(item);
      }
      if (collection === "staff") {
        if (item.id)
          return phpApiService.updateStaff(
            item as Parameters<typeof phpApiService.updateStaff>[0],
          );
        return phpApiService.addStaff(item);
      }
      return item;
    },
    [],
  );

  const updateData = useCallback(
    async (
      collection: string,
      id: string,
      changes: Record<string, unknown>,
    ): Promise<void> => {
      const merged = { ...changes, id };
      if (collection === "students") {
        await phpApiService.updateStudent(
          merged as Parameters<typeof phpApiService.updateStudent>[0],
        );
      } else if (collection === "staff") {
        await phpApiService.updateStaff(
          merged as Parameters<typeof phpApiService.updateStaff>[0],
        );
      }
    },
    [],
  );

  const deleteData = useCallback(
    async (collection: string, id: string): Promise<void> => {
      if (collection === "students") await phpApiService.deleteStudent(id);
    },
    [],
  );

  // ── Computed ──────────────────────────────────────────────────────────────
  const isReadOnly = state.currentSession?.isArchived ?? false;
  const canWrite = !isReadOnly || state.currentUser?.role === "superadmin";
  const unreadCount = state.notifications.filter((n) => !n.isRead).length;

  const showLoading =
    state.currentUser !== null &&
    state.isInitializing &&
    state.sessions.length === 0;
  const showError =
    state.currentUser !== null &&
    state.initError !== null &&
    !state.isInitializing;

  const syncStatusStub = {
    state: "synced" as const,
    lastSyncTime: null,
    lastError: null,
    pendingCount: 0 as const,
    serverCounts: {} as Record<string, number>,
  };

  return (
    <AppContext.Provider
      value={{
        currentUser: state.currentUser,
        currentSession: state.currentSession,
        sessions: state.sessions,
        notifications: state.notifications,
        unreadCount,
        isReadOnly,
        canWrite,
        serverConnected: state.serverConnected,
        login,
        logout,
        changePassword,
        switchSession,
        createSession,
        addNotification,
        markAllRead,
        clearNotifications,
        hasPermission,
        getData,
        saveData,
        updateData,
        deleteData,
        refreshCollection,
        isSyncLoading: false,
        syncStatus: syncStatusStub,
        serverCounts: {},
        syncCounts: {},
      }}
    >
      {showLoading || showError ? (
        <AppLoading
          error={showError ? state.initError : null}
          onRetry={retryInit}
        />
      ) : (
        children
      )}
      {/*
        Session Expired modal rules:
        1. Only when currentUser is set (never on login screen)
        2. Never within 120 seconds of login (isWithinGracePeriod(120))
        3. Never for superadmin (uses SA_KEY, no token)
        4. Only after all silent refresh attempts failed
      */}
      {showExpiredModal &&
        state.currentUser !== null &&
        state.currentUser.role !== "superadmin" &&
        !isWithinGracePeriod(120) && <SessionExpiredModal onLogout={logout} />}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
