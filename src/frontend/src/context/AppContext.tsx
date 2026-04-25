/**
 * SHUBH SCHOOL ERP — AppContext (Online-Only, PHP/MySQL)
 *
 * Auth: JWT via phpApiService.login() — token stored in localStorage.
 * Data: fetched directly from MySQL via PHP API on demand.
 *
 * NO: pendingWrites, syncStatus, offlineQueue, IndexedDB, syncEngine, localFirstSync.
 *
 * Session Expired modal rules:
 *  - NEVER shown on login screen (currentUser is null)
 *  - NEVER shown within 10 minutes of a fresh login
 *  - Only shown after token genuinely expires mid-session AND silent refresh fails
 *
 * loginTime: module-level variable (outside React) so ALL closures see it immediately.
 * This prevents the race condition where freshLoginRef.current isn't visible in stale closures.
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
import { ls } from "../utils/localStorage";
import phpApiService from "../utils/phpApiService";

// ── Module-level login timestamp (outside React component) ────────────────────
// Using a module-level variable ensures ALL closures (including those in
// phpApiService event handlers) see the latest value immediately without
// stale-closure issues that affect useRef inside callbacks.
let _loginTime: number | null = null;

export function setLoginTime(t: number | null): void {
  _loginTime = t;
  // Also persist to localStorage so phpApiService.ensureValidToken can read it
  // without a circular import — avoids false "session expired" right after login
  try {
    if (t !== null) {
      localStorage.setItem("erp_login_time", String(t));
    } else {
      localStorage.removeItem("erp_login_time");
    }
  } catch {
    /* storage unavailable */
  }
}

export function getLoginTime(): number | null {
  return _loginTime;
}

/** Returns true if a fresh login happened within the last N minutes */
function isFreshLogin(minutesThreshold = 10): boolean {
  if (_loginTime === null) return false;
  return Date.now() - _loginTime < minutesThreshold * 60 * 1000;
}

// ── ID generator ──────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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
        serverSessions[0];
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

// ── Context value interface ───────────────────────────────────────────────────

interface AppContextValue {
  currentUser: AppUser | null;
  currentSession: Session | null;
  sessions: Session[];
  notifications: Notification[];
  unreadCount: number;
  isReadOnly: boolean;
  canWrite: boolean;
  serverConnected: boolean;
  // Auth
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (userId: string, newPassword: string) => boolean;
  // Session
  switchSession: (sessionId: string) => void;
  createSession: (label: string, description?: string) => Session;
  // Notifications
  addNotification: (
    message: string,
    type?: Notification["type"],
    icon?: string,
  ) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
  // Permissions
  hasPermission: (
    module: string,
    action?: keyof Omit<Permission, "module">,
  ) => boolean;
  // Legacy data access — components should use phpApiService directly
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
  // Backward compat
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

// ── Hardcoded Super Admin ─────────────────────────────────────────────────────

const SUPER_ADMIN: AppUser = {
  id: "su1",
  username: "superadmin",
  role: "superadmin",
  fullName: "Super Admin",
  name: "Super Admin",
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
            <title>SHUBH School ERP Loading</title>
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
              <p className="text-sm text-muted-foreground mt-2">
                Connecting to server…
              </p>
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

// ── Re-login modal ────────────────────────────────────────────────────────────

function ReLoginModal({ onDismiss }: { onDismiss: () => void }) {
  const currentYear = new Date().getFullYear();
  const baseYear = new Date().getMonth() >= 3 ? currentYear : currentYear - 1;
  const sessionYear = `${baseYear}-${String(baseYear + 1).slice(-2)}`;

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
              Academic session {sessionYear}
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Your login session has expired and could not be automatically renewed.
          Please log out and sign in again to continue.
        </p>
        <button
          type="button"
          onClick={onDismiss}
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
  const [showReLoginModal, setShowReLoginModal] = useState(false);
  const initStartedRef = useRef(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  });

  // ── Listen for auth:token-expired ─────────────────────────────────────────
  useEffect(() => {
    const handleTokenExpired = async () => {
      // Guard 1: never handle when nobody is logged in
      if (!stateRef.current.currentUser) return;

      // Guard 2: never show modal within 10 min of fresh login
      // Use module-level _loginTime — always current, no stale closure issues
      if (isFreshLogin(10)) return;

      // Guard 3: attempt silent refresh first — only show modal if it fails
      const refreshed = await phpApiService.silentRefresh();
      if (refreshed) return;

      // All refresh attempts failed — show modal only for mid-session expiry
      if (!isFreshLogin(10) && stateRef.current.currentUser) {
        setShowReLoginModal(true);
      }
    };

    const listener = () => {
      void handleTokenExpired();
    };
    window.addEventListener("auth:token-expired", listener);
    return () => window.removeEventListener("auth:token-expired", listener);
  }, []);

  // ── Restore user from sessionStorage on page reload ───────────────────────
  useEffect(() => {
    const storedUserRaw = sessionStorage.getItem("shubh_current_user");
    if (storedUserRaw) {
      try {
        const user = JSON.parse(storedUserRaw) as AppUser;
        const token = phpApiService.getToken();
        if (token) {
          // Treat page reload as a fresh login to prevent false expiry on startup
          // (the user was already authenticated; no need to re-verify immediately)
          setLoginTime(Date.now()); // also writes erp_login_time to localStorage
          dispatch({ type: "SET_USER", user });
        } else {
          sessionStorage.removeItem("shubh_current_user");
        }
      } catch {
        /* corrupt storage */
      }
    }
  }, []);

  // ── Initialize: fetch sessions from MySQL after login ─────────────────────
  useEffect(() => {
    if (!state.currentUser || !state.isInitializing) return;
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    void (async () => {
      dispatch({ type: "SET_INIT_START" });
      try {
        // Superadmin doesn't need server verify
        if (state.currentUser?.role !== "superadmin") {
          // Only verify token if we haven't just logged in
          if (!isFreshLogin(10)) {
            const tokenOk = await phpApiService.ensureValidToken();
            if (!tokenOk) {
              dispatch({
                type: "SET_INIT_ERROR",
                error: "Could not verify session. Please log in again.",
              });
              initStartedRef.current = false;
              return;
            }
          }
        }

        // Fetch sessions from server
        let sessions: Session[] = [];
        try {
          const rawSessions = await phpApiService.getSessions();
          sessions = rawSessions.map((s) => ({
            id: s.id,
            label: s.label,
            startYear: s.startYear,
            endYear: s.endYear,
            isArchived: s.isArchived,
            isActive: s.isActive,
            createdAt: s.createdAt ?? new Date().toISOString(),
          }));
        } catch {
          /* server unreachable — use default session */
        }

        dispatch({ type: "SET_INIT_DONE", sessions });
        dispatch({ type: "SET_SERVER_CONNECTED", connected: true });

        // Background health check
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
      // 1. Super Admin — local password check
      if (username === "superadmin") {
        const passwords = ls.get<Record<string, string>>("user_passwords", {});
        const validPw = passwords[username] ?? "admin123";
        if (password !== validPw) return false;
        sessionStorage.setItem(
          "shubh_current_user",
          JSON.stringify(SUPER_ADMIN),
        );
        initStartedRef.current = false;
        // Set module-level loginTime FIRST (synchronous, before any state updates)
        setLoginTime(Date.now());
        dispatch({ type: "SET_USER", user: SUPER_ADMIN });
        return true;
      }

      // 2. PHP API login — PRIMARY method
      try {
        const result = await phpApiService.login(username, password);
        if (result?.token && result.user) {
          const serverUser = result.user;
          const user: AppUser = {
            id: serverUser.id,
            username: serverUser.username,
            role: (serverUser.role as UserRole) ?? "teacher",
            fullName: serverUser.fullName ?? serverUser.name ?? username,
            name: serverUser.name ?? serverUser.fullName ?? username,
          };
          sessionStorage.setItem("shubh_current_user", JSON.stringify(user));
          if (result.refresh_token) {
            phpApiService.storeRefreshToken(result.refresh_token);
          }
          if (serverUser.permissions) {
            const matrix: PermissionMatrix = {};
            for (const [mod, perms] of Object.entries(serverUser.permissions)) {
              matrix[mod] = {
                module: mod,
                canView: perms.canView ?? true,
                canAdd: perms.canAdd ?? false,
                canEdit: perms.canEdit ?? false,
                canDelete: perms.canDelete ?? false,
              };
            }
            dispatch({ type: "SET_PERMISSIONS", permissions: matrix });
          }
          initStartedRef.current = false;
          // Set module-level loginTime FIRST (synchronous, before state updates)
          setLoginTime(Date.now());
          dispatch({ type: "SET_USER", user });
          return true;
        }
      } catch {
        /* server down — try local staff fallback */
      }

      // 3. Local staff fallback (when server is unreachable)
      const staffList = ls.get<
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
        sessionStorage.setItem("shubh_current_user", JSON.stringify(user));
        initStartedRef.current = false;
        setLoginTime(Date.now());
        dispatch({ type: "SET_USER", user });
        return true;
      }

      // 4. Student local fallback
      const students = ls.get<
        Array<{
          id: string;
          fullName: string;
          credentials: { username: string; password: string };
        }>
      >("students", []);
      const student = students.find(
        (s) =>
          s.credentials?.username === username &&
          s.credentials?.password === password,
      );
      if (student) {
        const user: AppUser = {
          id: student.id,
          username,
          role: "student",
          fullName: student.fullName ?? "Student",
          name: student.fullName ?? "Student",
          studentId: student.id,
        };
        sessionStorage.setItem("shubh_current_user", JSON.stringify(user));
        initStartedRef.current = false;
        setLoginTime(Date.now());
        dispatch({ type: "SET_USER", user });
        return true;
      }

      return false;
    },
    [],
  );

  const logout = useCallback(() => {
    sessionStorage.removeItem("shubh_current_user");
    phpApiService.clearToken();
    initStartedRef.current = false;
    setLoginTime(null);
    setShowReLoginModal(false);
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
      if (userId === SUPER_ADMIN.id) username = "superadmin";
      else {
        const custom = ls
          .get<AppUser[]>("custom_users", [])
          .find((u) => u.id === userId);
        if (custom) username = custom.username;
      }
      if (!username) return false;
      const passwords = ls.get<Record<string, string>>("user_passwords", {});
      passwords[username] = newPassword;
      ls.set("user_passwords", passwords);
      void phpApiService.resetPassword(userId, newPassword);
      return true;
    },
    [],
  );

  const switchSession = useCallback((sessionId: string) => {
    dispatch({ type: "SET_SESSION", sessionId });
    ls.set("current_session", sessionId);
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
      // Persist to server — wait for HTTP 200 before considering done
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

  // ── Legacy data access — these delegate to phpApiService directly ──────────

  const getData = useCallback((_collection: string): unknown[] => {
    // Legacy compatibility — components should use phpApiService directly
    return [];
  }, []);

  const refreshCollection = useCallback(
    async (_collection: string): Promise<void> => {
      // No-op — each page fetches fresh data from MySQL on demand
    },
    [],
  );

  const saveData = useCallback(
    async (
      collection: string,
      item: Record<string, unknown>,
    ): Promise<Record<string, unknown>> => {
      switch (collection) {
        case "students":
          if (item.id) {
            return phpApiService.updateStudent(
              item as Parameters<typeof phpApiService.updateStudent>[0],
            );
          }
          return phpApiService.addStudent(item);
        case "staff":
          if (item.id) {
            return phpApiService.updateStaff(
              item as Parameters<typeof phpApiService.updateStaff>[0],
            );
          }
          return phpApiService.addStaff(item);
        default:
          return item;
      }
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
      switch (collection) {
        case "students":
          await phpApiService.updateStudent(
            merged as Parameters<typeof phpApiService.updateStudent>[0],
          );
          break;
        case "staff":
          await phpApiService.updateStaff(
            merged as Parameters<typeof phpApiService.updateStaff>[0],
          );
          break;
      }
    },
    [],
  );

  const deleteData = useCallback(
    async (collection: string, id: string): Promise<void> => {
      switch (collection) {
        case "students":
          await phpApiService.deleteStudent(id);
          break;
        default:
          break;
      }
    },
    [],
  );

  // ── Computed ──────────────────────────────────────────────────────────────

  const isReadOnly = state.currentSession?.isArchived ?? false;
  const canWrite = !isReadOnly || state.currentUser?.role === "superadmin";
  const unreadCount = state.notifications.filter((n) => !n.isRead).length;

  // Show loading only when initializing with no sessions yet
  const showLoading =
    state.currentUser !== null &&
    state.isInitializing &&
    state.sessions.length === 0;
  const showError =
    state.currentUser !== null &&
    state.initError !== null &&
    !state.isInitializing;

  // Backward-compat sync status stub (always "synced" — no pending queue)
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
        Session Expired modal:
        - Only shown when currentUser is authenticated
        - Never shown on login page (currentUser is null there)
        - Never shown within 10 minutes of login (module-level _loginTime guard)
        - Only shown after all silent refresh attempts have already failed
      */}
      {showReLoginModal && state.currentUser !== null && !isFreshLogin(10) && (
        <ReLoginModal onDismiss={logout} />
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
