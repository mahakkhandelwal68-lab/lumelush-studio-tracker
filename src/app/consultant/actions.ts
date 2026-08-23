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

/**
 * Toggles exactly one clock hour of availability on `dayKey` (the calendar
 * grid's click target). Correctly splits, shrinks, merges or deletes the
 * underlying availability_windows rows so the rest of the day is untouched
 * — clicking one cell only ever changes that one hour. A day with zero
 * explicit windows is treated as open all day (the same default the
 * booking flow uses); toggling an hour off there materializes the
 * remaining hours as real windows. Refuses to touch an hour that already
 * has a meeting booked in it.
 */
export async function toggleDayHour(dayKey: string, hour: number) {
  const { supabase, profile } = await requireProfile("consultant");

  if (hour < DAY_START_HOUR || hour >= DAY_END_HOUR) {
    throw new Error("Outside business hours");
  }

  const dayStartIso = inputValueToISO(`${dayKey}T00:00`);
  if (isInsideLockWindow(dayStartIso)) {
    throw new Error("Today and tomorrow are locked — request a change from admin.");
  }

  const dayEndIso = inputValueToISO(`${nextDayKey(dayKey)}T00:00`);
  const hourStartIso = inputValueToISO(`${dayKey}T${pad2(hour)}:00`);
  const hourEndIso = inputValueToISO(`${dayKey}T${pad2(hour + 1)}:00`);
  const hourStart = new Date(hourStartIso).getTime();
  const hourEnd = new Date(hourEndIso).getTime();

  const [{ data: existing }, { data: dayMeetings }] = await Promise.all([
    supabase
      .from("availability_windows")
      .select("id, start_time, end_time")
      .eq("consultant_id", profile.id)
      .gte("start_time", dayStartIso)
      .lt("start_time", dayEndIso),
    supabase
      .from("meetings")
      .select("scheduled_start, scheduled_end")
      .eq("consultant_id", profile.id)
      .gte("scheduled_start", dayStartIso)
      .lt("scheduled_start", dayEndIso),
  ]);

  const hourHasMeeting = (dayMeetings ?? []).some(
    (m) =>
      new Date(m.scheduled_start).getTime() < hourEnd &&
      new Date(m.scheduled_end).getTime() > hourStart
  );
  if (hourHasMeeting) {
    throw new Error("A meeting is booked in that hour.");
  }

  const windows = (existing ?? []).map((w) => ({
    id: w.id,
    start: new Date(w.start_time).getTime(),
    end: new Date(w.end_time).getTime(),
  }));
  const hasExplicit = windows.length > 0;

  const currentlyAvailable = hasExplicit
    ? windows.some((w) => w.start <= hourStart && w.end >= hourEnd)
    : true; // no explicit hours set -> default open all day

  if (currentlyAvailable) {
    // Remove just this hour: shrink, split, or delete whichever window(s)
    // cover it.
    for (const w of windows) {
      if (w.start >= hourEnd || w.end <= hourStart) continue;

      const keepsBefore = w.start < hourStart;
      const keepsAfter = w.end > hourEnd;

      if (!keepsBefore && !keepsAfter) {
        await supabase.from("availability_windows").delete().eq("id", w.id);
      } else if (keepsBefore && !keepsAfter) {
        await supabase
          .from("availability_windows")
          .update({ end_time: hourStartIso })
          .eq("id", w.id);
      } else if (!keepsBefore && keepsAfter) {
        await supabase
          .from("availability_windows")
          .update({ start_time: hourEndIso })
          .eq("id", w.id);
      } else {
        await supabase
          .from("availability_windows")
          .update({ end_time: hourStartIso })
          .eq("id", w.id);
        await supabase.from("availability_windows").insert({
          consultant_id: profile.id,
          start_time: hourEndIso,
          end_time: new Date(w.end).toISOString(),
        });
      }
    }

    if (!hasExplicit) {
      // Default-open day: materialize the rest of the day minus this hour.
      const inserts: { consultant_id: string; start_time: string; end_time: string }[] = [];
      if (hour > DAY_START_HOUR) {
        inserts.push({
          consultant_id: profile.id,
          start_time: inputValueToISO(`${dayKey}T${pad2(DAY_START_HOUR)}:00`),
          end_time: hourStartIso,
        });
      }
      if (hour + 1 < DAY_END_HOUR) {
        inserts.push({
          consultant_id: profile.id,
          start_time: hourEndIso,
          end_time: inputValueToISO(`${dayKey}T${pad2(DAY_END_HOUR)}:00`),
        });
      }
      if (inserts.length > 0) {
        await supabase.from("availability_windows").insert(inserts);
      }
    }
  } else {
    // Add just this hour, merging with whatever it touches.
    const touchingBefore = windows.find((w) => w.end === hourStart);
    const touchingAfter = windows.find((w) => w.start === hourEnd);

    if (touchingBefore && touchingAfter) {
      await supabase
        .from("availability_windows")
        .update({ end_time: new Date(touchingAfter.end).toISOString() })
        .eq("id", touchingBefore.id);
      await supabase.from("availability_windows").delete().eq("id", touchingAfter.id);
    } else if (touchingBefore) {
      await supabase
        .from("availability_windows")
        .update({ end_time: hourEndIso })
        .eq("id", touchingBefore.id);
    } else if (touchingAfter) {
      await supabase
        .from("availability_windows")
        .update({ start_time: hourStartIso })
        .eq("id", touchingAfter.id);
    } else {
      await supabase.from("availability_windows").insert({
        consultant_id: profile.id,
        start_time: hourStartIso,
        end_time: hourEndIso,
      });
    }
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
