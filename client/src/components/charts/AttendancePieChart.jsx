import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
      <div className="glass-panel p-3 rounded-xl border border-slate-700 text-xs shadow-xl">
        <p className="font-bold text-slate-200">{LABELS[name] || name}</p>
        <p style={{ color: COLORS[name] }} className="font-semibold">{value} records</p>
      </div>
    );
  }
  return null;
};

export const AttendancePieChart = ({ data, height = 260 }) => {
  const chartData = Object.entries(data || {})
    .map(([key, value]) => ({ name: key, value }))
    .filter(d => d.value > 0);

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        No attendance data available.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={COLORS[entry.name] || '#64748b'} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => (
              <span className="text-xs text-slate-300">{LABELS[value] || value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
