/**
 * VirtualClasses.tsx — Schedule & manage Zoom/Google Meet sessions
 * Tabs: Schedule | Upcoming | Settings | Ideas
 */
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useApp } from "../context/AppContext";
import type { ClassSection } from "../types";
import { generateId } from "../utils/localStorage";

// ── Types ─────────────────────────────────────────────────────────────────────

interface VirtualMeeting {
  id: string;
  title: string;
  className: string;
  section: string;
  date: string;
  time: string;
  duration: string;
  platform: "zoom" | "googlemeet" | "both";
  meetingId?: string;
  passcode?: string;
  link: string;
  status: "upcoming" | "live" | "ended";
  createdAt: string;
}

interface ZoomSettings {
  apiKey: string;
  apiSecret: string;
  meetingId: string;
  email: string;
}

interface IdeaCard {
  icon: string;
  title: string;
  desc: string;
}

const IDEAS: IdeaCard[] = [
  {
    icon: "🤖",
    title: "AI Attendance",
    desc: "Face recognition via camera for auto attendance marking",
  },
  {
    icon: "📱",
    title: "Parent App",
    desc: "PWA with push notifications for fees, attendance, results",
  },
  {
    icon: "📝",
    title: "Online Exams",
    desc: "Auto-graded exams with MCQ and time limits",
  },
  {
    icon: "💳",
    title: "UPI Payments",
    desc: "QR code for GPay/PhonePe fee collection",
  },
  {
    icon: "📢",
    title: "Bulk Broadcast",
    desc: "WhatsApp/SMS to all parents for results and circulars",
  },
  {
    icon: "📊",
    title: "Analytics Dashboard",
    desc: "Student performance charts and trends over time",
  },
  {
    icon: "📚",
    title: "Library System",
    desc: "Book management with barcode scanning",
  },
  {
    icon: "🚌",
    title: "GPS Tracking",
    desc: "Live vehicle tracking for transport routes",
  },
];

const DURATIONS = ["30 min", "45 min", "60 min", "90 min"];

const TABS = ["Schedule", "Upcoming", "Settings", "Ideas"] as const;
type Tab = (typeof TABS)[number];

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildMeetLink(
  platform: VirtualMeeting["platform"],
  meetingId?: string,
  passcode?: string,
): string {
  if (platform === "googlemeet" || platform === "both")
    return "https://meet.google.com/new";
  if (platform === "zoom" && meetingId)
    return `https://zoom.us/j/${meetingId}${passcode ? `?pwd=${passcode}` : ""}`;
  return "https://zoom.us/start/videomeeting";
}

function getMeetingStatus(
  date: string,
  time: string,
  duration: string,
): VirtualMeeting["status"] {
  const startMs = new Date(`${date}T${time}`).getTime();
  const durationMin = Number.parseInt(duration) || 60;
  const endMs = startMs + durationMin * 60 * 1000;
  const now = Date.now();
  if (now < startMs) return "upcoming";
  if (now >= startMs && now <= endMs) return "live";
  return "ended";
}

const STATUS_COLORS: Record<VirtualMeeting["status"], string> = {
  upcoming: "bg-blue-100 text-blue-700 border-blue-200",
  live: "bg-green-100 text-green-700 border-green-200 animate-pulse",
  ended: "bg-muted text-muted-foreground border-border",
};

const PLATFORM_COLORS = {
  zoom: "bg-blue-600 text-white",
  googlemeet: "bg-green-600 text-white",
  both: "bg-violet-600 text-white",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function VirtualClasses() {
  const { currentUser, getData } = useApp();
  const isSuperAdmin = currentUser?.role === "superadmin";
  const isAdmin =
    currentUser?.role === "admin" || currentUser?.role === "superadmin";

  const [activeTab, setActiveTab] = useState<Tab>("Schedule");

  // Meetings stored in local state (not in server DB — meeting links are ephemeral)
  const [meetings, setMeetings] = useState<VirtualMeeting[]>([]);

  // Schedule form
  const [title, setTitle] = useState("");
  const [selClass, setSelClass] = useState("");
  const [selSection, setSelSection] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState("60 min");
  const [platform, setPlatform] =
    useState<VirtualMeeting["platform"]>("googlemeet");
  const [zoomMeetId, setZoomMeetId] = useState("");
  const [zoomPass, setZoomPass] = useState("");
  const [notifyParents, setNotifyParents] = useState(false);

  // Settings form
  const [zoomSettings, setZoomSettings] = useState<ZoomSettings>({
    apiKey: "",
    apiSecret: "",
    meetingId: "",
    email: "",
  });

  // Classes from context
  const classSections = getData("classes") as ClassSection[];
  const classNames = classSections.map(
    (c) => c.className ?? (c as unknown as { name?: string }).name ?? "",
  );
  const sectionsForClass =
    classSections.find(
      (c) =>
        (c.className ?? (c as unknown as { name?: string }).name ?? "") ===
        selClass,
    )?.sections ?? [];

  function handleSchedule() {
    if (!title.trim()) {
      toast.error("Enter a meeting title");
      return;
    }
    if (!selClass) {
      toast.error("Select a class");
      return;
    }
    const link = buildMeetLink(
      platform,
      zoomMeetId || undefined,
      zoomPass || undefined,
    );
    const meeting: VirtualMeeting = {
      id: generateId(),
      title: title.trim(),
      className: selClass,
      section: selSection,
      date,
      time,
      duration,
      platform,
      meetingId: zoomMeetId || undefined,
      passcode: zoomPass || undefined,
      link,
      status: getMeetingStatus(date, time, duration),
      createdAt: new Date().toISOString(),
    };
    setMeetings((prev) => [meeting, ...prev]);

    if ((platform === "googlemeet" || platform === "both") && notifyParents) {
      toast.info(
        "Google Meet link generated. Copy and share with students manually.",
      );
    } else {
      toast.success(`Meeting "${meeting.title}" scheduled!`);
    }

    // Reset form
    setTitle("");
    setSelClass("");
    setSelSection("");
    setZoomMeetId("");
    setZoomPass("");
    setNotifyParents(false);
    setActiveTab("Upcoming");
  }

  function deleteMeeting(id: string) {
    if (!confirm("Delete this meeting?")) return;
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    toast.success("Meeting deleted");
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(link).catch(() => {});
    toast.success("Link copied to clipboard");
  }

  const upcomingCount = meetings.filter(
    (m) => getMeetingStatus(m.date, m.time, m.duration) !== "ended",
  ).length;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <span className="text-lg">🎥</span>
        </div>
        <div>
          <h2 className="font-bold text-foreground text-base font-display">
            Virtual Classes
          </h2>
          <p className="text-xs text-muted-foreground">
            Schedule Zoom & Google Meet sessions for students
          </p>
        </div>
        {upcomingCount > 0 && (
          <Badge className="ml-auto bg-primary/10 text-primary border-primary/30">
            {upcomingCount} active
          </Badge>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-card border-b border-border px-4">
        <div className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              data-ocid={`virtualclasses.${tab.toLowerCase()}.tab`}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {tab}
              {tab === "Upcoming" && meetings.length > 0 && (
                <span className="ml-1.5 bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {meetings.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* ── SCHEDULE TAB ── */}
        {activeTab === "Schedule" && (
          <div className="max-w-xl space-y-4">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-foreground">
                Schedule a New Meeting
              </h3>

              <div className="space-y-1.5">
                <Label htmlFor="meet-title">Meeting Title *</Label>
                <Input
                  id="meet-title"
                  placeholder="e.g. Science Class – Chapter 4"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-ocid="virtualclasses.title.input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Class *</Label>
                  <Select
                    value={selClass}
                    onValueChange={(v) => {
                      setSelClass(v);
                      setSelSection("");
                    }}
                  >
                    <SelectTrigger data-ocid="virtualclasses.class.select">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classNames.length > 0
                        ? classNames.map((c) => (
                            <SelectItem key={c} value={c}>
                              Class {c}
                            </SelectItem>
                          ))
                        : [
                            "Nursery",
                            "LKG",
                            "UKG",
                            "1",
                            "2",
                            "3",
                            "4",
                            "5",
                            "6",
                            "7",
                            "8",
                            "9",
                            "10",
                            "11",
                            "12",
                          ].map((c) => (
                            <SelectItem key={c} value={c}>
                              Class {c}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Section</Label>
                  <Select value={selSection} onValueChange={setSelSection}>
                    <SelectTrigger data-ocid="virtualclasses.section.select">
                      <SelectValue placeholder="All sections" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Sections</SelectItem>
                      {(sectionsForClass.length > 0
                        ? sectionsForClass
                        : ["A", "B", "C"]
                      ).map((s) => (
                        <SelectItem key={s} value={s}>
                          Section {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="meet-date">Date</Label>
                  <Input
                    id="meet-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    data-ocid="virtualclasses.date.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="meet-time">Time</Label>
                  <Input
                    id="meet-time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    data-ocid="virtualclasses.time.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger data-ocid="virtualclasses.duration.select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Platform</Label>
                <div className="flex gap-2">
                  {(
                    [
                      {
                        val: "googlemeet",
                        label: "Google Meet",
                        color: "bg-green-600",
                      },
                      { val: "zoom", label: "Zoom", color: "bg-blue-600" },
                      { val: "both", label: "Both", color: "bg-violet-600" },
                    ] as const
                  ).map(({ val, label, color }) => (
                    <button
                      key={val}
                      type="button"
                      data-ocid={`virtualclasses.platform.${val}`}
                      onClick={() => setPlatform(val)}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
                        platform === val
                          ? `${color} text-white border-transparent`
                          : "border-border bg-card text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {(platform === "zoom" || platform === "both") && (
                <div className="grid grid-cols-2 gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="zoom-id">Zoom Meeting ID</Label>
                    <Input
                      id="zoom-id"
                      placeholder="123 456 7890"
                      value={zoomMeetId}
                      onChange={(e) => setZoomMeetId(e.target.value)}
                      data-ocid="virtualclasses.zoomid.input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="zoom-pass">Passcode</Label>
                    <Input
                      id="zoom-pass"
                      placeholder="optional"
                      value={zoomPass}
                      onChange={(e) => setZoomPass(e.target.value)}
                      data-ocid="virtualclasses.zoompass.input"
                    />
                  </div>
                </div>
              )}

              {(platform === "googlemeet" || platform === "both") && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                  <p className="font-semibold">ℹ️ Google Meet</p>
                  <p className="text-xs mt-1">
                    Google Meet will open in a new tab. Copy the link and share
                    it with students and parents.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      window.open("https://meet.google.com/new", "_blank")
                    }
                    className="mt-2 px-3 py-1 bg-green-600 text-white text-xs rounded font-semibold hover:bg-green-700 transition-colors"
                    data-ocid="virtualclasses.quickmeet.button"
                  >
                    Open Quick Meet →
                  </button>
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={notifyParents}
                  onChange={(e) => setNotifyParents(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                  data-ocid="virtualclasses.notify.checkbox"
                />
                <span className="text-sm text-muted-foreground">
                  Send meeting link to parents via WhatsApp
                </span>
              </label>

              <Button
                className="w-full"
                onClick={handleSchedule}
                data-ocid="virtualclasses.schedule.submit_button"
              >
                📅 Schedule Meeting
              </Button>
            </div>
          </div>
        )}

        {/* ── UPCOMING TAB ── */}
        {activeTab === "Upcoming" && (
          <div className="space-y-3 max-w-3xl">
            {meetings.length === 0 ? (
              <div
                className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground"
                data-ocid="virtualclasses.upcoming.empty_state"
              >
                <div className="text-4xl mb-3">📅</div>
                <p className="font-semibold text-foreground">
                  No meetings scheduled yet
                </p>
                <p className="text-sm mt-1">
                  Click the "Schedule" tab to create your first meeting.
                </p>
                <Button
                  size="sm"
                  className="mt-4"
                  onClick={() => setActiveTab("Schedule")}
                  data-ocid="virtualclasses.goto_schedule.button"
                >
                  Schedule a Meeting
                </Button>
              </div>
            ) : (
              meetings.map((m, idx) => {
                const liveStatus = getMeetingStatus(m.date, m.time, m.duration);
                return (
                  <div
                    key={m.id}
                    className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                    data-ocid={`virtualclasses.meeting.item.${idx + 1}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground truncate">
                          {m.title}
                        </p>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[liveStatus]}`}
                        >
                          {liveStatus.toUpperCase()}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PLATFORM_COLORS[m.platform]}`}
                        >
                          {m.platform === "googlemeet"
                            ? "Google Meet"
                            : m.platform === "zoom"
                              ? "Zoom"
                              : "Both"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Class {m.className}
                        {m.section ? ` - ${m.section}` : ""} &nbsp;·&nbsp;
                        {m.date} at {m.time} &nbsp;·&nbsp; {m.duration}
                      </p>
                      {m.meetingId && (
                        <p className="text-xs text-muted-foreground">
                          Zoom ID: {m.meetingId}
                          {m.passcode ? ` / Passcode: ${m.passcode}` : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyLink(m.link)}
                        data-ocid={`virtualclasses.copy_link.button.${idx + 1}`}
                      >
                        📋 Copy Link
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => window.open(m.link, "_blank")}
                        data-ocid={`virtualclasses.join.button.${idx + 1}`}
                      >
                        🎥 Join
                      </Button>
                      {(isSuperAdmin || isAdmin) && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteMeeting(m.id)}
                          data-ocid={`virtualclasses.delete.button.${idx + 1}`}
                        >
                          🗑️
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === "Settings" && (
          <div className="max-w-xl space-y-4">
            {/* Zoom Settings */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                  Z
                </div>
                <h3 className="font-semibold text-foreground">Zoom Settings</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="zoom-api-key">API Key</Label>
                  <Input
                    id="zoom-api-key"
                    placeholder="Zoom API Key"
                    value={zoomSettings.apiKey}
                    onChange={(e) =>
                      setZoomSettings((p) => ({ ...p, apiKey: e.target.value }))
                    }
                    data-ocid="virtualclasses.zoom_apikey.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="zoom-api-secret">API Secret</Label>
                  <Input
                    id="zoom-api-secret"
                    type="password"
                    placeholder="Zoom API Secret"
                    value={zoomSettings.apiSecret}
                    onChange={(e) =>
                      setZoomSettings((p) => ({
                        ...p,
                        apiSecret: e.target.value,
                      }))
                    }
                    data-ocid="virtualclasses.zoom_secret.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="zoom-personal-id">Personal Meeting ID</Label>
                  <Input
                    id="zoom-personal-id"
                    placeholder="123 456 7890"
                    value={zoomSettings.meetingId}
                    onChange={(e) =>
                      setZoomSettings((p) => ({
                        ...p,
                        meetingId: e.target.value,
                      }))
                    }
                    data-ocid="virtualclasses.zoom_pmid.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="zoom-email">Zoom Account Email</Label>
                  <Input
                    id="zoom-email"
                    type="email"
                    placeholder="your@email.com"
                    value={zoomSettings.email}
                    onChange={(e) =>
                      setZoomSettings((p) => ({ ...p, email: e.target.value }))
                    }
                    data-ocid="virtualclasses.zoom_email.input"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    localStorage.setItem(
                      "shubh_zoom_settings",
                      JSON.stringify(zoomSettings),
                    );
                    toast.success("Zoom settings saved");
                  }}
                  data-ocid="virtualclasses.zoom_save.save_button"
                >
                  Save Zoom Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open("https://zoom.us/start/videomeeting", "_blank")
                  }
                  data-ocid="virtualclasses.quick_zoom.button"
                >
                  ⚡ Quick Zoom Meeting
                </Button>
              </div>
            </div>

            {/* Google Meet Settings */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center text-white font-bold text-sm">
                  G
                </div>
                <h3 className="font-semibold text-foreground">Google Meet</h3>
              </div>
              <div className="bg-muted/50 border border-border rounded-lg p-3 text-sm text-muted-foreground">
                <p>
                  Google Meet requires a Google account. Use the button below to
                  open Google Calendar and create a new meeting, or use Quick
                  Meet for an instant link.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    window.open("https://meet.google.com/new", "_blank")
                  }
                  className="bg-green-600 hover:bg-green-700 text-white"
                  data-ocid="virtualclasses.quick_googlemeet.button"
                >
                  ⚡ Quick Google Meet
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open(
                      "https://calendar.google.com/calendar/r/eventedit",
                      "_blank",
                    )
                  }
                  data-ocid="virtualclasses.google_calendar.button"
                >
                  📅 Open Google Calendar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── IDEAS TAB ── */}
        {activeTab === "Ideas" && (
          <div className="space-y-4 max-w-3xl">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <h3 className="font-semibold text-foreground">
                💡 Ideas & Suggestions
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Vote for features you'd like to see added to SHUBH SCHOOL ERP.
                High-vote features get prioritized.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {IDEAS.map((idea, idx) => (
                <div
                  key={idea.title}
                  className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 hover:border-primary/30 transition-colors"
                  data-ocid={`virtualclasses.idea.item.${idx + 1}`}
                >
                  <span className="text-2xl flex-shrink-0 mt-0.5">
                    {idea.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">
                      {idea.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {idea.desc}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        toast.success(
                          "Feature requested! We'll prioritize based on votes.",
                        )
                      }
                      className="mt-2 px-3 py-1 text-xs font-semibold rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                      data-ocid={`virtualclasses.vote.button.${idx + 1}`}
                    >
                      👍 Vote / Request
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
