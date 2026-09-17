"use client";

import { useState } from "react";
import type { CallOutcome } from "@/lib/supabase/types";
import { Card } from "@/components/ui";

interface DayStats {
  date: string;
  total: number;
  byOutcome: Record<CallOutcome, number>;
  meetingsBooked: number;
}

interface SdrRows {
  sdr: { id: string; full_name: string };
  days: DayStats[];
}

const OUTCOME_LABEL: Record<CallOutcome, string> = {
  interested: "Interested",
  callback_later: "Callback",
  no_answer: "No answer",
  not_interested: "Not interested",
};

const COL_HEAD =
  "data px-4 py-2.5 text-right text-[11px] font-medium tracking-wide text-ink-faint uppercase";

/** e.g. "Wed, 16 Sep 2026" — DISPLAY_TIMEZONE dates come in as YYYY-MM-DD. */
function formatDayLabel(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function SdrReportsTable({ rowsBySdr }: { rowsBySdr: SdrRows[] }) {
  const [activeId, setActiveId] = useState<string>(rowsBySdr[0]?.sdr.id ?? "");
  const active = rowsBySdr.find((r) => r.sdr.id === activeId) ?? rowsBySdr[0];

  return (
    <Card className="overflow-hidden">
      <div className="flex gap-1 overflow-x-auto border-b border-edge px-5 pt-4">
        {rowsBySdr.map(({ sdr, days }) => (
          <button
            key={sdr.id}
            onClick={() => setActiveId(sdr.id)}
            className={`data shrink-0 rounded-t-lg px-3.5 py-2 text-sm font-medium transition ${
              activeId === sdr.id
                ? "border-x border-t border-edge bg-raised text-ink"
                : "text-ink-faint hover:text-ink-dim"
            }`}
          >
            {sdr.full_name} ({days.length} day{days.length === 1 ? "" : "s"})
          </button>
        ))}
      </div>

      <div className="overflow-auto">
        {!active || active.days.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-faint">
            No activity logged for {active?.sdr.full_name ?? "this SDR"} yet.
          </p>
        ) : (
          <table className="w-full min-w-[820px] border-collapse">
            <thead className="bg-overlay">
              <tr className="border-b border-edge">
                <th className="data px-4 py-2.5 text-left text-[11px] font-medium tracking-wide text-ink-faint uppercase">
                  Date
                </th>
                <th className={COL_HEAD}>Calls made</th>
                {(Object.keys(OUTCOME_LABEL) as CallOutcome[]).map((outcome) => (
                  <th key={outcome} className={COL_HEAD}>
                    {OUTCOME_LABEL[outcome]}
                  </th>
                ))}
                <th className={COL_HEAD}>Meetings booked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {active.days.map((day) => (
                <tr key={day.date} className="transition hover:bg-hover/60">
                  <td className="data px-4 py-3 text-sm font-medium text-ink">
                    {formatDayLabel(day.date)}
                  </td>
                  <td className="data-num px-4 py-3 text-right text-sm text-ink">{day.total}</td>
                  {(Object.keys(OUTCOME_LABEL) as CallOutcome[]).map((outcome) => (
                    <td key={outcome} className="data-num px-4 py-3 text-right text-sm text-ink-dim">
                      {day.byOutcome[outcome]}
                    </td>
                  ))}
                  <td className="data-num px-4 py-3 text-right text-sm text-ink">
                    {day.meetingsBooked}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
