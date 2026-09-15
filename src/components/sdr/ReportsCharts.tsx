"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
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
        <Legend wrapperStyle={{ fontSize: 12, color: AXIS_COLOR }} />
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
        <Legend wrapperStyle={{ fontSize: 12, color: AXIS_COLOR }} />
        <Line type="monotone" dataKey="calls" name="Calls Made" stroke="#0b7bee" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="connected" name="Connected Calls" stroke="#3fbf8f" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="meetings" name="Meetings Booked" stroke="#8b5cf6" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
