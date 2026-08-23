import Link from "next/link";
import type { ToolResource } from "@/lib/supabase/types";
import { parseToolLinks } from "@/lib/supabase/types";
import { Card, ICON_TONES, type IconTone } from "@/components/ui";

const TOOL_TONES: Record<string, IconTone> = {
  proposal: "blue",
  invoice: "mint",
  meeting_analysis: "teal",
  package_deck: "indigo",
  playbook: "amber",
};

const ICONS: Record<string, React.ReactNode> = {
  proposal: (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 2.5h5.5L15 6v11.5H6z" strokeLinejoin="round" />
      <path d="M11.5 2.5V6H15M8 10h5M8 13h5" strokeLinecap="round" />
    </svg>
  ),
  invoice: (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 2.5h10v15l-2.5-1.5L10 17.5 7.5 16 5 17.5z" strokeLinejoin="round" />
      <path d="M8 7h4M8 10.5h4" strokeLinecap="round" />
    </svg>
  ),
  meeting_analysis: (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="9" cy="9" r="5.5" />
      <path d="M13 13l4 4M7 9l1.5 1.5L12 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  package_deck: (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="6" width="14" height="10" rx="1.5" />
      <path d="M5.5 3.5h9M4.5 6V4.8" strokeLinecap="round" />
      <path d="M3 9.5h14" />
    </svg>
  ),
  playbook: (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3.5 4.5A1.5 1.5 0 015 3h4.5v14H5a1.5 1.5 0 01-1.5-1.5z" strokeLinejoin="round" />
      <path d="M16.5 4.5A1.5 1.5 0 0015 3h-5.5v14H15a1.5 1.5 0 001.5-1.5z" strokeLinejoin="round" />
    </svg>
  ),
};

export function ToolCards({ tools }: { tools: ToolResource[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {tools.map((tool) => (
        <ToolCard key={tool.id} tool={tool} />
      ))}
    </div>
  );
}

function ToolCard({ tool }: { tool: ToolResource }) {
  const links = parseToolLinks(tool.links);
  const tone = ICON_TONES[TOOL_TONES[tool.key] ?? "teal"];

  return (
    <Card className="flex flex-col">
      <div className="flex items-start gap-3 px-4 pt-4">
        <span
          className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border"
          style={{ borderColor: tone.border, background: tone.bg, color: tone.text }}
        >
          {ICONS[tool.key] ?? ICONS.playbook}
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-base leading-tight text-ink">
            {tool.title}
          </h3>
          {tool.summary && (
            <p className="mt-0.5 text-xs text-ink-dim">{tool.summary}</p>
          )}
        </div>
      </div>

      {/* Multi-link cards (e.g. the three package decks) */}
      {links.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5 px-4">
          {links.map((link) => (
            <a
              key={link.url + link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="data flex items-center justify-between rounded-lg border border-edge-strong bg-overlay px-3 py-2 text-xs text-ink-dim transition hover:bg-hover hover:text-ink"
            >
              {link.label}
              <span aria-hidden className="text-ink-faint">
                ↗
              </span>
            </a>
          ))}
        </div>
      )}

      <div className="mt-auto px-4 pt-3 pb-4">
        {tool.agent_url && (
          <a
            href={tool.agent_url}
            target="_blank"
            rel="noopener noreferrer"
            className="data mb-2 flex w-full items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold text-[#04121f] transition [background:var(--accent-gradient)] hover:brightness-110"
          >
            {tool.agent_label ?? "Open agent"} ↗
          </a>
        )}

        <Link
          href={`/consultant/tools/${tool.key}`}
          className="data flex w-full items-center justify-center rounded-lg border border-edge-strong bg-overlay px-3 py-2 text-xs text-ink-dim transition hover:bg-hover hover:text-ink"
        >
          Open full guide →
        </Link>
      </div>
    </Card>
  );
}
