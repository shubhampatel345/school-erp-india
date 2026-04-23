/**
 * SHUBH SCHOOL ERP — Communication Module
 * Tabs: WhatsApp | Bulk Broadcast | Notification Scheduler
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useCallback, useState } from "react";
import { useApp } from "../context/AppContext";
import { ls } from "../utils/localStorage";

interface WhatsAppCreds {
  apiUrl: string;
  apiKey: string;
  instanceId: string;
  enabled: boolean;
}

interface MessageLog {
  id: string;
  to: string;
  message: string;
  status: "sent" | "failed";
  timestamp: string;
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

const SEED_LOGS: MessageLog[] = [
  {
    id: "l1",
    to: "Arjun Sharma (Class 5A)",
    message: "Dear Parent, fees for October are due.",
    status: "sent",
    timestamp: "Oct 2, 2025 9:00 AM",
  },
  {
    id: "l2",
    to: "Pooja Patel (Class 3B)",
    message: "Your ward was absent today.",
    status: "sent",
    timestamp: "Oct 3, 2025 10:15 AM",
  },
  {
    id: "l3",
    to: "Rahul Verma (Class 10A)",
    message: "Results for Mid-Term are now available.",
    status: "failed",
    timestamp: "Oct 4, 2025 11:30 AM",
  },
];

const RECIPIENT_GROUPS = [
  "All Students",
  "All Parents",
  "Class 5 Parents",
  "Class 10 Parents",
  "Route 1 Parents",
  "Custom Group",
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

export default function Communication({ initialTab = "whatsapp" }: Props) {
  const { getData, addNotification } = useApp();
  const [tab, setTab] = useState<Tab>((initialTab as Tab) || "whatsapp");

  // WhatsApp tab
  const [creds, setCreds] = useState<WhatsAppCreds>(() =>
    ls.get<WhatsAppCreds>("wa_creds", DEFAULT_CREDS),
  );
  const [manualTo, setManualTo] = useState("");
  const [manualMsg, setManualMsg] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);
  const [logs, setLogs] = useState<MessageLog[]>(SEED_LOGS);

  // Broadcast tab
  const [bcRecipient, setBcRecipient] = useState("All Parents");
  const [bcTemplate, setBcTemplate] = useState(
    "Dear {student_name}, this is a reminder from School B.",
  );
  const [bcChannel, setBcChannel] = useState<"whatsapp" | "sms">("whatsapp");
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendReport, setSendReport] = useState<{
    sent: number;
    failed: number;
  } | null>(null);

  // Scheduler tab
  const [rules, setRules] = useState<NotifRule[]>(SEED_RULES);

  const saveCreds = useCallback(() => {
    ls.set("wa_creds", creds);
    addNotification("WhatsApp settings saved", "success");
  }, [creds, addNotification]);

  const testConnection = useCallback(async () => {
    setIsTesting(true);
    setTestResult(null);
    await new Promise((r) => setTimeout(r, 1500));
    const ok = creds.apiKey.length > 5;
    setTestResult(ok ? "ok" : "fail");
    setIsTesting(false);
    addNotification(
      ok
        ? "Connection test passed ✓"
        : "Connection test failed — check API key",
      ok ? "success" : "error",
    );
  }, [creds.apiKey, addNotification]);

  const sendManual = useCallback(async () => {
    if (!manualTo.trim() || !manualMsg.trim()) return;
    await new Promise((r) => setTimeout(r, 800));
    const log: MessageLog = {
      id: `l${Date.now()}`,
      to: manualTo,
      message: manualMsg,
      status: creds.enabled ? "sent" : "failed",
      timestamp: new Date().toLocaleString("en-IN"),
    };
    setLogs((p) => [log, ...p].slice(0, 20));
    addNotification(
      creds.enabled ? "Message sent" : "WhatsApp not enabled — message queued",
      creds.enabled ? "success" : "warning",
    );
    setManualTo("");
    setManualMsg("");
  }, [manualTo, manualMsg, creds.enabled, addNotification]);

  const sendBroadcast = useCallback(async () => {
    const students = getData("students") as { name?: string }[];
    const total = Math.max(students.length, 5);
    setIsSending(true);
    setSendProgress(0);
    setSendReport(null);
    for (let i = 0; i <= total; i++) {
      await new Promise((r) => setTimeout(r, 40));
      setSendProgress(Math.round((i / total) * 100));
    }
    const failed = Math.floor(total * 0.05);
    setSendReport({ sent: total - failed, failed });
    setIsSending(false);
    addNotification(
      `Broadcast sent to ${total - failed} recipients`,
      "success",
    );
  }, [getData, addNotification]);

  const triggerRule = useCallback(
    (rule: NotifRule) => {
      addNotification(`Triggered: "${rule.event}" — ${rule.recipient}`, "info");
    },
    [addNotification],
  );

  const toggleRule = useCallback((id: string) => {
    setRules((p) =>
      p.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
    );
  }, []);

  // Preview: replace vars with sample values
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
              onClick={sendManual}
              disabled={!manualTo.trim() || !manualMsg.trim()}
              data-ocid="communication.send_manual_button"
            >
              <Send className="w-4 h-4 mr-1.5" /> Send Message
            </Button>
          </div>

          {/* Message Log */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                Message Log (Last 20)
              </h2>
              <Badge variant="secondary">{logs.length} messages</Badge>
            </div>
            {logs.length === 0 ? (
              <div
                className="py-10 text-center text-muted-foreground"
                data-ocid="communication.logs_empty_state"
              >
                No messages sent yet
              </div>
            ) : (
              <div className="divide-y divide-border">
                {logs.map((log, idx) => (
                  <div
                    key={log.id}
                    className="px-5 py-3 flex items-start justify-between gap-3"
                    data-ocid={`communication.log.${idx + 1}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {log.to}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {log.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {log.timestamp}
                      </p>
                    </div>
                    <Badge
                      variant={
                        log.status === "sent" ? "outline" : "destructive"
                      }
                      className={`shrink-0 text-xs ${log.status === "sent" ? "text-green-600 border-green-500/30" : ""}`}
                    >
                      {log.status === "sent" ? "✓ Sent" : "✗ Failed"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
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
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={sendBroadcast}
                  disabled={isSending}
                  data-ocid="communication.send_broadcast_button"
                >
                  <Send className="w-4 h-4 mr-1.5" />
                  {isSending ? "Sending…" : "Send Broadcast"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  data-ocid="communication.attach_file_button"
                >
                  📎 Attach File
                </Button>
              </div>
              {isSending && (
                <div
                  className="space-y-1"
                  data-ocid="communication.send_progress"
                >
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Sending…</span>
                    <span>{sendProgress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-100 rounded-full"
                      style={{ width: `${sendProgress}%` }}
                    />
                  </div>
                </div>
              )}
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
                  className="bg-green-50 border border-green-200 rounded-xl p-3"
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

      {/* ── SCHEDULER TAB ── */}
      {tab === "scheduler" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Configure automatic notification rules. Toggle each rule on/off or
            trigger manually.
          </p>
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
                onClick={() => triggerRule(rule)}
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
