"use client";

import { useMemo, useState } from "react";
import type { LeadStatus } from "@/lib/supabase/types";
import { Badge, Button, Card, EmptyState, Input } from "@/components/ui";
import { formatDateTime } from "@/lib/datetime";
import { LogCallModal } from "@/app/caller/LogCallModal";
import { BookMeetingModal } from "@/app/caller/BookMeetingModal";
import { reviveLead } from "@/app/caller/actions";

export interface Lead {
  id: string;
  ref: string;
  name: string;
  business_name: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  website: string | null;
  source: string | null;
  status: LeadStatus;
  follow_up_at: string | null;
  not_interested_reason: string | null;
  updated_at: string;
}

export interface LeadHistory {
  attempts: number;
  lastAt: string;
  lastOutcome: string;
  lastNotes: string | null;
}

export interface MeetingCount {
  total: number;
  held: number;
}

interface Consultant {
  id: string;
  full_name: string;
}

/** The sheet tabs, in the order a caller works through them. */
const SHEETS: {
  key: LeadStatus;
  label: string;
  tone: "new" | "callback" | "noanswer" | "dead" | "booked";
  blurb: string;
}[] = [
  { key: "new", label: "Leads", tone: "new", blurb: "Never contacted yet." },
  {
    key: "callback",
    label: "Callbacks",
    tone: "callback",
    blurb: "They asked to be called back at a set time.",
  },
  {
    key: "no_answer",
    label: "No answer",
    tone: "noanswer",
    blurb: "Tried, didn't reach them. Worth retrying.",
  },
  {
    key: "no_show",
    label: "No show",
    tone: "noanswer",
    blurb: "Booked but didn't turn up. Chase them and re-book.",
  },
  {
    key: "not_interested",
    label: "Not interested",
    tone: "dead",
    blurb: "Dead for now — can be revived if things change.",
  },
  {
    key: "booked",
    label: "Meeting booked",
    tone: "booked",
    blurb: "Handed over to a consultant.",
  },
];

const OUTCOME_LABEL: Record<string, string> = {
  interested: "Interested",
  not_interested: "Not interested",
  callback_later: "Call back later",
  no_answer: "No answer",
};

/** After this many unanswered attempts we stop chasing the lead. */
export const MAX_ATTEMPTS = 3;

/** Colour ramps up with each unanswered attempt. */
function attemptStyle(attempts: number) {
  if (attempts >= MAX_ATTEMPTS) {
    return {
      cls: "border-[#5c2027] bg-[#2a1218] text-status-dead",
      label: `${attempts} calls · stop`,
    };
  }
  if (attempts === 2) {
    return {
      cls: "border-[#6b5210] bg-[#2b220a] text-status-callback",
      label: "2 calls",
    };
  }
  return {
    cls: "border-[#1d4a75] bg-[#0e2942] text-status-new",
    label: `${attempts} call`,
  };
}

const COL_HEAD =
  "data px-3 py-2.5 text-left text-[11px] font-medium tracking-wide text-ink-faint uppercase";

export function LeadsCard({
  leads,
  history,
  meetingCounts,
  consultants,
  now,
}: {
  leads: Lead[];
  history: Record<string, LeadHistory>;
  meetingCounts: Record<string, MeetingCount>;
  consultants: Consultant[];
  now: string;
}) {
  const [sheet, setSheet] = useState<LeadStatus>("new");
  const [query, setQuery] = useState("");
  const [callLead, setCallLead] = useState<Lead | null>(null);
  const [bookLead, setBookLead] = useState<Lead | null>(null);

  const counts = useMemo(() => {
    const map = {} as Record<LeadStatus, number>;
    for (const s of SHEETS) map[s.key] = 0;
    for (const lead of leads) map[lead.status] = (map[lead.status] ?? 0) + 1;
    return map;
  }, [leads]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = leads
      .filter((l) => l.status === sheet)
      .filter(
        (l) =>
          !q ||
          l.ref.toLowerCase().includes(q) ||
          l.name.toLowerCase().includes(q) ||
          (l.business_name ?? "").toLowerCase().includes(q) ||
          (l.phone ?? "").toLowerCase().includes(q) ||
          (l.email ?? "").toLowerCase().includes(q) ||
          (l.location ?? "").toLowerCase().includes(q)
      );

    // On the No answer sheet, work the freshest leads first: 1 attempt at the
    // top, then 2, with the exhausted 3+ sinking to the bottom.
    if (sheet === "no_answer") {
      return [...filtered].sort(
        (a, b) =>
          (history[a.id]?.attempts ?? 0) - (history[b.id]?.attempts ?? 0)
      );
    }

    // Callbacks: soonest due first.
    if (sheet === "callback") {
      return [...filtered].sort((a, b) =>
        (a.follow_up_at ?? "").localeCompare(b.follow_up_at ?? "")
      );
    }

    return filtered;
  }, [leads, sheet, query, history]);

  const activeSheet = SHEETS.find((s) => s.key === sheet)!;

  return (
    <>
      <Card className="flex min-h-[32rem] flex-col overflow-hidden">
        <header className="border-b border-edge px-5 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg leading-tight text-ink">
                Leads
              </h2>
              <p className="mt-0.5 text-sm text-ink-dim">
                {activeSheet.blurb}
              </p>
            </div>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, business, phone, location…"
              className="w-full sm:w-72"
            />
          </div>

          {/* Sheet tabs */}
          <div className="-mb-px mt-4 flex gap-1 overflow-x-auto">
            {SHEETS.map((s) => {
              const active = s.key === sheet;
              return (
                <button
                  key={s.key}
                  onClick={() => setSheet(s.key)}
                  className={`data relative flex shrink-0 items-center gap-2 rounded-t-lg border border-b-0 px-3.5 py-2 text-sm transition ${
                    active
                      ? "border-edge bg-overlay text-ink"
                      : "border-transparent text-ink-faint hover:text-ink-dim"
                  }`}
                >
                  {s.label}
                  <span
                    className={`data-num rounded-full px-1.5 py-0.5 text-[11px] ${
                      active
                        ? "bg-base text-ink-dim"
                        : "bg-overlay text-ink-faint"
                    }`}
                  >
                    {counts[s.key] ?? 0}
                  </span>
                  {active && (
                    <span className="accent-bar absolute inset-x-0 -top-px h-0.5 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          {rows.length === 0 ? (
            <EmptyState
              title={query ? "No leads match that search." : "This sheet is empty."}
              hint={
                query
                  ? "Try a different name or number."
                  : sheet === "new"
                    ? "Ask your admin for more leads using the card on the right."
                    : undefined
              }
            />
          ) : (
            <table className="w-full min-w-[880px] border-collapse">
              <thead className="sticky top-0 z-10 bg-raised">
                <tr className="border-b border-edge">
                  <th className={COL_HEAD}>Lead</th>
                  <th className={COL_HEAD}>Business</th>
                  <th className={COL_HEAD}>Phone</th>
                  <th className={COL_HEAD}>Location</th>
                  <th className={COL_HEAD}>Website</th>
                  <th className={COL_HEAD}>Status</th>
                  <th className={`${COL_HEAD} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((lead) => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    history={history[lead.id]}
                    meetings={meetingCounts[lead.id]}
                    now={now}
                    onCall={() => setCallLead(lead)}
                    onBook={() => setBookLead(lead)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {callLead && (
        <LogCallModal
          lead={callLead}
          onClose={() => setCallLead(null)}
          onBookInstead={(lead) => {
            setCallLead(null);
            setBookLead(lead);
          }}
        />
      )}
      {bookLead && (
        <BookMeetingModal
          lead={bookLead}
          consultants={consultants}
          onClose={() => setBookLead(null)}
        />
      )}
    </>
  );
}

function websiteLabel(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function LeadRow({
  lead,
  history,
  meetings,
  now,
  onCall,
  onBook,
}: {
  lead: Lead;
  history?: LeadHistory;
  meetings?: MeetingCount;
  now: string;
  onCall: () => void;
  onBook: () => void;
}) {
  const [reviving, setReviving] = useState(false);
  const overdue =
    lead.status === "callback" &&
    lead.follow_up_at !== null &&
    lead.follow_up_at < now;
  const exhausted =
    lead.status === "no_answer" && (history?.attempts ?? 0) >= MAX_ATTEMPTS;

  return (
    <tr className="group border-b border-edge align-top transition hover:bg-hover/60">
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="data-num rounded border border-edge-strong bg-overlay px-1.5 py-0.5 text-[10px] text-ink-faint">
            {lead.ref}
          </span>
          <p className="data text-sm font-medium text-ink">{lead.name}</p>
        </div>
        {lead.source && (
          <p className="data mt-0.5 text-xs text-ink-faint">
            via {lead.source}
          </p>
        )}
      </td>

      <td className="px-3 py-3">
        <p className="data text-sm text-ink-dim">
          {lead.business_name ?? <span className="text-ink-faint">—</span>}
        </p>
      </td>

      <td className="px-3 py-3">
        <p className="data-num text-sm text-ink-dim">
          {lead.phone ?? <span className="text-ink-faint">—</span>}
        </p>
        {lead.email && (
          <p className="data mt-0.5 truncate text-xs text-ink-faint">
            {lead.email}
          </p>
        )}
      </td>

      <td className="px-3 py-3">
        <p className="data text-sm text-ink-dim">
          {lead.location ?? <span className="text-ink-faint">—</span>}
        </p>
      </td>

      <td className="px-3 py-3">
        {lead.website ? (
          <a
            href={
              lead.website.startsWith("http")
                ? lead.website
                : `https://${lead.website}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="data text-sm text-brand-teal hover:underline"
          >
            {websiteLabel(lead.website)}
          </a>
        ) : (
          <span className="text-sm text-ink-faint">—</span>
        )}
      </td>

      <td className="max-w-[16rem] px-3 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {overdue && <Badge tone="callback">overdue</Badge>}

          {/* Attempt count, colour-coded so exhausted leads stand out. */}
          {history && history.attempts > 0 && (
            <span
              className={`data inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${attemptStyle(history.attempts).cls}`}
            >
              {attemptStyle(history.attempts).label}
            </span>
          )}

          {/* Follow-up rounds with a consultant, incl. ones they booked. */}
          {meetings && meetings.total > 1 && (
            <Badge tone="callback">follow-up #{meetings.total - 1}</Badge>
          )}
          {meetings && meetings.total === 1 && lead.status === "booked" && (
            <Badge tone="booked">1st meeting</Badge>
          )}
        </div>

        {exhausted && (
          <p className="data mt-1 text-xs text-status-dead">
            {MAX_ATTEMPTS} unanswered calls — stop chasing.
          </p>
        )}

        {meetings && meetings.total > 0 && (
          <p className="mt-1 text-xs text-ink-faint">
            <span className="data-num">{meetings.total}</span>
            {meetings.total === 1 ? " meeting" : " meetings"} ·{" "}
            <span className="data-num">{meetings.held}</span> held
          </p>
        )}

        {history && (
          <p className="mt-1 text-xs text-ink-faint">
            <span className="data-num">{history.attempts}</span>
            {history.attempts === 1 ? " call" : " calls"} · last{" "}
            {OUTCOME_LABEL[history.lastOutcome] ?? history.lastOutcome}
            {history.lastNotes && (
              <span className="text-ink-dim"> — “{history.lastNotes}”</span>
            )}
          </p>
        )}

        {lead.status === "callback" && lead.follow_up_at && (
          <p
            className={`data mt-1 text-xs ${overdue ? "text-status-callback" : "text-ink-dim"}`}
          >
            Call back {formatDateTime(lead.follow_up_at)}
          </p>
        )}

        {lead.status === "not_interested" && lead.not_interested_reason && (
          <p className="mt-1 text-xs text-ink-faint">
            Reason: {lead.not_interested_reason}
          </p>
        )}

        {lead.status === "booked" && <Badge tone="booked">handed over</Badge>}
      </td>

      <td className="px-3 py-3">
        <div className="flex justify-end gap-2">
          {lead.status === "not_interested" ? (
            <Button
              size="sm"
              disabled={reviving}
              onClick={() => {
                setReviving(true);
                reviveLead(lead.id).finally(() => setReviving(false));
              }}
            >
              {reviving ? "Reviving…" : "Revive"}
            </Button>
          ) : lead.status === "booked" ? null : (
            <>
              <Button size="sm" onClick={onCall}>
                Log call
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={onBook}
                title={
                  lead.status === "no_show"
                    ? "Re-book after the missed meeting"
                    : undefined
                }
              >
                {lead.status === "no_show" ? "Re-book" : "Book"}
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
