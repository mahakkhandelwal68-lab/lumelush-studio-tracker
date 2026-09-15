import { requireProfile } from "@/lib/auth";
import { Card } from "@/components/ui";
import { StatCard } from "@/components/sdr/StatCard";
import { LeadStatusDonut } from "@/components/sdr/DashboardCharts";
import { CallingActivityChart, PerformanceTrendChart } from "@/components/sdr/ReportsCharts";

const DISPLAY_TIMEZONE = process.env.NEXT_PUBLIC_DISPLAY_TIMEZONE || "Asia/Kolkata";

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  callback: "Follow up",
  no_answer: "No answer",
  not_interested: "Not interested",
  booked: "Meeting booked",
  no_show: "No show",
};

const OUTCOME_LABEL: Record<string, string> = {
  interested: "Interested",
  callback_later: "Callback later",
  no_answer: "No answer",
  not_interested: "Not interested",
};
const OUTCOME_COLOR: Record<string, string> = {
  interested: "#3fbf8f",
  callback_later: "#f0b429",
  no_answer: "#8b93ad",
  not_interested: "#e5646a",
};

function dayLabel(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: DISPLAY_TIMEZONE,
    day: "2-digit",
    month: "short",
  }).format(date);
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export default async function CallerReportsPage() {
  const { supabase, profile } = await requireProfile("caller");

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // 7-day window incl. today
  const fourteenDaysAgo = new Date(startOfToday);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const [{ data: leads }, { data: callsLast14 }, { data: meetingsLast14 }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, status, created_at, follow_up_at")
      .eq("assigned_caller_id", profile.id),
    supabase
      .from("calls")
      .select("called_at, outcome")
      .eq("caller_id", profile.id)
      .gte("called_at", fourteenDaysAgo.toISOString()),
    supabase
      .from("meetings")
      .select("created_at")
      .eq("caller_id", profile.id)
      .gte("created_at", fourteenDaysAgo.toISOString()),
  ]);

  const allLeads = leads ?? [];
  const allCalls = callsLast14 ?? [];
  const allMeetings = meetingsLast14 ?? [];

  const thisWeekCalls = allCalls.filter((c) => c.called_at >= sevenDaysAgo.toISOString());
  const prevWeekCalls = allCalls.filter((c) => c.called_at < sevenDaysAgo.toISOString());
  const thisWeekMeetings = allMeetings.filter((m) => m.created_at >= sevenDaysAgo.toISOString());
  const prevWeekMeetings = allMeetings.filter((m) => m.created_at < sevenDaysAgo.toISOString());
  const newLeadsThisWeek = allLeads.filter((l) => l.created_at >= sevenDaysAgo.toISOString()).length;
  const newLeadsPrevWeek = allLeads.filter(
    (l) => l.created_at >= fourteenDaysAgo.toISOString() && l.created_at < sevenDaysAgo.toISOString()
  ).length;
  const callbacksDue = allLeads.filter(
    (l) => l.status === "callback" && l.follow_up_at !== null && l.follow_up_at < endOfToday.toISOString()
  ).length;

  const connectedOutcomes = new Set(["interested", "callback_later", "not_interested"]);
  const thisWeekConnected = thisWeekCalls.filter((c) => connectedOutcomes.has(c.outcome)).length;

  // Per-day series for the last 7 days.
  const days: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  const activityData = days.map((d) => {
    const dayStart = d.toISOString();
    const dayEnd = new Date(d.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const dayCalls = allCalls.filter((c) => c.called_at >= dayStart && c.called_at < dayEnd);
    const dayMeetings = allMeetings.filter((m) => m.created_at >= dayStart && m.created_at < dayEnd);
    return {
      day: dayLabel(d),
      total: dayCalls.length,
      connected: dayCalls.filter((c) => connectedOutcomes.has(c.outcome)).length,
      meetings: dayMeetings.length,
    };
  });

  const outcomeCounts: Record<string, number> = {};
  for (const c of thisWeekCalls) {
    outcomeCounts[c.outcome] = (outcomeCounts[c.outcome] ?? 0) + 1;
  }
  const outcomeTotal = thisWeekCalls.length || 1;

  const statusCounts: Record<string, number> = {};
  for (const l of allLeads) statusCounts[l.status] = (statusCounts[l.status] ?? 0) + 1;
  const donutData = Object.entries(STATUS_LABEL)
    .map(([key, name]) => ({ name, value: statusCounts[key] ?? 0 }))
    .filter((d) => d.value > 0);

  const callsTrend = pctChange(thisWeekCalls.length, prevWeekCalls.length);
  const leadsTrend = pctChange(newLeadsThisWeek, newLeadsPrevWeek);
  const meetingsTrend = pctChange(thisWeekMeetings.length, prevWeekMeetings.length);
  const conversionRate =
    thisWeekCalls.length > 0 ? Math.round((thisWeekMeetings.length / thisWeekCalls.length) * 100) : 0;

  const bestDay = [...activityData].sort((a, b) => b.total - a.total)[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl leading-tight text-ink">Reports & Analytics</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Track your outreach performance over the last 7 days.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard tone="blue" icon={<PhoneGlyph />} value={thisWeekCalls.length} label="Calls Made" trend={callsTrend} trendLabel="vs previous week" />
        <StatCard tone="green" icon={<LeadsGlyph />} value={newLeadsThisWeek} label="New Leads" trend={leadsTrend} trendLabel="vs previous week" />
        <StatCard tone="purple" icon={<MeetingGlyph />} value={thisWeekMeetings.length} label="Meetings Booked" trend={meetingsTrend} trendLabel="vs previous week" />
        <StatCard tone="red" icon={<CallbackGlyph />} value={callbacksDue} label="Callbacks Due" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="p-5">
          <h2 className="font-display text-base text-ink">Calling Activity</h2>
          <p className="mb-2 text-xs text-ink-faint">Total calls vs. connected calls, last 7 days.</p>
          <CallingActivityChart data={activityData} />
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-base text-ink">Lead Status Breakdown</h2>
          <p className="mb-4 text-xs text-ink-faint">Across all your assigned leads.</p>
          <LeadStatusDonut data={donutData} total={allLeads.length} />
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="p-5">
          <h2 className="font-display text-base text-ink">My Performance Trend</h2>
          <p className="mb-2 text-xs text-ink-faint">Your outreach performance over time.</p>
          <PerformanceTrendChart
            data={activityData.map((d) => ({
              day: d.day,
              calls: d.total,
              connected: d.connected,
              meetings: d.meetings,
            }))}
          />
        </Card>

        <Card className="p-5">
          <h2 className="font-display mb-3 text-base text-ink">Call Outcomes</h2>
          <p className="mb-3 text-xs text-ink-faint">Last 7 days.</p>
          <div className="space-y-3">
            {Object.entries(OUTCOME_LABEL).map(([key, label]) => {
              const count = outcomeCounts[key] ?? 0;
              const pct = Math.round((count / outcomeTotal) * 100);
              return (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-ink-dim">{label}</span>
                    <span className="data-num text-ink">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--surface-overlay)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: OUTCOME_COLOR[key] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-display mb-3 text-base text-ink">Insights</h2>
        <ul className="space-y-2.5 text-sm">
          <InsightRow
            positive={callsTrend >= 0}
            text={`Calls made ${callsTrend >= 0 ? "increased" : "decreased"} by ${Math.abs(callsTrend)}% compared to last week.`}
          />
          <InsightRow
            positive={meetingsTrend >= 0}
            text={`Meetings booked ${meetingsTrend >= 0 ? "increased" : "decreased"} by ${Math.abs(meetingsTrend)}%.`}
          />
          <InsightRow
            positive={conversionRate >= 5}
            text={`${conversionRate}% of your calls this week turned into a booked meeting.`}
          />
          {bestDay && bestDay.total > 0 && (
            <InsightRow positive text={`Your busiest calling day this week was ${bestDay.day}, with ${bestDay.total} calls.`} />
          )}
          {thisWeekCalls.length > 0 && (
            <InsightRow
              positive={thisWeekConnected / thisWeekCalls.length >= 0.5}
              text={`${Math.round((thisWeekConnected / thisWeekCalls.length) * 100)}% of your calls this week connected with someone.`}
            />
          )}
        </ul>
      </Card>
    </div>
  );
}

function InsightRow({ positive, text }: { positive: boolean; text: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[10px]"
        style={{
          background: positive ? "rgba(63,191,143,0.15)" : "rgba(229,100,106,0.15)",
          color: positive ? "var(--status-booked)" : "var(--status-dead)",
        }}
      >
        {positive ? "↑" : "↓"}
      </span>
      <span className="text-ink-dim">{text}</span>
    </li>
  );
}

function PhoneGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 3.5c.7 0 1.3.4 1.6 1l1 2c.2.5.1 1-.2 1.4L6 9.5a9 9 0 0 0 4.5 4.5l1.6-1.4c.4-.3.9-.4 1.4-.2l2 1c.6.3 1 .9 1 1.6v1.5c0 1-.9 1.8-1.9 1.7C9.4 17.6 3.4 11.6 2.9 6.4 2.8 5.4 3.6 4.5 4.6 4.5H5Z" />
    </svg>
  );
}
function LeadsGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="7.5" cy="6.5" r="2.5" />
      <path d="M3 16c0-2.5 2-4.5 4.5-4.5S12 13.5 12 16" />
      <path d="M13 7a2.25 2.25 0 1 0 0-4.5" />
      <path d="M14 11.5A3.75 3.75 0 0 1 16.5 15" />
    </svg>
  );
}
function MeetingGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="4.5" width="14" height="12" rx="2" />
      <path d="M3 8.5h14M7 3v3M13 3v3" strokeLinecap="round" />
    </svg>
  );
}
function CallbackGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 10a6 6 0 1 1 2.3 4.7" />
      <path d="M4 14v-3.5H7.5" />
    </svg>
  );
}
