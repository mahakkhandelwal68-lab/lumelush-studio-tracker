import { requireProfile } from "@/lib/auth";
import { DISPLAY_TIMEZONE } from "@/lib/datetime";
import { SdrReportsTable } from "@/app/admin/reports/SdrReportsTable";
import type { CallOutcome } from "@/lib/supabase/types";

const DAY_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: DISPLAY_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function dayKey(iso: string) {
  return DAY_FMT.format(new Date(iso));
}

export default async function AdminSdrReportsPage() {
  const { supabase } = await requireProfile("admin");

  const [{ data: profiles }, { data: calls }, { data: meetings }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role").eq("role", "caller").order("full_name"),
    supabase.from("calls").select("caller_id, outcome, called_at"),
    supabase.from("meetings").select("caller_id, created_at"),
  ]);

  const sdrs = (profiles ?? []).map((p) => ({ id: p.id, full_name: p.full_name }));

  // day -> caller -> stats
  type DayStats = {
    total: number;
    byOutcome: Record<CallOutcome, number>;
    meetingsBooked: number;
  };
  const byCallerByDay = new Map<string, Map<string, DayStats>>();

  function getBucket(callerId: string, day: string): DayStats {
    let byDay = byCallerByDay.get(callerId);
    if (!byDay) {
      byDay = new Map();
      byCallerByDay.set(callerId, byDay);
    }
    let bucket = byDay.get(day);
    if (!bucket) {
      bucket = {
        total: 0,
        byOutcome: { interested: 0, not_interested: 0, callback_later: 0, no_answer: 0 },
        meetingsBooked: 0,
      };
      byDay.set(day, bucket);
    }
    return bucket;
  }

  for (const call of calls ?? []) {
    const day = dayKey(call.called_at);
    const bucket = getBucket(call.caller_id, day);
    bucket.total++;
    bucket.byOutcome[call.outcome as CallOutcome]++;
  }
  for (const m of meetings ?? []) {
    const day = dayKey(m.created_at);
    const bucket = getBucket(m.caller_id, day);
    bucket.meetingsBooked++;
  }

  const rowsBySdr = sdrs.map((sdr) => {
    const byDay = byCallerByDay.get(sdr.id) ?? new Map();
    const days = [...byDay.entries()]
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => b.date.localeCompare(a.date));
    return { sdr, days };
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl leading-tight text-ink">SDR Reports</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Every SDR&apos;s activity, broken down day by day — not just today.
        </p>
      </div>
      <SdrReportsTable rowsBySdr={rowsBySdr} />
    </div>
  );
}
