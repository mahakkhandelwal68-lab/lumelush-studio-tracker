"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { createMeetEvent } from "@/lib/googleCalendar";
import type { CallOutcome, LeadStatus } from "@/lib/supabase/types";

const OUTCOME_TO_STATUS: Record<CallOutcome, LeadStatus> = {
  interested: "callback", // stays actionable until a meeting is actually booked
  not_interested: "not_interested",
  callback_later: "callback",
  no_answer: "no_answer",
};

export async function logCall(input: {
  leadId: string;
  outcome: CallOutcome;
  notes: string;
  /** Required when outcome is callback_later — when they asked to be called. */
  followUpAt?: string | null;
  /** Captured when the lead is marked dead, so admin can see why. */
  notInterestedReason?: string | null;
}) {
  const { supabase, profile } = await requireProfile("caller");

  const { error: callError } = await supabase.from("calls").insert({
    lead_id: input.leadId,
    caller_id: profile.id,
    outcome: input.outcome,
    notes: input.notes || null,
  });
  if (callError) throw new Error(callError.message);

  const { error: leadError } = await supabase
    .from("leads")
    .update({
      status: OUTCOME_TO_STATUS[input.outcome],
      follow_up_at:
        input.outcome === "callback_later" || input.outcome === "interested"
          ? input.followUpAt ?? null
          : null,
      not_interested_reason:
        input.outcome === "not_interested"
          ? input.notInterestedReason ?? null
          : null,
    })
    .eq("id", input.leadId);
  if (leadError) throw new Error(leadError.message);

  revalidatePath("/caller");
}

/**
 * The caller never picks a consultant — the system assigns whoever's free at
 * the chosen time with the lightest current load (see book_meeting_auto).
 */
export async function bookMeeting(input: {
  leadId: string;
  leadName: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  contextNotes: string;
  locationType: "google_meet" | "phone";
  /** Phone number to call — only used when locationType is "phone". */
  locationDetail: string;
  /** Lead's email to invite — only used when locationType is "google_meet". */
  guestEmail: string;
}) {
  await requireProfile("caller");
  const supabase = await createClient();

  const { data: meeting, error } = await supabase.rpc("book_meeting_auto", {
    p_lead_id: input.leadId,
    p_start: input.startTime,
    p_duration_minutes: input.durationMinutes,
    // The generated RPC types mark params without a SQL DEFAULT as required
    // non-null strings, even though Postgres accepts NULL for them fine —
    // cast rather than change what's actually sent.
    p_context_notes: (input.contextNotes || null) as unknown as string,
    p_location_type: input.locationType,
    p_location_detail: (input.locationType === "phone"
      ? input.locationDetail || null
      : null) as unknown as string,
    p_guest_email: (input.locationType === "google_meet"
      ? input.guestEmail || null
      : null) as unknown as string,
  });
  if (error) throw new Error(error.message);

  // Best-effort: generate the real Meet link and invite both parties. If this
  // fails or Google isn't configured yet, the booking still stands.
  if (input.locationType === "google_meet" && meeting) {
    const { data: consultant } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", meeting.consultant_id)
      .single();

    const attendees = [input.guestEmail, consultant?.email].filter(
      (e): e is string => Boolean(e)
    );

    // Context notes are for the consultant only (shown on their dashboard) —
    // never put them in the calendar description, since that goes out in
    // the invite email to the client.
    const created = await createMeetEvent({
      startIso: input.startTime,
      endIso: input.endTime,
      summary: `LumeLush Studio — meeting with ${input.leadName}`,
      attendeeEmails: attendees,
    });

    if (created) {
      await supabase
        .from("meetings")
        .update({ location_detail: created.meetLink })
        .eq("id", meeting.id);
    }
  }

  revalidatePath("/caller");
}

/** Move a dead lead back into the working queue. */
export async function reviveLead(leadId: string) {
  const { supabase } = await requireProfile("caller");

  const { error } = await supabase
    .from("leads")
    .update({ status: "new", not_interested_reason: null })
    .eq("id", leadId);
  if (error) throw new Error(error.message);

  revalidatePath("/caller");
}

export async function requestMoreLeads(count: number, note: string) {
  const { supabase, profile } = await requireProfile("caller");

  if (!Number.isInteger(count) || count < 1 || count > 500) {
    throw new Error("Ask for between 1 and 500 leads");
  }

  const { error } = await supabase.from("lead_requests").insert({
    caller_id: profile.id,
    requested_count: count,
    note: note || null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/caller");
}
