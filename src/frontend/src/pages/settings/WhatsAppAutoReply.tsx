import {
  AlertCircle,
  Bot,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  MessageSquare,
  Play,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { Textarea } from "../../components/ui/textarea";
import type { AttendanceRecord, FeeReceipt, Student } from "../../types";
import { getApiIndexUrl, getJwt } from "../../utils/api";
import {
  MONTHS,
  formatCurrency,
  generateId,
  ls,
} from "../../utils/localStorage";

async function saveAutoReplyToServer(
  settings: AutoReplySettings & { whatsappBotEnabled?: boolean },
): Promise<void> {
  try {
    const token = getJwt();
    const url = getApiIndexUrl();
    await fetch(`${url}?route=school_settings/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        key: "whatsapp_autoreply",
        whatsappBotEnabled: settings.enabled,
        ...settings,
      }),
    });
  } catch {
    // fail silently
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AutoReplySettings {
  enabled: boolean;
  botName: string;
  monitoredNumber: string;
  responseTemplate: string;
}

export interface AutoReplyLogEntry {
  id: string;
  timestamp: number;
  parentMobile: string; // masked
  admNo: string;
  studentFound: boolean;
  replyStatus: "sent" | "failed" | "not_found";
  studentName?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_TEMPLATE = `🏫 *{botName}*

Dear Parent,

Student Details for Adm. No. *{admNo}*:
👤 *Name:* {studentName}
🎓 *Class:* {className}

📅 *Attendance (This Month):*
Present: {presentDays} / {totalDays} days ({attendancePercent}%)

💰 *Fee Status:*
Total Due: {dueAmount}
Pending Months: {pendingMonths}
Last Payment: {lastPaymentDate} — {lastPaymentAmount}

For help contact: {schoolPhone}

_Sent automatically by {botName}_`;

const DEFAULT_SETTINGS: AutoReplySettings = {
  enabled: false,
  botName: "SHUBH SCHOOL BOT",
  monitoredNumber: "",
  responseTemplate: DEFAULT_TEMPLATE,
};

// ─── Helper: Build auto-reply message ─────────────────────────────────────────

export function buildAutoReplyMessage(
  admNo: string,
  overrideTemplate?: string,
): {
  message: string | null;
  studentFound: boolean;
  studentName?: string;
} {
  const students = ls.get<Student[]>("students", []);
  const student = students.find(
    (s) => s.admNo.trim().toLowerCase() === admNo.trim().toLowerCase(),
  );
  if (!student) return { message: null, studentFound: false };

  const schoolProfile = ls.get<{ name: string; phone: string }>(
    "school_profile",
    { name: "SHUBH SCHOOL", phone: "" },
  );
  const settings = ls.get<AutoReplySettings>(
    "wa_autoreply_settings",
    DEFAULT_SETTINGS,
  );

  // Attendance this month
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const allAttendance = ls.get<AttendanceRecord[]>("attendance", []);
  const monthAttendance = allAttendance.filter(
    (r) =>
      r.studentId === student.id &&
      r.type === "student" &&
      r.date.startsWith(currentMonthStr),
  );
  const presentDays = monthAttendance.filter(
    (r) => r.status === "Present" || r.status === "Late",
  ).length;
  const totalDays = monthAttendance.length || 1;
  const attendancePercent = Math.round((presentDays / totalDays) * 100);

  // Fees calculation
  const allReceipts = ls
    .get<FeeReceipt[]>("fee_receipts", [])
    .filter((r) => !r.isDeleted && r.studentId === student.id);
  const paidMonths = new Set<string>(
    allReceipts.flatMap((r) => r.items.map((i) => i.month)),
  );

  // Pending months up to current calendar month
  const calMonthIdx = now.getMonth(); // 0=Jan
  const academicMonthIdx = calMonthIdx >= 3 ? calMonthIdx - 3 : calMonthIdx + 9;
  const monthsDue = MONTHS.slice(0, academicMonthIdx + 1).filter(
    (m) => !paidMonths.has(m),
  );

  // Rough due amount: sum fee plan amounts for student class/section × pending months
  const feesPlan = ls.get<
    Array<{ classId: string; sectionId: string; amount: number }>
  >("fees_plan", []);
  const classPlans = feesPlan.filter(
    (p) => p.classId === student.class && p.sectionId === student.section,
  );
  const monthlyFee = classPlans.reduce((sum, p) => sum + (p.amount || 0), 0);
  const dueAmount = monthlyFee * monthsDue.length;

  // Last payment
  const sorted = [...allReceipts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const lastReceipt = sorted[0];
  const lastPaymentDate = lastReceipt ? lastReceipt.date : "No payment yet";
  const lastPaymentAmount = lastReceipt
    ? formatCurrency(lastReceipt.paidAmount ?? lastReceipt.totalAmount)
    : "—";

  const tpl = overrideTemplate ?? settings.responseTemplate;

  const message = tpl
    .replace(/{botName}/g, settings.botName || "SHUBH SCHOOL BOT")
    .replace(/{admNo}/g, student.admNo)
    .replace(/{studentName}/g, student.fullName)
    .replace(/{className}/g, `${student.class}-${student.section}`)
    .replace(/{presentDays}/g, String(presentDays))
    .replace(/{totalDays}/g, String(totalDays))
    .replace(/{attendancePercent}/g, String(attendancePercent))
    .replace(/{dueAmount}/g, formatCurrency(dueAmount))
    .replace(
      /{pendingMonths}/g,
      monthsDue.length > 0 ? monthsDue.join(", ") : "None",
    )
    .replace(/{lastPaymentDate}/g, lastPaymentDate)
    .replace(/{lastPaymentAmount}/g, lastPaymentAmount)
    .replace(/{schoolPhone}/g, schoolProfile.phone || "N/A");

  return { message, studentFound: true, studentName: student.fullName };
}

// ─── Log helpers ──────────────────────────────────────────────────────────────

function getLogs(): AutoReplyLogEntry[] {
  return ls.get<AutoReplyLogEntry[]>("wa_autoreply_log", []);
}
function addLog(entry: Omit<AutoReplyLogEntry, "id">): void {
  const logs = getLogs();
  logs.unshift({ ...entry, id: generateId() });
  ls.set("wa_autoreply_log", logs.slice(0, 20));
}
function clearLogs(): void {
  ls.set("wa_autoreply_log", []);
}

// ─── Placeholder reference ────────────────────────────────────────────────────

const PLACEHOLDERS = [
  { key: "{botName}", desc: "Bot name from settings" },
  { key: "{admNo}", desc: "Student admission number" },
  { key: "{studentName}", desc: "Student full name" },
  { key: "{className}", desc: "Class & section" },
  { key: "{presentDays}", desc: "Days present this month" },
  { key: "{totalDays}", desc: "Total school days this month" },
  { key: "{attendancePercent}", desc: "Attendance percentage" },
  { key: "{dueAmount}", desc: "Total fee due amount" },
  { key: "{pendingMonths}", desc: "Months with pending fees" },
  { key: "{lastPaymentDate}", desc: "Date of last fee payment" },
  { key: "{lastPaymentAmount}", desc: "Amount of last payment" },
  { key: "{schoolPhone}", desc: "School phone from Settings" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function WhatsAppAutoReply() {
  const [settings, setSettings] = useState<AutoReplySettings>(DEFAULT_SETTINGS);
  const [logs, setLogs] = useState<AutoReplyLogEntry[]>([]);
  const [simulateAdmNo, setSimulateAdmNo] = useState("");
  const [simulateResult, setSimulateResult] = useState<{
    message: string | null;
    studentFound: boolean;
    studentName?: string;
  } | null>(null);
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPlaceholders, setShowPlaceholders] = useState(false);

  useEffect(() => {
    setSettings(
      ls.get<AutoReplySettings>("wa_autoreply_settings", DEFAULT_SETTINGS),
    );
    setLogs(getLogs());
  }, []);

  function save() {
    ls.set("wa_autoreply_settings", settings);
    void saveAutoReplyToServer(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function update<K extends keyof AutoReplySettings>(
    key: K,
    value: AutoReplySettings[K],
  ) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function handleSimulate() {
    if (!simulateAdmNo.trim()) return;
    const result = buildAutoReplyMessage(
      simulateAdmNo.trim(),
      settings.responseTemplate,
    );
    setSimulateResult(result);

    addLog({
      timestamp: Date.now(),
      parentMobile: "***SIMULATED***",
      admNo: simulateAdmNo.trim(),
      studentFound: result.studentFound,
      replyStatus: result.studentFound ? "sent" : "not_found",
      studentName: result.studentName,
    });
    setLogs(getLogs());
  }

  function handlePreview() {
    const sample = settings.responseTemplate
      .replace(/{botName}/g, settings.botName || "SHUBH SCHOOL BOT")
      .replace(/{admNo}/g, "ADM2024001")
      .replace(/{studentName}/g, "Aarav Sharma")
      .replace(/{className}/g, "5-A")
      .replace(/{presentDays}/g, "18")
      .replace(/{totalDays}/g, "22")
      .replace(/{attendancePercent}/g, "82")
      .replace(/{dueAmount}/g, "₹2,400")
      .replace(/{pendingMonths}/g, "May, June")
      .replace(/{lastPaymentDate}/g, "10/04/2026")
      .replace(/{lastPaymentAmount}/g, "₹1,200")
      .replace(/{schoolPhone}/g, "9876543210");
    setPreviewMessage(sample);
    setShowPreview(true);
  }

  function resetTemplate() {
    update("responseTemplate", DEFAULT_TEMPLATE);
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              WhatsApp Auto-Reply Bot
            </h2>
            <p className="text-xs text-muted-foreground">
              Auto-reply with student attendance & fees when parents send
              admission number
            </p>
          </div>
        </div>
        <Button
          onClick={save}
          data-ocid="wa-autoreply-save"
          className="gap-2"
          size="sm"
        >
          {saved ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saved ? "Saved!" : "Save Settings"}
        </Button>
      </div>

      {/* Enable / Disable */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-sm text-foreground">
              Enable Auto-Reply Bot
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              When enabled, the bot monitors incoming messages and replies
              automatically
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(v) => update("enabled", v)}
            data-ocid="wa-autoreply-toggle"
          />
        </CardContent>
      </Card>

      {/* Bot Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            Bot Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="bot-name" className="text-xs">
                Bot Name
              </Label>
              <Input
                id="bot-name"
                data-ocid="wa-autoreply-botname"
                value={settings.botName}
                onChange={(e) => update("botName", e.target.value)}
                placeholder="SHUBH SCHOOL BOT"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="monitored-number" className="text-xs">
                School's WhatsApp Number (Monitored)
              </Label>
              <Input
                id="monitored-number"
                data-ocid="wa-autoreply-number"
                value={settings.monitoredNumber}
                onChange={(e) => update("monitoredNumber", e.target.value)}
                placeholder="e.g. 9876543210"
              />
            </div>
          </div>

          {/* Template */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Message Template</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setShowPlaceholders((v) => !v)}
                >
                  {showPlaceholders ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                  Variables
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={resetTemplate}
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={handlePreview}
                  data-ocid="wa-autoreply-preview"
                >
                  <Eye className="w-3 h-3" />
                  Preview
                </Button>
              </div>
            </div>

            {showPlaceholders && (
              <div className="bg-muted/40 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {PLACEHOLDERS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    title={p.desc}
                    onClick={() =>
                      update(
                        "responseTemplate",
                        settings.responseTemplate + p.key,
                      )
                    }
                    className="text-left px-2 py-1 rounded text-xs font-mono bg-card border border-border hover:border-primary hover:text-primary transition-colors"
                  >
                    {p.key}
                    <span className="block text-muted-foreground font-sans text-[10px] truncate">
                      {p.desc}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <Textarea
              data-ocid="wa-autoreply-template"
              value={settings.responseTemplate}
              onChange={(e) => update("responseTemplate", e.target.value)}
              rows={12}
              className="font-mono text-xs leading-relaxed"
              placeholder="Enter message template..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {showPreview && previewMessage && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowPreview(false)}
          onKeyDown={(e) => e.key === "Escape" && setShowPreview(false)}
          role="presentation"
        >
          <div className="bg-card border border-border rounded-2xl shadow-xl max-w-sm w-full p-0 overflow-hidden">
            {/* WhatsApp header */}
            <div className="bg-green-600 text-white px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-sm">
                  {settings.botName || "SHUBH SCHOOL BOT"}
                </p>
                <p className="text-xs opacity-80">Auto-Reply Preview</p>
              </div>
              <button
                type="button"
                className="ml-auto text-white/70 hover:text-white"
                onClick={() => setShowPreview(false)}
              >
                ✕
              </button>
            </div>
            {/* Bubble */}
            <div className="bg-[#e5ddd5] p-4 min-h-32">
              <div className="bg-white rounded-xl rounded-tl-none shadow-sm p-3 max-w-[90%]">
                <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed text-foreground">
                  {previewMessage}
                </pre>
                <p className="text-[10px] text-muted-foreground text-right mt-1">
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
      )}

      {/* Simulate Reply */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Play className="w-4 h-4 text-primary" />
            Incoming Message Simulation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Enter a student admission number to test what reply would be sent,
            using real data from the ERP.
          </p>
          <div className="flex gap-2">
            <Input
              data-ocid="wa-autoreply-simulate-input"
              value={simulateAdmNo}
              onChange={(e) => setSimulateAdmNo(e.target.value)}
              placeholder="Enter Admission No. (e.g. ADM2024001)"
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleSimulate()}
            />
            <Button
              data-ocid="wa-autoreply-simulate-btn"
              onClick={handleSimulate}
              disabled={!simulateAdmNo.trim()}
              className="gap-2"
            >
              <Play className="w-4 h-4" />
              Simulate
            </Button>
          </div>

          {simulateResult && (
            <div
              className={`rounded-xl border p-4 ${
                simulateResult.studentFound
                  ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900"
                  : "bg-destructive/5 border-destructive/30"
              }`}
            >
              {simulateResult.studentFound ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                      Student Found: {simulateResult.studentName}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 font-medium">
                    Reply that would be sent:
                  </p>
                  <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed bg-card rounded-lg p-3 border border-border text-foreground">
                    {simulateResult.message}
                  </pre>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <span className="text-xs text-destructive font-medium">
                    No student found with Admission No. "{simulateAdmNo}".
                    Reply: "Student not found."
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversation Log */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              Conversation Log
            </CardTitle>
            {logs.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive gap-1"
                onClick={() => {
                  clearLogs();
                  setLogs([]);
                }}
                data-ocid="wa-autoreply-clear-log"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No conversation log yet</p>
              <p className="text-xs mt-1">
                Simulate a reply above to see entries here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                      Date/Time
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                      Parent Mobile
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                      Adm. No.
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                      Student
                    </th>
                    <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">
                      Found?
                    </th>
                    <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => (
                    <tr
                      key={log.id}
                      className={`border-b border-border last:border-0 ${idx % 2 === 0 ? "" : "bg-muted/20"}`}
                    >
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">
                        {log.parentMobile}
                      </td>
                      <td className="px-4 py-2.5 font-mono font-medium">
                        {log.admNo}
                      </td>
                      <td className="px-4 py-2.5">{log.studentName ?? "—"}</td>
                      <td className="px-4 py-2.5 text-center">
                        {log.studentFound ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-500 mx-auto" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-destructive mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge
                          variant={
                            log.replyStatus === "sent"
                              ? "default"
                              : log.replyStatus === "failed"
                                ? "destructive"
                                : "secondary"
                          }
                          className="text-[10px] px-1.5 py-0"
                        >
                          {log.replyStatus === "not_found"
                            ? "not found"
                            : log.replyStatus}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4 space-y-2">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            How the WhatsApp Bot Works
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>
              Parent sends a WhatsApp message containing the student's admission
              number to the school's monitored number
            </li>
            <li>
              The bot detects the admission number pattern and looks up the
              student in the ERP
            </li>
            <li>
              Auto-reply is sent with attendance summary and fee status using
              real ERP data
            </li>
            <li>
              All interactions are logged in the conversation log (last 20
              entries)
            </li>
            <li>
              Use "Simulate Reply" above to test what reply will be generated
              for any student
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
