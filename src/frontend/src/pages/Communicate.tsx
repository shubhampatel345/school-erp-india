import { MessageCircle, Plus, Search, Send, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Notice {
  id: number;
  title: string;
  message: string;
  target: string;
  date: string;
}

interface RCSMessage {
  id: string;
  recipient: string;
  preview: string;
  dateTime: string;
  status: "Delivered" | "Pending" | "Failed";
}

const RCS_TEMPLATES: Record<string, string> = {
  "Fee Due Reminder":
    "Dear Parent, this is a reminder that fees for {month} are due. Please pay at the earliest to avoid late charges. — SHUBH SCHOOL ERP",
  "Absent Alert":
    "Dear Parent, your child {name} was marked Absent today ({date}). Please inform the school if there is a reason. — SHUBH SCHOOL ERP",
  "Exam Timetable":
    "Dear {name}, the Exam Timetable for {exam} has been published. Please check the school portal for details. — SHUBH SCHOOL ERP",
  "Result Published":
    "Dear {name}, your exam results for {exam} are now available. Please check the school portal. — SHUBH SCHOOL ERP",
  "Birthday Wish":
    "🎂 Happy Birthday {name}! Wishing you a wonderful day filled with joy. — SHUBH SCHOOL ERP",
  "General Notice":
    "Dear Parent/Student, this is an important notice from the school. Please read the notice board or contact the office for details.",
  "Homework Reminder":
    "Dear Student, your homework for {subject} is due on {date}. Please submit on time. — SHUBH SCHOOL ERP",
  Custom: "",
};

const initialNotices: Notice[] = [];

export function Communicate() {
  const [activeTab, setActiveTab] = useState<"notice" | "rcs" | "whatsapp">(
    "notice",
  );
  const [notices, setNotices] = useState<Notice[]>(initialNotices);
  const [showModal, setShowModal] = useState(false);
  const [noticeSearch, setNoticeSearch] = useState("");
  const [form, setForm] = useState({ title: "", message: "", target: "All" });

  // RCS state
  const [rcsSendTo, setRcsSendTo] = useState("All Parents");
  const [rcsTemplate, setRcsTemplate] = useState("General Notice");
  const [rcsMessage, setRcsMessage] = useState(RCS_TEMPLATES["General Notice"]);
  const [rcsSearch, setRcsSearch] = useState("");
  const [rcsSent, setRcsSent] = useState<RCSMessage[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("erp_rcs_messages") || "[]",
      ) as RCSMessage[];
    } catch {
      return [];
    }
  });

  // Live filtered notices
  const filteredNotices = noticeSearch.trim()
    ? notices.filter(
        (n) =>
          n.title.toLowerCase().includes(noticeSearch.toLowerCase()) ||
          n.message.toLowerCase().includes(noticeSearch.toLowerCase()) ||
          n.target.toLowerCase().includes(noticeSearch.toLowerCase()),
      )
    : notices;

  const handleAdd = () => {
    if (!form.title || !form.message) return;
    const today = new Date().toLocaleDateString("en-IN");
    setNotices((prev) => [
      { id: prev.length + 1, ...form, date: today },
      ...prev,
    ]);
    setShowModal(false);
    setForm({ title: "", message: "", target: "All" });
  };

  const handleSendRCS = () => {
    if (!rcsMessage.trim()) {
      toast.error("Please enter a message.");
      return;
    }
    const newMsg: RCSMessage = {
      id: Date.now().toString(),
      recipient: rcsSendTo,
      preview:
        rcsMessage.substring(0, 80) + (rcsMessage.length > 80 ? "..." : ""),
      dateTime: new Date().toLocaleString("en-IN"),
      status: "Delivered",
    };
    setRcsSent((prev) => {
      const updated = [newMsg, ...prev];
      localStorage.setItem("erp_rcs_messages", JSON.stringify(updated));
      return updated;
    });
    toast.success(`RCS Message sent to ${rcsSendTo}!`);
  };

  const filteredRcsSent = rcsSearch.trim()
    ? rcsSent.filter(
        (m) =>
          m.recipient.toLowerCase().includes(rcsSearch.toLowerCase()) ||
          m.preview.toLowerCase().includes(rcsSearch.toLowerCase()),
      )
    : rcsSent;

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-700 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab("notice")}
          data-ocid="communicate.notice.tab"
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "notice"
              ? "text-green-400 border-green-400"
              : "text-gray-400 border-transparent hover:text-gray-200"
          }`}
        >
          Notice Board
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("rcs")}
          data-ocid="communicate.rcs.tab"
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "rcs"
              ? "text-blue-400 border-blue-400"
              : "text-gray-400 border-transparent hover:text-gray-200"
          }`}
        >
          <span className="text-blue-400">📱</span>
          RCS Messages
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("whatsapp")}
          data-ocid="communicate.whatsapp.tab"
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "whatsapp"
              ? "text-green-400 border-green-400"
              : "text-gray-400 border-transparent hover:text-gray-200"
          }`}
        >
          <MessageCircle size={12} style={{ color: "#25D366" }} />
          WhatsApp
        </button>
      </div>

      {activeTab === "notice" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white text-lg font-semibold">Notice Board</h2>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              data-ocid="communicate.notice.open_modal_button"
              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded"
            >
              <Plus size={14} /> Add Notice
            </button>
          </div>
          <div className="flex items-center bg-gray-800 border border-gray-700 rounded px-2 py-1.5 mb-3 max-w-xs">
            <Search size={12} className="text-gray-400 mr-1.5" />
            <input
              value={noticeSearch}
              onChange={(e) => setNoticeSearch(e.target.value)}
              placeholder="Search notices..."
              className="bg-transparent text-gray-300 text-xs outline-none w-full"
              data-ocid="communicate.notice.search_input"
            />
          </div>
          <div className="space-y-3">
            {filteredNotices.length === 0 && notices.length === 0 && (
              <div
                className="rounded-lg p-8 text-center text-gray-500 text-sm"
                style={{ background: "#1a1f2e", border: "1px solid #374151" }}
                data-ocid="communicate.notice.empty_state"
              >
                No notices yet. Click &ldquo;Add Notice&rdquo; to publish one.
              </div>
            )}
            {filteredNotices.map((n, i) => (
              <div
                key={n.id}
                className="rounded-lg p-4"
                style={{ background: "#1a1f2e", border: "1px solid #374151" }}
                data-ocid={`communicate.notice.item.${i + 1}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className="text-white text-sm font-medium">{n.title}</h3>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                        n.target === "All"
                          ? "bg-blue-900/50 text-blue-400"
                          : n.target === "Students"
                            ? "bg-green-900/50 text-green-400"
                            : "bg-purple-900/50 text-purple-400"
                      }`}
                    >
                      {n.target}
                    </span>
                    <span className="text-gray-500 text-xs">{n.date}</span>
                  </div>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">
                  {n.message}
                </p>
              </div>
            ))}
          </div>
          {showModal && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
              <div
                className="rounded-xl p-6 w-full max-w-md"
                style={{ background: "#1a1f2e", border: "1px solid #374151" }}
                data-ocid="communicate.notice.modal"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">Add Notice</h3>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    data-ocid="communicate.notice.close_button"
                    className="text-gray-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="comm-title"
                      className="text-gray-400 text-xs block mb-1"
                    >
                      Title
                    </label>
                    <input
                      id="comm-title"
                      value={form.title}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, title: e.target.value }))
                      }
                      data-ocid="communicate.notice.input"
                      className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="comm-target"
                      className="text-gray-400 text-xs block mb-1"
                    >
                      Target Audience
                    </label>
                    <select
                      id="comm-target"
                      value={form.target}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, target: e.target.value }))
                      }
                      data-ocid="communicate.notice.select"
                      className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none"
                    >
                      {["All", "Students", "Staff", "Parents"].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="comm-message"
                      className="text-gray-400 text-xs block mb-1"
                    >
                      Message
                    </label>
                    <textarea
                      id="comm-message"
                      value={form.message}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, message: e.target.value }))
                      }
                      rows={4}
                      data-ocid="communicate.notice.textarea"
                      className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-green-500 resize-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={handleAdd}
                    data-ocid="communicate.notice.submit_button"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded"
                  >
                    Publish
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    data-ocid="communicate.notice.cancel_button"
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs py-2 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RCS MESSAGES TAB */}
      {activeTab === "rcs" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white text-lg font-semibold">
                Google RCS Messages
              </h2>
              <p className="text-gray-500 text-xs">
                Rich Communication Services &mdash; Simulated (Google Business
                Messaging)
              </p>
            </div>
            <span className="text-xs bg-blue-900/30 text-blue-300 border border-blue-700 px-2 py-1 rounded-full">
              📡 Simulated
            </span>
          </div>

          {/* Compose Section */}
          <div
            className="rounded-xl p-4 mb-4"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <h3 className="text-white text-sm font-medium mb-3">
              Compose RCS Message
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label
                  htmlFor="rcs-send-to"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Send To
                </label>
                <select
                  id="rcs-send-to"
                  value={rcsSendTo}
                  onChange={(e) => setRcsSendTo(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-blue-500"
                  data-ocid="communicate.rcs.select"
                >
                  <option>All Parents</option>
                  <option>All Students</option>
                  <option>All Teachers</option>
                  <option>All Staff</option>
                  <option>Individual (specify below)</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="rcs-template"
                  className="text-gray-400 text-xs block mb-1"
                >
                  Message Template
                </label>
                <select
                  id="rcs-template"
                  value={rcsTemplate}
                  onChange={(e) => {
                    setRcsTemplate(e.target.value);
                    setRcsMessage(RCS_TEMPLATES[e.target.value] || "");
                  }}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs outline-none focus:border-blue-500"
                  data-ocid="communicate.rcs.select"
                >
                  {Object.keys(RCS_TEMPLATES).map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label
                htmlFor="rcs-message-text"
                className="text-gray-400 text-xs block mb-1"
              >
                Message Text
              </label>
              <textarea
                id="rcs-message-text"
                value={rcsMessage}
                onChange={(e) => setRcsMessage(e.target.value)}
                rows={4}
                placeholder="Type or edit your RCS message here..."
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-xs outline-none focus:border-blue-500 resize-none"
                data-ocid="communicate.rcs.textarea"
              />
              <p className="text-gray-600 text-[10px] mt-1">
                {rcsMessage.length} characters &bull; Use {"{name}"},{" "}
                {"{month}"}, {"{date}"} as placeholders
              </p>
            </div>
            <button
              type="button"
              onClick={handleSendRCS}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs font-medium transition"
              data-ocid="communicate.rcs.button"
            >
              <Send size={13} /> Send RCS Message
            </button>
          </div>

          {/* Sent Messages Log */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "#1a1f2e", border: "1px solid #374151" }}
          >
            <div className="p-3 border-b border-gray-700 flex items-center justify-between">
              <span className="text-white text-sm font-medium">
                Sent Messages Log
              </span>
              <div className="flex items-center bg-gray-800 rounded px-2 py-1">
                <Search size={11} className="text-gray-400 mr-1" />
                <input
                  value={rcsSearch}
                  onChange={(e) => setRcsSearch(e.target.value)}
                  placeholder="Search..."
                  className="bg-transparent text-gray-300 text-xs outline-none w-24"
                  data-ocid="communicate.rcs.search_input"
                />
              </div>
            </div>
            {filteredRcsSent.length === 0 ? (
              <div
                className="text-center py-8 text-gray-500 text-sm"
                data-ocid="communicate.rcs.empty_state"
              >
                No RCS messages sent yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr
                      style={{
                        background: "#111827",
                        borderBottom: "1px solid #1f2937",
                      }}
                    >
                      <th className="px-3 py-2 text-left text-gray-400 font-medium">
                        Recipient
                      </th>
                      <th className="px-3 py-2 text-left text-gray-400 font-medium">
                        Message Preview
                      </th>
                      <th className="px-3 py-2 text-left text-gray-400 font-medium">
                        Date/Time
                      </th>
                      <th className="px-3 py-2 text-left text-gray-400 font-medium">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRcsSent.map((m, i) => (
                      <tr
                        key={m.id}
                        style={{
                          background: i % 2 === 0 ? "#0d111c" : "#111827",
                          borderBottom: "1px solid #1f2937",
                        }}
                        data-ocid={`communicate.rcs.item.${i + 1}`}
                      >
                        <td className="px-3 py-2 text-white font-medium">
                          {m.recipient}
                        </td>
                        <td className="px-3 py-2 text-gray-400 max-w-[200px] truncate">
                          {m.preview}
                        </td>
                        <td className="px-3 py-2 text-gray-400">
                          {m.dateTime}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded border ${
                              m.status === "Delivered"
                                ? "bg-green-900/50 text-green-400 border-green-700"
                                : m.status === "Pending"
                                  ? "bg-yellow-900/50 text-yellow-400 border-yellow-700"
                                  : "bg-red-900/50 text-red-400 border-red-700"
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "whatsapp" && (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: "#1a1f2e", border: "1px solid #374151" }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "#25D366" }}
          >
            <MessageCircle size={24} className="text-white" />
          </div>
          <h3 className="text-white text-sm font-semibold mb-1">
            WhatsApp Communication Module
          </h3>
          <p className="text-gray-400 text-xs mb-4">
            Send fee reminders, receipts, admission confirmations, exam
            schedules, and holiday notices via WhatsApp.
          </p>
          <button
            type="button"
            onClick={() => {
              window.location.hash = "/whatsapp";
            }}
            data-ocid="communicate.whatsapp.primary_button"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-white text-xs font-medium transition-opacity hover:opacity-90"
            style={{ background: "#25D366" }}
          >
            <MessageCircle size={14} />
            Go to WhatsApp Module
          </button>
        </div>
      )}
    </div>
  );
}
