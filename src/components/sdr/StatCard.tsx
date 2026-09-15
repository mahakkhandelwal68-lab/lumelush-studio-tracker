export type StatTone = "blue" | "green" | "purple" | "red";

const TONE_STYLES: Record<StatTone, { bg: string; fg: string }> = {
  blue: { bg: "rgba(11, 123, 238, 0.12)", fg: "var(--brand-blue)" },
  green: { bg: "rgba(79, 192, 141, 0.14)", fg: "var(--brand-mint)" },
  purple: { bg: "rgba(139, 92, 246, 0.14)", fg: "#8b5cf6" },
  red: { bg: "rgba(229, 100, 106, 0.14)", fg: "var(--status-dead)" },
};

function Trend({ value }: { value: number }) {
  if (!Number.isFinite(value)) return null;
  const up = value >= 0;
  return (
    <span
      className="data-num text-xs font-semibold"
      style={{ color: up ? "var(--status-booked)" : "var(--status-dead)" }}
    >
      {up ? "↑" : "↓"} {Math.abs(value)}%
    </span>
  );
}

export function StatCard({
  icon,
  tone,
  value,
  label,
  hint,
  trend,
  trendLabel = "vs yesterday",
}: {
  icon: React.ReactNode;
  tone: StatTone;
  value: number | string;
  label: string;
  hint?: string;
  trend?: number;
  trendLabel?: string;
}) {
  const style = TONE_STYLES[tone];
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border p-4"
      style={{ borderColor: "var(--border-subtle)", background: style.bg }}
    >
      <div className="flex items-center gap-3">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full"
          style={{ background: style.bg, color: style.fg }}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="data-num text-2xl leading-none font-semibold text-ink">
            {value}
          </p>
        </div>
      </div>
      <div>
        <p className="data text-xs font-medium text-ink-dim">{label}</p>
        {hint && <p className="text-[11px] text-ink-faint">{hint}</p>}
        {trend !== undefined && (
          <p className="mt-1">
            <Trend value={trend} /> <span className="text-[11px] text-ink-faint">{trendLabel}</span>
          </p>
        )}
      </div>
    </div>
  );
}
