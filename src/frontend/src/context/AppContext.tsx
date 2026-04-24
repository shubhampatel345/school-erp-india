/**
 * SHUBH SCHOOL ERP — AppContext (PHP/MySQL, Local-First)
 *
 * Auth: JWT via phpApiService.login() — token stored in localStorage.
 * Data: localFirstSync (IndexedDB first, MySQL in background).
 *
 * On app open:
 *  1. Restore user from sessionStorage if token is still valid
 *  2. Show locally cached data immediately (IndexedDB)
 *  3. Fetch fresh data from MySQL in background
 *
 * All writes: instant locally via localFirstSync → background MySQL push.
 * Success notification should listen to 'sync:complete' event.
 *
 * CRITICAL: pendingWrites in localFirstSync ensures background fetch
 * never overwrites records that are pending MySQL confirmation.
 *
 * FIX 5: Listens for 'auth:token-expired' DOM event.
 *  - If stored credentials exist → silent re-login automatically.
 *  - If not → shows re-login modal/toast.
 *  - After success → dispatches 'auth:token-refreshed'.
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
  SyncStatus,
  UserRole,
} from "../types";
import { localFirstSync } from "../utils/localFirstSync";
import { ls } from "../utils/localStorage";
import phpApiService from "../utils/phpApiService";

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
  syncStatus: SyncStatus;
  permissions: PermissionMatrix;
  data: Record<string, unknown[]>;
  notifications: Notification[];
  serverConnected: boolean;
}

type AppAction =
  | { type: "SET_USER"; user: AppUser }
  | { type: "LOGOUT" }
  | { type: "SET_INIT_START" }
  | {
      type: "SET_INIT_DONE";
      data: Record<string, unknown[]>;
      sessions: Session[];
    }
  | { type: "SET_INIT_ERROR"; error: string }
  | { type: "SET_SESSION"; sessionId: string }
  | { type: "ADD_SESSION"; session: Session }
  | { type: "SET_SYNC_STATUS"; status: SyncStatus }
  | { type: "SET_PERMISSIONS"; permissions: PermissionMatrix }
  | { type: "UPDATE_COLLECTION"; collection: string; records: unknown[] }
  | { type: "ADD_NOTIFICATION"; notification: Notification }
  | { type: "MARK_ALL_READ" }
  | { type: "CLEAR_NOTIFICATIONS" }
  | { type: "SET_SERVER_CONNECTED"; connected: boolean };

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
      return { ...INITIAL_STATE, notifications: [] };

    case "SET_INIT_START":
      return { ...state, isInitializing: true, initError: null };

    case "SET_INIT_DONE": {
      const serverSessions =
        action.sessions.length > 0
          ? action.sessions
          : state.sessions.length > 0
            ? state.sessions
            : [makeDefaultSession()];
      const activeSession =
        serverSessions.find((s) => s.isActive && !s.isArchived) ??
        serverSessions.find((s) => s.isActive) ??
        serverSessions[0];
      return {
        ...state,
        isInitializing: false,
        initError: null,
        data: action.data,
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

    case "ADD_SESSION": {
      // Don't automatically archive existing sessions — let the caller decide.
      // Just append the new session without changing others.
      return {
        ...state,
        sessions: [...state.sessions, action.session],
      };
    }

    case "SET_SYNC_STATUS":
      return { ...state, syncStatus: action.status };

    case "SET_PERMISSIONS":
      return { ...state, permissions: action.permissions };

    case "UPDATE_COLLECTION":
      return {
        ...state,
        data: { ...state.data, [action.collection]: action.records },
      };

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
  syncStatus: {
    state: "idle",
    lastSyncTime: null,
    lastError: null,
    pendingCount: 0,
    serverCounts: {},
  },
  permissions: {} as PermissionMatrix,
  data: {},
  notifications: [],
  serverConnected: false,
};

// ── Context value interface ───────────────────────────────────────────────────

interface AppContextValue {
  currentUser: AppUser | null;
  currentSession: Session | null;
  sessions: Session[];
  notifications: Notification[];
  unreadCount: number;
  isReadOnly: boolean;
  canWrite: boolean;
  isSyncLoading: boolean;
  syncStatus: SyncStatus;
  serverCounts: Record<string, number>;
  syncCounts: Record<string, number>;
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
  // Data access
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
                Loading school data…
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

// ── Re-login modal — shown when token expires and no stored credentials ────────

function ReLoginModal({
  onDismiss,
}: {
  onDismiss: () => void;
}) {
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
              Your login session has expired
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Your session has expired and could not be automatically renewed.
          Please log out and sign in again to continue.
        </p>
        <button
          type="button"
          onClick={onDismiss}
          data-ocid="relogin.logout_button"
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Log Out & Sign In Again
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
  // Tracks the timestamp of the most recent successful login.
  // Using a ref (not localStorage) so it is set synchronously in the same
  // render cycle as the SET_USER dispatch — localStorage writes can be delayed.
  const freshLoginRef = useRef<number | null>(null);
  useEffect(() => {
    stateRef.current = state;
  });

  // ── FIX 5 — Listen for auth:token-expired and attempt silent re-login ──────
  useEffect(() => {
    const handleTokenExpired = async () => {
      // Guard 1: never handle token expiry when nobody is logged in
      if (!stateRef.current.currentUser) return;
      // Guard 2: don't show modal right after a fresh login (2-minute cool-down)
      if (
        freshLoginRef.current !== null &&
        Date.now() - freshLoginRef.current < 120_000
      )
        return;

      // Try silent re-auth via phpApiService (tries refresh_token then stored creds)
      try {
        // phpApiService.silentRefresh() is private; trigger it via a lightweight request
        // that will auto-refresh on 401
        const verified = await phpApiService.verifyToken();
        if (verified) {
          window.dispatchEvent(new CustomEvent("auth:token-refreshed"));
          return;
        }
      } catch {
        /* fall through */
      }
      // Try explicit re-login with stored credentials
      try {
        const u = localStorage.getItem("erp_username");
        const p = localStorage.getItem("erp_password");
        if (u && p) {
          const result = await phpApiService.login(u, p);
          if (result?.token) {
            window.dispatchEvent(new CustomEvent("auth:token-refreshed"));
            return;
          }
        }
      } catch {
        /* fall through to show modal */
      }
      // No credentials or re-auth failed — prompt user
      setShowReLoginModal(true);
    };

    const listener = () => {
      void handleTokenExpired();
    };
    window.addEventListener("auth:token-expired", listener);
    return () => {
      window.removeEventListener("auth:token-expired", listener);
    };
  }, []);

  // ── Restore user from sessionStorage on page reload ───────────────────────
  useEffect(() => {
    const storedUserRaw = sessionStorage.getItem("shubh_current_user");
    if (storedUserRaw) {
      try {
        const user = JSON.parse(storedUserRaw) as AppUser;
        // If token still in localStorage, restore session directly.
        // Do NOT set freshLoginRef here — this is a page-reload restore, not a
        // fresh login. The verify effect will run normally and check the token.
        const token = phpApiService.getToken();
        if (token) {
          dispatch({ type: "SET_USER", user });
        } else {
          // Token gone — need to re-login
          sessionStorage.removeItem("shubh_current_user");
        }
      } catch {
        /* corrupt storage */
      }
    }
  }, []);

  // ── Verify token validity on restore (NOT on fresh login) ────────────────
  useEffect(() => {
    // Guard 1: never run when no user is logged in (e.g. on the login screen)
    if (!state.currentUser) return;
    if (!state.isInitializing) return;
    const token = phpApiService.getToken();
    if (!token) return;
    // For superadmin local login, skip server verify
    if (state.currentUser.role === "superadmin") return;

    // Guard 2: skip verification entirely for 2 minutes after a fresh login.
    // A freshly issued token is always valid — verifying it immediately can
    // trigger a false-positive expiry event due to timing races.
    if (
      freshLoginRef.current !== null &&
      Date.now() - freshLoginRef.current < 120_000
    ) {
      return;
    }

    // Session restore path: do a lightweight token check
    void (async () => {
      const verified = await phpApiService.verifyToken();
      if (!verified) {
        // Token expired — try silent refresh first (refresh_token or stored creds)
        try {
          const u = localStorage.getItem("erp_username");
          const p = localStorage.getItem("erp_password");
          if (u && p) {
            const result = await phpApiService.login(u, p);
            if (result?.token) {
              window.dispatchEvent(new CustomEvent("auth:token-refreshed"));
              return; // Successfully refreshed — continue with existing session
            }
          }
        } catch {
          /* fall through to force re-login */
        }
        // Both refresh and re-login failed — show re-login modal
        phpApiService.clearToken();
        sessionStorage.removeItem("shubh_current_user");
        localStorage.removeItem("erp_login_timestamp");
        dispatch({ type: "LOGOUT" });
      }
    })();
  }, [state.currentUser, state.isInitializing]);

  // ── Server health check — show banner but don't block rendering ───────────
  useEffect(() => {
    void (async () => {
      const ok = await phpApiService.checkHealth();
      dispatch({ type: "SET_SERVER_CONNECTED", connected: ok });
    })();
  }, []);

  // ── Initialize: load MySQL data after login ───────────────────────────────
  useEffect(() => {
    if (!state.currentUser || !state.isInitializing) return;
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    void (async () => {
      dispatch({ type: "SET_INIT_START" });
      try {
        // Step 1: Warm from IndexedDB instantly (no server round-trip)
        const collections = [
          "students",
          "staff",
          "classes",
          "sessions",
          "fee_headings",
          "fees_plan",
          "fee_receipts",
          "attendance",
          "transport_routes",
          "inventory_items",
          "expenses",
          "homework",
          "alumni",
          "subjects",
        ];
        await Promise.allSettled(
          collections.map((col) => localFirstSync.load(col)),
        );

        // Step 2: Show IndexedDB data immediately
        const cachedData: Record<string, unknown[]> = {};
        for (const col of collections) {
          cachedData[col] = localFirstSync.getSnapshot(col);
        }

        // Determine sessions from cache
        const cachedSessions = (cachedData.sessions ?? []) as Session[];
        if (cachedSessions.length === 0) {
          const defaultSession = makeDefaultSession();
          cachedSessions.push(defaultSession);
          void localFirstSync.save(
            "sessions",
            defaultSession as unknown as Record<string, unknown>,
            "create",
          );
        }

        dispatch({
          type: "SET_INIT_DONE",
          data: cachedData,
          sessions: cachedSessions,
        });

        // Step 3: Fetch fresh from MySQL in background
        void (async () => {
          try {
            await localFirstSync.restorePendingQueue();
            await localFirstSync.forceSync();
            const allData = await phpApiService.loadAll();
            const freshData: Record<string, unknown[]> = {};
            for (const [collection, rows] of Object.entries(allData)) {
              if (Array.isArray(rows)) {
                localFirstSync.mergeServerRecords(
                  collection,
                  rows as Record<string, unknown>[],
                );
                freshData[collection] = localFirstSync.getSnapshot(collection);
              }
            }
            const freshSessions = (freshData.sessions ?? []) as Session[];
            if (freshSessions.length > 0) {
              dispatch({
                type: "SET_INIT_DONE",
                data: freshData,
                sessions: freshSessions,
              });
            } else {
              // Update data collections even if no sessions changed
              for (const [col, rows] of Object.entries(freshData)) {
                dispatch({
                  type: "UPDATE_COLLECTION",
                  collection: col,
                  records: rows,
                });
              }
            }
            dispatch({
              type: "SET_SYNC_STATUS",
              status: {
                state: "synced",
                lastSyncTime: new Date(),
                lastError: null,
                pendingCount: localFirstSync.getPendingCount(),
                serverCounts: {},
              },
            });
            dispatch({ type: "SET_SERVER_CONNECTED", connected: true });
          } catch {
            dispatch({
              type: "SET_SYNC_STATUS",
              status: {
                state: "offline",
                lastSyncTime: null,
                lastError: "Could not reach MySQL server — using local data",
                pendingCount: localFirstSync.getPendingCount(),
                serverCounts: {},
              },
            });
            dispatch({ type: "SET_SERVER_CONNECTED", connected: false });
          } finally {
            localFirstSync.startFlushTimer();
          }
        })();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load data";
        dispatch({ type: "SET_INIT_ERROR", error: msg });
        initStartedRef.current = false;
      }
    })();
  }, [state.currentUser, state.isInitializing]);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      // 1. Super Admin — always local password check first (no server needed)
      if (username === "superadmin") {
        const passwords = ls.get<Record<string, string>>("user_passwords", {});
        const validPw = passwords[username] ?? "admin123";
        if (password !== validPw) return false;
        sessionStorage.setItem(
          "shubh_current_user",
          JSON.stringify(SUPER_ADMIN),
        );
        initStartedRef.current = false;
        // Set freshLoginRef BEFORE dispatch so the verify effect always sees it
        freshLoginRef.current = Date.now();
        dispatch({ type: "SET_USER", user: SUPER_ADMIN });
        return true;
      }

      // 2. Try PHP API login
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
          // Store refresh token if returned
          if (result.refresh_token) {
            phpApiService.storeRefreshToken(result.refresh_token);
          }
          // Apply server-side permissions if provided
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
          // Stamp fresh-login timestamp BEFORE dispatch so the verify effect
          // always sees it in the same render cycle (ref updates are synchronous).
          freshLoginRef.current = Date.now();
          try {
            localStorage.setItem("erp_login_timestamp", Date.now().toString());
          } catch {
            /* noop */
          }
          dispatch({ type: "SET_USER", user });
          return true;
        }
      } catch {
        /* server down — fall through to local checks */
      }

      // 3. Fallback: check local staff/student data (offline mode)
      const staffList = ls.get<
        Array<{
          id: string;
          name: string;
          mobile: string;
          dob: string;
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
        freshLoginRef.current = Date.now();
        try {
          localStorage.setItem("erp_login_timestamp", Date.now().toString());
        } catch {
          /* noop */
        }
        dispatch({ type: "SET_USER", user });
        return true;
      }

      // 4. Students (local offline check)
      const students = ls.get<
        Array<{
          id: string;
          fullName: string;
          admNo: string;
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
        freshLoginRef.current = Date.now();
        try {
          localStorage.setItem("erp_login_timestamp", Date.now().toString());
        } catch {
          /* noop */
        }
        dispatch({ type: "SET_USER", user });
        return true;
      }

      // 5. Parent — mobile as both username and password
      const parent = students.find((s) => {
        const raw = s as unknown as {
          guardianMobile?: string;
          fatherMobile?: string;
        };
        const mob = raw.guardianMobile ?? raw.fatherMobile ?? "";
        return mob === username && mob === password && mob.length >= 10;
      });
      if (parent) {
        const raw = parent as unknown as {
          guardianMobile?: string;
          fatherMobile?: string;
          guardianName?: string;
          fatherName?: string;
        };
        const mob = raw.guardianMobile ?? raw.fatherMobile ?? username;
        const user: AppUser = {
          id: `parent_${mob}`,
          username,
          role: "parent",
          fullName: raw.guardianName ?? raw.fatherName ?? "Parent",
          name: raw.guardianName ?? raw.fatherName ?? "Parent",
          mobile: mob,
        };
        sessionStorage.setItem("shubh_current_user", JSON.stringify(user));
        initStartedRef.current = false;
        freshLoginRef.current = Date.now();
        try {
          localStorage.setItem("erp_login_timestamp", Date.now().toString());
        } catch {
          /* noop */
        }
        dispatch({ type: "SET_USER", user });
        return true;
      }

      return false;
    },
    [],
  );

  const logout = useCallback(() => {
    sessionStorage.removeItem("shubh_current_user");
    localStorage.removeItem("erp_login_timestamp");
    localStorage.removeItem("erp_refresh_token");
    phpApiService.clearToken();
    localFirstSync.stopFlushTimer();
    initStartedRef.current = false;
    freshLoginRef.current = null;
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

  // ── Listen for sync:complete events to update sync status ────────────────
  useEffect(() => {
    const handleSyncComplete = () => {
      dispatch({
        type: "SET_SYNC_STATUS",
        status: {
          state: "synced",
          lastSyncTime: new Date(),
          lastError: null,
          pendingCount: localFirstSync.getPendingCount(),
          serverCounts: {},
        },
      });
    };
    const handleSyncError = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { error?: string }
        | undefined;
      dispatch({
        type: "SET_SYNC_STATUS",
        status: {
          state: "error",
          lastSyncTime: stateRef.current.syncStatus.lastSyncTime,
          lastError: detail?.error ?? "Sync error",
          pendingCount: localFirstSync.getPendingCount(),
          serverCounts: {},
        },
      });
    };
    window.addEventListener("sync:complete", handleSyncComplete);
    window.addEventListener("sync:error", handleSyncError);
    return () => {
      window.removeEventListener("sync:complete", handleSyncComplete);
      window.removeEventListener("sync:error", handleSyncError);
    };
  }, []);

  const changePassword = useCallback(
    (userId: string, newPassword: string): boolean => {
      let username: string | undefined;
      if (userId === SUPER_ADMIN.id) username = "superadmin";
      else {
        const custom = ls
          .get<AppUser[]>("custom_users", [])
          .find((u) => u.id === userId);
        if (custom) username = custom.username;
        else {
          const staff = ls
            .get<Array<{ id: string; credentials: { username: string } }>>(
              "staff",
              [],
            )
            .find((s) => s.id === userId);
          if (staff) username = staff.credentials?.username;
        }
      }
      if (!username) return false;
      const passwords = ls.get<Record<string, string>>("user_passwords", {});
      passwords[username] = newPassword;
      ls.set("user_passwords", passwords);
      // Also push to server
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
      // ADD_SESSION never auto-archives siblings — caller controls that
      dispatch({ type: "ADD_SESSION", session });
      // Persist locally first, then server
      void localFirstSync.save(
        "sessions",
        session as unknown as Record<string, unknown>,
        "create",
      );
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

  // ── Data access ───────────────────────────────────────────────────────────

  const getData = useCallback(
    (collection: string): unknown[] => {
      const fromState = state.data[collection];
      if (fromState && fromState.length > 0) return fromState;
      return localFirstSync.getSnapshot(collection);
    },
    [state.data],
  );

  const refreshCollection = useCallback(
    async (collection: string): Promise<void> => {
      try {
        const allData = await phpApiService.loadAll();
        const rows = (allData[collection] ?? []) as Record<string, unknown>[];
        localFirstSync.mergeServerRecords(collection, rows);
      } catch {
        /* offline — keep local */
      }
      dispatch({
        type: "UPDATE_COLLECTION",
        collection,
        records: localFirstSync.getSnapshot(collection),
      });
    },
    [],
  );

  const saveData = useCallback(
    async (
      collection: string,
      item: Record<string, unknown>,
    ): Promise<Record<string, unknown>> => {
      // Write to IndexedDB + queue MySQL push
      const saved = await localFirstSync.save(collection, item, "create");
      // Immediately reflect in context state
      dispatch({
        type: "UPDATE_COLLECTION",
        collection,
        records: localFirstSync.getSnapshot(collection),
      });
      return saved;
    },
    [],
  );

  const updateData = useCallback(
    async (
      collection: string,
      id: string,
      changes: Record<string, unknown>,
    ): Promise<void> => {
      const existing = localFirstSync
        .getSnapshot<Record<string, unknown>>(collection)
        .find((r) => r.id === id);
      const merged = { ...(existing ?? {}), ...changes, id };
      await localFirstSync.save(collection, merged, "update");
      dispatch({
        type: "UPDATE_COLLECTION",
        collection,
        records: localFirstSync.getSnapshot(collection),
      });
    },
    [],
  );

  const deleteData = useCallback(
    async (collection: string, id: string): Promise<void> => {
      await localFirstSync.save(collection, { id }, "delete");
      dispatch({
        type: "UPDATE_COLLECTION",
        collection,
        records: localFirstSync.getSnapshot(collection),
      });
    },
    [],
  );

  // ── Computed ──────────────────────────────────────────────────────────────

  const isReadOnly = state.currentSession?.isArchived ?? false;
  const canWrite = !isReadOnly || state.currentUser?.role === "superadmin";
  const unreadCount = state.notifications.filter((n) => !n.isRead).length;
  const isSyncLoading = state.syncStatus.state === "loading";
  const serverCounts = state.syncStatus.serverCounts;
  const syncCounts: Record<string, number> = {};
  for (const [k, v] of Object.entries(state.data)) syncCounts[k] = v.length;

  // Show loading screen only when we have NO cached data yet
  const hasCachedData = Object.values(state.data).some(
    (v) => Array.isArray(v) && v.length > 0,
  );
  const showLoading =
    state.currentUser !== null && state.isInitializing && !hasCachedData;
  const showError =
    state.currentUser !== null &&
    state.initError !== null &&
    !state.isInitializing;

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
        isSyncLoading,
        syncStatus: state.syncStatus,
        serverCounts,
        syncCounts,
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
      {/* Re-login modal — only shown when a logged-in user's token expires and
          silent re-auth fails. Never rendered on the login screen (currentUser
          is null there) or immediately after a fresh login (freshLoginRef guard). */}
      {showReLoginModal && state.currentUser !== null && (
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
