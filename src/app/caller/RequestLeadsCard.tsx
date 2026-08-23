"use client";

import { useState, useTransition } from "react";
import type { LeadRequestStatus } from "@/lib/supabase/types";
import { Badge, Button, Card, CardHeader, Field, Input, Textarea } from "@/components/ui";
import { formatDateTime } from "@/lib/datetime";
import { requestMoreLeads } from "@/app/caller/actions";

interface LeadRequest {
  id: string;
  requested_count: number;
  note: string | null;
  status: LeadRequestStatus;
  created_at: string;
}

const STATUS_TONE: Record<LeadRequestStatus, "callback" | "booked" | "dead"> = {
  pending: "callback",
  fulfilled: "booked",
  declined: "dead",
};

export function RequestLeadsCard({
  openRequests,
  remainingLeads,
}: {
  openRequests: LeadRequest[];
  remainingLeads: number;
}) {
  const [count, setCount] = useState("25");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  const runningLow = remainingLeads <= 5;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSent(false);

    startTransition(async () => {
      try {
        await requestMoreLeads(Number(count), note);
        setNote("");
        setSent(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't send request");
      }
    });
  }

  return (
    <Card>
      <CardHeader
        title="Request more leads"
        subtitle="Ask your admin to top up your queue."
        iconTone="mint"
        icon={
          <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M10 4.5v11M4.5 10h11" strokeLinecap="round" />
          </svg>
        }
      />

      <div className="px-5 py-4">
        <div
          className={`data mb-4 rounded-lg border px-3 py-2.5 text-sm ${
            runningLow
              ? "border-[#6b5210] bg-[#2b220a] text-status-callback"
              : "border-edge bg-base text-ink-dim"
          }`}
        >
          <span className="data-num font-semibold">{remainingLeads}</span>{" "}
          {remainingLeads === 1 ? "lead" : "leads"} left to work
          {runningLow && " — running low"}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="How many?">
            <Input
              type="number"
              min={1}
              max={500}
              required
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </Field>

          <Field label="Note (optional)">
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any particular region or source?"
            />
          </Field>

          {error && (
            <p className="data rounded-lg border border-[#5c2027] bg-[#2a1218] px-3 py-2 text-sm text-status-dead">
              {error}
            </p>
          )}
          {sent && !error && (
            <p className="data rounded-lg border border-[#1c5a44] bg-[#0d2b22] px-3 py-2 text-sm text-status-booked">
              Request sent to your admin.
            </p>
          )}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Sending…" : "Send request"}
          </Button>
        </form>

        {openRequests.length > 0 && (
          <div className="mt-5 border-t border-edge pt-4">
            <h3 className="data mb-2.5 text-xs font-medium tracking-wide text-ink-dim uppercase">
              Recent requests
            </h3>
            <ul className="space-y-2">
              {openRequests.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <span className="data-num text-ink">
                      {r.requested_count}
                    </span>
                    <span className="data-num ml-2 text-xs text-ink-faint">
                      {formatDateTime(r.created_at)}
                    </span>
                  </div>
                  <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
