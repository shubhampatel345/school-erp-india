import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Check,
  CheckCircle,
  Info,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

const ICONS = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

const COLORS = {
  info: "text-primary",
  success: "text-accent",
  warning: "text-yellow-600",
  error: "text-destructive",
};

export default function NotificationBell() {
  const { notifications, unreadCount, markAllRead, clearNotifications } =
    useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        data-ocid="notification-bell"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="w-5 h-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 bg-popover border border-border rounded-xl shadow-elevated z-50 overflow-hidden animate-slide-up"
          aria-label="Notifications"
          data-ocid="notification-bell.popover"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <span className="font-semibold text-sm text-foreground font-display">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-xs bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5">
                  {unreadCount}
                </span>
              )}
            </span>
            <div className="flex gap-1">
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={markAllRead}
                  data-ocid="notification-bell.mark-all-read"
                >
                  <Check className="w-3 h-3 mr-1" /> Mark read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                  onClick={clearNotifications}
                  data-ocid="notification-bell.clear-all"
                  aria-label="Clear all notifications"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {notifications.length === 0 ? (
              <div
                className="py-8 text-center text-muted-foreground text-sm"
                data-ocid="notification-bell.empty_state"
              >
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = ICONS[n.type] ?? Info;
                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/20 transition-colors ${
                      !n.isRead ? "bg-primary/[0.04]" : ""
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        COLORS[n.type] ?? "text-muted-foreground"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug break-words">
                        {n.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {timeAgo(n.timestamp)}
                      </p>
                    </div>
                    {!n.isRead && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0 flex-none" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
