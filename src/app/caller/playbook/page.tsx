import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { Card } from "@/components/ui";

// Section headings in the plain-text `instructions` field double as a
// table of contents — anchors let the sidebar jump straight to each one.
function parseTopics(instructions: string | null) {
  if (!instructions) return [];
  return instructions
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line !== "" &&
        !line.startsWith("•") &&
        !line.startsWith("(") &&
        !/^\d+\./.test(line)
    );
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default async function CallerPlaybookPage() {
  const { supabase } = await requireProfile("caller");

  const { data: tool } = await supabase
    .from("tool_resources")
    .select("*")
    .eq("key", "caller_playbook")
    .maybeSingle();

  if (!tool) notFound();

  const topics = parseTopics(tool.instructions);
  const blocks = (tool.instructions ?? "").split("\n");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl leading-tight text-ink">Playbook</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Everything you need to make better outreach conversations.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Card className="max-h-[calc(100vh-220px)] overflow-y-auto p-5">
          <h2 className="font-display mb-3 text-base text-ink">{tool.title}</h2>
          {tool.summary && <p className="mb-4 text-sm text-ink-dim">{tool.summary}</p>}

          {topics.length > 0 && (
            <nav className="mb-5 space-y-1 border-b pb-4" style={{ borderColor: "var(--border-subtle)" }}>
              <p className="data mb-1.5 text-[11px] font-medium tracking-wide text-ink-faint uppercase">
                Pages
              </p>
              {topics.map((t) => (
                <a
                  key={t}
                  href={`#${slugify(t)}`}
                  className="block truncate rounded-lg px-2.5 py-1.5 text-sm text-ink-dim transition hover:bg-hover hover:text-ink"
                >
                  {t}
                </a>
              ))}
            </nav>
          )}

          {tool.instructions ? (
            <div className="space-y-2.5">
              {blocks.map((line, i) => {
                const trimmed = line.trim();
                if (trimmed === "") return <div key={i} className="h-2" />;

                if (trimmed.startsWith("•")) {
                  return (
                    <p key={i} className="flex gap-2.5 pl-1 text-sm leading-relaxed text-ink-dim">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-brand-teal" />
                      <span>{trimmed.slice(1).trim()}</span>
                    </p>
                  );
                }
                if (trimmed.startsWith("(")) {
                  return (
                    <p key={i} className="text-xs text-ink-faint italic">
                      {trimmed}
                    </p>
                  );
                }
                return (
                  <h3
                    id={slugify(trimmed)}
                    key={i}
                    className="font-display pt-2 text-base leading-tight text-ink"
                  >
                    {trimmed}
                  </h3>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-ink-faint">
              No instructions yet — ask your admin to add them from Admin → Tools.
            </p>
          )}
        </Card>

        <Card className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--border-subtle)" }}>
            <div className="min-w-0">
              <p className="data truncate text-sm font-medium text-ink">
                {tool.agent_label ?? "Playbook document"}
              </p>
            </div>
            {tool.agent_url && (
              <a
                href={tool.agent_url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="data shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#04121f] transition [background:var(--accent-gradient)] hover:brightness-110"
              >
                Download PDF ↓
              </a>
            )}
          </div>
          {tool.agent_url ? (
            <iframe
              src={tool.agent_url}
              title={tool.agent_label ?? "Playbook document"}
              className="h-[calc(100vh-260px)] w-full"
              style={{ background: "#fff" }}
            />
          ) : (
            <p className="p-6 text-sm text-ink-faint">
              No document attached — ask your admin to add one from Admin → Tools.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
