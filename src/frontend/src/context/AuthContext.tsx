import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { defaultPermissions } from "../data/permissions";
import type { Role, RolePermissions, User } from "../types/auth";

export interface DemoUser {
  userId: string;
  password: string;
  name: string;
  role: Role;
}

export const DEMO_USERS: DemoUser[] = [
  {
    userId: "superadmin",
    password: "admin123",
    name: "Super Admin",
    role: "super_admin",
  },
  {
    userId: "admin",
    password: "admin123",
    name: "School Admin",
    role: "admin",
  },
  {
    userId: "accountant",
    password: "acc123",
    name: "Ramesh Gupta",
    role: "accountant",
  },
  {
    userId: "librarian",
    password: "lib123",
    name: "Sunita Sharma",
    role: "librarian",
  },
  {
    userId: "teacher",
    password: "teacher123",
    name: "Priya Nair",
    role: "teacher",
  },
  {
    userId: "parent",
    password: "parent123",
    name: "Vijay Mehta",
    role: "parent",
  },
  {
    userId: "student",
    password: "student123",
    name: "Aarav Mehta",
    role: "student",
  },
  {
    userId: "driver",
    password: "driver123",
    name: "Raju Yadav",
    role: "driver",
  },
];

const AUTH_KEY = "erp_auth_user";
const PERMS_KEY = "erp_role_permissions";
const CREDENTIALS_KEY = "erp_user_credentials";

export interface StoredCredential {
  userId: string;
  password: string;
  name: string;
  role: Role;
  studentAdmNo?: string;
  teacherMobile?: string;
  parentOf?: string[];
}

// Get all credentials (demo + dynamic)
export function getAllCredentials(): StoredCredential[] {
  try {
    const stored = JSON.parse(localStorage.getItem(CREDENTIALS_KEY) || "[]");
    return stored as StoredCredential[];
  } catch {
    return [];
  }
}

export function saveCredentials(creds: StoredCredential[]): void {
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(creds));
}

export function updateUserPassword(
  userId: string,
  newPassword: string,
): boolean {
  const creds = getAllCredentials();
  const idx = creds.findIndex((c) => c.userId === userId);
  if (idx >= 0) {
    creds[idx].password = newPassword;
    saveCredentials(creds);
    return true;
  }
  return false;
}

function formatDOB(dob: string): string {
  // Input: YYYY-MM-DD, output: DDMMYYYY
  if (!dob) return "";
  const parts = dob.split("-");
  if (parts.length === 3) {
    return `${parts[2]}${parts[1]}${parts[0]}`;
  }
  return dob.replace(/-/g, "");
}

export function generateCredentialsFromData(): void {
  try {
    const existing = getAllCredentials();
    const existingUserIds = new Set(existing.map((c) => c.userId));

    // Always ensure demo users exist
    const toAdd: StoredCredential[] = [];
    for (const demo of DEMO_USERS) {
      if (!existingUserIds.has(demo.userId)) {
        toAdd.push({
          userId: demo.userId,
          password: demo.password,
          name: demo.name,
          role: demo.role,
        });
        existingUserIds.add(demo.userId);
      }
    }

    // Generate student credentials
    const students = JSON.parse(
      localStorage.getItem("erp_students") || "[]",
    ) as Array<{
      admNo: string;
      name: string;
      dob: string;
      contact?: string;
      fatherName?: string;
    }>;

    const parentMobiles = new Map<
      string,
      { name: string; children: string[] }
    >();

    for (const s of students) {
      if (!s.admNo) continue;
      const username = s.admNo;
      const password = formatDOB(s.dob);
      if (!existingUserIds.has(username)) {
        toAdd.push({
          userId: username,
          password: password || "00000000",
          name: s.name,
          role: "student",
          studentAdmNo: s.admNo,
        });
        existingUserIds.add(username);
      }
      // Track parent
      if (s.contact) {
        if (!parentMobiles.has(s.contact)) {
          parentMobiles.set(s.contact, {
            name: `Parent of ${s.name}`,
            children: [s.admNo],
          });
        } else {
          parentMobiles.get(s.contact)!.children.push(s.admNo);
        }
      }
    }

    // Generate parent credentials
    for (const [mobile, info] of parentMobiles) {
      if (!mobile || existingUserIds.has(mobile)) continue;
      toAdd.push({
        userId: mobile,
        password: mobile,
        name: info.name,
        role: "parent",
        parentOf: info.children,
      });
      existingUserIds.add(mobile);
    }

    // Generate teacher credentials
    const staff = JSON.parse(
      localStorage.getItem("erp_staff") || "[]",
    ) as Array<{
      name: string;
      contact: string;
      dob: string;
      designation: string;
    }>;

    for (const t of staff) {
      if (!t.contact) continue;
      const username = t.contact;
      const password = formatDOB(t.dob);
      if (!existingUserIds.has(username)) {
        const isDriver = t.designation?.toLowerCase().includes("driver");
        toAdd.push({
          userId: username,
          password: password || "00000000",
          name: t.name,
          role: isDriver ? "driver" : "teacher",
          teacherMobile: t.contact,
        });
        existingUserIds.add(username);
      }
    }

    if (toAdd.length > 0) {
      saveCredentials([...existing, ...toAdd]);
    }
  } catch (e) {
    console.warn("Credential generation failed:", e);
  }
}

interface AuthContextValue {
  user: User | null;
  login: (userId: string, password: string, role: Role) => boolean;
  logout: () => void;
  permissions: Record<Role, RolePermissions>;
  updateRolePermissions: (role: Role, perms: RolePermissions) => void;
  changePassword: (
    userId: string,
    currentPwd: string,
    newPwd: string,
  ) => boolean;
  resetPassword: (userId: string, newPwd: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [permissions, setPermissions] = useState<Record<Role, RolePermissions>>(
    () => {
      try {
        const stored = localStorage.getItem(PERMS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return { ...defaultPermissions, ...parsed };
        }
      } catch {}
      return defaultPermissions;
    },
  );

  useEffect(() => {
    if (user) localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    else localStorage.removeItem(AUTH_KEY);
  }, [user]);

  const login = useCallback(
    (userId: string, password: string, role: Role): boolean => {
      // Check DEMO_USERS first (always works)
      const demo = DEMO_USERS.find(
        (u) =>
          u.userId === userId && u.password === password && u.role === role,
      );
      if (demo) {
        const newUser: User = {
          id: demo.userId,
          name: demo.name,
          role: demo.role,
          userId: demo.userId,
        };
        setUser(newUser);
        // Update last login
        try {
          const creds = getAllCredentials();
          const idx = creds.findIndex((c) => c.userId === userId);
          if (idx < 0) {
            creds.push({ ...demo });
            saveCredentials(creds);
          }
        } catch {}
        return true;
      }

      // Check dynamic credentials
      const creds = getAllCredentials();
      const found = creds.find(
        (c) =>
          c.userId === userId && c.password === password && c.role === role,
      );
      if (found) {
        const newUser: User = {
          id: found.userId,
          name: found.name,
          role: found.role,
          userId: found.userId,
        };
        setUser(newUser);
        return true;
      }
      return false;
    },
    [],
  );

  const logout = useCallback(() => setUser(null), []);

  const changePassword = useCallback(
    (userId: string, currentPwd: string, newPwd: string): boolean => {
      // Check demo users
      const demo = DEMO_USERS.find((u) => u.userId === userId);
      if (demo && demo.password !== currentPwd) return false;

      const creds = getAllCredentials();
      const idx = creds.findIndex((c) => c.userId === userId);
      if (idx >= 0) {
        if (creds[idx].password !== currentPwd && !demo) return false;
        creds[idx].password = newPwd;
        saveCredentials(creds);
        return true;
      }
      // Add if not exists (demo user changing password)
      if (demo) {
        creds.push({
          userId,
          password: newPwd,
          name: demo.name,
          role: demo.role,
        });
        saveCredentials(creds);
        return true;
      }
      return false;
    },
    [],
  );

  const resetPassword = useCallback(
    (userId: string, newPwd: string): boolean => {
      const creds = getAllCredentials();
      const idx = creds.findIndex((c) => c.userId === userId);
      if (idx >= 0) {
        creds[idx].password = newPwd;
        saveCredentials(creds);
        return true;
      }
      // Add if it's a demo user
      const demo = DEMO_USERS.find((u) => u.userId === userId);
      if (demo) {
        creds.push({
          userId,
          password: newPwd,
          name: demo.name,
          role: demo.role,
        });
        saveCredentials(creds);
        return true;
      }
      return false;
    },
    [],
  );

  const updateRolePermissions = useCallback(
    (role: Role, perms: RolePermissions) => {
      setPermissions((prev) => {
        const next = { ...prev, [role]: perms };
        localStorage.setItem(PERMS_KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        permissions,
        updateRolePermissions,
        changePassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
