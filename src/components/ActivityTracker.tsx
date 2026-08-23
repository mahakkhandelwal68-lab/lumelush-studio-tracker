"use client";

import { useEffect, useRef } from "react";
import { logActivityPing } from "@/lib/activityActions";

const HEARTBEAT_INTERVAL_MS = 60_000;
const IDLE_TIMEOUT_MS = 5 * 60_000;
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

/**
 * Invisible activity heartbeat, mounted once per role dashboard layout.
 * Pings the server ~once a minute so admins can see daily active time —
 * but only while the tab is visible and the user has interacted within
 * the last 5 minutes. Leaving the tab open and idle stops counting.
 */
export function ActivityTracker() {
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    function markActive() {
      lastActivityRef.current = Date.now();
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, markActive, { passive: true });
    }

    logActivityPing();

    const interval = setInterval(() => {
      const idleFor = Date.now() - lastActivityRef.current;
      const visible = document.visibilityState === "visible";
      if (visible && idleFor < IDLE_TIMEOUT_MS) {
        logActivityPing();
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, markActive);
      }
      clearInterval(interval);
    };
  }, []);

  return null;
}
