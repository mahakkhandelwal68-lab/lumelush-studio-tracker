import { requireProfile } from "@/lib/auth";
import { LeadsTable } from "@/app/admin/leads/LeadsTable";

// Temporary rule the user asked for: the "All leads" tab is scoped down to
// just new (unassigned) leads plus whatever's on Karan's plate — not the
// wider backlog already sitting with other SDRs. Keyed by email, like the
// Karan->Sarah booking rule in caller/actions.ts, since email is stable
// across account recreation.
const ALL_LEADS_TAB_CALLER_EMAIL = "karan@lumelush.com";

export default async function AdminLeadsPage() {
  const { supabase } = await requireProfile("admin");

  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: callers } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "caller")
    .eq("active", true);

  const allLeadsCallerId =
    (callers ?? []).find((c) => c.email === ALL_LEADS_TAB_CALLER_EMAIL)?.id ?? null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl leading-tight text-ink">Leads</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Assign leads to an SDR manually, or auto-distribute unassigned
          leads to whichever active SDR currently has the fewest.
        </p>
      </div>
      <LeadsTable
        leads={leads ?? []}
        callers={(callers ?? []).map((c) => ({ id: c.id, full_name: c.full_name }))}
        allLeadsCallerId={allLeadsCallerId}
      />
    </div>
  );
}
