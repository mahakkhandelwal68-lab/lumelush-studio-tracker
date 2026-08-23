import { requireProfile } from "@/lib/auth";
import { ToolEditor } from "@/app/admin/tools/ToolEditor";

export default async function AdminToolsPage() {
  const { supabase } = await requireProfile("admin");

  const { data: tools } = await supabase
    .from("tool_resources")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl leading-tight text-ink">Tools</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Instructions and agent links your consultants see. Edits go live
          immediately — no deploy needed.
        </p>
      </div>

      <div className="space-y-5">
        {(tools ?? []).map((tool) => (
          <ToolEditor key={tool.id} tool={tool} />
        ))}
      </div>
    </div>
  );
}
