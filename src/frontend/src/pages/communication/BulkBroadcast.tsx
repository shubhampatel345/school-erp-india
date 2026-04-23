/**
 * BulkBroadcast — Bulk WhatsApp/SMS Campaign Module
 * Rate-limited sending (1 per 500ms), campaign history, template management.
 * Role-based: SuperAdmin/Admin can create; Teacher can view; Parents/Students denied.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  BookTemplate,
  CheckCircle,
  Clock,
  Eye,
  MessageSquare,
  PlusCircle,
  Radio,
  RefreshCw,
  Send,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import type { Route, Staff, Student } from "../../types";
import { generateId, ls } from "../../utils/localStorage";
import { getWhatsAppSettings, sendWhatsApp } from "../../utils/whatsapp";

// ── Types ──────────────────────────────────────────────────
type Channel = "whatsapp" | "sms" | "both";
type MsgType =
  | "circular"
  | "fee_reminder"
  | "exam_result"
  | "timetable"
  | "birthday"
  | "custom";
type RecipientFilter =
  | "all_parents"
  | "by_class"
  | "by_section"
  | "by_route"
  | "custom_list";
type CampaignStatus = "draft" | "sending" | "sent" | "failed";

interface BroadcastTemplate {
  id: string;
  name: string;
  type: MsgType;
  channel: Channel;
  body: string;
  createdAt: string;
}

interface CampaignDelivery {
  phone: string;
  name: string;
  status: "sent" | "failed";
  error?: string;
}

interface BroadcastCampaign {
  id: string;
  title: string;
  channel: Channel;
  msgType: MsgType;
  recipientFilter: RecipientFilter;
  filterClass?: string;
  filterSection?: string;
  filterRoute?: string;
  message: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  status: CampaignStatus;
  scheduledAt?: string;
  createdAt: string;
  deliveries?: CampaignDelivery[];
}

// ── Constants ──────────────────────────────────────────────
const CLASSES = [
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
];
const SECTIONS = ["A", "B", "C", "D", "E"];

const BUILT_IN_TEMPLATES: Record<MsgType, string> = {
  circular: "Dear Parents, {circular_content}. Regards, {school_name}",
  fee_reminder:
    "Dear {parent_name}, your ward {student_name}'s school fees are due for {month}. Please pay at the earliest to avoid inconvenience. — {school_name}",
  exam_result:
    "Dear Parent, {student_name} scored {score}/{total} in {exam_name}. Please collect the result card from school. — {school_name}",
  timetable:
    "Dear Parents, the exam timetable for {class_name} has been published. Exams begin on {start_date}. Please ensure your ward prepares accordingly. — {school_name}",
  birthday:
    "🎂 Dear Parent, wishing {student_name} a very Happy Birthday! 🎉 Warm regards, {school_name}",
  custom: "",
};

const PLACEHOLDERS: Record<MsgType, string[]> = {
  circular: ["{circular_content}", "{school_name}"],
  fee_reminder: ["{parent_name}", "{student_name}", "{month}", "{school_name}"],
  exam_result: [
    "{student_name}",
    "{score}",
    "{total}",
    "{exam_name}",
    "{school_name}",
  ],
  timetable: ["{class_name}", "{start_date}", "{school_name}"],
  birthday: ["{student_name}", "{school_name}"],
  custom: [],
};

const CHANNEL_LIMIT: Record<Channel, number> = {
  whatsapp: 1024,
  sms: 160,
  both: 160,
};

const STATUS_BADGE: Record<CampaignStatus, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
  sending: {
    label: "Sending",
    cls: "bg-blue-100 text-blue-700 border-blue-200",
  },
  sent: { label: "Sent", cls: "bg-green-100 text-green-700 border-green-200" },
  failed: { label: "Failed", cls: "bg-red-100 text-red-700 border-red-200" },
};

const LS_CAMPAIGNS = "broadcast_campaigns";
const LS_TEMPLATES = "broadcast_templates";
const RATE_DELAY = 500; // ms between sends

// ── Helpers ────────────────────────────────────────────────
function getSchoolName(): string {
  try {
    const s = localStorage.getItem("shubh_school_settings");
    if (s)
      return (
        (JSON.parse(s) as { schoolName?: string }).schoolName ??
        "SHUBH SCHOOL ERP"
      );
  } catch {
    /* */
  }
  return "SHUBH SCHOOL ERP";
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function fillPreview(template: string): string {
  return template
    .replace("{parent_name}", "Ram Sharma")
    .replace("{student_name}", "Aarav Sharma")
    .replace("{month}", "April 2025")
    .replace("{amount}", "5,000")
    .replace("{score}", "87")
    .replace("{total}", "100")
    .replace("{exam_name}", "Half Yearly")
    .replace("{class_name}", "Class 8-A")
    .replace("{start_date}", "15 Oct 2025")
    .replace(
      "{circular_content}",
      "School will remain closed on 15th August for Independence Day celebrations",
    )
    .replace("{school_name}", getSchoolName());
}

// ── NEW CAMPAIGN TAB ───────────────────────────────────────
function NewCampaignTab({
  onCampaignCreated,
}: {
  onCampaignCreated: (c: BroadcastCampaign) => void;
}) {
  const { getData, currentUser } = useApp();
  const canCreate =
    currentUser?.role === "superadmin" || currentUser?.role === "admin";

  // Step state
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 — recipients
  const [filter, setFilter] = useState<RecipientFilter>("all_parents");
  const [filterClass, setFilterClass] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterRoute, setFilterRoute] = useState("");
  const [customPhones, setCustomPhones] = useState("");

  // Step 2 — message
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [msgType, setMsgType] = useState<MsgType>("circular");
  const [message, setMessage] = useState(BUILT_IN_TEMPLATES.circular);
  const [title, setTitle] = useState("");

  // Step 3 — schedule + send
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressOf, setProgressOf] = useState(0);
  const [progressDone, setProgressDone] = useState(0);
  const abortRef = useRef(false);

  const allStudents = getData("students") as Student[];
  const allStaff = getData("staff") as Staff[];
  const allRoutes = getData("transport_routes") as Route[];

  // Compute recipients
  const getRecipients = useCallback((): { name: string; phone: string }[] => {
    const active = allStudents.filter((s) => s.status === "active");

    if (filter === "all_parents") {
      return active
        .filter((s) => s.guardianMobile ?? s.fatherMobile)
        .map((s) => ({
          name: s.fatherName || s.guardianName || "Parent",
          phone: String(s.guardianMobile ?? s.fatherMobile ?? ""),
        }));
    }
    if (filter === "by_class") {
      return active
        .filter(
          (s) =>
            String(s.class) === filterClass &&
            (s.guardianMobile ?? s.fatherMobile),
        )
        .map((s) => ({
          name: s.fatherName || s.guardianName || "Parent",
          phone: String(s.guardianMobile ?? s.fatherMobile ?? ""),
        }));
    }
    if (filter === "by_section") {
      return active
        .filter(
          (s) =>
            String(s.class) === filterClass &&
            s.section === filterSection &&
            (s.guardianMobile ?? s.fatherMobile),
        )
        .map((s) => ({
          name: s.fatherName || s.guardianName || "Parent",
          phone: String(s.guardianMobile ?? s.fatherMobile ?? ""),
        }));
    }
    if (filter === "by_route") {
      return active
        .filter(
          (s) =>
            s.transportRoute === filterRoute &&
            (s.guardianMobile ?? s.fatherMobile),
        )
        .map((s) => ({
          name: s.fatherName || s.guardianName || "Parent",
          phone: String(s.guardianMobile ?? s.fatherMobile ?? ""),
        }));
    }
    if (filter === "custom_list") {
      return customPhones
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => ({ name: "Recipient", phone: p }));
    }
    return [];
  }, [
    allStudents,
    filter,
    filterClass,
    filterSection,
    filterRoute,
    customPhones,
  ]);

  const recipients = getRecipients().filter((r) => r.phone);

  // Update message template on type change
  const handleMsgTypeChange = (t: MsgType) => {
    setMsgType(t);
    if (BUILT_IN_TEMPLATES[t]) setMessage(BUILT_IN_TEMPLATES[t]);
  };

  const insertPlaceholder = (ph: string) => {
    setMessage((prev) => prev + ph);
  };

  const charLimit = CHANNEL_LIMIT[channel];
  const smsCount = Math.ceil(message.length / 160);

  // Staff list used for routes
  const routeOptions = allRoutes.length
    ? allRoutes.map((r) => r.routeName ?? r.id)
    : ["Route 1", "Route 2", "Route 3"];

  const handleStartSend = async () => {
    if (!recipients.length || !message.trim()) return;
    setConfirmOpen(false);
    setSending(true);
    abortRef.current = false;
    const recs = recipients;
    setProgressOf(recs.length);
    setProgressDone(0);

    const deliveries: CampaignDelivery[] = [];

    for (let i = 0; i < recs.length; i++) {
      if (abortRef.current) break;
      const r = recs[i];
      let result: { success: boolean; error?: string } = {
        success: false,
        error: "SMS not configured",
      };

      if (channel === "whatsapp" || channel === "both") {
        result = await sendWhatsApp(r.phone, message);
      }

      deliveries.push({
        phone: r.phone,
        name: r.name,
        status: result.success ? "sent" : "failed",
        error: result.error,
      });

      setProgressDone(i + 1);
      setProgress(Math.round(((i + 1) / recs.length) * 100));
      await sleep(RATE_DELAY);
    }

    const sentCount = deliveries.filter((d) => d.status === "sent").length;
    const campaign: BroadcastCampaign = {
      id: generateId(),
      title:
        title ||
        `${msgType.replace("_", " ")} — ${new Date().toLocaleDateString("en-IN")}`,
      channel,
      msgType,
      recipientFilter: filter,
      filterClass,
      filterSection,
      filterRoute,
      message,
      recipientCount: recs.length,
      sentCount,
      failedCount: recs.length - sentCount,
      status: abortRef.current ? "failed" : "sent",
      scheduledAt: scheduleEnabled ? scheduledAt : undefined,
      createdAt: new Date().toISOString(),
      deliveries,
    };

    const saved = ls.get<BroadcastCampaign[]>(LS_CAMPAIGNS, []);
    ls.set(LS_CAMPAIGNS, [campaign, ...saved].slice(0, 200));
    onCampaignCreated(campaign);
    setSending(false);
    // Reset
    setStep(1);
    setProgress(0);
    setProgressDone(0);
    setTitle("");
  };

  const routeNames = allRoutes.map((r) => r.routeName).filter(Boolean);
  void allStaff;
  void routeOptions;

  if (!canCreate) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground"
        data-ocid="broadcast-new.restricted"
      >
        <AlertCircle className="w-10 h-10 opacity-30" />
        <p className="text-sm font-medium">Access Restricted</p>
        <p className="text-xs text-center max-w-xs">
          Only Super Admin and Admin can create broadcast campaigns.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-2" data-ocid="broadcast-steps">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : step > s
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {step > s ? <CheckCircle className="w-4 h-4" /> : s}
            </div>
            <span
              className={`text-xs font-medium hidden sm:block ${step === s ? "text-foreground" : "text-muted-foreground"}`}
            >
              {s === 1
                ? "Select Recipients"
                : s === 2
                  ? "Compose Message"
                  : "Schedule & Send"}
            </span>
            {s < 3 && (
              <div
                className={`h-px w-8 sm:w-16 ${step > s ? "bg-green-400" : "bg-border"}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Step 1 — Select
              Recipients
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <Label>Who should receive this message?</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(
                  [
                    { value: "all_parents", label: "All Parents" },
                    { value: "by_class", label: "By Class" },
                    { value: "by_section", label: "By Class & Section" },
                    { value: "by_route", label: "By Transport Route" },
                    { value: "custom_list", label: "Custom Phone List" },
                  ] as { value: RecipientFilter; label: string }[]
                ).map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      filter === opt.value
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border hover:border-primary/40"
                    }`}
                    data-ocid={`broadcast-filter-${opt.value}`}
                  >
                    <input
                      type="radio"
                      name="recipient_filter"
                      value={opt.value}
                      checked={filter === opt.value}
                      onChange={() => setFilter(opt.value)}
                      className="accent-primary"
                    />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Conditional sub-selects */}
            {(filter === "by_class" || filter === "by_section") && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select value={filterClass} onValueChange={setFilterClass}>
                    <SelectTrigger data-ocid="broadcast-class-select">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLASSES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c === "1" || Number.parseInt(c) > 0
                            ? `Class ${c}`
                            : c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {filter === "by_section" && (
                  <div className="space-y-2">
                    <Label>Section</Label>
                    <Select
                      value={filterSection}
                      onValueChange={setFilterSection}
                    >
                      <SelectTrigger data-ocid="broadcast-section-select">
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            Section {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {filter === "by_route" && (
              <div className="space-y-2">
                <Label>Route</Label>
                <Select value={filterRoute} onValueChange={setFilterRoute}>
                  <SelectTrigger data-ocid="broadcast-route-select">
                    <SelectValue placeholder="Select route" />
                  </SelectTrigger>
                  <SelectContent>
                    {routeNames.length > 0
                      ? routeNames.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))
                      : ["Route 1", "Route 2", "Route 3"].map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {filter === "custom_list" && (
              <div className="space-y-2">
                <Label>
                  Phone Numbers{" "}
                  <span className="text-muted-foreground text-xs">
                    (one per line)
                  </span>
                </Label>
                <Textarea
                  rows={5}
                  placeholder={"9876543210\n9876543211\n9876543212"}
                  value={customPhones}
                  onChange={(e) => setCustomPhones(e.target.value)}
                  data-ocid="broadcast-custom-phones-input"
                  className="resize-none font-mono text-sm"
                />
              </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-3">
              <div
                className={`text-sm font-medium px-3 py-1.5 rounded-full border ${recipients.length > 0 ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"}`}
              >
                <Users className="w-3.5 h-3.5 inline mr-1.5" />
                {recipients.length} recipient
                {recipients.length !== 1 ? "s" : ""} selected
              </div>
              <Button
                onClick={() => setStep(2)}
                disabled={recipients.length === 0}
                data-ocid="broadcast-step1-next-btn"
              >
                Next: Compose Message →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" /> Step 2 —
              Compose Message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Campaign Title</Label>
                <Input
                  placeholder="e.g. July Fee Reminder"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-ocid="broadcast-title-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select
                  value={channel}
                  onValueChange={(v) => setChannel(v as Channel)}
                >
                  <SelectTrigger data-ocid="broadcast-channel-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                    <SelectItem value="sms">📱 SMS</SelectItem>
                    <SelectItem value="both">💬📱 Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Message Type</Label>
                <Select
                  value={msgType}
                  onValueChange={(v) => handleMsgTypeChange(v as MsgType)}
                >
                  <SelectTrigger data-ocid="broadcast-msgtype-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="circular">📢 Circular</SelectItem>
                    <SelectItem value="fee_reminder">
                      💰 Fee Reminder
                    </SelectItem>
                    <SelectItem value="exam_result">📊 Exam Result</SelectItem>
                    <SelectItem value="timetable">📋 Timetable</SelectItem>
                    <SelectItem value="birthday">🎂 Birthday Wishes</SelectItem>
                    <SelectItem value="custom">✏️ Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {PLACEHOLDERS[msgType].length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-muted-foreground font-medium">
                  Insert:
                </span>
                {PLACEHOLDERS[msgType].map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => insertPlaceholder(ph)}
                    className="text-xs px-2 py-0.5 rounded bg-muted border border-border hover:bg-primary/10 hover:border-primary/30 font-mono transition-colors"
                    data-ocid={`broadcast-ph-${ph.replace(/[{}]/g, "")}`}
                  >
                    {ph}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  rows={7}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  data-ocid="broadcast-message-input"
                  className="resize-none"
                  maxLength={channel === "sms" ? 480 : 1024}
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {message.length} / {charLimit} chars
                  </span>
                  {channel === "sms" && (
                    <span>
                      {smsCount} SMS credit{smsCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Preview
                </Label>
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="bg-green-600 px-4 py-2 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                      S
                    </div>
                    <span className="text-white text-sm font-medium">
                      {getSchoolName()}
                    </span>
                  </div>
                  <div className="bg-[#ECE5DD] p-4 min-h-[120px]">
                    <div className="bg-white rounded-lg px-3 py-2.5 shadow-sm max-w-xs">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {fillPreview(message) ||
                          "Your message will appear here…"}
                      </p>
                      <p className="text-right text-xs text-muted-foreground mt-1">
                        {new Date().toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        ✓✓
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                data-ocid="broadcast-step2-back-btn"
              >
                ← Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!message.trim()}
                data-ocid="broadcast-step2-next-btn"
              >
                Next: Schedule & Send →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" /> Step 3 — Schedule &amp;
              Send
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-2 text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-primary/10 text-primary border-0">
                  {channel === "whatsapp"
                    ? "💬 WhatsApp"
                    : channel === "sms"
                      ? "📱 SMS"
                      : "💬📱 Both"}
                </Badge>
                <Badge className="bg-muted text-muted-foreground border-0">
                  {msgType.replace("_", " ")}
                </Badge>
                <span className="text-muted-foreground">→</span>
                <span className="font-semibold">
                  {recipients.length} recipients
                </span>
              </div>
              <p className="text-muted-foreground text-xs">
                Message: "{message.slice(0, 80)}
                {message.length > 80 ? "…" : ""}"
              </p>
            </div>

            <div className="space-y-3">
              <Label>When to Send</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!scheduleEnabled}
                    onChange={() => setScheduleEnabled(false)}
                    className="accent-primary"
                    data-ocid="broadcast-send-now-radio"
                  />
                  <span className="text-sm">Send Now</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={scheduleEnabled}
                    onChange={() => setScheduleEnabled(true)}
                    className="accent-primary"
                    data-ocid="broadcast-schedule-radio"
                  />
                  <span className="text-sm">Schedule for Later</span>
                </label>
              </div>
              {scheduleEnabled && (
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  data-ocid="broadcast-schedule-datetime"
                />
              )}
            </div>

            {/* Sending progress */}
            {sending && (
              <div
                className="space-y-2 p-4 rounded-lg bg-blue-50 border border-blue-200"
                data-ocid="broadcast.sending_state"
              >
                <div className="flex items-center justify-between text-sm font-medium">
                  <span className="text-blue-700">
                    Sending {progressDone} of {progressOf}…
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      abortRef.current = true;
                    }}
                    className="text-xs text-destructive hover:underline"
                  >
                    Cancel
                  </button>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-blue-600">
                  Rate-limited: 1 message per 500ms via WhatsApp API
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                disabled={sending}
                data-ocid="broadcast-step3-back-btn"
              >
                ← Back
              </Button>
              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={sending || recipients.length === 0}
                data-ocid="broadcast-send-btn"
              >
                <Send className="w-4 h-4 mr-2" />
                {scheduleEnabled ? "Schedule Campaign" : "Send Now"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent data-ocid="broadcast-confirm.dialog">
          <DialogHeader>
            <DialogTitle>Confirm Broadcast</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              You are about to send to{" "}
              <strong>
                {recipients.length} recipient
                {recipients.length !== 1 ? "s" : ""}
              </strong>{" "}
              via{" "}
              <strong>
                {channel === "whatsapp"
                  ? "WhatsApp"
                  : channel === "sms"
                    ? "SMS"
                    : "WhatsApp + SMS"}
              </strong>
              .
            </p>
            <p className="text-muted-foreground">
              This action cannot be undone. Messages will be sent at a rate of
              2/second to respect API limits.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              data-ocid="broadcast-confirm.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartSend}
              data-ocid="broadcast-confirm.confirm_button"
            >
              <Send className="w-4 h-4 mr-2" /> Confirm &amp; Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── CAMPAIGN HISTORY TAB ───────────────────────────────────
function CampaignHistoryTab({
  campaigns,
  onDelete,
  canDelete,
}: {
  campaigns: BroadcastCampaign[];
  onDelete: (id: string) => void;
  canDelete: boolean;
}) {
  const [selected, setSelected] = useState<BroadcastCampaign | null>(null);

  if (campaigns.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground"
        data-ocid="broadcast-history.empty_state"
      >
        <Radio className="w-10 h-10 opacity-20" />
        <p className="text-sm font-medium">No broadcast campaigns yet</p>
        <p className="text-xs text-center max-w-xs">
          Create your first campaign using the "New Campaign" tab.
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className="overflow-x-auto rounded-lg border border-border"
        data-ocid="broadcast-history.table"
      >
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              <th className="text-left p-3 font-semibold text-xs">Campaign</th>
              <th className="text-left p-3 font-semibold text-xs">Channel</th>
              <th className="text-right p-3 font-semibold text-xs">
                Recipients
              </th>
              <th className="text-right p-3 font-semibold text-xs">Sent</th>
              <th className="text-right p-3 font-semibold text-xs">Failed</th>
              <th className="text-left p-3 font-semibold text-xs">Status</th>
              <th className="text-left p-3 font-semibold text-xs">Date</th>
              <th className="text-left p-3 font-semibold text-xs">Actions</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c, i) => (
              <tr
                key={c.id}
                className="border-t border-border hover:bg-muted/20"
                data-ocid={`broadcast-history.item.${i + 1}`}
              >
                <td className="p-3">
                  <p className="font-medium text-xs truncate max-w-[160px]">
                    {c.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.msgType.replace("_", " ")}
                  </p>
                </td>
                <td className="p-3">
                  <span className="text-xs">
                    {c.channel === "whatsapp"
                      ? "💬 WA"
                      : c.channel === "sms"
                        ? "📱 SMS"
                        : "💬📱 Both"}
                  </span>
                </td>
                <td className="p-3 text-right font-mono text-xs">
                  {c.recipientCount}
                </td>
                <td className="p-3 text-right font-mono text-xs text-green-600">
                  {c.sentCount}
                </td>
                <td className="p-3 text-right font-mono text-xs text-destructive">
                  {c.failedCount}
                </td>
                <td className="p-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_BADGE[c.status].cls}`}
                  >
                    {STATUS_BADGE[c.status].label}
                  </span>
                </td>
                <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(c.createdAt).toLocaleDateString("en-IN")}
                </td>
                <td className="p-3">
                  <div
                    className="flex gap-1"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {c.status === "failed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        data-ocid={`broadcast-retry-btn.${i + 1}`}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" /> Retry
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={() => onDelete(c.id)}
                        data-ocid={`broadcast-delete-btn.${i + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delivery Report Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent
          className="max-w-2xl max-h-[80vh] overflow-y-auto"
          data-ocid="broadcast-report.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-base">
              Delivery Report — {selected?.title}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                  <p className="text-2xl font-bold text-foreground">
                    {selected.recipientCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-2xl font-bold text-green-600">
                    {selected.sentCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Sent</p>
                </div>
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-2xl font-bold text-destructive">
                    {selected.failedCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>
              {selected.deliveries && selected.deliveries.length > 0 && (
                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                  {selected.deliveries.map((d, i) => (
                    <div
                      key={`${d.phone}-${i}`}
                      className="flex items-center gap-2 text-sm p-2 rounded-lg border border-border"
                    >
                      {d.status === "sent" ? (
                        <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive shrink-0" />
                      )}
                      <span className="flex-1 truncate font-medium">
                        {d.name}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        ***{d.phone.slice(-4)}
                      </span>
                      <Badge
                        variant={
                          d.status === "sent" ? "default" : "destructive"
                        }
                        className="text-xs"
                      >
                        {d.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelected(null)}
              data-ocid="broadcast-report.close_button"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── TEMPLATES TAB ──────────────────────────────────────────
function TemplatesTab({ onUseTemplate }: { onUseTemplate: () => void }) {
  const [templates, setTemplates] = useState<BroadcastTemplate[]>(() =>
    ls.get<BroadcastTemplate[]>(LS_TEMPLATES, []),
  );
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BroadcastTemplate | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "circular" as MsgType,
    channel: "whatsapp" as Channel,
    body: "",
  });

  const save = () => {
    if (!form.name.trim() || !form.body.trim()) return;
    const tpl: BroadcastTemplate = {
      id: editTarget?.id ?? generateId(),
      name: form.name,
      type: form.type,
      channel: form.channel,
      body: form.body,
      createdAt: editTarget?.createdAt ?? new Date().toISOString(),
    };
    const updated = editTarget
      ? templates.map((t) => (t.id === editTarget.id ? tpl : t))
      : [tpl, ...templates];
    setTemplates(updated);
    ls.set(LS_TEMPLATES, updated);
    setEditOpen(false);
    setEditTarget(null);
  };

  const del = (id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    ls.set(LS_TEMPLATES, updated);
  };

  const openEdit = (t?: BroadcastTemplate) => {
    if (t) {
      setEditTarget(t);
      setForm({ name: t.name, type: t.type, channel: t.channel, body: t.body });
    } else {
      setEditTarget(null);
      setForm({ name: "", type: "circular", channel: "whatsapp", body: "" });
    }
    setEditOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {templates.length} saved template{templates.length !== 1 ? "s" : ""}
        </p>
        <Button
          size="sm"
          onClick={() => openEdit()}
          data-ocid="broadcast-template-add-btn"
        >
          <PlusCircle className="w-4 h-4 mr-1.5" /> New Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground"
          data-ocid="broadcast-templates.empty_state"
        >
          <BookTemplate className="w-10 h-10 opacity-20" />
          <p className="text-sm font-medium">No templates saved yet</p>
          <p className="text-xs">
            Create reusable message templates to speed up future campaigns.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {templates.map((t, i) => (
            <Card
              key={t.id}
              className="border-border"
              data-ocid={`broadcast-template.item.${i + 1}`}
            >
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <div className="flex gap-1.5 mt-1">
                      <Badge className="text-xs bg-muted text-muted-foreground border-0">
                        {t.type.replace("_", " ")}
                      </Badge>
                      <Badge className="text-xs bg-muted text-muted-foreground border-0">
                        {t.channel}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => openEdit(t)}
                      data-ocid={`broadcast-template-edit-btn.${i + 1}`}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={() => del(t.id)}
                      data-ocid={`broadcast-template-delete-btn.${i + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3">
                  {t.body}
                </p>
                <Button
                  size="sm"
                  className="w-full text-xs"
                  onClick={onUseTemplate}
                  data-ocid={`broadcast-template-use-btn.${i + 1}`}
                >
                  Use Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent data-ocid="broadcast-template.dialog">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit Template" : "New Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Monthly Fee Reminder"
                data-ocid="broadcast-template-name-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, type: v as MsgType }))
                  }
                >
                  <SelectTrigger data-ocid="broadcast-template-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="circular">Circular</SelectItem>
                    <SelectItem value="fee_reminder">Fee Reminder</SelectItem>
                    <SelectItem value="exam_result">Exam Result</SelectItem>
                    <SelectItem value="timetable">Timetable</SelectItem>
                    <SelectItem value="birthday">Birthday</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select
                  value={form.channel}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, channel: v as Channel }))
                  }
                >
                  <SelectTrigger data-ocid="broadcast-template-channel-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Message Body</Label>
              <Textarea
                rows={5}
                value={form.body}
                onChange={(e) =>
                  setForm((f) => ({ ...f, body: e.target.value }))
                }
                placeholder="Use {placeholder} syntax for dynamic values"
                data-ocid="broadcast-template-body-input"
                className="resize-none font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              data-ocid="broadcast-template.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={!form.name.trim() || !form.body.trim()}
              data-ocid="broadcast-template.save_button"
            >
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Types for exam results broadcast ──────────────────────
interface SubjectMarkBroadcast {
  subject: string;
  maxMarks: number;
  marksObtained: number;
}
interface StudentResultBroadcast {
  studentId: string;
  studentName: string;
  admNo: string;
  subjects: SubjectMarkBroadcast[];
}
interface ExamResultGroupBroadcast {
  id: string;
  examName: string;
  classKey: string;
  subjects: string[];
  maxMarks: number;
  studentResults: StudentResultBroadcast[];
  sessionId: string;
}

function calcGradeBroadcast(pct: number): string {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  if (pct >= 40) return "D";
  return "F";
}

function buildResultMsgBroadcast(
  r: StudentResultBroadcast,
  examName: string,
  schoolName: string,
): string {
  const total = r.subjects.reduce((s, sub) => s + sub.marksObtained, 0);
  const maxTotal = r.subjects.reduce((s, sub) => s + sub.maxMarks, 0);
  const pct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
  const grade = calcGradeBroadcast(pct);
  const lines = r.subjects
    .map((s) => {
      const sp =
        s.maxMarks > 0 ? Math.round((s.marksObtained / s.maxMarks) * 100) : 0;
      return `  ${s.subject.padEnd(14, " ")} ${String(s.marksObtained).padStart(3)}/${s.maxMarks}  ${calcGradeBroadcast(sp)}`;
    })
    .join("\n");
  return `📊 *Result Card - ${schoolName}*\n\nDear Parent,\n\n*${r.studentName}* | Adm No: ${r.admNo}\n*Exam:* ${examName}\n\n${"─".repeat(34)}\n${lines}\n${"─".repeat(34)}\n*Total:* ${total}/${maxTotal}  *Grade:* ${grade}  *%:* ${pct}%\n*Result:* ${pct >= 40 ? "✅ PASS" : "❌ FAIL"}\n\n${schoolName}`;
}

// ── RESULTS BROADCAST TAB ──────────────────────────────────
function ResultsBroadcastTab() {
  const { getData } = useApp();
  const [groups, setGroups] = useState<ExamResultGroupBroadcast[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const abortRef = useRef(false);

  useEffect(() => {
    const local = ls.get<ExamResultGroupBroadcast[]>("exam_result_groups", []);
    const ctxGroups = getData("examResultGroups") as ExamResultGroupBroadcast[];
    setGroups(ctxGroups.length > 0 ? ctxGroups : local);
  }, [getData]);

  const waSettings = getWhatsAppSettings();
  const allStudents = getData("students") as Student[];
  const studentMap = new Map(allStudents.map((s) => [s.id, s]));
  const school = getSchoolName();

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  const withPhone = selectedGroup
    ? selectedGroup.studentResults.filter((r) => {
        const s = studentMap.get(r.studentId);
        return s && (s.guardianMobile || s.fatherMobile);
      })
    : [];

  const handleReset = () => {
    setFinished(false);
    setDone(0);
    setSentCount(0);
    setFailedCount(0);
    setSelectedGroupId("");
  };

  const handleSend = async () => {
    if (!selectedGroup) return;
    setConfirmOpen(false);
    setSending(true);
    abortRef.current = false;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < withPhone.length; i++) {
      if (abortRef.current) break;
      const r = withPhone[i];
      const s = studentMap.get(r.studentId);
      if (!s) {
        setDone(i + 1);
        continue;
      }
      const phone = String(s.guardianMobile || s.fatherMobile || "");
      const message = buildResultMsgBroadcast(
        r,
        selectedGroup.examName,
        school,
      );
      const res = await sendWhatsApp(phone, message);
      if (res.success) sent++;
      else failed++;
      setSentCount(sent);
      setFailedCount(failed);
      setDone(i + 1);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Save to campaign history
    const campaign: BroadcastCampaign = {
      id: generateId(),
      title: `Results: ${selectedGroup.examName} — ${selectedGroup.classKey}`,
      channel: "whatsapp",
      msgType: "exam_result",
      recipientFilter: "all_parents",
      message: `Result broadcast for ${selectedGroup.examName}`,
      recipientCount: withPhone.length,
      sentCount: sent,
      failedCount: withPhone.length - sent,
      status: "sent",
      createdAt: new Date().toISOString(),
    };
    const saved = ls.get<BroadcastCampaign[]>(LS_CAMPAIGNS, []);
    ls.set(LS_CAMPAIGNS, [campaign, ...saved].slice(0, 200));

    setSending(false);
    setFinished(true);
  };

  if (!waSettings.enabled) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground"
        data-ocid="results-broadcast.wa-not-configured"
      >
        <AlertCircle className="w-10 h-10 opacity-30" />
        <p className="text-sm font-medium">WhatsApp Not Configured</p>
        <p className="text-xs text-center max-w-xs">
          Go to <strong>Settings → Communication → WhatsApp</strong> and enter
          your API credentials before sending results.
        </p>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground"
        data-ocid="results-broadcast.empty_state"
      >
        <span className="text-4xl">📊</span>
        <p className="text-sm font-medium">No exam result sheets found</p>
        <p className="text-xs text-center max-w-xs">
          Create result sheets in Examinations → Exam Results first, then come
          back here to broadcast them.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="text-lg">📊</span> Send Exam Results via WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!finished ? (
            <>
              <div className="space-y-2">
                <Label>Select Exam Result Group</Label>
                <Select
                  value={selectedGroupId}
                  onValueChange={(v) => {
                    setSelectedGroupId(v);
                    setDone(0);
                    setSentCount(0);
                    setFailedCount(0);
                  }}
                >
                  <SelectTrigger data-ocid="results-broadcast-group-select">
                    <SelectValue placeholder="— Select exam & class —" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.examName} — {g.classKey} ({g.studentResults.length}{" "}
                        students)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedGroup && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/40 border border-border text-center">
                    <p className="text-2xl font-bold">
                      {selectedGroup.studentResults.length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total Students
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
                    <p className="text-2xl font-bold text-primary">
                      {withPhone.length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Have Phone No.
                    </p>
                  </div>
                </div>
              )}

              {selectedGroup &&
                selectedGroup.studentResults.length - withPhone.length > 0 && (
                  <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2.5">
                    ⚠️ {selectedGroup.studentResults.length - withPhone.length}{" "}
                    students will be skipped (no phone number on record).
                  </p>
                )}

              {sending && (
                <div
                  className="space-y-2 p-4 rounded-lg bg-blue-50 border border-blue-200"
                  data-ocid="results-broadcast.loading_state"
                >
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="text-blue-700">
                      Sending {done} of {withPhone.length}…
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        abortRef.current = true;
                      }}
                      className="text-xs text-destructive hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                  <Progress
                    value={
                      withPhone.length > 0
                        ? Math.round((done / withPhone.length) * 100)
                        : 0
                    }
                    className="h-2"
                  />
                  <div className="flex gap-3 text-xs">
                    <span className="text-green-600">✓ Sent: {sentCount}</span>
                    <span className="text-destructive">
                      ✗ Failed: {failedCount}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => setConfirmOpen(true)}
                  disabled={!selectedGroup || withPhone.length === 0 || sending}
                  data-ocid="results-broadcast.send_button"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send to {withPhone.length} Parent
                  {withPhone.length !== 1 ? "s" : ""}
                </Button>
              </div>
            </>
          ) : (
            <div
              className="space-y-4 text-center py-4"
              data-ocid="results-broadcast.success_state"
            >
              <div className="text-4xl">📱</div>
              <p className="font-semibold text-lg">Results Sent!</p>
              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-xl font-bold text-green-600">
                    {sentCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Sent</p>
                </div>
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-xl font-bold text-destructive">
                    {failedCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleReset}
                data-ocid="results-broadcast.reset_button"
              >
                Send Another
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent data-ocid="results-broadcast-confirm.dialog">
          <DialogHeader>
            <DialogTitle>Confirm Results Broadcast</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>
              You are about to send personalized result cards to{" "}
              <strong>
                {withPhone.length} parent{withPhone.length !== 1 ? "s" : ""}
              </strong>{" "}
              via WhatsApp.
            </p>
            <p className="text-muted-foreground">
              Each message includes the student's full marks, grades, and result
              status. Rate-limited to 2 messages/second.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              data-ocid="results-broadcast-confirm.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              data-ocid="results-broadcast-confirm.confirm_button"
            >
              <Send className="w-4 h-4 mr-2" /> Confirm &amp; Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────
export function BulkBroadcast() {
  const { currentUser } = useApp();
  const [activeTab, setActiveTab] = useState("new");
  const [campaigns, setCampaigns] = useState<BroadcastCampaign[]>(() =>
    ls.get<BroadcastCampaign[]>(LS_CAMPAIGNS, []),
  );

  const canDelete = currentUser?.role === "superadmin";
  const isViewOnly = currentUser?.role === "teacher";

  // Block parents/students entirely
  if (
    currentUser?.role === "parent" ||
    currentUser?.role === "student" ||
    currentUser?.role === "driver"
  ) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground"
        data-ocid="broadcast.restricted"
      >
        <AlertCircle className="w-10 h-10 opacity-30" />
        <p className="text-sm font-medium">Access Denied</p>
        <p className="text-xs">
          You do not have permission to access this module.
        </p>
      </div>
    );
  }

  const handleCampaignCreated = (c: BroadcastCampaign) => {
    setCampaigns((prev) => [c, ...prev]);
    setActiveTab("history");
  };

  const handleDelete = (id: string) => {
    const updated = campaigns.filter((c) => c.id !== id);
    setCampaigns(updated);
    ls.set(LS_CAMPAIGNS, updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Radio className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-bold font-display">Bulk Broadcast</h2>
          <p className="text-xs text-muted-foreground">
            Send WhatsApp/SMS to groups — rate-limited via wacoder.in
          </p>
        </div>
        {campaigns.length > 0 && (
          <Badge className="ml-auto bg-muted text-muted-foreground border-0">
            {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList
          className="flex flex-wrap h-auto gap-1 p-1"
          data-ocid="broadcast-tabs"
        >
          {!isViewOnly && (
            <TabsTrigger
              value="new"
              data-ocid="broadcast-tab-new"
              className="flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" /> New Campaign
            </TabsTrigger>
          )}
          <TabsTrigger
            value="history"
            data-ocid="broadcast-tab-history"
            className="flex items-center gap-1.5"
          >
            <Clock className="w-4 h-4" /> Campaign History
            {campaigns.length > 0 && (
              <span className="ml-1 text-xs bg-primary/20 text-primary rounded-full px-1.5">
                {campaigns.length}
              </span>
            )}
          </TabsTrigger>
          {!isViewOnly && (
            <TabsTrigger
              value="templates"
              data-ocid="broadcast-tab-templates"
              className="flex items-center gap-1.5"
            >
              <BookTemplate className="w-4 h-4" /> Templates
            </TabsTrigger>
          )}
          {!isViewOnly && (
            <TabsTrigger
              value="results"
              data-ocid="broadcast-tab-results"
              className="flex items-center gap-1.5"
            >
              <span className="text-sm">📊</span> Send Results
            </TabsTrigger>
          )}
        </TabsList>

        {!isViewOnly && (
          <TabsContent value="new" className="mt-4">
            <NewCampaignTab onCampaignCreated={handleCampaignCreated} />
          </TabsContent>
        )}
        <TabsContent value="history" className="mt-4">
          <CampaignHistoryTab
            campaigns={campaigns}
            onDelete={handleDelete}
            canDelete={canDelete}
          />
        </TabsContent>
        {!isViewOnly && (
          <TabsContent value="templates" className="mt-4">
            <TemplatesTab onUseTemplate={() => setActiveTab("new")} />
          </TabsContent>
        )}
        {!isViewOnly && (
          <TabsContent value="results" className="mt-4">
            <ResultsBroadcastTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

export default BulkBroadcast;
