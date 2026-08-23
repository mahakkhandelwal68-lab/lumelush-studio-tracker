import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { ToolDetail } from "@/components/ToolDetail";

export default async function CallerPlaybookPage() {
  const { supabase } = await requireProfile("caller");

  const { data: tool } = await supabase
    .from("tool_resources")
    .select("*")
    .eq("key", "caller_playbook")
    .maybeSingle();

  if (!tool) notFound();

  return (
    <ToolDetail tool={tool} backHref="/caller" backLabel="Back to dashboard" />
  );
}
