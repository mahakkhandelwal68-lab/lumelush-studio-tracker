import Link from "next/link";
import type { ToolResource } from "@/lib/supabase/types";
import { Card, CardHeader } from "@/components/ui";

export function PlaybookCard({ playbook }: { playbook: ToolResource | null }) {
  return (
    <Card>
      <CardHeader
        title={playbook?.title ?? "Calling playbook"}
        subtitle={playbook?.summary ?? "How to run an outbound call."}
        iconTone="amber"
        icon={
          <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M3.5 4.5A1.5 1.5 0 015 3h4.5v14H5a1.5 1.5 0 01-1.5-1.5z" strokeLinejoin="round" />
            <path d="M16.5 4.5A1.5 1.5 0 0015 3h-5.5v14H15a1.5 1.5 0 001.5-1.5z" strokeLinejoin="round" />
          </svg>
        }
      />
      <div className="px-5 py-4">
        {playbook?.agent_url ? (
          // A real file (e.g. a PDF) — open it directly in a new tab rather
          // than the text-instructions page.
          <a
            href={playbook.agent_url}
            target="_blank"
            rel="noopener noreferrer"
            className="data flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold text-[#04121f] transition [background:var(--accent-gradient)] hover:brightness-110"
          >
            {playbook.agent_label ?? "Open the playbook"} ↗
          </a>
        ) : playbook ? (
          <Link
            href="/caller/playbook"
            className="data flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold text-[#04121f] transition [background:var(--accent-gradient)] hover:brightness-110"
          >
            Open the playbook
          </Link>
        ) : (
          <p className="text-sm text-ink-faint">
            Your admin hasn&apos;t written the playbook yet.
          </p>
        )}
      </div>
    </Card>
  );
}
