"use client";

import { createClient } from "@/lib/supabase/client";

// Matches the idle-logout threshold in IdleAutoLogout. If a session is
// still "open" (ended_at null) when we go to close it — because the tab
// was closed outright rather than idled out or signed out of, so the
// client-side idle timer never got to fire — we have no record of when
// activity actually stopped. Capping the assumed end at started_at + this
// window bounds the error to at most 7 minutes, instead of potentially
// counting hours or days as active time if the same person doesn't log
// back in until much later.
const IDLE_LIMIT_MS = 7 * 60 * 1000;

async function closeDanglingSessions(userId: string) {
  const supabase = createClient();
  const { data: open } = await supabase
    .from("active_sessions")
    .select("id, started_at")
    .eq("user_id", userId)
    .is("ended_at", null);

  const now = Date.now();
  for (const session of open ?? []) {
    const cappedEnd = Math.min(now, new Date(session.started_at).getTime() + IDLE_LIMIT_MS);
    await supabase
      .from("active_sessions")
      .update({ ended_at: new Date(cappedEnd).toISOString() })
      .eq("id", session.id);
  }
}

/**
 * Called right after a successful sign-in. Closes any of this user's own
 * sessions that were never cleanly ended (e.g. a closed tab) before
 * opening a new one, so a user never has more than one "open" session
 * counted as currently-online at a time.
 */
export async function startSession(userId: string) {
  await closeDanglingSessions(userId);
  const supabase = createClient();
  await supabase.from("active_sessions").insert({ user_id: userId });
}

// A session younger than this at mount time is the one login just opened;
// anything older still open is a leftover from a closed/killed tab.
const FRESH_SESSION_MS = 60_000;

/**
 * Makes sure this user has exactly one live session while the app is on
 * screen: called when a page mounts (a reload closes the old session via
 * pagehide) and when the app comes back to the foreground after being
 * backgrounded (which closed it, so time away isn't counted as active).
 * Leftover stale sessions are capped like at login rather than resumed.
 */
export async function ensureOpenSession(userId: string) {
  const supabase = createClient();
  const { data: open } = await supabase
    .from("active_sessions")
    .select("id, started_at")
    .eq("user_id", userId)
    .is("ended_at", null);

  const now = Date.now();
  let hasFresh = false;
  for (const session of open ?? []) {
    const started = new Date(session.started_at).getTime();
    if (now - started < FRESH_SESSION_MS) {
      hasFresh = true;
      continue;
    }
    await supabase
      .from("active_sessions")
      .update({ ended_at: new Date(Math.min(now, started + IDLE_LIMIT_MS)).toISOString() })
      .eq("id", session.id);
  }
  if (!hasFresh) await supabase.from("active_sessions").insert({ user_id: userId });
}

/**
 * Closes this user's currently-open session. Used for the two cases where
 * we know activity actually just stopped (manual sign-out, idle timeout) —
 * both stamp ended_at as right now, not capped, since those ARE the real
 * end time.
 */
export async function endOpenSession(userId: string) {
  const supabase = createClient();
  await supabase
    .from("active_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("ended_at", null);
}
