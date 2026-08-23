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
  meetingsToday,
  awaitingOutcome,
  onboarded,
  openSlots,
}: {
  meetingsToday: number;
  awaitingOutcome: number;
  onboarded: number;
  openSlots: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-edge bg-raised">
      <div className="accent-bar h-0.5 w-full opacity-70" />
      <div className="grid divide-y divide-edge sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <Stat label="Meetings today" value={meetingsToday} hint="scheduled" />
        <Stat
          label="Awaiting outcome"
          value={awaitingOutcome}
          tone="urgent"
          hint="already happened"
        />
        <Stat
          label="Clients onboarded"
          value={onboarded}
          tone="good"
          hint="all time"
        />
        <Stat label="Open slots" value={openSlots} hint="bookable" />
      </div>
    </div>
  );
}
