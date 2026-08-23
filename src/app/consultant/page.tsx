import { requireProfile } from "@/lib/auth";
import { MeetingsBoard } from "@/app/consultant/MeetingsBoard";
import { TodayStrip } from "@/app/consultant/TodayStrip";
import { ToolCards } from "@/app/consultant/ToolCards";
import {
  AVAILABILITY_HORIZON_DAYS,
  DEFAULT_MEETING_MINUTES,
  countByDay,
  excludeFullDays,
  freeStartTimes,
  windowsWithDefaults,
} from "@/lib/scheduling";
import { isoToInputValue } from "@/lib/datetime";

export default async function ConsultantMeetingsPage() {
  const { supabase, profile } = await requireProfile("consultant");

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const horizon = new Date();
  horizon.setDate(horizon.getDate() + AVAILABILITY_HORIZON_DAYS);

  const [{ data: meetings }, { data: windows }, { data: tools }] =
    await Promise.all([
      supabase
        .from("meetings")
        .select(
          "*, leads(name, business_name, phone, email, location, website), caller:profiles!meetings_caller_id_fkey(full_name)"
        )
        .eq("consultant_id", profile.id)
        .order("scheduled_start", { ascending: true }),
      supabase
        .from("availability_windows")
        .select("start_time, end_time")
        .eq("consultant_id", profile.id)
        .gte("end_time", new Date().toISOString())
        .lt("start_time", horizon.toISOString())
        .order("start_time", { ascending: true }),
      supabase
        .from("tool_resources")
        .select("*")
        .order("sort_order", { ascending: true }),
    ]);

  const all = meetings ?? [];

  const meetingsToday = all.filter(
    (m) =>
      m.scheduled_start >= startOfToday.toISOString() &&
      m.scheduled_start < endOfToday.toISOString()
  ).length;

  const awaitingOutcome = all.filter(
    (m) => m.result === "pending" && m.scheduled_end < new Date().toISOString()
  ).length;

  const onboarded = all.filter((m) => m.result === "onboarded").length;

  // Bookable starts left across the whole horizon, so the consultant can see
  // at a glance whether they still have room.
  const openWindows = (windows ?? []).map((w) => ({
    start: w.start_time,
    end: w.end_time,
  }));
  const busy = all.map((m) => ({
    start: m.scheduled_start,
    end: m.scheduled_end,
  }));
  const dayKeys = Array.from({ length: AVAILABILITY_HORIZON_DAYS }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return isoToInputValue(d.toISOString()).split("T")[0];
  });
  const effectiveWindows = windowsWithDefaults(openWindows, dayKeys);
  const rawFreeTimes = freeStartTimes(effectiveWindows, busy, DEFAULT_MEETING_MINUTES);
  const meetingsPerDay = countByDay(busy.map((b) => b.start));
  const freeSlots = excludeFullDays(rawFreeTimes, meetingsPerDay).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl leading-tight text-ink">
          {greeting()}, {profile.full_name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Meetings booked into your slots by the outbound team.
        </p>
      </div>

      <TodayStrip
        meetingsToday={meetingsToday}
        awaitingOutcome={awaitingOutcome}
        onboarded={onboarded}
        openSlots={freeSlots}
      />

      <MeetingsBoard
        meetings={all}
        windows={openWindows}
        consultantId={profile.id}
        tools={tools ?? []}
        now={new Date().toISOString()}
      />

      <section>
        <h2 className="font-display text-lg leading-tight text-ink">
          Your toolkit
        </h2>
        <p className="mt-0.5 mb-4 text-sm text-ink-dim">
          Agents, decks and the playbook for running a meeting.
        </p>
        <ToolCards tools={tools ?? []} />
      </section>
    </div>
  );
}

function greeting() {
  const h = (new Date().getUTCHours() + 5.5) % 24;
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
