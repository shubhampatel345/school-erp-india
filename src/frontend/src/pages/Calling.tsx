import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useApp } from "../context/AppContext";
import type { Call, Staff, Student } from "../types";
import { generateId } from "../utils/canisterService";
import { ls } from "../utils/localStorage";

// ── Seed data ────────────────────────────────────────────────────────────────

const SEED_CALLS: Call[] = [
  {
    id: "c1",
    from: "Super Admin",
    to: "Anjali Sharma",
    duration: 183,
    timestamp: "2026-04-22T10:30:00Z",
    status: "completed",
    direction: "outbound",
  },
  {
    id: "c2",
    from: "Ramesh Gupta",
    to: "Super Admin",
    duration: 0,
    timestamp: "2026-04-22T09:15:00Z",
    status: "missed",
    direction: "inbound",
  },
  {
    id: "c3",
    from: "Super Admin",
    to: "Parent: Suresh Kumar",
    duration: 67,
    timestamp: "2026-04-21T16:00:00Z",
    status: "completed",
    direction: "outbound",
  },
  {
    id: "c4",
    from: "Super Admin",
    to: "Driver Ramesh",
    duration: 48,
    timestamp: "2026-04-21T08:20:00Z",
    status: "completed",
    direction: "outbound",
  },
];

const BLUETOOTH_STEPS = [
  "Install Microsoft Teams on both PC and mobile phone",
  "On PC: Settings → Bluetooth & devices → Add device → pair your phone",
  "On mobile: Settings → Bluetooth → pair your PC",
  "In Teams mobile: Settings → Calls → Route calls via Bluetooth",
  "On PC: Teams → Settings → Devices → set Bluetooth headset as audio device",
  "Test with a call — your phone rings and audio routes through PC Bluetooth speakers",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(sec: number) {
  if (sec === 0) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function teamsCallUrl(name: string, phone?: string) {
  if (phone)
    return `https://teams.microsoft.com/l/call/0/0?users=4:${phone.replace(/\D/g, "")}`;
  return `https://teams.microsoft.com/l/call/0/0?users=${encodeURIComponent(name)}`;
}

function StatusBadge({ status }: { status: Call["status"] }) {
  if (status === "completed")
    return (
      <Badge className="bg-green-600/15 text-green-700 border-green-600/30 text-xs">
        Completed
      </Badge>
    );
  if (status === "missed")
    return (
      <Badge className="bg-red-600/15 text-red-700 border-red-600/30 text-xs">
        Missed
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-xs">
      Rejected
    </Badge>
  );
}

// ── Click-to-Call Tab ─────────────────────────────────────────────────────────

type ContactEntry = { id: string; name: string; phone?: string; role: string };

function ClickToCallTab() {
  const { getData, addNotification } = useApp();
  const [query, setQuery] = useState("");
  const [calls, setCalls] = useState<Call[]>(() =>
    ls.get("call_history", SEED_CALLS),
  );

  const staff = getData("staff") as Staff[];
  const students = getData("students") as Student[];

  const contacts: ContactEntry[] = [
    ...staff.map((s) => ({
      id: s.id,
      name: s.name,
      phone: s.mobile,
      role: s.designation ?? "Staff",
    })),
    ...students.map((s) => ({
      id: s.id,
      name: s.fullName,
      phone: s.guardianMobile ?? s.fatherMobile ?? s.mobile,
      role: "Parent",
    })),
  ];

  // Demo fallback when no data loaded
  const DEMO_CONTACTS: ContactEntry[] = [
    {
      id: "d1",
      name: "Anjali Sharma",
      phone: "9876543210",
      role: "Teacher · Maths",
    },
    {
      id: "d2",
      name: "Ramesh Gupta",
      phone: "8765432109",
      role: "Teacher · Science",
    },
    {
      id: "d3",
      name: "Priya Patel (Parent)",
      phone: "7654321098",
      role: "Parent of Rohit Patel · Class 10",
    },
    {
      id: "d4",
      name: "Driver Suresh",
      phone: "6543210987",
      role: "Driver · Bus Route 3",
    },
  ];

  const allContacts = contacts.length > 0 ? contacts : DEMO_CONTACTS;

  const filtered =
    query.length >= 2
      ? allContacts.filter(
          (c) =>
            c.name.toLowerCase().includes(query.toLowerCase()) ||
            (c.role ?? "").toLowerCase().includes(query.toLowerCase()),
        )
      : allContacts.slice(0, 10);

  const makeCall = (c: ContactEntry) => {
    const url = teamsCallUrl(c.name, c.phone);
    window.open(url, "_blank");
    const newCall: Call = {
      id: generateId(),
      from: "Super Admin",
      to: c.name,
      duration: 0,
      timestamp: new Date().toISOString(),
      status: "completed",
      direction: "outbound",
    };
    const next = [newCall, ...calls];
    setCalls(next);
    ls.set("call_history", next);
    addNotification(`Calling ${c.name} via Microsoft Teams`, "info");
  };

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-xl p-4 max-w-lg">
        <h3 className="font-semibold text-foreground font-display mb-3">
          Click to Call
        </h3>
        <Input
          data-ocid="calling.search_input"
          placeholder="Search staff or student name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-3"
        />
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {filtered.map((c, i) => (
            <div
              key={c.id}
              data-ocid={`calling.contact.item.${i + 1}`}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {c.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {c.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {c.role} {c.phone ? `· ${c.phone}` : ""}
                </p>
              </div>
              <Button
                size="sm"
                data-ocid={`calling.call_button.${i + 1}`}
                onClick={() => makeCall(c)}
                className="h-8 gap-1 shrink-0"
              >
                📞 Call
              </Button>
            </div>
          ))}
          {filtered.length === 0 && (
            <p
              data-ocid="calling.empty_state"
              className="text-center py-4 text-muted-foreground text-xs"
            >
              No contacts found for "{query}"
            </p>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-foreground font-display mb-3">
          Recent Calls
        </h3>
        <div className="space-y-2">
          {calls.map((call, i) => (
            <div
              key={call.id}
              data-ocid={`calling.history.item.${i + 1}`}
              className="bg-card border border-border rounded-lg p-3 flex items-center gap-3"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${call.direction === "outbound" ? "bg-blue-500/15" : "bg-muted"}`}
              >
                {call.direction === "outbound" ? "↗" : "↙"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {call.direction === "outbound" ? call.to : call.from}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(call.timestamp).toLocaleDateString("en-IN")} ·{" "}
                  {formatDuration(call.duration)}
                </p>
              </div>
              <StatusBadge status={call.status} />
            </div>
          ))}
          {calls.length === 0 && (
            <div
              data-ocid="calling.history_empty_state"
              className="text-center py-8 text-muted-foreground text-sm"
            >
              No call history yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────

function CallingSettings() {
  const [tenantId, setTenantId] = useState(() => ls.get("teams_tenant_id", ""));
  const [acsEndpoint, setAcsEndpoint] = useState(() =>
    ls.get("acs_endpoint", ""),
  );
  const [saved, setSaved] = useState(false);

  const save = () => {
    ls.set("teams_tenant_id", tenantId);
    ls.set("acs_endpoint", acsEndpoint);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-5 max-w-lg">
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-foreground font-display">
          Microsoft Teams Setup
        </h3>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Teams Tenant ID
          </Label>
          <Input
            data-ocid="calling.tenant_id_input"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Azure ACS Endpoint
          </Label>
          <Input
            data-ocid="calling.acs_endpoint_input"
            placeholder="https://yourname.communication.azure.com"
            value={acsEndpoint}
            onChange={(e) => setAcsEndpoint(e.target.value)}
          />
        </div>
        <Button
          data-ocid="calling.settings_save_button"
          onClick={save}
          className="w-full"
        >
          {saved ? "✓ Saved" : "Save Settings"}
        </Button>
      </div>

      {/* Bluetooth Guide */}
      <div className="bg-muted/30 border border-border rounded-xl p-5 space-y-3">
        <h3 className="font-semibold text-foreground font-display">
          📱 Bluetooth Call Bridging Setup
        </h3>
        <p className="text-xs text-muted-foreground">
          To receive Teams calls on your mobile via your PC's Bluetooth:
        </p>
        <ol className="space-y-2">
          {BLUETOOTH_STEPS.map((step) => (
            <li
              key={step}
              className="flex items-start gap-2 text-xs text-muted-foreground"
            >
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                {BLUETOOTH_STEPS.indexOf(step) + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <div className="bg-muted/30 border border-border rounded-xl p-4">
        <p className="text-xs font-medium text-foreground mb-1">Requirements</p>
        <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
          <li>Microsoft 365 Business subscription with Teams Phone license</li>
          <li>Azure Communication Services (ACS) resource</li>
          <li>Bluetooth 4.0+ on both devices</li>
        </ul>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Calling() {
  return (
    <div className="p-4 md:p-6 space-y-4" data-ocid="calling.page">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-display">
          Calling
        </h1>
        <p className="text-muted-foreground text-sm">
          Microsoft Teams — click-to-call students, staff, and parents
        </p>
      </div>

      <Tabs defaultValue="call">
        <TabsList className="mb-4">
          <TabsTrigger value="call" data-ocid="calling.call_tab">
            Click to Call
          </TabsTrigger>
          <TabsTrigger value="settings" data-ocid="calling.settings_tab">
            Settings
          </TabsTrigger>
        </TabsList>
        <TabsContent value="call">
          <ClickToCallTab />
        </TabsContent>
        <TabsContent value="settings">
          <CallingSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
