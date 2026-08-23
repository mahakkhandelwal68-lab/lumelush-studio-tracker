"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";

export async function updateToolResource(input: {
  id: string;
  title: string;
  summary: string;
  instructions: string;
  agentUrl: string;
  agentLabel: string;
  /** Extra links, e.g. the three package decks. Blank rows are dropped. */
  links: { label: string; url: string }[];
}) {
  const { supabase, profile } = await requireProfile("admin");

  if (!input.title.trim()) throw new Error("Title can't be empty");

  if (input.agentUrl && !/^https?:\/\//i.test(input.agentUrl)) {
    throw new Error("Agent link must start with http:// or https://");
  }

  const links = input.links
    .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
    .filter((l) => l.label || l.url);

  for (const link of links) {
    if (!link.label || !link.url) {
      throw new Error("Every extra link needs both a label and a URL");
    }
    if (!/^https?:\/\//i.test(link.url)) {
      throw new Error(`"${link.label}" must start with http:// or https://`);
    }
  }

  const { error } = await supabase
    .from("tool_resources")
    .update({
      title: input.title.trim(),
      summary: input.summary || null,
      instructions: input.instructions || null,
      agent_url: input.agentUrl || null,
      agent_label: input.agentLabel || null,
      links,
      updated_at: new Date().toISOString(),
      updated_by: profile.id,
    })
    .eq("id", input.id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/tools");
  revalidatePath("/consultant/tools");
  revalidatePath("/consultant");
}
