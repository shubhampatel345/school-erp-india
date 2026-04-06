import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Archive,
  Bell,
  Building2,
  Calendar,
  CheckCheck,
  CheckSquare,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  Trash2,
  User,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSchool } from "../../context/SchoolContext";

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-500/20 text-red-300 border-red-500/30",
  admin: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  accountant: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  librarian: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  teacher: "bg-green-500/20 text-green-300 border-green-500/30",
  parent: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  student: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  driver: "bg-teal-500/20 text-teal-300 border-teal-500/30",
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  accountant: "Accountant",
  librarian: "Librarian",
  teacher: "Teacher",
  parent: "Parent",
  student: "Student",
  driver: "Driver",
};

// ─── ERP Notification Types ──────────────────────────────────────────────────
export interface ERPNotification {
  id: string;
  type:
    | "fee"
    | "attendance"
    | "student"
    | "exam"
    | "homework"
    | "general"
    | "checkin";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  icon?: string;
}

export function addERPNotification(
  notif: Omit<ERPNotification, "id" | "timestamp" | "read">,
) {
  try {
    const notifications: ERPNotification[] = JSON.parse(
      localStorage.getItem("erp_notifications") || "[]",
    );
    const newNotif: ERPNotification = {
      ...notif,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false,
    };
    const updated = [newNotif, ...notifications].slice(0, 100);
    localStorage.setItem("erp_notifications", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("erp_notification_added"));
  } catch {
    // ignore
  }
}

function getRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

const NOTIF_TYPE_COLORS: Record<string, string> = {
  fee: "bg-green-500/10 text-green-400",
  attendance: "bg-blue-500/10 text-blue-400",
  student: "bg-purple-500/10 text-purple-400",
  exam: "bg-yellow-500/10 text-yellow-400",
  homework: "bg-orange-500/10 text-orange-400",
  general: "bg-gray-500/10 text-gray-400",
  checkin: "bg-cyan-500/10 text-cyan-400",
};

// ─── Notification Bell Component ─────────────────────────────────────────────
function NotificationBell() {
  const [notifications, setNotifications] = useState<ERPNotification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(() => {
    try {
      const data: ERPNotification[] = JSON.parse(
        localStorage.getItem("erp_notifications") || "[]",
      );
      setNotifications(data);
    } catch {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const handler = () => loadNotifications();
    window.addEventListener("erp_notification_added", handler);
    return () => window.removeEventListener("erp_notification_added", handler);
  }, [loadNotifications]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    localStorage.setItem("erp_notifications", JSON.stringify(updated));
    setNotifications(updated);
  };

  const clearAll = () => {
    localStorage.setItem("erp_notifications", JSON.stringify([]));
    setNotifications([]);
  };

  const markRead = (id: string) => {
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n,
    );
    localStorage.setItem("erp_notifications", JSON.stringify(updated));
    setNotifications(updated);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-gray-400 hover:text-white relative p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
        data-ocid="header.notification.button"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5 font-bold">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-2 z-50 w-80 rounded-xl border border-gray-700 shadow-2xl overflow-hidden"
          style={{ background: "#1a1f2e" }}
          data-ocid="header.notification.popover"
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-3 py-2 border-b border-gray-700"
            style={{ background: "#141927" }}
          >
            <span className="text-white text-xs font-semibold flex items-center gap-1.5">
              <Bell size={12} className="text-yellow-400" />
              Notifications
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[9px] rounded-full px-1.5 py-0.5 font-bold">
                  {unreadCount}
                </span>
              )}
            </span>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-blue-900/20 transition"
                  data-ocid="header.notification.mark_all_read"
                >
                  <CheckCheck size={10} /> Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-red-900/20 transition"
                  data-ocid="header.notification.clear_button"
                >
                  <Trash2 size={10} /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
            {notifications.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-10 text-gray-500"
                data-ocid="header.notification.empty_state"
              >
                <Bell size={28} className="mb-2 opacity-30" />
                <p className="text-xs">No new notifications</p>
              </div>
            ) : (
              notifications.map((n, idx) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markRead(n.id)}
                  className={`w-full flex items-start gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-gray-800/60 transition border-b border-gray-700/50 text-left ${
                    !n.read
                      ? "border-l-2 border-l-blue-500"
                      : "border-l-2 border-l-transparent"
                  }`}
                  data-ocid={`header.notification.item.${idx + 1}`}
                >
                  <div
                    className={`text-base rounded-lg w-8 h-8 flex items-center justify-center flex-shrink-0 ${
                      NOTIF_TYPE_COLORS[n.type] || NOTIF_TYPE_COLORS.general
                    }`}
                  >
                    {n.icon || "🔔"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-medium leading-tight ${
                        n.read ? "text-gray-400" : "text-white"
                      }`}
                    >
                      {n.title}
                    </p>
                    <p className="text-[10px] text-gray-500 leading-snug mt-0.5 truncate">
                      {n.message}
                    </p>
                    <p className="text-[9px] text-gray-600 mt-1">
                      {getRelativeTime(n.timestamp)}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface HeaderProps {
  onToggleSidebar: () => void;
  isOnline: boolean;
  isSyncing: boolean;
}

export function Header({ onToggleSidebar, isOnline, isSyncing }: HeaderProps) {
  const { user, logout, changePassword } = useAuth();
  const { branches, activeBranch, setActiveBranch } = useSchool();
  const [branchOpen, setBranchOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const [sessionOpen, setSessionOpen] = useState(false);
  const sessionRef = useRef<HTMLDivElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [viewingSession, setViewingSession] = useState<string>(() => {
    return localStorage.getItem("erp_viewing_session") || "";
  });

  // Change password modal
  const [changePwdOpen, setChangePwdOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const archivedSessions: string[] = (() => {
    const sessions: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("erp_session_archive_")) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || "{}");
          if (data.sessionLabel) sessions.push(data.sessionLabel);
        } catch {
          /* ignore */
        }
      }
    }
    return sessions;
  })();

  const currentActiveSession = (() => {
    try {
      return (
        JSON.parse(localStorage.getItem("erp_settings") || "{}").session ||
        "2025-26"
      );
    } catch {
      return "2025-26";
    }
  })();

  const allSessions = [
    currentActiveSession,
    ...archivedSessions.filter((s) => s !== currentActiveSession),
  ];

  const switchSession = (session: string) => {
    const val = session === currentActiveSession ? "" : session;
    setViewingSession(val);
    localStorage.setItem("erp_viewing_session", val);
    setSessionOpen(false);
    window.dispatchEvent(
      new CustomEvent("erp_session_changed", { detail: { session: val } }),
    );
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        sessionRef.current &&
        !sessionRef.current.contains(e.target as Node)
      ) {
        setSessionOpen(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sessionButtonLabel = viewingSession
    ? viewingSession
    : `Current Session: ${currentActiveSession}`;

  const handleChangePwd = () => {
    setPwdError("");
    setPwdSuccess(false);
    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdError("All fields are required.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError("New passwords do not match.");
      return;
    }
    if (newPwd.length < 4) {
      setPwdError("Password must be at least 4 characters.");
      return;
    }
    if (!user) return;
    const success = changePassword(user.userId, currentPwd, newPwd);
    if (!success) {
      setPwdError("Current password is incorrect.");
      return;
    }
    setPwdSuccess(true);
    setCurrentPwd("");
    setNewPwd("");
    setConfirmPwd("");
    setTimeout(() => {
      setChangePwdOpen(false);
      setPwdSuccess(false);
    }, 1500);
  };

  return (
    <>
      <header
        className="flex items-center justify-between px-3 h-12 border-b border-gray-700 flex-shrink-0"
        style={{ background: "#1a1f2e" }}
      >
        {/* Left: Hamburger + Title */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="text-gray-300 hover:text-white p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
            data-ocid="header.toggle"
          >
            <Menu size={20} />
          </button>
          <span className="text-white font-semibold text-sm">SHUBH ERP</span>

          {/* Branch Switcher — hidden on mobile */}
          <div className="relative hidden md:block" ref={dropRef}>
            <button
              type="button"
              onClick={() => setBranchOpen((v) => !v)}
              className="flex items-center gap-1 text-xs text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded px-2 py-1 transition"
              data-ocid="header.branch.toggle"
            >
              <Building2 size={12} className="text-blue-400" />
              <span className="max-w-[120px] truncate">
                {activeBranch?.name ?? "Select Branch"}
              </span>
              <ChevronDown size={11} />
            </button>
            {branchOpen && (
              <div
                className="absolute top-full left-0 mt-1 z-50 min-w-[160px] rounded border border-gray-600 shadow-xl"
                style={{ background: "#1e293b" }}
              >
                {branches.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setActiveBranch(b);
                      setBranchOpen(false);
                    }}
                    data-ocid="header.branch.item"
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-700 transition ${
                      activeBranch?.id === b.id
                        ? "text-blue-400 font-semibold"
                        : "text-gray-300"
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Session Switcher — hidden on mobile */}
          <div className="relative hidden md:block" ref={sessionRef}>
            <button
              type="button"
              onClick={() => setSessionOpen((v) => !v)}
              className={`flex items-center gap-1 text-xs border rounded px-2 py-1 transition ${
                viewingSession
                  ? "text-amber-300 bg-amber-900/30 border-amber-500/50 hover:bg-amber-900/40"
                  : "text-green-300 bg-green-900/20 hover:bg-green-900/30 border-green-600/50 hover:text-white"
              }`}
              data-ocid="header.session.toggle"
            >
              <Archive
                size={11}
                className={viewingSession ? "text-amber-400" : "text-green-400"}
              />
              <span className="max-w-[160px] truncate">
                {sessionButtonLabel}
              </span>
              <ChevronDown size={11} />
            </button>
            {sessionOpen && (
              <div
                className="absolute top-full left-0 mt-1 z-50 min-w-[180px] rounded border border-gray-600 shadow-xl"
                style={{ background: "#1e293b" }}
              >
                <div className="px-3 py-1.5 text-[10px] text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-700">
                  Select Session
                </div>
                {allSessions.map((s) => {
                  const isCurrent = s === currentActiveSession;
                  const isSelected = viewingSession
                    ? s === viewingSession
                    : isCurrent;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => switchSession(s)}
                      data-ocid="header.session.item"
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-700 transition flex items-center justify-between ${
                        isSelected
                          ? "text-blue-400 font-semibold"
                          : "text-gray-300"
                      }`}
                    >
                      <span>{isCurrent ? `Current Session: ${s}` : s}</span>
                      <span className="flex items-center gap-1">
                        {isCurrent && (
                          <span className="text-[9px] bg-green-900/50 text-green-400 px-1.5 py-0.5 rounded">
                            Active
                          </span>
                        )}
                        {isSelected && <span className="text-blue-400">✓</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Search — hidden on mobile */}
        <div className="hidden md:flex items-center flex-1 max-w-xs mx-4">
          <div className="flex items-center bg-gray-800 rounded px-2 py-1 flex-1">
            <Search size={14} className="text-gray-400 mr-1" />
            <input
              placeholder="Search By Student"
              className="bg-transparent text-gray-300 text-xs outline-none w-full"
              data-ocid="header.search_input"
            />
          </div>
        </div>

        {/* Right: status + actions */}
        <div className="flex items-center gap-1">
          {/* Online status — hidden on mobile to save space */}
          <span className="hidden md:flex items-center">
            {isSyncing ? (
              <span className="flex items-center gap-1 text-yellow-400 text-xs bg-yellow-900/30 px-2 py-0.5 rounded-full">
                <RefreshCw size={10} className="animate-spin" /> Syncing
              </span>
            ) : isOnline ? (
              <span className="flex items-center gap-1 text-green-400 text-xs bg-green-900/30 px-2 py-0.5 rounded-full">
                <Wifi size={10} /> Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-orange-400 text-xs bg-orange-900/30 px-2 py-0.5 rounded-full">
                <WifiOff size={10} /> Offline
              </span>
            )}
          </span>

          <button
            type="button"
            className="text-gray-400 hover:text-white hidden md:block p-1"
          >
            <Calendar size={16} />
          </button>
          <button
            type="button"
            className="text-gray-400 hover:text-white hidden md:block p-1"
          >
            <CheckSquare size={16} />
          </button>

          {/* Live Notification Bell */}
          <NotificationBell />

          {/* User Profile Dropdown */}
          {user && (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-1.5 ml-1 pl-2 border-l border-gray-700 hover:bg-gray-700/50 rounded px-2 py-1 transition min-h-[44px]"
                data-ocid="header.profile.toggle"
              >
                <div className="hidden sm:block text-right">
                  <p className="text-white text-xs font-medium leading-none">
                    {user.name}
                  </p>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1 py-0 mt-0.5 border ${
                      ROLE_COLORS[user.role] ?? "bg-gray-700 text-gray-300"
                    }`}
                  >
                    {ROLE_LABELS[user.role] ?? user.role}
                  </Badge>
                </div>
                <User size={16} className="text-gray-400" />
                <ChevronDown size={11} className="text-gray-400" />
              </button>
              {profileOpen && (
                <div
                  className="absolute top-full right-0 mt-1 z-50 min-w-[180px] rounded border border-gray-600 shadow-xl"
                  style={{ background: "#1e293b" }}
                >
                  <div className="px-3 py-2 border-b border-gray-700">
                    <p className="text-white text-xs font-medium">
                      {user.name}
                    </p>
                    <p className="text-gray-400 text-[10px]">
                      {ROLE_LABELS[user.role]}
                    </p>
                    <p className="text-gray-500 text-[10px] font-mono">
                      {user.userId}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      setChangePwdOpen(true);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-gray-700 transition"
                    data-ocid="header.change_password.button"
                  >
                    <KeyRound size={13} /> Change Password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 transition rounded-b"
                    data-ocid="header.button"
                  >
                    <LogOut size={13} /> Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Change Password Modal */}
      {changePwdOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
          data-ocid="change_password.dialog"
        >
          <div
            className="rounded-xl p-6 w-full max-w-sm shadow-2xl mx-4"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <h3 className="text-white text-base font-semibold mb-1">
              Change Password
            </h3>
            <p className="text-gray-400 text-xs mb-4">
              Update your account password
            </p>
            {pwdSuccess ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-green-400 font-semibold">
                  Password changed successfully!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="hdr-current-password"
                    className="text-gray-400 text-xs block mb-1"
                  >
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      id="hdr-current-password"
                      type={showCurrent ? "text" : "password"}
                      value={currentPwd}
                      onChange={(e) => setCurrentPwd(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm outline-none focus:border-blue-500 pr-8"
                      data-ocid="change_password.input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="hdr-new-password"
                    className="text-gray-400 text-xs block mb-1"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="hdr-new-password"
                      type={showNew ? "text" : "password"}
                      value={newPwd}
                      onChange={(e) => setNewPwd(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm outline-none focus:border-blue-500 pr-8"
                      data-ocid="change_password.input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="hdr-confirm-new-password"
                    className="text-gray-400 text-xs block mb-1"
                  >
                    Confirm New Password
                  </label>
                  <input
                    id="hdr-confirm-password"
                    type="password"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleChangePwd()}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
                    data-ocid="change_password.input"
                  />
                </div>
                {pwdError && (
                  <p
                    className="text-red-400 text-xs"
                    data-ocid="change_password.error_state"
                  >
                    {pwdError}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleChangePwd}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 text-sm font-medium transition"
                    data-ocid="change_password.submit_button"
                  >
                    Change Password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChangePwdOpen(false);
                      setPwdError("");
                      setCurrentPwd("");
                      setNewPwd("");
                      setConfirmPwd("");
                    }}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded transition"
                    data-ocid="change_password.cancel_button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Explicit Button import suppression if unused
export { Button };
