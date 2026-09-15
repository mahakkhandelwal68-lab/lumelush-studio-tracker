"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatTime } from "@/lib/datetime";
import type { ChatMessage, UserRole } from "@/lib/supabase/types";
import { Card, cn } from "@/components/ui";

const TEAM_CONVERSATION_ID = "00000000-0000-0000-0000-000000000001";

export interface ChatContact {
  id: string;
  full_name: string;
  role: UserRole;
}

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  caller: "Outreach",
  consultant: "Consultant",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type Selection = { kind: "team" } | { kind: "dm"; contact: ChatContact };

export function ChatApp({
  currentUser,
  contacts,
}: {
  currentUser: { id: string; full_name: string };
  contacts: ChatContact[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [selection, setSelection] = useState<Selection>({ kind: "team" });
  const [conversationId, setConversationId] = useState<string>(TEAM_CONVERSATION_ID);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dmConversationCache = useRef(new Map<string, string>());

  // Resolve (or create) the conversation for the current selection.
  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      setLoading(true);
      if (selection.kind === "team") {
        if (!cancelled) setConversationId(TEAM_CONVERSATION_ID);
        return;
      }

      const cached = dmConversationCache.current.get(selection.contact.id);
      if (cached) {
        if (!cancelled) setConversationId(cached);
        return;
      }

      const { data, error } = await supabase.rpc("get_or_create_dm", {
        other_user_id: selection.contact.id,
      });
      if (!cancelled && !error && data) {
        dmConversationCache.current.set(selection.contact.id, data);
        setConversationId(data);
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [selection, supabase]);

  // Load message history whenever the active conversation changes.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(300);
      if (!cancelled) {
        setMessages(data ?? []);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [conversationId, supabase]);

  // Live updates: one channel for every message insert this user can see
  // (RLS already scopes it to the team channel + their own DMs); filter to
  // the open conversation client-side.
  useEffect(() => {
    const channel = supabase
      .channel("chat_messages_feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const row = payload.new as ChatMessage;
          if (row.conversation_id === conversationId) {
            setMessages((prev) =>
              prev.some((m) => m.id === row.id) ? prev : [...prev, row]
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function sendMessage() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft("");
    const { error } = await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      sender_id: currentUser.id,
      body,
    });
    if (error) {
      setDraft(body);
    }
    setSending(false);
  }

  const senderName = (id: string) =>
    id === currentUser.id
      ? "You"
      : contacts.find((c) => c.id === id)?.full_name ?? "Unknown";

  return (
    <Card className="grid h-[calc(100vh-160px)] grid-cols-[220px_1fr] overflow-hidden">
      <aside className="flex flex-col overflow-y-auto border-r border-edge">
        <button
          onClick={() => setSelection({ kind: "team" })}
          className={cn(
            "flex items-center gap-2.5 px-4 py-3 text-left text-sm transition",
            selection.kind === "team"
              ? "bg-overlay text-ink"
              : "text-ink-dim hover:bg-overlay/60 hover:text-ink"
          )}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full border border-edge-strong bg-raised text-xs font-semibold text-brand-teal">
            #
          </span>
          <span>Team Chat</span>
        </button>

        <div className="data mt-2 px-4 pb-1 text-[11px] font-medium tracking-widest text-ink-faint uppercase">
          Direct messages
        </div>
        {contacts.map((contact) => (
          <button
            key={contact.id}
            onClick={() => setSelection({ kind: "dm", contact })}
            className={cn(
              "flex items-center gap-2.5 px-4 py-3 text-left text-sm transition",
              selection.kind === "dm" && selection.contact.id === contact.id
                ? "bg-overlay text-ink"
                : "text-ink-dim hover:bg-overlay/60 hover:text-ink"
            )}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-edge-strong bg-raised text-xs font-semibold text-ink-dim">
              {initials(contact.full_name)}
            </span>
            <span className="min-w-0">
              <span className="block truncate">{contact.full_name}</span>
              <span className="data block text-[11px] text-ink-faint">
                {ROLE_LABEL[contact.role]}
              </span>
            </span>
          </button>
        ))}
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="border-b border-edge px-5 py-3.5">
          <h2 className="font-display text-base text-ink">
            {selection.kind === "team" ? "Team Chat" : selection.contact.full_name}
          </h2>
          <p className="text-xs text-ink-faint">
            {selection.kind === "team"
              ? "Everyone on the team"
              : ROLE_LABEL[selection.contact.role]}
          </p>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-sm text-ink-faint">Loading…</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-ink-faint">No messages yet — say hello.</p>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === currentUser.id;
              return (
                <div key={m.id} className={cn("flex", mine && "justify-end")}>
                  <div
                    className={cn(
                      "max-w-[70%] rounded-2xl px-3.5 py-2 text-sm",
                      mine
                        ? "bg-brand-teal/20 text-ink"
                        : "border border-edge bg-overlay text-ink"
                    )}
                  >
                    {!mine && selection.kind === "team" && (
                      <p className="data mb-0.5 text-[11px] font-medium text-brand-teal">
                        {senderName(m.sender_id)}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className="data mt-1 text-right text-[10px] text-ink-faint">
                      {formatTime(m.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-center gap-2 border-t border-edge p-3"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message…"
            className="data w-full rounded-lg border border-edge-strong bg-overlay px-3 py-2 text-sm text-ink placeholder:text-ink-faint transition focus:border-brand-teal"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            className="data inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-[#04121f] transition [background:var(--accent-gradient)] hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Send
          </button>
        </form>
      </div>
    </Card>
  );
}
