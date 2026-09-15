"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS_COLOR = "#8a92a8";
const GRID_COLOR = "rgba(138, 146, 168, 0.25)";

const tooltipStyle = {
  background: "var(--surface-raised)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--text-primary)",
};

const legendStyle = { fontSize: 12, color: AXIS_COLOR, paddingBottom: 8 };

export function CallingActivityChart({
  data,
}: {
  data: { day: string; total: number; connected: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID_COLOR} />
        <XAxis dataKey="day" tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
        <Tooltip cursor={{ fill: GRID_COLOR }} contentStyle={tooltipStyle} />
        <Legend verticalAlign="top" align="right" wrapperStyle={legendStyle} />
        <Bar dataKey="total" name="Total calls" fill="#a9d1f5" radius={[4, 4, 0, 0]} />
        <Bar dataKey="connected" name="Connected calls" fill="#0b7bee" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PerformanceTrendChart({
  data,
}: {
  data: { day: string; calls: number; connected: number; meetings: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID_COLOR} />
        <XAxis dataKey="day" tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend verticalAlign="top" align="right" wrapperStyle={legendStyle} />
        <Line type="monotone" dataKey="calls" name="Calls Made" stroke="#0b7bee" strokeWidth={2} dot={{ r: 3, fill: "#0b7bee", strokeWidth: 0 }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="connected" name="Connected Calls" stroke="#3fbf8f" strokeWidth={2} dot={{ r: 3, fill: "#3fbf8f", strokeWidth: 0 }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="meetings" name="Meetings Booked" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, fill: "#8b5cf6", strokeWidth: 0 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

const FUNNEL_COLORS = ["#0b7bee", "#4aa3f0", "#3fbf8f", "#8b5cf6"];

export function ConversionFunnelChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const colored = data.map((d, i) => ({ ...d, fill: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <FunnelChart margin={{ top: 4, right: 24, left: 24, bottom: 4 }}>
        <Tooltip contentStyle={tooltipStyle} />
        <Funnel dataKey="value" data={colored} isAnimationActive={false}>
          <LabelList
            position="right"
            dataKey="name"
            fill="var(--text-secondary)"
            fontSize={12}
            offset={12}
          />
          <LabelList
            position="left"
            dataKey="value"
            fill="var(--text-primary)"
            fontSize={13}
            fontWeight={600}
            offset={12}
          />
          {colored.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  );
}
