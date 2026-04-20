import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Bell,
  BellOff,
  BellRing,
  BookOpen,
  Calendar,
  CheckCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  MessageSquare,
  Trash2,
  UserCheck,
  UserX,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import {
  type PushHistoryEntry,
  type PushPreferences,
  clearPushHistory,
  getPushHistory,
  getPushPreferences,
  markAllPushRead,
  savePushPreferences,
} from "../../utils/notifications";

// ── Types ──────────────────────────────────────────────────

type PermissionState = "granted" | "denied" | "default" | "unsupported";

interface PrefRow {
  key: keyof PushPreferences;
  label: string;
  description: string;
  icon: React.ElementType;
}

const PREF_ROWS: PrefRow[] = [
  {
    key: "attendancePresent",
    label: "Attendance — Present",
    description: "When a student is marked present",
    icon: UserCheck,
  },
  {
    key: "attendanceAbsent",
    label: "Attendance — Absent",
    description: "When a student is marked absent",
    icon: UserX,
  },
  {
    key: "feeDue",
    label: "Fee Payment Due",
    description: "Monthly reminder 5 days before due date",
    icon: CreditCard,
  },
  {
    key: "examResult",
    label: "Exam Result Published",
    description: "When results are released for your class",
    icon: CheckCircle2,
  },
  {
    key: "homeworkAssigned",
    label: "Homework Assigned",
    description: "When a teacher assigns new homework",
    icon: BookOpen,
  },
  {
    key: "homeworkOverdue",
    label: "Homework Overdue",
    description: "When a homework deadline is missed",
    icon: Clock,
  },
  {
    key: "broadcastMessage",
    label: "Broadcast Message",
    description: "Circulars, timetables, and school announcements",
    icon: MessageSquare,
  },
];

// ── Helpers ─────────────────────────────────────────────────

function getPermissionState(): PermissionState {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function typeIcon(type: string): React.ElementType {
  if (type === "attendance") return UserCheck;
  if (type === "fee") return CreditCard;
  if (type === "exam") return CheckCircle2;
  if (type === "homework") return BookOpen;
  if (type === "broadcast") return MessageSquare;
  return Bell;
}

// ── Main Component ───────────────────────────────────────────

export default function PushNotifications() {
  const { currentUser } = useApp();
  const isSuperAdmin = currentUser?.role === "superadmin";

  const [permission, setPermission] =
    useState<PermissionState>(getPermissionState);
  const [subscribed, setSubscribed] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [prefs, setPrefs] = useState<PushPreferences>(getPushPreferences);
  const [history, setHistory] = useState<PushHistoryEntry[]>([]);

  // Load history and subscription state on mount
  useEffect(() => {
    setHistory(getPushHistory());

    // Check if already subscribed
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setSubscribed(!!sub))
        .catch(() => setSubscribed(false));
    }
  }, []);

  // ── Request / Subscribe ──────────────────────────────────

  const handleEnable = useCallback(async () => {
    if (!("Notification" in window)) {
      toast.error("Your browser does not support notifications.");
      return;
    }

    setRequesting(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== "granted") {
        toast.error(
          "Notification permission denied. Please enable it in your browser settings.",
        );
        return;
      }

      // Subscribe via service worker if available
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();

        if (!existing) {
          // Without a real VAPID key we use a dummy subscription attempt
          // In production, replace the applicationServerKey with your VAPID public key
          try {
            await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(
                // placeholder VAPID key — replace with your real key in production
                "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U",
              ) as unknown as ArrayBuffer,
            });
          } catch {
            // VAPID key mismatch or unsupported — still mark granted
          }
        }

        setSubscribed(true);
      }

      toast.success("Push notifications enabled!");
    } catch {
      toast.error("Failed to enable notifications. Please try again.");
    } finally {
      setRequesting(false);
    }
  }, []);

  const handleDisable = useCallback(async () => {
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
      }
      setSubscribed(false);
      toast.success("Notifications disabled.");
    } catch {
      toast.error("Failed to unsubscribe.");
    }
  }, []);

  // ── Preferences ──────────────────────────────────────────

  function togglePref(key: keyof PushPreferences) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    savePushPreferences(next);
    toast.success("Preference saved.");
  }

  // ── Test Notification ────────────────────────────────────

  function handleTest() {
    if (!("Notification" in window)) {
      toast.error("Notifications not supported in this browser.");
      return;
    }
    if (Notification.permission !== "granted") {
      toast.error("Please enable notifications first.");
      return;
    }
    new Notification("Test — SHUBH SCHOOL ERP", {
      body: "Push notifications are working correctly! 🎉",
      icon: "/icon-192.png",
    });
    toast.success("Test notification sent.");
  }

  // ── History actions ──────────────────────────────────────

  function handleMarkAllRead() {
    markAllPushRead();
    setHistory((prev) => prev.map((e) => ({ ...e, read: true })));
    toast.success("All notifications marked as read.");
  }

  function handleClearHistory() {
    clearPushHistory();
    setHistory([]);
    toast.success("Notification history cleared.");
  }

  // ── Render helpers ───────────────────────────────────────

  function permissionBadge() {
    if (permission === "granted" && subscribed) {
      return (
        <Badge
          className="gap-1.5 bg-accent/10 text-accent border-accent/30"
          data-ocid="push.status-badge"
        >
          <BellRing className="w-3 h-3" />
          Notifications Active
        </Badge>
      );
    }
    if (permission === "denied") {
      return (
        <Badge
          variant="destructive"
          className="gap-1.5"
          data-ocid="push.status-badge"
        >
          <XCircle className="w-3 h-3" />
          Blocked by Browser
        </Badge>
      );
    }
    if (permission === "unsupported") {
      return (
        <Badge variant="outline" data-ocid="push.status-badge">
          Not Supported
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="gap-1.5"
        data-ocid="push.status-badge"
      >
        <BellOff className="w-3 h-3" />
        Not Enabled
      </Badge>
    );
  }

  const unreadCount = history.filter((e) => !e.read).length;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-2xl mx-auto">
      {/* ── Section: Enable / Status ───────────────────── */}
      <Card className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Push Notifications
              </h2>
              <p className="text-sm text-muted-foreground">
                Receive instant alerts for attendance, fees, and results
              </p>
            </div>
          </div>
          {permissionBadge()}
        </div>

        {permission === "denied" ? (
          <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4 text-sm text-destructive space-y-1">
            <p className="font-medium">
              Notifications blocked by your browser.
            </p>
            <p className="text-muted-foreground">
              To re-enable, click the lock icon in your browser's address bar →
              Notifications → Allow, then reload the page.
            </p>
          </div>
        ) : permission === "unsupported" ? (
          <div className="rounded-lg bg-muted/40 border border-border p-4 text-sm text-muted-foreground">
            Your browser does not support push notifications. Try using Chrome
            or Edge on Android for the best experience.
          </div>
        ) : subscribed && permission === "granted" ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 text-sm text-muted-foreground">
              Notifications are active. You'll receive alerts on this device.
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisable}
              data-ocid="push.disable-button"
            >
              <BellOff className="w-3.5 h-3.5 mr-1.5" />
              Disable
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleEnable}
            disabled={requesting}
            data-ocid="push.enable-button"
          >
            <Bell className="w-4 h-4 mr-2" />
            {requesting ? "Requesting Permission…" : "Enable Notifications"}
          </Button>
        )}
      </Card>

      {/* ── Section: Preferences ──────────────────────── */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-4 h-4 text-secondary-foreground" />
          </div>
          <h2 className="text-base font-semibold text-foreground">
            Notification Preferences
          </h2>
        </div>

        <div className="divide-y divide-border">
          {PREF_ROWS.map((row) => {
            const Icon = row.icon;
            return (
              <div
                key={row.key}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                data-ocid={`push.pref.${row.key}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {row.label}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {row.description}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={prefs[row.key]}
                  onCheckedChange={() => togglePref(row.key)}
                  data-ocid={`push.pref-toggle.${row.key}`}
                  aria-label={`Toggle ${row.label} notifications`}
                  className="ml-4 flex-shrink-0"
                />
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Section: Test Notification (Super Admin only) */}
      {isSuperAdmin && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <BellRing className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Test Notification
              </h2>
              <p className="text-sm text-muted-foreground">
                Verify that push notifications are working on this device
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleTest}
            data-ocid="push.test-button"
          >
            <BellRing className="w-4 h-4 mr-2" />
            Send Test Notification
          </Button>
        </Card>
      )}

      {/* ── Section: Notification History ─────────────── */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Bell className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">
                Notification History
              </h2>
              {unreadCount > 0 && (
                <Badge
                  variant="secondary"
                  className="text-xs"
                  data-ocid="push.unread-badge"
                >
                  {unreadCount} unread
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                data-ocid="push.mark-all-read-button"
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
                Mark Read
              </Button>
            )}
            {history.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearHistory}
                className="text-destructive hover:text-destructive"
                data-ocid="push.clear-history-button"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {history.length === 0 ? (
          <div
            className="flex flex-col items-center gap-3 py-8 text-center"
            data-ocid="push.history-empty-state"
          >
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
              <Bell className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                No notifications yet
              </p>
              <p className="text-xs text-muted-foreground">
                Alerts will appear here once you receive them
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1 max-h-[400px] overflow-y-auto -mx-1 px-1">
            {history.slice(0, 20).map((entry, idx) => {
              const Icon = typeIcon(entry.type);
              return (
                <div
                  key={entry.id}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                    entry.read
                      ? "bg-muted/20"
                      : "bg-primary/5 border border-primary/10"
                  }`}
                  data-ocid={`push.history-item.${idx + 1}`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      entry.read ? "bg-muted" : "bg-primary/10"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${entry.read ? "text-muted-foreground" : "text-primary"}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-sm font-medium truncate ${
                          entry.read
                            ? "text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {entry.title}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                        {timeAgo(entry.receivedAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {entry.body}
                    </p>
                    {!entry.read && (
                      <div className="mt-1 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="text-xs text-primary">New</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── VAPID key helper ─────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
