import { requireProfile } from "@/lib/auth";
import { LeadsCard, type MeetingStatus } from "@/app/caller/LeadsCard";
import { BookingCard } from "@/app/caller/BookingCard";
import type { MeetingResult } from "@/lib/supabase/types";

/** Labels the lead's current meeting status without revealing the mechanics
 * behind it (e.g. that a re-book or follow-up meeting exists) — a caller
 * just needs to know where things stand, not the meeting bookkeeping. */
function statusFor(result: MeetingResult, scheduledStart: string, now: string): MeetingStatus {
  if (result === "pending") {
    return scheduledStart > now
      ? { label: "Meeting upcoming", tone: "new" }
      : { label: "Awaiting outcome", tone: "neutral" };
  }
  if (result === "follow_up") return { label: "Follow-up scheduled", tone: "callback" };
  if (result === "no_show") return { label: "No show", tone: "noanswer" };
  if (result === "not_interested") return { label: "Closed", tone: "dead" };
  return { label: "Onboarded", tone: "booked" };
}

export default async function CallerLeadsPage() {
  const { supabase, profile } = await requireProfile("caller");

  const [{ data: leads }, { data: consultants }, { data: meetings }, { data: recentCalls }] =
    await Promise.all([
      supabase
        .from("leads")
        .select("*")
        .eq("assigned_caller_id", profile.id)
        .order("follow_up_at", { ascending: true, nullsFirst: false })
        .order("updated_at", { ascending: false }),
      // Callers never see who the consultant is — the system assigns whoever
      // is free automatically, so only the id (needed to check availability)
      // is fetched, never the name.
      supabase
        .from("profiles")
        .select("id")
        .eq("role", "consultant")
        .eq("active", true),
      supabase
        .from("meetings")
        .select("*, leads(name)")
        .order("scheduled_start", { ascending: true }),
      supabase
        .from("calls")
        .select("lead_id, outcome, called_at, notes")
        .eq("caller_id", profile.id)
        .order("called_at", { ascending: false }),
    ]);

  const allLeads = leads ?? [];
  const allMeetings = meetings ?? [];

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

  // The lead's status reflects its most recently DECIDED meeting (the latest
  // one with a real outcome), falling back to a still-pending meeting if
  // nothing has been decided yet. This deliberately hides the mechanics of
  // a re-book/follow-up meeting existing — once that new meeting is held and
  // given its own outcome, the status simply updates to reflect it.
  const nowIso = new Date().toISOString();
  const latestByLead = new Map<string, { result: MeetingResult; scheduled_start: string }>();
  for (const m of [...allMeetings].sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start))) {
    const existing = latestByLead.get(m.lead_id);
    if (!existing || m.result !== "pending" || existing.result === "pending") {
      latestByLead.set(m.lead_id, m);
    }
  }
  const meetingStatus: Record<string, MeetingStatus> = {};
  for (const [leadId, m] of latestByLead) {
    meetingStatus[leadId] = statusFor(m.result, m.scheduled_start, nowIso);
  }

  const meetingLinks: Record<
    string,
    { locationType: "google_meet" | "phone"; locationDetail: string | null }
  > = {};
  for (const m of allMeetings) {
    meetingLinks[m.lead_id] = {
      locationType: m.location_type,
      locationDetail: m.location_detail,
    };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl leading-tight text-ink">Leads</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Your outreach list — turn conversations into opportunities.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2.3fr)_minmax(0,1fr)]">
        <LeadsCard
          leads={allLeads}
          history={Object.fromEntries(history)}
          meetingStatus={meetingStatus}
          meetingLinks={meetingLinks}
          consultants={consultants ?? []}
          now={new Date().toISOString()}
        />
        <BookingCard leads={allLeads} consultants={consultants ?? []} />
      </div>
    </div>
  );
}
