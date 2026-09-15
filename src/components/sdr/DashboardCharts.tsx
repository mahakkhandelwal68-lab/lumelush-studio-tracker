"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Fixed, saturated brand colors rather than CSS variables — recharts draws
// plain SVG attributes, and a handful of solid colors already read fine on
// both the light and dark .sdr-app palettes without per-theme branching.
const AXIS_COLOR = "#8a92a8";
const GRID_COLOR = "rgba(138, 146, 168, 0.25)";

export function HourlyCallsChart({ data }: { data: { hour: string; calls: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID_COLOR} />
        <XAxis
          dataKey="hour"
          tick={{ fill: AXIS_COLOR, fontSize: 11 }}
          axisLine={{ stroke: GRID_COLOR }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: AXIS_COLOR, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip
          cursor={{ fill: GRID_COLOR }}
          contentStyle={{
            background: "var(--surface-raised)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--text-primary)",
          }}
        />
        <Bar dataKey="calls" name="Calls made" fill="#0b7bee" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const STATUS_COLORS: Record<string, string> = {
  New: "#4aa3f0",
  "Follow up": "#f0b429",
  "No answer": "#8b93ad",
  "Not interested": "#e5646a",
  "Meeting booked": "#3fbf8f",
  "No show": "#8b5cf6",
};

export function LeadStatusDonut({
  data,
  total,
}: {
  data: { name: string; value: number }[];
  total: number;
}) {
  const nonZero = data.filter((d) => d.value > 0);

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-[150px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={nonZero.length > 0 ? nonZero : [{ name: "None", value: 1 }]}
              dataKey="value"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={nonZero.length > 1 ? 2 : 0}
              stroke="none"
            >
              {(nonZero.length > 0 ? nonZero : [{ name: "None", value: 1 }]).map((entry) => (
                <Cell
                  key={entry.name}
                  fill={STATUS_COLORS[entry.name] ?? "var(--border-strong)"}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="data-num text-xl leading-none font-semibold text-ink">
              {total}
            </p>
            <p className="text-[10px] text-ink-faint">Total leads</p>
          </div>
        </div>
      </div>

      <ul className="min-w-0 space-y-1.5">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2 text-xs">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: STATUS_COLORS[d.name] ?? "var(--border-strong)" }}
            />
            <span className="text-ink-dim">{d.name}</span>
            <span className="data-num ml-auto font-medium text-ink">
              {d.value}
              {total > 0 && (
                <span className="text-ink-faint"> ({Math.round((d.value / total) * 100)}%)</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
