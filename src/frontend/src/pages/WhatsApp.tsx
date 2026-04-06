import { Badge } from "@/components/ui/badge";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const WA_GREEN = "#25D366";
const DARK_CARD = "#1a1f2e";
const BORDER = "#374151";

const NOTIFICATION_TYPES = [
  "Fees Reminder",
  "Fee Receipt",
  "Admission Confirmation",
  "Exam Schedule",
  "Holiday Notice",
] as const;

type NotifType = (typeof NOTIFICATION_TYPES)[number];

const VARIABLE_CHIPS = [
  "{parent_name}",
  "{student_name}",
  "{adm_no}",
  "{amount}",
  "{date}",
  "{class}",
  "{due_date}",
  "{exam_name}",
  "{holiday_name}",
];

const DEFAULT_TEMPLATES: Record<NotifType, string> = {
  "Fees Reminder":
    "Dear {parent_name}, fees of \u20B9{amount} for {student_name} (Adm. No. {adm_no}) are due on {due_date}. Please pay promptly. - School Admin",
  "Fee Receipt":
    "Dear {parent_name}, payment of \u20B9{amount} received for {student_name} (Adm. No. {adm_no}) on {date}. Thank you! - School Admin",
  "Admission Confirmation":
    "Dear {parent_name}, {student_name} has been admitted to {class}. Admission No. is {adm_no}. Welcome to our school family! - School Admin",
  "Exam Schedule":
    "Dear {parent_name}, {exam_name} exam schedule for {student_name} ({class}) starts on {date}. Please check the school portal for details. - School Admin",
  "Holiday Notice":
    "Dear Parent, {holiday_name} holiday is declared on {date}. School will remain closed. - School Admin",
};

interface Student {
  admNo: string;
  name: string;
  parentName: string;
  mobile: string;
  classVal: string;
  section: string;
  dueAmount?: string;
  dueDate?: string;
}

const DUMMY_STUDENTS: Student[] = [
  {
    admNo: "ADM001",
    name: "Aarav Sharma",
    parentName: "Rajesh Sharma",
    mobile: "9876543210",
    classVal: "10",
    section: "A",
    dueAmount: "12500",
    dueDate: "31 Jan 2026",
  },
  {
    admNo: "ADM002",
    name: "Priya Verma",
    parentName: "Suresh Verma",
    mobile: "9876543211",
    classVal: "10",
    section: "B",
    dueAmount: "8400",
    dueDate: "31 Jan 2026",
  },
  {
    admNo: "ADM003",
    name: "Rohan Gupta",
    parentName: "Manoj Gupta",
    mobile: "9876543212",
    classVal: "9",
    section: "A",
    dueAmount: "15000",
    dueDate: "28 Feb 2026",
  },
  {
    admNo: "ADM004",
    name: "Simran Kaur",
    parentName: "Harpreet Kaur",
    mobile: "9876543213",
    classVal: "9",
    section: "B",
    dueAmount: "9800",
    dueDate: "28 Feb 2026",
  },
  {
    admNo: "ADM005",
    name: "Arjun Patel",
    parentName: "Dinesh Patel",
    mobile: "9876543214",
    classVal: "8",
    section: "A",
    dueAmount: "11200",
    dueDate: "15 Feb 2026",
  },
];

interface LogEntry {
  id: string;
  timestamp: string;
  recipientName: string;
  mobile: string;
  type: string;
  messagePreview: string;
  status: "Simulated" | "Sent";
}

interface ChatMsg {
  id: string;
  from: "parent" | "bot";
  text: string;
  time: string;
}

const EXAMPLE_CHAT: ChatMsg[] = [
  { id: "ex-1", from: "parent", text: "ADM001", time: "10:32 AM" },
  {
    id: "ex-2",
    from: "bot",
    text: "Hi! Here are the fees details for ADM001:\nAarav Sharma - Class 10-A\nOutstanding: \u20B912,500\nDue Date: 31 Jan 2026\n\nReply RECEIPT for payment history.\nPowered by School ERP WhatsApp Bot \u{1F916}",
    time: "10:32 AM",
  },
];

function loadTemplates(): Record<NotifType, string> {
  try {
    const saved = localStorage.getItem("whatsapp_templates");
    if (saved) return { ...DEFAULT_TEMPLATES, ...JSON.parse(saved) };
  } catch {}
  return { ...DEFAULT_TEMPLATES };
}

function loadStudents(): Student[] {
  try {
    const raw = localStorage.getItem("students");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DUMMY_STUDENTS;
}

function loadLog(): LogEntry[] {
  try {
    const raw = localStorage.getItem("whatsapp_log");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function fillTemplate(template: string, student: Student): string {
  return template
    .replace(/{parent_name}/g, student.parentName)
    .replace(/{student_name}/g, student.name)
    .replace(/{adm_no}/g, student.admNo)
    .replace(/{amount}/g, student.dueAmount ?? "0")
    .replace(/{due_date}/g, student.dueDate ?? "N/A")
    .replace(/{date}/g, new Date().toLocaleDateString("en-IN"))
    .replace(/{class}/g, `Class ${student.classVal}-${student.section}`)
    .replace(/{exam_name}/g, "Annual Exam 2026")
    .replace(/{holiday_name}/g, "Republic Day");
}

export function WhatsApp() {
  const [activeTab, setActiveTab] = useState<
    "send" | "templates" | "bot" | "settings"
  >("send");

  // --- Send Notification state ---
  const [notifType, setNotifType] = useState<NotifType>("Fees Reminder");
  const [filterClass, setFilterClass] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [selectedAdmNos, setSelectedAdmNos] = useState<Set<string>>(new Set());
  const [templates, setTemplates] =
    useState<Record<NotifType, string>>(loadTemplates);
  const students = loadStudents();

  const filtered = students.filter((s) => {
    if (filterClass && s.classVal !== filterClass) return false;
    if (filterSection && s.section !== filterSection) return false;
    return true;
  });

  const allSelected =
    filtered.length > 0 && filtered.every((s) => selectedAdmNos.has(s.admNo));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedAdmNos((prev) => {
        const next = new Set(prev);
        for (const s of filtered) next.delete(s.admNo);
        return next;
      });
    } else {
      setSelectedAdmNos((prev) => {
        const next = new Set(prev);
        for (const s of filtered) next.add(s.admNo);
        return next;
      });
    }
  };

  const toggleStudent = (admNo: string) => {
    setSelectedAdmNos((prev) => {
      const next = new Set(prev);
      if (next.has(admNo)) next.delete(admNo);
      else next.add(admNo);
      return next;
    });
  };

  const handleSend = () => {
    const recipients = filtered.filter((s) => selectedAdmNos.has(s.admNo));
    if (recipients.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }
    const log = loadLog();
    for (const s of recipients) {
      const msg = fillTemplate(templates[notifType], s);
      const waUrl = `https://wa.me/91${s.mobile}?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, "_blank");
      log.unshift({
        id: `${Date.now()}-${s.admNo}`,
        timestamp: new Date().toLocaleString("en-IN"),
        recipientName: s.name,
        mobile: s.mobile,
        type: notifType,
        messagePreview: `${msg.substring(0, 60)}...`,
        status: "Simulated",
      });
    }
    localStorage.setItem("whatsapp_log", JSON.stringify(log));
    toast.success(
      `Message queued for ${recipients.length} recipient${recipients.length > 1 ? "s" : ""}`,
    );
  };

  // Preview with first selected student or first filtered
  const previewStudent =
    filtered.find((s) => selectedAdmNos.has(s.admNo)) ??
    filtered[0] ??
    DUMMY_STUDENTS[0];
  const previewText = fillTemplate(templates[notifType], previewStudent);

  // --- Templates state ---
  const [editingType, setEditingType] = useState<NotifType | null>(null);
  const [editText, setEditText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const startEdit = (type: NotifType) => {
    setEditingType(type);
    setEditText(templates[type]);
  };

  const insertChip = (chip: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = editText.substring(0, start) + chip + editText.substring(end);
    setEditText(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + chip.length, start + chip.length);
    }, 0);
  };

  const saveTemplate = () => {
    if (!editingType) return;
    const next = { ...templates, [editingType]: editText };
    setTemplates(next);
    localStorage.setItem("whatsapp_templates", JSON.stringify(next));
    setEditingType(null);
    toast.success("Template saved");
  };

  // --- Bot state ---
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>(EXAMPLE_CHAT);
  const [botInput, setBotInput] = useState("");

  const handleBotSend = () => {
    const trimmed = botInput.trim();
    if (!trimmed) return;
    const now = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const parentMsg: ChatMsg = {
      id: `p-${Date.now()}`,
      from: "parent",
      text: trimmed,
      time: now,
    };
    const upper = trimmed.toUpperCase();
    const allStudents = loadStudents();
    const found = allStudents.find((s) => s.admNo.toUpperCase() === upper);
    let reply: string;
    if (found) {
      reply = `Hi! Here are the fees details for ${found.admNo}:\n${found.name} - Class ${found.classVal}-${found.section}\nOutstanding: \u20B9${found.dueAmount ?? "0"}\nDue Date: ${found.dueDate ?? "N/A"}\n\nReply RECEIPT for payment history.\nPowered by School ERP WhatsApp Bot \u{1F916}`;
    } else if (upper === "RECEIPT") {
      reply =
        "Here is the payment history:\n• 15 Oct 2025 - \u20B95,000 (Q2 Fees)\n• 14 Jul 2025 - \u20B95,000 (Q1 Fees)\n\nFor more details, contact the school office.";
    } else {
      reply = `Sorry, I couldn't find a student with admission number "${trimmed}". Please check and try again, or contact the school office at +91-XXXXXXXXXX.`;
    }
    const botMsg: ChatMsg = {
      id: `b-${Date.now()}`,
      from: "bot",
      text: reply,
      time: now,
    };
    setChatHistory((prev) => [...prev, parentMsg, botMsg]);
    setBotInput("");
  };

  // --- Settings state ---
  const [waNumber, setWaNumber] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("whatsapp_settings") ?? "{}")
          .waNumber ?? ""
      );
    } catch {
      return "";
    }
  });
  const [apiKey, setApiKey] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("whatsapp_settings") ?? "{}").apiKey ??
        ""
      );
    } catch {
      return "";
    }
  });

  const [log, setLog] = useState<LogEntry[]>(loadLog);

  // Reload log when switching to settings tab
  useEffect(() => {
    if (activeTab === "settings") setLog(loadLog());
  }, [activeTab]);

  const saveSettings = () => {
    localStorage.setItem(
      "whatsapp_settings",
      JSON.stringify({ waNumber, apiKey }),
    );
    toast.success("Settings saved");
  };

  const clearLog = () => {
    localStorage.removeItem("whatsapp_log");
    setLog([]);
    toast.success("Log cleared");
  };

  const TABS = [
    { key: "send", label: "Send Notification" },
    { key: "templates", label: "Message Templates" },
    { key: "bot", label: "Inbound Bot" },
    { key: "settings", label: "Settings & Log" },
  ] as const;

  const classes = [...new Set(students.map((s) => s.classVal))].sort();
  const sections = [...new Set(students.map((s) => s.section))].sort();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: WA_GREEN }}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="white"
            width="18"
            height="18"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </div>
        <div>
          <h2 className="text-white text-lg font-semibold">
            WhatsApp Communication
          </h2>
          <p className="text-gray-400 text-xs">
            Simulated module — ready for WhatsApp Business API integration
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-700 pb-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            data-ocid={`whatsapp.${tab.key}.tab`}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "text-green-400 border-green-400"
                : "text-gray-400 border-transparent hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Send Notification */}
      {activeTab === "send" && (
        <div className="space-y-4">
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: DARK_CARD, border: `1px solid ${BORDER}` }}
          >
            <h3 className="text-white text-sm font-medium">
              Compose Notification
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="notif-type"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Notification Type
                </label>
                <select
                  id="notif-type"
                  value={notifType}
                  onChange={(e) => setNotifType(e.target.value as NotifType)}
                  data-ocid="whatsapp.notif_type.select"
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-green-500"
                >
                  {NOTIFICATION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="filter-class"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Filter by Class
                </label>
                <select
                  id="filter-class"
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  data-ocid="whatsapp.filter_class.select"
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-green-500"
                >
                  <option value="">All Classes</option>
                  {classes.map((c) => (
                    <option key={c} value={c}>
                      Class {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="filter-section"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Filter by Section
                </label>
                <select
                  id="filter-section"
                  value={filterSection}
                  onChange={(e) => setFilterSection(e.target.value)}
                  data-ocid="whatsapp.filter_section.select"
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-green-500"
                >
                  <option value="">All Sections</option>
                  {sections.map((s) => (
                    <option key={s} value={s}>
                      Section {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Student Table */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: DARK_CARD, border: `1px solid ${BORDER}` }}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
              <span className="text-white text-sm font-medium">
                Recipients ({filtered.length})
              </span>
              <button
                type="button"
                onClick={toggleAll}
                data-ocid="whatsapp.select_all.toggle"
                className="text-xs text-green-400 hover:text-green-300 transition-colors"
              >
                {allSelected ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="px-4 py-2 text-left w-8" />
                    <th className="px-4 py-2 text-left">Adm. No.</th>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Parent</th>
                    <th className="px-4 py-2 text-left">Mobile</th>
                    <th className="px-4 py-2 text-left">Class</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center text-gray-500 py-6"
                        data-ocid="whatsapp.recipients.empty_state"
                      >
                        No students match the selected filters
                      </td>
                    </tr>
                  ) : (
                    filtered.map((s, i) => (
                      <tr
                        key={s.admNo}
                        className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors"
                        data-ocid={`whatsapp.recipient.item.${i + 1}`}
                      >
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={selectedAdmNos.has(s.admNo)}
                            onChange={() => toggleStudent(s.admNo)}
                            data-ocid={`whatsapp.recipient.checkbox.${i + 1}`}
                            className="accent-green-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-2 text-green-400 font-mono">
                          {s.admNo}
                        </td>
                        <td className="px-4 py-2 text-white">{s.name}</td>
                        <td className="px-4 py-2 text-gray-300">
                          {s.parentName}
                        </td>
                        <td className="px-4 py-2 text-gray-300">{s.mobile}</td>
                        <td className="px-4 py-2 text-gray-300">
                          {s.classVal}-{s.section}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Message Preview */}
          <div
            className="rounded-xl p-4"
            style={{ background: DARK_CARD, border: `1px solid ${BORDER}` }}
          >
            <h3 className="text-white text-sm font-medium mb-2">
              Message Preview
            </h3>
            <div
              className="rounded-lg p-3 text-sm leading-relaxed"
              style={{ background: "#0b5d2e", color: "#dcfce7" }}
            >
              {previewText}
            </div>
            <p className="text-gray-500 text-xs mt-2">
              * Preview shows values for {previewStudent.name}. Each recipient
              gets their own personalised message.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSend}
            data-ocid="whatsapp.send.primary_button"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium transition-all hover:opacity-90 active:scale-95"
            style={{ background: WA_GREEN }}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="white"
              width="16"
              height="16"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Send via WhatsApp ({selectedAdmNos.size} selected)
          </button>
        </div>
      )}

      {/* Tab: Message Templates */}
      {activeTab === "templates" && (
        <div className="space-y-4">
          {NOTIFICATION_TYPES.map((type) => (
            <div
              key={type}
              className="rounded-xl p-4"
              style={{ background: DARK_CARD, border: `1px solid ${BORDER}` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: WA_GREEN }}
                  />
                  <h3 className="text-white text-sm font-medium">{type}</h3>
                </div>
                {editingType !== type && (
                  <button
                    type="button"
                    onClick={() => startEdit(type)}
                    data-ocid="whatsapp.template.edit_button"
                    className="text-xs px-3 py-1 rounded border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>

              {editingType === type ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {VARIABLE_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => insertChip(chip)}
                        data-ocid="whatsapp.template.chip"
                        className="px-2 py-0.5 rounded text-xs font-mono transition-colors"
                        style={{
                          background: "#1e3a2f",
                          color: WA_GREEN,
                          border: `1px solid ${WA_GREEN}40`,
                        }}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    data-ocid="whatsapp.template.textarea"
                    rows={4}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-green-500 resize-none leading-relaxed"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={saveTemplate}
                      data-ocid="whatsapp.template.save_button"
                      className="px-4 py-1.5 rounded text-white text-xs font-medium transition-opacity hover:opacity-90"
                      style={{ background: WA_GREEN }}
                    >
                      Save Template
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingType(null)}
                      data-ocid="whatsapp.template.cancel_button"
                      className="px-4 py-1.5 rounded text-gray-300 text-xs border border-gray-600 hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-300 text-xs leading-relaxed bg-gray-800/50 rounded-lg px-3 py-2">
                  {templates[type]}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab: Inbound Bot Simulator */}
      {activeTab === "bot" && (
        <div className="space-y-4">
          <div
            className="rounded-xl p-4"
            style={{ background: DARK_CARD, border: `1px solid ${BORDER}` }}
          >
            <h3 className="text-white text-sm font-semibold mb-1">
              Quick Fees Due Reply Simulator
            </h3>
            <p className="text-gray-400 text-xs">
              Simulate what a parent receives when they WhatsApp your school
              number with a student's admission number.
            </p>
          </div>

          {/* Chat window */}
          <div
            className="rounded-xl overflow-hidden flex flex-col"
            style={{
              background: "#0a1628",
              border: `1px solid ${BORDER}`,
              height: "480px",
            }}
          >
            {/* Chat header */}
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{ background: "#1f2c34" }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: WA_GREEN }}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="white"
                  width="14"
                  height="14"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <div>
                <p className="text-white text-xs font-semibold">
                  School ERP Bot
                </p>
                <p className="text-gray-400 text-[10px]">
                  Automated fees query system
                </p>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
              style={{ background: "#0b1722" }}
            >
              {chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.from === "parent" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className="max-w-xs rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-line"
                    style={{
                      background: msg.from === "parent" ? "#005c4b" : "#202c33",
                      color: msg.from === "parent" ? "#e9feec" : "#e9edef",
                      borderRadius:
                        msg.from === "parent"
                          ? "12px 2px 12px 12px"
                          : "2px 12px 12px 12px",
                    }}
                  >
                    {msg.text}
                    <span
                      className="block text-right text-[9px] mt-1"
                      style={{
                        color: msg.from === "parent" ? "#7ad3c2" : "#8696a0",
                      }}
                    >
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div
              className="flex items-center gap-2 px-3 py-2"
              style={{ background: "#1f2c34" }}
            >
              <input
                type="text"
                value={botInput}
                onChange={(e) => setBotInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBotSend()}
                placeholder="Type admission number (e.g. ADM001)..."
                data-ocid="whatsapp.bot.input"
                className="flex-1 bg-gray-700 rounded-full px-4 py-1.5 text-white text-xs outline-none placeholder-gray-500 border border-gray-600 focus:border-green-500"
              />
              <button
                type="button"
                onClick={handleBotSend}
                data-ocid="whatsapp.bot.send_button"
                className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0 transition-opacity hover:opacity-80"
                style={{ background: WA_GREEN }}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="white"
                  width="14"
                  height="14"
                >
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </div>

          <div
            className="rounded-xl p-3"
            style={{ background: "#1c2e1c", border: "1px solid #2d5a2d" }}
          >
            <p className="text-green-400 text-xs">
              💡 <strong>Try it:</strong> Type any admission number
              (ADM001–ADM005) and press Enter to see the automated reply. Type
              "RECEIPT" to see payment history.
            </p>
          </div>
        </div>
      )}

      {/* Tab: Settings & Log */}
      {activeTab === "settings" && (
        <div className="space-y-4">
          {/* Info Banner */}
          <div
            className="rounded-xl p-4 flex gap-3"
            style={{ background: "#1a2e1a", border: "1px solid #2d5a2d" }}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="#25D366"
              width="20"
              height="20"
              className="flex-shrink-0 mt-0.5"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <div>
              <p className="text-green-400 text-xs font-semibold mb-0.5">
                WhatsApp Business API Ready
              </p>
              <p className="text-green-300/80 text-xs">
                This module is ready for WhatsApp Business API integration.
                Enter your Meta WhatsApp API key below to enable real message
                delivery. All current sends are simulated.
              </p>
            </div>
          </div>

          {/* Settings Form */}
          <div
            className="rounded-xl p-5 space-y-4"
            style={{ background: DARK_CARD, border: `1px solid ${BORDER}` }}
          >
            <h3 className="text-white text-sm font-semibold">
              API Configuration
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="wa-number"
                  className="text-gray-400 text-xs block mb-1"
                >
                  WhatsApp Business Number
                </label>
                <input
                  id="wa-number"
                  type="text"
                  value={waNumber}
                  onChange={(e) => setWaNumber(e.target.value)}
                  placeholder="+91XXXXXXXXXX"
                  data-ocid="whatsapp.settings.input"
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-white text-xs outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label
                  htmlFor="api-key"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Meta API Key
                </label>
                <input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key..."
                  data-ocid="whatsapp.settings.input"
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-white text-xs outline-none focus:border-green-500"
                />
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-xs block mb-1">
                Webhook URL (read-only)
              </p>
              <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded px-3 py-1.5">
                <code className="text-green-400 text-xs flex-1 font-mono">
                  https://yourschool.ic0.app/whatsapp/webhook
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      "https://yourschool.ic0.app/whatsapp/webhook",
                    );
                    toast.success("Copied!");
                  }}
                  className="text-gray-400 hover:text-white text-xs transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={saveSettings}
              data-ocid="whatsapp.settings.save_button"
              className="px-5 py-2 rounded text-white text-xs font-medium transition-opacity hover:opacity-90"
              style={{ background: WA_GREEN }}
            >
              Save Settings
            </button>
          </div>

          {/* Message Log */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: DARK_CARD, border: `1px solid ${BORDER}` }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <h3 className="text-white text-sm font-semibold">Message Log</h3>
              <button
                type="button"
                onClick={clearLog}
                data-ocid="whatsapp.log.delete_button"
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Clear Log
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700 bg-gray-900/30">
                    <th className="px-4 py-2 text-left">Timestamp</th>
                    <th className="px-4 py-2 text-left">Recipient</th>
                    <th className="px-4 py-2 text-left">Mobile</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Message Preview</th>
                    <th className="px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {log.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center text-gray-500 py-8"
                        data-ocid="whatsapp.log.empty_state"
                      >
                        No messages sent yet. Send a notification to see the log
                        here.
                      </td>
                    </tr>
                  ) : (
                    log.map((entry, i) => (
                      <tr
                        key={entry.id}
                        className="border-b border-gray-700/50 hover:bg-gray-700/20"
                        data-ocid={`whatsapp.log.item.${i + 1}`}
                      >
                        <td className="px-4 py-2 text-gray-400">
                          {entry.timestamp}
                        </td>
                        <td className="px-4 py-2 text-white">
                          {entry.recipientName}
                        </td>
                        <td className="px-4 py-2 text-gray-300 font-mono">
                          {entry.mobile}
                        </td>
                        <td className="px-4 py-2 text-gray-300">
                          {entry.type}
                        </td>
                        <td className="px-4 py-2 text-gray-400 max-w-48 truncate">
                          {entry.messagePreview}
                        </td>
                        <td className="px-4 py-2">
                          <Badge
                            className="text-[10px] px-1.5 py-0 rounded"
                            style={{
                              background:
                                entry.status === "Sent" ? "#1a2e1a" : "#1a2430",
                              color:
                                entry.status === "Sent" ? WA_GREEN : "#60a5fa",
                              border: `1px solid ${entry.status === "Sent" ? `${WA_GREEN}40` : "#3b82f640"}`,
                            }}
                          >
                            {entry.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="pt-4 border-t border-gray-700 text-center">
        <p className="text-gray-600 text-xs">
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noreferrer"
            className="text-gray-500 hover:text-gray-400 underline"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
