import {
  ArrowLeft,
  File,
  MessageCircle,
  Paperclip,
  Plus,
  Search,
  Send,
  Shield,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import type { ClassSection, Staff, Student, TransportRoute } from "../types";
import { generateId } from "../utils/localStorage";

// ── Local types ───────────────────────────────────────────────────────────────

interface LocalChatGroup {
  id: string;
  name: string;
  type: "dm" | "class" | "route" | "custom";
  members: string[]; // user display names (no mobile)
  memberIds: string[]; // internal IDs
  createdAt: string;
}

interface LocalChatMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  type: "text" | "file";
  fileUrl?: string;
  fileName?: string;
  createdAt: string;
}

// ── Utility helpers ───────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
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
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

const ROLE_BG: Record<string, string> = {
  superadmin: "bg-purple-600",
  admin: "bg-blue-600",
  teacher: "bg-teal-600",
  student: "bg-green-600",
  parent: "bg-orange-500",
  driver: "bg-yellow-600",
};

function avatarBg(role?: string, type?: string): string {
  if (type === "class") return "bg-teal-600";
  if (type === "route") return "bg-orange-500";
  if (type === "dm") return ROLE_BG[role ?? ""] ?? "bg-primary";
  return "bg-primary";
}

// ── FileToBase64 helper ───────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── MessageBubble ─────────────────────────────────────────────────────────────

interface BubbleProps {
  msg: LocalChatMessage;
  isMine: boolean;
  showSender: boolean;
  isGroup: boolean;
}

function MessageBubble({ msg, isMine, showSender, isGroup }: BubbleProps) {
  const isFile = msg.type === "file";
  const isImage = isFile && msg.fileUrl?.startsWith("data:image");

  return (
    <div
      className={`flex flex-col mb-1 ${isMine ? "items-end" : "items-start"}`}
    >
      {isGroup && !isMine && showSender && (
        <span className="text-[11px] text-muted-foreground px-3 mb-0.5 font-medium">
          {msg.senderName}
        </span>
      )}
      <div
        className={`max-w-xs lg:max-w-md px-3 py-2 text-sm rounded-2xl ${
          isMine
            ? "bg-primary text-primary-foreground rounded-br-sm ml-auto"
            : "bg-muted text-foreground rounded-bl-sm mr-auto"
        }`}
      >
        {isFile ? (
          isImage && msg.fileUrl ? (
            <div className="space-y-1">
              <img
                src={msg.fileUrl}
                alt={msg.fileName ?? "attachment"}
                className="rounded-xl max-w-full max-h-48 object-cover"
              />
              {msg.fileName && (
                <p
                  className={`text-[11px] ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                >
                  {msg.fileName}
                </p>
              )}
            </div>
          ) : (
            <a
              href={msg.fileUrl}
              download={msg.fileName}
              className={`flex items-center gap-2 ${isMine ? "text-primary-foreground/90" : "text-primary"}`}
            >
              <File className="w-4 h-4 flex-shrink-0" />
              <span className="truncate text-xs underline">
                {msg.fileName ?? "Attachment"}
              </span>
            </a>
          )
        ) : (
          <p className="whitespace-pre-wrap break-words leading-relaxed">
            {msg.content}
          </p>
        )}
        <p
          className={`text-[10px] mt-0.5 text-right ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}
        >
          {formatHHMM(msg.createdAt)}
        </p>
      </div>
    </div>
  );
}

// ── ConversationView ──────────────────────────────────────────────────────────

interface ConversationViewProps {
  group: LocalChatGroup;
  messages: LocalChatMessage[];
  currentUser: { id: string; name: string; role: string };
  onBack?: () => void;
  isMobile: boolean;
  onSend: (
    groupId: string,
    content: string,
    type: "text" | "file",
    fileUrl?: string,
    fileName?: string,
  ) => Promise<void>;
}

function ConversationView({
  group,
  messages,
  currentUser,
  onBack,
  isMobile,
  onSend,
}: ConversationViewProps) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isGroup = group.type !== "dm";

  // Auto-scroll when messages change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      50,
    );
  });

  const sendMessage = async () => {
    const content = input.trim();
    if ((!content && !attachFile) || sending) return;
    setSending(true);
    setInput("");

    try {
      if (attachFile) {
        let fileUrl: string | undefined;
        let fileName = attachFile.name;
        if (attachFile.size < 1_000_000) {
          fileUrl = await fileToBase64(attachFile);
        } else {
          fileUrl = undefined; // large file — store filename only
        }
        await onSend(
          group.id,
          content || `📎 ${fileName}`,
          "file",
          fileUrl,
          fileName,
        );
        setAttachFile(null);
      } else {
        await onSend(group.id, content, "text");
      }
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-3 border-b border-border bg-card sticky top-0 z-10 shadow-subtle">
        {isMobile && onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            data-ocid="chat.conversation.back_button"
            className="p-1.5 rounded-full hover:bg-muted transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
        )}
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarBg(undefined, group.type)}`}
        >
          {isGroup ? <Users className="w-4 h-4" /> : getInitials(group.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">
            {group.name}
          </p>
          {isGroup && (
            <p className="text-xs text-muted-foreground">
              {group.members.length} members
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-24 scrollbar-thin">
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
          const isMine = msg.senderId === currentUser.id;
          const prev = messages[i - 1];
          const showSender = !prev || prev.senderId !== msg.senderId;
          return (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isMine={isMine}
              showSender={showSender}
              isGroup={isGroup}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-3 py-2 bg-card border-t border-border flex flex-col gap-1.5 lg:static">
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
            onClick={() => void sendMessage()}
            disabled={(!input.trim() && !attachFile) || sending}
            data-ocid="chat.message.send_button"
            aria-label="Send message"
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground flex-shrink-0 disabled:opacity-40 hover:opacity-90 active:scale-95 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── UserPickerModal ────────────────────────────────────────────────────────────

interface PickerContact {
  id: string;
  name: string;
  role: string;
}

interface UserPickerProps {
  contacts: PickerContact[];
  onClose: () => void;
  onSelect: (contact: PickerContact) => void;
}

function UserPickerModal({ contacts, onClose, onSelect }: UserPickerProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.role.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      data-ocid="chat.user_picker.dialog"
    >
      <div
        className="absolute inset-0"
        role="button"
        tabIndex={0}
        aria-label="Close"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      />
      <div className="relative bg-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] flex flex-col shadow-strong">
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
        <div className="overflow-y-auto flex-1 scrollbar-thin">
          {filtered.length === 0 && (
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
              onClick={() => onSelect(u)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${avatarBg(u.role)}`}
              >
                {getInitials(u.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">
                  {u.name}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {u.role}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── ChatList ──────────────────────────────────────────────────────────────────

interface ChatListProps {
  groups: LocalChatGroup[];
  messages: LocalChatMessage[];
  selectedId: string | null;
  search: string;
  onSearch: (v: string) => void;
  onSelect: (g: LocalChatGroup) => void;
  onNewDM: () => void;
  isSuperAdmin: boolean;
}

function ChatList({
  groups,
  messages,
  selectedId,
  search,
  onSearch,
  onSelect,
  onNewDM,
  isSuperAdmin,
}: ChatListProps) {
  const filtered = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()),
  );

  const dms = filtered.filter((g) => g.type === "dm");
  const classGroups = filtered.filter((g) => g.type === "class");
  const routeGroups = filtered.filter((g) => g.type === "route");
  const customGroups = filtered.filter((g) => g.type === "custom");

  const getLastMessage = (groupId: string) => {
    const msgs = messages.filter((m) => m.groupId === groupId);
    return msgs[msgs.length - 1];
  };

  const renderItem = (g: LocalChatGroup, idx: number) => {
    const isActive = selectedId === g.id;
    const isGroupChat = g.type !== "dm";
    const last = getLastMessage(g.id);

    return (
      <button
        type="button"
        key={g.id}
        data-ocid={`chat.conversation.item.${idx + 1}`}
        onClick={() => onSelect(g)}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors ${isActive ? "bg-primary/10" : "hover:bg-muted"}`}
      >
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${avatarBg(undefined, g.type)}`}
        >
          {isGroupChat ? <Users className="w-4 h-4" /> : getInitials(g.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <p className="font-semibold text-sm text-foreground truncate">
              {g.name}
            </p>
            <span className="text-[10px] text-muted-foreground flex-shrink-0">
              {last ? formatTime(last.createdAt) : ""}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {last
              ? last.type === "file"
                ? `📎 ${last.fileName ?? "File"}`
                : last.content.length > 40
                  ? `${last.content.slice(0, 40)}…`
                  : last.content
              : isGroupChat
                ? `${g.members.length} members`
                : "Start a conversation"}
          </p>
        </div>
      </button>
    );
  };

  let idx = 0;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        {isSuperAdmin && (
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-1 mb-2">
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

      <div className="overflow-y-auto flex-1 px-2 pb-4 scrollbar-thin">
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
          <div className="mb-1">
            {dms.map((g) => {
              const i = idx++;
              return renderItem(g, i);
            })}
          </div>
        )}

        {classGroups.length > 0 && (
          <div className="mb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 py-2">
              Class Groups
            </p>
            {classGroups.map((g) => {
              const i = idx++;
              return renderItem(g, i);
            })}
          </div>
        )}

        {routeGroups.length > 0 && (
          <div className="mb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 py-2">
              Route Groups
            </p>
            {routeGroups.map((g) => {
              const i = idx++;
              return renderItem(g, i);
            })}
          </div>
        )}

        {customGroups.length > 0 && (
          <div className="mb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 py-2">
              Other Groups
            </p>
            {customGroups.map((g) => {
              const i = idx++;
              return renderItem(g, i);
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Admin Oversight Panel ─────────────────────────────────────────────────────

interface OversightProps {
  groups: LocalChatGroup[];
  messages: LocalChatMessage[];
  onSelectGroup: (g: LocalChatGroup) => void;
}

function AdminOversightPanel({
  groups,
  messages,
  onSelectGroup,
}: OversightProps) {
  const [query, setQuery] = useState("");
  const dms = groups.filter((g) => g.type === "dm");
  const filtered = dms.filter((g) =>
    g.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-4 h-4 text-purple-600" />
        <h3 className="text-sm font-semibold text-purple-700">
          Admin Oversight — Direct Messages
        </h3>
      </div>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by participant name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-ocid="chat.oversight.search_input"
          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-purple-300"
        />
      </div>
      <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
        {filtered.map((g, i) => {
          const lastMsg = messages
            .filter((m) => m.groupId === g.id)
            .slice(-1)[0];
          return (
            <button
              type="button"
              key={g.id}
              data-ocid={`chat.oversight.item.${i + 1}`}
              onClick={() => onSelectGroup(g)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-purple-100 transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 text-[11px] font-bold flex-shrink-0">
                {getInitials(g.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {g.name}
                </p>
                {lastMsg && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {lastMsg.senderName}: {lastMsg.content.slice(0, 30)}
                  </p>
                )}
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">
            No direct messages
          </p>
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
  const { currentUser, getData, saveData } = useApp();
  const isSuperAdmin = currentUser?.role === "superadmin";

  const [selected, setSelected] = useState<LocalChatGroup | null>(null);
  const [search, setSearch] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [pollTick, setPollTick] = useState(0);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Poll for new messages every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => setPollTick((t) => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  // ── Load all data from context ───────────────────────────────────────────────
  const rawGroups = getData("chatGroups") as LocalChatGroup[];
  const rawMessages = getData("chatMessages") as LocalChatMessage[];

  // Re-read on poll tick (getData returns latest from context)
  // biome-ignore lint/correctness/useExhaustiveDependencies: pollTick intentionally triggers re-memo
  const groups: LocalChatGroup[] = useMemo(
    () => rawGroups,
    [rawGroups, pollTick],
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: pollTick intentionally triggers re-memo
  const messages: LocalChatMessage[] = useMemo(
    () => rawMessages,
    [rawMessages, pollTick],
  );

  // ── Auto-generate class and route groups ─────────────────────────────────────
  useEffect(() => {
    const classes = getData("classes") as ClassSection[];
    const students = getData("students") as Student[];
    const staff = getData("staff") as Staff[];
    const routes = getData("transport_routes") as TransportRoute[];
    const existingGroups = getData("chatGroups") as LocalChatGroup[];

    const toCreate: LocalChatGroup[] = [];

    // Class groups
    for (const cls of classes) {
      const sectionList: string[] = cls.sections ?? [];
      for (const section of sectionList) {
        const groupName = `${cls.className}-${section} Group`;
        const exists = existingGroups.some(
          (g) => g.name === groupName && g.type === "class",
        );
        if (!exists) {
          const classStudents = students
            .filter((s) => s.class === cls.className && s.section === section)
            .map((s) => s.fullName);
          const classTeachers = staff
            .filter((st) =>
              st.subjects?.some(
                (sub) =>
                  sub.classFrom <= cls.className &&
                  cls.className <= sub.classTo,
              ),
            )
            .map((st) => st.name);
          const members = [...new Set([...classStudents, ...classTeachers])];
          toCreate.push({
            id: generateId(),
            name: groupName,
            type: "class",
            members,
            memberIds: [],
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    // Route groups
    for (const route of routes) {
      const groupName = `${route.routeName} Group`;
      const exists = existingGroups.some(
        (g) => g.name === groupName && g.type === "route",
      );
      if (!exists) {
        const routeStudents = students
          .filter((s) => s.transportRoute === route.routeName)
          .map((s) => s.fullName);
        const members = [...routeStudents];
        if (route.driverName) members.push(route.driverName);
        toCreate.push({
          id: generateId(),
          name: groupName,
          type: "route",
          members,
          memberIds: [],
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Save new groups
    for (const g of toCreate) {
      void saveData("chatGroups", g as unknown as Record<string, unknown>);
    }
  }, [getData, saveData]);

  // ── Build contacts list for new DM picker ────────────────────────────────────
  const contacts: PickerContact[] = useMemo(() => {
    const staffList = getData("staff") as Staff[];
    return staffList
      .filter((s) => s.id !== currentUser?.id)
      .map((s) => ({ id: s.id, name: s.name, role: s.designation ?? "Staff" }));
  }, [getData, currentUser?.id]);

  // ── Unread count (messages not from current user since last seen) ────────────
  useEffect(() => {
    const total = groups.reduce((sum, g) => {
      const groupMsgs = messages.filter((m) => m.groupId === g.id);
      const unread = groupMsgs.filter(
        (m) => m.senderId !== currentUser?.id,
      ).length;
      return sum + unread;
    }, 0);
    onTotalUnread?.(total);
  }, [groups, messages, currentUser?.id, onTotalUnread]);

  // ── Send message handler ──────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (
      groupId: string,
      content: string,
      type: "text" | "file",
      fileUrl?: string,
      fileName?: string,
    ) => {
      const msg: LocalChatMessage = {
        id: generateId(),
        groupId,
        senderId: currentUser?.id ?? "unknown",
        senderName: currentUser?.name ?? "Unknown",
        senderRole: currentUser?.role ?? "unknown",
        content,
        type,
        fileUrl,
        fileName,
        createdAt: new Date().toISOString(),
      };
      await saveData("chatMessages", msg as unknown as Record<string, unknown>);
    },
    [currentUser, saveData],
  );

  // ── Start DM with a contact ───────────────────────────────────────────────────
  const handleStartDM = useCallback(
    async (contact: PickerContact) => {
      setShowPicker(false);
      const myName = currentUser?.name ?? "Me";
      const dmName = `${myName} & ${contact.name}`;
      const existing = groups.find((g) => g.type === "dm" && g.name === dmName);
      if (existing) {
        setSelected(existing);
        return;
      }
      const newGroup: LocalChatGroup = {
        id: generateId(),
        name: dmName,
        type: "dm",
        members: [myName, contact.name],
        memberIds: [currentUser?.id ?? "", contact.id],
        createdAt: new Date().toISOString(),
      };
      await saveData(
        "chatGroups",
        newGroup as unknown as Record<string, unknown>,
      );
      setSelected(newGroup);
    },
    [currentUser, groups, saveData],
  );

  const handleSelectConv = (g: LocalChatGroup) => setSelected(g);

  const groupMessages = selected
    ? messages.filter((m) => m.groupId === selected.id)
    : [];
  const showList = !isMobile || !selected;
  const showConv = !isMobile || !!selected;

  return (
    <div
      className="flex bg-background overflow-hidden relative"
      style={{ height: "calc(100vh - 112px)" }}
      data-ocid="chat.page"
    >
      {/* LIST PANEL */}
      {showList && (
        <div
          className={`${isMobile ? "w-full" : "w-80 flex-shrink-0 border-r border-border"} h-full flex flex-col bg-card overflow-hidden`}
          data-ocid="chat.list.panel"
        >
          <ChatList
            groups={groups}
            messages={messages}
            selectedId={selected?.id ?? null}
            search={search}
            onSearch={setSearch}
            onSelect={handleSelectConv}
            onNewDM={() => setShowPicker(true)}
            isSuperAdmin={isSuperAdmin}
          />
          {isSuperAdmin && !isMobile && (
            <div className="px-3 pb-4">
              <AdminOversightPanel
                groups={groups}
                messages={messages}
                onSelectGroup={handleSelectConv}
              />
            </div>
          )}
        </div>
      )}

      {/* CONVERSATION PANEL */}
      {showConv && (
        <div
          className={`${isMobile ? "w-full" : "flex-1"} h-full flex flex-col overflow-hidden bg-background relative`}
          data-ocid="chat.conversation.panel"
        >
          {selected ? (
            <ConversationView
              group={selected}
              messages={groupMessages}
              currentUser={{
                id: currentUser?.id ?? "",
                name: currentUser?.name ?? "",
                role: currentUser?.role ?? "",
              }}
              onBack={isMobile ? () => setSelected(null) : undefined}
              isMobile={isMobile}
              onSend={handleSend}
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
              {isSuperAdmin && (
                <div className="w-full max-w-sm px-4">
                  <AdminOversightPanel
                    groups={groups}
                    messages={messages}
                    onSelectGroup={handleSelectConv}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* User Picker Modal */}
      {showPicker && (
        <UserPickerModal
          contacts={contacts}
          onClose={() => setShowPicker(false)}
          onSelect={(c) => void handleStartDM(c)}
        />
      )}
    </div>
  );
}
