"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";

export async function createLead(input: {
  name: string;
  businessName: string;
  phone: string;
  email: string;
  location: string;
  website: string;
  source: string;
}) {
  const { supabase } = await requireProfile("admin");

  const { error } = await supabase.from("leads").insert({
    name: input.name,
    business_name: input.businessName || null,
    phone: input.phone || null,
    email: input.email || null,
    location: input.location || null,
    website: input.website || null,
    source: input.source || null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/leads");
}

/** Pass an empty callerId to unassign the lead. */
export async function assignLead(leadId: string, callerId: string) {
  const { supabase } = await requireProfile("admin");

  const { error } = await supabase
    .from("leads")
    .update({ assigned_caller_id: callerId || null })
    .eq("id", leadId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/leads");
}

// Assigns every unassigned lead to callers in round-robin order,
// balanced against each caller's current open lead count.
export async function autoDistributeLeads() {
  const { supabase } = await requireProfile("admin");

  const { data: unassigned, error: leadsError } = await supabase
    .from("leads")
    .select("id")
    .is("assigned_caller_id", null);
  if (leadsError) throw new Error(leadsError.message);
  if (!unassigned || unassigned.length === 0) return;

  const { data: callers, error: callersError } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "caller")
    .eq("active", true);
  if (callersError) throw new Error(callersError.message);
  if (!callers || callers.length === 0) {
    throw new Error("No active callers to assign leads to");
  }

  const { data: existingCounts, error: countsError } = await supabase
    .from("leads")
    .select("assigned_caller_id")
    .not("assigned_caller_id", "is", null);
  if (countsError) throw new Error(countsError.message);

  const load = new Map<string, number>(callers.map((c) => [c.id, 0]));
  for (const row of existingCounts ?? []) {
    if (row.assigned_caller_id) {
      load.set(row.assigned_caller_id, (load.get(row.assigned_caller_id) ?? 0) + 1);
    }
  }

  for (const lead of unassigned) {
    const [leastLoadedCaller] = [...load.entries()].sort((a, b) => a[1] - b[1]);
    const callerId = leastLoadedCaller[0];

    const { error } = await supabase
      .from("leads")
      .update({ assigned_caller_id: callerId })
      .eq("id", lead.id);
    if (error) throw new Error(error.message);

    load.set(callerId, (load.get(callerId) ?? 0) + 1);
  }

  revalidatePath("/admin/leads");
}
