"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
import {
  AVAILABILITY_HORIZON_DAYS,
  DAY_END_HOUR,
  DAY_START_HOUR,
  MAX_MEETINGS_PER_DAY,
  SLOT_GRANULARITY_MINUTES,
} from "@/lib/scheduling";
import { copyWindowsToWeek, requestAvailabilityChange, setDayWindows } from "@/app/consultant/actions";

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

const DAY_START_MIN = DAY_START_HOUR * 60;
const DAY_END_MIN = DAY_END_HOUR * 60;
const TOTAL_MIN = DAY_END_MIN - DAY_START_MIN;

const HOUR_TICKS = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
  (_, i) => DAY_START_HOUR + i
);

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function minToLabel(min: number) {
  return `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`;
}

function pctOf(min: number) {
  return ((min - DAY_START_MIN) / TOTAL_MIN) * 100;
}

function snap(min: number) {
  return Math.round(min / SLOT_GRANULARITY_MINUTES) * SLOT_GRANULARITY_MINUTES;
}

interface Slot {
  id: string;
  startMin: number;
  endMin: number;
}

let slotSeq = 0;
function newSlotId() {
  return `new-${Date.now()}-${slotSeq++}`;
}

/** Defensively drops any sub-granularity row — old data from before "day
 * off" was representable as zero rows could still have a leftover marker. */
function windowsToSlots(windows: Window[]): Slot[] {
  return windows
    .map((w) => {
      const [, startTime] = isoToInputValue(w.start_time).split("T");
      const [, endTime] = isoToInputValue(w.end_time).split("T");
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      return { id: w.id, startMin: sh * 60 + sm, endMin: eh * 60 + em };
    })
    .filter((s) => s.endMin - s.startMin >= SLOT_GRANULARITY_MINUTES)
    .sort((a, b) => a.startMin - b.startMin);
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
  const [busyDay, setBusyDay] = useState<string | null>(null);

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

  function run(dayKey: string | null, fn: () => Promise<void>) {
    setError(null);
    setBusyDay(dayKey);
    startTransition(async () => {
      try {
        await fn();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setBusyDay(null);
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
                  run(null, () =>
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
          <span className="h-3 w-5 rounded" style={{ background: "var(--brand-mint)" }} />
          available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-5 rounded" style={{ background: "var(--accent-gradient)" }} />
          meeting booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-5 rounded border border-edge-strong bg-overlay" />
          not available
        </span>
        <span className="ml-auto text-ink-faint">
          {editing
            ? "Drag the edges to resize, or add a slot — today & tomorrow need a change request"
            : "Click \"Edit availability\" to change hours"}
        </span>
      </div>

      {/* Hour ruler, shared across every day row below. */}
      <div className="data-num flex text-[10px] text-ink-faint">
        <div className="w-36 shrink-0" />
        <div className="relative h-4 flex-1">
          {HOUR_TICKS.map((h) => (
            <span
              key={h}
              className="absolute -translate-x-1/2"
              style={{ left: `${pctOf(h * 60)}%` }}
            >
              {pad2(h)}:00
            </span>
          ))}
        </div>
        <div className="w-0 shrink-0 sm:w-[7.5rem]" />
      </div>

      <div className="space-y-2">
        {days.map((day) => {
          const info = byDay.get(day.key)!;
          const dayLocked = isInsideLockWindow(
            inputValueToISO(`${day.key}T00:00`),
            nowMs
          );
          const bookedCount = info.meetings.length;
          const thisDayBusy = busyDay === day.key && isPending;

          const meetingSpans = info.meetings.map((m) => {
            const [, startTime] = isoToInputValue(m.scheduled_start).split("T");
            const [, endTime] = isoToInputValue(m.scheduled_end).split("T");
            const [sh, sm] = startTime.split(":").map(Number);
            const [eh, em] = endTime.split(":").map(Number);
            return {
              meeting: m,
              startMin: Math.max(sh * 60 + sm, DAY_START_MIN),
              endMin: Math.min(eh * 60 + em, DAY_END_MIN),
            };
          });

          return (
            <DayRow
              key={day.key}
              day={day}
              windows={info.windows}
              meetingSpans={meetingSpans}
              dayLocked={dayLocked}
              editing={editing}
              busy={thisDayBusy}
              bookedCount={bookedCount}
              onPersist={(ranges) => run(day.key, () => setDayWindows(day.key, ranges))}
              onRequestChange={() =>
                setRequestFor(
                  day.isToday ? now : inputValueToISO(`${day.key}T00:00`)
                )
              }
            />
          );
        })}
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

function DayRow({
  day,
  windows,
  meetingSpans,
  dayLocked,
  editing,
  busy,
  bookedCount,
  onPersist,
  onRequestChange,
}: {
  day: { key: string; isToday: boolean; weekday: string; dayNum: string; month: string };
  windows: Window[];
  meetingSpans: { meeting: Meeting; startMin: number; endMin: number }[];
  dayLocked: boolean;
  editing: boolean;
  busy: boolean;
  bookedCount: number;
  onPersist: (ranges: { startMin: number; endMin: number }[]) => void;
  onRequestChange: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const slotsRef = useRef<Slot[]>([]);

  const derivedSlots = useMemo(() => windowsToSlots(windows), [windows]);

  const [slots, setSlots] = useState<Slot[]>(derivedSlots);
  useEffect(() => {
    if (!draggingRef.current) setSlots(derivedSlots);
  }, [derivedSlots]);
  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  function persistCurrent() {
    onPersist(slotsRef.current.map((s) => ({ startMin: s.startMin, endMin: s.endMin })));
  }

  function minuteFromClientX(clientX: number) {
    const rect = trackRef.current!.getBoundingClientRect();
    const raw = DAY_START_MIN + ((clientX - rect.left) / rect.width) * TOTAL_MIN;
    return Math.min(DAY_END_MIN, Math.max(DAY_START_MIN, snap(raw)));
  }

  function startDrag(
    e: React.PointerEvent<HTMLDivElement>,
    slotId: string,
    edge: "start" | "end"
  ) {
    if (!editing || dayLocked || busy) return;
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    draggingRef.current = true;

    function onMove(ev: PointerEvent) {
      const min = minuteFromClientX(ev.clientX);
      setSlots((prev) =>
        prev.map((s) => {
          if (s.id !== slotId) return s;
          if (edge === "start") {
            return { ...s, startMin: Math.min(min, s.endMin - SLOT_GRANULARITY_MINUTES) };
          }
          return { ...s, endMin: Math.max(min, s.startMin + SLOT_GRANULARITY_MINUTES) };
        })
      );
    }
    function onUp() {
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      draggingRef.current = false;
      persistCurrent();
    }
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
  }

  /** Applies a change to the authoritative ref first (so rapid, synchronous
   * calls never read a stale value the way reading React state would),
   * then mirrors it into render state and persists it. */
  function commit(next: Slot[]) {
    slotsRef.current = next;
    setSlots(next);
    onPersist(next.map((s) => ({ startMin: s.startMin, endMin: s.endMin })));
  }

  function addSlot() {
    const current = slotsRef.current;
    const lastEnd = current.reduce((max, s) => Math.max(max, s.endMin), DAY_START_MIN);
    if (lastEnd >= DAY_END_MIN) return;
    const start = current.length === 0 ? DAY_START_MIN : lastEnd;
    const end = Math.min(start + 120, DAY_END_MIN);
    commit([...current, { id: newSlotId(), startMin: start, endMin: end }]);
  }

  function removeSlot(slotId: string) {
    commit(slotsRef.current.filter((s) => s.id !== slotId));
  }

  function markOff() {
    commit([]);
  }

  const timeSummary =
    slots.length === 0
      ? "Not available"
      : slots
          .map((s) => `${minToLabel(s.startMin)}–${minToLabel(s.endMin)}`)
          .join(", ");

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-edge bg-raised shadow-[0_10px_28px_-22px_rgba(0,0,0,0.6)] ${
        day.isToday ? "ring-1 ring-[var(--brand-teal)]/50" : ""
      }`}
    >
      <div className="flex flex-col gap-2.5 p-3.5 sm:flex-row sm:items-center">
        {/* Day label */}
        <div className="flex shrink-0 items-center gap-3 sm:w-36">
          <div>
            <p className="data text-sm font-semibold text-ink">
              {day.weekday}{" "}
              <span className="data-num font-normal text-ink-faint">
                {day.dayNum} {day.month}
              </span>
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              {day.isToday && (
                <span className="accent-bar rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white">
                  today
                </span>
              )}
              {dayLocked && !day.isToday && (
                <span className="rounded-full bg-[#f6dfa8] px-1.5 py-0.5 text-[9px] font-semibold text-[#7a5b12]">
                  locked
                </span>
              )}
              <span
                className={`data-num text-[10px] ${
                  bookedCount >= MAX_MEETINGS_PER_DAY
                    ? "font-semibold text-status-dead"
                    : "text-ink-faint"
                }`}
              >
                {bookedCount}/{MAX_MEETINGS_PER_DAY} booked
              </span>
            </div>
          </div>
        </div>

        {/* Timeline track */}
        <div className="min-w-0 flex-1">
          <div
            ref={trackRef}
            className="relative h-8 overflow-visible rounded-lg border border-edge-strong bg-overlay"
          >
            {slots.map((s) => (
              <div
                key={s.id}
                className="group absolute top-0.5 bottom-0.5 rounded-md"
                style={{
                  left: `${pctOf(s.startMin)}%`,
                  width: `${pctOf(s.endMin) - pctOf(s.startMin)}%`,
                  background: "var(--brand-mint)",
                }}
                title={`${minToLabel(s.startMin)}–${minToLabel(s.endMin)} available`}
              >
                {editing && !dayLocked && !busy && (
                  <>
                    <div
                      onPointerDown={(e) => startDrag(e, s.id, "start")}
                      className="absolute top-0 -left-1.5 h-full w-3 cursor-ew-resize touch-none"
                    />
                    <div
                      onPointerDown={(e) => startDrag(e, s.id, "end")}
                      className="absolute top-0 -right-1.5 h-full w-3 cursor-ew-resize touch-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeSlot(s.id)}
                      title="Remove this slot"
                      className="data absolute top-1/2 left-1/2 grid size-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#0d2b22]/70 text-[10px] leading-none text-white opacity-0 transition hover:bg-[#0d2b22] group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            ))}

            {meetingSpans.map(({ meeting, startMin, endMin }) => (
              <div
                key={meeting.id}
                className="absolute top-0.5 bottom-0.5 z-10 rounded-md"
                style={{
                  left: `${pctOf(startMin)}%`,
                  width: `${Math.max(pctOf(endMin) - pctOf(startMin), 1.5)}%`,
                  background: "var(--accent-gradient)",
                }}
                title={`${meeting.leads?.business_name ?? meeting.leads?.name ?? "Meeting"} · ${minToLabel(startMin)}–${minToLabel(endMin)}`}
              />
            ))}
          </div>

          <p className="data-num mt-1 text-[11px] text-ink-faint">{timeSummary}</p>
        </div>

        {/* Editing controls */}
        {editing && (
          <div className="flex shrink-0 flex-wrap gap-1.5">
            {dayLocked ? (
              <Button size="sm" variant="ghost" onClick={onRequestChange}>
                Request a change
              </Button>
            ) : (
              <>
                <Button size="sm" disabled={busy} onClick={addSlot}>
                  + Add slot
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={markOff}>
                  Not available
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
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
