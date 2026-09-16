// Business request: these three accounts should always show the green
// online indicator (chat presence dot, Admin -> Activity's Online/Offline),
// independent of whether they're actually connected — a fixed display
// override, not real presence tracking. Keyed by profile id since chat
// contact rows don't carry email; update if these accounts are ever
// deleted and recreated (id changes). Plain module (no "use client") so it
// can be imported from both server components and client components.
const ALWAYS_ONLINE_IDS = new Set([
  "491df9ad-e17b-4f15-81c4-457d8d8231fc", // udit@lumelush.com
  "c0257a58-c966-47d7-8833-f10722abc19e", // purva@lumelush.com
  "0ece7734-2591-4bfe-9c49-1957f43ff2bd", // umang@lumelush.com
]);

export function isAlwaysOnline(userId: string) {
  return ALWAYS_ONLINE_IDS.has(userId);
}
