import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import { StatusBadge, RiskBadge } from '../../components/common/Badge';
import { AttendanceTrendChart } from '../../components/charts/AttendanceTrendChart';
import { 
  ArrowLeft, 
  Users, 
  Calendar, 
  FileSpreadsheet, 
  MapPin, 
  Clock, 
  TrendingUp, 
  Eye, 
  BookOpen, 
  AlertTriangle 
} from 'lucide-react';

export const SectionDetailsPage = () => {
  const { id: sectionId } = useParams();
  const [sectionData, setSectionData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [activeTab, setActiveTab] = useState('roster'); // 'roster' | 'sessions' | 'trends'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const [secRes, analyticsRes] = await Promise.all([
        api.get(`/sections/${sectionId}`),
        api.get(`/analytics/section/${sectionId}`)
      ]);
      setSectionData(secRes.data);
      setAnalyticsData(analyticsRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch section details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [sectionId]);

  const downloadTermCSV = () => {
    window.open(`/api/sections/${sectionId}/export-csv`, '_blank');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 animate-pulse">
        <div className="h-32 bg-slate-800/60 rounded-3xl"></div>
        <div className="h-64 bg-slate-800/60 rounded-2xl"></div>
      </div>
    );
  }

  if (error || !sectionData) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Error</h2>
        <p className="text-xs text-slate-400">{error || 'Section not found'}</p>
        <Link to="/instructor" className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const { section, roster, sessions } = sectionData;
  const closedSessions = (sessions || []).filter(s => s.status === 'closed');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-blue-950/40 to-slate-900 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/instructor"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {section.name}
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                  {section.subject_code} — {section.subject_title}
                </h1>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Instructor: <span className="text-slate-200 font-semibold">{section.instructor_name || 'N/A'}</span> • {section.instructor_department}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5">
            <Link
              to={`/instructor/patterns?sectionId=${section.id}`}
              className="px-4 py-2.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/70 border border-amber-600/50 text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-950/30"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Pattern Alerts</span>
            </Link>

            <button
              onClick={downloadTermCSV}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Matrix CSV</span>
            </button>
          </div>
        </div>

        {/* Info badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs text-slate-300">
          <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-blue-400" /> Room: {section.room}</div>
          <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-blue-400" /> {section.schedule}</div>
          <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-blue-400" /> {roster.length} Enrolled</div>
          <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-blue-400" /> {closedSessions.length} Completed Sessions</div>
        </div>
      </div>

      {/* Analytics Trend Chart */}
      {analyticsData?.sessionTrends && analyticsData.sessionTrends.length > 0 && (
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span>Term Attendance Rate Trend</span>
            </h3>
            <span className="text-xs text-slate-400">Class average over time</span>
          </div>
          <AttendanceTrendChart data={analyticsData.sessionTrends} />
        </div>
      )}

      {/* Tabs: Enrolled Students Roster vs Past Sessions */}
      <div className="space-y-4">
        <div className="flex border-b border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab('roster')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'roster'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Class Roster ({analyticsData?.studentRoster?.length || roster.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'sessions'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Class Sessions ({sessions.length})</span>
          </button>
        </div>

        {/* Tab 1: Class Roster Table */}
        {activeTab === 'roster' && (
          <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Student</th>
                    <th className="px-5 py-3.5">Student ID</th>
                    <th className="px-5 py-3.5">Present</th>
                    <th className="px-5 py-3.5">Late</th>
                    <th className="px-5 py-3.5">Absent</th>
                    <th className="px-5 py-3.5">Attendance Rate</th>
                    <th className="px-5 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(analyticsData?.studentRoster || []).map((stu) => (
                    <tr key={stu.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-slate-200 flex items-center gap-2.5">
                        <img
                          src={stu.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${stu.id_number}`}
                          alt={stu.name}
                          className="w-7 h-7 rounded-lg border border-slate-700 bg-slate-800"
                        />
                        <div>
                          <div className="font-semibold text-slate-200">{stu.name}</div>
                          <div className="text-[11px] text-slate-400">{stu.email}</div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-400">{stu.id_number}</td>
                      <td className="px-5 py-3.5 text-emerald-400 font-bold">{stu.presentCount || 0}</td>
                      <td className="px-5 py-3.5 text-amber-400 font-bold">{stu.lateCount || 0}</td>
                      <td className="px-5 py-3.5 text-rose-400 font-bold">{stu.absentCount || 0}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${stu.ratePercent >= 80 ? 'text-emerald-400' : stu.ratePercent >= 75 ? 'text-amber-400' : 'text-rose-400'}`}>
                            {stu.ratePercent}%
                          </span>
                          <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${stu.ratePercent >= 80 ? 'bg-emerald-500' : stu.ratePercent >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${stu.ratePercent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {stu.absentCount >= 4 ? (
                          <RiskBadge riskLevel="CRITICAL" />
                        ) : stu.absentCount >= 3 ? (
                          <RiskBadge riskLevel="HIGH" />
                        ) : stu.ratePercent < 75 ? (
                          <RiskBadge riskLevel="WARNING" />
                        ) : (
                          <RiskBadge riskLevel="GOOD" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Class Sessions Table */}
        {activeTab === 'sessions' && (
          <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Start Time</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Present</th>
                    <th className="px-5 py-3.5">Late</th>
                    <th className="px-5 py-3.5">Absent</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(sessions || []).map((sess) => (
                    <tr key={sess.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-200">{sess.date}</td>
                      <td className="px-5 py-3.5 text-slate-400">{sess.start_time}</td>
                      <td className="px-5 py-3.5">
                        {sess.status === 'active' ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                            ACTIVE LIVE
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                            CLOSED
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-emerald-400 font-semibold">{sess.present_count || 0}</td>
                      <td className="px-5 py-3.5 text-amber-400 font-semibold">{sess.late_count || 0}</td>
                      <td className="px-5 py-3.5 text-rose-400 font-semibold">{sess.absent_count || 0}</td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <Link
                          to={`/instructor/session/${sess.id}`}
                          className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Session</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
