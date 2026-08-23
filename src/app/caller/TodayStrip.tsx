import type { ReactNode } from "react";

function Stat({
  label,
  value,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: number;
  tone?: "neutral" | "urgent" | "good";
  hint?: string;
}) {
  const valueTone =
    tone === "urgent" && value > 0
      ? "text-status-callback"
      : tone === "good" && value > 0
        ? "text-status-booked"
        : "text-ink";

  return (
    <div className="flex items-baseline gap-3 px-5 py-3.5 sm:flex-col sm:items-start sm:gap-0.5">
      <p className={`data-num text-2xl leading-none font-semibold ${valueTone}`}>
        {value}
      </p>
      <div className="min-w-0">
        <p className="data text-xs font-medium tracking-wide text-ink-dim uppercase">
          {label}
        </p>
        {hint && <p className="text-xs text-ink-faint">{hint}</p>}
      </div>
    </div>
  );
}

export function TodayStrip({
  callbacksDue,
  newLeads,
  callsToday,
  meetingsThisWeek,
}: {
  callbacksDue: number;
  newLeads: number;
  callsToday: number;
  meetingsThisWeek: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-edge bg-raised">
      <div className="accent-bar h-0.5 w-full opacity-70" />
      <div className="grid divide-y divide-edge sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <Stat
          label="Callbacks due"
          value={callbacksDue}
          tone="urgent"
          hint="today or overdue"
        />
        <Stat label="New leads" value={newLeads} hint="not yet called" />
        <Stat label="Calls made" value={callsToday} hint="today" />
        <Stat
          label="Meetings booked"
          value={meetingsThisWeek}
          tone="good"
          hint="last 7 days"
        />
      </div>
    </div>
  );
}

export function StripShell({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-edge">{children}</div>;
}
