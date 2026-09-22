import { requireProfile } from "@/lib/auth";
import { Badge, Card, CardHeader } from "@/components/ui";
import { formatDayDateTime, formatTime } from "@/lib/datetime";
import type { CallOutcome, MeetingResult } from "@/lib/supabase/types";

const OUTCOME_LABEL: Record<CallOutcome, string> = {
  interested: "Interested",
  callback_later: "Callback",
  no_answer: "No answer",
  not_interested: "Not interested",
};

const OUTCOME_TONE: Record<CallOutcome, "new" | "callback" | "noanswer" | "dead"> = {
  interested: "new",
  callback_later: "callback",
  no_answer: "noanswer",
  not_interested: "dead",
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="data text-xs font-medium text-ink-faint uppercase tracking-wide">{label}</p>
      <p className="data-num mt-1 text-2xl font-semibold text-ink">{value}</p>
    </Card>
  );
}

export default async function AdminReportingPage() {
  const { supabase } = await requireProfile("admin");

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const [
    { count: leadCount },
    { data: calls },
    { data: meetings },
    { data: profiles },
    { data: callsToday },
    { data: meetingsToday },
    { data: upcomingToday },
  ] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("calls").select("outcome"),
    supabase.from("meetings").select("result, consultant_id"),
    supabase.from("profiles").select("id, full_name, role"),
    supabase
      .from("calls")
      .select("caller_id, outcome")
      .gte("called_at", startOfToday.toISOString())
      .lt("called_at", endOfToday.toISOString()),
    supabase
      .from("meetings")
      .select(
        "id, created_at, scheduled_start, location_type, caller_id, consultant_id, leads(name, business_name)"
      )
      .gte("created_at", startOfToday.toISOString())
      .lt("created_at", endOfToday.toISOString())
      .order("scheduled_start", { ascending: true }),
    // Still to happen today — scheduled for today and not yet started,
    // regardless of when it was booked. Different from "booked today" above,
    // which is about when the booking was made, not when the meeting is.
    supabase
      .from("meetings")
      .select(
        "id, scheduled_start, location_type, caller_id, consultant_id, result, leads(name, business_name)"
      )
      .gte("scheduled_start", new Date().toISOString())
      .lt("scheduled_start", endOfToday.toISOString())
      .order("scheduled_start", { ascending: true }),
  ]);

  const outcomeCounts: Record<CallOutcome, number> = {
    interested: 0,
    not_interested: 0,
    callback_later: 0,
    no_answer: 0,
  };
  for (const call of calls ?? []) {
    outcomeCounts[call.outcome as CallOutcome]++;
  }

  const meetingCount = meetings?.length ?? 0;
  const wonCount = (meetings ?? []).filter((m) => m.result === ("onboarded" as MeetingResult)).length;
  const conversionRate =
    leadCount && leadCount > 0 ? Math.round(((meetingCount ?? 0) / leadCount) * 100) : 0;
  const winRate = meetingCount > 0 ? Math.round((wonCount / meetingCount) * 100) : 0;

  const loadByConsultant = new Map<string, number>();
  for (const m of meetings ?? []) {
    loadByConsultant.set(m.consultant_id, (loadByConsultant.get(m.consultant_id) ?? 0) + 1);
  }

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const sdrs = (profiles ?? [])
    .filter((p) => p.role === "caller")
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
  const consultants = (profiles ?? [])
    .filter((p) => p.role === "consultant")
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  const todayStats = new Map(
    sdrs.map((s) => [
      s.id,
      {
        total: 0,
        byOutcome: { interested: 0, not_interested: 0, callback_later: 0, no_answer: 0 } as Record<
          CallOutcome,
          number
        >,
        meetingsBooked: 0,
      },
    ])
  );
  for (const call of callsToday ?? []) {
    const s = todayStats.get(call.caller_id);
    if (s) {
      s.total++;
      s.byOutcome[call.outcome as CallOutcome]++;
    }
  }
  for (const m of meetingsToday ?? []) {
    const s = todayStats.get(m.caller_id);
    if (s) s.meetingsBooked++;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="font-display text-2xl leading-tight text-ink">Reporting</h2>
        <p className="mt-1 text-sm text-ink-dim">
          Snapshot across all leads, calls, and meetings.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total leads" value={leadCount ?? 0} />
        <StatCard label="Meetings booked" value={meetingCount} />
        <StatCard label="Lead → meeting rate" value={`${conversionRate}%`} />
        <StatCard label="Meeting win rate" value={`${winRate}%`} />
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title="Today's SDR activity"
          subtitle="Calls made and how each one went, today only."
        />
        <div className="overflow-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead className="bg-overlay">
              <tr className="border-b border-edge">
                <th className="data px-4 py-2.5 text-left text-[11px] font-medium tracking-wide text-ink-faint uppercase">
                  SDR
                </th>
                <th className="data-num px-4 py-2.5 text-right text-[11px] font-medium tracking-wide text-ink-faint uppercase">
                  Calls made
                </th>
                {(Object.keys(OUTCOME_LABEL) as CallOutcome[]).map((outcome) => (
                  <th
                    key={outcome}
                    className="data-num px-4 py-2.5 text-right text-[11px] font-medium tracking-wide text-ink-faint uppercase"
                  >
                    {OUTCOME_LABEL[outcome]}
                  </th>
                ))}
                <th className="data-num px-4 py-2.5 text-right text-[11px] font-medium tracking-wide text-ink-faint uppercase">
                  Meetings booked
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {sdrs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-ink-faint">
                    No SDRs yet.
                  </td>
                </tr>
              ) : (
                sdrs.map((sdr) => {
                  const s = todayStats.get(sdr.id)!;
                  return (
                    <tr key={sdr.id} className="transition hover:bg-hover/60">
                      <td className="data px-4 py-3 text-sm font-medium text-ink">{sdr.full_name}</td>
                      <td className="data-num px-4 py-3 text-right text-sm text-ink">{s.total}</td>
                      {(Object.keys(OUTCOME_LABEL) as CallOutcome[]).map((outcome) => (
                        <td key={outcome} className="data-num px-4 py-3 text-right text-sm text-ink-dim">
                          {s.byOutcome[outcome]}
                        </td>
                      ))}
                      <td className="data-num px-4 py-3 text-right text-sm text-ink">
                        {s.meetingsBooked}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader
          title="Meetings booked today"
          subtitle="Which lead, by whom, and for what date and time."
        />
        <div className="overflow-auto">
          {(meetingsToday ?? []).length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-faint">
              No meetings booked yet today.
            </p>
          ) : (
            <table className="w-full min-w-[760px] border-collapse">
              <thead className="bg-overlay">
                <tr className="border-b border-edge">
                  <th className="data px-4 py-2.5 text-left text-[11px] font-medium tracking-wide text-ink-faint uppercase">
                    Lead
                  </th>
                  <th className="data px-4 py-2.5 text-left text-[11px] font-medium tracking-wide text-ink-faint uppercase">
                    Booked by
                  </th>
                  <th className="data px-4 py-2.5 text-left text-[11px] font-medium tracking-wide text-ink-faint uppercase">
                    Consultant
                  </th>
                  <th className="data px-4 py-2.5 text-left text-[11px] font-medium tracking-wide text-ink-faint uppercase">
                    Meeting time
                  </th>
                  <th className="data px-4 py-2.5 text-left text-[11px] font-medium tracking-wide text-ink-faint uppercase">
                    Booked at
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {(meetingsToday ?? []).map((m) => (
                  <tr key={m.id} className="transition hover:bg-hover/60">
                    <td className="data px-4 py-3 text-sm text-ink">
                      {m.leads?.business_name ?? m.leads?.name ?? "Unknown lead"}
                      {m.leads?.business_name && m.leads?.name && (
                        <span className="data block text-xs text-ink-faint">{m.leads.name}</span>
                      )}
                    </td>
                    <td className="data px-4 py-3 text-sm text-ink-dim">
                      {nameById.get(m.caller_id) ?? "—"}
                    </td>
                    <td className="data px-4 py-3 text-sm text-ink-dim">
                      {nameById.get(m.consultant_id) ?? "—"}
                    </td>
                    <td className="data-num px-4 py-3 text-sm text-ink">
                      {formatDayDateTime(m.scheduled_start)}
                    </td>
                    <td className="data-num px-4 py-3 text-sm text-ink-faint">
                      {formatTime(m.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader
          title="Upcoming meetings today"
          subtitle="Still to happen today, soonest first."
        />
        <div className="overflow-auto">
          {(upcomingToday ?? []).length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-faint">
              Nothing left on the calendar for today.
            </p>
          ) : (
            <table className="w-full min-w-[760px] border-collapse">
              <thead className="bg-overlay">
                <tr className="border-b border-edge">
                  <th className="data px-4 py-2.5 text-left text-[11px] font-medium tracking-wide text-ink-faint uppercase">
                    Lead
                  </th>
                  <th className="data px-4 py-2.5 text-left text-[11px] font-medium tracking-wide text-ink-faint uppercase">
                    Booked by
                  </th>
                  <th className="data px-4 py-2.5 text-left text-[11px] font-medium tracking-wide text-ink-faint uppercase">
                    Consultant
                  </th>
                  <th className="data px-4 py-2.5 text-left text-[11px] font-medium tracking-wide text-ink-faint uppercase">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {(upcomingToday ?? []).map((m) => (
                  <tr key={m.id} className="transition hover:bg-hover/60">
                    <td className="data px-4 py-3 text-sm text-ink">
                      {m.leads?.business_name ?? m.leads?.name ?? "Unknown lead"}
                      {m.leads?.business_name && m.leads?.name && (
                        <span className="data block text-xs text-ink-faint">{m.leads.name}</span>
                      )}
                    </td>
                    <td className="data px-4 py-3 text-sm text-ink-dim">
                      {nameById.get(m.caller_id) ?? "—"}
                    </td>
                    <td className="data px-4 py-3 text-sm text-ink-dim">
                      {nameById.get(m.consultant_id) ?? "—"}
                    </td>
                    <td className="data-num px-4 py-3 text-sm text-ink">
                      {formatTime(m.scheduled_start)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Call outcomes" subtitle="All time, across every SDR." />
          <div className="grid grid-cols-2 gap-3 p-5">
            {(Object.keys(OUTCOME_LABEL) as CallOutcome[]).map((outcome) => (
              <div key={outcome} className="rounded-xl border border-edge bg-overlay p-3.5">
                <Badge tone={OUTCOME_TONE[outcome]}>{OUTCOME_LABEL[outcome]}</Badge>
                <p className="data-num mt-2 text-xl font-semibold text-ink">
                  {outcomeCounts[outcome]}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Consultant meeting load" subtitle="All time." />
          <div className="divide-y divide-edge">
            {consultants.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-faint">No consultants yet.</p>
            ) : (
              consultants.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="font-medium text-ink">{c.full_name}</span>
                  <span className="data-num text-ink-dim">
                    {loadByConsultant.get(c.id) ?? 0} meeting
                    {(loadByConsultant.get(c.id) ?? 0) === 1 ? "" : "s"}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
