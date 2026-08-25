import { requireProfile } from "@/lib/auth";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui";
import { formatDateTime } from "@/lib/datetime";
import type { MeetingResult } from "@/lib/supabase/types";

const COL_HEAD =
  "data px-3 py-2.5 text-left text-[11px] font-medium tracking-wide text-ink-faint uppercase";

interface StageInfo {
  label: string;
  tone: "neutral" | "new" | "callback" | "noanswer" | "dead" | "booked";
  attendance: string;
}

function stageFor(
  result: MeetingResult,
  scheduledStart: string,
  proposalSentAt: string | null,
  invoiceSentAt: string | null,
  now: string
): StageInfo {
  if (result === "pending") {
    return scheduledStart > now
      ? { label: "Upcoming", tone: "new", attendance: "Not yet held" }
      : { label: "Awaiting outcome", tone: "neutral", attendance: "Held — outcome pending" };
  }
  if (result === "no_show") {
    return { label: "No-show", tone: "noanswer", attendance: "Did not attend" };
  }
  if (result === "not_interested") {
    return { label: "Not interested", tone: "dead", attendance: "Attended" };
  }
  if (result === "follow_up") {
    return { label: "Follow-up scheduled", tone: "callback", attendance: "Attended" };
  }
  // onboarded
  if (invoiceSentAt) {
    return { label: "Closed — invoiced", tone: "booked", attendance: "Attended" };
  }
  if (proposalSentAt) {
    return { label: "Onboarded — proposal sent", tone: "booked", attendance: "Attended" };
  }
  return { label: "Onboarded", tone: "booked", attendance: "Attended" };
}

export default async function CallerMeetingsPage() {
  const { supabase, profile } = await requireProfile("caller");

  // RLS (meetings_caller_own OR meetings_caller_read_own_leads) already
  // restricts this to meetings tied to this caller's own leads — including
  // follow-ups the consultant booked — so no other caller's pipeline shows
  // up here regardless of who did the booking.
  // Callers never see who the consultant is — the pipeline is handed off
  // and the consultant is assigned automatically, so their identity isn't
  // fetched here at all.
  const { data: meetings } = await supabase
    .from("meetings")
    .select("*, leads(name, business_name, ref, phone, location)")
    .order("scheduled_start", { ascending: false });

  const all = meetings ?? [];
  const nowIso = new Date().toISOString();

  const onboardedCount = all.filter((m) => m.result === "onboarded").length;
  const upcomingCount = all.filter(
    (m) => m.result === "pending" && m.scheduled_start > nowIso
  ).length;
  const noShowCount = all.filter((m) => m.result === "no_show").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl leading-tight text-ink">
          Booked meetings
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Every meeting booked for leads you handed off to a consultant — what
          happened, whether they showed, and where each one stands.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total meetings" value={all.length} />
        <StatCard label="Upcoming" value={upcomingCount} />
        <StatCard label="Onboarded" value={onboardedCount} />
        <StatCard label="No-shows" value={noShowCount} />
      </div>

      <Card>
        <CardHeader
          title="Meeting tracker"
          subtitle={`${profile.full_name.split(" ")[0]}'s leads only`}
          iconTone="mint"
          icon={
            <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="3" y="4.5" width="14" height="12" rx="2" />
              <path d="M3 8.5h14M7 3v3M13 3v3" strokeLinecap="round" />
            </svg>
          }
        />

        {all.length === 0 ? (
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
                  <th className={COL_HEAD}>Scheduled</th>
                  <th className={COL_HEAD}>Attendance</th>
                  <th className={COL_HEAD}>Stage</th>
                  <th className={COL_HEAD}>Package</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {all.map((m) => {
                  const stage = stageFor(
                    m.result,
                    m.scheduled_start,
                    m.proposal_sent_at,
                    m.invoice_sent_at,
                    nowIso
                  );
                  return (
                    <tr key={m.id} className="align-top">
                      <td className="px-3 py-3">
                        <p className="data text-sm font-medium text-ink">
                          {m.leads?.business_name ?? m.leads?.name ?? "Unknown lead"}
                        </p>
                        <p className="data mt-0.5 text-xs text-ink-faint">
                          {m.leads?.ref}
                          {m.leads?.name && m.leads?.business_name ? ` · ${m.leads.name}` : ""}
                        </p>
                      </td>
                      <td className="data-num px-3 py-3 text-sm text-ink-dim">
                        {formatDateTime(m.scheduled_start)}
                      </td>
                      <td className="px-3 py-3 text-sm text-ink-dim">
                        {stage.attendance}
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={stage.tone}>{stage.label}</Badge>
                      </td>
                      <td className="px-3 py-3 text-sm text-ink-dim">
                        {m.package_name ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-edge bg-raised p-4">
      <p className="data text-xs font-medium tracking-wide text-ink-faint uppercase">
        {label}
      </p>
      <p className="data-num mt-1 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}
