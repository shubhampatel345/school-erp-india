import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Bluetooth,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Info,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Plus,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useApp } from "../context/AppContext";
import type { Call, Staff, Student } from "../types";
import { generateId, ls } from "../utils/localStorage";

// ── Local types ───────────────────────────────────────────────

interface MsPhoneSettings {
  tenantId: string;
  acsEndpoint: string;
  acsConnectionString: string;
  phoneNumber: string;
  displayName: string;
}

const MS_PHONE_KEY = "ms_phone_settings";

const DEFAULT_MS_SETTINGS: MsPhoneSettings = {
  tenantId: "",
  acsEndpoint: "",
  acsConnectionString: "",
  phoneNumber: "",
  displayName: "SHUBH SCHOOL",
};

// ── Utility ───────────────────────────────────────────────────

function formatDuration(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

function formatTime(ts: string | number): string {
  return new Date(ts).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

function teamsCallUrl(phoneNumber: string): string {
  const e164 = toE164(phoneNumber);
  return `https://teams.microsoft.com/l/call/0/0?users=4:${encodeURIComponent(e164)}`;
}

// ── InfoBanner ────────────────────────────────────────────────

function InfoBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
      <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
      <div>{children}</div>
    </div>
  );
}

// ── Dashboard Tab ─────────────────────────────────────────────

function DashboardTab({ calls }: { calls: Call[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayCalls = calls.filter(
    (c) => new Date(c.timestamp).getTime() >= today.getTime(),
  );
  const answered = todayCalls.filter((c) => c.status === "completed");
  const missed = todayCalls.filter((c) => c.status === "missed");
  const avgDuration =
    answered.reduce((sum, c) => sum + c.duration, 0) /
    Math.max(1, answered.length);

  const recent = [...calls]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, 10);

  const stats = [
    {
      label: "Total Calls Today",
      value: todayCalls.length,
      icon: Phone,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Answered",
      value: answered.length,
      icon: PhoneCall,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Missed",
      value: missed.length,
      icon: PhoneMissed,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      label: "Avg Duration",
      value: `${Math.round(avgDuration)}s`,
      icon: Clock,
      color: "text-accent",
      bg: "bg-accent/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <div
                    className={`w-7 h-7 rounded-lg ${stat.bg} flex items-center justify-center`}
                  >
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </div>
                <p className={`text-2xl font-bold font-display ${stat.color}`}>
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Calls</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 text-muted-foreground"
              data-ocid="calling.empty_state"
            >
              <Phone className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No call logs yet.</p>
              <p className="text-xs">
                Use Click-to-Call to make your first call.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recent.map((call, i) => (
                <div
                  key={call.id}
                  className="flex items-center gap-3 px-4 py-3"
                  data-ocid={`calling.log.item.${i + 1}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      call.status === "missed"
                        ? "bg-destructive/10"
                        : call.direction === "inbound"
                          ? "bg-green-50"
                          : "bg-primary/10"
                    }`}
                  >
                    {call.status === "missed" ? (
                      <PhoneMissed className="w-4 h-4 text-destructive" />
                    ) : call.direction === "inbound" ? (
                      <PhoneIncoming className="w-4 h-4 text-green-600" />
                    ) : (
                      <PhoneOutgoing className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {call.direction === "outbound" ? call.to : call.from}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(call.timestamp)} ·{" "}
                      {formatDuration(call.duration)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      call.status === "completed" ? "default" : "destructive"
                    }
                    className="text-[10px] px-1.5 py-0.5 flex-shrink-0 capitalize"
                  >
                    {call.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Click-to-Call Tab ─────────────────────────────────────────

function ClickToCallTab({ onCallMade }: { onCallMade: (c: Call) => void }) {
  const { getData } = useApp();
  const [query, setQuery] = useState("");
  const [manualNumber, setManualNumber] = useState("");

  const students = getData("students") as Student[];
  const staff = getData("staff") as Staff[];

  const results =
    query.length >= 2
      ? [
          ...students
            .filter(
              (s) =>
                s.fullName?.toLowerCase().includes(query.toLowerCase()) ||
                s.fatherName?.toLowerCase().includes(query.toLowerCase()) ||
                s.admNo?.includes(query),
            )
            .map((s) => ({
              id: s.id,
              name: s.fullName ?? "",
              role: `Class ${s.class ?? ""} ${s.section ?? ""}`.trim(),
              mobile: s.mobile ?? "",
            })),
          ...staff
            .filter((st) =>
              st.name?.toLowerCase().includes(query.toLowerCase()),
            )
            .map((st) => ({
              id: st.id,
              name: st.name ?? "",
              role: st.designation ?? "Staff",
              mobile: st.mobile ?? "",
            })),
        ].slice(0, 12)
      : [];

  const logCall = (to: string, contactName: string) => {
    const call: Call = {
      id: generateId(),
      from: "ERP User",
      to: contactName,
      duration: 0,
      timestamp: new Date().toISOString(),
      status: "completed",
      direction: "outbound",
    };
    onCallMade(call);
    const url = to.match(/^\+?\d+$/) ? teamsCallUrl(to) : teamsCallUrl(to);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleManualCall = () => {
    if (!manualNumber.trim()) return;
    logCall(manualNumber, manualNumber);
    setManualNumber("");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <InfoBanner>
        <strong>Calls are placed through Microsoft Teams.</strong> Make sure
        Microsoft Teams is installed and signed in on this device. For
        mobile-to-PC Bluetooth calling, pair your phone via Bluetooth, open
        Teams on both devices, and use Teams' built-in call transfer feature.
      </InfoBanner>

      {/* Manual number entry */}
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Manual Number Dial</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              type="tel"
              placeholder="Enter phone number (e.g. +91XXXXXXXXXX)"
              value={manualNumber}
              onChange={(e) => setManualNumber(e.target.value)}
              className="flex-1"
              data-ocid="calling.manual_number_input"
            />
            <Button
              onClick={handleManualCall}
              disabled={!manualNumber.trim()}
              className="gap-2 bg-primary hover:bg-primary/90"
              data-ocid="calling.manual_call_button"
            >
              <Phone className="w-4 h-4" /> Call via Teams
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search contacts */}
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-foreground mb-1">
            Search Contacts
          </h3>
          <p className="text-xs text-muted-foreground">
            Find students or staff by name or admission number
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Name or admission no..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-ocid="calling.search_input"
          />
        </div>

        {query.length >= 2 && (
          <div className="space-y-2">
            {results.length === 0 ? (
              <p
                className="text-sm text-muted-foreground text-center py-8"
                data-ocid="calling.contacts.empty_state"
              >
                No contacts found
              </p>
            ) : (
              results.map((r, i) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors"
                  data-ocid={`calling.contact.item.${i + 1}`}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">
                      {r.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.role}
                    </p>
                  </div>
                  {r.mobile ? (
                    <Button
                      size="sm"
                      className="gap-1.5 bg-primary hover:bg-primary/90"
                      onClick={() => logCall(r.mobile, r.name)}
                      data-ocid={`calling.call_button.${i + 1}`}
                    >
                      <Phone className="w-3.5 h-3.5" /> Call
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      No number
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Call Logs Tab ─────────────────────────────────────────────

function CallLogsTab({
  calls,
  onDelete,
  onAdd,
}: {
  calls: Call[];
  onDelete: (id: string) => void;
  onAdd: (c: Call) => void;
}) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newEntry, setNewEntry] = useState<{
    contact: string;
    number: string;
    direction: "inbound" | "outbound";
    status: "completed" | "missed" | "rejected";
    duration: number;
  }>({
    contact: "",
    number: "",
    direction: "outbound",
    status: "completed",
    duration: 0,
  });

  const filtered = calls.filter((c) => {
    if (filter === "inbound" && c.direction !== "inbound") return false;
    if (filter === "outbound" && c.direction !== "outbound") return false;
    if (filter === "missed" && c.status !== "missed") return false;
    if (search) {
      const q = search.toLowerCase();
      const contact =
        c.direction === "outbound" ? c.to.toLowerCase() : c.from.toLowerCase();
      if (!contact.includes(q)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  const addEntry = () => {
    const call: Call = {
      id: generateId(),
      from: newEntry.direction === "inbound" ? newEntry.contact : "ERP User",
      to: newEntry.direction === "outbound" ? newEntry.contact : "ERP User",
      duration: Number(newEntry.duration) || 0,
      timestamp: new Date().toISOString(),
      status: newEntry.status,
      direction: newEntry.direction,
    };
    onAdd(call);
    setShowAdd(false);
    setNewEntry({
      contact: "",
      number: "",
      direction: "outbound",
      status: "completed",
      duration: 0,
    });
  };

  const exportCsv = () => {
    const rows = [
      ["Date/Time", "Contact", "Direction", "Duration", "Status"],
      ...sorted.map((c) => [
        formatTime(c.timestamp),
        c.direction === "outbound" ? c.to : c.from,
        c.direction,
        formatDuration(c.duration),
        c.status,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "call-logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search contact…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-ocid="calling.logs_search_input"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36" data-ocid="calling.logs_type_select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Calls</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
            <SelectItem value="missed">Missed</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={exportCsv}
          data-ocid="calling.logs_export_button"
        >
          <Download className="w-4 h-4 mr-1.5" /> Export CSV
        </Button>
        <Button
          size="sm"
          onClick={() => setShowAdd(true)}
          data-ocid="calling.logs_add_button"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Add Entry
        </Button>
      </div>

      {showAdd && (
        <Card className="border border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <h4 className="font-semibold text-sm">Add Manual Call Entry</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Contact Name</Label>
                <Input
                  value={newEntry.contact}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, contact: e.target.value })
                  }
                  placeholder="Name or number"
                  data-ocid="calling.add_entry_contact_input"
                />
              </div>
              <div>
                <Label className="text-xs">Duration (seconds)</Label>
                <Input
                  type="number"
                  value={newEntry.duration}
                  onChange={(e) =>
                    setNewEntry({
                      ...newEntry,
                      duration: Number(e.target.value),
                    })
                  }
                  data-ocid="calling.add_entry_duration_input"
                />
              </div>
              <div>
                <Label className="text-xs">Direction</Label>
                <Select
                  value={newEntry.direction}
                  onValueChange={(v) =>
                    setNewEntry({
                      ...newEntry,
                      direction: v as "inbound" | "outbound",
                    })
                  }
                >
                  <SelectTrigger data-ocid="calling.add_entry_direction_select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outbound">Outbound</SelectItem>
                    <SelectItem value="inbound">Inbound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select
                  value={newEntry.status}
                  onValueChange={(v) =>
                    setNewEntry({
                      ...newEntry,
                      status: v as "completed" | "missed" | "rejected",
                    })
                  }
                >
                  <SelectTrigger data-ocid="calling.add_entry_status_select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="missed">Missed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={addEntry}
                data-ocid="calling.logs_save_button"
              >
                Save Entry
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAdd(false)}
                data-ocid="calling.logs_cancel_button"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {sorted.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-12 text-muted-foreground"
          data-ocid="calling.logs.empty_state"
        >
          <Phone className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm">No call logs found.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                  Date/Time
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                  Contact
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">
                  Direction
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">
                  Duration
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                  Status
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((call, i) => {
                const contact =
                  call.direction === "outbound" ? call.to : call.from;
                return (
                  <tr
                    key={call.id}
                    className="hover:bg-muted/30 transition-colors"
                    data-ocid={`calling.log.row.${i + 1}`}
                  >
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {formatTime(call.timestamp)}
                    </td>
                    <td className="px-4 py-2.5 font-medium truncate max-w-[140px]">
                      {contact}
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <span className="flex items-center gap-1">
                        {call.status === "missed" ? (
                          <PhoneMissed className="w-3 h-3 text-destructive" />
                        ) : call.direction === "inbound" ? (
                          <PhoneIncoming className="w-3 h-3 text-green-600" />
                        ) : (
                          <PhoneOutgoing className="w-3 h-3 text-primary" />
                        )}
                        <span className="capitalize text-xs">
                          {call.direction}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs hidden md:table-cell">
                      {formatDuration(call.duration)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        variant={
                          call.status === "completed"
                            ? "default"
                            : "destructive"
                        }
                        className="text-[10px] capitalize"
                      >
                        {call.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => onDelete(call.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Delete log"
                        data-ocid={`calling.log.delete_button.${i + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────

function MsSettingsTab() {
  const [form, setForm] = useState<MsPhoneSettings>(() =>
    ls.get<MsPhoneSettings>(MS_PHONE_KEY, DEFAULT_MS_SETTINGS),
  );
  const [saved, setSaved] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const saveSettings = () => {
    ls.set(MS_PHONE_KEY, form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const steps = [
    "Get Microsoft 365 Business Voice or Teams Phone license from your IT admin.",
    "In Azure Portal → Azure Communication Services, create a resource and copy the Connection String.",
    "Assign a phone number to your Teams account in Teams Admin Center.",
    "Install Microsoft Teams on this PC and on your mobile phone.",
    "To answer PC calls on mobile via Bluetooth: pair your phone via Bluetooth settings, open Teams on both devices — Teams will automatically route calls to all signed-in devices.",
    "Enter your Tenant ID, ACS endpoint, and phone number in the fields above and click Save.",
    'Test by clicking "Call" on any student/staff in the Click-to-Call tab.',
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4" /> Microsoft Phone System Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold">
                Microsoft Teams Tenant ID
              </Label>
              <Input
                value={form.tenantId}
                onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                data-ocid="calling.settings_tenant_id"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">
                Your Teams Phone Number
              </Label>
              <Input
                value={form.phoneNumber}
                onChange={(e) =>
                  setForm({ ...form, phoneNumber: e.target.value })
                }
                placeholder="+91XXXXXXXXXX"
                data-ocid="calling.settings_phone_number"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                E.164 format, e.g. +91XXXXXXXXXX
              </p>
            </div>
            <div>
              <Label className="text-xs font-semibold">
                ACS Resource Endpoint URL
              </Label>
              <Input
                value={form.acsEndpoint}
                onChange={(e) =>
                  setForm({ ...form, acsEndpoint: e.target.value })
                }
                placeholder="https://your-resource.communication.azure.com"
                data-ocid="calling.settings_acs_endpoint"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Display Name</Label>
              <Input
                value={form.displayName}
                onChange={(e) =>
                  setForm({ ...form, displayName: e.target.value })
                }
                placeholder="Shown in Teams caller ID"
                data-ocid="calling.settings_display_name"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs font-semibold">
                ACS Connection String
              </Label>
              <Input
                type="password"
                value={form.acsConnectionString}
                onChange={(e) =>
                  setForm({ ...form, acsConnectionString: e.target.value })
                }
                placeholder="endpoint=https://...;accesskey=..."
                data-ocid="calling.settings_acs_connection_string"
              />
            </div>
          </div>

          {saved && (
            <div
              className="px-4 py-3 rounded-xl text-sm bg-green-50 text-green-700 border border-green-200"
              data-ocid="calling.settings_save_success"
            >
              ✓ Settings saved successfully.
            </div>
          )}

          <Button
            onClick={saveSettings}
            data-ocid="calling.settings_save_button"
          >
            Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* Bluetooth Bridge Info Card */}
      <Card className="border border-border bg-muted/20">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bluetooth className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1.5">
                Bluetooth Call Bridge Setup
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Microsoft Teams automatically rings all your signed-in devices
                (PC and mobile) simultaneously. When your mobile is paired via
                Bluetooth to your PC, you can answer a call on your PC and it
                will transfer audio through the Bluetooth connection. No
                additional software required.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setup Guide */}
      <div className="border border-border rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowGuide((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-sm font-semibold"
          data-ocid="calling.settings_guide_toggle"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Setup Guide — Step-by-step Microsoft Phone System
          </span>
          {showGuide ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        {showGuide && (
          <div className="p-4">
            <ol className="list-decimal list-inside space-y-3 text-sm text-foreground">
              {steps.map((step, i) => (
                <li key={step} className="leading-relaxed">
                  <span className="font-medium text-primary mr-1">
                    Step {i + 1}:
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Dashboard icon (inline SVG) ───────────────────────────────

function LayoutDashboard({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

// ── Main Calling Page ─────────────────────────────────────────

type CallingTab = "dashboard" | "click-to-call" | "call-logs" | "settings";

const TABS: {
  id: CallingTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "click-to-call", label: "Click-to-Call", icon: PhoneCall },
  { id: "call-logs", label: "Call Logs", icon: Clock },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function Calling() {
  const { getData, saveData, deleteData } = useApp();
  const [activeTab, setActiveTab] = useState<CallingTab>("dashboard");

  const rawCalls = getData("calls") as Call[];
  const calls = rawCalls;

  const handleCallMade = async (call: Call) => {
    await saveData("calls", call as unknown as Record<string, unknown>);
  };

  const handleDeleteCall = async (id: string) => {
    await deleteData("calls", id);
  };

  const handleAddCall = async (call: Call) => {
    await saveData("calls", call as unknown as Record<string, unknown>);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-card border-b px-4 lg:px-6 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Phone className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-display font-semibold text-foreground">
            Calling · Microsoft Phone System
          </h1>
          <p className="text-xs text-muted-foreground">
            Click-to-Call via Teams, Call Logs, Bluetooth Bridge
          </p>
        </div>
        <div className="ml-auto">
          <a
            href="https://teams.microsoft.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary underline hover:no-underline"
          >
            Open Teams ↗
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-card border-b px-4 lg:px-6 flex gap-1 overflow-x-auto scrollbar-thin">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
              data-ocid={`calling.tab.${tab.id}`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-background p-4 lg:p-6">
        {activeTab === "dashboard" && <DashboardTab calls={calls} />}
        {activeTab === "click-to-call" && (
          <ClickToCallTab
            onCallMade={(c) => {
              void handleCallMade(c);
            }}
          />
        )}
        {activeTab === "call-logs" && (
          <CallLogsTab
            calls={calls}
            onDelete={(id) => {
              void handleDeleteCall(id);
            }}
            onAdd={(c) => {
              void handleAddCall(c);
            }}
          />
        )}
        {activeTab === "settings" && <MsSettingsTab />}
      </div>
    </div>
  );
}
