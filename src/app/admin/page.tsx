import { requireProfile } from "@/lib/auth";
import type { CallOutcome, MeetingResult } from "@/lib/supabase/types";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

export default async function AdminReportingPage() {
  const { supabase } = await requireProfile("admin");

  const [{ count: leadCount }, { data: calls }, { data: meetings }, { data: consultants }] =
    await Promise.all([
      supabase.from("leads").select("*", { count: "exact", head: true }),
      supabase.from("calls").select("outcome"),
      supabase.from("meetings").select("result, consultant_id"),
      supabase.from("profiles").select("id, full_name").eq("role", "consultant"),
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
  const winRate =
    meetingCount > 0 ? Math.round((wonCount / meetingCount) * 100) : 0;

  const loadByConsultant = new Map<string, number>();
  for (const m of meetings ?? []) {
    loadByConsultant.set(m.consultant_id, (loadByConsultant.get(m.consultant_id) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Reporting</h2>
        <p className="text-sm text-gray-500">
          Snapshot across all leads, calls, and meetings.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total leads" value={leadCount ?? 0} />
        <StatCard label="Meetings booked" value={meetingCount} />
        <StatCard label="Lead → meeting rate" value={`${conversionRate}%`} />
        <StatCard label="Meeting win rate" value={`${winRate}%`} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900">Call outcomes</h3>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Object.entries(outcomeCounts).map(([outcome, count]) => (
            <StatCard key={outcome} label={outcome.replace("_", " ")} value={count} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900">Consultant meeting load</h3>
        <div className="mt-3 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {(consultants ?? []).length === 0 && (
            <p className="p-4 text-sm text-gray-500">No consultants yet.</p>
          )}
          {(consultants ?? []).map((c) => (
            <div key={c.id} className="flex items-center justify-between p-4 text-sm">
              <span className="font-medium text-gray-900">{c.full_name}</span>
              <span className="text-gray-500">
                {loadByConsultant.get(c.id) ?? 0} meeting
                {(loadByConsultant.get(c.id) ?? 0) === 1 ? "" : "s"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
