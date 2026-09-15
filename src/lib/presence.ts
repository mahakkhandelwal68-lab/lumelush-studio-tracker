"use client";

import { createClient } from "@/lib/supabase/client";

const PRESENCE_CHANNEL = "presence-online";

type Listener = (onlineIds: Set<string>) => void;
type PresenceChannel = ReturnType<ReturnType<typeof createClient>["channel"]>;

// Module-scoped, not component-scoped: createBrowserClient (via @supabase/ssr)
// hands back one singleton client per browser tab, so every caller — the
// PresenceBeacon mounted in each role layout, and ChatApp's online-dot
// listener — share the same underlying Realtime channel registry. Two
// separate `.channel()` calls for the same topic collide (registering a
// `presence` listener on a channel that's already subscribed throws), so
// both tracking your own presence and reading everyone else's go through
// this one channel instance instead of each creating their own.
let channel: PresenceChannel | null = null;
let currentOnlineIds = new Set<string>();
const listeners = new Set<Listener>();
let pendingUserId: string | null = null;

function ensureChannel(): PresenceChannel {
  if (channel) return channel;

  const supabase = createClient();
  const ch = supabase.channel(PRESENCE_CHANNEL);
  channel = ch;

  ch.on("presence", { event: "sync" }, () => {
    const state = ch.presenceState<{ user_id: string }>();
    const ids = new Set<string>();
    for (const presences of Object.values(state)) {
      for (const p of presences) ids.add(p.user_id);
    }
    currentOnlineIds = ids;
    listeners.forEach((listener) => listener(currentOnlineIds));
  });

  ch.subscribe(async (status) => {
    if (status === "SUBSCRIBED" && pendingUserId) {
      await ch.track({ user_id: pendingUserId, online_at: new Date().toISOString() });
    }
  });

  return ch;
}

/** Subscribes to live online-user-id updates; returns an unsubscribe fn. */
export function subscribeToPresence(listener: Listener) {
  ensureChannel();
  listener(currentOnlineIds);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Marks the current user online on the shared presence channel. */
export function trackOwnPresence(userId: string) {
  pendingUserId = userId;
  const ch = ensureChannel();
  if (ch.state === "joined") {
    ch.track({ user_id: userId, online_at: new Date().toISOString() });
  }
}
