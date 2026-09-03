import React from 'react';

const STATUS_COLOR = {
  present: 'bg-emerald-500 text-white',
  late: 'bg-amber-500 text-white',
  absent: 'bg-rose-600 text-white',
  excused: 'bg-indigo-500 text-white',
  pending: 'bg-slate-700 text-slate-400',
};

const STATUS_SHORT = {
  present: 'P',
  late: 'L',
  absent: 'A',
  excused: 'E',
  pending: '–',
};

/**
 * SessionHeatmap renders a student × session grid.
 * Props:
 *  - students: [{ id, name, id_number }]
 *  - sessions: [{ id, date }]
 *  - records: Map<`${studentId}_${sessionId}`, status>
 */
export const SessionHeatmap = ({ students = [], sessions = [], records = new Map() }) => {
  if (!students.length || !sessions.length) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
        Not enough data for heatmap. Hold at least 1 closed session.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        {/* Session header row */}
        <div className="flex items-center gap-1 mb-2 ml-44">
          {sessions.map((sess, idx) => (
            <div
              key={sess.id}
              className="w-9 text-center text-[10px] text-slate-400 font-mono leading-tight"
              title={sess.date}
            >
              <div className="text-slate-500">#{idx + 1}</div>
              <div>{sess.date?.slice(5)}</div>
            </div>
          ))}
        </div>

        {/* Student rows */}
        <div className="space-y-1">
          {students.map((stu) => (
            <div key={stu.id} className="flex items-center gap-1">
              {/* Student label */}
              <div className="w-44 flex items-center gap-2 pr-2 flex-shrink-0">
                <img
                  src={stu.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${stu.id_number}`}
                  alt={stu.name}
                  className="w-6 h-6 rounded-md border border-slate-700 bg-slate-800 flex-shrink-0"
                />
                <div className="overflow-hidden">
                  <div className="text-xs font-medium text-slate-200 truncate">{stu.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{stu.id_number}</div>
                </div>
              </div>

              {/* Status cells */}
              {sessions.map((sess) => {
                const status = records.get(`${stu.id}_${sess.id}`) || 'absent';
                return (
                  <div
                    key={sess.id}
                    title={`${stu.name} — ${sess.date}: ${status.toUpperCase()}`}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-black transition-transform hover:scale-110 cursor-default ${STATUS_COLOR[status] || STATUS_COLOR.absent}`}
                  >
                    {STATUS_SHORT[status] || '?'}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 ml-44 text-[11px] text-slate-400 font-medium">
          {Object.entries(STATUS_SHORT).filter(([k]) => k !== 'pending').map(([status, short]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black ${STATUS_COLOR[status]}`}>
                {short}
              </div>
              <span className="capitalize">{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
