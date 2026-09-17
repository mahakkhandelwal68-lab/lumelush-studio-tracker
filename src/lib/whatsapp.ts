import { formatDateTime } from "@/lib/datetime";

/**
 * wa.me only ever pre-fills the message box — WhatsApp has no free API to
 * actually send on someone's behalf, so the SDR still taps Send themselves.
 * Indian mobile numbers are stored as bare 10-digit locals; wa.me needs the
 * country code, so a 10-digit number gets "91" prepended. Anything else
 * (already has a code, a landline, missing) is left as-is / omitted so the
 * link just opens WhatsApp with no chat pre-selected instead of a broken one.
 */
export function buildWhatsAppUrl(phone: string | null | undefined, message: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  const intl = digits.length === 10 ? `91${digits}` : digits;
  const base = intl ? `https://wa.me/${intl}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function buildMeetingConfirmationMessage(input: {
  leadName: string;
  businessName: string | null;
  consultantName: string;
  scheduledStart: string;
  locationType: "google_meet" | "phone";
  locationDetail: string | null;
}) {
  const who = input.businessName ? `${input.leadName} (${input.businessName})` : input.leadName;
  const when = formatDateTime(input.scheduledStart);

  const joinLine =
    input.locationType === "google_meet"
      ? `Join here: ${input.locationDetail ?? "link to follow shortly"}`
      : `We'll call you on ${input.locationDetail ?? "your number"} at that time.`;

  return [
    `Hi! This is to confirm your consultation with LumeLush Studio.`,
    ``,
    `For: ${who}`,
    `When: ${when}`,
    `With: ${input.consultantName}`,
    ``,
    joinLine,
    ``,
    `Looking forward to speaking with you!`,
  ].join("\n");
}
