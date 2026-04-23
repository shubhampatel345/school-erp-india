import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import type { ChatConversation, ChatMessage } from "../types";
import { generateId } from "../utils/localStorage";
import { ls } from "../utils/localStorage";

// ── Seed data ────────────────────────────────────────────────────────────────

const SEED_CONVERSATIONS: ChatConversation[] = [
  {
    id: 1,
    type: "direct",
    name: "Anjali Sharma",
    last_message: "Thanks for the schedule!",
    last_message_at: "10:30",
    unread_count: 2,
    member_count: 2,
    other_user_name: "Anjali Sharma",
  },
  {
    id: 2,
    type: "direct",
    name: "Ramesh Gupta",
    last_message: "See you in the staffroom.",
    last_message_at: "09:15",
    unread_count: 0,
    member_count: 2,
    other_user_name: "Ramesh Gupta",
  },
  {
    id: 3,
    type: "class_group",
    name: "Class 10-A Group",
    last_message: "Homework submitted.",
    last_message_at: "Yesterday",
    unread_count: 5,
    member_count: 42,
  },
  {
    id: 4,
    type: "class_group",
    name: "Class 9-B Group",
    last_message: "Exam paper ready.",
    last_message_at: "Yesterday",
    unread_count: 0,
    member_count: 38,
  },
  {
    id: 5,
    type: "route_group",
    name: "Route 1 — Bus 12",
    last_message: "Bus delayed 10 min today.",
    last_message_at: "08:00",
    unread_count: 1,
    member_count: 25,
  },
];

const SEED_MESSAGES: Record<number, ChatMessage[]> = {
  1: [
    {
      id: 1,
      conversation_id: 1,
      sender_user_id: 2,
      sender_name: "Anjali Sharma",
      sender_role: "teacher",
      content: "Good morning! Can you share the exam schedule?",
      sent_at: "10:20",
      is_mine: false,
    },
    {
      id: 2,
      conversation_id: 1,
      sender_user_id: 1,
      sender_name: "Admin",
      sender_role: "superadmin",
      content: "Sure, sending it now.",
      sent_at: "10:25",
      is_mine: true,
    },
    {
      id: 3,
      conversation_id: 1,
      sender_user_id: 2,
      sender_name: "Anjali Sharma",
      sender_role: "teacher",
      content: "Thanks for the schedule!",
      sent_at: "10:30",
      is_mine: false,
    },
  ],
  3: [
    {
      id: 4,
      conversation_id: 3,
      sender_user_id: 5,
      sender_name: "Rohit Kumar",
      sender_role: "student",
      content: "Maths homework submitted.",
      sent_at: "Yesterday",
      is_mine: false,
    },
    {
      id: 5,
      conversation_id: 3,
      sender_user_id: 3,
      sender_name: "Mrs. Anjali",
      sender_role: "teacher",
      content: "Good. Don't forget Science assignment too.",
      sent_at: "Yesterday",
      is_mine: false,
    },
  ],
  5: [
    {
      id: 6,
      conversation_id: 5,
      sender_user_id: 7,
      sender_name: "Suresh Driver",
      sender_role: "driver",
      content: "Bus delayed by 10 minutes. Sorry for inconvenience.",
      sent_at: "08:00",
      is_mine: false,
    },
  ],
};

for (const id of [2, 4]) SEED_MESSAGES[id] = [];

// ── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function typeIcon(type: ChatConversation["type"]) {
  if (type === "direct") return "👤";
  if (type === "class_group") return "🏫";
  return "🚌";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ConversationItem({
  conv,
  active,
  onClick,
}: { conv: ChatConversation; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      data-ocid={`chat.conversation.item.${conv.id}`}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
        active ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/60"
      }`}
    >
      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm shrink-0">
        {typeIcon(conv.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-sm font-medium text-foreground truncate">
            {conv.name}
          </span>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {conv.last_message_at}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {conv.last_message ?? "No messages yet"}
        </p>
      </div>
      {conv.unread_count > 0 && (
        <Badge className="bg-primary text-primary-foreground text-[10px] min-w-[18px] h-[18px] px-1 rounded-full">
          {conv.unread_count}
        </Badge>
      )}
    </button>
  );
}

function MessageBubble({ msg, myName }: { msg: ChatMessage; myName: string }) {
  const isMine = msg.is_mine || msg.sender_name === myName;
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-2`}>
      {!isMine && (
        <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent-foreground mr-2 shrink-0 self-end">
          {initials(msg.sender_name)}
        </div>
      )}
      <div
        className={`max-w-[72%] flex flex-col gap-0.5 ${isMine ? "items-end" : "items-start"}`}
      >
        {!isMine && (
          <span className="text-[10px] text-muted-foreground ml-1">
            {msg.sender_name} · {msg.sender_role}
          </span>
        )}
        <div
          className={`px-3 py-2 rounded-2xl text-sm ${
            isMine
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-card border border-border text-foreground rounded-bl-sm"
          }`}
        >
          {msg.file_url && (
            <a
              href={msg.file_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs underline mb-1 opacity-80"
            >
              📎 {msg.file_name ?? "File"}
            </a>
          )}
          {msg.content}
        </div>
        <span className="text-[10px] text-muted-foreground px-1">
          {msg.sent_at} {isMine && "✓✓"}
        </span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Chat() {
  const { currentUser, saveData } = useApp();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] =
    useState<Record<number, ChatMessage[]>>(SEED_MESSAGES);
  const [activeId, setActiveId] = useState<number | null>(1);
  const [inputText, setInputText] = useState("");
  const [fileAttach, setFileAttach] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "direct" | "class_group" | "route_group"
  >("all");
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupType, setNewGroupType] = useState<
    "class_group" | "route_group"
  >("class_group");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = ls.get<ChatConversation[]>(
      "chat_conversations",
      SEED_CONVERSATIONS,
    );
    setConversations(stored.length ? stored : SEED_CONVERSATIONS);
  }, []);

  useEffect(() => {
    const stored = ls.get<Record<number, ChatMessage[]>>("chat_messages", {});
    setMessages({ ...SEED_MESSAGES, ...stored });
  }, []);

  // Scroll to bottom when conversation changes or new message arrives
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on activeId only
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId]); // messages intentionally excluded — activeId change is enough

  const activeConv = conversations.find((c) => c.id === activeId);
  const activeMessages = activeId !== null ? (messages[activeId] ?? []) : [];

  const filtered = conversations.filter((c) => {
    if (filter !== "all" && c.type !== filter) return false;
    return !search || c.name.toLowerCase().includes(search.toLowerCase());
  });

  const selectConv = (id: number) => {
    setActiveId(id);
    setConversations((prev) => {
      const next = prev.map((c) =>
        c.id === id ? { ...c, unread_count: 0 } : c,
      );
      ls.set("chat_conversations", next);
      return next;
    });
  };

  const sendMessage = () => {
    if (!inputText.trim() && !fileAttach) return;
    if (activeId === null) return;
    const msg: ChatMessage = {
      id: Date.now(),
      conversation_id: activeId,
      sender_user_id: 1,
      sender_name: currentUser?.fullName ?? "Admin",
      sender_role: currentUser?.role ?? "superadmin",
      content: inputText.trim(),
      sent_at: new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      is_mine: true,
      file_name: fileAttach?.name,
    };
    const updated = {
      ...messages,
      [activeId]: [...(messages[activeId] ?? []), msg],
    };
    setMessages(updated);
    ls.set("chat_messages", updated);
    setConversations((prev) => {
      const next = prev.map((c) =>
        c.id === activeId
          ? {
              ...c,
              last_message: msg.content || msg.file_name,
              last_message_at: msg.sent_at,
            }
          : c,
      );
      ls.set("chat_conversations", next);
      return next;
    });
    setInputText("");
    setFileAttach(null);
    void saveData("chat_messages", msg as unknown as Record<string, unknown>);
  };

  const createGroup = () => {
    if (!newGroupName.trim()) return;
    const conv: ChatConversation = {
      id: Date.now(),
      type: newGroupType,
      name: newGroupName,
      last_message: undefined,
      last_message_at: undefined,
      unread_count: 0,
      member_count: 1,
    };
    const next = [...conversations, conv];
    setConversations(next);
    ls.set("chat_conversations", next);
    setNewGroupName("");
    setShowNewGroup(false);
    setActiveId(conv.id);
  };

  const isSuperAdmin = currentUser?.role === "superadmin";
  const totalUnread = conversations.reduce((s, c) => s + c.unread_count, 0);

  return (
    <div
      className="flex h-[calc(100vh-64px)] bg-background"
      data-ocid="chat.page"
    >
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <div className="w-72 shrink-0 border-r border-border bg-card flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-foreground font-display">
              Messages
            </h2>
            <div className="flex items-center gap-1">
              {totalUnread > 0 && (
                <Badge variant="secondary">{totalUnread}</Badge>
              )}
              <Button
                size="sm"
                variant="ghost"
                data-ocid="chat.new_group_button"
                onClick={() => setShowNewGroup(true)}
                className="h-7 w-7 p-0"
              >
                +
              </Button>
            </div>
          </div>
          <Input
            data-ocid="chat.search_input"
            placeholder="Search conversations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs"
          />
          <div className="flex gap-1 mt-2 flex-wrap">
            {(["all", "direct", "class_group", "route_group"] as const).map(
              (f) => (
                <button
                  key={f}
                  type="button"
                  data-ocid={`chat.filter.${f}`}
                  onClick={() => setFilter(f)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                    filter === f
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  {f === "all"
                    ? "All"
                    : f === "direct"
                      ? "Direct"
                      : f === "class_group"
                        ? "Classes"
                        : "Routes"}
                </button>
              ),
            )}
          </div>
        </div>

        {/* New Group Form */}
        {showNewGroup && (
          <div
            className="p-3 border-b border-border bg-muted/30"
            data-ocid="chat.new_group_panel"
          >
            <p className="text-xs font-medium text-foreground mb-2">
              New Group
            </p>
            <Input
              data-ocid="chat.new_group_name_input"
              placeholder="Group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="h-7 text-xs mb-1.5"
            />
            <select
              value={newGroupType}
              onChange={(e) =>
                setNewGroupType(e.target.value as "class_group" | "route_group")
              }
              className="w-full h-7 text-xs rounded border border-input bg-background px-2 mb-1.5"
            >
              <option value="class_group">Class Group</option>
              <option value="route_group">Route Group</option>
            </select>
            <div className="flex gap-1">
              <Button
                size="sm"
                data-ocid="chat.create_group_button"
                onClick={createGroup}
                className="h-6 text-xs flex-1"
              >
                Create
              </Button>
              <Button
                size="sm"
                variant="ghost"
                data-ocid="chat.cancel_group_button"
                onClick={() => setShowNewGroup(false)}
                className="h-6 text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Conversation list */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
              Direct
            </p>
            {filtered
              .filter((c) => c.type === "direct")
              .map((c) => (
                <ConversationItem
                  key={c.id}
                  conv={c}
                  active={activeId === c.id}
                  onClick={() => selectConv(c.id)}
                />
              ))}
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 mt-2">
              Groups
            </p>
            {filtered
              .filter((c) => c.type !== "direct")
              .map((c) => (
                <ConversationItem
                  key={c.id}
                  conv={c}
                  active={activeId === c.id}
                  onClick={() => selectConv(c.id)}
                />
              ))}
            {filtered.length === 0 && (
              <div
                data-ocid="chat.empty_state"
                className="text-center py-8 text-muted-foreground text-xs"
              >
                No conversations found
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ── Chat window ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeConv ? (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm">
                  {typeIcon(activeConv.type)}
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">
                    {activeConv.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {activeConv.member_count} member
                    {activeConv.member_count !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              {isSuperAdmin && (
                <Badge variant="outline" className="text-[10px]">
                  Admin view
                </Badge>
              )}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4 py-3 bg-muted/20">
              {activeMessages.length === 0 ? (
                <div
                  className="flex items-center justify-center h-24 text-muted-foreground text-sm"
                  data-ocid="chat.messages_empty_state"
                >
                  No messages yet. Say hello! 👋
                </div>
              ) : (
                activeMessages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    myName={currentUser?.fullName ?? "Admin"}
                  />
                ))
              )}
              <div ref={bottomRef} />
            </ScrollArea>

            {/* File preview strip */}
            {fileAttach && (
              <div className="px-4 py-1.5 border-t border-border bg-muted/20 flex items-center gap-2 text-xs text-muted-foreground">
                <span>📎 {fileAttach.name}</span>
                <button
                  type="button"
                  onClick={() => setFileAttach(null)}
                  className="text-destructive hover:opacity-80"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Input */}
            <div className="px-4 py-3 border-t border-border bg-card flex items-end gap-2">
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => setFileAttach(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                data-ocid="chat.attach_button"
                className="h-9 w-9 p-0 shrink-0"
                onClick={() => fileRef.current?.click()}
              >
                📎
              </Button>
              <Input
                data-ocid="chat.message_input"
                placeholder="Type a message…"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="flex-1"
              />
              <Button
                data-ocid="chat.send_button"
                onClick={sendMessage}
                disabled={!inputText.trim() && !fileAttach}
                className="h-9 px-4 shrink-0"
              >
                Send
              </Button>
            </div>
          </>
        ) : (
          <div
            className="flex-1 flex items-center justify-center text-muted-foreground"
            data-ocid="chat.no_conversation_state"
          >
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  );
}
