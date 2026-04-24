import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ChevronDown,
  GraduationCap,
  KeyRound,
  Loader2,
  LogOut,
  Menu,
  Search,
  User,
  WifiOff,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import type { Student } from "../types";
import { ls } from "../utils/localStorage";
import NotificationBell from "./NotificationBell";

interface HeaderProps {
  onMenuToggle: () => void;
  onNavigate?: (page: string) => void;
}

const ROLE_LABELS: Record<string, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  teacher: "Teacher",
  parent: "Parent",
  student: "Student",
  driver: "Driver",
  receptionist: "Receptionist",
  accountant: "Accountant",
  librarian: "Librarian",
};

function getPrimaryMobile(s: Student): string {
  return (s.fatherMobile?.trim() || s.guardianMobile?.trim() || "").trim();
}

function getSiblingCount(student: Student, allStudents: Student[]): number {
  const pm = getPrimaryMobile(student);
  if (!pm) return 0;
  return allStudents.filter(
    (s) => s.id !== student.id && getPrimaryMobile(s) === pm,
  ).length;
}

/** Sync status indicator dot */
function SyncDot({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { syncStatus, serverConnected } = useApp();
  const [tooltip, setTooltip] = useState(false);

  const pendingCount = syncStatus.pendingCount ?? 0;

  type DotMode = "synced" | "pending" | "syncing" | "error" | "offline";
  let mode: DotMode = "synced";
  if (syncStatus.state === "loading") mode = "syncing";
  else if (syncStatus.state === "error") mode = "error";
  else if (!serverConnected) mode = "offline";
  else if (pendingCount > 0) mode = "pending";

  const config: Record<DotMode, { color: string; label: string }> = {
    synced: { color: "bg-emerald-500", label: "All data synced to server" },
    syncing: { color: "bg-amber-400 animate-pulse", label: "Syncing data…" },
    pending: {
      color: "bg-amber-400",
      label: `${pendingCount} changes pending`,
    },
    error: { color: "bg-destructive", label: "Sync error — tap to view" },
    offline: {
      color: "bg-destructive",
      label: "Server offline — data queued locally",
    },
  };

  const cfg = config[mode];

  const handleClick = () => {
    if (onNavigate) onNavigate("settings:server");
  };

  return (
    <button
      type="button"
      className="relative flex items-center cursor-pointer bg-transparent border-0 p-0"
      onMouseEnter={() => setTooltip(true)}
      onMouseLeave={() => setTooltip(false)}
      onClick={handleClick}
      data-ocid="header.sync_badge"
      aria-label={cfg.label}
    >
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.color}`} />
      {pendingCount > 0 && (
        <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 text-white text-[8px] font-bold flex items-center justify-center leading-none">
          {pendingCount > 9 ? "9+" : pendingCount}
        </span>
      )}
      {tooltip && (
        <div className="absolute right-0 top-5 z-50 whitespace-nowrap bg-card border border-border shadow-elevated rounded-lg px-2.5 py-1.5 text-xs text-foreground">
          {mode === "synced" && (
            <CheckCircle2 className="w-3 h-3 text-emerald-500 inline mr-1" />
          )}
          {mode === "syncing" && (
            <Loader2 className="w-3 h-3 text-amber-500 animate-spin inline mr-1" />
          )}
          {mode === "pending" && (
            <AlertTriangle className="w-3 h-3 text-amber-500 inline mr-1" />
          )}
          {(mode === "error" || mode === "offline") && (
            <WifiOff className="w-3 h-3 text-destructive inline mr-1" />
          )}
          {cfg.label}
        </div>
      )}
    </button>
  );
}

export default function Header({ onMenuToggle, onNavigate }: HeaderProps) {
  const {
    currentUser,
    currentSession,
    sessions,
    switchSession,
    logout,
    changePassword,
  } = useApp();
  const [sessionOpen, setSessionOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [pwModal, setPwModal] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const sessionRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // ── Global Search ──────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);

  useEffect(() => {
    setAllStudents(
      ls.get<Student[]>("students", []).filter((s) => s.status === "active"),
    );
  }, []);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    const q = searchQuery.toLowerCase();
    const results = allStudents
      .filter(
        (s) =>
          s.fullName?.toLowerCase().includes(q) ||
          s.admNo?.toLowerCase().includes(q) ||
          s.fatherMobile?.includes(q) ||
          s.motherMobile?.includes(q) ||
          s.guardianMobile?.includes(q) ||
          s.mobile?.includes(q) ||
          s.fatherName?.toLowerCase().includes(q) ||
          s.motherName?.toLowerCase().includes(q) ||
          s.address?.toLowerCase().includes(q) ||
          s.village?.toLowerCase().includes(q) ||
          s.class?.toLowerCase().includes(q),
      )
      .slice(0, 10);
    setSearchResults(results);
    setSearchOpen(results.length > 0);
  }, [searchQuery, allStudents]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sessionRef.current && !sessionRef.current.contains(e.target as Node))
        setSessionOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node))
        setUserOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setShowSearch(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleSearchSelect(student: Student) {
    setSearchQuery("");
    setSearchOpen(false);
    setShowSearch(false);
    if (onNavigate) {
      sessionStorage.setItem("collectFees_preload", student.id);
      onNavigate("students");
    }
  }

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);
    if (newPw.length < 4) {
      setPwError("Password must be at least 4 characters");
      return;
    }
    if (newPw !== confirmPw) {
      setPwError("Passwords do not match");
      return;
    }
    if (currentUser) {
      const ok = changePassword(currentUser.id, newPw);
      if (ok) {
        setPwSuccess(true);
        setNewPw("");
        setConfirmPw("");
        setTimeout(() => {
          setPwModal(false);
          setPwSuccess(false);
        }, 1500);
      } else {
        setPwError("Failed to update password. Please try again.");
      }
    }
  };

  return (
    <>
      <header className="h-14 bg-card border-b border-border flex items-center px-3 gap-2 shadow-subtle z-40 relative flex-shrink-0">
        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={onMenuToggle}
          className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
          aria-label="Toggle menu"
          data-ocid="header.hamburger"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>

        {/* Logo / Branding */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="hidden sm:block leading-none">
            <span className="font-display font-bold text-sm text-foreground tracking-tight block">
              SHUBH SCHOOL ERP
            </span>
            <span className="text-[10px] text-primary font-medium block">
              School B
            </span>
          </div>
        </div>

        {/* Current Session + switcher */}
        <div className="relative ml-1 flex-shrink-0" ref={sessionRef}>
          <button
            type="button"
            data-ocid="header.session_switcher"
            onClick={() => setSessionOpen((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors"
          >
            <span className="text-xs font-semibold text-primary leading-none">
              {currentSession ? currentSession.label : "No Session"}
            </span>
            {currentSession?.isArchived && (
              <span className="hidden sm:inline text-[10px] bg-yellow-200 text-yellow-800 px-1 rounded leading-none">
                Archived
              </span>
            )}
            <ChevronDown className="w-3 h-3 text-primary flex-shrink-0" />
          </button>

          {sessionOpen && (
            <div className="absolute left-0 top-full mt-1 w-60 bg-popover border border-border rounded-xl shadow-elevated z-50 overflow-hidden animate-slide-up">
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border bg-muted/30">
                Switch Session
              </div>
              {sessions.length === 0 ? (
                <div className="px-3 py-3 text-sm text-muted-foreground">
                  No sessions found
                </div>
              ) : (
                sessions.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => {
                      switchSession(s.id);
                      setSessionOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 text-sm hover:bg-muted flex items-center justify-between gap-2 transition-colors
                      ${s.id === currentSession?.id ? "bg-primary/10 text-primary font-semibold" : "text-foreground"}`}
                  >
                    <div className="flex items-center gap-2">
                      {s.isArchived && (
                        <Archive className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      )}
                      <span>{s.label}</span>
                    </div>
                    <div className="flex gap-1">
                      {s.isArchived && (
                        <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                          Archived
                        </span>
                      )}
                      {s.isActive && !s.isArchived && (
                        <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded font-semibold">
                          Active
                        </span>
                      )}
                      {s.id === currentSession?.id && (
                        <span className="text-[10px] text-primary">✓</span>
                      )}
                    </div>
                  </button>
                ))
              )}
              <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
                Manage in Settings → Sessions
              </div>
            </div>
          )}
        </div>

        {/* Global Search — desktop inline */}
        <div
          ref={searchRef}
          className={`relative flex-1 max-w-sm mx-2 ${showSearch ? "block" : "hidden sm:block"}`}
        >
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search student by name, mobile, father, class…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchQuery.length >= 2) setSearchOpen(true);
              }}
              className="w-full h-8 pl-8 pr-3 text-xs border border-input rounded-lg bg-muted/30 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:bg-background transition-colors"
              data-ocid="header.search_input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchOpen(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute left-0 top-full mt-1 w-[360px] bg-popover border border-border rounded-xl shadow-elevated z-50 overflow-hidden animate-slide-up max-h-80 overflow-y-auto">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground border-b border-border bg-muted/30 uppercase tracking-wide">
                {searchResults.length} student
                {searchResults.length !== 1 ? "s" : ""} found
              </div>
              {searchResults.map((s) => {
                const siblingCount = getSiblingCount(s, allStudents);
                return (
                  <button
                    key={s.id}
                    type="button"
                    data-ocid="header.search_result"
                    onClick={() => handleSearchSelect(s)}
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center gap-3 border-b border-border/50 last:border-0 transition-colors"
                  >
                    {s.photo ? (
                      <img
                        src={s.photo}
                        alt={s.fullName}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-border"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                        {s.fullName?.[0] ?? "?"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {s.fullName}
                        </span>
                        {siblingCount > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 flex-shrink-0">
                            +{siblingCount} siblings
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-primary font-mono">
                          #{s.admNo}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {s.class}-{s.section}
                        </span>
                        {s.fatherName && (
                          <span className="text-[10px] text-muted-foreground truncate">
                            F: {s.fatherName}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0 border border-border rounded px-1.5 py-0.5">
                      View →
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Mobile search toggle */}
        <button
          type="button"
          className="sm:hidden p-2 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
          aria-label="Search"
          onClick={() => {
            setShowSearch((v) => !v);
            setTimeout(() => searchInputRef.current?.focus(), 50);
          }}
          data-ocid="header.mobile_search_toggle"
        >
          <Search className="w-4 h-4 text-foreground" />
        </button>

        {/* Sync status dot */}
        <SyncDot onNavigate={onNavigate} />

        {/* Notification Bell */}
        <NotificationBell />

        {/* User Menu */}
        <div className="relative" ref={userRef}>
          <button
            type="button"
            data-ocid="header.user_menu"
            onClick={() => setUserOpen((v) => !v)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-foreground leading-none font-display">
                {currentUser?.fullName ?? currentUser?.name ?? "User"}
              </div>
              <div className="text-[10px] text-muted-foreground leading-none mt-0.5">
                {ROLE_LABELS[currentUser?.role ?? ""] ?? currentUser?.role}
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>

          {userOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-popover border border-border rounded-xl shadow-elevated z-50 overflow-hidden animate-slide-up">
              <div className="px-3 py-3 border-b border-border bg-muted/20">
                <div className="text-sm font-semibold text-foreground font-display">
                  {currentUser?.fullName ?? currentUser?.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {ROLE_LABELS[currentUser?.role ?? ""] ?? currentUser?.role}
                </div>
                {currentUser?.position && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {currentUser.position}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setUserOpen(false);
                  setPwModal(true);
                }}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted text-foreground transition-colors"
                data-ocid="header.change_password"
              >
                <KeyRound className="w-4 h-4 text-muted-foreground" />
                Change Password
              </button>
              <button
                type="button"
                onClick={logout}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-destructive/10 text-destructive transition-colors"
                data-ocid="header.logout_button"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Change Password Modal */}
      {pwModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div
            className="bg-card rounded-2xl shadow-elevated w-full max-w-sm border border-border animate-slide-up"
            data-ocid="change-password.dialog"
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-display font-semibold text-foreground">
                Change Password
              </h2>
              <button
                type="button"
                onClick={() => {
                  setPwModal(false);
                  setNewPw("");
                  setConfirmPw("");
                  setPwError("");
                }}
                className="text-muted-foreground hover:text-foreground text-lg leading-none transition-colors"
                aria-label="Close"
                data-ocid="change-password.close_button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePasswordChange} className="p-5 space-y-4">
              <div>
                <Label className="text-sm">New Password</Label>
                <Input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="mt-1"
                  placeholder="Minimum 4 characters"
                  required
                  autoFocus
                  data-ocid="change-password.new_password_input"
                />
              </div>
              <div>
                <Label className="text-sm">Confirm Password</Label>
                <Input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className="mt-1"
                  placeholder="Repeat new password"
                  required
                  data-ocid="change-password.confirm_password_input"
                />
              </div>
              {pwError && (
                <p
                  className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg"
                  data-ocid="change-password.field_error"
                >
                  {pwError}
                </p>
              )}
              {pwSuccess && (
                <p
                  className="text-accent text-sm bg-accent/10 px-3 py-2 rounded-lg"
                  data-ocid="change-password.success_state"
                >
                  ✓ Password changed successfully!
                </p>
              )}
              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setPwModal(false);
                    setNewPw("");
                    setConfirmPw("");
                    setPwError("");
                  }}
                  data-ocid="change-password.cancel_button"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  data-ocid="change-password.save_button"
                >
                  Save Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
