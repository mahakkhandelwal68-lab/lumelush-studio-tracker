"use client";

import { useMemo, useState } from "react";
import type { MeetingResult } from "@/lib/supabase/types";
import { Badge, Card, Input } from "@/components/ui";
import { formatDateTime } from "@/lib/datetime";

interface LeadInfo {
  name: string;
  business_name: string | null;
  phone: string | null;
  alt_phone: string | null;
  email: string | null;
  location: string | null;
  website: string | null;
  ref: string;
}

interface MeetingRow {
  id: string;
  createdAt: string;
  scheduledStart: string;
  locationType: "google_meet" | "phone";
  locationDetail: string | null;
  result: MeetingResult;
  calledBy: string;
  consultant: string;
  lead: LeadInfo | null;
}

const RESULT_LABEL: Record<MeetingResult, string> = {
  pending: "Pending",
  onboarded: "Onboarded",
  follow_up: "Follow-up",
  not_interested: "Not interested",
  no_show: "No-show",
};

const RESULT_TONE: Record<MeetingResult, "neutral" | "booked" | "callback" | "dead" | "noanswer"> = {
  pending: "neutral",
  onboarded: "booked",
  follow_up: "callback",
  not_interested: "dead",
  no_show: "noanswer",
};

const PAGE_SIZE = 25;

const COL_HEAD =
  "data px-3 py-2.5 text-left text-[11px] font-medium tracking-wide text-ink-faint uppercase";

function websiteHref(url: string) {
  return url.startsWith("http") ? url : `https://${url}`;
}

export function MeetingsTable({ rows }: { rows: MeetingRow[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const l = r.lead;
      return (
        (l?.name ?? "").toLowerCase().includes(q) ||
        (l?.business_name ?? "").toLowerCase().includes(q) ||
        (l?.phone ?? "").toLowerCase().includes(q) ||
        (l?.alt_phone ?? "").toLowerCase().includes(q) ||
        (l?.email ?? "").toLowerCase().includes(q) ||
        (l?.ref ?? "").toLowerCase().includes(q) ||
        r.calledBy.toLowerCase().includes(q) ||
        r.consultant.toLowerCase().includes(q)
      );
    });
  }, [rows, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge px-5 py-4">
        <p className="data text-xs text-ink-faint">
          {filtered.length} meeting{filtered.length === 1 ? "" : "s"}
        </p>
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Search lead, business, phone, SDR, consultant…"
          className="w-full sm:w-80"
        />
      </div>

      <div className="overflow-auto">
        {visible.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-faint">
            {query ? "No meetings match that search." : "No meetings booked yet."}
          </p>
        ) : (
          <table className="w-full min-w-[1300px] border-collapse">
            <thead className="bg-raised">
              <tr className="border-b border-edge">
                <th className={COL_HEAD}>Lead</th>
                <th className={COL_HEAD}>Business</th>
                <th className={COL_HEAD}>Phone</th>
                <th className={COL_HEAD}>Other phone</th>
                <th className={COL_HEAD}>Email</th>
                <th className={COL_HEAD}>Location</th>
                <th className={COL_HEAD}>Website</th>
                <th className={COL_HEAD}>Booked by</th>
                <th className={COL_HEAD}>Consultant</th>
                <th className={COL_HEAD}>Meeting time</th>
                <th className={COL_HEAD}>Booked at</th>
                <th className={COL_HEAD}>Result</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((m) => (
                <tr key={m.id} className="border-b border-edge transition hover:bg-hover/60">
                  <td className="data px-3 py-3 text-sm text-ink">
                    {m.lead?.name ?? "—"}
                    {m.lead?.ref && (
                      <span className="data mt-0.5 block text-xs text-ink-faint">{m.lead.ref}</span>
                    )}
                  </td>
                  <td className="data px-3 py-3 text-sm text-ink-dim">
                    {m.lead?.business_name ?? "—"}
                  </td>
                  <td className="data-num px-3 py-3 text-sm text-ink-dim">{m.lead?.phone ?? "—"}</td>
                  <td className="data-num px-3 py-3 text-sm text-ink-dim">
                    {m.lead?.alt_phone ?? "—"}
                  </td>
                  <td className="data px-3 py-3 text-sm text-ink-dim">{m.lead?.email ?? "—"}</td>
                  <td className="data px-3 py-3 text-sm text-ink-dim">{m.lead?.location ?? "—"}</td>
                  <td className="data px-3 py-3 text-sm">
                    {m.lead?.website ? (
                      <a
                        href={websiteHref(m.lead.website)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-teal hover:underline"
                      >
                        {m.lead.website.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </td>
                  <td className="data px-3 py-3 text-sm text-ink-dim">{m.calledBy}</td>
                  <td className="data px-3 py-3 text-sm text-ink-dim">{m.consultant}</td>
                  <td className="data-num px-3 py-3 text-sm text-ink">
                    {formatDateTime(m.scheduledStart)}
                  </td>
                  <td className="data-num px-3 py-3 text-sm text-ink-faint">
                    {formatDateTime(m.createdAt)}
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={RESULT_TONE[m.result]}>{RESULT_LABEL[m.result]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center justify-between border-t border-edge px-5 py-3">
          <span className="data text-xs text-ink-faint">
            {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="data rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-dim transition hover:bg-overlay disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prev
            </button>
            <span className="data px-2 text-xs text-ink-faint">
              Page {safePage} of {pageCount}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={safePage === pageCount}
              className="data rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-dim transition hover:bg-overlay disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
