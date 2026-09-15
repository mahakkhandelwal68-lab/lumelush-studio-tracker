"use client";

import { useState } from "react";
import { ChangePasswordModal } from "@/components/sdr/ChangePasswordModal";

const NOTIFICATION_DEFAULTS = [
  { key: "new_leads", label: "New leads assigned", hint: "When new leads are added to your list" },
  { key: "callbacks", label: "Callback reminders", hint: "Reminders for scheduled call backs" },
  { key: "meetings", label: "Meeting booked", hint: "When a meeting is confirmed" },
  { key: "team", label: "Team messages", hint: "Important messages from your team" },
];

/**
 * Toggles here are UI-only for now (local state, not persisted) — there's no
 * notification-preferences table yet. Kept simple until real notifications
 * (email/push) are wired up.
 */
export function NotificationsCard() {
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_DEFAULTS.map((n) => [n.key, true]))
  );

  return (
    <div className="space-y-3">
      {NOTIFICATION_DEFAULTS.map((n) => (
        <label key={n.key} className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={checked[n.key] ?? true}
            onChange={(e) => setChecked((c) => ({ ...c, [n.key]: e.target.checked }))}
            className="mt-0.5 size-4 accent-[var(--brand-blue)]"
          />
          <span>
            <span className="block text-sm text-ink">{n.label}</span>
            <span className="block text-xs text-ink-faint">{n.hint}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

export function ChangePasswordButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-left text-sm text-ink transition hover:bg-hover"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        Change Password
        <span className="text-ink-faint">›</span>
      </button>
      {open && <ChangePasswordModal onClose={() => setOpen(false)} />}
    </>
  );
}
