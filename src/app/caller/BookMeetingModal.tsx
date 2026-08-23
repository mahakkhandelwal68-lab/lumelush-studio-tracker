"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { bookMeeting } from "@/app/caller/actions";
import {
  DISPLAY_TIMEZONE,
  formatDateTime,
  isoToInputValue,
} from "@/lib/datetime";
import {
  AVAILABILITY_HORIZON_DAYS,
  DEFAULT_MEETING_MINUTES,
  MEETING_LENGTH_OPTIONS,
  countByDay,
  excludeFullDays,
  freeStartTimes,
  windowsWithDefaults,
  type Interval,
} from "@/lib/scheduling";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { Modal } from "@/components/Modal";

interface Consultant {
  id: string;
}

const DAYS_AHEAD = AVAILABILITY_HORIZON_DAYS;

export function BookMeetingModal({
  lead,
  consultants,
  onClose,
}: {
  lead: { id: string; ref: string; name: string; email: string | null };
  consultants: Consultant[];
  onClose: () => void;
}) {
  const [duration, setDuration] = useState<number>(DEFAULT_MEETING_MINUTES);
  const [dayKey, setDayKey] = useState(
    () => isoToInputValue(new Date().toISOString()).split("T")[0]
  );
  // Pooled across the whole team: id -> { windows, busy } for each active consultant.
  const [pool, setPool] = useState<Record<string, { windows: Interval[]; busy: Interval[] }>>({});
  const [loaded, setLoaded] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [locationType, setLocationType] = useState<"google_meet" | "phone">(
    "google_meet"
  );
  const [guestEmail, setGuestEmail] = useState(lead.email ?? "");
  const [locationDetail, setLocationDetail] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const days = useMemo(
    () =>
      Array.from({ length: DAYS_AHEAD }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return {
          key: isoToInputValue(d.toISOString()).split("T")[0],
          weekday: new Intl.DateTimeFormat("en-GB", {
            timeZone: DISPLAY_TIMEZONE,
            weekday: "short",
          }).format(d),
          label: new Intl.DateTimeFormat("en-GB", {
            timeZone: DISPLAY_TIMEZONE,
            day: "2-digit",
            month: "short",
          }).format(d),
        };
      }),
    []
  );

  // Pull every active consultant's windows + busy times once. Nothing here
  // reveals meeting contents — just when people are free (see busy_times()).
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + DAYS_AHEAD);

    Promise.all(
      consultants.map(async (c) => {
        const [windowsRes, busyRes] = await Promise.all([
          supabase
            .from("availability_windows")
            .select("start_time, end_time")
            .eq("consultant_id", c.id)
            .gte("end_time", from.toISOString())
            .lt("start_time", to.toISOString()),
          supabase.rpc("busy_times", {
            p_consultant_id: c.id,
            p_from: from.toISOString(),
            p_to: to.toISOString(),
          }),
        ]);
        return [
          c.id,
          {
            windows: (windowsRes.data ?? []).map((w) => ({
              start: w.start_time,
              end: w.end_time,
            })),
            busy: (busyRes.data ?? []).map((b) => ({
              start: b.busy_start,
              end: b.busy_end,
            })),
          },
        ] as const;
      })
    ).then((entries) => {
      if (cancelled) return;
      setPool(Object.fromEntries(entries));
      setLoaded(true);
      setStartTime("");
    });

    return () => {
      cancelled = true;
    };
    // consultants list is effectively static for the modal's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dayKeys = useMemo(() => days.map((d) => d.key), [days]);

  // A time is offerable if AT LEAST ONE consultant is free for the full
  // duration — we don't care which one until booking actually happens.
  // Each consultant's own day-defaults (open 9-8 when no hours are set) and
  // daily cap (8 meetings max) are applied before pooling, since both are
  // per-consultant facts, not something a raw union of windows can express.
  const pooledFreeTimes = useMemo(() => {
    if (!loaded) return [];
    const all = new Set<string>();
    for (const { windows, busy } of Object.values(pool)) {
      const effectiveWindows = windowsWithDefaults(windows, dayKeys);
      const times = freeStartTimes(effectiveWindows, busy, duration);
      const meetingsPerDay = countByDay(busy.map((b) => b.start));
      for (const t of excludeFullDays(times, meetingsPerDay)) all.add(t);
    }
    return [...all].sort();
  }, [pool, loaded, duration, dayKeys]);

  const timesForDay = useMemo(
    () =>
      pooledFreeTimes.filter(
        (iso) => isoToInputValue(iso).split("T")[0] === dayKey
      ),
    [pooledFreeTimes, dayKey]
  );

  const daysWithAvailability = useMemo(
    () => new Set(pooledFreeTimes.map((iso) => isoToInputValue(iso).split("T")[0])),
    [pooledFreeTimes]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!startTime) {
      setError("Pick a time first.");
      return;
    }
    if (locationType === "google_meet" && !guestEmail.trim()) {
      setError("Add the client's email so they can be invited to the Meet.");
      return;
    }

    const endTime = new Date(
      new Date(startTime).getTime() + duration * 60_000
    ).toISOString();

    startTransition(async () => {
      try {
        await bookMeeting({
          leadId: lead.id,
          leadName: lead.name,
          startTime,
          endTime,
          durationMinutes: duration,
          contextNotes: notes,
          locationType,
          locationDetail,
          guestEmail,
        });
        onClose();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Couldn't book the meeting"
        );
      }
    });
  }

  return (
    <Modal
      title="Book meeting"
      subtitle={`${lead.ref} · ${lead.name}`}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="book-form"
            variant="primary"
            disabled={isPending || !startTime}
          >
            {isPending ? "Booking…" : "Confirm booking"}
          </Button>
        </>
      }
    >
      <form id="book-form" onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-ink-dim">
          Pick any open time — a consultant is assigned automatically.
        </p>

        <Field label="Length">
          <Select
            value={duration}
            onChange={(e) => {
              setDuration(Number(e.target.value));
              setStartTime("");
            }}
          >
            {MEETING_LENGTH_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </Select>
        </Field>

        {/* Day strip */}
        <fieldset>
          <legend className="data mb-1.5 block text-xs font-medium tracking-wide text-ink-dim uppercase">
            Day
          </legend>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {days.map((d) => {
              const active = d.key === dayKey;
              const has = daysWithAvailability.has(d.key);
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => {
                    setDayKey(d.key);
                    setStartTime("");
                  }}
                  className={`data shrink-0 rounded-xl border px-3 py-2 text-center transition ${
                    active
                      ? "border-brand-teal bg-overlay text-ink"
                      : has
                        ? "border-edge bg-base text-ink-dim hover:border-edge-strong"
                        : "border-edge bg-base text-ink-faint/50"
                  }`}
                >
                  <span className="block text-xs">{d.weekday}</span>
                  <span className="data-num block text-xs">{d.label}</span>
                  <span
                    className={`mx-auto mt-1 block size-1 rounded-full ${
                      has ? "bg-status-booked" : "bg-transparent"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Times */}
        <fieldset>
          <legend className="data mb-1.5 block text-xs font-medium tracking-wide text-ink-dim uppercase">
            Start time · {DISPLAY_TIMEZONE.replace("_", " ")}
          </legend>

          {!loaded ? (
            <p className="text-sm text-ink-faint">Loading availability…</p>
          ) : timesForDay.length === 0 ? (
            <p className="rounded-lg border border-edge bg-base px-3 py-3 text-sm text-ink-faint">
              Nobody&apos;s free that day for a {duration}-minute meeting. Try
              another day or a shorter length.
            </p>
          ) : (
            <div className="grid max-h-52 grid-cols-3 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-4">
              {timesForDay.map((iso) => {
                const active = iso === startTime;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setStartTime(iso)}
                    className={`data-num rounded-lg border px-2 py-2 text-sm transition ${
                      active
                        ? "border-brand-teal bg-overlay text-ink"
                        : "border-edge bg-base text-ink-dim hover:border-edge-strong hover:bg-overlay"
                    }`}
                  >
                    {isoToInputValue(iso).split("T")[1]}
                  </button>
                );
              })}
            </div>
          )}

          {startTime && (
            <p className="data mt-2 text-xs text-brand-teal">
              {formatDateTime(startTime)} · {duration} min
            </p>
          )}
        </fieldset>

        {/* Where */}
        <fieldset>
          <legend className="data mb-1.5 block text-xs font-medium tracking-wide text-ink-dim uppercase">
            Meeting place
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "google_meet" as const, label: "Google Meet", desc: "Video call" },
                { value: "phone" as const, label: "Phone call", desc: "Voice only" },
              ]
            ).map((o) => {
              const active = o.value === locationType;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setLocationType(o.value)}
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

          <div className="mt-2">
            {locationType === "google_meet" ? (
              <Input
                type="email"
                required
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="client@business.com"
              />
            ) : (
              <Input
                value={locationDetail}
                onChange={(e) => setLocationDetail(e.target.value)}
                placeholder={
                  lead.email
                    ? "Number to call (defaults to the lead's phone)"
                    : "Number to call"
                }
              />
            )}
          </div>
          {locationType === "google_meet" && (
            <p className="mt-1 text-xs text-ink-faint">
              The link is created automatically and this email is invited
              directly — no waiting room.
            </p>
          )}
        </fieldset>

        <Field
          label="Context for the consultant"
          hint="What should they know before the call?"
        >
          <Textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Budget, timeline, what they asked about…"
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
