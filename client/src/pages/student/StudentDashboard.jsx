import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { StatusBadge, RiskBadge } from '../../components/common/Badge';
import { 
  Scan, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertTriangle,
  TrendingUp,
  MapPin,
  UserCheck
} from 'lucide-react';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await api.get('/analytics/student/history');
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load attendance history');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-28 bg-slate-800/60 rounded-2xl"></div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="h-24 bg-slate-800/60 rounded-xl"></div>
            <div className="h-24 bg-slate-800/60 rounded-xl"></div>
            <div className="h-24 bg-slate-800/60 rounded-xl"></div>
            <div className="h-24 bg-slate-800/60 rounded-xl"></div>
          </div>
          <div className="h-64 bg-slate-800/60 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  // Calculate cumulative stats across all sections
  let totalSessions = 0;
  let totalPresent = 0;
  let totalLate = 0;
  let totalAbsent = 0;
  let totalExcused = 0;

  if (data?.sections) {
    data.sections.forEach((sec) => {
      totalSessions += sec.totalSessions || 0;
      totalPresent += sec.present || 0;
      totalLate += sec.late || 0;
      totalAbsent += sec.absent || 0;
      totalExcused += sec.excused || 0;
    });
  }

  const overallRate = totalSessions > 0 
    ? Math.round(((totalPresent + totalLate + totalExcused) / totalSessions) * 100) 
    : 100;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Error alert if fetch failed */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Student Welcome Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950/40 to-slate-900">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Student Attendance Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Kumusta, {user?.name || 'Student'}! 👋
            </h1>
            <p className="text-sm text-slate-400 max-w-xl">
              Student ID: <span className="text-slate-200 font-mono font-semibold">{user?.id_number || 'N/A'}</span> • {user?.department || 'College of Information & Communications Technology'}
            </p>
          </div>

          {/* Quick Action Button */}
          <Link
            to="/student/scan"
            className="inline-flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-600/30 transform hover:-translate-y-0.5 transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Scan className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="text-xs text-blue-200 font-medium">Class In Session?</div>
              <div className="text-base font-extrabold">Open QR Scanner</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Overall Attendance Rate */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Rate</span>
            <TrendingUp className={`w-4 h-4 ${overallRate >= 75 ? 'text-emerald-400' : 'text-rose-400'}`} />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${overallRate >= 80 ? 'text-emerald-400' : overallRate >= 75 ? 'text-amber-400' : 'text-rose-400'}`}>
              {overallRate}%
            </span>
            <span className="text-xs text-slate-500">of sessions</span>
          </div>
          <div className="mt-2 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${overallRate >= 80 ? 'bg-emerald-500' : overallRate >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`}
              style={{ width: `${overallRate}%` }}
            />
          </div>
        </div>

        {/* Present */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">On-Time</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-emerald-400">{totalPresent}</span>
            <span className="text-xs text-slate-500 ml-1">times</span>
          </div>
        </div>

        {/* Late */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Late</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-amber-400">{totalLate}</span>
            <span className="text-xs text-slate-500 ml-1">times</span>
          </div>
        </div>

        {/* Absent */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Absent</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-rose-400">{totalAbsent}</span>
            <span className="text-xs text-slate-500 ml-1">times</span>
          </div>
        </div>

        {/* Total Sessions */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Held</span>
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-100">{totalSessions}</span>
            <span className="text-xs text-slate-500 ml-1">sessions</span>
          </div>
        </div>
      </div>

      {/* Warning Notice if at risk */}
      {overallRate < 75 && totalSessions > 0 && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-600/50 flex items-start gap-3.5 shadow-lg shadow-rose-950/30">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-rose-200">Attendance Passing Cutoff Warning</h4>
            <p className="text-xs text-rose-300/90 mt-0.5">
              Your overall attendance rate is currently {overallRate}%, which is below CCDI's institutional requirement of 75%. Please ensure you attend all upcoming sessions to avoid academic penalties or drop status.
            </p>
          </div>
        </div>
      )}

      {/* Enrolled Courses / Sections Breakdown */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-400" />
          <span>My Enrolled Subjects ({data?.sections?.length || 0})</span>
        </h2>

        {data?.sections && data.sections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.sections.map((sec) => (
              <div key={sec.id} className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {sec.name}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sec.ratePercent >= 80 ? 'bg-emerald-500/20 text-emerald-300' : sec.ratePercent >= 75 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'}`}>
                      {sec.ratePercent}% Rate
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-100 mt-2">
                    {sec.subject_code} — {sec.subject_title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Instructor: <span className="text-slate-300">{sec.instructor_name || 'N/A'}</span></p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-500" /> {sec.room}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-500" /> {sec.schedule}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-400">Breakdown:</span>
                    <span className="text-slate-300 font-medium">
                      <span className="text-emerald-400">{sec.present}P</span> • <span className="text-amber-400">{sec.late}L</span> • <span className="text-rose-400">{sec.absent}A</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                    {sec.totalSessions > 0 ? (
                      <>
                        <div style={{ width: `${(sec.present / sec.totalSessions) * 100}%` }} className="bg-emerald-500 h-full" title={`Present: ${sec.present}`} />
                        <div style={{ width: `${(sec.late / sec.totalSessions) * 100}%` }} className="bg-amber-500 h-full" title={`Late: ${sec.late}`} />
                        <div style={{ width: `${(sec.absent / sec.totalSessions) * 100}%` }} className="bg-rose-500 h-full" title={`Absent: ${sec.absent}`} />
                      </>
                    ) : (
                      <div className="w-full bg-slate-700 h-full" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center space-y-2">
            <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">No Subjects Enrolled Yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You haven't been added to any subject rosters yet. Contact your instructor or college registrar to enroll in your class sections.
            </p>
          </div>
        )}
      </div>

      {/* Recent Attendance Scans History */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-400" />
          <span>My Recent Attendance Activity</span>
        </h2>

        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Date & Time</th>
                  <th className="px-5 py-3.5">Subject & Section</th>
                  <th className="px-5 py-3.5">Room</th>
                  <th className="px-5 py-3.5">Attendance Status</th>
                  <th className="px-5 py-3.5">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data?.recentLogs?.length > 0 ? (
                  data.recentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-slate-200">
                        <div>{log.date}</div>
                        <div className="text-[11px] text-slate-500">{new Date(log.scanned_at).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-200">{log.subject_code} ({log.section_name})</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{log.subject_title}</div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">{log.room}</td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="px-5 py-3.5 capitalize text-slate-400 font-mono text-[11px]">
                        {log.method.replace('_', ' ')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                      No attendance scans recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
