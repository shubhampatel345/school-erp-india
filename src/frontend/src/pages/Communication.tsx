/**
 * SHUBH SCHOOL ERP — Communication Module
 * Tabs: WhatsApp Broadcast | Notification Bell | Notification Scheduler
 * All data via apiCall(). No offline sync.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Bell,
  CheckCircle,
  MessageSquare,
  Send,
  Settings,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiCall } from "../utils/api";

// ── Types ──────────────────────────────────────────────────────

interface NotifItem {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface ScheduledNotif {
  id: string;
  title: string;
  message: string;
  target_group: string;
  send_time: string;
  is_enabled: boolean;
}

interface WhatsAppCreds {
  apiUrl: string;
  apiKey: string;
  instanceId: string;
  enabled: boolean;
}

type Tab = "broadcast" | "bell" | "scheduler";

const TABS: {
  id: Tab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "broadcast", label: "WhatsApp Broadcast", icon: MessageSquare },
  { id: "bell", label: "Notification Bell", icon: Bell },
  { id: "scheduler", label: "Notification Scheduler", icon: Zap },
];

const RECIPIENT_GROUPS = [
  "All Students",
  "All Parents",
  "Fee Defaulters",
  "All Staff",
  "Class 10 Parents",
  "By Class",
];
const MSG_VARS = ["{student_name}", "{class}", "{admNo}", "{amount}", "{date}"];

function loadCreds(): WhatsAppCreds {
  try {
    return JSON.parse(
      localStorage.getItem("wa_creds") ?? "{}",
    ) as WhatsAppCreds;
  } catch {
    return { apiUrl: "", apiKey: "", instanceId: "", enabled: false };
  }
}

interface Props {
  initialTab?: string;
}

export default function Communication({ initialTab = "broadcast" }: Props) {
  const [tab, setTab] = useState<Tab>((initialTab as Tab) || "broadcast");

  // Broadcast tab
  const [creds, setCreds] = useState<WhatsAppCreds>(loadCreds);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [bcRecipient, setBcRecipient] = useState("All Parents");
  const [bcMessage, setBcMessage] = useState(
    "Dear {student_name}, this is a reminder from the school.",
  );
  const [isSending, setIsSending] = useState(false);
  const [sendReport, setSendReport] = useState<{
    sent: number;
    failed: number;
  } | null>(null);

  // Bell tab
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [bellLoading, setBellLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Scheduler tab
  const [scheduled, setScheduled] = useState<ScheduledNotif[]>([]);
  const [schedLoading, setSchedLoading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newGroup, setNewGroup] = useState("All Parents");
  const [newTime, setNewTime] = useState("");
  const [addingSched, setAddingSched] = useState(false);

  // Load notifications when tab changes
  const loadNotifications = useCallback(async () => {
    setBellLoading(true);
    try {
      const res = await apiCall<{ data: NotifItem[] }>("notifications/list");
      const list = (res as { data: NotifItem[] }).data ?? [];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.is_read).length);
    } catch {
      setNotifications([]);
    } finally {
      setBellLoading(false);
    }
  }, []);

  const loadScheduled = useCallback(async () => {
    setSchedLoading(true);
    try {
      const res = await apiCall<{ data: ScheduledNotif[] }>(
        "notifications/scheduled",
      );
      setScheduled((res as { data: ScheduledNotif[] }).data ?? []);
    } catch {
      setScheduled([]);
    } finally {
      setSchedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "bell") void loadNotifications();
    if (tab === "scheduler") void loadScheduled();
  }, [tab, loadNotifications, loadScheduled]);

  // Handlers
  async function saveCreds() {
    localStorage.setItem("wa_creds", JSON.stringify(creds));
    try {
      await apiCall("settings/save", "POST", {
        key: "whatsapp_creds",
        value: JSON.stringify(creds),
      });
      toast.success("WhatsApp settings saved");
    } catch {
      toast.error("Failed to save settings");
    }
  }

  async function testConnection() {
    setIsTesting(true);
    setTestResult(null);
    try {
      await apiCall("whatsapp/test", "POST", {
        api_url: creds.apiUrl,
        api_key: creds.apiKey,
        instance_id: creds.instanceId,
      });
      setTestResult("ok");
      toast.success("Connection successful");
    } catch {
      setTestResult("fail");
      toast.error("Connection failed — check credentials");
    } finally {
      setIsTesting(false);
    }
  }

  async function sendBroadcast() {
    if (!bcMessage.trim()) return;
    setIsSending(true);
    setSendReport(null);
    try {
      const res = await apiCall<{ sent: number; failed: number }>(
        "whatsapp/broadcast",
        "POST",
        {
          recipient_group: bcRecipient,
          message: bcMessage,
        },
      );
      const r = res as { sent?: number; failed?: number };
      setSendReport({ sent: r.sent ?? 0, failed: r.failed ?? 0 });
      toast.success(`Broadcast sent to ${r.sent ?? 0} recipients`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Broadcast failed");
    } finally {
      setIsSending(false);
    }
  }

  async function markRead(id: string) {
    try {
      await apiCall("notifications/mark-read", "POST", { id });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      toast.error("Failed to mark as read");
    }
  }

  async function markAllRead() {
    try {
      await apiCall("notifications/mark-read", "POST", { all: true });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  }

  async function clearAll() {
    if (!confirm("Clear all notifications?")) return;
    try {
      await apiCall("notifications/clear", "POST", {});
      setNotifications([]);
      setUnreadCount(0);
      toast.success("Notifications cleared");
    } catch {
      toast.error("Failed to clear");
    }
  }

  async function addScheduled() {
    if (!newTitle.trim() || !newMessage.trim() || !newTime) {
      toast.error("Fill all fields");
      return;
    }
    setAddingSched(true);
    try {
      await apiCall("notifications/schedule-add", "POST", {
        title: newTitle,
        message: newMessage,
        target_group: newGroup,
        send_time: newTime,
        is_enabled: true,
      });
      toast.success("Notification scheduled");
      setNewTitle("");
      setNewMessage("");
      setNewTime("");
      await loadScheduled();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to schedule");
    } finally {
      setAddingSched(false);
    }
  }

  async function toggleScheduled(id: string, enabled: boolean) {
    try {
      await apiCall("notifications/schedule-toggle", "POST", {
        id,
        is_enabled: enabled,
      });
      setScheduled((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_enabled: enabled } : s)),
      );
    } catch {
      toast.error("Failed to toggle");
    }
  }

  const previewMsg = bcMessage
    .replace(/{student_name}/g, "Arjun Sharma")
    .replace(/{class}/g, "Class 5A")
    .replace(/{admNo}/g, "1042")
    .replace(/{amount}/g, "₹2,500")
    .replace(/{date}/g, new Date().toLocaleDateString("en-IN"));

  return (
    <div className="p-4 md:p-6 bg-background min-h-screen space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-display">
          Communication
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          WhatsApp broadcasts, notification bell, and scheduled alerts
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-1 flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              data-ocid={`communication.${t.id}_tab`}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${tab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              {t.id === "bell" && unreadCount > 0 && (
                <Badge className="ml-1 text-xs px-1.5 py-0">
                  {unreadCount}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* ── WhatsApp Broadcast Tab ── */}
      {tab === "broadcast" && (
        <div className="space-y-4">
          {/* Credentials */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                API Credentials
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>API URL</Label>
                <Input
                  value={creds.apiUrl}
                  onChange={(e) =>
                    setCreds((p) => ({ ...p, apiUrl: e.target.value }))
                  }
                  placeholder="https://api.wati.io/..."
                  className="mt-1"
                  data-ocid="communication.api_url_input"
                />
              </div>
              <div>
                <Label>API Key</Label>
                <Input
                  value={creds.apiKey}
                  onChange={(e) =>
                    setCreds((p) => ({ ...p, apiKey: e.target.value }))
                  }
                  placeholder="Bearer token or API key"
                  className="mt-1"
                  data-ocid="communication.api_key_input"
                />
              </div>
              <div>
                <Label>Instance ID</Label>
                <Input
                  value={creds.instanceId}
                  onChange={(e) =>
                    setCreds((p) => ({ ...p, instanceId: e.target.value }))
                  }
                  placeholder="instance_id"
                  className="mt-1"
                  data-ocid="communication.instance_id_input"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Switch
                  checked={creds.enabled}
                  onCheckedChange={(v) =>
                    setCreds((p) => ({ ...p, enabled: v }))
                  }
                  data-ocid="communication.wa_enabled_switch"
                />
                <span className="text-sm text-foreground">
                  {creds.enabled ? "WhatsApp enabled" : "WhatsApp disabled"}
                </span>
                {testResult === "ok" && (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                )}
                {testResult === "fail" && (
                  <Badge variant="destructive" className="text-xs">
                    <XCircle className="w-3 h-3 mr-1" />
                    Failed
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testConnection}
                  disabled={isTesting}
                  data-ocid="communication.test_connection_button"
                >
                  {isTesting ? "Testing…" : "Test Connection"}
                </Button>
                <Button
                  size="sm"
                  onClick={saveCreds}
                  data-ocid="communication.save_creds_button"
                >
                  Save Settings
                </Button>
              </div>
            </div>
          </div>

          {/* Compose */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h2 className="text-base font-semibold text-foreground">
                Compose Broadcast
              </h2>
              <div>
                <Label>Recipient Group</Label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background mt-1"
                  value={bcRecipient}
                  onChange={(e) => setBcRecipient(e.target.value)}
                  data-ocid="communication.bc_recipient_select"
                >
                  {RECIPIENT_GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Message</Label>
                <Textarea
                  value={bcMessage}
                  onChange={(e) => setBcMessage(e.target.value)}
                  rows={4}
                  className="mt-1 font-mono text-xs"
                  data-ocid="communication.bc_template_textarea"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-xs text-muted-foreground">
                    Variables:
                  </span>
                  {MSG_VARS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono hover:bg-primary/20 transition-colors"
                      onClick={() => setBcMessage((p) => `${p} ${v}`)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                onClick={sendBroadcast}
                disabled={isSending}
                data-ocid="communication.send_broadcast_button"
              >
                <Send className="w-4 h-4 mr-1.5" />
                {isSending ? "Sending…" : "Send Broadcast"}
              </Button>
              {sendReport && (
                <div
                  className="bg-muted/50 rounded-lg px-4 py-3 flex gap-4 text-sm"
                  data-ocid="communication.delivery_report"
                >
                  <span className="text-green-600 font-semibold">
                    ✓ Sent: {sendReport.sent}
                  </span>
                  <span className="text-destructive font-semibold">
                    ✗ Failed: {sendReport.failed}
                  </span>
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h2 className="text-base font-semibold text-foreground">
                Message Preview
              </h2>
              <p className="text-xs text-muted-foreground">
                Showing preview for sample recipients:
              </p>
              {["Arjun Sharma", "Pooja Patel", "Rahul Verma"].map((name) => (
                <div
                  key={name}
                  className="bg-muted/30 border border-border rounded-xl p-3"
                >
                  <p className="text-xs text-muted-foreground mb-1 font-medium">
                    📱 To: {name}
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {previewMsg.replace(/Arjun Sharma/g, name)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Notification Bell Tab ── */}
      {tab === "bell" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              Notifications{" "}
              {unreadCount > 0 && (
                <Badge className="ml-2">{unreadCount} unread</Badge>
              )}
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={markAllRead}
                data-ocid="communication.mark_all_read_button"
              >
                Mark All Read
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-destructive hover:text-destructive"
                data-ocid="communication.clear_all_button"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            </div>
          </div>

          {bellLoading ? (
            <div
              className="space-y-2"
              data-ocid="communication.bell.loading_state"
            >
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div
              className="py-16 text-center text-muted-foreground"
              data-ocid="communication.bell.empty_state"
            >
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No notifications yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n, idx) => (
                <div
                  key={n.id}
                  className={`bg-card border border-border rounded-xl p-4 flex items-start gap-3 ${!n.is_read ? "border-l-4 border-l-primary" : ""}`}
                  data-ocid={`communication.notification.item.${idx + 1}`}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium text-sm ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {n.message}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {n.created_at}
                    </p>
                  </div>
                  {!n.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-shrink-0 text-xs"
                      onClick={() => void markRead(n.id)}
                      data-ocid={`communication.mark_read_button.${idx + 1}`}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Notification Scheduler Tab ── */}
      {tab === "scheduler" && (
        <div className="space-y-4">
          {/* Add new */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              Schedule New Notification
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Title</Label>
                <Input
                  className="mt-1"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Notification title"
                  data-ocid="communication.sched_title_input"
                />
              </div>
              <div>
                <Label>Target Group</Label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background mt-1"
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                  data-ocid="communication.sched_group_select"
                >
                  {RECIPIENT_GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <Label>Message</Label>
                <Textarea
                  className="mt-1"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={2}
                  placeholder="Notification message…"
                  data-ocid="communication.sched_message_textarea"
                />
              </div>
              <div>
                <Label>Send Time</Label>
                <Input
                  type="datetime-local"
                  className="mt-1"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  data-ocid="communication.sched_time_input"
                />
              </div>
            </div>
            <Button
              onClick={addScheduled}
              disabled={addingSched}
              data-ocid="communication.sched_add_button"
            >
              <Zap className="w-4 h-4 mr-1.5" />
              {addingSched ? "Saving…" : "Schedule Notification"}
            </Button>
          </div>

          {/* Scheduled list */}
          <div>
            <h2 className="text-base font-semibold text-foreground mb-3">
              Scheduled Notifications
            </h2>
            {schedLoading ? (
              <div
                className="space-y-2"
                data-ocid="communication.sched.loading_state"
              >
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : scheduled.length === 0 ? (
              <div
                className="py-10 text-center text-muted-foreground"
                data-ocid="communication.sched.empty_state"
              >
                <Zap className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p>No scheduled notifications yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {scheduled.map((s, idx) => (
                  <div
                    key={s.id}
                    className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-4"
                    data-ocid={`communication.scheduled.item.${idx + 1}`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground">
                        {s.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {s.message}
                      </p>
                      <div className="flex gap-2 mt-1.5">
                        <Badge variant="secondary" className="text-xs">
                          👥 {s.target_group}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          🕐 {s.send_time}
                        </Badge>
                      </div>
                    </div>
                    <Switch
                      checked={s.is_enabled}
                      onCheckedChange={(v) => void toggleScheduled(s.id, v)}
                      data-ocid={`communication.sched_toggle.${idx + 1}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
