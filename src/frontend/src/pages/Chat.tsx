import {
  ArrowLeft,
  MessageCircle,
  Paperclip,
  Plus,
  Search,
  Send,
  Shield,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import type { ChatConversation, ChatMessage, ChatUser } from "../types";

// ── helpers ──────────────────────────────────────────────────────────────────

function getToken(): string {
  return localStorage.getItem("shubh_erp_auth_token") ?? "";
}

async function apiChat<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const apiBase =
    localStorage.getItem("shubh_erp_api_url") ?? "https://shubh.psmkgs.com/api";
  const res = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as T;
}

function formatTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "short" });
}

function formatHHMM(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const ROLE_COLORS: Record<string, string> = {
  superadmin: "bg-purple-600",
  admin: "bg-blue-600",
  teacher: "bg-teal-600",
  student: "bg-green-600",
  parent: "bg-orange-500",
  driver: "bg-yellow-600",
  default: "bg-gray-500",
};

function avatarColor(role?: string, type?: string): string {
  if (type === "class_group") return "bg-teal-600";
  if (type === "route_group") return "bg-orange-500";
  return ROLE_COLORS[role ?? "default"] ?? ROLE_COLORS.default;
}

const ROLE_BADGE: Record<string, string> = {
  superadmin: "bg-purple-100 text-purple-700",
  admin: "bg-blue-100 text-blue-700",
  teacher: "bg-teal-100 text-teal-700",
  student: "bg-green-100 text-green-700",
  parent: "bg-orange-100 text-orange-700",
  driver: "bg-yellow-100 text-yellow-700",
};

// ── UserPickerModal ────────────────────────────────────────────────────────────

interface UserPickerProps {
  onClose: () => void;
  onStartDM: (userId: number) => void;
}

function UserPickerModal({ onClose, onStartDM }: UserPickerProps) {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiChat<{ data: ChatUser[] }>("GET", "/chat/users")
      .then((r) => setUsers(r.data ?? []))
      .catch(() => setUsers([]))
      .finally(() => {
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      });
  }, []);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.role.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      data-ocid="chat.user_picker.dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        role="button"
        tabIndex={0}
        aria-label="Close"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      />
      {/* Panel */}
      <div className="relative bg-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border">
          <h2 className="font-semibold text-foreground text-base">
            New Message
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            data-ocid="chat.user_picker.close_button"
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="px-4 py-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search by name or role…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              data-ocid="chat.user_picker.search_input"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted text-sm text-foreground placeholder:text-muted-foreground border-0 outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading && (
            <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
              Loading users…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div
              className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground text-sm"
              data-ocid="chat.user_picker.empty_state"
            >
              <Users className="w-8 h-8 opacity-40" />
              No users found
            </div>
          )}
          {filtered.map((u, i) => (
            <button
              type="button"
              key={u.id}
              data-ocid={`chat.user_picker.item.${i + 1}`}
              onClick={() => onStartDM(u.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${avatarColor(u.role)}`}
              >
                {getInitials(u.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">
                  {u.name}
                </p>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                  ROLE_BADGE[u.role] ?? "bg-muted text-muted-foreground"
                }`}
              >
                {u.role}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── MessageBubble ─────────────────────────────────────────────────────────────

interface BubbleProps {
  msg: ChatMessage;
  showSender: boolean;
  isGroup: boolean;
}

function MessageBubble({ msg, showSender, isGroup }: BubbleProps) {
  // Detect file URL in content (server may return a URL for uploaded files)
  const fileUrlMatch = msg.content.match(
    /https?:\/\/\S+\.(pdf|docx?|xlsx?|png|jpe?g|gif|zip|csv)/i,
  );
  const isFileMsg = !!fileUrlMatch;

  return (
    <div
      className={`flex flex-col mb-1 ${msg.is_mine ? "items-end" : "items-start"}`}
    >
      {isGroup && !msg.is_mine && showSender && (
        <span className="text-[11px] text-muted-foreground px-3 mb-0.5 font-medium">
          {msg.sender_name}
        </span>
      )}
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 text-sm ${
          msg.is_mine
            ? "bg-blue-600 text-white rounded-2xl rounded-br-sm ml-auto"
            : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-2xl rounded-bl-sm mr-auto"
        }`}
      >
        {isFileMsg && fileUrlMatch ? (
          <a
            href={fileUrlMatch[0]}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 underline text-sm ${msg.is_mine ? "text-blue-100" : "text-blue-600"}`}
          >
            <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">
              {msg.content.replace(fileUrlMatch[0], "").trim() ||
                fileUrlMatch[0].split("/").pop()}
            </span>
          </a>
        ) : (
          <p className="whitespace-pre-wrap break-words leading-relaxed">
            {msg.content}
          </p>
        )}
        <p
          className={`text-[10px] mt-1 text-right ${
            msg.is_mine ? "text-blue-200" : "text-gray-400 dark:text-gray-500"
          }`}
        >
          {formatHHMM(msg.sent_at)}
        </p>
      </div>
    </div>
  );
}

// ── ConversationView ──────────────────────────────────────────────────────────

interface ConversationViewProps {
  conv: ChatConversation;
  onBack?: () => void;
  isMobile: boolean;
}

function ConversationView({ conv, onBack, isMobile }: ConversationViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevLenRef = useRef(0);

  const loadMessages = useCallback(async () => {
    try {
      const res = await apiChat<{ data: ChatMessage[] }>(
        "GET",
        `/chat/messages?conversation_id=${conv.id}&page=1`,
      );
      setMessages(res.data ?? []);
    } catch {
      // silent
    }
  }, [conv.id]);

  useEffect(() => {
    setMessages([]);
    prevLenRef.current = 0;
    loadMessages().then(() => {
      setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
    });
    apiChat("POST", "/chat/messages/read", { conversation_id: conv.id }).catch(
      () => {},
    );
    intervalRef.current = setInterval(loadMessages, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [conv.id, loadMessages]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages.length > prevLenRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      prevLenRef.current = messages.length;
    }
  });

  const sendMessage = async () => {
    const content = input.trim();
    if ((!content && !attachFile) || sending) return;
    setSending(true);
    const savedInput = input;
    setInput("");

    try {
      if (attachFile) {
        // Send file via multipart form
        const apiBase =
          localStorage.getItem("shubh_erp_api_url") ??
          "https://shubh.psmkgs.com/api";
        const form = new FormData();
        form.append("conversation_id", String(conv.id));
        form.append("content", content || `📎 ${attachFile.name}`);
        form.append("file", attachFile);
        const res = await fetch(`${apiBase}/chat/messages/send`, {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
          body: form,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setAttachFile(null);
      } else {
        await apiChat("POST", "/chat/messages/send", {
          conversation_id: conv.id,
          content,
        });
      }
      await loadMessages();
    } catch {
      setInput(savedInput);
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isGroup = conv.type !== "direct";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-3 border-b border-border bg-card sticky top-0 z-10 shadow-sm">
        {isMobile && onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to chat list"
            data-ocid="chat.conversation.back_button"
            className="p-1.5 rounded-full hover:bg-muted transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
        )}
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(undefined, conv.type)}`}
        >
          {isGroup ? <Users className="w-4 h-4" /> : getInitials(conv.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">
            {conv.name}
          </p>
          {isGroup && conv.member_count > 0 && (
            <p className="text-xs text-muted-foreground">
              {conv.member_count} members
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-24">
        {messages.length === 0 && (
          <div
            className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground"
            data-ocid="chat.messages.empty_state"
          >
            <MessageCircle className="w-12 h-12 opacity-20" />
            <p className="text-sm">No messages yet. Say hello!</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const prev = messages[i - 1];
          const showSender =
            !prev || prev.sender_user_id !== msg.sender_user_id;
          return (
            <MessageBubble
              key={`${msg.id}-${msg.sent_at}`}
              msg={msg}
              showSender={showSender}
              isGroup={isGroup}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 px-3 py-2 bg-card border-t border-border flex flex-col gap-1.5 lg:static lg:px-3 lg:py-2">
        {attachFile && (
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-3 py-2 text-xs">
            <Paperclip className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="truncate flex-1 text-foreground font-medium">
              {attachFile.name}
            </span>
            <button
              type="button"
              onClick={() => setAttachFile(null)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Remove attachment"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setAttachFile(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach file"
            data-ocid="chat.message.upload_button"
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors flex-shrink-0"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a message…"
            data-ocid="chat.message.input"
            className="flex-1 resize-none rounded-2xl bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground border-0 outline-none focus:ring-2 focus:ring-primary/30 max-h-28 overflow-y-auto leading-relaxed"
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={(!input.trim() && !attachFile) || sending}
            data-ocid="chat.message.send_button"
            aria-label="Send message"
            className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40 hover:bg-blue-700 active:scale-95 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ChatList ──────────────────────────────────────────────────────────────────

interface ChatListProps {
  conversations: ChatConversation[];
  selectedId: number | null;
  search: string;
  onSearch: (v: string) => void;
  onSelect: (c: ChatConversation) => void;
  onNewDM: () => void;
  isSuperAdmin?: boolean;
}

function ChatList({
  conversations,
  selectedId,
  search,
  onSearch,
  onSelect,
  onNewDM,
  isSuperAdmin = false,
}: ChatListProps) {
  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const dms = filtered.filter((c) => c.type === "direct");
  const classGroups = filtered.filter((c) => c.type === "class_group");
  const routeGroups = filtered.filter((c) => c.type === "route_group");

  const renderItem = (c: ChatConversation, globalIdx: number) => {
    const isActive = selectedId === c.id;
    const isGroup = c.type !== "direct";
    return (
      <button
        type="button"
        key={c.id}
        data-ocid={`chat.conversation.item.${globalIdx + 1}`}
        onClick={() => onSelect(c)}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors ${
          isActive ? "bg-primary/10" : "hover:bg-muted"
        }`}
      >
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${avatarColor(undefined, c.type)}`}
        >
          {isGroup ? <Users className="w-4 h-4" /> : getInitials(c.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <p className="font-semibold text-sm text-foreground truncate">
              {c.name}
            </p>
            <span className="text-[10px] text-muted-foreground flex-shrink-0">
              {c.last_message_at ? formatTime(c.last_message_at) : ""}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1 mt-0.5">
            <p className="text-xs text-muted-foreground truncate">
              {c.last_message
                ? c.last_message.length > 40
                  ? `${c.last_message.slice(0, 40)}…`
                  : c.last_message
                : isGroup
                  ? `${c.member_count} members`
                  : "Start a conversation"}
            </p>
            {c.unread_count > 0 && (
              <span
                className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 flex-shrink-0"
                data-ocid={`chat.unread_badge.${globalIdx + 1}`}
              >
                {c.unread_count > 99 ? "99+" : c.unread_count}
              </span>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        {isSuperAdmin && (
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-purple-600 bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-1 mb-2">
            <Shield className="w-3 h-3" />
            Super Admin View — All School Conversations
          </div>
        )}
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-display font-bold text-lg text-foreground">
            Chats
          </h1>
          <button
            type="button"
            onClick={onNewDM}
            aria-label="New message"
            data-ocid="chat.new_dm.open_modal_button"
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search chats…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            data-ocid="chat.search_input"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground border-0 outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="overflow-y-auto flex-1 px-2 pb-4">
        {filtered.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground"
            data-ocid="chat.list.empty_state"
          >
            <MessageCircle className="w-12 h-12 opacity-20" />
            <p className="text-sm">No conversations yet</p>
            <button
              type="button"
              onClick={onNewDM}
              data-ocid="chat.list.new_dm_button"
              className="text-sm text-primary font-medium hover:underline"
            >
              Start a new message
            </button>
          </div>
        )}

        {dms.length > 0 && (
          <div className="mb-1">{dms.map((c, i) => renderItem(c, i))}</div>
        )}

        {classGroups.length > 0 && (
          <div className="mb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 py-2">
              Class Groups
            </p>
            {classGroups.map((c, i) => renderItem(c, dms.length + i))}
          </div>
        )}

        {routeGroups.length > 0 && (
          <div className="mb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 py-2">
              Route Groups
            </p>
            {routeGroups.map((c, i) =>
              renderItem(c, dms.length + classGroups.length + i),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Chat (main export) ────────────────────────────────────────────────────────

interface ChatProps {
  onTotalUnread?: (n: number) => void;
}

export default function Chat({ onTotalUnread }: ChatProps) {
  const { currentUser } = useApp();
  const isSuperAdmin = currentUser?.role === "superadmin";

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selected, setSelected] = useState<ChatConversation | null>(null);
  const [search, setSearch] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(true);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      apiChat("POST", "/chat/groups/generate", {}).catch(() => {});
      // Super Admin fetches all conversations with ?all=1
      const endpoint = isSuperAdmin
        ? "/chat/conversations?all=1"
        : "/chat/conversations";
      const res = await apiChat<{ data: ChatConversation[] }>("GET", endpoint);
      const sorted = (res.data ?? []).sort((a, b) => {
        const ta = a.last_message_at
          ? new Date(a.last_message_at).getTime()
          : 0;
        const tb = b.last_message_at
          ? new Date(b.last_message_at).getTime()
          : 0;
        return tb - ta;
      });
      setConversations(sorted);
      const total = sorted.reduce((s, c) => s + (c.unread_count ?? 0), 0);
      onTotalUnread?.(total);
      // Persist unread count for sidebar badge
      localStorage.setItem("shubh_chat_unread", String(total));
    } catch {
      // silent — server may not have chat endpoints yet
    } finally {
      setLoading(false);
    }
  }, [onTotalUnread, isSuperAdmin]);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 15000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  const handleStartDM = async (userId: number) => {
    setShowPicker(false);
    try {
      const res = await apiChat<{ data: { id: number; name: string } }>(
        "POST",
        "/chat/conversations/start",
        { recipient_user_id: userId },
      );
      await loadConversations();
      const convId = res.data?.id;
      if (convId) {
        // Try to find the loaded conversation
        setConversations((prev) => {
          const found = prev.find((c) => c.id === convId);
          if (found) {
            setSelected(found);
          } else {
            const minimal: ChatConversation = {
              id: convId,
              type: "direct",
              name: res.data?.name ?? "User",
              unread_count: 0,
              member_count: 2,
            };
            setSelected(minimal);
          }
          return prev;
        });
      }
    } catch {
      // silent
    }
  };

  const handleSelectConv = (c: ChatConversation) => {
    setSelected(c);
    setConversations((prev) =>
      prev.map((x) => (x.id === c.id ? { ...x, unread_count: 0 } : x)),
    );
  };

  const showList = !isMobile || !selected;
  const showConv = !isMobile || !!selected;

  return (
    <div
      className="flex h-full bg-background overflow-hidden"
      style={{ height: "calc(100vh - 112px)" }}
      data-ocid="chat.page"
    >
      {/* LIST PANEL */}
      {showList && (
        <div
          className={`${
            isMobile ? "w-full" : "w-80 flex-shrink-0 border-r border-border"
          } h-full flex flex-col bg-card overflow-hidden`}
          data-ocid="chat.list.panel"
        >
          {loading ? (
            <div className="flex flex-col gap-3 p-4">
              {[...Array(6)].map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton only
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-muted rounded w-2/3" />
                    <div className="h-2.5 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ChatList
              conversations={conversations}
              selectedId={selected?.id ?? null}
              search={search}
              onSearch={setSearch}
              onSelect={handleSelectConv}
              onNewDM={() => setShowPicker(true)}
              isSuperAdmin={isSuperAdmin}
            />
          )}
        </div>
      )}

      {/* CONVERSATION PANEL */}
      {showConv && (
        <div
          className={`${isMobile ? "w-full" : "flex-1"} h-full flex flex-col overflow-hidden bg-background`}
          data-ocid="chat.conversation.panel"
        >
          {selected ? (
            <ConversationView
              conv={selected}
              onBack={isMobile ? () => setSelected(null) : undefined}
              isMobile={isMobile}
            />
          ) : (
            <div
              className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground"
              data-ocid="chat.conversation.empty_state"
            >
              <MessageCircle className="w-16 h-16 opacity-20" />
              <p className="text-base font-medium">
                Select a chat to start messaging
              </p>
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                data-ocid="chat.conversation.new_dm_button"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                New Message
              </button>
            </div>
          )}
        </div>
      )}

      {/* User Picker Modal */}
      {showPicker && (
        <UserPickerModal
          onClose={() => setShowPicker(false)}
          onStartDM={handleStartDM}
        />
      )}
    </div>
  );
}
