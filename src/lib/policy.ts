// Shared business rules. Kept out of "use server" files, which may only
// export async functions.
import { DISPLAY_TIMEZONE, isoToInputValue } from "@/lib/datetime";

/**
 * Today and tomorrow (by calendar date, not a rolling 48 hours) are frozen:
 * the consultant can't edit them directly and must file a change request
 * for an admin to action. Editing opens up starting the day after tomorrow.
 *
 * Calendar-date-based rather than hour-based on purpose: a pure "next 48
 * hours" window would lock a 3rd day late at night depending what time it
 * happens to be, which doesn't match "today and tomorrow are locked."
 */
export const LOCK_WINDOW_HOURS = 48; // kept for display copy ("within 48h")
const LOCKED_DAYS_AHEAD = 2; // today (0) and tomorrow (1) are locked

export function isInsideLockWindow(startTime: string, now: number = Date.now()) {
  const todayKey = isoToInputValue(new Date(now).toISOString()).split("T")[0];
  const targetKey = isoToInputValue(startTime).split("T")[0];

  const dayDiff = Math.round(
    (Date.parse(`${targetKey}T00:00:00`) - Date.parse(`${todayKey}T00:00:00`)) /
      (24 * 60 * 60 * 1000)
  );

  return dayDiff < LOCKED_DAYS_AHEAD;
}

/** True if `timezone` is being used consistently — re-exported for callers
 * that want to display which timezone the lock dates are computed in. */
export const LOCK_TIMEZONE = DISPLAY_TIMEZONE;
