import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * The 4 header stat pills (calls made today, meetings booked this week,
 * callbacks due, new leads) are needed by both the caller layout (header)
 * and the Chat page (Today's Summary panel) on the same request. Wrapped in
 * React's `cache()` so calling this twice in one render pass — once from
 * the layout, once from a page — hits the database once, not twice.
 *
 * Takes only the caller's id (a stable string), not a supabase client
 * instance, since cache() keys on argument identity and a fresh client
 * object per call would defeat the memoization.
 */
export const getCallerHeaderStats = cache(async (callerId: string) => {
  const supabase = await createClient();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [
    { count: callsToday },
    { count: meetingsThisWeek },
    { count: callbacksDue },
    { count: newLeads },
  ] = await Promise.all([
    supabase
      .from("calls")
      .select("*", { count: "exact", head: true })
      .eq("caller_id", callerId)
      .gte("called_at", startOfToday.toISOString())
      .lt("called_at", endOfToday.toISOString()),
    supabase
      .from("meetings")
      .select("*", { count: "exact", head: true })
      .eq("caller_id", callerId)
      .gte("created_at", weekAgo.toISOString()),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("assigned_caller_id", callerId)
      .eq("status", "callback")
      .lt("follow_up_at", endOfToday.toISOString()),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("assigned_caller_id", callerId)
      .eq("status", "new"),
  ]);

  return {
    callsToday: callsToday ?? 0,
    meetingsThisWeek: meetingsThisWeek ?? 0,
    callbacksDue: callbacksDue ?? 0,
    newLeads: newLeads ?? 0,
  };
});
