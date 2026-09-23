import { requireProfile } from "@/lib/auth";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui";
import { StatCard } from "@/components/sdr/StatCard";
import { representativeMeetingByLead, stageFor } from "@/lib/meetingStatus";

const COL_HEAD =
  "data px-3 py-2.5 text-left text-[11px] font-medium tracking-wide text-ink-faint uppercase";

export default async function CallerMeetingsPage() {
  const { supabase, profile } = await requireProfile("caller");

  // RLS (meetings_caller_own OR meetings_caller_read_own_leads) already
  // restricts this to meetings tied to this caller's own leads — including
  // follow-ups/re-books the consultant booked — so no other caller's
  // pipeline shows up here regardless of who did the booking.
  // Callers never see who the consultant is — the pipeline is handed off
  // and the consultant is assigned automatically, so their identity isn't
  // fetched here at all.
  const { data: meetings } = await supabase
    .from("meetings")
    .select("lead_id, result, scheduled_start, leads(name, business_name, ref)")
    .order("scheduled_start", { ascending: true });

  const nowIso = new Date().toISOString();

  // One row per lead, not one row per meeting: this shows only the lead and
  // its current status, never the meeting bookkeeping behind it. Picking the
  // most recently DECIDED meeting (falling back to a still-pending one) is
  // what keeps a no-show/follow-up lead showing its last decided status
  // instead of revealing that the consultant quietly booked a re-book/
  // follow-up meeting — that only changes once the new meeting itself gets
  // an outcome. See lib/meetingStatus.ts.
  const rows = [...representativeMeetingByLead(meetings ?? []).values()]
    .map((m) => ({ ...m, stage: stageFor(m.result, m.scheduled_start, nowIso) }))
    .sort((a, b) => b.scheduled_start.localeCompare(a.scheduled_start));

  const onboardedCount = rows.filter((m) => m.result === "onboarded").length;
  const upcomingCount = rows.filter(
    (m) => m.result === "pending" && m.scheduled_start > nowIso
  ).length;
  const noShowCount = rows.filter((m) => m.result === "no_show").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl leading-tight text-ink">
          Booked meetings
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Every lead you&apos;ve handed off to a consultant, and where each one
          stands right now.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard tone="blue" icon={<CalendarGlyph />} label="Leads handed off" value={rows.length} />
        <StatCard tone="purple" icon={<CalendarGlyph />} label="Upcoming" value={upcomingCount} />
        <StatCard tone="green" icon={<CalendarGlyph />} label="Onboarded" value={onboardedCount} />
        <StatCard tone="red" icon={<CalendarGlyph />} label="No-shows" value={noShowCount} />
      </div>

      <Card>
        <CardHeader
          title="Meeting status"
          subtitle={`${profile.full_name.split(" ")[0]}'s leads only`}
          iconTone="mint"
          icon={
            <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="3" y="4.5" width="14" height="12" rx="2" />
              <path d="M3 8.5h14M7 3v3M13 3v3" strokeLinecap="round" />
            </svg>
          }
        />

        {rows.length === 0 ? (
          <EmptyState
            title="No meetings yet."
            hint="Once you book a meeting with a consultant, it'll show up here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-edge">
                  <th className={COL_HEAD}>Lead</th>
                  <th className={COL_HEAD}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {rows.map((m) => (
                  <tr key={m.lead_id} className="align-top">
                    <td className="px-3 py-3">
                      <p className="data text-sm font-medium text-ink">
                        {m.leads?.business_name ?? m.leads?.name ?? "Unknown lead"}
                      </p>
                      <p className="data mt-0.5 text-xs text-ink-faint">
                        {m.leads?.ref}
                        {m.leads?.name && m.leads?.business_name ? ` · ${m.leads.name}` : ""}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={m.stage.tone}>{m.stage.label}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function CalendarGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="4.5" width="14" height="12" rx="2" />
      <path d="M3 8.5h14M7 3v3M13 3v3" strokeLinecap="round" />
    </svg>
  );
}
