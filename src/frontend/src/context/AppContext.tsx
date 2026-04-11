import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { AppUser, Notification, Session, UserRole } from "../types";
import { generateId, ls } from "../utils/localStorage";

interface AppContextValue {
  currentUser: AppUser | null;
  currentSession: Session | null;
  sessions: Session[];
  notifications: Notification[];
  unreadCount: number;
  isReadOnly: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  changePassword: (userId: string, newPassword: string) => boolean;
  switchSession: (sessionId: string) => void;
  addNotification: (
    message: string,
    type?: Notification["type"],
    icon?: string,
  ) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
  createSession: (label: string) => Session;
}

const AppContext = createContext<AppContextValue | null>(null);

// Super Admin is hard-coded only — all other credentials are dynamic from localStorage
const SUPER_ADMIN: AppUser = {
  id: "su1",
  username: "superadmin",
  role: "superadmin",
  name: "Super Admin",
};

function initDefaultSession(): Session {
  const existing = ls.get<Session[]>("sessions", []);
  if (existing.length > 0) {
    const active = existing.find((s) => s.isActive);
    return active ?? existing[0];
  }
  const session: Session = {
    id: "sess_2025",
    label: "2025-26",
    startYear: 2025,
    endYear: 2026,
    isArchived: false,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  ls.set("sessions", [session]);
  ls.set("current_session", session.id);
  return session;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() =>
    ls.get<AppUser | null>("current_user", null),
  );
  const [sessions, setSessions] = useState<Session[]>(() => {
    initDefaultSession();
    return ls.get<Session[]>("sessions", []);
  });
  const [currentSessionId, setCurrentSessionId] = useState<string>(() =>
    ls.get<string>("current_session", "sess_2025"),
  );
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    ls.get<Notification[]>("notifications", []),
  );

  const currentSession =
    sessions.find((s) => s.id === currentSessionId) ?? sessions[0] ?? null;
  const isReadOnly = currentSession?.isArchived ?? false;
  const unreadCount = notifications.filter((n) => !n.isRead).length;

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
      setNotifications((prev) => {
        const updated = [notif, ...prev].slice(0, 50);
        ls.set("notifications", updated);
        return updated;
      });
    },
    [],
  );

  useEffect(() => {
    (window as unknown as Record<string, unknown>).addErpNotification = (
      msg: string,
      type?: string,
      icon?: string,
    ) => {
      addNotification(msg, (type as Notification["type"]) ?? "info", icon);
    };
  }, [addNotification]);

  const login = useCallback((username: string, password: string): boolean => {
    // 1. Super Admin
    if (username === "superadmin") {
      const storedPw = ls.get<Record<string, string>>("user_passwords", {})[
        username
      ];
      const validPw = storedPw ?? "admin123";
      if (password !== validPw) return false;
      setCurrentUser(SUPER_ADMIN);
      ls.set("current_user", SUPER_ADMIN);
      return true;
    }

    // 2. Custom staff users (Admin, Receptionist, Accountant, Librarian, Driver added via User Management)
    const customUsers = ls.get<Array<AppUser & { password?: string }>>(
      "custom_users",
      [],
    );
    const customUser = customUsers.find((u) => u.username === username);
    if (customUser) {
      const passwords = ls.get<Record<string, string>>("user_passwords", {});
      const storedPw = passwords[username];
      if (storedPw && storedPw === password) {
        const user: AppUser = {
          id: customUser.id,
          username: customUser.username,
          role: customUser.role,
          name: customUser.name,
          position: customUser.position,
        };
        setCurrentUser(user);
        ls.set("current_user", user);
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
        name: staffMember.name,
        staffId: staffMember.id,
        mobile: staffMember.mobile,
      };
      setCurrentUser(user);
      ls.set("current_user", user);
      return true;
    }

    // 4. Students — username=admNo, password=dob ddmmyyyy
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
        name: student.fullName,
        studentId: student.id,
      };
      setCurrentUser(user);
      ls.set("current_user", user);
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
      const user: AppUser = {
        id: `parent_${mob}`,
        username,
        role: "parent",
        name: raw.guardianName ?? raw.fatherName ?? "Parent",
        mobile: mob,
      };
      setCurrentUser(user);
      ls.set("current_user", user);
      return true;
    }

    return false;
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    ls.remove("current_user");
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
    setCurrentSessionId(sessionId);
    ls.set("current_session", sessionId);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, isRead: true }));
      ls.set("notifications", updated);
      return updated;
    });
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    ls.set("notifications", []);
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
    setSessions((prev) => {
      const updated = prev.map((s) => ({
        ...s,
        isActive: false,
        isArchived: true,
      }));
      const all = [...updated, session];
      ls.set("sessions", all);
      return all;
    });
    setCurrentSessionId(session.id);
    ls.set("current_session", session.id);
    return session;
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        currentSession,
        sessions,
        notifications,
        unreadCount,
        isReadOnly,
        login,
        logout,
        changePassword,
        switchSession,
        addNotification,
        markAllRead,
        clearNotifications,
        createSession,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
