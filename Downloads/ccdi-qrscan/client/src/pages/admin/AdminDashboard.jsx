import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { StatusBadge } from '../../components/common/Badge';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  TrendingUp, 
  ShieldCheck, 
  Tv, 
  PlusCircle, 
  UploadCloud, 
  ArrowRight,
  School
} from 'lucide-react';

export const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchGlobalStats = async () => {
      try {
        setLoading(true);
        const res = await api.get('/analytics/admin/global');
        setStats(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch global statistics');
      } finally {
        setLoading(false);
      }
    };
    fetchGlobalStats();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 animate-pulse">
        <div className="h-28 bg-slate-800/60 rounded-3xl"></div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="h-24 bg-slate-800/60 rounded-2xl"></div>
          <div className="h-24 bg-slate-800/60 rounded-2xl"></div>
          <div className="h-24 bg-slate-800/60 rounded-2xl"></div>
          <div className="h-24 bg-slate-800/60 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-600/40 bg-gradient-to-br from-slate-900 via-purple-950/20 to-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>Academic Administration Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            System Administration — {user.name}
          </h1>
          <p className="text-sm text-slate-400">
            Computer Communication Development Institute (CCDI) • Dean & Registrar Analytics
          </p>
        </div>

        {/* Quick Management Shortcuts */}
        <div className="flex items-center gap-3">
          <Link
            to="/admin/users"
            className="px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <Users className="w-4 h-4 text-purple-400" />
            <span>Manage Users</span>
          </Link>
          <Link
            to="/admin/sections"
            className="px-4 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all"
          >
            <BookOpen className="w-4 h-4" />
            <span>Sections & Rosters</span>
          </Link>
        </div>
      </div>

      {/* Global Institution KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase">Total Students</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{stats?.totalStudents || 0}</span>
            <span className="text-xs text-slate-500">enrolled</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase">Instructors</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{stats?.totalInstructors || 0}</span>
            <span className="text-xs text-slate-500">faculty</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase">Active Sections</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{stats?.totalSections || 0}</span>
            <span className="text-xs text-slate-500">classes</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase">Sessions Held</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{stats?.totalSessions || 0}</span>
            <span className="text-xs text-slate-500">sessions</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase">Overall Attendance</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400">{stats?.overallRate || 0}%</span>
            <span className="text-xs text-emerald-400/80">turnout</span>
          </div>
        </div>
      </div>

      {/* Recent Class Sessions Feed across the College */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            <span>Institution-Wide Recent Class Sessions</span>
          </h2>
        </div>

        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Date & Time</th>
                  <th className="px-5 py-3.5">Section & Course</th>
                  <th className="px-5 py-3.5">Instructor</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(stats?.recentSessions || []).map((sess) => (
                  <tr key={sess.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-200">
                      <div>{sess.date}</div>
                      <div className="text-[11px] text-slate-500">{sess.start_time}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-100">{sess.section_name} — {sess.subject_code}</div>
                      <div className="text-[11px] text-slate-400">{sess.subject_title}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">{sess.instructor_name || 'N/A'}</td>
                    <td className="px-5 py-3.5">
                      {sess.status === 'active' ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                          LIVE
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          CLOSED
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/instructor/session/${sess.id}`}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <span>Audit</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
