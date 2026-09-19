import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/datetime";

// Only these accounts get phone push notifications. Keyed by email like the
// other per-account rules in this codebase.
export const NOTIFY_EMAILS = ["mahak@lumelush.com"];

export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

function configureVapid() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

/** Sends to every registered device of the given accounts. Returns how many were delivered. */
export async function sendPushToEmails(emails: string[], payload: PushPayload) {
  if (!configureVapid()) return 0;

  const admin = createAdminClient();
  const { data: profiles } = await admin.from("profiles").select("id").in("email", emails);
  const userIds = (profiles ?? []).map((p) => p.id);
  if (userIds.length === 0) return 0;

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  let delivered = 0;
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 3600, urgency: "high" }
        );
        delivered++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404/410 mean the device unsubscribed or the app was removed.
        if (status === 404 || status === 410) {
          await admin.from("push_subscriptions").delete().eq("id", s.id);
        }
      }
    })
  );
  return delivered;
}

/** Best-effort: a failed notification must never fail the booking itself. */
export async function notifyMeetingBooked(input: {
  bookedBy: string;
  leadLabel: string;
  consultantName: string;
  scheduledStart: string;
}) {
  try {
    await sendPushToEmails(NOTIFY_EMAILS, {
      title: "Meeting booked",
      body: `${input.bookedBy} booked ${input.leadLabel} with ${input.consultantName} for ${formatDateTime(input.scheduledStart)}`,
      url: "/admin/meetings",
    });
  } catch {
    // Swallow: booking already succeeded.
  }
}
