import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useApp } from "../context/AppContext";
import { generateId } from "../utils/canisterService";
import { ls } from "../utils/localStorage";

// ── Types ────────────────────────────────────────────────────────────────────

interface Meeting {
  id: string;
  title: string;
  classSection: string;
  platform: "zoom" | "meet";
  date: string;
  time: string;
  duration: number;
  link: string;
  status: "upcoming" | "live" | "ended";
  hostName: string;
  participants?: number;
}

interface PlatformCreds {
  zoomApiKey: string;
  zoomApiSecret: string;
  googleClientId: string;
}

// ── Seed data ────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split("T")[0];
const TOMORROW = new Date(Date.now() + 86400000).toISOString().split("T")[0];

const SEED_MEETINGS: Meeting[] = [
  {
    id: "m1",
    title: "Maths — Algebra Revision",
    classSection: "Class 10-A",
    platform: "zoom",
    date: TOMORROW,
    time: "09:00",
    duration: 45,
    link: "https://zoom.us/j/12345678",
    status: "upcoming",
    hostName: "Mrs. Anjali Sharma",
    participants: 38,
  },
  {
    id: "m2",
    title: "Science — Biology Lab",
    classSection: "Class 9-B",
    platform: "meet",
    date: TOMORROW,
    time: "11:00",
    duration: 60,
    link: "https://meet.google.com/abc-defg-hij",
    status: "upcoming",
    hostName: "Mr. Ramesh Gupta",
    participants: 35,
  },
  {
    id: "m3",
    title: "English — Essay Writing",
    classSection: "Class 8-A",
    platform: "meet",
    date: TODAY,
    time: "10:00",
    duration: 45,
    link: "https://meet.google.com/xyz-uvwx-yz1",
    status: "live",
    hostName: "Mrs. Priya Singh",
    participants: 32,
  },
  {
    id: "m4",
    title: "Parent-Teacher Meeting",
    classSection: "All Classes",
    platform: "zoom",
    date: "2026-04-20",
    time: "15:00",
    duration: 90,
    link: "https://zoom.us/j/87654321",
    status: "ended",
    hostName: "Super Admin",
    participants: 120,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateMeetLink(platform: "zoom" | "meet") {
  if (platform === "meet") {
    const seg = () => Math.random().toString(36).slice(2, 5);
    return `https://meet.google.com/${seg()}-${seg()}-${seg()}`;
  }
  return `https://zoom.us/j/${Math.floor(Math.random() * 9e9 + 1e9)}`;
}

function platformBadge(platform: Meeting["platform"]) {
  return platform === "zoom" ? (
    <Badge className="bg-blue-600/15 text-blue-700 border-blue-500/30 text-xs">
      Zoom
    </Badge>
  ) : (
    <Badge className="bg-green-600/15 text-green-700 border-green-500/30 text-xs">
      Google Meet
    </Badge>
  );
}

function statusBadge(status: Meeting["status"]) {
  if (status === "live")
    return (
      <Badge className="bg-red-600 text-white text-xs animate-pulse">
        ● LIVE
      </Badge>
    );
  if (status === "ended")
    return (
      <Badge variant="outline" className="text-muted-foreground text-xs">
        Ended
      </Badge>
    );
  return (
    <Badge variant="secondary" className="text-xs">
      Upcoming
    </Badge>
  );
}

// ── Meeting Card ──────────────────────────────────────────────────────────────

function MeetingCard({
  meeting,
  idx,
  onNotify,
}: { meeting: Meeting; idx: number; onNotify: (m: Meeting) => void }) {
  const dateStr = (() => {
    try {
      return new Date(meeting.date).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
    } catch {
      return meeting.date;
    }
  })();

  return (
    <div
      data-ocid={`virtualclasses.meeting.item.${idx}`}
      className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-semibold text-foreground text-sm">
            {meeting.title}
          </span>
          {platformBadge(meeting.platform)}
          {statusBadge(meeting.status)}
        </div>
        <p className="text-xs text-muted-foreground">
          {meeting.classSection} · {meeting.hostName}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {dateStr} · {meeting.time} · {meeting.duration} min
          {meeting.participants
            ? ` · ${meeting.participants} participants`
            : ""}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        {meeting.status !== "ended" && (
          <>
            <Button
              size="sm"
              variant="outline"
              data-ocid={`virtualclasses.notify_button.${idx}`}
              onClick={() => onNotify(meeting)}
              className="h-8 text-xs"
            >
              Notify
            </Button>
            <Button
              size="sm"
              data-ocid={`virtualclasses.join_button.${idx}`}
              asChild
              className="h-8"
            >
              <a href={meeting.link} target="_blank" rel="noreferrer">
                Join
              </a>
            </Button>
          </>
        )}
        {meeting.status === "ended" && (
          <span className="text-xs text-muted-foreground">Completed</span>
        )}
      </div>
    </div>
  );
}

// ── Schedule Form ─────────────────────────────────────────────────────────────

function ScheduleForm({
  onSave,
  classes,
}: { onSave: (m: Meeting) => void; classes: string[] }) {
  const { currentUser } = useApp();
  const [form, setForm] = useState({
    title: "",
    classSection: "",
    platform: "meet" as "zoom" | "meet",
    date: TODAY,
    time: "09:00",
    duration: "45",
  });

  const update = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.title || !form.date) return;
    onSave({
      id: generateId(),
      title: form.title,
      classSection: form.classSection || "All Classes",
      platform: form.platform,
      date: form.date,
      time: form.time,
      duration: Number.parseInt(form.duration, 10) || 45,
      link: generateMeetLink(form.platform),
      status: "upcoming",
      hostName: currentUser?.fullName ?? "Teacher",
      participants: 0,
    });
    setForm({
      title: "",
      classSection: "",
      platform: "meet",
      date: TODAY,
      time: "09:00",
      duration: "45",
    });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4 max-w-lg">
      <h3 className="font-semibold text-foreground font-display">
        Schedule Meeting
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label className="text-xs text-muted-foreground mb-1 block">
            Meeting Title
          </Label>
          <Input
            data-ocid="virtualclasses.title_input"
            placeholder="e.g. Maths — Chapter 5 Revision"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Class / Section
          </Label>
          <select
            data-ocid="virtualclasses.class_select"
            value={form.classSection}
            onChange={(e) => update("classSection", e.target.value)}
            className="w-full h-9 rounded border border-input bg-background px-3 text-sm"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Platform
          </Label>
          <select
            data-ocid="virtualclasses.platform_select"
            value={form.platform}
            onChange={(e) => update("platform", e.target.value)}
            className="w-full h-9 rounded border border-input bg-background px-3 text-sm"
          >
            <option value="meet">Google Meet</option>
            <option value="zoom">Zoom</option>
          </select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Date
          </Label>
          <Input
            data-ocid="virtualclasses.date_input"
            type="date"
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Time
          </Label>
          <Input
            data-ocid="virtualclasses.time_input"
            type="time"
            value={form.time}
            onChange={(e) => update("time", e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs text-muted-foreground mb-1 block">
            Duration (minutes)
          </Label>
          <Input
            data-ocid="virtualclasses.duration_input"
            inputMode="numeric"
            value={form.duration}
            onChange={(e) => update("duration", e.target.value)}
            placeholder="45"
          />
        </div>
      </div>
      <Button
        data-ocid="virtualclasses.schedule_submit_button"
        onClick={save}
        className="w-full"
        disabled={!form.title}
      >
        Schedule Meeting
      </Button>
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────

function SettingsTab() {
  const [creds, setCreds] = useState<PlatformCreds>(() =>
    ls.get("vc_creds", {
      zoomApiKey: "",
      zoomApiSecret: "",
      googleClientId: "",
    }),
  );
  const [saved, setSaved] = useState(false);

  const save = () => {
    ls.set("vc_creds", creds);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4 max-w-lg">
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-foreground font-display">
          Zoom Credentials
        </h3>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Zoom API Key
          </Label>
          <Input
            data-ocid="virtualclasses.zoom_apikey_input"
            placeholder="Zoom API Key"
            value={creds.zoomApiKey}
            onChange={(e) =>
              setCreds((c) => ({ ...c, zoomApiKey: e.target.value }))
            }
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Zoom API Secret
          </Label>
          <Input
            data-ocid="virtualclasses.zoom_secret_input"
            type="password"
            placeholder="Zoom API Secret"
            value={creds.zoomApiSecret}
            onChange={(e) =>
              setCreds((c) => ({ ...c, zoomApiSecret: e.target.value }))
            }
          />
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-foreground font-display">
          Google Meet OAuth
        </h3>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Google Client ID
          </Label>
          <Input
            data-ocid="virtualclasses.google_clientid_input"
            placeholder="Google OAuth Client ID"
            value={creds.googleClientId}
            onChange={(e) =>
              setCreds((c) => ({ ...c, googleClientId: e.target.value }))
            }
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Create credentials at console.cloud.google.com → APIs & Services.
          Enable Google Calendar API.
        </p>
      </div>
      <Button
        data-ocid="virtualclasses.settings_save_button"
        onClick={save}
        className="w-full"
      >
        {saved ? "✓ Saved" : "Save Settings"}
      </Button>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function VirtualClasses() {
  const { getData, addNotification } = useApp();
  const [meetings, setMeetings] = useState<Meeting[]>(() =>
    ls.get("vc_meetings", SEED_MEETINGS),
  );
  const [quickLink, setQuickLink] = useState<string | null>(null);
  const [notifyTarget, setNotifyTarget] = useState<Meeting | null>(null);

  const classes = (
    getData("classes") as Array<{ className: string; sections: string[] }>
  ).flatMap((c) => (c.sections ?? []).map((s) => `${c.className}-${s}`));

  const addMeeting = (m: Meeting) => {
    const next = [m, ...meetings];
    setMeetings(next);
    ls.set("vc_meetings", next);
    addNotification(
      `Meeting "${m.title}" scheduled for ${m.date} at ${m.time}`,
      "success",
    );
  };

  const createQuickMeet = () => {
    const link = generateMeetLink("meet");
    setQuickLink(link);
    navigator.clipboard.writeText(link).catch(() => {});
  };

  const sendNotification = (m: Meeting) => {
    addNotification(`Meeting link sent to participants: "${m.title}"`, "info");
    setNotifyTarget(null);
  };

  const upcoming = meetings.filter((m) => m.status !== "ended");
  const past = meetings.filter((m) => m.status === "ended");

  return (
    <div className="p-4 md:p-6 space-y-5" data-ocid="virtualclasses.page">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">
            Virtual Classes
          </h1>
          <p className="text-muted-foreground text-sm">
            Zoom & Google Meet — schedule, manage, and notify
          </p>
        </div>
        <Button
          data-ocid="virtualclasses.quick_meet_button"
          onClick={createQuickMeet}
          variant="outline"
        >
          ⚡ Quick Meet
        </Button>
      </div>

      {/* Quick link banner */}
      {quickLink && (
        <div
          className="bg-green-600/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3"
          data-ocid="virtualclasses.quick_link_card"
        >
          <span className="text-green-700 text-sm flex-1 font-mono break-all">
            {quickLink}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigator.clipboard.writeText(quickLink)}
          >
            Copy
          </Button>
          <Button size="sm" asChild>
            <a href={quickLink} target="_blank" rel="noreferrer">
              Open
            </a>
          </Button>
          <button
            type="button"
            onClick={() => setQuickLink(null)}
            className="text-muted-foreground hover:text-foreground ml-1 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="upcoming">
        <TabsList className="mb-4">
          <TabsTrigger value="upcoming" data-ocid="virtualclasses.upcoming_tab">
            Upcoming ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="schedule" data-ocid="virtualclasses.schedule_tab">
            Schedule New
          </TabsTrigger>
          <TabsTrigger value="past" data-ocid="virtualclasses.past_tab">
            Past ({past.length})
          </TabsTrigger>
          <TabsTrigger value="settings" data-ocid="virtualclasses.settings_tab">
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          <div className="space-y-3">
            {upcoming.length === 0 ? (
              <div
                data-ocid="virtualclasses.upcoming_empty_state"
                className="text-center py-12 text-muted-foreground"
              >
                <p className="text-3xl mb-3">📹</p>
                <p className="text-sm">No upcoming meetings. Schedule one!</p>
              </div>
            ) : (
              upcoming.map((m, i) => (
                <MeetingCard
                  key={m.id}
                  meeting={m}
                  idx={i + 1}
                  onNotify={(mt) => setNotifyTarget(mt)}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="schedule">
          <ScheduleForm onSave={addMeeting} classes={classes} />
        </TabsContent>

        <TabsContent value="past">
          <div className="space-y-3">
            {past.length === 0 ? (
              <div
                data-ocid="virtualclasses.past_empty_state"
                className="text-center py-12 text-muted-foreground text-sm"
              >
                No past meetings yet.
              </div>
            ) : (
              past.map((m, i) => (
                <MeetingCard
                  key={m.id}
                  meeting={m}
                  idx={i + 1}
                  onNotify={() => {}}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>

      {/* Notify Dialog */}
      <Dialog open={!!notifyTarget} onOpenChange={() => setNotifyTarget(null)}>
        <DialogContent data-ocid="virtualclasses.notify_dialog">
          <DialogHeader>
            <DialogTitle>Send Meeting Link</DialogTitle>
          </DialogHeader>
          {notifyTarget && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Send the meeting link for <strong>{notifyTarget.title}</strong>{" "}
                to participants.
              </p>
              <div className="bg-muted/30 rounded-lg p-3 font-mono text-xs break-all">
                {notifyTarget.link}
              </div>
              <div className="flex gap-2">
                <Button
                  data-ocid="virtualclasses.notify_confirm_button"
                  onClick={() => sendNotification(notifyTarget)}
                  className="flex-1"
                >
                  Send via WhatsApp
                </Button>
                <Button
                  variant="outline"
                  data-ocid="virtualclasses.notify_cancel_button"
                  onClick={() => setNotifyTarget(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
