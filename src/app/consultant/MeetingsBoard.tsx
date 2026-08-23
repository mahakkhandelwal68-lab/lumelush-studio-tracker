"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { MeetingResult } from "@/lib/supabase/types";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { formatDateTime, formatTime } from "@/lib/datetime";
import { OutcomeModal } from "@/app/consultant/OutcomeModal";
import { markInvoiceSent, markProposalSent } from "@/app/consultant/actions";

export interface MeetingRow {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  context_notes: string | null;
  result: MeetingResult;
  result_notes: string | null;
  analysis_output: string | null;
  package_name: string | null;
  proposal_sent_at: string | null;
  invoice_sent_at: string | null;
  location_type: "google_meet" | "phone";
  location_detail: string | null;
  guest_email: string | null;
  lead_id: string;
  leads: {
    name: string;
    business_name: string | null;
    phone: string | null;
    email: string | null;
    location: string | null;
    website: string | null;
  } | null;
  caller: { full_name: string } | null;
}

export interface WindowInterval {
  start: string;
  end: string;
}

export interface ToolLink {
  key: string;
  title: string;
  agent_url: string | null;
  agent_label: string | null;
}

type Tab = "upcoming" | "awaiting" | "onboarded" | "follow_up" | "closed";

const TABS: { key: Tab; label: string; blurb: string }[] = [
  {
    key: "upcoming",
    label: "Upcoming",
    blurb: "Still to happen. Prep before you dial in.",
  },
  {
    key: "awaiting",
    label: "Needs outcome",
    blurb: "Already happened — log what came of it.",
  },
  {
    key: "onboarded",
    label: "Onboarded",
    blurb: "Signed clients. Send proposals and invoices from here.",
  },
  {
    key: "follow_up",
    label: "Follow-up",
    blurb: "Another meeting is needed.",
  },
  {
    key: "closed",
    label: "Closed",
    blurb: "Not interested, or didn't show.",
  },
];

const RESULT_TONE: Record<
  MeetingResult,
  "neutral" | "booked" | "dead" | "callback" | "noanswer"
> = {
  pending: "neutral",
  onboarded: "booked",
  follow_up: "callback",
  not_interested: "dead",
  no_show: "noanswer",
};

const RESULT_LABEL: Record<MeetingResult, string> = {
  pending: "pending",
  onboarded: "onboarded",
  follow_up: "follow-up",
  not_interested: "not interested",
  no_show: "no show",
};

/** "in 2 hours", "in 3 days", "2 hours ago" */
function relativeTime(iso: string, now: string) {
  const diffMs = new Date(iso).getTime() - new Date(now).getTime();
  const mins = Math.round(diffMs / 60000);
  const abs = Math.abs(mins);

  let text: string;
  if (abs < 60) text = `${abs} min`;
  else if (abs < 60 * 24) text = `${Math.round(abs / 60)} hr`;
  else text = `${Math.round(abs / (60 * 24))} days`;

  return diffMs >= 0 ? `in ${text}` : `${text} ago`;
}

export function MeetingsBoard({
  meetings,
  windows,
  consultantId,
  tools,
  now,
}: {
  meetings: MeetingRow[];
  windows: WindowInterval[];
  consultantId: string;
  tools: ToolLink[];
  now: string;
}) {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [outcomeFor, setOutcomeFor] = useState<MeetingRow | null>(null);

  // How many meetings this lead has had with us, and which number each one is.
  const sequence = useMemo(() => {
    const byLead = new Map<string, MeetingRow[]>();
    for (const m of [...meetings].sort((a, b) =>
      a.scheduled_start.localeCompare(b.scheduled_start)
    )) {
      const list = byLead.get(m.lead_id) ?? [];
      list.push(m);
      byLead.set(m.lead_id, list);
    }

    const map = new Map<string, { index: number; total: number }>();
    for (const list of byLead.values()) {
      list.forEach((m, i) => {
        map.set(m.id, { index: i + 1, total: list.length });
      });
    }
    return map;
  }, [meetings]);

  const grouped = useMemo(() => {
    const map: Record<Tab, MeetingRow[]> = {
      upcoming: [],
      awaiting: [],
      onboarded: [],
      follow_up: [],
      closed: [],
    };
    for (const m of meetings) {
      if (m.result === "pending") {
        (m.scheduled_end < now ? map.awaiting : map.upcoming).push(m);
      } else if (m.result === "onboarded") map.onboarded.push(m);
      else if (m.result === "follow_up") map.follow_up.push(m);
      else map.closed.push(m);
    }
    return map;
  }, [meetings, now]);

  const rows = grouped[tab];
  const activeTab = TABS.find((t) => t.key === tab)!;

  return (
    <>
      <Card className="flex min-h-[26rem] flex-col">
        <header className="border-b border-edge px-5 pt-4">
          <div>
            <h2 className="font-display text-lg leading-tight text-ink">
              Your meetings
            </h2>
            <p className="mt-0.5 text-sm text-ink-dim">{activeTab.blurb}</p>
          </div>

          <div className="-mb-px mt-4 flex gap-1 overflow-x-auto">
            {TABS.map((t) => {
              const active = t.key === tab;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`data relative flex shrink-0 items-center gap-2 rounded-t-lg border border-b-0 px-3.5 py-2 text-sm transition ${
                    active
                      ? "border-edge bg-overlay text-ink"
                      : "border-transparent text-ink-faint hover:text-ink-dim"
                  }`}
                >
                  {t.label}
                  <span
                    className={`data-num rounded-full px-1.5 py-0.5 text-[11px] ${
                      active ? "bg-base text-ink-dim" : "bg-overlay text-ink-faint"
                    }`}
                  >
                    {grouped[t.key].length}
                  </span>
                  {active && (
                    <span className="accent-bar absolute inset-x-0 -top-px h-0.5 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </header>

        <div className="flex-1 divide-y divide-edge overflow-y-auto">
          {rows.length === 0 ? (
            <EmptyState
              title="Nothing here."
              hint={
                tab === "upcoming"
                  ? "Add availability so the outbound team can book you."
                  : undefined
              }
            />
          ) : (
            rows.map((m) => (
              <MeetingCard
                key={m.id}
                meeting={m}
                now={now}
                tools={tools}
                sequence={sequence.get(m.id)}
                onLogOutcome={() => setOutcomeFor(m)}
              />
            ))
          )}
        </div>
      </Card>

      {outcomeFor && (
        <OutcomeModal
          meeting={outcomeFor}
          windows={windows}
          consultantId={consultantId}
          busy={meetings.map((m) => ({ start: m.scheduled_start, end: m.scheduled_end }))}
          analysisTool={tools.find((t) => t.key === "meeting_analysis")}
          onClose={() => setOutcomeFor(null)}
        />
      )}
    </>
  );
}


function MeetingCard({
  meeting,
  now,
  tools,
  sequence,
  onLogOutcome,
}: {
  meeting: MeetingRow;
  now: string;
  tools: ToolLink[];
  sequence?: { index: number; total: number };
  onLogOutcome: () => void;
}) {
  const [busy, setBusy] = useState<"proposal" | "invoice" | null>(null);
  const lead = meeting.leads;
  const upcoming = meeting.scheduled_start >= now;
  const soon =
    upcoming &&
    new Date(meeting.scheduled_start).getTime() - new Date(now).getTime() <
      2 * 60 * 60 * 1000;

  const byKey = (key: string) => tools.find((t) => t.key === key);
  const isFollowUp = (sequence?.index ?? 1) > 1;

  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/consultant/leads/${meeting.lead_id}`}
              className="data text-sm font-medium text-ink transition hover:text-brand-teal"
            >
              {lead?.business_name ?? lead?.name ?? "Unknown lead"}
            </Link>
            <Badge tone={RESULT_TONE[meeting.result]}>
              {RESULT_LABEL[meeting.result]}
            </Badge>
            {meeting.result === "onboarded" && meeting.package_name && (
              <Badge tone="booked">{meeting.package_name}</Badge>
            )}
            {isFollowUp && (
              <Badge tone="callback">follow-up #{(sequence?.index ?? 1) - 1}</Badge>
            )}
            {soon && <Badge tone="callback">starting soon</Badge>}
          </div>

          <p className="data mt-0.5 text-xs text-ink-dim">
            {lead?.business_name && lead.name ? `${lead.name} · ` : ""}
            {sequence && sequence.total > 1 && (
              <span className="text-ink-faint">
                meeting {sequence.index} of {sequence.total}
              </span>
            )}
          </p>

          <p className="data-num mt-1.5 text-sm text-ink-dim">
            {formatDateTime(meeting.scheduled_start)} – {formatTime(meeting.scheduled_end)}
            <span className="ml-2 text-xs text-ink-faint">
              {relativeTime(meeting.scheduled_start, now)}
            </span>
          </p>

          <p className="mt-1.5">
            {meeting.location_type === "google_meet" ? (
              meeting.location_detail ? (
                <a
                  href={meeting.location_detail}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="data inline-flex items-center gap-1.5 rounded-lg border border-[#1c5a44] bg-[#0d2b22] px-2.5 py-1 text-xs font-medium text-status-booked transition hover:brightness-125"
                >
                  <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="2.5" y="5" width="10" height="10" rx="2" />
                    <path d="M12.5 9l5-3v8l-5-3" strokeLinejoin="round" />
                  </svg>
                  Join Google Meet
                </a>
              ) : (
                <span className="data text-xs text-ink-faint">
                  Meet link generating…
                </span>
              )
            ) : (
              <span className="data-num text-xs text-ink-dim">
                📞 Phone call{meeting.location_detail ? ` · ${meeting.location_detail}` : ""}
              </span>
            )}
          </p>

          <div className="data-num mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-faint">
            {lead?.phone && <span>{lead.phone}</span>}
            {lead?.email && <span>{lead.email}</span>}
            {lead?.location && <span>{lead.location}</span>}
            {lead?.website && (
              <a
                href={
                  lead.website.startsWith("http")
                    ? lead.website
                    : `https://${lead.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-teal hover:underline"
              >
                {lead.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>

          {meeting.context_notes && (
            <p className="mt-2 rounded-lg border border-edge bg-base px-3 py-2 text-xs text-ink-dim">
              <span className="data font-medium text-ink">
                From {meeting.caller?.full_name ?? "the caller"}:
              </span>{" "}
              {meeting.context_notes}
            </p>
          )}

          {meeting.analysis_output && (
            <details className="mt-2 rounded-lg border border-edge bg-base px-3 py-2">
              <summary className="data cursor-pointer text-xs font-medium text-ink-dim">
                Meeting analysis
              </summary>
              <p className="mt-2 text-xs whitespace-pre-wrap text-ink-dim">
                {meeting.analysis_output}
              </p>
              <Link
                href={`/consultant/leads/${meeting.lead_id}`}
                className="data mt-2 inline-block text-xs text-brand-teal hover:underline"
              >
                Open full client notes →
              </Link>
            </details>
          )}

          {/* Quick access to the three agents, on every meeting row. */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <AgentLink tool={byKey("proposal")} fallback="Proposal" />
            <AgentLink tool={byKey("meeting_analysis")} fallback="Meeting analysis" />
            <AgentLink tool={byKey("invoice")} fallback="Invoice" />
            <Link
              href={`/consultant/leads/${meeting.lead_id}`}
              className="data rounded-lg border border-edge-strong bg-overlay px-2.5 py-1.5 text-xs text-ink-dim transition hover:bg-hover hover:text-ink"
            >
              Client notes
            </Link>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {meeting.result === "pending" ? (
            <Button size="sm" variant="primary" onClick={onLogOutcome}>
              Log outcome
            </Button>
          ) : (
            <Button size="sm" onClick={onLogOutcome}>
              Edit outcome
            </Button>
          )}

          {meeting.result === "onboarded" && (
            <div className="flex flex-col items-end gap-1.5">
              <SentMarker
                label="proposal"
                sentAt={meeting.proposal_sent_at}
                busy={busy === "proposal"}
                onMark={async () => {
                  setBusy("proposal");
                  try {
                    await markProposalSent(meeting.id);
                  } finally {
                    setBusy(null);
                  }
                }}
              />
              <SentMarker
                label="invoice"
                sentAt={meeting.invoice_sent_at}
                busy={busy === "invoice"}
                onMark={async () => {
                  setBusy("invoice");
                  try {
                    await markInvoiceSent(meeting.id);
                  } finally {
                    setBusy(null);
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Opens the configured agent for a tool; hidden if admin hasn't set a link. */
function AgentLink({ tool, fallback }: { tool?: ToolLink; fallback: string }) {
  if (!tool?.agent_url) return null;
  return (
    <a
      href={tool.agent_url}
      target="_blank"
      rel="noopener noreferrer"
      className="data rounded-lg border border-edge-strong bg-overlay px-2.5 py-1.5 text-xs text-ink-dim transition hover:bg-hover hover:text-ink"
    >
      {tool.title || fallback} ↗
    </a>
  );
}

function SentMarker({
  label,
  sentAt,
  busy,
  onMark,
}: {
  label: string;
  sentAt: string | null;
  busy: boolean;
  onMark: () => void;
}) {
  if (sentAt) {
    return (
      <span className="data-num text-[11px] text-status-booked">
        {label} sent {formatDateTime(sentAt)}
      </span>
    );
  }
  return (
    <Button size="sm" variant="ghost" disabled={busy} onClick={onMark}>
      {busy ? "…" : `Mark ${label} sent`}
    </Button>
  );
}
