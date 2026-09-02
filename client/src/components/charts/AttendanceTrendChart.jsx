import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export const AttendanceTrendChart = ({ data, height = 260 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        No historical sessions available to plot trends.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: d.date ? d.date.slice(5) : 'N/A',
    rate: d.attendanceRate || 0,
    present: d.present || 0,
    late: d.late || 0,
    absent: d.absent || 0
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel p-3 rounded-xl border border-slate-700 text-xs shadow-xl">
          <p className="font-bold text-slate-200 mb-1">Session: {label}</p>
          <div className="space-y-1">
            <p className="text-blue-400 font-semibold">Attendance Rate: {payload[0].value}%</p>
            <p className="text-emerald-400">Present: {payload[0].payload.present}</p>
            <p className="text-amber-400">Late: {payload[0].payload.late}</p>
            <p className="text-rose-400">Absent: {payload[0].payload.absent}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
          <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
          <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="rate"
            stroke="#3b82f6"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#rateGradient)"
            name="Attendance Rate (%)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
