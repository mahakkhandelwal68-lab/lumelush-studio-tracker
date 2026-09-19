"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { endOpenSession, ensureOpenSession } from "@/lib/sessionTracking";

const IDLE_LIMIT_MS = 7 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

/**
 * Keeps active_sessions honest without any periodic pinging (see
 * migrations/0025_active_sessions.sql): a session row is opened when the app
 * is on screen and closed when it isn't, so "how long were they active" is
 * just the sum of on-screen time.
 *
 * - Visible but untouched for 7 minutes: sign out (idle timer below).
 * - Backgrounded (app switched, screen locked, tab hidden): close the session
 *   right away so away-time isn't counted and the person shows offline, but
 *   stay logged in — an SDR taking a call or opening WhatsApp shouldn't have
 *   to log in again. A hidden mobile tab's JS is frozen, so nothing can run
 *   while it's away; instead the check happens on return: away 7+ minutes
 *   signs out, less resumes with a fresh session.
 * - "pagehide" (outright close/reload) is a fallback best-effort close.
 */
export function IdleAutoLogout({ userId }: { userId: string }) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loggedOutRef = useRef(false);

  useEffect(() => {
    let hiddenAt: number | null = null;

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
        hiddenAt = Date.now();
        if (timerRef.current) clearTimeout(timerRef.current);
        endOpenSession(userId).catch(() => {});
        return;
      }

      const awayMs = hiddenAt === null ? 0 : Date.now() - hiddenAt;
      hiddenAt = null;
      if (awayMs >= IDLE_LIMIT_MS) {
        logOut();
        return;
      }
      ensureOpenSession(userId).catch(() => {});
      resetTimer();
    }

    function handlePageHide() {
      if (loggedOutRef.current) return;
      endOpenSession(userId).catch(() => {});
    }

    if (document.visibilityState === "visible") {
      ensureOpenSession(userId).catch(() => {});
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
