import { requireProfile } from "@/lib/auth";
import { AvailabilityEditor } from "@/app/consultant/availability/AvailabilityEditor";
import { AVAILABILITY_HORIZON_DAYS } from "@/lib/scheduling";

export default async function ConsultantAvailabilityPage() {
  const { supabase, profile } = await requireProfile("consultant");

  const windowStart = new Date();
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + AVAILABILITY_HORIZON_DAYS);

  const [{ data: windows }, { data: meetings }, { data: requests }] =
    await Promise.all([
      supabase
        .from("availability_windows")
        .select("id, start_time, end_time")
        .eq("consultant_id", profile.id)
        .gte("start_time", windowStart.toISOString())
        .lt("start_time", windowEnd.toISOString())
        .order("start_time", { ascending: true }),
      supabase
        .from("meetings")
        .select("id, scheduled_start, scheduled_end, leads(business_name, name)")
        .eq("consultant_id", profile.id)
        .gte("scheduled_start", windowStart.toISOString())
        .lt("scheduled_start", windowEnd.toISOString())
        .order("scheduled_start", { ascending: true }),
      supabase
        .from("availability_change_requests")
        .select("*")
        .eq("consultant_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl leading-tight text-ink">
          Your availability
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Next {AVAILABILITY_HORIZON_DAYS} days only. A day with no hours set
          is not available — add a slot to open it up.
        </p>
      </div>

      <AvailabilityEditor
        windows={windows ?? []}
        meetings={meetings ?? []}
        requests={requests ?? []}
        now={new Date().toISOString()}
      />
    </div>
  );
}
