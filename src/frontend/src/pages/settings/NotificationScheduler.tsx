import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import phpApiService from "../../utils/phpApiService";

interface SchedulerRule {
  id: string;
  event: string;
  description: string;
  enabled: boolean;
  timing: string;
  channel: string;
  recipients: string;
}

const DEFAULT_RULES: SchedulerRule[] = [
  {
    id: "r1",
    event: "fee_due",
    description: "Fee Due Reminder",
    enabled: true,
    timing: "3 days before due",
    channel: "whatsapp",
    recipients: "parents",
  },
  {
    id: "r2",
    event: "attendance_absent",
    description: "Absent Alert to Parents",
    enabled: true,
    timing: "same day 2 PM",
    channel: "whatsapp",
    recipients: "parents",
  },
  {
    id: "r3",
    event: "exam_reminder",
    description: "Exam Schedule Reminder",
    enabled: false,
    timing: "1 day before exam",
    channel: "sms",
    recipients: "parents",
  },
  {
    id: "r4",
    event: "daily_summary",
    description: "Daily Attendance Summary",
    enabled: false,
    timing: "5 PM daily",
    channel: "email",
    recipients: "admin",
  },
];

export default function NotificationScheduler() {
  const { addNotification } = useApp();
  const [rules, setRules] = useState<SchedulerRule[]>(DEFAULT_RULES);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void phpApiService
      .getSettings()
      .then((s) => {
        if (s.notification_rules) {
          try {
            const parsed =
              typeof s.notification_rules === "string"
                ? (JSON.parse(s.notification_rules) as SchedulerRule[])
                : (s.notification_rules as SchedulerRule[]);
            if (Array.isArray(parsed) && parsed.length) setRules(parsed);
          } catch {
            /* noop */
          }
        }
      })
      .catch(() => {
        /* noop */
      });
  }, []);

  const toggleRule = (id: string) =>
    setRules((r) =>
      r.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)),
    );

  const updateRule = (id: string, field: keyof SchedulerRule, value: string) =>
    setRules((r) => r.map((x) => (x.id === id ? { ...x, [field]: value } : x)));

  const addRule = () => {
    const id = `r${Date.now()}`;
    setRules((r) => [
      ...r,
      {
        id,
        event: "",
        description: "New Rule",
        enabled: false,
        timing: "",
        channel: "whatsapp",
        recipients: "parents",
      },
    ]);
  };

  const deleteRule = (id: string) =>
    setRules((r) => r.filter((x) => x.id !== id));

  const handleSave = async () => {
    setSaving(true);
    try {
      await phpApiService.saveSettings({
        notification_rules: JSON.stringify(rules),
      });
      addNotification("Notification rules saved", "success");
    } catch {
      addNotification("Failed to save rules", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-2xl space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-display font-semibold text-foreground">
              Notification Scheduler
            </h2>
            <p className="text-xs text-muted-foreground">
              Automated rule-based notifications
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={addRule}
          data-ocid="notif-scheduler.add_button"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Rule
        </Button>
      </div>

      <div className="space-y-3">
        {rules.map((rule, idx) => (
          <div
            key={rule.id}
            className={`bg-card border rounded-xl p-4 space-y-3 ${
              rule.enabled ? "border-primary/30" : "border-border"
            }`}
            data-ocid={`notif-scheduler.rule.${idx + 1}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={() => toggleRule(rule.id)}
                  data-ocid={`notif-scheduler.toggle.${idx + 1}`}
                />
                <p className="text-sm font-medium text-foreground truncate">
                  {rule.description}
                </p>
                <Badge
                  variant="secondary"
                  className="text-[10px] flex-shrink-0"
                >
                  {rule.channel}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive flex-shrink-0"
                onClick={() => deleteRule(rule.id)}
                data-ocid={`notif-scheduler.delete_button.${idx + 1}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block">
                  Description
                </Label>
                <Input
                  value={rule.description}
                  onChange={(e) =>
                    updateRule(rule.id, "description", e.target.value)
                  }
                  className="text-xs h-8"
                  data-ocid={`notif-scheduler.desc.${idx + 1}`}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block">
                  Timing
                </Label>
                <Input
                  value={rule.timing}
                  onChange={(e) =>
                    updateRule(rule.id, "timing", e.target.value)
                  }
                  placeholder="e.g. 3 days before"
                  className="text-xs h-8"
                  data-ocid={`notif-scheduler.timing.${idx + 1}`}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block">
                  Channel
                </Label>
                <select
                  value={rule.channel}
                  onChange={(e) =>
                    updateRule(rule.id, "channel", e.target.value)
                  }
                  className="w-full border border-input bg-background text-foreground rounded-md px-2 py-1 text-xs"
                  data-ocid={`notif-scheduler.channel.${idx + 1}`}
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                  <option value="inapp">In-App</option>
                </select>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block">
                  Recipients
                </Label>
                <select
                  value={rule.recipients}
                  onChange={(e) =>
                    updateRule(rule.id, "recipients", e.target.value)
                  }
                  className="w-full border border-input bg-background text-foreground rounded-md px-2 py-1 text-xs"
                  data-ocid={`notif-scheduler.recipients.${idx + 1}`}
                >
                  <option value="parents">Parents</option>
                  <option value="admin">Admin</option>
                  <option value="teachers">Teachers</option>
                  <option value="all">All Users</option>
                </select>
              </div>
            </div>
          </div>
        ))}

        {rules.length === 0 && (
          <div
            className="text-center py-12 bg-card rounded-xl border border-border"
            data-ocid="notif-scheduler.empty_state"
          >
            <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No rules configured</p>
            <Button size="sm" className="mt-3" onClick={addRule}>
              Add First Rule
            </Button>
          </div>
        )}
      </div>

      {rules.length > 0 && (
        <Button
          onClick={handleSave}
          disabled={saving}
          data-ocid="notif-scheduler.submit_button"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving…" : "Save All Rules"}
        </Button>
      )}
    </div>
  );
}
