"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Called right after a successful sign-in. Closes any of this user's own
 * sessions that were never cleanly ended (e.g. a crashed tab) before
 * opening a new one, so a user never has more than one "open" session
 * counted as currently-online at a time.
 */
export async function startSession(userId: string) {
  const supabase = createClient();
  await supabase
    .from("active_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("ended_at", null);
  await supabase.from("active_sessions").insert({ user_id: userId });
}

/** Closes this user's currently-open session (manual sign-out or idle timeout). */
export async function endOpenSession(userId: string) {
  const supabase = createClient();
  await supabase
    .from("active_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("ended_at", null);
}
