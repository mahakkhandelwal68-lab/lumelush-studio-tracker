import { requireProfile } from "@/lib/auth";
import { LeadsCard } from "@/app/caller/LeadsCard";
import { BookingCard } from "@/app/caller/BookingCard";
import { representativeMeetingByLead, stageFor } from "@/lib/meetingStatus";

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

  // One representative meeting per lead — see meetingStatus.ts for why (it's
  // what hides a re-book/follow-up meeting until it has its own outcome).
  const nowIso = new Date().toISOString();
  const repByLead = representativeMeetingByLead(allMeetings);

  const meetingStatus: Record<string, ReturnType<typeof stageFor>> = {};
  const meetingLinks: Record<
    string,
    { locationType: "google_meet" | "phone"; locationDetail: string | null }
  > = {};
  for (const [leadId, m] of repByLead) {
    meetingStatus[leadId] = stageFor(m.result, m.scheduled_start, nowIso);
    meetingLinks[leadId] = {
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
