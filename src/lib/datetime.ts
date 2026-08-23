// All meeting/slot times are rendered in a single fixed business timezone.
//
// Why: dates were being formatted with toLocaleString(), which uses the
// runtime's own locale/timezone. On the server that's UTC (on Vercel), in the
// browser it's the viewer's locale — so the same timestamp rendered as
// "8/14/2026" server-side and "14/8/2026" client-side, causing a React
// hydration mismatch. Pinning locale + timezone makes rendering deterministic
// everywhere, and "company time" is the right semantic for a shared CRM
// calendar anyway.
//
// Override per-deployment with NEXT_PUBLIC_DISPLAY_TIMEZONE (an IANA name).
export const DISPLAY_TIMEZONE =
  process.env.NEXT_PUBLIC_DISPLAY_TIMEZONE || "Asia/Kolkata";

const DATE_TIME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: DISPLAY_TIMEZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

const TIME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: DISPLAY_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

/** e.g. "14 Aug 2026, 10:00 am" */
export function formatDateTime(iso: string) {
  return DATE_TIME_FMT.format(new Date(iso));
}

/** e.g. "11:00 am" */
export function formatTime(iso: string) {
  return TIME_FMT.format(new Date(iso));
}

/** How far `date` is offset from UTC in the given timezone, in ms. */
function tzOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second")
  );
  return asUtc - date.getTime();
}

/**
 * Converts a `datetime-local` input value ("2026-08-14T10:00"), which carries
 * no timezone, into a real UTC instant — interpreting the wall time as being
 * in DISPLAY_TIMEZONE rather than the browser's timezone.
 */
export function inputValueToISO(local: string) {
  const [datePart, timePart] = local.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);

  const naiveUtc = Date.UTC(y, m - 1, d, hh, mm);
  // Two passes so we land on the correct side of any DST transition.
  let ts = naiveUtc - tzOffsetMs(new Date(naiveUtc), DISPLAY_TIMEZONE);
  ts = naiveUtc - tzOffsetMs(new Date(ts), DISPLAY_TIMEZONE);

  return new Date(ts).toISOString();
}

/** Builds a `datetime-local` input value in DISPLAY_TIMEZONE. */
export function isoToInputValue(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DISPLAY_TIMEZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(iso));

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  // en-CA gives ISO-ish YYYY-MM-DD ordering; hour can come back as "24".
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}
