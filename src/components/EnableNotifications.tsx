"use client";

import { useEffect, useState } from "react";
import {
  removePushSubscription,
  savePushSubscription,
  sendTestNotification,
} from "@/app/admin/notifications/actions";

type Status = "loading" | "unsupported" | "off" | "on" | "denied";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function b64(buffer: ArrayBuffer | null) {
  if (!buffer) return "";
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function EnableNotifications({ publicKey }: { publicKey: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function check() {
      // On iPhone, PushManager only exists once the CRM is opened from its
      // Home Screen icon — in a regular Safari tab it's missing.
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const existing = await reg.pushManager.getSubscription();
      setStatus(existing && Notification.permission === "granted" ? "on" : "off");
    }
    check().catch(() => setStatus("unsupported"));
  }, []);

  // Labels the failing step so an error on a phone says where it broke.
  async function step<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      throw new Error(`${name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function subscribeWithKey(reg: ServiceWorkerRegistration, key: string) {
    try {
      return await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
    } catch (first) {
      // Some Safari versions only accept the key as a base64url string.
      try {
        return await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      } catch {
        throw first;
      }
    }
  }

  async function enable() {
    setBusy(true);
    setMessage(null);
    try {
      const permission = await step("permission", () => Notification.requestPermission());
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await step("worker", async () => {
        const r = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        return r;
      });
      const sub = await step(
        "subscribe",
        async () => (await reg.pushManager.getSubscription()) ?? (await subscribeWithKey(reg, publicKey.trim()))
      );
      await step("save", () =>
        savePushSubscription({
          endpoint: sub.endpoint,
          p256dh: b64(sub.getKey("p256dh")),
          auth: b64(sub.getKey("auth")),
        })
      );
      setStatus("on");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Couldn't turn on notifications");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMessage(null);
    try {
      const { delivered, error } = await sendTestNotification();
      setMessage(
        error
          ? `Send failed: ${error}`
          : delivered > 0
            ? "Test sent"
            : "Nothing delivered — try turning it off and on"
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Test failed");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") return null;

  const btn =
    "data rounded-lg border border-edge-strong bg-overlay px-3 py-1.5 text-xs text-ink-dim transition hover:bg-hover hover:text-ink disabled:opacity-50";

  return (
    <div className="flex items-center gap-2">
      {status === "unsupported" && (
        <span className="data hidden max-w-[16rem] text-right text-[11px] leading-tight text-ink-faint md:block">
          To get phone alerts, open the CRM from its Home Screen icon
        </span>
      )}
      {status === "denied" && (
        <span className="data hidden max-w-[16rem] text-right text-[11px] leading-tight text-ink-faint md:block">
          Notifications blocked. Allow them in iPhone Settings, then Notifications
        </span>
      )}
      {status === "off" && (
        <button onClick={enable} disabled={busy} className={btn}>
          Enable notifications
        </button>
      )}
      {status === "on" && (
        <>
          <span className="data text-[11px] text-status-booked">Notifications on</span>
          <button onClick={test} disabled={busy} className={btn}>
            Test
          </button>
          <button onClick={disable} disabled={busy} className={btn}>
            Turn off
          </button>
        </>
      )}
      {message && <span className="data text-[11px] text-ink-faint">{message}</span>}
    </div>
  );
}
