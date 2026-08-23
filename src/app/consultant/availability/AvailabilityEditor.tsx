"use client";

import { useMemo, useState, useTransition } from "react";
import type { ChangeRequestStatus } from "@/lib/supabase/types";
import { Badge, Button, Card, Field, Textarea } from "@/components/ui";
import { Modal } from "@/components/Modal";
import {
  DISPLAY_TIMEZONE,
  formatDateTime,
  inputValueToISO,
  isoToInputValue,
} from "@/lib/datetime";
import { isInsideLockWindow } from "@/lib/policy";
import { AVAILABILITY_HORIZON_DAYS, DAY_END_HOUR, DAY_START_HOUR, MAX_MEETINGS_PER_DAY } from "@/lib/scheduling";
import { copyWindowsToWeek, requestAvailabilityChange, toggleDayHour } from "@/app/consultant/actions";

interface Window {
  id: string;
  start_time: string;
  end_time: string;
}

interface Meeting {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  leads: { business_name: string | null; name: string } | null;
}

interface ChangeRequest {
  id: string;
  slot_start: string;
  reason: string;
  status: ChangeRequestStatus;
  created_at: string;
}

const REQUEST_TONE: Record<ChangeRequestStatus, "callback" | "booked" | "dead"> =
  {
    pending: "callback",
    approved: "booked",
    declined: "dead",
  };

const HOURS = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR },
  (_, i) => DAY_START_HOUR + i
);
const ROW_HEIGHT = 34; // px per hour cell

type CellState = "booked" | "locked" | "open" | "closed";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function AvailabilityEditor({
  windows,
  meetings,
  requests,
  now,
}: {
  windows: Window[];
  meetings: Meeting[];
  requests: ChangeRequest[];
  now: string;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [requestFor, setRequestFor] = useState<string | null>(null);

  const days = useMemo(
    () =>
      Array.from({ length: AVAILABILITY_HORIZON_DAYS }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const key = isoToInputValue(d.toISOString()).split("T")[0];
        return {
          key,
          isToday: i === 0,
          weekday: new Intl.DateTimeFormat("en-GB", {
            timeZone: DISPLAY_TIMEZONE,
            weekday: "short",
          }).format(d),
          dayNum: new Intl.DateTimeFormat("en-GB", {
            timeZone: DISPLAY_TIMEZONE,
            day: "2-digit",
          }).format(d),
          month: new Intl.DateTimeFormat("en-GB", {
            timeZone: DISPLAY_TIMEZONE,
            month: "short",
          }).format(d),
        };
      }),
    []
  );

  const byDay = useMemo(() => {
    const map = new Map<string, { windows: Window[]; meetings: Meeting[] }>();
    for (const d of days) map.set(d.key, { windows: [], meetings: [] });
    for (const w of windows) {
      map.get(isoToInputValue(w.start_time).split("T")[0])?.windows.push(w);
    }
    for (const m of meetings) {
      map.get(isoToInputValue(m.scheduled_start).split("T")[0])?.meetings.push(m);
    }
    return map;
  }, [days, windows, meetings]);

  const nowMs = new Date(now).getTime();
  const totalBooked = meetings.length;

  function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  const firstExplicitDay = days.find(
    (d) => (byDay.get(d.key)?.windows.length ?? 0) > 0
  );

  return (
    <>
      <Card>
        <div className="accent-bar h-0.5 w-full opacity-70" />
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-baseline gap-6">
            <div>
              <p className="data-num text-2xl leading-none font-semibold text-status-booked">
                {totalBooked}
              </p>
              <p className="data mt-1 text-xs tracking-wide text-ink-dim uppercase">
                meetings booked
              </p>
            </div>
            <div>
              <p className="data-num text-2xl leading-none font-semibold text-ink">
                {days.length}
              </p>
              <p className="data mt-1 text-xs tracking-wide text-ink-dim uppercase">
                days shown
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {editing && firstExplicitDay && (
              <Button
                disabled={isPending}
                onClick={() => {
                  const source = byDay.get(firstExplicitDay.key)!.windows;
                  run(() =>
                    copyWindowsToWeek(
                      source.map((w) => ({ start: w.start_time, end: w.end_time }))
                    )
                  );
                }}
              >
                Repeat {firstExplicitDay.weekday}&apos;s hours all week
              </Button>
            )}
            <Button
              variant={editing ? "primary" : "secondary"}
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? "Done editing" : "Edit availability"}
            </Button>
          </div>
        </div>
      </Card>

      {error && (
        <p className="data rounded-lg border border-[#5c2027] bg-[#2a1218] px-3 py-2 text-sm text-status-dead">
          {error}
        </p>
      )}

      {/* Legend */}
      <div className="data flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-xs text-ink-dim">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-5 rounded" style={{ background: "#dff3ea", border: "1px solid #8fd4b4" }} />
          available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-5 rounded" style={{ background: "var(--brand-blue-deep)" }} />
          meeting booked
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-3 w-5 rounded"
            style={{
              background:
                "repeating-linear-gradient(45deg, #f6dfa8, #f6dfa8 3px, #fbeecb 3px, #fbeecb 6px)",
            }}
          />
          locked (today/tomorrow)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-5 rounded border border-[#d7dcea] bg-white" />
          not available
        </span>
        <span className="ml-auto text-ink-faint">
          {editing ? "Click a cell to toggle it" : "Click \"Edit availability\" to change hours"}
        </span>
      </div>

      {/* The calendar itself: a light island inside the dark shell. */}
      <div className="panel-light overflow-hidden rounded-2xl border shadow-[0_18px_45px_-28px_rgba(10,20,50,0.55)]">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Day header row */}
            <div
              className="grid border-b"
              style={{ gridTemplateColumns: `52px repeat(${days.length}, minmax(88px, 1fr))` }}
            >
              <div className="border-r" />
              {days.map((day) => {
                const info = byDay.get(day.key)!;
                const locked = isInsideLockWindow(
                  inputValueToISO(`${day.key}T00:00`),
                  nowMs
                );
                const bookedCount = info.meetings.length;
                return (
                  <div
                    key={day.key}
                    className={`border-r px-1.5 py-2 text-center ${day.isToday ? "bg-[#eef4ff]" : ""}`}
                  >
                    <p className="text-light-ink data text-xs font-semibold">
                      {day.weekday}
                    </p>
                    <p className="text-light-ink data-num text-[11px]">
                      {day.dayNum} {day.month}
                    </p>
                    <div className="mt-1 flex items-center justify-center gap-1">
                      {day.isToday && (
                        <span className="accent-bar rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white">
                          today
                        </span>
                      )}
                      {locked && !day.isToday && (
                        <span className="rounded-full bg-[#f6dfa8] px-1.5 py-0.5 text-[9px] font-semibold text-[#7a5b12]">
                          locked
                        </span>
                      )}
                    </div>
                    <p
                      className={`data-num mt-0.5 text-[10px] ${
                        bookedCount >= MAX_MEETINGS_PER_DAY
                          ? "font-semibold text-[#b23b46]"
                          : "text-light-ink-faint"
                      }`}
                    >
                      {bookedCount}/{MAX_MEETINGS_PER_DAY}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Hour rows */}
            <div className="grid" style={{ gridTemplateColumns: `52px repeat(${days.length}, minmax(88px, 1fr))` }}>
              {/* Hour label column */}
              <div className="border-r">
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="text-light-ink-faint data-num flex items-start justify-end border-b pr-1.5 pt-0.5 text-[10px]"
                    style={{ height: ROW_HEIGHT }}
                  >
                    {pad2(h)}:00
                  </div>
                ))}
              </div>

              {days.map((day) => {
                const info = byDay.get(day.key)!;
                const dayLocked = isInsideLockWindow(
                  inputValueToISO(`${day.key}T00:00`),
                  nowMs
                );
                const hasExplicit = info.windows.length > 0;

                return (
                  <div key={day.key} className="border-r">
                    {HOURS.map((h) => {
                      // Business-timezone wall clock -> real UTC instant,
                      // same convention as every other time computation in
                      // the app (never rely on the browser's own timezone).
                      const cellStartMs = new Date(
                        inputValueToISO(`${day.key}T${pad2(h)}:00`)
                      ).getTime();
                      const cellEndMs = new Date(
                        inputValueToISO(`${day.key}T${pad2(h + 1)}:00`)
                      ).getTime();

                      const meeting = info.meetings.find((m) => {
                        const s = new Date(m.scheduled_start).getTime();
                        const e = new Date(m.scheduled_end).getTime();
                        return s < cellEndMs && e > cellStartMs;
                      });

                      const inWindow = info.windows.some((w) => {
                        const s = new Date(w.start_time).getTime();
                        const e = new Date(w.end_time).getTime();
                        return s <= cellStartMs && e >= cellEndMs;
                      });

                      let state: CellState;
                      if (meeting) state = "booked";
                      else if (dayLocked) state = "locked";
                      else if (hasExplicit ? inWindow : true) state = "open";
                      else state = "closed";

                      const clickable = editing && state !== "booked";

                      // Label only the hour the meeting actually starts in
                      // (business timezone), so a 2-hour meeting doesn't
                      // repeat its name in every cell it spans. Meetings can
                      // start mid-hour (e.g. 09:30), so compare date+hour
                      // only, not the full HH:mm.
                      let label = "";
                      if (state === "booked" && meeting) {
                        const [mDate, mTime] = isoToInputValue(
                          meeting.scheduled_start
                        ).split("T");
                        const mHour = Number(mTime.split(":")[0]);
                        if (mDate === day.key && mHour === h) {
                          label =
                            meeting.leads?.business_name ??
                            meeting.leads?.name ??
                            "Meeting";
                        }
                      }

                      const title =
                        state === "booked" && meeting
                          ? `${meeting.leads?.business_name ?? meeting.leads?.name ?? "Meeting"} · ${formatDateTime(meeting.scheduled_start)}`
                          : state === "locked"
                            ? `Locked (today/tomorrow) — click to request a change`
                            : editing
                              ? state === "open"
                                ? "Available — click to remove"
                                : "Click to make available"
                              : undefined;

                      const style: React.CSSProperties = { height: ROW_HEIGHT };
                      let className =
                        "data-num flex items-center overflow-hidden border-b px-1 text-[10px] leading-tight transition";

                      if (state === "booked") {
                        style.background = "var(--brand-blue-deep)";
                        className += " text-white";
                      } else if (state === "locked") {
                        style.background =
                          "repeating-linear-gradient(45deg, #f6dfa8, #f6dfa8 3px, #fbeecb 3px, #fbeecb 6px)";
                        className += " text-[#7a5b12]";
                      } else if (state === "open") {
                        style.background = "#dff3ea";
                        className += " text-[#0d6b47]";
                      } else {
                        style.background = "#ffffff";
                        className += " text-light-ink-faint";
                      }

                      if (clickable) className += " cursor-pointer hover:brightness-95";
                      else if (state === "locked") className += " cursor-pointer";
                      else className += " cursor-default";

                      return (
                        <div
                          key={h}
                          title={title}
                          style={style}
                          className={className}
                          onClick={() => {
                            if (!editing || isPending) return;
                            if (state === "booked") return;
                            if (state === "locked") {
                              setRequestFor(inputValueToISO(`${day.key}T${pad2(h)}:00`));
                              return;
                            }
                            run(() => toggleDayHour(day.key, h));
                          }}
                        >
                          <span className="truncate">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {requests.length > 0 && (
        <Card>
          <div className="px-5 py-4">
            <h3 className="data mb-2.5 text-xs font-medium tracking-wide text-ink-dim uppercase">
              Change requests with admin
            </h3>
            <ul className="space-y-2">
              {requests.map((r) => (
                <li
                  key={r.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-edge bg-base px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="data-num text-sm text-ink">
                      {formatDateTime(r.slot_start)}
                    </p>
                    <p className="text-xs text-ink-faint">{r.reason}</p>
                  </div>
                  <Badge tone={REQUEST_TONE[r.status]}>{r.status}</Badge>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      {requestFor && (
        <ChangeRequestModal
          startIso={requestFor}
          onClose={() => setRequestFor(null)}
        />
      )}
    </>
  );
}

function ChangeRequestModal({
  startIso,
  onClose,
}: {
  startIso: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await requestAvailabilityChange(startIso, reason);
        setSent(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't send request");
      }
    });
  }

  return (
    <Modal
      title="Request a change"
      subtitle={formatDateTime(startIso)}
      onClose={onClose}
      footer={
        sent ? (
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        ) : (
          <>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="change-request-form"
              variant="primary"
              disabled={isPending}
            >
              {isPending ? "Sending…" : "Send to admin"}
            </Button>
          </>
        )
      }
    >
      {sent ? (
        <p className="data rounded-lg border border-[#1c5a44] bg-[#0d2b22] px-3 py-2.5 text-sm text-status-booked">
          Sent. Your admin will pick this up — your hours stay as they are until
          they action it.
        </p>
      ) : (
        <form id="change-request-form" onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-ink-dim">
            This is today or tomorrow, so it can&apos;t be changed directly.
            Tell your admin what you need.
          </p>
          <Field label="Reason">
            <Textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Can't make my 4pm today — please move or cancel it."
            />
          </Field>
          {error && (
            <p className="data rounded-lg border border-[#5c2027] bg-[#2a1218] px-3 py-2 text-sm text-status-dead">
              {error}
            </p>
          )}
        </form>
      )}
    </Modal>
  );
}
