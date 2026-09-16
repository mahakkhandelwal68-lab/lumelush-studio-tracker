// Business request: a fixed set of accounts should show the green online
// indicator (chat presence dot, Admin -> Activity's Online/Offline) on a
// schedule, independent of whether they're actually connected — not real
// presence tracking, and not automation (no cron/job runs anything): this
// is a pure function of the current time, re-evaluated on every render, so
// the dot naturally turns on/off as the clock crosses each window with no
// standing process required.
//
// Keyed by profile id since chat contact rows don't carry email; update if
// these accounts are ever deleted and recreated (id changes).
const ALWAYS_ONLINE_IDS = new Set([
  "491df9ad-e17b-4f15-81c4-457d8d8231fc", // udit@lumelush.com
  "c0257a58-c966-47d7-8833-f10722abc19e", // purva@lumelush.com
  "0ece7734-2591-4bfe-9c49-1957f43ff2bd", // umang@lumelush.com
]);

/** [startMinute, endMinute) of day, in IST, e.g. [660, 780] = 11:00-13:00. */
type Window = [number, number];

function hm(hour: number, minute: number) {
  return hour * 60 + minute;
}

const SCHEDULED_ONLINE_WINDOWS: Record<string, Window[]> = {
  // sumaya@lumelush.com — 11:55-13:00, 14:00-15:00, 17:00-18:30
  "0a3dfe7d-1651-42ca-881a-3153e1d3d167": [
    [hm(11, 55), hm(13, 0)],
    [hm(14, 0), hm(15, 0)],
    [hm(17, 0), hm(18, 30)],
  ],
  // sarah@lumelush.com — 10:00-12:30, 14:30-15:00, 18:00-18:30
  "43eb58ec-4788-4660-b157-6725ecc619a7": [
    [hm(10, 0), hm(12, 30)],
    [hm(14, 30), hm(15, 0)],
    [hm(18, 0), hm(18, 30)],
  ],
  // ruhi@lumelush.com — 10:00-11:00, 13:00-14:00, 15:00-16:30
  "dda973f9-1c3c-4311-978a-4093dd0c0f5d": [
    [hm(10, 0), hm(11, 0)],
    [hm(13, 0), hm(14, 0)],
    [hm(15, 0), hm(16, 30)],
  ],
  // akhil@lumelush.com — 13:00-17:30
  "a80fb75d-f78d-4746-9153-89dece690673": [[hm(13, 0), hm(17, 30)]],
};

function istMinuteOfDay(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

export function isAlwaysOnline(userId: string) {
  if (ALWAYS_ONLINE_IDS.has(userId)) return true;

  const windows = SCHEDULED_ONLINE_WINDOWS[userId];
  if (!windows) return false;

  const nowMin = istMinuteOfDay(new Date());
  return windows.some(([start, end]) => nowMin >= start && nowMin < end);
}
