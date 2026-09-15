import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { formatTime } from "@/lib/datetime";
import { RequestLeadsCard } from "@/app/caller/RequestLeadsCard";
import { StatCard } from "@/components/sdr/StatCard";
import { HourlyCallsChart, LeadStatusDonut } from "@/components/sdr/DashboardCharts";
import { Card } from "@/components/ui";

const DISPLAY_TIMEZONE = process.env.NEXT_PUBLIC_DISPLAY_TIMEZONE || "Asia/Kolkata";

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  callback: "Follow up",
  no_answer: "No answer",
  not_interested: "Not interested",
  booked: "Meeting booked",
  no_show: "No show",
};

function pctChange(today: number, yesterday: number) {
  if (yesterday === 0) return today > 0 ? 100 : 0;
  return Math.round(((today - yesterday) / yesterday) * 100);
}

function hourOfDay(iso: string) {
  const h = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: DISPLAY_TIMEZONE,
      hour: "numeric",
      hour12: false,
    }).format(new Date(iso))
  );
  return h === 24 ? 0 : h;
}

function hourLabel(hour: number) {
  const suffix = hour < 12 ? "AM" : "PM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${suffix}`;
}

export default async function CallerDashboard() {
  const { supabase, profile } = await requireProfile("caller");

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const [
    { data: leads },
    { data: callsToday },
    { count: callsYesterdayCount },
    { count: meetingsTodayCount },
    { count: meetingsYesterdayCount },
    { data: upcomingMeetings },
    { data: openRequests },
    { data: recentCalls },
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("id, ref, name, business_name, status, location, follow_up_at, updated_at")
      .eq("assigned_caller_id", profile.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("calls")
      .select("called_at")
      .eq("caller_id", profile.id)
      .gte("called_at", startOfToday.toISOString())
      .lt("called_at", endOfToday.toISOString()),
    supabase
      .from("calls")
      .select("id", { count: "exact", head: true })
      .eq("caller_id", profile.id)
      .gte("called_at", startOfYesterday.toISOString())
      .lt("called_at", startOfToday.toISOString()),
    supabase
      .from("meetings")
      .select("id", { count: "exact", head: true })
      .eq("caller_id", profile.id)
      .gte("created_at", startOfToday.toISOString())
      .lt("created_at", endOfToday.toISOString()),
    supabase
      .from("meetings")
      .select("id", { count: "exact", head: true })
      .eq("caller_id", profile.id)
      .gte("created_at", startOfYesterday.toISOString())
      .lt("created_at", startOfToday.toISOString()),
    supabase
      .from("meetings")
      .select("id, scheduled_start, location_type, leads(name, business_name)")
      .eq("caller_id", profile.id)
      .gt("scheduled_start", new Date().toISOString())
      .order("scheduled_start", { ascending: true })
      .limit(3),
    supabase
      .from("lead_requests")
      .select("*")
      .eq("caller_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("calls")
      .select("id, lead_id, outcome, called_at, leads(name, business_name)")
      .eq("caller_id", profile.id)
      .order("called_at", { ascending: false })
      .limit(5),
  ]);

  const allLeads = leads ?? [];
  const callsTodayList = callsToday ?? [];
  const newLeadsToday = allLeads.filter((l) => l.status === "new").length;

  const callbacksDueToday = allLeads.filter(
    (l) =>
      l.status === "callback" &&
      l.follow_up_at !== null &&
      l.follow_up_at < endOfToday.toISOString()
  ).length;

  // Bucket today's calls by hour (chronologically) for the activity chart.
  const hourly = new Map<number, number>();
  for (const c of callsTodayList) {
    const key = hourOfDay(c.called_at);
    hourly.set(key, (hourly.get(key) ?? 0) + 1);
  }
  const hourlyData = Array.from(hourly.entries())
    .sort(([a], [b]) => a - b)
    .map(([h, calls]) => ({ hour: hourLabel(h), calls }));

  const statusCounts: Record<string, number> = {};
  for (const l of allLeads) {
    statusCounts[l.status] = (statusCounts[l.status] ?? 0) + 1;
  }
  const donutData = Object.entries(STATUS_LABEL)
    .map(([key, name]) => ({ name, value: statusCounts[key] ?? 0 }))
    .filter((d) => d.value > 0);

  const myLeads = allLeads
    .filter((l) => l.status !== "booked" && l.status !== "not_interested")
    .slice(0, 5);

  const remainingLeads = allLeads.filter(
    (l) => l.status === "new" || l.status === "no_answer"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl leading-tight text-ink">
            {greeting()}, {profile.full_name.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-ink-dim">
            Here&apos;s your outreach progress for today.
          </p>
        </div>
        <p className="font-display max-w-xs text-right text-sm text-ink-faint italic">
          &ldquo;Consistent calls create big opportunities.&rdquo;
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          tone="blue"
          icon={<PhoneGlyph />}
          value={callsTodayList.length}
          label="Calls Made"
          hint="Today"
          trend={pctChange(callsTodayList.length, callsYesterdayCount ?? 0)}
        />
        <StatCard
          tone="green"
          icon={<LeadsGlyph />}
          value={newLeadsToday}
          label="New Leads"
          hint="Assigned to you"
        />
        <StatCard
          tone="purple"
          icon={<MeetingGlyph />}
          value={meetingsTodayCount ?? 0}
          label="Meetings Booked"
          hint="Today"
          trend={pctChange(meetingsTodayCount ?? 0, meetingsYesterdayCount ?? 0)}
        />
        <StatCard
          tone="red"
          icon={<CallbackGlyph />}
          value={callbacksDueToday}
          label="Callbacks Due"
          hint="Today"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base text-ink">Today&apos;s Activity</h2>
            <span className="flex items-center gap-1.5 text-xs text-ink-dim">
              <span className="size-2 rounded-full" style={{ background: "#0b7bee" }} />
              Calls Made
            </span>
          </div>
          <p className="mb-2 text-xs text-ink-faint">Your calling activity throughout the day.</p>
          {hourlyData.length === 0 ? (
            <p className="py-16 text-center text-sm text-ink-faint">
              No calls logged yet today.
            </p>
          ) : (
            <HourlyCallsChart data={hourlyData} />
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-base text-ink">Lead Status</h2>
          <p className="mb-4 text-xs text-ink-faint">Current status of your assigned leads.</p>
          <LeadStatusDonut data={donutData} total={allLeads.length} />
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base text-ink">Upcoming Meetings</h2>
            <Link href="/caller/meetings" className="text-xs text-brand-teal hover:underline">
              View all
            </Link>
          </div>
          {!upcomingMeetings || upcomingMeetings.length === 0 ? (
            <p className="text-sm text-ink-faint">No upcoming meetings.</p>
          ) : (
            <ul className="space-y-2.5">
              {upcomingMeetings.map((m) => (
                <li key={m.id} className="flex items-center gap-3 text-sm">
                  <span className="data-num shrink-0 rounded-lg border border-edge-strong bg-overlay px-2 py-1 text-xs text-ink-dim">
                    {formatTime(m.scheduled_start)}
                  </span>
                  <span className="min-w-0 truncate text-ink">
                    {m.leads?.business_name ?? m.leads?.name ?? "Lead"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base text-ink">My Leads</h2>
            <Link href="/caller/leads" className="text-xs text-brand-teal hover:underline">
              View all
            </Link>
          </div>
          {myLeads.length === 0 ? (
            <p className="text-sm text-ink-faint">Nothing in your queue right now.</p>
          ) : (
            <ul className="space-y-2.5">
              {myLeads.map((l) => (
                <li key={l.id} className="flex items-center gap-2 text-sm">
                  <span className="data-num shrink-0 rounded border border-edge-strong bg-overlay px-1.5 py-0.5 text-[10px] text-ink-faint">
                    {l.ref}
                  </span>
                  <span className="min-w-0 truncate text-ink">
                    {l.business_name ?? l.name}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-ink-faint">
                    {STATUS_LABEL[l.status] ?? l.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-display mb-3 text-base text-ink">Recent Activity</h2>
          {!recentCalls || recentCalls.length === 0 ? (
            <p className="text-sm text-ink-faint">
              Your calling activity will appear here.
            </p>
          ) : (
            <ul className="space-y-3">
              {recentCalls.map((c) => (
                <li key={c.id} className="text-xs">
                  <p className="text-ink">
                    Call {c.outcome === "interested" ? "went well" : "logged"}
                  </p>
                  <p className="text-ink-faint">
                    {c.leads?.business_name ?? c.leads?.name ?? "Lead"} ·{" "}
                    {formatTime(c.called_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <RequestLeadsCard openRequests={openRequests ?? []} remainingLeads={remainingLeads} />
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
