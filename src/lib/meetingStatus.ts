// Shared logic for showing an SDR a lead's overall meeting status, without
// exposing the mechanics behind it — specifically, that a consultant has
// booked a fresh re-book/follow-up meeting for a lead that was previously a
// no-show or needed a follow-up. See PROJECT_HANDOFF.md ("No-shows stay with
// the consultant, not the SDR").
import type { MeetingResult } from "@/lib/supabase/types";

export interface MeetingStageInfo {
  label: string;
  tone: "neutral" | "new" | "callback" | "noanswer" | "dead" | "booked";
}

/** The pipeline stage a single meeting is in, on its own. */
export function stageFor(
  result: MeetingResult,
  scheduledStart: string,
  now: string
): MeetingStageInfo {
  if (result === "pending") {
    return scheduledStart > now
      ? { label: "Upcoming", tone: "new" }
      : { label: "Awaiting outcome", tone: "neutral" };
  }
  if (result === "follow_up") return { label: "Follow-up scheduled", tone: "callback" };
  if (result === "no_show") return { label: "No show", tone: "noanswer" };
  if (result === "not_interested") return { label: "Closed", tone: "dead" };
  return { label: "Onboarded", tone: "booked" };
}

/**
 * Picks, for each lead_id, the ONE meeting that represents that lead's
 * current status — the most recently decided (non-pending) meeting, falling
 * back to a still-pending meeting only if nothing has been decided yet.
 *
 * This is what hides a re-book: once a meeting is marked no-show or
 * follow-up and the consultant books a fresh meeting for the same lead, that
 * new meeting stays pending and is skipped here — the lead keeps showing its
 * last decided status until the NEW meeting is itself given an outcome.
 */
export function representativeMeetingByLead<
  T extends { lead_id: string; result: MeetingResult; scheduled_start: string },
>(meetings: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const m of [...meetings].sort((a, b) =>
    a.scheduled_start.localeCompare(b.scheduled_start)
  )) {
    const existing = map.get(m.lead_id);
    if (!existing || m.result !== "pending" || existing.result === "pending") {
      map.set(m.lead_id, m);
    }
  }
  return map;
}
