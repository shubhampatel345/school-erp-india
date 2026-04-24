/**
 * SHUBH SCHOOL ERP — Chat Module
 * Direct API: loads from phpApiService, polls every 5s for new messages
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import phpApiService from "../utils/phpApiService";

// ── Types ────────────────────────────────────────────────────────────────────

interface Room {
  id: number;
  type: "direct" | "class_group" | "route_group";
  name: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  member_count: number;
  other_user_name?: string;
}

interface Message {
  id: number;
  room_id: number;
  sender_id: number;
  sender_name: string;
  sender_role: string;
  content: string;
  sent_at: string;
  is_mine: boolean;
  file_url?: string;
  file_name?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function typeIcon(type: Room["type"]) {
  if (type === "direct") return "👤";
  if (type === "class_group") return "🏫";
  return "🚌";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ConversationItem({
  room,
  active,
  onClick,
}: { room: Room; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      data-ocid={`chat.conversation.item.${room.id}`}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
        active ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/60"
      }`}
    >
      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm shrink-0">
        {typeIcon(room.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-sm font-medium text-foreground truncate">
            {room.name}
          </span>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {room.last_message_at}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {room.last_message ?? "No messages yet"}
        </p>
      </div>
      {room.unread_count > 0 && (
        <Badge className="bg-primary text-primary-foreground text-[10px] min-w-[18px] h-[18px] px-1 rounded-full">
          {room.unread_count}
        </Badge>
      )}
    </button>
  );
}

function MessageBubble({ msg, myName }: { msg: Message; myName: string }) {
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
  const { currentUser } = useApp();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMsgIdRef = useRef<number>(0);

  // ── Load rooms on mount ───────────────────────────────────────────────────

  const loadRooms = useCallback(async () => {
    try {
      const data = await phpApiService.get<Room[]>("chat/rooms");
      setRooms(Array.isArray(data) ? data : []);
    } catch {
      setRooms([]);
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  // ── Load messages when room selected ─────────────────────────────────────

  const loadMessages = useCallback(async (roomId: number) => {
    setMsgsLoading(true);
    try {
      const data = await phpApiService.get<Message[]>("chat/messages", {
        roomId: String(roomId),
        page: "1",
        limit: "50",
      });
      const msgs = Array.isArray(data) ? data : [];
      setMessages(msgs);
      if (msgs.length > 0) {
        lastMsgIdRef.current = msgs[msgs.length - 1].id;
      }
    } catch {
      setMessages([]);
    } finally {
      setMsgsLoading(false);
    }
  }, []);

  // ── Poll for new messages every 5s ───────────────────────────────────────

  const pollMessages = useCallback(async (roomId: number) => {
    if (!roomId) return;
    try {
      const params: Record<string, string> = {
        roomId: String(roomId),
      };
      if (lastMsgIdRef.current > 0) {
        params.after = String(lastMsgIdRef.current);
      }
      const data = await phpApiService.get<Message[]>("chat/messages", params);
      const newMsgs = Array.isArray(data) ? data : [];
      if (newMsgs.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const fresh = newMsgs.filter((m) => !existingIds.has(m.id));
          if (fresh.length === 0) return prev;
          lastMsgIdRef.current = fresh[fresh.length - 1].id;
          return [...prev, ...fresh];
        });
      }
    } catch {
      /* silent poll failure */
    }
  }, []);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (activeId === null) return;

    void loadMessages(activeId);

    pollRef.current = setInterval(() => {
      void pollMessages(activeId);
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeId, loadMessages, pollMessages]);

  // Scroll to bottom on new messages
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on messages length change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // ── Filtered rooms ────────────────────────────────────────────────────────

  const filteredRooms = rooms.filter((r) => {
    if (filter !== "all" && r.type !== filter) return false;
    return !search || r.name.toLowerCase().includes(search.toLowerCase());
  });

  const activeRoom = rooms.find((r) => r.id === activeId);

  // ── Select room ───────────────────────────────────────────────────────────

  const selectRoom = useCallback((id: number) => {
    setActiveId(id);
    lastMsgIdRef.current = 0;
    // Clear unread in UI
    setRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, unread_count: 0 } : r)),
    );
  }, []);

  // ── Send message ──────────────────────────────────────────────────────────

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() && !fileAttach) return;
    if (activeId === null) return;
    const text = inputText.trim();
    setInputText("");
    setFileAttach(null);
    try {
      const result = await phpApiService.post<Record<string, unknown>>(
        "chat/send",
        {
          roomId: activeId,
          message: text,
        },
      );
      const msg: Message = {
        id: (result.id as number) ?? Date.now(),
        room_id: activeId,
        sender_id: 1,
        sender_name:
          (result.sender_name as string) ?? currentUser?.fullName ?? "Me",
        sender_role: currentUser?.role ?? "admin",
        content: text,
        sent_at:
          (result.sent_at as string) ??
          new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        is_mine: true,
      };
      setMessages((prev) => [...prev, msg]);
      lastMsgIdRef.current = msg.id;
      setRooms((prev) =>
        prev.map((r) =>
          r.id === activeId
            ? { ...r, last_message: text, last_message_at: msg.sent_at }
            : r,
        ),
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send message",
      );
      setInputText(text); // restore
    }
  }, [inputText, fileAttach, activeId, currentUser]);

  // ── Create room ───────────────────────────────────────────────────────────

  const createRoom = useCallback(async () => {
    if (!newGroupName.trim()) return;
    try {
      const result = await phpApiService.post<Room>("chat/rooms/create", {
        name: newGroupName.trim(),
        type: newGroupType,
      });
      const room: Room = {
        id: result.id ?? Date.now(),
        type: newGroupType,
        name: newGroupName.trim(),
        unread_count: 0,
        member_count: 1,
      };
      setRooms((prev) => [...prev, room]);
      setNewGroupName("");
      setShowNewGroup(false);
      setActiveId(room.id);
      toast.success("Group created");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create group",
      );
    }
  }, [newGroupName, newGroupType]);

  const isSuperAdmin = currentUser?.role === "superadmin";
  const totalUnread = rooms.reduce((s, r) => s + r.unread_count, 0);

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
                onClick={() => void createRoom()}
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
            {roomsLoading ? (
              <div
                className="space-y-2 p-2"
                data-ocid="chat.rooms.loading_state"
              >
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : (
              <>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                  Direct
                </p>
                {filteredRooms
                  .filter((r) => r.type === "direct")
                  .map((r) => (
                    <ConversationItem
                      key={r.id}
                      room={r}
                      active={activeId === r.id}
                      onClick={() => selectRoom(r.id)}
                    />
                  ))}
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 mt-2">
                  Groups
                </p>
                {filteredRooms
                  .filter((r) => r.type !== "direct")
                  .map((r) => (
                    <ConversationItem
                      key={r.id}
                      room={r}
                      active={activeId === r.id}
                      onClick={() => selectRoom(r.id)}
                    />
                  ))}
                {filteredRooms.length === 0 && (
                  <div
                    data-ocid="chat.empty_state"
                    className="text-center py-8 text-muted-foreground text-xs"
                  >
                    No conversations found
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ── Chat window ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeRoom ? (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm">
                  {typeIcon(activeRoom.type)}
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">
                    {activeRoom.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {activeRoom.member_count} member
                    {activeRoom.member_count !== 1 ? "s" : ""}
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
              {msgsLoading ? (
                <div
                  className="space-y-3"
                  data-ocid="chat.messages.loading_state"
                >
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 rounded-2xl w-2/3" />
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div
                  className="flex items-center justify-center h-24 text-muted-foreground text-sm"
                  data-ocid="chat.messages_empty_state"
                >
                  No messages yet. Say hello! 👋
                </div>
              ) : (
                messages.map((msg) => (
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
                    void sendMessage();
                  }
                }}
                className="flex-1"
              />
              <Button
                data-ocid="chat.send_button"
                onClick={() => void sendMessage()}
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
