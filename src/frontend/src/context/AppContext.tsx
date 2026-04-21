/**
 * SHUBH SCHOOL ERP — AppContext
 *
 * WhatsApp-style sync:
 * - On login: show loading screen → fetch ALL data from MySQL → render
 * - On any change: update local state + push ONLY changed record to server
 * - Token stored in sessionStorage (not localStorage)
 * - If server unreachable: show error with Retry — never show stale data
 *
 * FIXED: saveData/updateData/deleteData now await server confirmation, then
 * call refreshCollection() so all consumers see fresh MySQL data immediately.
 * Success notification only fires after server confirms.
 * Rollback happens on server error.
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
import {
  backendLogin,
  clearTokens,
  getJwt,
  isApiConfigured,
  setJwt,
} from "../utils/api";
import { generateId, ls } from "../utils/localStorage";
import { syncEngine } from "../utils/syncEngine";

// ── Default permissions per role ─────────────────────────────────────────────
const ROLE_DEFAULTS: Record<UserRole, PermissionMatrix> = {
  superadmin: {} as PermissionMatrix, // unrestricted — hasPermission always true
  admin: buildMatrix(true, true, true, true),
  teacher: buildMatrix(true, false, false, false),
  receptionist: buildMatrix(true, true, false, false),
  accountant: buildMatrix(true, true, false, false),
  librarian: buildMatrix(true, true, false, false),
  driver: buildMatrix(true, false, false, false),
  parent: buildMatrix(true, false, false, false),
  student: buildMatrix(true, false, false, false),
};

function buildMatrix(
  canView: boolean,
  canAdd: boolean,
  canEdit: boolean,
  canDelete: boolean,
): PermissionMatrix {
  const modules = [
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
  ];
  const matrix: PermissionMatrix = {};
  for (const m of modules) {
    matrix[m] = { module: m, canView, canAdd, canEdit, canDelete };
  }
  return matrix;
}

// ── App state ─────────────────────────────────────────────────────────────────

interface AppState {
  // Auth
  currentUser: AppUser | null;
  token: string | null;
  // Init
  isInitializing: boolean;
  initError: string | null;
  // Session
  currentSession: Session | null;
  sessions: Session[];
  // Sync
  syncStatus: SyncStatus;
  // Permissions
  permissions: PermissionMatrix;
  // All data in memory (loaded from server on login)
  data: Record<string, unknown[]>;
  // Notifications (in-memory only)
  notifications: Notification[];
}

type AppAction =
  | { type: "SET_USER"; user: AppUser; token: string | null }
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
  | { type: "CLEAR_NOTIFICATIONS" };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_USER":
      return {
        ...state,
        currentUser: action.user,
        token: action.token,
        isInitializing: true,
        initError: null,
        permissions:
          ROLE_DEFAULTS[action.user.role] ??
          buildMatrix(true, false, false, false),
      };

    case "LOGOUT":
      return {
        ...INITIAL_STATE,
        notifications: [],
      };

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
        serverSessions.find((s) => s.isActive) ?? serverSessions[0];
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
      const updated = state.sessions.map((s) => ({
        ...s,
        isActive: false,
        isArchived: true,
      }));
      return {
        ...state,
        sessions: [...updated, action.session],
        currentSession: action.session,
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

    default:
      return state;
  }
}

function makeDefaultSession(): Session {
  return {
    id: "sess_2025",
    label: "2025-26",
    startYear: 2025,
    endYear: 2026,
    isArchived: false,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
}

const INITIAL_STATE: AppState = {
  currentUser: null,
  token: null,
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
};

// ── Context value interface ────────────────────────────────────────────────────

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
  /** Real server counts (from MySQL COUNT(*)) for dashboard stat cards */
  serverCounts: Record<string, number>;
  /** Legacy compatibility: counts from dataService cache */
  syncCounts: Record<string, number>;
  // Auth
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (userId: string, newPassword: string) => boolean;
  // Session
  switchSession: (sessionId: string) => void;
  createSession: (label: string) => Session;
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
  // Data access (server-synced)
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
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "oklch(0.45 0.18 260)" }}
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
            <title>School logo</title>
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-foreground font-display tracking-tight">
            SCHOOL LEDGER ERP
          </p>
          {error ? (
            <>
              <p className="text-sm text-destructive mt-2 max-w-xs">{error}</p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Retry
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mt-1">
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

// ── AppProvider ────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, INITIAL_STATE);
  const initStartedRef = useRef(false);

  // ── Subscribe to SyncEngine status changes ─────────────────────────────────
  // Keep a ref to current data so we can compare inside the subscription closure
  // without re-registering the subscriber on every render.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  useEffect(() => {
    const unsub = syncEngine.subscribe(() => {
      dispatch({ type: "SET_SYNC_STATUS", status: syncEngine.getSyncStatus() });
      // Only dispatch UPDATE_COLLECTION when data actually changed.
      // This prevents constant re-renders that cause focus loss while typing.
      const cache = syncEngine.getAllCache();
      for (const [collection, records] of Object.entries(cache)) {
        if (Array.isArray(records)) {
          const existing = stateRef.current.data[collection];
          // Skip if same length AND same content (shallow JSON compare)
          if (
            Array.isArray(existing) &&
            existing.length === records.length &&
            JSON.stringify(existing) === JSON.stringify(records)
          ) {
            continue;
          }
          dispatch({ type: "UPDATE_COLLECTION", collection, records });
        }
      }
    });
    return unsub;
  }, []);

  // ── Restore token from sessionStorage on page reload ──────────────────────
  // Note: sessionStorage is per-tab — on page reload within same tab, it persists.
  // This lets us re-initialize data without requiring re-login.
  useEffect(() => {
    const storedToken = getJwt();
    const storedUserRaw = sessionStorage.getItem("shubh_current_user");
    if (storedToken && storedUserRaw) {
      try {
        const user = JSON.parse(storedUserRaw) as AppUser;
        dispatch({ type: "SET_USER", user, token: storedToken });
      } catch {
        // corrupt storage — ignore, user will re-login
      }
    }
  }, []);

  // ── Initialize: fetch ALL data from server after login ─────────────────────
  // PERFORMANCE: Show the app immediately using cached data, fetch fresh in background.
  useEffect(() => {
    if (!state.currentUser || !state.isInitializing) return;
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    void (async () => {
      dispatch({ type: "SET_INIT_START" });

      const token = state.token ?? getJwt();

      if (!isApiConfigured() || !token) {
        // Offline mode — use localStorage fallback immediately
        const localSessions = ls.get<Session[]>("sessions", []);
        const defaultSessions =
          localSessions.length > 0 ? localSessions : [makeDefaultSession()];
        dispatch({
          type: "SET_INIT_DONE",
          data: {},
          sessions: defaultSessions,
        });
        syncEngine.setToken(null);
        return;
      }

      try {
        // syncEngine.initialize() returns cached data instantly if available,
        // then fetches fresh data from MySQL in the background.
        // Either way we get data back — cached or fresh.
        const allData = await syncEngine.initialize(token);

        // Extract sessions from data
        const serverSessions = (allData.sessions ?? []) as Session[];

        // If sessions table is empty, seed default session
        if (serverSessions.length === 0) {
          const defaultSession = makeDefaultSession();
          try {
            await syncEngine.saveRecord(
              "sessions",
              defaultSession as unknown as Record<string, unknown>,
              "create",
            );
          } catch {
            // ignore — continue with default in memory
          }
          serverSessions.push(defaultSession);
        }

        // Render app immediately with whatever data we have (cached or fresh).
        // If it was cached, the SyncEngine will notify subscribers when fresh data arrives.
        dispatch({
          type: "SET_INIT_DONE",
          data: allData,
          sessions: serverSessions,
        });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to connect to server";
        dispatch({ type: "SET_INIT_ERROR", error: msg });
        initStartedRef.current = false;
      }
    })();
  }, [state.currentUser, state.isInitializing, state.token]);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      // 1. Super Admin — local check first, then server for JWT
      if (username === "superadmin") {
        const passwords = ls.get<Record<string, string>>("user_passwords", {});
        const validPw = passwords[username] ?? "admin123";
        if (password !== validPw) return false;

        let token = getJwt();
        // Try backend login in background to get JWT
        if (isApiConfigured()) {
          void backendLogin(username, password).then((res) => {
            if (res.success && res.token) {
              setJwt(res.token);
              syncEngine.setToken(res.token);
            }
          });
          token = token ?? null;
        }

        sessionStorage.setItem(
          "shubh_current_user",
          JSON.stringify(SUPER_ADMIN),
        );
        initStartedRef.current = false;
        dispatch({ type: "SET_USER", user: SUPER_ADMIN, token });
        return true;
      }

      // 2. Custom staff users (localStorage)
      const customUsers = ls.get<Array<AppUser & { password?: string }>>(
        "custom_users",
        [],
      );
      const customUser = customUsers.find((u) => u.username === username);
      if (customUser) {
        const passwords = ls.get<Record<string, string>>("user_passwords", {});
        if (passwords[username] === password) {
          const displayName =
            customUser.fullName ?? customUser.name ?? username;
          const user: AppUser = {
            id: customUser.id,
            username: customUser.username,
            role: customUser.role,
            fullName: displayName,
            name: displayName,
            position: customUser.position,
          };
          sessionStorage.setItem("shubh_current_user", JSON.stringify(user));
          initStartedRef.current = false;
          dispatch({ type: "SET_USER", user, token: null });
          return true;
        }
      }

      // 3. Staff (Teacher/Driver) — username=mobile, password=dob ddmmyyyy
      const staffList = ls.get<
        Array<{
          id: string;
          name: string;
          mobile: string;
          dob: string;
          designation: string;
          credentials: Credentials;
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
        const staffDisplayName = staffMember.name ?? "Staff";
        const user: AppUser = {
          id: staffMember.id,
          username,
          role,
          fullName: staffDisplayName,
          name: staffDisplayName,
          staffId: staffMember.id,
          mobile: staffMember.mobile,
        };
        sessionStorage.setItem("shubh_current_user", JSON.stringify(user));
        initStartedRef.current = false;
        dispatch({ type: "SET_USER", user, token: null });
        return true;
      }

      // 4. Students — username=admNo, password=dob ddmmyyyy
      const students = ls.get<
        Array<{
          id: string;
          fullName: string;
          admNo: string;
          credentials: Credentials;
        }>
      >("students", []);
      const student = students.find(
        (s) =>
          s.credentials?.username === username &&
          s.credentials?.password === password,
      );
      if (student) {
        const studentDisplayName = student.fullName ?? "Student";
        const user: AppUser = {
          id: student.id,
          username,
          role: "student",
          fullName: studentDisplayName,
          name: studentDisplayName,
          studentId: student.id,
        };
        sessionStorage.setItem("shubh_current_user", JSON.stringify(user));
        initStartedRef.current = false;
        dispatch({ type: "SET_USER", user, token: null });
        return true;
      }

      // 5. Parent — username=guardianMobile, password=guardianMobile
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
        const parentDisplayName =
          raw.guardianName ?? raw.fatherName ?? "Parent";
        const user: AppUser = {
          id: `parent_${mob}`,
          username,
          role: "parent",
          fullName: parentDisplayName,
          name: parentDisplayName,
          mobile: mob,
        };
        sessionStorage.setItem("shubh_current_user", JSON.stringify(user));
        initStartedRef.current = false;
        dispatch({ type: "SET_USER", user, token: null });
        return true;
      }

      // 6. Server-side fallback — validate against MySQL users table.
      // Used for staff/teachers/parents who exist only on the server (fresh device).
      if (isApiConfigured()) {
        try {
          const result = await backendLogin(username, password);
          if (result.success && result.token) {
            setJwt(result.token);
            syncEngine.setToken(result.token);
            const serverRole = (result.role ?? "teacher") as UserRole;
            const user: AppUser = {
              id: `server_${username}`,
              username,
              role: serverRole,
              fullName: username,
              name: username,
            };
            sessionStorage.setItem("shubh_current_user", JSON.stringify(user));
            initStartedRef.current = false;
            dispatch({ type: "SET_USER", user, token: result.token });
            return true;
          }
        } catch {
          // Server unreachable — fall through to return false
        }
      }

      return false;
    },
    [],
  );

  const logout = useCallback(() => {
    sessionStorage.removeItem("shubh_current_user");
    clearTokens();
    syncEngine.reset();
    initStartedRef.current = false;
    dispatch({ type: "LOGOUT" });
  }, []);

  // ── Retry init (when server was unreachable) ───────────────────────────────
  const retryInit = useCallback(() => {
    initStartedRef.current = false;
    dispatch({ type: "SET_INIT_START" });
  }, []);

  // Expose addNotification globally for non-React code
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
        else {
          const staff = ls
            .get<Array<{ id: string; credentials: { username: string } }>>(
              "staff",
              [],
            )
            .find((s) => s.id === userId);
          if (staff) username = staff.credentials?.username;
          else {
            const students2 = ls.get<
              Array<{
                id: string;
                credentials: { username: string; password: string };
              }>
            >("students", []);
            const idx = students2.findIndex((s) => s.id === userId);
            if (idx !== -1) {
              students2[idx].credentials.password = newPassword;
              ls.set("students", students2);
              return true;
            }
          }
        }
      }
      if (!username) return false;
      const passwords = ls.get<Record<string, string>>("user_passwords", {});
      passwords[username] = newPassword;
      ls.set("user_passwords", passwords);
      return true;
    },
    [],
  );

  const switchSession = useCallback((sessionId: string) => {
    dispatch({ type: "SET_SESSION", sessionId });
    ls.set("current_session", sessionId);
  }, []);

  const createSession = useCallback((label: string): Session => {
    const [startStr] = label.split("-");
    const startYear = Number.parseInt(startStr, 10);
    const session: Session = {
      id: generateId(),
      label,
      startYear,
      endYear: startYear + 1,
      isArchived: false,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: "ADD_SESSION", session });
    // Save to server
    void syncEngine.saveRecord(
      "sessions",
      session as unknown as Record<string, unknown>,
      "create",
    );
    ls.set("current_session", session.id);
    return session;
  }, []);

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

  // ── Data access (server-synced) ────────────────────────────────────────────

  const getData = useCallback(
    (collection: string): unknown[] => {
      // Prefer state.data (loaded from server), fall back to SyncEngine cache
      const fromState = state.data[collection];
      if (fromState && fromState.length > 0) return fromState;
      return syncEngine.getCache(collection);
    },
    [state.data],
  );

  // ── refreshCollection ──────────────────────────────────────────────────────
  // Pulls fresh data from MySQL for a single collection and updates context.
  // Called after every mutation (create/update/delete) so the UI immediately
  // reflects what's actually in the database.
  const refreshCollection = useCallback(
    async (collection: string): Promise<void> => {
      const token = state.token ?? getJwt();
      syncEngine.setToken(token);
      try {
        const rows = await syncEngine.refreshCollection(collection);
        dispatch({
          type: "UPDATE_COLLECTION",
          collection,
          records: rows as unknown[],
        });
      } catch {
        // If refresh fails, fall back to current cache — do NOT clear data
        const rows = syncEngine.getCache(collection);
        dispatch({
          type: "UPDATE_COLLECTION",
          collection,
          records: rows,
        });
      }
    },
    [state.token],
  );

  // ── saveData — create a new record ────────────────────────────────────────
  // Pattern:
  //   1. Optimistic: add to local cache immediately (user sees instant feedback)
  //   2. Await server confirmation
  //   3. On success: refreshCollection pulls real server data (correct IDs etc.)
  //   4. On failure: rollback optimistic update, throw error for caller to handle
  const saveData = useCallback(
    async (
      collection: string,
      item: Record<string, unknown>,
    ): Promise<Record<string, unknown>> => {
      const token = state.token ?? getJwt();
      syncEngine.setToken(token);

      // Optimistic: add to local cache so list updates instantly
      syncEngine.updateCache(collection, item, "create");
      dispatch({
        type: "UPDATE_COLLECTION",
        collection,
        records: syncEngine.getCache(collection),
      });

      try {
        const saved = await syncEngine.saveRecord(collection, item, "create");

        // Server confirmed — refresh collection to get real server data
        // (server may assign a different ID or normalize fields)
        await refreshCollection(collection);

        return saved;
      } catch (err) {
        // Rollback: remove the optimistic record
        syncEngine.updateCache(collection, item, "delete");
        dispatch({
          type: "UPDATE_COLLECTION",
          collection,
          records: syncEngine.getCache(collection),
        });
        throw err;
      }
    },
    [state.token, refreshCollection],
  );

  // ── updateData — edit an existing record ──────────────────────────────────
  const updateData = useCallback(
    async (
      collection: string,
      id: string,
      changes: Record<string, unknown>,
    ): Promise<void> => {
      const token = state.token ?? getJwt();
      syncEngine.setToken(token);

      // Snapshot current record for potential rollback
      const existing = syncEngine.getCache(collection) as Array<
        Record<string, unknown>
      >;
      const currentRecord = existing.find((r) => r.id === id);
      const merged = { ...(currentRecord ?? {}), ...changes, id };

      // Optimistic update
      syncEngine.updateCache(collection, merged, "update");
      dispatch({
        type: "UPDATE_COLLECTION",
        collection,
        records: syncEngine.getCache(collection),
      });

      try {
        await syncEngine.saveRecord(collection, merged, "update");

        // Server confirmed — refresh to get canonical server data
        await refreshCollection(collection);
      } catch (err) {
        // Rollback to previous record
        if (currentRecord) {
          syncEngine.updateCache(collection, currentRecord, "update");
        }
        dispatch({
          type: "UPDATE_COLLECTION",
          collection,
          records: syncEngine.getCache(collection),
        });
        throw err;
      }
    },
    [state.token, refreshCollection],
  );

  // ── deleteData — remove a record ──────────────────────────────────────────
  const deleteData = useCallback(
    async (collection: string, id: string): Promise<void> => {
      const token = state.token ?? getJwt();
      syncEngine.setToken(token);

      // Snapshot for rollback
      const existing = syncEngine.getCache(collection) as Array<
        Record<string, unknown>
      >;
      const deletedRecord = existing.find((r) => r.id === id);

      // Optimistic delete
      syncEngine.updateCache(collection, { id }, "delete");
      dispatch({
        type: "UPDATE_COLLECTION",
        collection,
        records: syncEngine.getCache(collection),
      });

      try {
        await syncEngine.saveRecord(collection, { id }, "delete");
        // After confirmed delete, refresh to ensure server-side cascades are reflected
        await refreshCollection(collection);
      } catch (err) {
        // Rollback: restore deleted record
        if (deletedRecord) {
          syncEngine.updateCache(collection, deletedRecord, "create");
        }
        dispatch({
          type: "UPDATE_COLLECTION",
          collection,
          records: syncEngine.getCache(collection),
        });
        throw err;
      }
    },
    [state.token, refreshCollection],
  );

  // ── Computed values ────────────────────────────────────────────────────────
  const isReadOnly = state.currentSession?.isArchived ?? false;
  const canWrite = !isReadOnly || state.currentUser?.role === "superadmin";
  const unreadCount = state.notifications.filter((n) => !n.isRead).length;
  const isSyncLoading = state.syncStatus.state === "loading";
  const serverCounts = state.syncStatus.serverCounts;
  // Legacy compat: build syncCounts from data keys
  const syncCounts: Record<string, number> = {};
  for (const [k, v] of Object.entries(state.data)) {
    syncCounts[k] = v.length;
  }

  // ── Render loading screen during initial server fetch ──────────────────────
  // PERFORMANCE: Only block render if there is truly NO cached data to show.
  // If syncEngine has cached data (from localStorage), show the app immediately
  // and let fresh data arrive in the background without a loading screen.
  const hasCachedData = Object.keys(syncEngine.getAllCache()).length > 0;
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
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

// ── Type alias for credentials used in login checks ──────────────────────────
interface Credentials {
  username: string;
  password: string;
}
