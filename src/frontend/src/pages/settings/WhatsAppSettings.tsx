import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  CheckCircle,
  Eye,
  EyeOff,
  MessageSquare,
  Send,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import type { WhatsAppSettings as WhatsAppSettingsType } from "../../types";
import {
  getWhatsAppLogs,
  getWhatsAppSettings,
  saveWhatsAppSettings,
  sendWhatsApp,
} from "../../utils/whatsapp";

export default function WhatsAppSettings() {
  const [settings, setSettings] =
    useState<WhatsAppSettingsType>(getWhatsAppSettings);
  const [showAppKey, setShowAppKey] = useState(false);
  const [showAuthKey, setShowAuthKey] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState(
    "Test message from SHUBH SCHOOL ERP — WhatsApp integration working ✅",
  );
  const [sending, setSending] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [saved, setSaved] = useState(false);
  const logs = getWhatsAppLogs();

  function handleSave() {
    saveWhatsAppSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleTest() {
    if (!testPhone.trim()) {
      alert("Enter a phone number to send the test message.");
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
      {/* Header Card */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-green-700" />
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
              data-ocid="whatsapp-toggle"
              checked={settings.enabled}
              onCheckedChange={(v) =>
                setSettings((s) => ({ ...s, enabled: v }))
              }
            />
          </div>
        </div>

        {settings.enabled && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <p className="text-xs text-green-700">
              WhatsApp integration is active — messages will be sent from your
              wacoder.in account.
            </p>
          </div>
        )}

        {/* API Keys */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="wa-appkey">App Key</Label>
            <div className="relative">
              <Input
                id="wa-appkey"
                data-ocid="whatsapp-appkey"
                type={showAppKey ? "text" : "password"}
                value={settings.appKey}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, appKey: e.target.value }))
                }
                className="pr-10 font-mono text-xs"
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
                data-ocid="whatsapp-authkey"
                type={showAuthKey ? "text" : "password"}
                value={settings.authKey}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, authKey: e.target.value }))
                }
                className="pr-10 font-mono text-xs"
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
            onClick={handleSave}
            className={saved ? "bg-accent text-accent-foreground" : ""}
            data-ocid="whatsapp-save"
          >
            {saved ? "✓ Settings Saved!" : "Save Settings"}
          </Button>
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
              data-ocid="whatsapp-test-phone"
              placeholder="10-digit mobile number (without +91)"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wa-test-msg">Message</Label>
            <Input
              id="wa-test-msg"
              data-ocid="whatsapp-test-message"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
            />
          </div>
          <Button
            data-ocid="whatsapp-send-test"
            onClick={handleTest}
            disabled={sending}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-1.5" />
            {sending ? "Sending..." : "Send Test Message"}
          </Button>

          {testResult && (
            <div
              className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                testResult.success
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}
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
          <div className="space-y-0">
            {logs.slice(0, 10).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
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
