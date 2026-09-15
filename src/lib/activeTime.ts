import { createClient } from "@/lib/supabase/server";

/** Formats milliseconds as "Xh Ym" (or "Ym" under an hour, "0m" for none). */
export function formatDuration(ms: number) {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

/**
 * Sums this user's active_sessions for today, clamped to the start of
 * today so a session spanning midnight only counts its today-portion.
 * An open session (ended_at null, i.e. currently online) counts up to now.
 */
export async function getTodayActiveMs(userId: string) {
  const supabase = await createClient();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("active_sessions")
    .select("started_at, ended_at")
    .eq("user_id", userId)
    .or(`ended_at.is.null,ended_at.gte.${startOfToday.toISOString()}`);

  const now = Date.now();
  const startMs = startOfToday.getTime();

  let totalMs = 0;
  for (const session of data ?? []) {
    const sessionStart = Math.max(new Date(session.started_at).getTime(), startMs);
    const sessionEnd = session.ended_at ? new Date(session.ended_at).getTime() : now;
    if (sessionEnd > sessionStart) totalMs += sessionEnd - sessionStart;
  }
  return totalMs;
}

/** Whether this user currently has an open (not-yet-ended) session. */
export async function isCurrentlyOnline(userId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("active_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("ended_at", null);
  return (count ?? 0) > 0;
}
