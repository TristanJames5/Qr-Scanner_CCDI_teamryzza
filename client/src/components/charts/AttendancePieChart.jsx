import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = {
  present: '#10b981',
  late: '#f59e0b',
  absent: '#f43f5e',
  excused: '#6366f1',
};

const LABELS = { present: 'Present', late: 'Late', absent: 'Absent', excused: 'Excused' };

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const { name, value } = payload[0];
    return (
      <div
        style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: '8px 12px', fontSize: 11 }}
      >
        <p style={{ color: '#e2e8f0', fontWeight: 700, marginBottom: 2 }}>{LABELS[name] || name}</p>
        <p style={{ color: COLORS[name], fontWeight: 600 }}>{value} records</p>
      </div>
    );
  }
  return null;
};

export const AttendancePieChart = ({ data, height = 240 }) => {
  const chartData = Object.entries(data || {})
    .map(([key, value]) => ({ name: key, value }))
    .filter(d => d.value > 0);

  const total = chartData.reduce((acc, d) => acc + d.value, 0);

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
        No attendance data available.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Donut */}
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={68}
              outerRadius={88}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={COLORS[entry.name] || '#64748b'} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Minimalist legend list */}
      <div className="w-full grid grid-cols-2 gap-x-6 gap-y-2.5 px-2">
        {chartData.map((entry) => {
          const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
          return (
            <div key={entry.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: COLORS[entry.name] || '#64748b' }}
                />
                <span className="text-xs text-slate-400 truncate">{LABELS[entry.name] || entry.name}</span>
              </div>
              <div className="flex items-baseline gap-1 flex-shrink-0">
                <span className="text-xs font-bold text-slate-200">{entry.value}</span>
                <span className="text-[10px] text-slate-500">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
