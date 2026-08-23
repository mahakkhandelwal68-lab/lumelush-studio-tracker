import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { ToolDetail } from "@/components/ToolDetail";

export default async function ConsultantToolPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const { supabase } = await requireProfile("consultant");

  const { data: tool } = await supabase
    .from("tool_resources")
    .select("*")
    .eq("key", key)
    .maybeSingle();

  if (!tool) notFound();

  return (
    <ToolDetail tool={tool} backHref="/consultant" backLabel="Back to dashboard" />
  );
}
