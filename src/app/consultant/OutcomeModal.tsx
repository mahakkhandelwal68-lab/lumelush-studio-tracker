"use client";

import { useMemo, useState, useTransition } from "react";
import type { MeetingResult } from "@/lib/supabase/types";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { DISPLAY_TIMEZONE, formatDateTime, isoToInputValue } from "@/lib/datetime";
import {
  AVAILABILITY_HORIZON_DAYS,
  DEFAULT_MEETING_MINUTES,
  countByDay,
  excludeFullDays,
  freeStartTimes,
  windowsWithDefaults,
  type Interval,
} from "@/lib/scheduling";
import { bookFollowUp, logMeetingResult } from "@/app/consultant/actions";
import type { MeetingRow, ToolLink, WindowInterval } from "@/app/consultant/MeetingsBoard";

const OUTCOMES: {
  value: Exclude<MeetingResult, "pending">;
  label: string;
  desc: string;
}[] = [
  {
    value: "onboarded",
    label: "Onboarded client",
    desc: "They signed. Time for a proposal or invoice.",
  },
  {
    value: "follow_up",
    label: "Follow-up scheduled",
    desc: "Needs another meeting to close.",
  },
  {
    value: "not_interested",
    label: "Not interested",
    desc: "They passed. Lead gets marked dead.",
  },
  {
    value: "no_show",
    label: "No show",
    desc: "Didn't turn up. Goes back to outreach to re-book.",
  },
];

export function OutcomeModal({
  meeting,
  windows,
  consultantId,
  busy,
  analysisTool,
  onClose,
}: {
  meeting: MeetingRow;
  windows: WindowInterval[];
  consultantId: string;
  busy: Interval[];
  analysisTool?: ToolLink;
  onClose: () => void;
}) {
  const [result, setResult] = useState<Exclude<MeetingResult, "pending">>(
    meeting.result === "pending" ? "onboarded" : meeting.result
  );
  const [packageName, setPackageName] = useState(meeting.package_name ?? "");
  const [analysis, setAnalysis] = useState(meeting.analysis_output ?? "");
  const [notes, setNotes] = useState(meeting.result_notes ?? "");
  const [followUpStart, setFollowUpStart] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const needsFollowUpSlot = result === "follow_up";

  // Same day-defaults (open 9-8 when no hours set) and daily cap (8/day)
  // rules the caller's booking screen uses, applied to this one consultant.
  const followUpOptions = useMemo(() => {
    if (!needsFollowUpSlot) return [];
    const dayKeys = Array.from({ length: AVAILABILITY_HORIZON_DAYS }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return isoToInputValue(d.toISOString()).split("T")[0];
    });
    const effectiveWindows = windowsWithDefaults(windows, dayKeys);
    const times = freeStartTimes(effectiveWindows, busy, DEFAULT_MEETING_MINUTES);
    const meetingsPerDay = countByDay(busy.map((b) => b.start));
    return excludeFullDays(times, meetingsPerDay);
  }, [needsFollowUpSlot, windows, busy]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (result === "onboarded" && !packageName.trim()) {
      setError("Add which package they signed up for");
      return;
    }

    startTransition(async () => {
      try {
        await logMeetingResult({
          meetingId: meeting.id,
          result,
          resultNotes: notes,
          analysisOutput: analysis,
          packageName: result === "onboarded" ? packageName : undefined,
        });

        if (needsFollowUpSlot && followUpStart) {
          await bookFollowUp(
            meeting.id,
            meeting.lead_id,
            consultantId,
            followUpStart,
            DEFAULT_MEETING_MINUTES,
            `Follow-up from ${formatDateTime(meeting.scheduled_start)}. ${notes}`.trim()
          );
        }

        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save outcome");
      }
    });
  }

  return (
    <Modal
      title="Meeting outcome"
      subtitle={meeting.leads?.business_name ?? meeting.leads?.name ?? undefined}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="outcome-form"
            variant="primary"
            disabled={isPending}
          >
            {isPending ? "Saving…" : "Save outcome"}
          </Button>
        </>
      }
    >
      <form id="outcome-form" onSubmit={handleSubmit} className="space-y-5">
        <fieldset>
          <legend className="data mb-2 block text-xs font-medium tracking-wide text-ink-dim uppercase">
            What came of it?
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {OUTCOMES.map((o) => {
              const active = o.value === result;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setResult(o.value)}
                  className={`rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-brand-teal bg-overlay"
                      : "border-edge bg-base hover:border-edge-strong hover:bg-overlay"
                  }`}
                >
                  <span className="data block text-sm font-medium text-ink">
                    {o.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-faint">
                    {o.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {result === "onboarded" && (
          <Field
            label="Package"
            hint="Which package they signed up for — shown on outreach's tracker."
          >
            <Input
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              placeholder="e.g. Growth Package"
            />
          </Field>
        )}

        {needsFollowUpSlot && (
          <fieldset>
            <legend className="data mb-1.5 block text-xs font-medium tracking-wide text-ink-dim uppercase">
              Book the follow-up
            </legend>
            {followUpOptions.length === 0 ? (
              <p className="rounded-lg border border-edge bg-base px-3 py-3 text-sm text-ink-faint">
                No free time in your availability. Add hours first, then come
                back to book the follow-up.
              </p>
            ) : (
              <div className="grid max-h-44 grid-cols-2 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-3">
                {followUpOptions.slice(0, 60).map((iso) => {
                  const active = iso === followUpStart;
                  const [day, time] = isoToInputValue(iso).split("T");
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setFollowUpStart(active ? "" : iso)}
                      className={`data rounded-lg border px-2 py-1.5 text-left text-xs transition ${
                        active
                          ? "border-brand-teal bg-overlay text-ink"
                          : "border-edge bg-base text-ink-dim hover:border-edge-strong hover:bg-overlay"
                      }`}
                    >
                      <span className="data-num block">{time}</span>
                      <span className="data-num block text-[10px] text-ink-faint">
                        {day.slice(5)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="data mt-1.5 text-[11px] text-ink-faint">
              Times in {DISPLAY_TIMEZONE.replace("_", " ")}
            </p>
          </fieldset>
        )}

        <Field
          label="Meeting analysis"
          hint="Paste what the analysis agent returned after you gave it the recording."
        >
          <Textarea
            rows={5}
            value={analysis}
            onChange={(e) => setAnalysis(e.target.value)}
            placeholder="Paste what the meeting analysis agent returned…"
          />
          {analysisTool?.agent_url && (
            <a
              href={analysisTool.agent_url}
              target="_blank"
              rel="noopener noreferrer"
              className="data mt-1.5 inline-block text-xs text-brand-teal hover:underline"
            >
              {analysisTool.agent_label ?? "Open analysis agent"} ↗
            </a>
          )}
        </Field>

        <Field label="Your notes">
          <Textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything the analysis missed…"
          />
        </Field>

        {error && (
          <p className="data rounded-lg border border-[#5c2027] bg-[#2a1218] px-3 py-2 text-sm text-status-dead">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
