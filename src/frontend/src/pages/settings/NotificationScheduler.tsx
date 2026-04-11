import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Bell, Save } from "lucide-react";
import { useState } from "react";
import { ls } from "../../utils/localStorage";

interface SchedulerRule {
  id: string;
  event: string;
  description: string;
  enabled: boolean;
  timing: string;
  timingValue: number;
  recipient: string;
  channel: string;
}

const DEFAULT_RULES: SchedulerRule[] = [
  {
    id: "fee_due",
    event: "Fee Due Reminder",
    description: "Remind parents before the 15th of each month fee due date",
    enabled: false,
    timing: "days_before",
    timingValue: 3,
    recipient: "Parents",
    channel: "WhatsApp",
  },
  {
    id: "absent",
    event: "Absent Alert",
    description: "Alert parents when their child is marked absent for the day",
    enabled: false,
    timing: "same_day",
    timingValue: 0,
    recipient: "Parents",
    channel: "WhatsApp",
  },
  {
    id: "birthday",
    event: "Birthday Wish",
    description: "Send birthday wishes to students and their parents",
    enabled: false,
    timing: "on_day",
    timingValue: 0,
    recipient: "Students & Parents",
    channel: "WhatsApp",
  },
  {
    id: "exam_timetable",
    event: "Exam Timetable Published",
    description:
      "Notify all students and parents when exam schedule is published",
    enabled: false,
    timing: "on_publish",
    timingValue: 0,
    recipient: "All",
    channel: "Both",
  },
  {
    id: "result",
    event: "Result Published",
    description: "Notify students and parents when exam results are available",
    enabled: false,
    timing: "on_publish",
    timingValue: 0,
    recipient: "All",
    channel: "Both",
  },
  {
    id: "notice",
    event: "General Notice",
    description: "Send general school notices and announcements",
    enabled: false,
    timing: "on_publish",
    timingValue: 0,
    recipient: "All",
    channel: "Both",
  },
  {
    id: "homework",
    event: "Homework Deadline Reminder",
    description:
      "Remind students and parents about upcoming homework deadlines",
    enabled: false,
    timing: "days_before",
    timingValue: 1,
    recipient: "Students & Parents",
    channel: "WhatsApp",
  },
];

const TIMING_LABELS: Record<string, string> = {
  days_before: "Days Before",
  same_day: "Same Day",
  on_publish: "On Publish",
  on_day: "On the Day",
};

const RECIPIENT_OPTIONS = [
  "Parents",
  "Teachers",
  "Students",
  "Students & Parents",
  "All",
];
const CHANNEL_OPTIONS = ["WhatsApp", "RCS", "Both"];

const EVENT_ICONS: Record<string, string> = {
  "Fee Due Reminder": "💰",
  "Absent Alert": "📋",
  "Exam Timetable Published": "📅",
  "Result Published": "📊",
  "Birthday Wish": "🎂",
  "General Notice": "📢",
  "Homework Deadline Reminder": "📚",
};

export default function NotificationScheduler() {
  const [rules, setRules] = useState<SchedulerRule[]>(() =>
    ls.get<SchedulerRule[]>("notification_scheduler", DEFAULT_RULES),
  );
  const [saved, setSaved] = useState(false);

  function update(id: string, field: keyof SchedulerRule, value: unknown) {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
    setSaved(false);
  }

  function handleSave() {
    ls.set("notification_scheduler", rules);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const enabledCount = rules.filter((r) => r.enabled).length;

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-foreground">
              Notification Scheduler
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {enabledCount === 0
                ? "No automatic notifications enabled"
                : `${enabledCount} of ${rules.length} events enabled`}
            </p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          className={saved ? "bg-accent text-accent-foreground" : ""}
          data-ocid="scheduler-save"
        >
          <Save className="w-4 h-4 mr-1.5" />
          {saved ? "✓ Saved!" : "Save All"}
        </Button>
      </div>

      {/* Info */}
      <div className="bg-muted/40 border border-border rounded-lg p-3">
        <p className="text-xs text-muted-foreground">
          📱 Enabled notifications will be sent via WhatsApp and/or RCS to the
          specified recipients. Requires WhatsApp API to be configured in the
          WhatsApp API settings tab.
        </p>
      </div>

      {/* Rule Cards */}
      <div className="space-y-3">
        {rules.map((rule) => (
          <Card
            key={rule.id}
            className={`p-5 transition-all duration-200 ${
              rule.enabled ? "border-primary/30 bg-primary/[0.02]" : "bg-card"
            }`}
          >
            <div className="flex items-start gap-4">
              <span className="text-2xl mt-0.5 flex-shrink-0">
                {EVENT_ICONS[rule.event] ?? "🔔"}
              </span>
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground">
                      {rule.event}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {rule.description}
                    </p>
                  </div>
                  <Switch
                    data-ocid={`scheduler-toggle-${rule.id}`}
                    checked={rule.enabled}
                    onCheckedChange={(v) => update(rule.id, "enabled", v)}
                  />
                </div>

                {rule.enabled && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                    {/* Timing */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Timing
                      </Label>
                      <Select
                        value={rule.timing}
                        onValueChange={(v) => update(rule.id, "timing", v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TIMING_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Days before value */}
                    {rule.timing === "days_before" && (
                      <div className="space-y-1.5">
                        <Label
                          className="text-xs text-muted-foreground"
                          htmlFor={`timing-val-${rule.id}`}
                        >
                          Days Before
                        </Label>
                        <Input
                          id={`timing-val-${rule.id}`}
                          type="number"
                          min={1}
                          max={30}
                          value={rule.timingValue}
                          onChange={(e) =>
                            update(
                              rule.id,
                              "timingValue",
                              Number(e.target.value),
                            )
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                    )}

                    {/* Recipient */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Recipients
                      </Label>
                      <Select
                        value={rule.recipient}
                        onValueChange={(v) => update(rule.id, "recipient", v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RECIPIENT_OPTIONS.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Channel */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Channel
                      </Label>
                      <Select
                        value={rule.channel}
                        onValueChange={(v) => update(rule.id, "channel", v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CHANNEL_OPTIONS.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {rule.enabled && (
                  <div className="text-xs text-muted-foreground bg-muted/40 rounded px-2 py-1.5">
                    📤 Send to: <strong>{rule.recipient}</strong> ·{" "}
                    {rule.timing === "days_before"
                      ? `${rule.timingValue} day${rule.timingValue > 1 ? "s" : ""} before`
                      : (TIMING_LABELS[rule.timing] ?? rule.timing)}{" "}
                    · via <strong>{rule.channel}</strong>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
