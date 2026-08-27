// Shared scheduling rules for availability windows and booking.
import { inputValueToISO, isoToInputValue } from "@/lib/datetime";

/** Working day the availability editor and pickers operate over. */
export const DAY_START_HOUR = 9; // 09:00
export const DAY_END_HOUR = 20; // 20:00

/** Bookable start times land on these boundaries, so 10:45 is offerable. */
export const SLOT_GRANULARITY_MINUTES = 15;

/** Default meeting length; a booking blocks this much of the day. */
export const DEFAULT_MEETING_MINUTES = 60;

export const MEETING_LENGTH_OPTIONS = [30, 45, 60, 90] as const;

/** How far ahead availability is defined and bookable — a rolling window
 * starting today. Nothing is bookable beyond this horizon. */
export const AVAILABILITY_HORIZON_DAYS = 10;

/** A consultant with no explicit hours on a day is NOT available — hours
 * have to be set for a day to be bookable at all. */
export const DEFAULT_AVAILABLE_WHEN_UNSET = false;

/** Hard cap on how many meetings one consultant can hold in a single day. */
export const MAX_MEETINGS_PER_DAY = 8;

export interface Interval {
  start: string; // ISO
  end: string; // ISO
}

const MINUTE = 60_000;

/**
 * All start times inside `windows` where a meeting of `durationMinutes` fits
 * without colliding with `busy`, at SLOT_GRANULARITY_MINUTES steps.
 *
 * Because a booking simply occupies its own length, the next offered start
 * after a taken 10:45 meeting is 11:45 — "an hour after the booking" — while
 * earlier gaps in the day stay bookable.
 */
export function freeStartTimes(
  windows: Interval[],
  busy: Interval[],
  durationMinutes: number,
  notBefore: Date = new Date()
): string[] {
  const step = SLOT_GRANULARITY_MINUTES * MINUTE;
  const duration = durationMinutes * MINUTE;
  const floor = notBefore.getTime();

  const busyRanges = busy.map((b) => ({
    start: new Date(b.start).getTime(),
    end: new Date(b.end).getTime(),
  }));

  const results = new Set<number>();

  for (const w of windows) {
    const windowStart = new Date(w.start).getTime();
    const windowEnd = new Date(w.end).getTime();

    // Align the first candidate up to the next granularity boundary.
    let t = Math.ceil(windowStart / step) * step;

    for (; t + duration <= windowEnd; t += step) {
      if (t < floor) continue;
      const overlaps = busyRanges.some((b) => t < b.end && t + duration > b.start);
      if (!overlaps) results.add(t);
    }
  }

  return [...results].sort((a, b) => a - b).map((t) => new Date(t).toISOString());
}

/**
 * Expands a consultant's explicit windows across `dayKeys` (each
 * "YYYY-MM-DD" in the business timezone). A day with no explicit hours set
 * contributes nothing — it's simply not bookable until the consultant adds
 * a slot.
 */
export function windowsWithDefaults(
  explicitWindows: Interval[],
  dayKeys: string[]
): Interval[] {
  const byDay = new Map<string, Interval[]>();
  for (const w of explicitWindows) {
    const key = isoToInputValue(w.start).split("T")[0];
    const list = byDay.get(key) ?? [];
    list.push(w);
    byDay.set(key, list);
  }

  const result: Interval[] = [];
  for (const day of dayKeys) {
    const existing = byDay.get(day);
    if (existing && existing.length > 0) {
      result.push(...existing);
    } else if (DEFAULT_AVAILABLE_WHEN_UNSET) {
      result.push({
        start: inputValueToISO(
          `${day}T${String(DAY_START_HOUR).padStart(2, "0")}:00`
        ),
        end: inputValueToISO(
          `${day}T${String(DAY_END_HOUR).padStart(2, "0")}:00`
        ),
      });
    }
  }
  return result;
}

/** Drops any start time that falls on a day where `meetingsPerDay` already
 * meets or exceeds MAX_MEETINGS_PER_DAY for that consultant. */
export function excludeFullDays(
  times: string[],
  meetingsPerDay: Map<string, number>
): string[] {
  return times.filter(
    (t) =>
      (meetingsPerDay.get(isoToInputValue(t).split("T")[0]) ?? 0) <
      MAX_MEETINGS_PER_DAY
  );
}

/** Counts meetings per local calendar day from a list of meeting starts. */
export function countByDay(meetingStarts: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const iso of meetingStarts) {
    const key = isoToInputValue(iso).split("T")[0];
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

/** Merges touching/overlapping intervals so the UI shows one clean band. */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];

  const sorted = [...intervals].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  const merged: { start: number; end: number }[] = [];
  for (const item of sorted) {
    const start = new Date(item.start).getTime();
    const end = new Date(item.end).getTime();
    const last = merged[merged.length - 1];

    if (last && start <= last.end) {
      last.end = Math.max(last.end, end);
    } else {
      merged.push({ start, end });
    }
  }

  return merged.map((m) => ({
    start: new Date(m.start).toISOString(),
    end: new Date(m.end).toISOString(),
  }));
}

/** "09:00", "13:45" — quarter-hour options across the working day. */
export function workingDayTimeOptions() {
  const options: string[] = [];
  for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_GRANULARITY_MINUTES) {
      if (h === DAY_END_HOUR && m > 0) break;
      options.push(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
      );
    }
  }
  return options;
}
