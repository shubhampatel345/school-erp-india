import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  CheckCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  MessageSquare,
  Send,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../context/AppContext";
import type { WhatsAppSettings as BaseWhatsAppSettings } from "../../types";

interface WhatsAppSettingsType extends BaseWhatsAppSettings {
  fromNumber?: string;
}
import {
  getWhatsAppLogs,
  getWhatsAppSettings,
  saveWhatsAppSettings,
  sendWhatsApp,
} from "../../utils/whatsapp";

export default function WhatsAppSettings() {
  const { saveData } = useApp();
  const [settings, setSettings] = useState<WhatsAppSettingsType>(
    () => getWhatsAppSettings() as WhatsAppSettingsType,
  );
  const [showAppKey, setShowAppKey] = useState(false);
  const [showAuthKey, setShowAuthKey] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState(
    "Test message from SHUBH SCHOOL ERP — WhatsApp integration working ✅",
  );
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const logs = getWhatsAppLogs();

  async function handleSave() {
    setSaving(true);
    try {
      // Save to localStorage (for whatsapp utility functions)
      saveWhatsAppSettings(settings);
      // Sync to MySQL via saveData
      await saveData("settings", {
        id: "whatsapp_settings",
        type: "whatsapp",
        ...settings,
      } as Record<string, unknown>);
      toast.success("WhatsApp settings saved to server.");
    } catch {
      // Saved locally at least
      toast.success("WhatsApp settings saved locally.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!testPhone.trim()) {
      toast.error("Enter a phone number to send the test message.");
      return;
    }
    setSending(true);
    setTestResult(null);
    const result = await sendWhatsApp(testPhone.trim(), testMessage);
    setTestResult({
      success: result.success,
      message: result.success
        ? "✅ Message sent successfully! Check your WhatsApp."
        : (result.error ??
          "Failed to send. Check your API keys and phone number."),
    });
    setSending(false);
  }

  return (
    <div className="p-4 lg:p-6 max-w-2xl space-y-6">
      {/* API Settings Card */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-green-700 dark:text-green-400" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-foreground">
                WhatsApp API (wacoder.in)
              </h2>
              <p className="text-xs text-muted-foreground">
                Real WhatsApp messaging for fee reminders, attendance alerts,
                and notices
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {settings.enabled ? "Enabled" : "Disabled"}
            </span>
            <Switch
              data-ocid="whatsapp.enabled.toggle"
              checked={settings.enabled}
              onCheckedChange={(v) =>
                setSettings((s) => ({ ...s, enabled: v }))
              }
            />
          </div>
        </div>

        {settings.enabled && (
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <p className="text-xs text-green-700 dark:text-green-400">
              WhatsApp integration is active — messages will be sent from your
              wacoder.in account.
            </p>
          </div>
        )}

        {/* Provider info */}
        <div className="rounded-lg bg-muted/30 border border-border p-3">
          <p className="text-xs text-muted-foreground">
            Using <strong>wacoder.in</strong> as the WhatsApp API provider.{" "}
            <a
              href="https://wacoder.in"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-2 inline-flex items-center gap-0.5 text-xs"
            >
              Get API keys <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>

        {/* API Keys */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="wa-appkey">App Key</Label>
            <div className="relative">
              <Input
                id="wa-appkey"
                data-ocid="whatsapp.appkey.input"
                type={showAppKey ? "text" : "password"}
                value={settings.appKey}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, appKey: e.target.value }))
                }
                className="pr-10 font-mono text-xs"
                placeholder="Enter your wacoder.in App Key"
              />
              <button
                type="button"
                onClick={() => setShowAppKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showAppKey ? "Hide app key" : "Show app key"}
              >
                {showAppKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wa-authkey">Auth Key</Label>
            <div className="relative">
              <Input
                id="wa-authkey"
                data-ocid="whatsapp.authkey.input"
                type={showAuthKey ? "text" : "password"}
                value={settings.authKey}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, authKey: e.target.value }))
                }
                className="pr-10 font-mono text-xs"
                placeholder="Enter your wacoder.in Auth Key"
              />
              <button
                type="button"
                onClick={() => setShowAuthKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showAuthKey ? "Hide auth key" : "Show auth key"}
              >
                {showAuthKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            onClick={() => void handleSave()}
            data-ocid="whatsapp.save.button"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </div>
      </Card>

      {/* WhatsApp Bot Webhook */}
      <Card className="p-6 space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            Bot
          </Badge>
          Auto-Reply Bot Setup
        </h3>
        <p className="text-xs text-muted-foreground">
          Parents can send their child's Admission Number to your school
          WhatsApp number to receive attendance and fees summary automatically.
        </p>
        <div className="rounded-lg bg-muted/30 border border-border p-4 space-y-3">
          <p className="text-xs font-semibold text-foreground">
            📋 Webhook Setup Steps
          </p>
          {[
            "Log in to your wacoder.in dashboard",
            "Go to Webhook Settings and enter your server URL:",
            "https://shubh.psmkgs.com/api/index.php?route=whatsapp/webhook",
            "Enable incoming message webhook",
            "Save settings — parents can now text your school number with their child's Admission No.",
          ].map((step, i) => (
            <div
              key={`wa-step-${step.slice(0, 20)}`}
              className="flex items-start gap-2 text-xs text-muted-foreground"
            >
              {step.startsWith("https://") ? (
                <code className="bg-muted px-2 py-1 rounded font-mono text-[10px] break-all">
                  {step}
                </code>
              ) : (
                <>
                  <span className="w-4 h-4 rounded-full bg-muted-foreground/20 text-muted-foreground font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wa-from">From Number (School WhatsApp)</Label>
          <Input
            id="wa-from"
            data-ocid="whatsapp.from_number.input"
            placeholder="10-digit number registered with wacoder.in"
            value={settings.fromNumber ?? ""}
            onChange={(e) =>
              setSettings((s) => ({ ...s, fromNumber: e.target.value }))
            }
          />
        </div>
      </Card>

      {/* Test Message Card */}
      <Card className="p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Send Test Message</h3>
        <p className="text-xs text-muted-foreground">
          Verify your WhatsApp connection by sending a test message to any
          mobile number.
        </p>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="wa-test-phone">Phone Number</Label>
            <Input
              id="wa-test-phone"
              data-ocid="whatsapp.test_phone.input"
              placeholder="10-digit mobile number (without +91)"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wa-test-msg">Message</Label>
            <Input
              id="wa-test-msg"
              data-ocid="whatsapp.test_message.input"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
            />
          </div>
          <Button
            data-ocid="whatsapp.send_test.button"
            onClick={() => void handleTest()}
            disabled={sending}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-1.5" />
            {sending ? "Sending…" : "Send Test Message"}
          </Button>

          {testResult && (
            <div
              className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                testResult.success
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}
              data-ocid={
                testResult.success
                  ? "whatsapp.test.success_state"
                  : "whatsapp.test.error_state"
              }
            >
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Recent Sends Log */}
      {logs.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold text-foreground mb-3">
            Recent Sends
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              (last 10)
            </span>
          </h3>
          <div className="divide-y divide-border">
            {logs.slice(0, 10).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate max-w-xs">
                    {log.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    To: {log.to} ·{" "}
                    {new Date(log.timestamp).toLocaleString("en-IN")}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`ml-3 flex-shrink-0 text-xs ${
                    log.status === "sent"
                      ? "bg-accent/10 text-accent border-accent/20"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                  }`}
                >
                  {log.status === "sent" ? "✓ Sent" : "✗ Failed"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
