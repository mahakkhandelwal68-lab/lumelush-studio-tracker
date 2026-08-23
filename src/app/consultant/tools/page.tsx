import { requireProfile } from "@/lib/auth";
import { Card } from "@/components/ui";

export default async function ConsultantToolsPage() {
  const { supabase } = await requireProfile("consultant");

  const { data: tools } = await supabase
    .from("tool_resources")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl leading-tight text-ink">Tools</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Playbooks and agents for proposals, invoices and meeting analysis.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {(tools ?? []).map((tool) => (
          <Card key={tool.id} className="flex flex-col">
            <div className="border-b border-edge px-5 py-4">
              <h2 className="font-display text-lg leading-tight text-ink">
                {tool.title}
              </h2>
              {tool.summary && (
                <p className="mt-1 text-sm text-ink-dim">{tool.summary}</p>
              )}
            </div>

            <div className="flex-1 px-5 py-4">
              {tool.instructions ? (
                <div className="space-y-2 text-sm leading-relaxed text-ink-dim">
                  {tool.instructions.split("\n").map((line, i) =>
                    line.trim() === "" ? null : (
                      <p key={i} className="whitespace-pre-wrap">
                        {line}
                      </p>
                    )
                  )}
                </div>
              ) : (
                <p className="text-sm text-ink-faint">
                  No instructions yet — ask your admin to add them.
                </p>
              )}
            </div>

            {tool.agent_url && (
              <div className="border-t border-edge px-5 py-4">
                <a
                  href={tool.agent_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="data inline-flex w-full items-center justify-center rounded-lg px-3.5 py-2 text-sm font-semibold text-[#04121f] transition [background:var(--accent-gradient)] hover:brightness-110"
                >
                  {tool.agent_label ?? "Open agent"} ↗
                </a>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
