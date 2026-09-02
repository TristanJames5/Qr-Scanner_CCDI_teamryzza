import React from 'react';

export const StatusBadge = ({ status, className = '' }) => {
  const normalized = (status || '').toLowerCase();

  switch (normalized) {
    case 'present':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
          Present
        </span>
      );
    case 'late':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5"></span>
          Late
        </span>
      );
    case 'absent':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1.5"></span>
          Absent
        </span>
      );
    case 'excused':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mr-1.5"></span>
          Excused
        </span>
      );
    case 'pending':
    case 'unrecorded':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700/50 text-slate-400 border border-slate-600/30 ${className}`}>
          Pending
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-300 ${className}`}>
          {status}
        </span>
      );
  }
};

export const RiskBadge = ({ riskLevel, className = '' }) => {
  const level = (riskLevel || '').toUpperCase();

  switch (level) {
    case 'CRITICAL':
      return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-rose-950/80 text-rose-300 border border-rose-600/60 shadow-sm shadow-rose-900/50 ${className}`}>
          <span className="w-2 h-2 rounded-full bg-rose-500 mr-1.5 animate-ping"></span>
          CRITICAL RISK
        </span>
      );
    case 'HIGH':
      return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-600/60 ${className}`}>
          <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5"></span>
          HIGH RISK
        </span>
      );
    case 'WARNING':
      return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-yellow-950/60 text-yellow-300 border border-yellow-600/40 ${className}`}>
          WARNING
        </span>
      );
    case 'HABITUAL_LATE':
      return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-orange-950/60 text-orange-300 border border-orange-600/40 ${className}`}>
          HABITUAL LATE
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-950/50 text-emerald-300 border border-emerald-600/30 ${className}`}>
          GOOD STANDING
        </span>
      );
  }
};

export const RoleBadge = ({ role, className = '' }) => {
  const r = (role || '').toLowerCase();
  switch (r) {
    case 'admin':
      return <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 ${className}`}>Admin</span>;
    case 'instructor':
      return <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40 ${className}`}>Instructor</span>;
    case 'student':
      return <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 ${className}`}>Student</span>;
    default:
      return null;
  }
};
