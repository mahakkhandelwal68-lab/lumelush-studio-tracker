"use client";

import { useState, useTransition } from "react";
import type { ToolResource } from "@/lib/supabase/types";
import { parseToolLinks } from "@/lib/supabase/types";
import { Button, Card, CardHeader, Field, Input, Textarea } from "@/components/ui";
import { formatDateTime } from "@/lib/datetime";
import { updateToolResource } from "@/app/admin/tools/actions";

export function ToolEditor({ tool }: { tool: ToolResource }) {
  const [title, setTitle] = useState(tool.title);
  const [summary, setSummary] = useState(tool.summary ?? "");
  const [instructions, setInstructions] = useState(tool.instructions ?? "");
  const [agentUrl, setAgentUrl] = useState(tool.agent_url ?? "");
  const [agentLabel, setAgentLabel] = useState(tool.agent_label ?? "");
  const [links, setLinks] = useState(() => parseToolLinks(tool.links));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function setLink(index: number, field: "label" | "url", value: string) {
    setLinks((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [field]: value } : l))
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    startTransition(async () => {
      try {
        await updateToolResource({
          id: tool.id,
          title,
          summary,
          instructions,
          agentUrl,
          agentLabel,
          links,
        });
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save");
      }
    });
  }

  return (
    <Card>
      <CardHeader
        title={tool.title}
        subtitle={`Key: ${tool.key} · last updated ${formatDateTime(tool.updated_at)}`}
      />

      <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Card title">
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field label="One-line summary">
            <Input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </Field>
          <Field label="Agent link" hint="Must start with https://">
            <Input
              type="url"
              value={agentUrl}
              onChange={(e) => setAgentUrl(e.target.value)}
              placeholder="https://your-agent.example.com"
            />
          </Field>
          <Field label="Button label">
            <Input
              value={agentLabel}
              onChange={(e) => setAgentLabel(e.target.value)}
              placeholder="Open proposal agent"
            />
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="data text-xs font-medium tracking-wide text-ink-dim uppercase">
              Extra links
            </span>
            <Button
              type="button"
              size="sm"
              onClick={() => setLinks((p) => [...p, { label: "", url: "" }])}
            >
              Add link
            </Button>
          </div>

          {links.length === 0 ? (
            <p className="text-xs text-ink-faint">
              None. Use these for cards that need several links — like the
              three package decks.
            </p>
          ) : (
            <div className="space-y-2">
              {links.map((link, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <Input
                    value={link.label}
                    onChange={(e) => setLink(i, "label", e.target.value)}
                    placeholder="Starter deck"
                    className="w-full sm:w-48"
                  />
                  <Input
                    type="url"
                    value={link.url}
                    onChange={(e) => setLink(i, "url", e.target.value)}
                    placeholder="https://…"
                    className="w-full flex-1 sm:w-auto"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={() =>
                      setLinks((p) => p.filter((_, idx) => idx !== i))
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Field
          label="Instructions"
          hint="One step per line. Consultants see this exactly as written."
        >
          <Textarea
            rows={9}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </Field>

        {error && (
          <p className="data rounded-lg border border-[#5c2027] bg-[#2a1218] px-3 py-2 text-sm text-status-dead">
            {error}
          </p>
        )}
        {saved && !error && (
          <p className="data rounded-lg border border-[#1c5a44] bg-[#0d2b22] px-3 py-2 text-sm text-status-booked">
            Saved — consultants see this now.
          </p>
        )}

        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </Card>
  );
}
