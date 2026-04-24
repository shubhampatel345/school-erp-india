/**
 * SHUBH SCHOOL ERP — Communication Module
 * Direct API: sends via phpApiService, no local queue
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
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import phpApiService from "../utils/phpApiService";

interface WhatsAppCreds {
  apiUrl: string;
  apiKey: string;
  instanceId: string;
  enabled: boolean;
}

interface BroadcastRecord {
  id: string;
  recipientGroup: string;
  message: string;
  channel: string;
  sentCount: number;
  failedCount: number;
  sentAt: string;
}

interface NotifRule {
  id: string;
  event: string;
  description: string;
  channel: "whatsapp" | "sms" | "both";
  daysBeforeDue?: number;
  enabled: boolean;
  recipient: string;
}

type Tab = "whatsapp" | "broadcast" | "scheduler";

const DEFAULT_CREDS: WhatsAppCreds = {
  apiUrl: "",
  apiKey: "",
  instanceId: "",
  enabled: false,
};

const SEED_RULES: NotifRule[] = [
  {
    id: "r1",
    event: "Fee due reminder",
    description: "Send fee reminder X days before due date",
    channel: "whatsapp",
    daysBeforeDue: 3,
    enabled: true,
    recipient: "All Parents",
  },
  {
    id: "r2",
    event: "Attendance alert",
    description: "Alert when student is marked absent",
    channel: "whatsapp",
    enabled: true,
    recipient: "Parents",
  },
  {
    id: "r3",
    event: "Result published",
    description: "Notify when exam results are published",
    channel: "both",
    enabled: false,
    recipient: "All Parents",
  },
  {
    id: "r4",
    event: "Birthday wishes",
    description: "Auto-send birthday message on student's birthday",
    channel: "whatsapp",
    enabled: true,
    recipient: "Student",
  },
];

const RECIPIENT_GROUPS = [
  "All Students",
  "All Parents",
  "Fee Defaulters",
  "Class 5 Parents",
  "Class 10 Parents",
  "Route 1 Parents",
];

const MESSAGE_VARS = [
  "{student_name}",
  "{class}",
  "{admNo}",
  "{amount}",
  "{date}",
];

interface Props {
  initialTab?: string;
}

function loadCredsFromStorage(): WhatsAppCreds {
  try {
    const raw = localStorage.getItem("wa_creds");
    if (raw) return JSON.parse(raw) as WhatsAppCreds;
  } catch {
    /* noop */
  }
  return DEFAULT_CREDS;
}

export default function Communication({ initialTab = "whatsapp" }: Props) {
  const { addNotification } = useApp();
  const [tab, setTab] = useState<Tab>((initialTab as Tab) || "whatsapp");

  // WhatsApp tab
  const [creds, setCreds] = useState<WhatsAppCreds>(loadCredsFromStorage);
  const [manualTo, setManualTo] = useState("");
  const [manualMsg, setManualMsg] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);

  // Broadcast tab
  const [bcRecipient, setBcRecipient] = useState("All Parents");
  const [bcTemplate, setBcTemplate] = useState(
    "Dear {student_name}, this is a reminder from the school.",
  );
  const [bcChannel, setBcChannel] = useState<"whatsapp" | "sms">("whatsapp");
  const [isSending, setIsSending] = useState(false);
  const [sendReport, setSendReport] = useState<{
    sent: number;
    failed: number;
  } | null>(null);
  const [broadcastHistory, setBroadcastHistory] = useState<BroadcastRecord[]>(
    [],
  );
  const [historyLoading, setHistoryLoading] = useState(false);

  // Scheduler tab
  const [rules, setRules] = useState<NotifRule[]>(SEED_RULES);
  const [savingRules, setSavingRules] = useState(false);

  // ── Load broadcast history ───────────────────────────────────────────────

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await phpApiService.get<BroadcastRecord[]>(
        "communication/broadcast-history",
      );
      setBroadcastHistory(Array.isArray(data) ? data : []);
    } catch {
      setBroadcastHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "broadcast") {
      void loadHistory();
    }
  }, [tab, loadHistory]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const saveCreds = useCallback(async () => {
    try {
      localStorage.setItem("wa_creds", JSON.stringify(creds));
      await phpApiService.saveSettings({
        whatsapp_api_url: creds.apiUrl,
        whatsapp_api_key: creds.apiKey,
        whatsapp_instance_id: creds.instanceId,
        whatsapp_enabled: creds.enabled,
      });
      toast.success("WhatsApp settings saved");
    } catch {
      toast.error("Failed to save settings");
    }
  }, [creds]);

  const testConnection = useCallback(async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      await phpApiService.post("communication/whatsapp-test", {
        apiUrl: creds.apiUrl,
        apiKey: creds.apiKey,
        instanceId: creds.instanceId,
      });
      setTestResult("ok");
      addNotification("Connection test passed ✓", "success");
    } catch {
      setTestResult("fail");
      addNotification("Connection test failed — check API key", "error");
    } finally {
      setIsTesting(false);
    }
  }, [creds, addNotification]);

  const sendManual = useCallback(async () => {
    if (!manualTo.trim() || !manualMsg.trim()) return;
    try {
      await phpApiService.post("communication/send-whatsapp", {
        to: manualTo.trim(),
        message: manualMsg.trim(),
        channel: "whatsapp",
      });
      toast.success("Message sent");
      setManualTo("");
      setManualMsg("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send message",
      );
    }
  }, [manualTo, manualMsg]);

  const sendBroadcast = useCallback(async () => {
    if (!bcTemplate.trim()) return;
    setIsSending(true);
    setSendReport(null);
    try {
      const result = await phpApiService.post<{ sent: number; failed: number }>(
        "communication/broadcast",
        {
          recipientGroup: bcRecipient,
          message: bcTemplate,
          channel: bcChannel,
        },
      );
      setSendReport({ sent: result.sent ?? 0, failed: result.failed ?? 0 });
      toast.success(`Broadcast sent to ${result.sent ?? 0} recipients`);
      void loadHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Broadcast failed");
    } finally {
      setIsSending(false);
    }
  }, [bcRecipient, bcTemplate, bcChannel, loadHistory]);

  const saveSchedulerRules = useCallback(async () => {
    setSavingRules(true);
    try {
      await phpApiService.post("communication/scheduler/save", { rules });
      toast.success("Notification rules saved");
    } catch {
      toast.error("Failed to save rules");
    } finally {
      setSavingRules(false);
    }
  }, [rules]);

  const triggerRule = useCallback(async (rule: NotifRule) => {
    try {
      await phpApiService.post("communication/scheduler/trigger", {
        ruleId: rule.id,
      });
      toast.success(`Triggered: "${rule.event}"`);
    } catch {
      toast.error("Failed to trigger rule");
    }
  }, []);

  const toggleRule = useCallback((id: string) => {
    setRules((p) =>
      p.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
    );
  }, []);

  const previewMsg = bcTemplate
    .replace(/{student_name}/g, "Arjun Sharma")
    .replace(/{class}/g, "Class 5A")
    .replace(/{admNo}/g, "1042")
    .replace(/{amount}/g, "₹2,500")
    .replace(/{date}/g, new Date().toLocaleDateString("en-IN"));

  const TABS: {
    id: Tab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
    { id: "broadcast", label: "Bulk Broadcast", icon: Send },
    { id: "scheduler", label: "Notification Scheduler", icon: Bell },
  ];

  return (
    <div className="p-4 md:p-6 bg-background min-h-screen space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-display">
          Communication
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          WhatsApp integration, bulk broadcasts, and notification rules
        </p>
      </div>

      {/* Tabs */}
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
            </button>
          );
        })}
      </div>

      {/* ── WHATSAPP TAB ── */}
      {tab === "whatsapp" && (
        <div className="space-y-4">
          {/* Credentials */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                API Credentials
              </h2>
            </div>
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              💡 Connect your WhatsApp Business API or use a third-party service
              like WATI, Interakt, or Gupshup.
            </p>
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
                    <CheckCircle className="w-3 h-3 mr-1" /> Connected
                  </Badge>
                )}
                {testResult === "fail" && (
                  <Badge variant="destructive" className="text-xs">
                    <XCircle className="w-3 h-3 mr-1" /> Failed
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void testConnection()}
                  disabled={isTesting}
                  data-ocid="communication.test_connection_button"
                >
                  {isTesting ? "Testing…" : "Test Connection"}
                </Button>
                <Button
                  size="sm"
                  onClick={() => void saveCreds()}
                  data-ocid="communication.save_creds_button"
                >
                  Save Settings
                </Button>
              </div>
            </div>
          </div>

          {/* Send Manual */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              Send Manual Message
            </h2>
            <div>
              <Label>To (Student / Parent / Class)</Label>
              <Input
                value={manualTo}
                onChange={(e) => setManualTo(e.target.value)}
                placeholder="e.g. Arjun Sharma, Class 5A, or mobile number"
                className="mt-1"
                data-ocid="communication.manual_to_input"
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                value={manualMsg}
                onChange={(e) => setManualMsg(e.target.value)}
                placeholder="Type your message here…"
                className="mt-1"
                rows={3}
                data-ocid="communication.manual_message_textarea"
              />
            </div>
            <Button
              onClick={() => void sendManual()}
              disabled={!manualTo.trim() || !manualMsg.trim()}
              data-ocid="communication.send_manual_button"
            >
              <Send className="w-4 h-4 mr-1.5" /> Send Message
            </Button>
          </div>
        </div>
      )}

      {/* ── BROADCAST TAB ── */}
      {tab === "broadcast" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Compose */}
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
                <Label>Message Template</Label>
                <Textarea
                  value={bcTemplate}
                  onChange={(e) => setBcTemplate(e.target.value)}
                  rows={4}
                  className="mt-1 font-mono text-xs"
                  data-ocid="communication.bc_template_textarea"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-xs text-muted-foreground">
                    Variables:
                  </span>
                  {MESSAGE_VARS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono hover:bg-primary/20 transition-colors"
                      onClick={() => setBcTemplate((p) => `${p} ${v}`)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Channel</Label>
                <div className="flex gap-3 mt-1">
                  {(["whatsapp", "sms"] as const).map((ch) => (
                    <label
                      key={ch}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="channel"
                        value={ch}
                        checked={bcChannel === ch}
                        onChange={() => setBcChannel(ch)}
                        data-ocid={`communication.channel_${ch}`}
                      />
                      <span className="text-sm text-foreground capitalize">
                        {ch === "whatsapp" ? "📱 WhatsApp" : "✉️ SMS"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <Button
                onClick={() => void sendBroadcast()}
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

            {/* Preview */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h2 className="text-base font-semibold text-foreground">
                Message Preview
              </h2>
              <p className="text-xs text-muted-foreground">
                Showing preview for first 3 recipients:
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

          {/* Broadcast History */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                Broadcast History
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void loadHistory()}
              >
                Refresh
              </Button>
            </div>
            {historyLoading ? (
              <div
                className="p-4 space-y-2"
                data-ocid="communication.history.loading_state"
              >
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : broadcastHistory.length === 0 ? (
              <div
                className="py-10 text-center text-muted-foreground"
                data-ocid="communication.history.empty_state"
              >
                No broadcasts sent yet
              </div>
            ) : (
              <div className="divide-y divide-border">
                {broadcastHistory.map((bc, idx) => (
                  <div
                    key={bc.id}
                    className="px-5 py-3 flex items-start justify-between gap-3"
                    data-ocid={`communication.history.item.${idx + 1}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {bc.recipientGroup} · {bc.channel}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {bc.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {bc.sentAt}
                      </p>
                    </div>
                    <div className="text-xs text-right shrink-0">
                      <span className="text-green-600 font-medium">
                        ✓ {bc.sentCount}
                      </span>
                      {bc.failedCount > 0 && (
                        <span className="text-destructive ml-2">
                          ✗ {bc.failedCount}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SCHEDULER TAB ── */}
      {tab === "scheduler" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Configure automatic notification rules. Toggle each rule on/off or
              trigger manually.
            </p>
            <Button
              size="sm"
              onClick={() => void saveSchedulerRules()}
              disabled={savingRules}
              data-ocid="communication.save_rules_button"
            >
              {savingRules ? "Saving…" : "Save Rules"}
            </Button>
          </div>
          {rules.map((rule, idx) => (
            <div
              key={rule.id}
              className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-4"
              data-ocid={`communication.rule.${idx + 1}`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5">
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={() => toggleRule(rule.id)}
                    data-ocid={`communication.rule_toggle.${idx + 1}`}
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground text-sm">
                    {rule.event}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {rule.description}
                  </p>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {rule.channel === "both"
                        ? "📱 WhatsApp + SMS"
                        : rule.channel === "whatsapp"
                          ? "📱 WhatsApp"
                          : "✉️ SMS"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      👥 {rule.recipient}
                    </Badge>
                    {rule.daysBeforeDue !== undefined && (
                      <Badge variant="outline" className="text-xs">
                        {rule.daysBeforeDue} days before due
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void triggerRule(rule)}
                disabled={!rule.enabled}
                className="shrink-0"
                data-ocid={`communication.trigger_rule.${idx + 1}`}
              >
                <Zap className="w-3.5 h-3.5 mr-1" />
                Trigger
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
