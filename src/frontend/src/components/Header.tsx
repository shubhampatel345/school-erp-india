import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Archive,
  ChevronDown,
  GraduationCap,
  KeyRound,
  LogOut,
  Menu,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import NotificationBell from "./NotificationBell";

interface HeaderProps {
  onMenuToggle: () => void;
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

export default function Header({ onMenuToggle }: HeaderProps) {
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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sessionRef.current && !sessionRef.current.contains(e.target as Node))
        setSessionOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node))
        setUserOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
      {/* Header — elevated bg-card with border-b shadow */}
      <header className="h-14 bg-card border-b border-border flex items-center px-3 gap-2 shadow-subtle z-40 relative flex-shrink-0">
        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>

        {/* Logo / Branding */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="hidden sm:block font-display font-bold text-sm text-foreground tracking-tight leading-none">
            SHUBH SCHOOL ERP
          </span>
        </div>

        {/* Current Session label + switcher */}
        <div className="relative ml-1" ref={sessionRef}>
          <button
            type="button"
            data-ocid="session-switcher"
            onClick={() => setSessionOpen((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors"
          >
            <span className="text-xs font-semibold text-primary leading-none">
              Current Session:{" "}
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

        <div className="flex-1" />

        {/* Notification Bell */}
        <NotificationBell />

        {/* User Menu */}
        <div className="relative" ref={userRef}>
          <button
            type="button"
            data-ocid="user-menu"
            onClick={() => setUserOpen((v) => !v)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-foreground leading-none font-display">
                {currentUser?.name ?? "User"}
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
                  {currentUser?.name}
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
              >
                <KeyRound className="w-4 h-4 text-muted-foreground" />
                Change Password
              </button>
              <button
                type="button"
                onClick={logout}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-destructive/10 text-destructive transition-colors"
                data-ocid="logout-btn"
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
          <div className="bg-card rounded-2xl shadow-elevated w-full max-w-sm border border-border animate-slide-up">
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
              >
                ✕
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
                  data-ocid="new-password-input"
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
                  data-ocid="confirm-password-input"
                />
              </div>
              {pwError && (
                <p className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg">
                  {pwError}
                </p>
              )}
              {pwSuccess && (
                <p className="text-accent text-sm bg-accent/10 px-3 py-2 rounded-lg">
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
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  data-ocid="save-password-btn"
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
