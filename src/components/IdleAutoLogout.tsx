"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { endOpenSession } from "@/lib/sessionTracking";

const IDLE_LIMIT_MS = 15 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

/**
 * Signs the user out after 15 minutes with no mouse/keyboard/scroll
 * activity, closing their active_sessions row at the same time — that
 * close, not a periodic ping, is what makes "how long were they active"
 * a real, cheap-to-store number (see migrations/0025_active_sessions.sql).
 *
 * Also makes a best-effort close on "pagehide" (tab closed or navigated
 * away from entirely, not just idled) — the idle timer above only ever
 * fires if this component stays mounted long enough to see 15 quiet
 * minutes, which never happens if the tab is simply closed. Without this,
 * that session would stay "open" until the same person's next login,
 * which retroactively closes it (see sessionTracking.ts) but only with a
 * capped, approximate end time — catching the common case here (rather
 * than relying on that fallback) keeps the numbers exact more often.
 */
export function IdleAutoLogout({ userId }: { userId: string }) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function logOut() {
      await endOpenSession(userId).catch(() => {});
      await createClient().auth.signOut();
      router.replace("/login");
    }

    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(logOut, IDLE_LIMIT_MS);
    }

    function handlePageHide() {
      endOpenSession(userId).catch(() => {});
    }

    resetTimer();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer, { passive: true });
    }
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetTimer);
      }
      window.removeEventListener("pagehide", handlePageHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return null;
}
