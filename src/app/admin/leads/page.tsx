import { requireProfile } from "@/lib/auth";
import { LeadsTable } from "@/app/admin/leads/LeadsTable";

export default async function AdminLeadsPage() {
  const { supabase } = await requireProfile("admin");

  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: callers } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "caller")
    .eq("active", true);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl leading-tight text-ink">Leads</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Assign leads to callers manually, or auto-distribute unassigned leads
          to whichever active caller currently has the fewest.
        </p>
      </div>
      <LeadsTable leads={leads ?? []} callers={callers ?? []} />
    </div>
  );
}
