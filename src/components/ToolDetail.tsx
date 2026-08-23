import Link from "next/link";
import type { ToolResource } from "@/lib/supabase/types";
import { parseToolLinks } from "@/lib/supabase/types";
import { Card } from "@/components/ui";
import { formatDateTime } from "@/lib/datetime";

/**
 * Full-page view of a single playbook/tool. Instructions are plain text
 * written by an admin, rendered with bullets and blank lines preserved.
 */
export function ToolDetail({
  tool,
  backHref,
  backLabel,
}: {
  tool: ToolResource;
  backHref: string;
  backLabel: string;
}) {
  const links = parseToolLinks(tool.links);
  const blocks = (tool.instructions ?? "").split("\n");

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link
          href={backHref}
          className="data text-xs text-ink-faint transition hover:text-ink-dim"
        >
          ← {backLabel}
        </Link>
        <h1 className="mt-2 font-display text-3xl leading-tight text-ink">
          {tool.title}
        </h1>
        {tool.summary && (
          <p className="mt-1.5 text-base text-ink-dim">{tool.summary}</p>
        )}
      </div>

      {(tool.agent_url || links.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {tool.agent_url && (
            <a
              href={tool.agent_url}
              target="_blank"
              rel="noopener noreferrer"
              className="data inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-semibold text-[#04121f] transition [background:var(--accent-gradient)] hover:brightness-110"
            >
              {tool.agent_label ?? "Open agent"} ↗
            </a>
          )}
          {links.map((link) => (
            <a
              key={link.url + link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="data inline-flex items-center gap-2 rounded-lg border border-edge-strong bg-overlay px-4 py-2.5 text-sm text-ink-dim transition hover:bg-hover hover:text-ink"
            >
              {link.label}
              <span aria-hidden className="text-ink-faint">
                ↗
              </span>
            </a>
          ))}
        </div>
      )}

      <Card>
        <div className="px-6 py-6">
          {tool.instructions ? (
            <div className="space-y-2.5">
              {blocks.map((line, i) => {
                const trimmed = line.trim();

                if (trimmed === "") return <div key={i} className="h-2" />;

                // Bulleted step
                if (trimmed.startsWith("•")) {
                  return (
                    <p
                      key={i}
                      className="flex gap-2.5 pl-1 text-[15px] leading-relaxed text-ink-dim"
                    >
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-brand-teal" />
                      <span>{trimmed.slice(1).trim()}</span>
                    </p>
                  );
                }

                // Numbered step
                const numbered = /^(\d+)\.\s*(.*)$/.exec(trimmed);
                if (numbered) {
                  return (
                    <p
                      key={i}
                      className="flex gap-3 text-[15px] leading-relaxed text-ink-dim"
                    >
                      <span className="data-num mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-edge-strong bg-overlay text-[11px] text-brand-teal">
                        {numbered[1]}
                      </span>
                      <span>{numbered[2]}</span>
                    </p>
                  );
                }

                // Parenthetical note
                if (trimmed.startsWith("(")) {
                  return (
                    <p key={i} className="text-sm text-ink-faint italic">
                      {trimmed}
                    </p>
                  );
                }

                // Anything else reads as a section heading.
                return (
                  <h2
                    key={i}
                    className="font-display pt-3 text-lg leading-tight text-ink"
                  >
                    {trimmed}
                  </h2>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-ink-faint">
              No instructions yet — ask your admin to add them from Admin →
              Tools.
            </p>
          )}
        </div>

        <footer className="border-t border-edge px-6 py-3">
          <p className="data-num text-xs text-ink-faint">
            Last updated {formatDateTime(tool.updated_at)}
          </p>
        </footer>
      </Card>
    </div>
  );
}
