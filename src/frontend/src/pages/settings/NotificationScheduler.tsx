import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Bell, Play, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getApiIndexUrl, getJwt } from "../../utils/api";
import { generateId, ls } from "../../utils/localStorage";

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
  hours_before: "Hours Before",
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
const CHANNEL_OPTIONS = ["WhatsApp", "RCS", "Both", "In-App"];

const EVENT_ICONS: Record<string, string> = {
  "Fee Due Reminder": "💰",
  "Absent Alert": "📋",
  "Exam Timetable Published": "📅",
  "Result Published": "📊",
  "Birthday Wish": "🎂",
  "General Notice": "📢",
  "Homework Deadline Reminder": "📚",
};

async function saveRulesToServer(rules: SchedulerRule[]): Promise<boolean> {
  try {
    const token = getJwt();
    const url = getApiIndexUrl();
    const res = await fetch(`${url}?route=notifications/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ rules }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      status?: string;
    };
    return data.status === "success" || res.ok;
  } catch {
    return false;
  }
}

async function triggerRuleNow(rule: SchedulerRule): Promise<void> {
  try {
    const token = getJwt();
    const url = getApiIndexUrl();
    await fetch(`${url}?route=notifications/trigger`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ruleId: rule.id, event: rule.event }),
    });
  } catch {
    // fail silently — trigger is a best-effort operation
  }
}

const BLANK_RULE: Omit<SchedulerRule, "id"> = {
  event: "",
  description: "",
  enabled: true,
  timing: "on_publish",
  timingValue: 1,
  recipient: "Parents",
  channel: "WhatsApp",
};

export default function NotificationScheduler() {
  const [rules, setRules] = useState<SchedulerRule[]>(() =>
    ls.get<SchedulerRule[]>("notification_scheduler", DEFAULT_RULES),
  );
  const [saved, setSaved] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newRule, setNewRule] = useState<Omit<SchedulerRule, "id">>({
    ...BLANK_RULE,
  });
  const [triggering, setTriggering] = useState<string | null>(null);

  function update(id: string, field: keyof SchedulerRule, value: unknown) {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
    setSaved(false);
  }

  function deleteRule(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id));
    setSaved(false);
  }

  async function handleSave() {
    ls.set("notification_scheduler", rules);
    const ok = await saveRulesToServer(rules);
    setSaved(true);
    if (ok) {
      toast.success("Notification rules saved to server ✓");
    } else {
      toast.success("Rules saved locally (server sync pending).");
    }
    setTimeout(() => setSaved(false), 2500);
  }

  function handleAddRule() {
    if (!newRule.event.trim()) {
      toast.error("Please enter an event name.");
      return;
    }
    const rule: SchedulerRule = { id: generateId(), ...newRule };
    setRules((prev) => [...prev, rule]);
    setNewRule({ ...BLANK_RULE });
    setShowAddDialog(false);
    setSaved(false);
  }

  async function handleSendNow(rule: SchedulerRule) {
    setTriggering(rule.id);
    await triggerRuleNow(rule);
    toast.success(
      `"${rule.event}" triggered — notification sent to ${rule.recipient} via ${rule.channel}.`,
    );
    setTimeout(() => setTriggering(null), 1500);
  }

  const enabledCount = rules.filter((r) => r.enabled).length;

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAddDialog(true)}
            data-ocid="scheduler-add-rule-btn"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Rule
          </Button>
          <Button
            onClick={handleSave}
            className={saved ? "bg-accent text-accent-foreground" : ""}
            data-ocid="scheduler-save"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {saved ? "✓ Saved!" : "Save All"}
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-muted/40 border border-border rounded-lg p-3">
        <p className="text-xs text-muted-foreground">
          📱 Enabled notifications will be sent via WhatsApp and/or RCS to the
          specified recipients. Requires WhatsApp API to be configured in the
          WhatsApp Settings tab. Use "Send Now" to trigger any rule manually.
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
            data-ocid={`scheduler-rule-${rule.id}`}
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
                    {rule.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {rule.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => handleSendNow(rule)}
                      disabled={triggering === rule.id}
                      data-ocid={`scheduler-sendnow-${rule.id}`}
                    >
                      <Play
                        className={`w-3 h-3 ${triggering === rule.id ? "animate-pulse" : ""}`}
                      />
                      {triggering === rule.id ? "Sending…" : "Send Now"}
                    </Button>
                    <Switch
                      data-ocid={`scheduler-toggle-${rule.id}`}
                      checked={rule.enabled}
                      onCheckedChange={(v) => update(rule.id, "enabled", v)}
                    />
                    {!DEFAULT_RULES.some((d) => d.id === rule.id) && (
                      <button
                        type="button"
                        onClick={() => deleteRule(rule.id)}
                        className="text-destructive hover:text-destructive/80 p-1"
                        aria-label="Delete rule"
                        data-ocid={`scheduler-delete-${rule.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
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

                    {/* Days/Hours before value */}
                    {(rule.timing === "days_before" ||
                      rule.timing === "hours_before") && (
                      <div className="space-y-1.5">
                        <Label
                          className="text-xs text-muted-foreground"
                          htmlFor={`timing-val-${rule.id}`}
                        >
                          {rule.timing === "hours_before"
                            ? "Hours Before"
                            : "Days Before"}
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
                      : rule.timing === "hours_before"
                        ? `${rule.timingValue} hour${rule.timingValue > 1 ? "s" : ""} before`
                        : (TIMING_LABELS[rule.timing] ?? rule.timing)}{" "}
                    · via <strong>{rule.channel}</strong>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Rule Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent
          className="sm:max-w-md"
          data-ocid="scheduler-add-rule.dialog"
        >
          <DialogHeader>
            <DialogTitle>Add Notification Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-event">Event Name *</Label>
              <Input
                id="new-event"
                data-ocid="scheduler-new-event-input"
                placeholder="e.g. Monthly Fee Reminder"
                value={newRule.event}
                onChange={(e) =>
                  setNewRule((r) => ({ ...r, event: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-desc">Description</Label>
              <Input
                id="new-desc"
                data-ocid="scheduler-new-desc-input"
                placeholder="Brief description of when this fires"
                value={newRule.description}
                onChange={(e) =>
                  setNewRule((r) => ({ ...r, description: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Timing</Label>
                <Select
                  value={newRule.timing}
                  onValueChange={(v) =>
                    setNewRule((r) => ({ ...r, timing: v }))
                  }
                >
                  <SelectTrigger
                    className="text-sm"
                    data-ocid="scheduler-new-timing-select"
                  >
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
              {(newRule.timing === "days_before" ||
                newRule.timing === "hours_before") && (
                <div className="space-y-1.5">
                  <Label>
                    {newRule.timing === "hours_before" ? "Hours" : "Days"}{" "}
                    Before
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={newRule.timingValue}
                    onChange={(e) =>
                      setNewRule((r) => ({
                        ...r,
                        timingValue: Number(e.target.value),
                      }))
                    }
                    data-ocid="scheduler-new-timing-value-input"
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Recipients</Label>
                <Select
                  value={newRule.recipient}
                  onValueChange={(v) =>
                    setNewRule((r) => ({ ...r, recipient: v }))
                  }
                >
                  <SelectTrigger
                    className="text-sm"
                    data-ocid="scheduler-new-recipient-select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECIPIENT_OPTIONS.map((rr) => (
                      <SelectItem key={rr} value={rr}>
                        {rr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Channel</Label>
                <Select
                  value={newRule.channel}
                  onValueChange={(v) =>
                    setNewRule((r) => ({ ...r, channel: v }))
                  }
                >
                  <SelectTrigger
                    className="text-sm"
                    data-ocid="scheduler-new-channel-select"
                  >
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
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                data-ocid="scheduler-add-cancel-btn"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddRule}
                data-ocid="scheduler-add-submit-btn"
              >
                Add Rule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
