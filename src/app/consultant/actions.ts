"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { MeetingResult } from "@/lib/supabase/types";
import { LOCK_WINDOW_HOURS, isInsideLockWindow } from "@/lib/policy";
import { DAY_END_HOUR, DAY_START_HOUR } from "@/lib/scheduling";
import { inputValueToISO } from "@/lib/datetime";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function nextDayKey(dayKey: string) {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().split("T")[0];
}

export async function addWindow(startTime: string, endTime: string) {
  const { supabase, profile } = await requireProfile("consultant");

  if (new Date(endTime) <= new Date(startTime)) {
    throw new Error("End time must be after start time");
  }
  if (new Date(startTime).getTime() < Date.now()) {
    throw new Error("That time has already passed");
  }
  if (isInsideLockWindow(startTime)) {
    throw new Error(
      `Inside the ${LOCK_WINDOW_HOURS}-hour window — ask admin to change it.`
    );
  }

  const { error } = await supabase.from("availability_windows").insert({
    consultant_id: profile.id,
    start_time: startTime,
    end_time: endTime,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/consultant/availability");
}

export async function removeWindow(windowId: string) {
  const { supabase, profile } = await requireProfile("consultant");

  const { data: window, error: fetchError } = await supabase
    .from("availability_windows")
    .select("start_time, end_time")
    .eq("id", windowId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  if (isInsideLockWindow(window.start_time)) {
    throw new Error(
      `Inside the ${LOCK_WINDOW_HOURS}-hour window — request a change from admin instead.`
    );
  }

  // Refuse if a meeting already sits inside this window.
  const { count, error: bookedError } = await supabase
    .from("meetings")
    .select("*", { count: "exact", head: true })
    .eq("consultant_id", profile.id)
    .lt("scheduled_start", window.end_time)
    .gt("scheduled_end", window.start_time);
  if (bookedError) throw new Error(bookedError.message);

  if ((count ?? 0) > 0) {
    throw new Error(
      "There's a meeting booked in this window — ask admin to move it first."
    );
  }

  const { error } = await supabase
    .from("availability_windows")
    .delete()
    .eq("id", windowId);
  if (error) throw new Error(error.message);

  revalidatePath("/consultant/availability");
}

function minToHHMM(min: number) {
  return `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`;
}

/**
 * Replaces a whole day's availability in one shot — the sole way the
 * availability editor's drag-to-set sliders and "+ Add slot" persist
 * changes, so an edit gesture is always one round trip.
 *
 * `ranges` are minute-of-day boundaries within the working day (e.g.
 * `[{startMin: 540, endMin: 780}]` for 09:00–13:00). An empty array means
 * "day off" — since a day with no explicit windows is simply not available
 * (see DEFAULT_AVAILABLE_WHEN_UNSET in scheduling.ts), deleting every row
 * for the day already represents that correctly.
 */
export async function setDayWindows(
  dayKey: string,
  ranges: { startMin: number; endMin: number }[]
) {
  const { supabase, profile } = await requireProfile("consultant");

  const dayStartIso = inputValueToISO(`${dayKey}T00:00`);
  if (isInsideLockWindow(dayStartIso)) {
    throw new Error("Today and tomorrow are locked — request a change from admin.");
  }

  const dayStartMin = DAY_START_HOUR * 60;
  const dayEndMin = DAY_END_HOUR * 60;
  for (const r of ranges) {
    if (
      r.startMin < dayStartMin ||
      r.endMin > dayEndMin ||
      r.startMin >= r.endMin
    ) {
      throw new Error("Invalid hours");
    }
  }

  const dayEndIso = inputValueToISO(`${nextDayKey(dayKey)}T00:00`);

  const { data: dayMeetings, error: meetingsError } = await supabase
    .from("meetings")
    .select("scheduled_start, scheduled_end")
    .eq("consultant_id", profile.id)
    .gte("scheduled_start", dayStartIso)
    .lt("scheduled_start", dayEndIso);
  if (meetingsError) throw new Error(meetingsError.message);

  // Every existing meeting must still fall inside one of the new ranges —
  // otherwise this edit would silently strand a booked meeting outside its
  // own availability.
  for (const m of dayMeetings ?? []) {
    const mStart = new Date(m.scheduled_start).getTime();
    const mEnd = new Date(m.scheduled_end).getTime();
    const covered = ranges.some((r) => {
      const rStart = new Date(inputValueToISO(`${dayKey}T${minToHHMM(r.startMin)}`)).getTime();
      const rEnd = new Date(inputValueToISO(`${dayKey}T${minToHHMM(r.endMin)}`)).getTime();
      return rStart <= mStart && rEnd >= mEnd;
    });
    if (!covered) {
      throw new Error(
        "There's a meeting booked outside those hours — move it first or pick different hours."
      );
    }
  }

  const { error: deleteError } = await supabase
    .from("availability_windows")
    .delete()
    .eq("consultant_id", profile.id)
    .gte("start_time", dayStartIso)
    .lt("start_time", dayEndIso);
  if (deleteError) throw new Error(deleteError.message);

  if (ranges.length > 0) {
    const rows = ranges.map((r) => ({
      consultant_id: profile.id,
      start_time: inputValueToISO(`${dayKey}T${minToHHMM(r.startMin)}`),
      end_time: inputValueToISO(`${dayKey}T${minToHHMM(r.endMin)}`),
    }));
    const { error: insertError } = await supabase
      .from("availability_windows")
      .insert(rows);
    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath("/consultant/availability");
}

/** Applies the same set of windows to every day in the coming week. */
export async function copyWindowsToWeek(
  dayWindows: { start: string; end: string }[]
) {
  const { supabase, profile } = await requireProfile("consultant");
  if (dayWindows.length === 0) throw new Error("Nothing to copy");

  const rows: { consultant_id: string; start_time: string; end_time: string }[] =
    [];

  for (let dayOffset = 1; dayOffset <= 6; dayOffset++) {
    for (const w of dayWindows) {
      const start = new Date(
        new Date(w.start).getTime() + dayOffset * 24 * 60 * 60 * 1000
      );
      const end = new Date(
        new Date(w.end).getTime() + dayOffset * 24 * 60 * 60 * 1000
      );
      if (isInsideLockWindow(start.toISOString())) continue;
      rows.push({
        consultant_id: profile.id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      });
    }
  }

  if (rows.length === 0) return;

  const { error } = await supabase.from("availability_windows").insert(rows);
  if (error) throw new Error(error.message);

  revalidatePath("/consultant/availability");
}

export async function requestAvailabilityChange(
  slotStart: string,
  reason: string
) {
  const { supabase, profile } = await requireProfile("consultant");

  if (!reason.trim()) throw new Error("Tell admin why the slot needs changing");

  const { error } = await supabase
    .from("availability_change_requests")
    .insert({
      consultant_id: profile.id,
      slot_start: slotStart,
      reason: reason.trim(),
    });
  if (error) throw new Error(error.message);

  revalidatePath("/consultant/availability");
}

export async function logMeetingResult(input: {
  meetingId: string;
  result: MeetingResult;
  resultNotes: string;
  analysisOutput: string;
  packageName?: string;
}) {
  const { supabase } = await requireProfile("consultant");

  const { data: meeting, error: fetchError } = await supabase
    .from("meetings")
    .select("lead_id")
    .eq("id", input.meetingId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase
    .from("meetings")
    .update({
      result: input.result,
      result_notes: input.resultNotes || null,
      analysis_output: input.analysisOutput || null,
      completed_at: new Date().toISOString(),
      package_name: input.result === "onboarded" ? input.packageName || null : null,
    })
    .eq("id", input.meetingId);
  if (error) throw new Error(error.message);

  // Push the lead back into the right place for whoever owns it next.
  if (input.result === "no_show") {
    // Goes back to the caller who booked it, into their own No-show sheet
    // so they can chase and re-book.
    await supabase
      .from("leads")
      .update({ status: "no_show", follow_up_at: new Date().toISOString() })
      .eq("id", meeting.lead_id);
  } else if (input.result === "not_interested") {
    await supabase
      .from("leads")
      .update({
        status: "not_interested",
        not_interested_reason: input.resultNotes || "Declined after meeting",
      })
      .eq("id", meeting.lead_id);
  }

  revalidatePath("/consultant");
  revalidatePath("/caller");
}

/** Books the next meeting for a follow-up and links it to the original. */
export async function bookFollowUp(
  originalMeetingId: string,
  leadId: string,
  consultantId: string,
  startTime: string,
  durationMinutes: number,
  contextNotes: string
) {
  await requireProfile("consultant");
  const supabase = await createClient();

  const { data: created, error } = await supabase.rpc("book_meeting_at", {
    p_lead_id: leadId,
    p_consultant_id: consultantId,
    p_start: startTime,
    p_duration_minutes: durationMinutes,
    // The generated RPC types mark params without a SQL DEFAULT as required
    // non-null strings, even though Postgres accepts NULL for them fine —
    // cast rather than change what's actually sent.
    p_context_notes: (contextNotes || null) as unknown as string,
    // Follow-ups inherit the studio default; the consultant can share a link
    // separately if they'd rather meet elsewhere.
    p_location_type: "google_meet",
    p_location_detail: null as unknown as string,
  });
  if (error) throw new Error(error.message);

  const { error: linkError } = await supabase
    .from("meetings")
    .update({ follow_up_meeting_id: created.id })
    .eq("id", originalMeetingId);
  if (linkError) throw new Error(linkError.message);

  revalidatePath("/consultant");
}

export async function markProposalSent(meetingId: string) {
  const { supabase } = await requireProfile("consultant");
  const { error } = await supabase
    .from("meetings")
    .update({ proposal_sent_at: new Date().toISOString() })
    .eq("id", meetingId);
  if (error) throw new Error(error.message);
  revalidatePath("/consultant");
}

export async function markInvoiceSent(meetingId: string) {
  const { supabase } = await requireProfile("consultant");
  const { error } = await supabase
    .from("meetings")
    .update({ invoice_sent_at: new Date().toISOString() })
    .eq("id", meetingId);
  if (error) throw new Error(error.message);
  revalidatePath("/consultant");
}
