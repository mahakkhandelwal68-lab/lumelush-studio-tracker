import { requireProfile } from "@/lib/auth";
import { MeetingsTable } from "@/app/admin/meetings/MeetingsTable";

export default async function AdminMeetingsPage() {
  const { supabase } = await requireProfile("admin");

  const [{ data: meetings }, { data: profiles }] = await Promise.all([
    supabase
      .from("meetings")
      .select(
        "id, created_at, scheduled_start, location_type, location_detail, result, caller_id, consultant_id, leads(name, business_name, phone, alt_phone, email, location, website, ref)"
      )
      .order("scheduled_start", { ascending: false }),
    supabase.from("profiles").select("id, full_name, role").order("full_name"),
  ]);

  const nameById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));
  const sdrs = (profiles ?? [])
    .filter((p) => p.role === "caller")
    .map((p) => ({ id: p.id, full_name: p.full_name }));
  const consultants = (profiles ?? [])
    .filter((p) => p.role === "consultant")
    .map((p) => ({ id: p.id, full_name: p.full_name }));

  const rows = (meetings ?? []).map((m) => ({
    id: m.id,
    createdAt: m.created_at,
    scheduledStart: m.scheduled_start,
    locationType: m.location_type,
    locationDetail: m.location_detail,
    result: m.result,
    callerId: m.caller_id,
    consultantId: m.consultant_id,
    calledBy: nameById[m.caller_id] ?? "—",
    consultant: nameById[m.consultant_id] ?? "—",
    lead: m.leads,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl leading-tight text-ink">Meetings</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Every meeting ever booked — the exact lead, who booked it, who it went to,
          and when.
        </p>
      </div>
      <MeetingsTable rows={rows} sdrs={sdrs} consultants={consultants} />
    </div>
  );
}
