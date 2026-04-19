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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Bell,
  Bot,
  CheckCircle,
  Clock,
  MessageSquare,
  RefreshCw,
  Save,
  Send,
  Smartphone,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import type { Notification, Staff, Student } from "../types";
import { generateId, ls } from "../utils/localStorage";
import {
  buildAbsentMessage,
  buildBirthdayMessage,
  buildFeesDueMessage,
  getWhatsAppLogs,
  sendWhatsApp,
} from "../utils/whatsapp";

// ── Types ──────────────────────────────────────────────────────────────────────
interface NotifSchedule {
  id: string;
  event: string;
  icon: string;
  enabled: boolean;
  timing: string;
  recipients: string;
  channel: "whatsapp" | "rcs" | "both";
}

interface RcsLog {
  id: string;
  to: string;
  message: string;
  status: "sent";
  timestamp: number;
}

interface WaLog {
  id: string;
  to: string;
  message: string;
  status: "sent" | "failed";
  timestamp: number;
}

// ── Templates ──────────────────────────────────────────────────────────────────
const MSG_TEMPLATES = [
  {
    key: "fee_reminder",
    label: "Fee Reminder",
    text: "Dear [Parent Name], your child [Student Name]'s school fees are due. Please pay by the 15th of this month to avoid late charges. Thank you.",
  },
  {
    key: "absent_alert",
    label: "Absent Alert",
    text: "Dear [Parent Name], [Student Name] (Class [Class]) was marked absent today. Please inform the school office if unwell.",
  },
  {
    key: "birthday_wish",
    label: "Birthday Wish",
    text: "🎂 Dear Parent, SHUBH SCHOOL ERP wishes [Student Name] a very Happy Birthday! 🎉 May this special day bring lots of joy.",
  },
  { key: "general_notice", label: "General Notice", text: "" },
  {
    key: "exam_schedule",
    label: "Exam Schedule",
    text: "Dear Parent, the examination timetable for [Class] has been published. Exams begin on [Date]. Please ensure your ward prepares accordingly.",
  },
  {
    key: "result_notice",
    label: "Result Notice",
    text: "Dear Parent, the results for [Exam Name] have been published. [Student Name] scored [Marks]. Please visit the school to collect the result card.",
  },
  {
    key: "homework_reminder",
    label: "Homework Reminder",
    text: "Dear [Student Name], your homework for [Subject] is due tomorrow. Please ensure you complete and submit it on time. — SHUBH SCHOOL ERP",
  },
];

const RECIPIENT_OPTIONS = [
  { value: "all_parents", label: "All Parents" },
  { value: "all_teachers", label: "All Teachers" },
  { value: "all_students", label: "All Students" },
  { value: "specific", label: "Specific Student/Parent" },
  ...["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map((n) => ({
    value: `class_${n}`,
    label: `Class ${n} Parents`,
  })),
];

const DEFAULT_SCHEDULES: NotifSchedule[] = [
  {
    id: "s1",
    event: "Fee Due Reminder",
    icon: "💰",
    enabled: true,
    timing: "3 days before 15th of month",
    recipients: "All Parents",
    channel: "whatsapp",
  },
  {
    id: "s2",
    event: "Absent Alert",
    icon: "🚨",
    enabled: true,
    timing: "Same day at 10:00 AM",
    recipients: "Parent of absent student",
    channel: "whatsapp",
  },
  {
    id: "s3",
    event: "Birthday Wish",
    icon: "🎂",
    enabled: true,
    timing: "On student's birthday at 8:00 AM",
    recipients: "Student & Parents",
    channel: "whatsapp",
  },
  {
    id: "s4",
    event: "Exam Timetable Published",
    icon: "📋",
    enabled: false,
    timing: "When timetable is saved",
    recipients: "All Parents & Students",
    channel: "both",
  },
  {
    id: "s5",
    event: "Result Published",
    icon: "📊",
    enabled: false,
    timing: "When results are saved",
    recipients: "All Parents & Students",
    channel: "both",
  },
  {
    id: "s6",
    event: "General Notice",
    icon: "📢",
    enabled: false,
    timing: "When notice is created",
    recipients: "All",
    channel: "rcs",
  },
  {
    id: "s7",
    event: "Homework Deadline Reminder",
    icon: "📚",
    enabled: true,
    timing: "1 day before due date at 5:00 PM",
    recipients: "All Students",
    channel: "both",
  },
];

function maskPhone(phone: string): string {
  if (!phone || phone.length < 6) return phone;
  return `${phone.slice(0, 2)}****${phone.slice(-4)}`;
}

// ── WhatsApp Compose Tab ──────────────────────────────────────────────────────
function WhatsAppTab() {
  const { currentSession, getData, saveData, addNotification } = useApp();
  const [activeView, setActiveView] = useState<"compose" | "history">(
    "compose",
  );
  const [recipientType, setRecipientType] = useState("all_parents");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("fee_reminder");
  const [message, setMessage] = useState(MSG_TEMPLATES[0].text);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<
    { to: string; name: string; phone: string; status: string }[]
  >([]);
  const [historyLogs, setHistoryLogs] = useState<WaLog[]>([]);

  // Get students & staff from context (server data)
  const allStudents = getData("students") as Student[];
  const allStaff = getData("staff") as Staff[];
  const students = allStudents.filter(
    (s) =>
      s.sessionId === (currentSession?.id ?? "sess_2025") &&
      s.status === "active",
  );
  const staff = allStaff;

  useEffect(() => {
    setHistoryLogs(getWhatsAppLogs() as WaLog[]);
  }, []);

  const tplText =
    MSG_TEMPLATES.find((t) => t.key === selectedTemplate)?.text ?? "";
  useEffect(() => {
    setMessage(tplText);
  }, [tplText]);

  const getRecipients = (): { name: string; phone: string }[] => {
    if (recipientType === "all_parents") {
      return students
        .filter((s) => s.guardianMobile ?? s.fatherMobile)
        .map((s) => ({
          name: s.fatherName || s.guardianName || "Parent",
          phone: s.guardianMobile ?? s.fatherMobile ?? "",
        }));
    }
    if (recipientType === "all_teachers") {
      return staff
        .filter((s) => s.designation === "Teacher" && s.mobile)
        .map((s) => ({ name: s.name, phone: s.mobile }));
    }
    if (recipientType === "all_students") {
      return students
        .filter((s) => s.mobile)
        .map((s) => ({ name: s.fullName, phone: s.mobile }));
    }
    if (recipientType === "specific") {
      const q = searchQuery.toLowerCase();
      return students
        .filter(
          (s) =>
            s.fullName.toLowerCase().includes(q) ||
            s.admNo.toLowerCase().includes(q),
        )
        .slice(0, 5)
        .map((s) => ({
          name: s.fullName,
          phone: s.guardianMobile ?? s.fatherMobile ?? s.mobile ?? "",
        }));
    }
    if (recipientType.startsWith("class_")) {
      const classNum = recipientType.replace("class_", "");
      return students
        .filter(
          (s) =>
            String(s.class) === classNum &&
            (s.guardianMobile ?? s.fatherMobile),
        )
        .map((s) => ({
          name: s.fatherName || s.guardianName || "Parent",
          phone: s.guardianMobile ?? s.fatherMobile ?? "",
        }));
    }
    return [];
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    const recipients = getRecipients().filter((r) => r.phone);
    if (!recipients.length) return;
    setSending(true);
    setResults([]);
    const res: typeof results = [];
    for (const r of recipients.slice(0, 20)) {
      const result = await sendWhatsApp(r.phone, message);
      res.push({
        to: r.phone,
        name: r.name,
        phone: r.phone,
        status: result.success ? "sent" : "failed",
      });
    }
    // Save log to context/MySQL
    const logEntry = {
      id: generateId(),
      type: "whatsapp_broadcast",
      recipients: res.length,
      sent: res.filter((r) => r.status === "sent").length,
      failed: res.filter((r) => r.status !== "sent").length,
      message: message.slice(0, 200),
      recipientType,
      timestamp: new Date().toISOString(),
    };
    await saveData(
      "messageLogs",
      logEntry as unknown as Record<string, unknown>,
    );
    setResults(res);
    setSending(false);
    setHistoryLogs(getWhatsAppLogs() as WaLog[]);
    addNotification(
      `WhatsApp sent to ${res.filter((r) => r.status === "sent").length} recipients`,
      "success",
      "💬",
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={activeView === "compose" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveView("compose")}
              data-ocid="wa-compose-btn"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" /> Compose
            </Button>
            <Button
              variant={activeView === "history" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveView("history")}
              data-ocid="wa-history-btn"
            >
              <Clock className="w-3.5 h-3.5 mr-1.5" /> Send History
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse-soft" />
            Real API via wacoder.in
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activeView === "compose" ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Send To</Label>
                <Select value={recipientType} onValueChange={setRecipientType}>
                  <SelectTrigger data-ocid="wa-recipient-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECIPIENT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {recipientType === "specific" && (
                  <Input
                    placeholder="Search by name or admission no..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-ocid="wa-search-input"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  {getRecipients().filter((r) => r.phone).length} recipients
                  found
                </p>
              </div>
              <div className="space-y-2">
                <Label>Message Template</Label>
                <Select
                  value={selectedTemplate}
                  onValueChange={setSelectedTemplate}
                >
                  <SelectTrigger data-ocid="wa-template-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MSG_TEMPLATES.map((t) => (
                      <SelectItem key={t.key} value={t.key}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                rows={5}
                placeholder="Type your message or select a template above..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                data-ocid="wa-message-input"
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {message.length} / 1600 characters
              </p>
            </div>
            <Button
              onClick={handleSend}
              disabled={sending || !message.trim()}
              data-ocid="wa-send-btn"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending
                ? "Sending..."
                : `Send WhatsApp (${getRecipients().filter((r) => r.phone).length})`}
            </Button>
            {results.length > 0 && (
              <Card className="bg-muted/30 border-border">
                <CardContent className="pt-4">
                  <p className="text-sm font-semibold mb-3">
                    Send Results (
                    {results.filter((r) => r.status === "sent").length} sent,{" "}
                    {results.filter((r) => r.status !== "sent").length} failed)
                  </p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {results.map((r) => (
                      <div
                        key={`${r.to}-${r.name}`}
                        className="flex items-center gap-2 text-sm"
                      >
                        {r.status === "sent" ? (
                          <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive shrink-0" />
                        )}
                        <span className="truncate flex-1">{r.name}</span>
                        <span className="text-muted-foreground text-xs font-mono">
                          {maskPhone(r.phone)}
                        </span>
                        <Badge
                          variant={
                            r.status === "sent" ? "default" : "destructive"
                          }
                          className="text-xs shrink-0"
                        >
                          {r.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {historyLogs.length === 0 ? (
              <div className="text-center py-14 text-muted-foreground">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No messages sent yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-semibold whitespace-nowrap">
                        Date &amp; Time
                      </th>
                      <th className="text-left p-3 font-semibold">Recipient</th>
                      <th className="text-left p-3 font-semibold">
                        Message Preview
                      </th>
                      <th className="text-left p-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyLogs.map((l) => (
                      <tr
                        key={l.id}
                        className="border-t border-border hover:bg-muted/20"
                        data-ocid={`wa-history-row-${l.id}`}
                      >
                        <td className="p-3 whitespace-nowrap text-muted-foreground text-xs">
                          {new Date(l.timestamp).toLocaleString("en-IN")}
                        </td>
                        <td className="p-3 font-mono text-xs">
                          {maskPhone(l.to)}
                        </td>
                        <td className="p-3 max-w-xs">
                          <span className="line-clamp-2 text-xs">
                            {l.message}
                          </span>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={
                              l.status === "sent" ? "default" : "destructive"
                            }
                            className="text-xs"
                          >
                            {l.status === "sent" ? "✓ Sent" : "✗ Failed"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Notifications Tab ─────────────────────────────────────────────────────────
function NotificationsTab() {
  const { notifications, markAllRead, clearNotifications } = useApp();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base">ERP Notifications</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={markAllRead}
              data-ocid="notif-mark-read-btn"
            >
              Mark All Read
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearNotifications}
              className="text-destructive hover:text-destructive"
              data-ocid="notif-clear-btn"
            >
              Clear All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div
            className="text-center py-14 text-muted-foreground"
            data-ocid="notif.empty_state"
          >
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n: Notification) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-smooth ${n.isRead ? "border-border bg-muted/10 opacity-70" : "border-primary/20 bg-card shadow-subtle"}`}
                data-ocid={`notif-item-${n.id}`}
              >
                <span className="text-lg shrink-0 mt-0.5">
                  {n.icon ??
                    (n.type === "error"
                      ? "❌"
                      : n.type === "success"
                        ? "✅"
                        : n.type === "warning"
                          ? "⚠️"
                          : "ℹ️")}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground break-words">
                    {n.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(n.timestamp).toLocaleString("en-IN")}
                  </p>
                </div>
                {!n.isRead && (
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── WhatsApp Bot Tab ──────────────────────────────────────────────────────────
function WhatsAppBotTab() {
  const { getData } = useApp();
  const [botEnabled, setBotEnabled] = useState(() =>
    ls.get<boolean>("wa_bot_enabled", false),
  );
  const [testAdmNo, setTestAdmNo] = useState("");
  const [botReply, setBotReply] = useState("");
  const [loading, setLoading] = useState(false);

  const handleToggle = (val: boolean) => {
    setBotEnabled(val);
    ls.set("wa_bot_enabled", val);
  };

  const handleTest = useCallback(() => {
    if (!testAdmNo.trim()) return;
    setLoading(true);

    const students = getData("students") as Student[];
    const student = students.find(
      (s) => s.admNo.toLowerCase() === testAdmNo.toLowerCase(),
    );

    setTimeout(() => {
      if (!student) {
        setBotReply(
          `❌ Student with Admission No. *${testAdmNo}* not found.\n\nPlease check the admission number and try again.`,
        );
      } else {
        const attendance = getData("attendance") as Array<{
          studentId: string;
          status: string;
          date: string;
        }>;
        const studentAttendance = attendance.filter(
          (a) => a.studentId === student.id,
        );
        const present = studentAttendance.filter(
          (a) => a.status === "Present",
        ).length;
        const total = studentAttendance.length;
        const pct = total > 0 ? Math.round((present / total) * 100) : 0;

        const receipts = getData("fee_receipts") as Array<{
          studentId: string;
          balance?: number;
          paidAmount?: number;
          totalAmount: number;
        }>;
        const studentReceipts = receipts.filter(
          (r) => r.studentId === student.id,
        );
        const pendingBalance = studentReceipts.reduce(
          (sum, r) => sum + (r.balance ?? 0),
          0,
        );

        setBotReply(
          `📚 *Student Information*\n\n*Name:* ${student.fullName}\n*Adm. No.:* ${student.admNo}\n*Class:* ${student.class}-${student.section}\n\n📊 *Attendance*\nPresent: ${present}/${total} days (${pct}%)\n\n💰 *Fees*\nPending Balance: ₹${pendingBalance.toLocaleString("en-IN")}\n\n_Powered by SHUBH SCHOOL ERP_`,
        );
      }
      setLoading(false);
    }, 800);
  }, [testAdmNo, getData]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-base">WhatsApp Auto-Reply Bot</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Parents send admission number to get attendance &amp; fees summary
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {botEnabled ? "Bot Active" : "Bot Inactive"}
            </span>
            <Switch
              checked={botEnabled}
              onCheckedChange={handleToggle}
              data-ocid="bot-toggle"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 space-y-1">
          <p className="font-semibold">⚠️ Server-side setup required</p>
          <p>
            The actual auto-reply bot requires a WhatsApp webhook configured on
            your server at{" "}
            <code className="bg-amber-100 px-1 rounded">
              https://shubh.psmkgs.com/api/index.php?route=whatsapp/webhook
            </code>
            . The toggle above stores the preference — enable it and configure
            the webhook on your cPanel server.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Test Bot Response</p>
          <div className="flex gap-2">
            <Input
              placeholder="Enter Admission No. (e.g. ADM001)"
              value={testAdmNo}
              onChange={(e) => setTestAdmNo(e.target.value)}
              className="flex-1"
              data-ocid="bot-test-input"
            />
            <Button
              onClick={handleTest}
              disabled={loading || !testAdmNo.trim()}
              data-ocid="bot-test-btn"
            >
              {loading ? "Checking…" : "Simulate Reply"}
            </Button>
          </div>
        </div>

        {botReply && (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="bg-green-600 px-4 py-2.5 flex items-center gap-2">
              <Bot className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-medium">
                WhatsApp Bot Reply Preview
              </span>
            </div>
            <div className="bg-[#ECE5DD] p-4">
              <div className="bg-white rounded-lg px-4 py-3 shadow-sm max-w-sm">
                <p className="text-sm whitespace-pre-line">{botReply}</p>
                <p className="text-xs text-muted-foreground mt-1.5 text-right">
                  {new Date().toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  ✓✓
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── RCS Tab ───────────────────────────────────────────────────────────────────
function RcsCardPreview({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden max-w-sm">
      <div className="bg-primary/10 border-b border-border px-4 py-2 flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
          <span className="text-primary-foreground text-xs font-bold">S</span>
        </div>
        <div>
          <p className="text-xs font-semibold">SHUBH SCHOOL ERP</p>
          <p className="text-xs text-muted-foreground">Verified Business</p>
        </div>
        <Badge className="ml-auto text-xs bg-accent/20 text-accent-foreground border-0">
          RCS
        </Badge>
      </div>
      <div className="p-4">
        <p className="text-sm leading-relaxed">
          {message || "Your message will appear here…"}
        </p>
      </div>
      <div className="border-t border-border grid grid-cols-2 divide-x divide-border">
        <button
          type="button"
          className="text-xs text-primary font-medium py-2.5 hover:bg-primary/5 transition-colors"
        >
          📞 Call School
        </button>
        <button
          type="button"
          className="text-xs text-primary font-medium py-2.5 hover:bg-primary/5 transition-colors"
        >
          🌐 Visit Portal
        </button>
      </div>
    </div>
  );
}

function RcsTab() {
  const { addNotification } = useApp();
  const [recipientType, setRecipientType] = useState("all_parents");
  const [selectedTemplate, setSelectedTemplate] = useState("general_notice");
  const [message, setMessage] = useState("");
  const [rcsLogs, setRcsLogs] = useState<RcsLog[]>(() =>
    ls.get<RcsLog[]>("rcs_logs", []),
  );
  const [sending, setSending] = useState(false);

  const rcsTplText =
    MSG_TEMPLATES.find((t) => t.key === selectedTemplate)?.text ?? "";
  useEffect(() => {
    setMessage(rcsTplText);
  }, [rcsTplText]);

  const handleSend = () => {
    if (!message.trim()) return;
    setSending(true);
    setTimeout(() => {
      const label =
        RECIPIENT_OPTIONS.find((o) => o.value === recipientType)?.label ??
        recipientType;
      const log: RcsLog = {
        id: generateId(),
        to: label,
        message: message.slice(0, 120),
        status: "sent",
        timestamp: Date.now(),
      };
      const updated = [log, ...rcsLogs].slice(0, 100);
      setRcsLogs(updated);
      ls.set("rcs_logs", updated);
      setSending(false);
      addNotification(`RCS message sent to ${log.to}`, "success", "📱");
    }, 1200);
  };

  return (
    <Card>
      <CardContent className="pt-5 space-y-5">
        <div className="flex items-center gap-2 p-3 bg-accent/10 rounded-lg border border-accent/30 text-sm">
          <Smartphone className="w-4 h-4 text-accent-foreground shrink-0" />
          <span className="text-muted-foreground">
            <strong className="text-foreground">Google RCS</strong> — Sending is
            simulated. Recipients see rich card format with action buttons.
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Send To</Label>
                <Select value={recipientType} onValueChange={setRecipientType}>
                  <SelectTrigger data-ocid="rcs-recipient-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECIPIENT_OPTIONS.slice(0, 4).map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Template</Label>
                <Select
                  value={selectedTemplate}
                  onValueChange={setSelectedTemplate}
                >
                  <SelectTrigger data-ocid="rcs-template-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MSG_TEMPLATES.map((t) => (
                      <SelectItem key={t.key} value={t.key}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Compose RCS message..."
                data-ocid="rcs-message-input"
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {message.length} characters
              </p>
            </div>
            <Button
              onClick={handleSend}
              disabled={sending || !message.trim()}
              data-ocid="rcs-send-btn"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? "Sending..." : "Send via RCS"}
            </Button>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Rich Card Preview
            </Label>
            <RcsCardPreview message={message} />
          </div>
        </div>
        {rcsLogs.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-sm font-semibold">Recent Sends</p>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-semibold">Time</th>
                    <th className="text-left p-3 font-semibold">Recipient</th>
                    <th className="text-left p-3 font-semibold">Message</th>
                    <th className="text-left p-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rcsLogs.slice(0, 10).map((l) => (
                    <tr
                      key={l.id}
                      className="border-t border-border hover:bg-muted/20"
                    >
                      <td className="p-3 text-muted-foreground whitespace-nowrap text-xs">
                        {new Date(l.timestamp).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 text-sm">{l.to}</td>
                      <td className="p-3 max-w-xs">
                        <span className="line-clamp-1 text-xs">
                          {l.message}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge className="bg-accent/20 text-accent-foreground border-0 text-xs">
                          ✓ Delivered
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Notification Scheduler Tab ────────────────────────────────────────────────
function SchedulerTab() {
  const { getData, saveData, addNotification } = useApp();
  const contextScheduler = getData("notificationScheduler") as NotifSchedule[];
  const [schedules, setSchedules] = useState<NotifSchedule[]>(() => {
    const local = ls.get<NotifSchedule[]>(
      "notification_scheduler",
      DEFAULT_SCHEDULES,
    );
    return contextScheduler.length > 0 ? contextScheduler : local;
  });
  const [saved, setSaved] = useState(false);

  const update = (
    id: string,
    field: keyof NotifSchedule,
    value: string | boolean,
  ) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    );
    setSaved(false);
  };

  const handleSave = async () => {
    await saveData("notificationScheduler", {
      id: "scheduler_config",
      schedules,
    } as unknown as Record<string, unknown>);
    ls.set("notification_scheduler", schedules);
    setSaved(true);
    addNotification("Notification scheduler settings saved", "success", "⏰");
    setTimeout(() => setSaved(false), 3000);
  };

  const channelColors: Record<string, string> = {
    whatsapp: "bg-green-50 text-green-700 border-green-200",
    rcs: "bg-blue-50 text-blue-700 border-blue-200",
    both: "bg-purple-50 text-purple-700 border-purple-200",
  };
  const channelLabel: Record<string, string> = {
    whatsapp: "📱 WhatsApp",
    rcs: "💬 RCS",
    both: "📱 WhatsApp + RCS",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-base">Automated Notifications</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configure when and how notifications are auto-sent
            </p>
          </div>
          <Button
            onClick={handleSave}
            variant={saved ? "secondary" : "default"}
            data-ocid="scheduler-save-btn"
          >
            {saved ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2 text-green-600" /> Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" /> Save Settings
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {schedules.map((s) => (
            <div
              key={s.id}
              className={`rounded-xl border p-4 transition-smooth ${s.enabled ? "border-primary/20 bg-card shadow-subtle" : "border-border bg-muted/20 opacity-70"}`}
              data-ocid={`scheduler-card-${s.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg">{s.icon}</span>
                    <span className="font-semibold text-sm">{s.event}</span>
                    {s.enabled && (
                      <Badge className="text-xs bg-primary/10 text-primary border-0">
                        Active
                      </Badge>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border font-medium ${channelColors[s.channel]}`}
                    >
                      {channelLabel[s.channel]}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Timing
                      </Label>
                      <Input
                        value={s.timing}
                        onChange={(e) => update(s.id, "timing", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Recipient Group
                      </Label>
                      <Select
                        value={
                          RECIPIENT_OPTIONS.find(
                            (o) => o.label === s.recipients,
                          )?.value ?? "all_parents"
                        }
                        onValueChange={(v) =>
                          update(
                            s.id,
                            "recipients",
                            RECIPIENT_OPTIONS.find((o) => o.value === v)
                              ?.label ?? v,
                          )
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder={s.recipients} />
                        </SelectTrigger>
                        <SelectContent>
                          {RECIPIENT_OPTIONS.slice(0, 4).map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                          <SelectItem value="all">All</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Channel
                      </Label>
                      <Select
                        value={s.channel}
                        onValueChange={(v) => update(s.id, "channel", v)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="rcs">Google RCS</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {s.enabled && (
                    <p className="text-xs text-muted-foreground italic">
                      ✓ Auto-send active: will notify{" "}
                      <strong>{s.recipients}</strong> via{" "}
                      <strong>{channelLabel[s.channel]}</strong> — {s.timing}
                    </p>
                  )}
                </div>
                <Switch
                  checked={s.enabled}
                  onCheckedChange={(v) => update(s.id, "enabled", v)}
                  data-ocid={`scheduler-toggle-${s.id}`}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <Button
            onClick={handleSave}
            variant={saved ? "secondary" : "default"}
            data-ocid="scheduler-save-bottom-btn"
          >
            {saved ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2 text-green-600" /> Settings
                Saved
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" /> Save Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Groups Tab ────────────────────────────────────────────────────────────────
interface ChatGroupItem {
  id: number;
  name: string;
  type: "class_group" | "route_group";
  member_count: number;
}

function GroupsTab() {
  const { currentUser, addNotification } = useApp();
  const [groups, setGroups] = useState<ChatGroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const apiBase =
    localStorage.getItem("shubh_erp_api_url") ?? "https://shubh.psmkgs.com/api";
  const token = localStorage.getItem("shubh_erp_auth_token") ?? "";

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/index.php?route=chat/groups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { data: ChatGroupItem[] };
      setGroups(data.data ?? []);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase, token]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(
        `${apiBase}/index.php?route=chat/groups/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addNotification("Chat groups generated successfully", "success", "💬");
      await fetchGroups();
    } catch {
      addNotification(
        "Failed to generate groups. Check server connection.",
        "error",
        "❌",
      );
    } finally {
      setGenerating(false);
    }
  };

  const canManage =
    currentUser?.role === "superadmin" || currentUser?.role === "admin";
  const classGroups = groups.filter((g) => g.type === "class_group");
  const routeGroups = groups.filter((g) => g.type === "route_group");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-base">Chat Groups</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Auto-generated groups for class/section and transport routes
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchGroups}
              disabled={loading}
              data-ocid="groups-refresh-btn"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`}
              />{" "}
              Refresh
            </Button>
            {canManage && (
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={generating}
                data-ocid="groups-generate-btn"
              >
                <Users className="w-3.5 h-3.5 mr-1.5" />
                {generating ? "Generating…" : "Generate All Groups"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-14 gap-3 text-muted-foreground"
            data-ocid="groups.empty_state"
          >
            <Users className="w-10 h-10 opacity-20" />
            <p className="text-sm">No chat groups yet.</p>
            {canManage && (
              <p className="text-xs">
                Click "Generate All Groups" to create class and route groups
                automatically.
              </p>
            )}
          </div>
        ) : (
          <>
            {classGroups.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Class Groups ({classGroups.length})
                </p>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-semibold">
                          Group Name
                        </th>
                        <th className="text-left p-3 font-semibold">Type</th>
                        <th className="text-right p-3 font-semibold">
                          Members
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {classGroups.map((g, i) => (
                        <tr
                          key={g.id}
                          className="border-t border-border hover:bg-muted/20"
                          data-ocid={`class-group.item.${i + 1}`}
                        >
                          <td className="p-3 font-medium">{g.name}</td>
                          <td className="p-3">
                            <Badge className="bg-teal-100 text-teal-700 border-0 text-xs">
                              Class Group
                            </Badge>
                          </td>
                          <td className="p-3 text-right font-mono text-sm">
                            {g.member_count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {routeGroups.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Route Groups ({routeGroups.length})
                </p>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-semibold">
                          Group Name
                        </th>
                        <th className="text-left p-3 font-semibold">Type</th>
                        <th className="text-right p-3 font-semibold">
                          Members
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {routeGroups.map((g, i) => (
                        <tr
                          key={g.id}
                          className="border-t border-border hover:bg-muted/20"
                          data-ocid={`route-group.item.${i + 1}`}
                        >
                          <td className="p-3 font-medium">{g.name}</td>
                          <td className="p-3">
                            <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">
                              Route Group
                            </Badge>
                          </td>
                          <td className="p-3 text-right font-mono text-sm">
                            {g.member_count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
interface CommunicationProps {
  initialTab?: string;
}

export default function Communication({ initialTab }: CommunicationProps) {
  // Expose imported utilities to prevent lint removal
  void buildFeesDueMessage;
  void buildAbsentMessage;
  void buildBirthdayMessage;

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-display">Communication</h1>
          <p className="text-sm text-muted-foreground">
            Send messages and schedule automated notifications
          </p>
        </div>
      </div>

      <Tabs defaultValue={initialTab ?? "whatsapp"} className="w-full">
        <TabsList
          className="flex flex-wrap h-auto gap-1 p-1"
          data-ocid="comm-tabs"
        >
          <TabsTrigger
            value="whatsapp"
            data-ocid="tab-whatsapp"
            className="flex items-center gap-1.5"
          >
            <MessageSquare className="w-4 h-4" /> WhatsApp
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            data-ocid="tab-notifications"
            className="flex items-center gap-1.5"
          >
            <Bell className="w-4 h-4" /> Notifications
          </TabsTrigger>
          <TabsTrigger
            value="bot"
            data-ocid="tab-bot"
            className="flex items-center gap-1.5"
          >
            <Bot className="w-4 h-4" /> WA Bot
          </TabsTrigger>
          <TabsTrigger
            value="rcs"
            data-ocid="tab-rcs"
            className="flex items-center gap-1.5"
          >
            <Smartphone className="w-4 h-4" /> Google RCS
          </TabsTrigger>
          <TabsTrigger
            value="scheduler"
            data-ocid="tab-scheduler"
            className="flex items-center gap-1.5"
          >
            <Clock className="w-4 h-4" /> Scheduler
          </TabsTrigger>
          <TabsTrigger
            value="groups"
            data-ocid="tab-groups"
            className="flex items-center gap-1.5"
          >
            <Users className="w-4 h-4" /> Groups
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="mt-4">
          <WhatsAppTab />
        </TabsContent>
        <TabsContent value="notifications" className="mt-4">
          <NotificationsTab />
        </TabsContent>
        <TabsContent value="bot" className="mt-4">
          <WhatsAppBotTab />
        </TabsContent>
        <TabsContent value="rcs" className="mt-4">
          <RcsTab />
        </TabsContent>
        <TabsContent value="scheduler" className="mt-4">
          <SchedulerTab />
        </TabsContent>
        <TabsContent value="groups" className="mt-4">
          <GroupsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
