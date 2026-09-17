"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { endOpenSession } from "@/lib/sessionTracking";

const IDLE_LIMIT_MS = 7 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

/**
 * Signs the user out after 7 minutes with no mouse/keyboard/scroll
 * activity, closing their active_sessions row at the same time — that
 * close, not a periodic ping, is what makes "how long were they active"
 * a real, cheap-to-store number (see migrations/0025_active_sessions.sql).
 *
 * Also signs out the moment the tab is backgrounded (app switched, screen
 * locked, tab hidden) via the "visibilitychange" event, not just on an
 * outright close. This matters specifically on phones: a hidden mobile
 * browser tab has its JavaScript throttled or fully suspended by the OS,
 * so the idle timer above never gets to fire — without this, a session
 * opened on a phone and then backgrounded would stay "open" (and count as
 * active) for as long as the phone stays locked, sometimes many hours,
 * until the same person happens to log in again elsewhere (which
 * retroactively caps it, see sessionTracking.ts, but only once that
 * happens). Trade-off, by design: switching away and back means logging
 * in again, in exchange for the online/active numbers being accurate.
 *
 * "pagehide" (an outright close, not just backgrounding) is kept as a
 * fallback best-effort close for the rare case visibilitychange doesn't
 * fire first — it only closes the session row, since there's no tab left
 * to redirect.
 */
export function IdleAutoLogout({ userId }: { userId: string }) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loggedOutRef = useRef(false);

  useEffect(() => {
    async function logOut() {
      if (loggedOutRef.current) return;
      loggedOutRef.current = true;
      await endOpenSession(userId).catch(() => {});
      await createClient().auth.signOut();
      router.replace("/login");
    }

    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(logOut, IDLE_LIMIT_MS);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        if (timerRef.current) clearTimeout(timerRef.current);
        logOut();
      }
    }

    function handlePageHide() {
      if (loggedOutRef.current) return;
      endOpenSession(userId).catch(() => {});
    }

    resetTimer();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer, { passive: true });
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetTimer);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return null;
}
