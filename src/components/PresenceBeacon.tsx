"use client";

import { useEffect } from "react";
import { trackOwnPresence } from "@/lib/presence";

/**
 * Mounted once per role layout so a user counts as "online" while any page
 * of the app is open in their browser, not just the chat page. See
 * lib/presence.ts for why this goes through a shared module singleton
 * instead of creating its own Realtime channel.
 */
export function PresenceBeacon({ userId }: { userId: string }) {
  useEffect(() => {
    trackOwnPresence(userId);
  }, [userId]);

  return null;
}
