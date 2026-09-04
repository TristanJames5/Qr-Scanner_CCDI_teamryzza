import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { RiskBadge, StatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
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
  School,
  AlertTriangle,
  Download,
  Printer,
  Sparkles,
  Layers,
  Send,
  CheckCircle2,
  FileSpreadsheet,
  BellRing,
  Activity,
  UserCheck,
  TrendingDown
} from 'lucide-react';

const STATUS_COLORS = {
  present: '#10b981',
  late: '#f59e0b',
  absent: '#f43f5e',
  excused: '#38bdf8'
};

export const AdminDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Quick Alert Modal State
  const [selectedStudentForAlert, setSelectedStudentForAlert] = useState(null);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertChannel, setAlertChannel] = useState('email');
  const [sendingAlert, setSendingAlert] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState('');

  const fetchAdvancedAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/analytics/advanced');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch advanced analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvancedAnalytics();
  }, []);

  const handleOpenAlertModal = (student) => {
    setSelectedStudentForAlert(student);
    setAlertMessage(`Dear ${student.name}, our CCDI attendance records show an attendance rate of ${student.attendance_rate}%, with ${student.absent_count} accumulated absences. Please report to the Academic Department immediately to prevent academic penalties.`);
    setAlertSuccess('');
  };

  const handleSendAlert = async (e) => {
    e.preventDefault();
    if (!selectedStudentForAlert) return;

    try {
      setSendingAlert(true);
      await api.post('/admin/notifications/send-absence-alert', {
        student_id: selectedStudentForAlert.id,
        subject: `CCDI QRScan: Urgent Attendance Risk Notice (${selectedStudentForAlert.id_number})`,
        message: alertMessage,
        channel: alertChannel
      });
      setAlertSuccess(`Attendance warning notification dispatched to ${selectedStudentForAlert.name}!`);
      setTimeout(() => {
        setSelectedStudentForAlert(null);
        setAlertSuccess('');
      }, 2000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send alert');
    } finally {
      setSendingAlert(false);
    }
  };

  const handleExportReportCSV = () => {
    window.open('/api/admin/analytics/export-report', '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 animate-pulse">
        <div className="h-28 bg-slate-800/60 rounded-3xl"></div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div className="h-24 bg-slate-800/60 rounded-2xl"></div>
          <div className="h-24 bg-slate-800/60 rounded-2xl"></div>
          <div className="h-24 bg-slate-800/60 rounded-2xl"></div>
          <div className="h-24 bg-slate-800/60 rounded-2xl"></div>
          <div className="h-24 bg-slate-800/60 rounded-2xl"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-72 bg-slate-800/60 rounded-3xl col-span-2"></div>
          <div className="h-72 bg-slate-800/60 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const breakdown = summary.breakdown || {};
  const pieData = [
    { name: 'On-Time', key: 'present', value: breakdown.present || 0, color: STATUS_COLORS.present },
    { name: 'Late', key: 'late', value: breakdown.late || 0, color: STATUS_COLORS.late },
    { name: 'Absent', key: 'absent', value: breakdown.absent || 0, color: STATUS_COLORS.absent },
    { name: 'Excused', key: 'excused', value: breakdown.excused || 0, color: STATUS_COLORS.excused }
  ].filter(d => d.value > 0);

  const totalScans = pieData.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-600/40 bg-gradient-to-br from-slate-900 via-purple-950/20 to-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>Academic Dean & Administration Analytics Suite</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit']">
            System Administration — {user?.name || 'Administrator'}
          </h1>
          <p className="text-sm text-slate-400">
            Computer Communication Development Institute (CCDI) • Real-time Attendance Telemetry & Institutional Control
          </p>
        </div>

        {/* Quick Management Shortcuts */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/admin/sections"
            className="px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all"
          >
            <BookOpen className="w-4 h-4" />
            <span>Manage Sections</span>
          </Link>
          <Link
            to="/admin/users"
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Users className="w-4 h-4 text-purple-400" />
            <span>Manage Users</span>
          </Link>
          <Link
            to="/admin/logs"
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Activity className="w-4 h-4 text-sky-400" />
            <span>Audit & Scan Logs</span>
          </Link>
          <Link
            to="/admin/communications"
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <BellRing className="w-4 h-4 text-amber-400" />
            <span>Communications</span>
          </Link>
          <button
            onClick={handleExportReportCSV}
            title="Export Institutional Attendance Report as CSV"
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
          </button>
          <button
            onClick={handlePrint}
            title="Print Executive Summary"
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Global Institution KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Students</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{summary.totalStudents || 0}</span>
            <span className="text-xs text-slate-500">enrolled</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Instructors</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{summary.totalInstructors || 0}</span>
            <span className="text-xs text-slate-500">faculty</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Class Sections</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{summary.totalSections || 0}</span>
            <span className="text-xs text-slate-500">classes</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sessions Held</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{summary.totalSessions || 0}</span>
            <span className="text-xs text-slate-500">{summary.activeSessions || 0} live now</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 col-span-2 sm:col-span-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Turnout</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${summary.overallRate >= 80 ? 'text-emerald-400' : summary.overallRate >= 75 ? 'text-amber-400' : 'text-rose-400'}`}>
              {summary.overallRate || 0}%
            </span>
            <span className="text-xs text-slate-500">attendance</span>
          </div>
          <div className="mt-2 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${summary.overallRate >= 80 ? 'bg-emerald-500' : summary.overallRate >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`}
              style={{ width: `${summary.overallRate || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Charts & Predictive Forecast Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend Line/Area Chart */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800 col-span-1 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <h2 className="text-base font-bold text-slate-100">School-Wide Attendance Trends</h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">Historical Session Turnout</span>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            {data?.attendanceTrends && data.attendanceTrends.length > 0 ? (
              <ResponsiveContainer>
                <AreaChart data={data.attendanceTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} unit="%" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(val) => [`${val}%`, 'Attendance Rate']}
                  />
                  <Area type="monotone" dataKey="rate" stroke="#a855f7" strokeWidth={2.5} fillOpacity={1} fill="url(#purpleGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                No session trend history recorded yet.
              </div>
            )}
          </div>

          {/* Predictive 3-Day Forecast Strip */}
          {data?.forecastTrend && data.forecastTrend.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-800/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-purple-300 font-bold">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Predictive Attendance Trajectory:</span>
              </div>
              <div className="flex items-center gap-4">
                {data.forecastTrend.map((fc, i) => (
                  <div key={i} className="flex items-center gap-1.5 font-medium text-slate-300">
                    <span className="text-slate-500">{fc.label}:</span>
                    <span className="font-bold text-purple-300">{fc.predictedRate}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Scan Status & Absence Distribution Donut Chart */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              <span>Status Breakdown</span>
            </h2>
            <span className="text-xs text-slate-400">{totalScans} scans</span>
          </div>

          <div style={{ width: '100%', height: 180 }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '11px' }}
                    formatter={(v) => [`${v} scans`, 'Total']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                No attendance scans recorded.
              </div>
            )}
          </div>

          {/* Breakdown stats list */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {pieData.map((d) => (
              <div key={d.key} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-slate-400">{d.name}</span>
                </div>
                <span className="font-bold text-slate-200">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top 5 Lowest Attendance Sessions & Global At-Risk Absentee Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Lowest Attendance Sessions */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-rose-400" />
              <span>Lowest Turnout Sessions (Anomalies)</span>
            </h2>
            <span className="text-xs text-rose-400/90 font-medium">Top 5 Lowest</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2.5">Date & Section</th>
                  <th className="px-3 py-2.5">Instructor</th>
                  <th className="px-3 py-2.5">Attendees</th>
                  <th className="px-3 py-2.5 text-right">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(data?.lowestSessions || []).length > 0 ? (
                  data.lowestSessions.map((ls) => (
                    <tr key={ls.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-slate-200">{ls.section_name} ({ls.subject_code})</div>
                        <div className="text-[11px] text-slate-500">{ls.date}</div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-400">{ls.instructor_name || 'N/A'}</td>
                      <td className="px-3 py-2.5 text-slate-300">{ls.attendees_count} / {ls.total_enrolled}</td>
                      <td className="px-3 py-2.5 text-right font-extrabold text-rose-400">
                        {ls.attendance_rate}%
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                      No closed session records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global At-Risk Students */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>School-Wide At-Risk Students</span>
            </h2>
            <span className="text-xs bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
              {data?.atRiskStudents?.length || 0} Flagged
            </span>
          </div>

          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="px-3 py-2.5">Student</th>
                  <th className="px-3 py-2.5">Absences</th>
                  <th className="px-3 py-2.5">Rate</th>
                  <th className="px-3 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(data?.atRiskStudents || []).length > 0 ? (
                  data.atRiskStudents.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-slate-200">{st.name}</div>
                        <div className="text-[11px] font-mono text-slate-400">{st.id_number}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-rose-400 font-bold">{st.absent_count}</span> absences
                      </td>
                      <td className="px-3 py-2.5">
                        <RiskBadge riskLevel={st.risk_level} />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          onClick={() => handleOpenAlertModal(st)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-300 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-600/50 inline-flex items-center gap-1 transition-all"
                        >
                          <Send className="w-3 h-3" />
                          <span>Alert</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                      No at-risk students detected. Good standing across the college!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section-by-Section Comparative Performance Benchmark */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              <span>Section Comparative Benchmark Matrix</span>
            </h2>
            <p className="text-xs text-slate-400">
              Cross-sectional comparison of attendance performance, room schedules, and enrolled counts.
            </p>
          </div>
          <Link
            to="/admin/sections"
            className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            <span>Manage All Sections</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Section & Subject</th>
                <th className="px-4 py-3">Instructor</th>
                <th className="px-4 py-3">Room & Schedule</th>
                <th className="px-4 py-3">Enrolled</th>
                <th className="px-4 py-3">Sessions</th>
                <th className="px-4 py-3">Turnout Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(data?.sectionComparisons || []).map((sec) => (
                <tr key={sec.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-200">
                    <div>{sec.name}</div>
                    <div className="text-[11px] text-slate-400 font-normal">{sec.subject_code} — {sec.subject_title}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{sec.instructor_name || 'Unassigned'}</td>
                  <td className="px-4 py-3 text-slate-400">{sec.room} • {sec.schedule}</td>
                  <td className="px-4 py-3 text-slate-200 font-medium">{sec.enrolled_count}</td>
                  <td className="px-4 py-3 text-slate-400">{sec.closed_sessions} closed</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${sec.rate}%` }}
                          className={`h-full ${sec.rate >= 80 ? 'bg-emerald-500' : sec.rate >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        />
                      </div>
                      <span className={`font-bold ${sec.rate >= 80 ? 'text-emerald-400' : sec.rate >= 75 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {sec.rate}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Instructor Performance & Engagement Matrix */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-400" />
              <span>Faculty & Instructor Engagement Metrics</span>
            </h2>
            <p className="text-xs text-slate-400">
              Overview of teaching load, conducted QR sessions, and on-time attendance discipline per faculty member.
            </p>
          </div>
          <Link
            to="/admin/users?role=instructor"
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            <span>Manage Faculty</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Faculty Member</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Assigned Classes</th>
                <th className="px-4 py-3">Sessions Conducted</th>
                <th className="px-4 py-3">Scans Processed</th>
                <th className="px-4 py-3">On-Time Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(data?.instructorMetrics || []).map((inst) => (
                <tr key={inst.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-200">{inst.name}</div>
                    <div className="text-[11px] font-mono text-slate-400">{inst.id_number}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{inst.department}</td>
                  <td className="px-4 py-3 text-slate-200 font-bold">{inst.sectionsCount} sections</td>
                  <td className="px-4 py-3 text-slate-300">{inst.sessionsConducted} sessions</td>
                  <td className="px-4 py-3 text-slate-400">{inst.totalScansRecorded}</td>
                  <td className="px-4 py-3 font-bold text-emerald-400">{inst.onTimeRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Alert Dispatcher Modal */}
      <Modal
        isOpen={!!selectedStudentForAlert}
        onClose={() => setSelectedStudentForAlert(null)}
        title="Send Attendance Risk Warning Notice"
        subtitle={`Dispatch urgent notification to ${selectedStudentForAlert?.name} (${selectedStudentForAlert?.id_number})`}
      >
        <form onSubmit={handleSendAlert} className="space-y-4">
          {alertSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{alertSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Recipient</label>
              <input
                type="text"
                disabled
                value={`${selectedStudentForAlert?.name} (${selectedStudentForAlert?.id_number})`}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Dispatch Channel</label>
              <select
                value={alertChannel}
                onChange={(e) => setAlertChannel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value="email">Institutional Email</option>
                <option value="sms">SMS Text Message</option>
                <option value="in_app">In-App Notice</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Notice Message</label>
            <textarea
              rows={4}
              value={alertMessage}
              onChange={(e) => setAlertMessage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedStudentForAlert(null)}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sendingAlert}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/30 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {sendingAlert ? 'Sending...' : 'Dispatch Alert'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
