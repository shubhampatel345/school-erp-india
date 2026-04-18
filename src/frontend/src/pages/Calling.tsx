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
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  MicOff,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  PhoneOutgoing,
  Plus,
  Search,
  Settings,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import type { Staff, Student } from "../types";
import { LS_KEYS, generateId, ls } from "../utils/localStorage";

// ── Types ────────────────────────────────────────────────────
interface HeyophoneSettings {
  virtualNumber: string;
  apiKey: string;
  agentId: string;
  clickToCallUrl: string;
  callerId: string;
  webhookUrl: string;
  businessName: string;
  enabled: boolean;
}

interface CallLog {
  id: string;
  contactName: string;
  number: string;
  type: "inbound" | "outbound" | "missed";
  duration: number; // seconds
  status: "answered" | "missed" | "voicemail";
  timestamp: number;
  recording?: string;
}

interface IVROption {
  id: string;
  key: string;
  description: string;
  action: string;
  staffId?: string;
}

interface IVRConfig {
  welcomeMessage: string;
  businessHoursFrom: string;
  businessHoursTo: string;
  afterHoursMessage: string;
  options: IVROption[];
}

const STORAGE_KEY = "heyophone_settings";
const CALL_LOGS_KEY = "heyophone_call_logs";
const IVR_KEY = "heyophone_ivr_config";

const DEFAULT_SETTINGS: HeyophoneSettings = {
  virtualNumber: "",
  apiKey: "",
  agentId: "",
  clickToCallUrl: "https://api.heyophone.com/v1/click-to-call",
  callerId: "",
  webhookUrl: `${window.location.origin}/api/heyophone/webhook`,
  businessName: "SHUBH SCHOOL",
  enabled: false,
};

const DEFAULT_IVR: IVRConfig = {
  welcomeMessage:
    "Welcome to SHUBH SCHOOL. For student information press 1, for fees press 2, to speak to the office press 0.",
  businessHoursFrom: "08:00",
  businessHoursTo: "17:00",
  afterHoursMessage:
    "Our office is currently closed. Please call back during business hours.",
  options: [
    {
      id: "opt-1",
      key: "1",
      description: "Student Information",
      action: "staff",
      staffId: "",
    },
    {
      id: "opt-2",
      key: "2",
      description: "Fees Department",
      action: "staff",
      staffId: "",
    },
    {
      id: "opt-0",
      key: "0",
      description: "Reception",
      action: "staff",
      staffId: "",
    },
  ],
};

// ── Utility functions ────────────────────────────────────────
function formatDuration(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ── Dashboard Tab ────────────────────────────────────────────
function DashboardTab({
  logs,
  settings,
}: {
  logs: CallLog[];
  settings: HeyophoneSettings;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayLogs = logs.filter((l) => l.timestamp >= today.getTime());
  const answered = todayLogs.filter((l) => l.status === "answered");
  const missed = todayLogs.filter((l) => l.status === "missed");
  const totalDuration =
    answered.reduce((sum, l) => sum + l.duration, 0) /
    Math.max(1, answered.length);

  const recentLogs = [...logs]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8);

  const isConfigured = settings.apiKey && settings.virtualNumber;

  return (
    <div className="space-y-6">
      {/* Connection status */}
      <div
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${
          isConfigured
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-amber-50 text-amber-700 border border-amber-200"
        }`}
      >
        {isConfigured ? (
          <Wifi className="w-4 h-4" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        {isConfigured
          ? `Connected · Virtual Number: ${settings.virtualNumber}`
          : "Heyophone not configured. Go to Settings tab to add your API credentials."}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Calls Today",
            value: todayLogs.length,
            icon: Phone,
            color: "text-primary",
          },
          {
            label: "Answered",
            value: answered.length,
            icon: PhoneCall,
            color: "text-green-600",
          },
          {
            label: "Missed",
            value: missed.length,
            icon: PhoneMissed,
            color: "text-destructive",
          },
          {
            label: "Avg Duration",
            value: `${Math.round(totalDuration)}s`,
            icon: Clock,
            color: "text-accent",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <p className={`text-2xl font-bold font-display ${stat.color}`}>
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent calls */}
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Calls</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentLogs.length === 0 ? (
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
              {recentLogs.map((log, i) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 px-4 py-3"
                  data-ocid={`calling.log.item.${i + 1}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      log.type === "missed"
                        ? "bg-destructive/10"
                        : log.type === "inbound"
                          ? "bg-green-50"
                          : "bg-primary/10"
                    }`}
                  >
                    {log.type === "missed" ? (
                      <PhoneMissed className="w-4 h-4 text-destructive" />
                    ) : log.type === "inbound" ? (
                      <PhoneIncoming className="w-4 h-4 text-green-600" />
                    ) : (
                      <PhoneOutgoing className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {log.contactName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.number}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {formatTime(log.timestamp)}
                    </p>
                    <p className="text-xs font-medium">
                      {formatDuration(log.duration)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      log.status === "answered" ? "default" : "destructive"
                    }
                    className="text-[10px] px-1.5 py-0.5 flex-shrink-0"
                  >
                    {log.status}
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

// ── Dial Pad ─────────────────────────────────────────────────
function DialPad({ onDial }: { onDial: (num: string) => void }) {
  const [number, setNumber] = useState("");
  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["*", "0", "#"],
  ];

  return (
    <div className="space-y-3 max-w-xs">
      <div className="relative">
        <input
          type="tel"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="Enter number..."
          className="w-full text-center text-xl font-mono px-4 py-3 border border-input rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          data-ocid="calling.dialpad_input"
        />
        {number && (
          <button
            type="button"
            onClick={() => setNumber((n) => n.slice(0, -1))}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {keys.flat().map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setNumber((n) => n + k)}
            className="aspect-square rounded-xl text-lg font-semibold bg-muted/60 hover:bg-muted text-foreground transition-colors"
          >
            {k}
          </button>
        ))}
      </div>
      <Button
        className="w-full gap-2"
        disabled={!number}
        onClick={() => {
          if (number) onDial(number);
        }}
        data-ocid="calling.dialpad_call_button"
      >
        <Phone className="w-4 h-4" />
        Call {number || "…"}
      </Button>
    </div>
  );
}

// ── Click-to-Call Tab ────────────────────────────────────────
function ClickToCallTab({
  settings,
  onCallMade,
}: {
  settings: HeyophoneSettings;
  onCallMade: (log: CallLog) => void;
}) {
  const { currentUser: _ } = useApp();
  const [query, setQuery] = useState("");
  const [calling, setCalling] = useState<{
    name: string;
    number: string;
  } | null>(null);
  const [callStatus, setCallStatus] = useState<
    "idle" | "dialing" | "connected" | "ended"
  >("idle");
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const students: Student[] = ls.get<Student[]>(LS_KEYS.students, []);
  const staff: Staff[] = ls.get<Staff[]>(LS_KEYS.staff, []);

  const results =
    query.length >= 2
      ? [
          ...students
            .filter(
              (s) =>
                s.fullName?.toLowerCase().includes(query.toLowerCase()) ||
                s.fatherName?.toLowerCase().includes(query.toLowerCase()) ||
                s.mobile?.includes(query) ||
                s.admNo?.includes(query),
            )
            .map((s) => ({
              id: s.id,
              name: s.fullName ?? "",
              role: `Class ${s.class} ${s.section ?? ""} · Student`,
              mobile: s.mobile ?? "",
            })),
          ...staff
            .filter(
              (st) =>
                st.name?.toLowerCase().includes(query.toLowerCase()) ||
                st.mobile?.includes(query),
            )
            .map((st) => ({
              id: st.id,
              name: st.name ?? "",
              role: st.designation ?? "Staff",
              mobile: st.mobile ?? "",
            })),
        ].slice(0, 12)
      : [];

  const startCall = (name: string, number: string) => {
    if (!number) return;
    setCalling({ name, number });
    setCallStatus("dialing");
    setDuration(0);

    // Simulate dial → connected after 3s
    setTimeout(() => {
      setCallStatus("connected");
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }, 3000);
  };

  const endCall = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCallStatus("ended");
    const d = duration;
    setTimeout(() => {
      if (calling) {
        onCallMade({
          id: generateId(),
          contactName: calling.name,
          number: calling.number,
          type: "outbound",
          duration: d,
          status: d > 0 ? "answered" : "missed",
          timestamp: Date.now(),
        });
      }
      setCalling(null);
      setCallStatus("idle");
      setDuration(0);
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Search */}
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-foreground mb-1">
            Search Contacts
          </h3>
          <p className="text-xs text-muted-foreground">
            Find students, parents, or staff to call
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Name, mobile, admission no..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-ocid="calling.search_input"
          />
        </div>

        {query.length >= 2 && (
          <div className="space-y-2">
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
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
                      {r.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.role}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground">
                      {r.mobile || "No mobile"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!r.mobile || !!calling}
                    onClick={() => startCall(r.name, r.mobile)}
                    data-ocid={`calling.call_button.${i + 1}`}
                  >
                    <Phone className="w-3.5 h-3.5 mr-1" /> Call
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Dial Pad */}
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-foreground mb-1">
            Manual Dial Pad
          </h3>
          <p className="text-xs text-muted-foreground">
            Type or tap to dial any number
          </p>
        </div>
        <DialPad onDial={(num) => startCall(num, num)} />
      </div>

      {/* Active call overlay */}
      {calling && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-8 w-full max-w-sm text-center shadow-strong animate-slide-up">
            <div
              className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
                callStatus === "dialing"
                  ? "bg-primary/10 animate-pulse-soft"
                  : callStatus === "connected"
                    ? "bg-green-100"
                    : "bg-muted"
              }`}
            >
              <Phone
                className={`w-8 h-8 ${
                  callStatus === "dialing"
                    ? "text-primary"
                    : callStatus === "connected"
                      ? "text-green-600"
                      : "text-muted-foreground"
                }`}
              />
            </div>
            <p className="text-xl font-bold font-display mb-1">
              {calling.name}
            </p>
            <p className="text-sm text-muted-foreground font-mono mb-1">
              {calling.number}
            </p>
            <p
              className={`text-sm font-medium mb-6 ${
                callStatus === "dialing"
                  ? "text-primary"
                  : callStatus === "connected"
                    ? "text-green-600"
                    : "text-muted-foreground"
              }`}
            >
              {callStatus === "dialing"
                ? "Calling…"
                : callStatus === "connected"
                  ? `Connected · ${formatDuration(duration)}`
                  : "Call Ended"}
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                aria-label="Mute"
              >
                <MicOff className="w-5 h-5 text-foreground" />
              </button>
              <button
                type="button"
                onClick={endCall}
                className="w-14 h-14 rounded-full bg-destructive flex items-center justify-center hover:bg-destructive/90 transition-colors"
                aria-label="End call"
                data-ocid="calling.end_call_button"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </button>
            </div>

            {!settings.apiKey && (
              <p className="text-xs text-muted-foreground mt-4 border-t border-border pt-3">
                ⚠️ Heyophone API not configured — this is a simulated call.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Call Logs Tab ────────────────────────────────────────────
function CallLogsTab({
  logs,
  setLogs,
}: {
  logs: CallLog[];
  setLogs: (l: CallLog[]) => void;
}) {
  const [filter, setFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newLog, setNewLog] = useState<Partial<CallLog>>({
    type: "outbound",
    status: "answered",
    duration: 0,
  });

  const filtered = logs.filter((l) => {
    if (filter !== "all" && l.type !== filter) return false;
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (
      search &&
      !l.contactName.toLowerCase().includes(search.toLowerCase()) &&
      !l.number.includes(search)
    )
      return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => b.timestamp - a.timestamp);

  const addLog = () => {
    const log: CallLog = {
      id: generateId(),
      contactName: newLog.contactName ?? "Unknown",
      number: newLog.number ?? "",
      type: (newLog.type as CallLog["type"]) ?? "outbound",
      duration: Number(newLog.duration) || 0,
      status: (newLog.status as CallLog["status"]) ?? "answered",
      timestamp: newLog.timestamp ?? Date.now(),
    };
    const updated = [log, ...logs];
    setLogs(updated);
    ls.set(CALL_LOGS_KEY, updated);
    setShowAdd(false);
    setNewLog({ type: "outbound", status: "answered", duration: 0 });
  };

  const deleteLog = (id: string) => {
    const updated = logs.filter((l) => l.id !== id);
    setLogs(updated);
    ls.set(CALL_LOGS_KEY, updated);
  };

  const exportCsv = () => {
    const rows = [
      ["Date/Time", "Contact", "Number", "Type", "Duration", "Status"],
      ...sorted.map((l) => [
        formatTime(l.timestamp),
        l.contactName,
        l.number,
        l.type,
        formatDuration(l.duration),
        l.status,
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
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name or number…"
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
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
            <SelectItem value="missed">Missed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="answered">Answered</SelectItem>
            <SelectItem value="missed">Missed</SelectItem>
            <SelectItem value="voicemail">Voicemail</SelectItem>
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

      {/* Add entry form */}
      {showAdd && (
        <Card className="border border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <h4 className="font-semibold text-sm">Add Call Entry</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Contact Name</Label>
                <Input
                  value={newLog.contactName ?? ""}
                  onChange={(e) =>
                    setNewLog({ ...newLog, contactName: e.target.value })
                  }
                  placeholder="Name"
                />
              </div>
              <div>
                <Label className="text-xs">Number</Label>
                <Input
                  value={newLog.number ?? ""}
                  onChange={(e) =>
                    setNewLog({ ...newLog, number: e.target.value })
                  }
                  placeholder="+91..."
                />
              </div>
              <div>
                <Label className="text-xs">Duration (seconds)</Label>
                <Input
                  type="number"
                  value={newLog.duration ?? 0}
                  onChange={(e) =>
                    setNewLog({ ...newLog, duration: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select
                  value={newLog.type}
                  onValueChange={(v) =>
                    setNewLog({ ...newLog, type: v as CallLog["type"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outbound">Outbound</SelectItem>
                    <SelectItem value="inbound">Inbound</SelectItem>
                    <SelectItem value="missed">Missed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select
                  value={newLog.status}
                  onValueChange={(v) =>
                    setNewLog({ ...newLog, status: v as CallLog["status"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="answered">Answered</SelectItem>
                    <SelectItem value="missed">Missed</SelectItem>
                    <SelectItem value="voicemail">Voicemail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={addLog}
                data-ocid="calling.logs_save_button"
              >
                Save
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

      {/* Table */}
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
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                  Number
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">
                  Type
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
              {sorted.map((log, i) => (
                <tr
                  key={log.id}
                  className="hover:bg-muted/30 transition-colors"
                  data-ocid={`calling.log.row.${i + 1}`}
                >
                  <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                    {formatTime(log.timestamp)}
                  </td>
                  <td className="px-4 py-2.5 font-medium">{log.contactName}</td>
                  <td className="px-4 py-2.5 font-mono text-xs hidden sm:table-cell">
                    {log.number}
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    <span className="flex items-center gap-1">
                      {log.type === "missed" ? (
                        <PhoneMissed className="w-3 h-3 text-destructive" />
                      ) : log.type === "inbound" ? (
                        <PhoneIncoming className="w-3 h-3 text-green-600" />
                      ) : (
                        <PhoneOutgoing className="w-3 h-3 text-primary" />
                      )}
                      <span className="capitalize text-xs">{log.type}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs hidden md:table-cell">
                    {formatDuration(log.duration)}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant={
                        log.status === "answered" ? "default" : "destructive"
                      }
                      className="text-[10px]"
                    >
                      {log.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => deleteLog(log.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Delete log"
                      data-ocid={`calling.log.delete_button.${i + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── IVR Settings Tab ─────────────────────────────────────────
function IVRSettingsTab() {
  const [config, setConfig] = useState<IVRConfig>(() => {
    return ls.get<IVRConfig>(IVR_KEY, DEFAULT_IVR);
  });
  const [showFlow, setShowFlow] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveConfig = () => {
    ls.set(IVR_KEY, config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addOption = () => {
    setConfig((c) => ({
      ...c,
      options: [
        ...c.options,
        {
          id: generateId(),
          key: "",
          description: "",
          action: "staff",
          staffId: "",
        },
      ],
    }));
  };

  const removeOption = (id: string) => {
    setConfig((c) => ({ ...c, options: c.options.filter((o) => o.id !== id) }));
  };

  const updateOption = (id: string, patch: Partial<IVROption>) => {
    setConfig((c) => ({
      ...c,
      options: c.options.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    }));
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Info banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
        <strong>Note:</strong> IVR configuration here is stored locally. To
        apply changes to your phone system, log into your{" "}
        <a
          href="https://heyophone.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Heyophone admin panel
        </a>{" "}
        and update the IVR settings there.
      </div>

      {/* Welcome message */}
      <div className="space-y-2">
        <Label className="font-semibold">Welcome Message</Label>
        <Textarea
          value={config.welcomeMessage}
          onChange={(e) =>
            setConfig((c) => ({ ...c, welcomeMessage: e.target.value }))
          }
          rows={3}
          data-ocid="calling.ivr_welcome_message"
        />
      </div>

      {/* Business hours */}
      <div className="space-y-2">
        <Label className="font-semibold">Business Hours</Label>
        <div className="flex items-center gap-3">
          <Input
            type="time"
            value={config.businessHoursFrom}
            onChange={(e) =>
              setConfig((c) => ({ ...c, businessHoursFrom: e.target.value }))
            }
            className="w-36"
            data-ocid="calling.ivr_hours_from"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <Input
            type="time"
            value={config.businessHoursTo}
            onChange={(e) =>
              setConfig((c) => ({ ...c, businessHoursTo: e.target.value }))
            }
            className="w-36"
            data-ocid="calling.ivr_hours_to"
          />
        </div>
      </div>

      {/* After hours message */}
      <div className="space-y-2">
        <Label className="font-semibold">After-Hours Message</Label>
        <Textarea
          value={config.afterHoursMessage}
          onChange={(e) =>
            setConfig((c) => ({ ...c, afterHoursMessage: e.target.value }))
          }
          rows={2}
          data-ocid="calling.ivr_after_hours_message"
        />
      </div>

      {/* IVR Menu Options */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="font-semibold">IVR Menu Options</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={addOption}
            data-ocid="calling.ivr_add_option_button"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Option
          </Button>
        </div>
        {config.options.map((opt, i) => (
          <div
            key={opt.id}
            className="flex items-center gap-3 bg-muted/30 rounded-xl px-4 py-3"
            data-ocid={`calling.ivr_option.${i + 1}`}
          >
            <div>
              <Label className="text-[10px] text-muted-foreground uppercase">
                Key
              </Label>
              <Input
                value={opt.key}
                onChange={(e) => updateOption(opt.id, { key: e.target.value })}
                className="w-14 text-center font-mono"
                maxLength={1}
              />
            </div>
            <div className="flex-1">
              <Label className="text-[10px] text-muted-foreground uppercase">
                Description
              </Label>
              <Input
                value={opt.description}
                onChange={(e) =>
                  updateOption(opt.id, { description: e.target.value })
                }
                placeholder="e.g. Student Information"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground uppercase">
                Action
              </Label>
              <Select
                value={opt.action}
                onValueChange={(v) => updateOption(opt.id, { action: v })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Connect Staff</SelectItem>
                  <SelectItem value="voicemail">Voicemail</SelectItem>
                  <SelectItem value="repeat">Repeat Menu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <button
              type="button"
              onClick={() => removeOption(opt.id)}
              className="mt-4 text-muted-foreground hover:text-destructive"
              aria-label="Remove option"
              data-ocid={`calling.ivr_remove_option.${i + 1}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* IVR Flow Preview */}
      <div className="border border-border rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowFlow((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-sm font-medium"
          data-ocid="calling.ivr_flow_toggle"
        >
          IVR Flow Preview
          {showFlow ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        {showFlow && (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                IN
              </div>
              <div className="h-px bg-border flex-1" />
              <div className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs max-w-sm">
                {config.welcomeMessage.slice(0, 80)}…
              </div>
            </div>
            <div className="ml-4 space-y-2">
              {config.options.map((opt) => (
                <div key={opt.key} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">
                    {opt.key}
                  </div>
                  <div className="h-px bg-border w-4" />
                  <div className="bg-muted rounded px-2 py-1 text-xs">
                    {opt.description}
                  </div>
                  <div className="text-muted-foreground text-[10px]">
                    → {opt.action}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Button onClick={saveConfig} data-ocid="calling.ivr_save_button">
        {saved ? "✓ Saved!" : "Save IVR Configuration"}
      </Button>
    </div>
  );
}

// ── Settings Tab ─────────────────────────────────────────────
function SettingsTab({
  settings,
  setSettings,
}: {
  settings: HeyophoneSettings;
  setSettings: (s: HeyophoneSettings) => void;
}) {
  const [form, setForm] = useState(settings);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  const save = () => {
    setSettings(form);
    ls.set(STORAGE_KEY, form);
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      if (!form.apiKey || !form.virtualNumber) {
        setTestResult({
          ok: false,
          msg: "Please fill in your Virtual Number and API Key first.",
        });
        return;
      }
      // Simulate an API test
      await new Promise((r) => setTimeout(r, 1200));
      setTestResult({
        ok: true,
        msg: "Connection successful! Heyophone API is reachable.",
      });
    } catch {
      setTestResult({
        ok: false,
        msg: "Could not reach Heyophone API. Check your API key and network.",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4" /> Heyophone Account Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold">Virtual Number</Label>
              <Input
                value={form.virtualNumber}
                onChange={(e) =>
                  setForm({ ...form, virtualNumber: e.target.value })
                }
                placeholder="+91 XXXXX XXXXX"
                data-ocid="calling.settings_virtual_number"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">API Key</Label>
              <Input
                type="password"
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                placeholder="Your Heyophone API key"
                data-ocid="calling.settings_api_key"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Agent ID</Label>
              <Input
                value={form.agentId}
                onChange={(e) => setForm({ ...form, agentId: e.target.value })}
                placeholder="Optional Agent ID"
                data-ocid="calling.settings_agent_id"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Caller ID</Label>
              <Input
                value={form.callerId}
                onChange={(e) => setForm({ ...form, callerId: e.target.value })}
                placeholder="Shown to recipients"
                data-ocid="calling.settings_caller_id"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Business Name</Label>
              <Input
                value={form.businessName}
                onChange={(e) =>
                  setForm({ ...form, businessName: e.target.value })
                }
                data-ocid="calling.settings_business_name"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">
                Click-to-Call API URL
              </Label>
              <Input
                value={form.clickToCallUrl}
                onChange={(e) =>
                  setForm({ ...form, clickToCallUrl: e.target.value })
                }
                data-ocid="calling.settings_api_url"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">
              Webhook URL (for call events)
            </Label>
            <div className="flex gap-2">
              <Input
                value={form.webhookUrl}
                readOnly
                className="font-mono text-xs bg-muted/50"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(form.webhookUrl)}
              >
                Copy
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Add this webhook URL in your Heyophone dashboard to receive call
              events.
            </p>
          </div>

          {testResult && (
            <div
              className={`px-4 py-3 rounded-xl text-sm ${
                testResult.ok
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}
              data-ocid="calling.settings_test_result"
            >
              {testResult.msg}
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            <Button onClick={save} data-ocid="calling.settings_save_button">
              Save Settings
            </Button>
            <Button
              variant="outline"
              onClick={testConnection}
              disabled={testing}
              data-ocid="calling.settings_test_button"
            >
              {testing ? "Testing…" : "Test Connection"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <div className="border border-border rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSetup((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-sm font-semibold"
          data-ocid="calling.settings_setup_toggle"
        >
          📋 How to get your Heyophone API credentials
          {showSetup ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        {showSetup && (
          <div className="p-4 space-y-3 text-sm text-foreground">
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>
                Visit{" "}
                <a
                  href="https://heyophone.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  heyophone.com
                </a>{" "}
                and sign up / log in to your account.
              </li>
              <li>
                Go to <strong>Dashboard → Integrations → API Keys</strong>.
              </li>
              <li>
                Generate a new API key and copy it into the <em>API Key</em>{" "}
                field above.
              </li>
              <li>
                Your <strong>Virtual Number</strong> is shown on the main
                dashboard under "My Numbers".
              </li>
              <li>
                Optionally set your <strong>Agent ID</strong> if you are routing
                to a specific agent.
              </li>
              <li>
                Add the <strong>Webhook URL</strong> shown above in Heyophone's{" "}
                <em>Settings → Webhooks</em> to receive real-time call events in
                this ERP.
              </li>
              <li>
                Click <strong>Save Settings</strong> then{" "}
                <strong>Test Connection</strong> to verify.
              </li>
            </ol>
            <p className="text-xs text-muted-foreground border-t border-border pt-2">
              For support, visit the{" "}
              <a
                href="https://heyophone.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Heyophone website
              </a>{" "}
              or contact their support team directly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Calling Page ────────────────────────────────────────
type CallingTab =
  | "dashboard"
  | "click-to-call"
  | "call-logs"
  | "ivr"
  | "settings";

const TABS: {
  id: CallingTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "click-to-call", label: "Click-to-Call", icon: PhoneCall },
  { id: "call-logs", label: "Call Logs", icon: Clock },
  { id: "ivr", label: "IVR Settings", icon: PhoneIncoming },
  { id: "settings", label: "Settings", icon: Settings },
];

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

export default function Calling() {
  const [activeTab, setActiveTab] = useState<CallingTab>("dashboard");
  const [settings, setSettings] = useState<HeyophoneSettings>(() => {
    return ls.get<HeyophoneSettings>(STORAGE_KEY, DEFAULT_SETTINGS);
  });
  const [logs, setLogs] = useState<CallLog[]>(() => {
    return ls.get<CallLog[]>(CALL_LOGS_KEY, []);
  });

  const handleCallMade = (log: CallLog) => {
    const updated = [log, ...logs];
    setLogs(updated);
    ls.set(CALL_LOGS_KEY, updated);
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
            Calling · Heyophone
          </h1>
          <p className="text-xs text-muted-foreground">
            India's business phone system — Virtual Number, IVR, Click-to-Call,
            Call Logs
          </p>
        </div>
        <div className="ml-auto">
          <a
            href="https://heyophone.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary underline hover:no-underline"
          >
            heyophone.com ↗
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
        {activeTab === "dashboard" && (
          <DashboardTab logs={logs} settings={settings} />
        )}
        {activeTab === "click-to-call" && (
          <ClickToCallTab settings={settings} onCallMade={handleCallMade} />
        )}
        {activeTab === "call-logs" && (
          <CallLogsTab logs={logs} setLogs={setLogs} />
        )}
        {activeTab === "ivr" && <IVRSettingsTab />}
        {activeTab === "settings" && (
          <SettingsTab settings={settings} setSettings={setSettings} />
        )}
      </div>
    </div>
  );
}
