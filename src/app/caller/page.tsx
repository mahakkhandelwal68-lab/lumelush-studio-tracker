import { requireProfile } from "@/lib/auth";
import { TodayStrip } from "@/app/caller/TodayStrip";
import { LeadsCard } from "@/app/caller/LeadsCard";
import { BookingCard } from "@/app/caller/BookingCard";
import { RequestLeadsCard } from "@/app/caller/RequestLeadsCard";
import { PlaybookCard } from "@/app/caller/PlaybookCard";

export default async function CallerDashboard() {
  const { supabase, profile } = await requireProfile("caller");

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [
    { data: leads },
    { data: consultants },
    { data: meetings },
    { data: callsToday },
    { data: recentCalls },
    { data: openRequests },
    { data: playbook },
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("*")
      .eq("assigned_caller_id", profile.id)
      .order("follow_up_at", { ascending: true, nullsFirst: false })
      .order("updated_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "consultant")
      .eq("active", true),
    // Every meeting on this caller's leads — including follow-ups the
    // consultant booked, so the meeting count is complete.
    supabase
      .from("meetings")
      .select("*, leads(name)")
      .order("scheduled_start", { ascending: true }),
    supabase
      .from("calls")
      .select("id")
      .eq("caller_id", profile.id)
      .gte("called_at", startOfToday.toISOString())
      .lt("called_at", endOfToday.toISOString()),
    // Last attempt per lead, for the "history" line on each row.
    supabase
      .from("calls")
      .select("lead_id, outcome, called_at, notes")
      .eq("caller_id", profile.id)
      .order("called_at", { ascending: false }),
    supabase
      .from("lead_requests")
      .select("*")
      .eq("caller_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("tool_resources")
      .select("*")
      .eq("key", "caller_playbook")
      .maybeSingle(),
  ]);

  const allLeads = leads ?? [];
  const allMeetings = meetings ?? [];

  // Collapse the call log into per-lead attempt counts + latest attempt.
  const history = new Map<
    string,
    { attempts: number; lastAt: string; lastOutcome: string; lastNotes: string | null }
  >();
  for (const call of recentCalls ?? []) {
    const existing = history.get(call.lead_id);
    if (existing) {
      existing.attempts += 1;
    } else {
      history.set(call.lead_id, {
        attempts: 1,
        lastAt: call.called_at,
        lastOutcome: call.outcome,
        lastNotes: call.notes,
      });
    }
  }

  // How many meetings each lead has had, so the caller can see when a lead
  // is on its second or third round with a consultant.
  const meetingCounts: Record<string, { total: number; held: number }> = {};
  for (const m of allMeetings) {
    const entry = (meetingCounts[m.lead_id] ??= { total: 0, held: 0 });
    entry.total += 1;
    if (m.result !== "pending") entry.held += 1;
  }

  const nowIso = new Date().toISOString();
  const callbacksDueToday = allLeads.filter(
    (l) =>
      l.status === "callback" &&
      l.follow_up_at !== null &&
      l.follow_up_at < endOfToday.toISOString()
  ).length;

  const meetingsThisWeek = allMeetings.filter(
    (m) => m.created_at >= weekAgo.toISOString()
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl leading-tight text-ink">
          {greeting()}, {profile.full_name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Here&apos;s where your queue stands right now.
        </p>
      </div>

      <TodayStrip
        callbacksDue={callbacksDueToday}
        newLeads={allLeads.filter((l) => l.status === "new").length}
        callsToday={callsToday?.length ?? 0}
        meetingsThisWeek={meetingsThisWeek}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
        <LeadsCard
          leads={allLeads}
          history={Object.fromEntries(history)}
          meetingCounts={meetingCounts}
          consultants={consultants ?? []}
          now={nowIso}
        />

        <div className="space-y-6">
          <BookingCard leads={allLeads} consultants={consultants ?? []} />
          <PlaybookCard playbook={playbook ?? null} />
          <RequestLeadsCard
            openRequests={openRequests ?? []}
            remainingLeads={
              allLeads.filter((l) => l.status === "new" || l.status === "no_answer")
                .length
            }
          />
        </div>
      </div>
    </div>
  );
}

function greeting() {
  const hour = new Date().getUTCHours() + 5.5; // display timezone
  const h = hour % 24;
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
