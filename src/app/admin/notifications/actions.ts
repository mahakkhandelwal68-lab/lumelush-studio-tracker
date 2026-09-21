"use server";

import { requireProfile } from "@/lib/auth";
import { NOTIFY_EMAILS, sendPushToEmails } from "@/lib/pushNotify";

async function requireNotifiedAdmin() {
  const { supabase, profile } = await requireProfile("admin");
  if (!NOTIFY_EMAILS.includes(profile.email)) {
    throw new Error("Notifications aren't enabled for this account");
  }
  return { supabase, profile };
}

export async function savePushSubscription(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  const { supabase, profile } = await requireNotifiedAdmin();
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { user_id: profile.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      { onConflict: "endpoint" }
    );
  if (error) throw new Error(error.message);
}

export async function removePushSubscription(endpoint: string) {
  const { supabase } = await requireNotifiedAdmin();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw new Error(error.message);
}

export async function sendTestNotification() {
  const { profile } = await requireNotifiedAdmin();
  // Returned rather than thrown: production masks thrown server-action
  // messages, which left the phone showing an opaque React error.
  try {
    const delivered = await sendPushToEmails([profile.email], {
      title: "Test notification",
      body: "Booking alerts are on for this phone.",
      url: "/admin/meetings",
    });
    return { delivered, error: null as string | null };
  } catch (err) {
    return { delivered: 0, error: err instanceof Error ? err.message : "Send failed" };
  }
}
