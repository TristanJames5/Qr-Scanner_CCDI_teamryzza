import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { AttendanceTrendChart } from '../../components/charts/AttendanceTrendChart';
import { AttendancePieChart } from '../../components/charts/AttendancePieChart';
import { SessionHeatmap } from '../../components/charts/SessionHeatmap';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  LineChart, Line
} from 'recharts';
import {
  ArrowLeft, BarChart3, TrendingUp, Award, FileSpreadsheet,
  RefreshCw, Filter, Download, Users, Calendar, Target,
  CheckCircle2, AlertTriangle, ArrowUp, ArrowDown, Minus,
  Flame, Star, Activity, BookOpen, ChevronDown
} from 'lucide-react';

// ─── Shared helpers ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'insights',  label: 'Attendance Insights',       icon: BarChart3 },
  { id: 'recovery',  label: 'Engagement & Recovery',     icon: TrendingUp },
  { id: 'reports',   label: 'Summary Reports',           icon: FileSpreadsheet },
  { id: 'sessions',  label: 'Session Deep-Dive',         icon: Activity },
];

const STATUS_COLORS = {
  recovered: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40',
  improving:  'text-blue-400 bg-blue-500/15 border-blue-500/40',
  stable:     'text-slate-300 bg-slate-800/80 border-slate-700',
  'at-risk':  'text-rose-400 bg-rose-500/15 border-rose-500/40',
};

const StatusIcon = ({ status }) => {
  if (status === 'recovered') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
  if (status === 'improving')  return <ArrowUp className="w-3.5 h-3.5 text-blue-400" />;
  if (status === 'at-risk')    return <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
  return <Minus className="w-3.5 h-3.5 text-slate-400" />;
};

// ─── Main Page ───────────────────────────────────────────────────────────────
export const AttendanceInsightsPage = () => {
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [activeTab, setActiveTab] = useState('insights');

  // per-tab data
  const [insightsData, setInsightsData] = useState(null);
  const [recoveryData, setRecoveryData] = useState(null);
  const [reportsData, setReportsData] = useState([]);
  const [sessionAnalyticsData, setSessionAnalyticsData] = useState(null);

  // Reports filters
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(String(now.getMonth() + 1));
  const [filterYear, setFilterYear]   = useState(String(now.getFullYear()));
  const [filterSection, setFilterSection] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Load sections on mount
  useEffect(() => {
    api.get('/sections').then(res => {
      const list = res.data.sections || [];
      setSections(list);
      if (list.length > 0) setSelectedSectionId(list[0].id);
    }).catch(() => {});
  }, []);

  // Fetch insights + recovery whenever section changes
  useEffect(() => {
    if (!selectedSectionId) return;
    setLoading(true);
    setError('');
    Promise.all([
      api.get(`/analytics/section/${selectedSectionId}/insights`),
      api.get(`/analytics/section/${selectedSectionId}/recovery`),
      api.get(`/analytics/section/${selectedSectionId}`)
    ]).then(([insRes, recRes, secRes]) => {
      setInsightsData(insRes.data);
      setRecoveryData(recRes.data);
      setSessionAnalyticsData(secRes.data);
    }).catch(err => {
      setError(err.response?.data?.error || 'Failed to load analytics');
    }).finally(() => setLoading(false));
  }, [selectedSectionId]);

  // Fetch reports separately
  const fetchReports = useCallback(() => {
    setLoading(true);
    const params = {};
    if (filterSection) params.sectionId = filterSection;
    if (filterMonth)   params.month = filterMonth;
    if (filterYear)    params.year  = filterYear;
    api.get('/analytics/reports', { params })
      .then(res => setReportsData(res.data))
      .catch(() => setReportsData([]))
      .finally(() => setLoading(false));
  }, [filterSection, filterMonth, filterYear]);

  useEffect(() => {
    if (activeTab === 'reports') fetchReports();
  }, [activeTab, fetchReports]);

  const downloadReportCSV = () => {
    const params = new URLSearchParams();
    if (filterSection) params.set('sectionId', filterSection);
    if (filterMonth)   params.set('month', filterMonth);
    if (filterYear)    params.set('year', filterYear);
    window.open(`/api/analytics/reports/export-csv?${params.toString()}`, '_blank');
  };

  const downloadSectionCSV = (secId) => {
    const params = new URLSearchParams({ sectionId: secId });
    if (filterMonth) params.set('month', filterMonth);
    if (filterYear)  params.set('year', filterYear);
    window.open(`/api/analytics/reports/export-csv?${params.toString()}`, '_blank');
  };

  // Build heatmap data from sessionAnalyticsData
  const heatmapStudents = sessionAnalyticsData?.studentRoster || [];
  const heatmapSessions = (sessionAnalyticsData?.sessionTrends || []).filter(s => s.status === 'closed');

  // Build records map for heatmap from section analytics
  const [heatmapRecords, setHeatmapRecords] = useState(new Map());
  useEffect(() => {
    if (!selectedSectionId || !heatmapSessions.length || !heatmapStudents.length) return;
    // Build record map from individual session data
    const map = new Map();
    heatmapStudents.forEach(stu => {
      // We don't have per-cell data yet; rely on overall presence pattern
      // Use counts to derive approximate
    });
    setHeatmapRecords(map);
    // Re-fetch individual session attendance data for heatmap
    Promise.all(heatmapSessions.slice(0, 20).map(sess =>
      api.get(`/sessions/${sess.sessionId}`).then(r => r.data).catch(() => null)
    )).then(results => {
      const newMap = new Map();
      results.forEach(sessData => {
        if (!sessData) return;
        (sessData.roster || []).forEach(stu => {
          const status = stu.status || 'absent';
          newMap.set(`${stu.id}_${sessData.session.id}`, status);
        });
      });
      setHeatmapRecords(newMap);
    });
  }, [selectedSectionId, heatmapSessions.length, heatmapStudents.length]);

  const selectedSection = sections.find(s => s.id === selectedSectionId);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-blue-950/30 to-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/instructor" className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20 mb-1">
                <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                Advanced Analytics Dashboard
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit']">
                Attendance Analytics
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Insights • Recovery Tracker • Reports • Session Deep-Dive
              </p>
            </div>
          </div>

          {/* Section Selector */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <BookOpen className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedSectionId}
                onChange={e => setSelectedSectionId(e.target.value)}
                className="pl-9 pr-8 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                {sections.map(sec => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name} — {sec.subject_code}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* KPI Row — always visible */}
        {insightsData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
            <div className="glass-card p-4 rounded-2xl border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Avg Attendance</span>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className={`text-2xl font-black ${insightsData.avgRate >= 80 ? 'text-emerald-400' : insightsData.avgRate >= 75 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {insightsData.avgRate}%
                </span>
              </div>
            </div>
            <div className="glass-card p-4 rounded-2xl border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Sessions Held</span>
              <div className="mt-1.5"><span className="text-2xl font-black text-slate-100">{insightsData.totalSessions}</span></div>
            </div>
            <div className="glass-card p-4 rounded-2xl border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Enrolled</span>
              <div className="mt-1.5"><span className="text-2xl font-black text-slate-100">{insightsData.totalEnrolled}</span></div>
            </div>
            <div className="glass-card p-4 rounded-2xl border border-rose-900/40 bg-rose-950/10">
              <span className="text-[11px] font-semibold text-rose-400 uppercase">Total Absent Records</span>
              <div className="mt-1.5"><span className="text-2xl font-black text-rose-400">{insightsData.pieData?.absent || 0}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-800 gap-1 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 pb-3 px-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">{error}</div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── TAB 1: Insights ──────────────────────────────────────────────── */}
      {!loading && activeTab === 'insights' && insightsData && (
        <div className="space-y-6">
          {/* Weekly Trend Line Chart */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Weekly Attendance Rate Trend
              </h3>
              <span className="text-xs text-slate-400">Aggregated per calendar week</span>
            </div>
            {insightsData.weeklyTrend?.length > 1 ? (
              <div style={{ height: 220 }}>
                <ResponsiveContainer>
                  <LineChart data={insightsData.weeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <Tooltip
                      contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: 11 }}
                      labelStyle={{ color: '#e2e8f0', fontWeight: 700 }}
                      formatter={v => [`${v}%`, 'Avg Rate']}
                    />
                    <Line type="monotone" dataKey="avgRate" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} name="Avg Rate (%)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <AttendanceTrendChart data={insightsData.sessionTrends} height={220} />
            )}
          </div>

          {/* Pie + Top 5 side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-400" />
                Attendance Breakdown (All Sessions)
              </h3>
              <AttendancePieChart data={insightsData.pieData} height={240} />
            </div>

            {/* Top 5 Sessions */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                Top 5 Most-Attended Sessions
              </h3>
              {insightsData.top5Sessions?.length > 0 ? (
                <div className="space-y-2">
                  {insightsData.top5Sessions.map((sess, idx) => (
                    <div key={sess.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${
                        idx === 0 ? 'bg-amber-500/20 text-amber-300' :
                        idx === 1 ? 'bg-slate-600/50 text-slate-300' :
                        idx === 2 ? 'bg-orange-900/40 text-orange-400' : 'bg-slate-800 text-slate-400'
                      }`}>#{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-200">{sess.date}</div>
                        <div className="text-[11px] text-slate-500">
                          {sess.present}P / {sess.late}L / {sess.absent}A
                        </div>
                      </div>
                      <span className={`text-sm font-black ${sess.rate >= 90 ? 'text-emerald-400' : sess.rate >= 75 ? 'text-blue-400' : 'text-amber-400'}`}>
                        {sess.rate}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-4 text-center">No closed sessions yet.</p>
              )}
            </div>
          </div>

          {/* Session-by-Session bar chart */}
          {insightsData.sessionTrends?.length > 0 && (
            <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                Per-Session Attendance Breakdown
              </h3>
              <div style={{ height: 240 }}>
                <ResponsiveContainer>
                  <BarChart data={insightsData.sessionTrends.map((s, i) => ({ name: `S${i+1}`, ...s }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: 11 }}
                      labelStyle={{ color: '#e2e8f0', fontWeight: 700 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="present" fill="#10b981" name="Present" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="late" fill="#f59e0b" name="Late" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="absent" fill="#f43f5e" name="Absent" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Recovery Tracker ───────────────────────────────────────── */}
      {!loading && activeTab === 'recovery' && recoveryData && (
        <div className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {['recovered', 'improving', 'stable', 'at-risk'].map(status => {
              const count = (recoveryData.students || []).filter(s => s.status === status).length;
              const colors = {
                recovered: 'border-emerald-900/40 bg-emerald-950/10 text-emerald-400',
                improving:  'border-blue-900/40 bg-blue-950/10 text-blue-400',
                stable:     'border-slate-700 text-slate-300',
                'at-risk':  'border-rose-900/40 bg-rose-950/10 text-rose-400',
              };
              return (
                <div key={status} className={`glass-card p-4 rounded-2xl border ${colors[status]}`}>
                  <span className="text-[11px] font-semibold uppercase opacity-80 capitalize">{status}</span>
                  <div className="mt-1.5 text-2xl font-black">{count}</div>
                  <span className="text-[10px] opacity-60">students</span>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-slate-500">
            Comparing first {recoveryData.windowSize} sessions vs latest {recoveryData.windowSize} sessions.
            Recovery Score = 50 + (recent rate − early rate).
          </p>

          {/* Student cards */}
          {(recoveryData.students || []).length > 0 ? (
            <div className="space-y-3">
              {recoveryData.students.map(item => (
                <div
                  key={item.student.id}
                  className={`glass-card p-5 rounded-2xl border space-y-4 ${STATUS_COLORS[item.status] || STATUS_COLORS.stable}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.student.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.student.idNumber}`}
                        alt={item.student.name}
                        className="w-10 h-10 rounded-xl border border-slate-700 bg-slate-800"
                      />
                      <div>
                        <h3 className="text-sm font-bold text-slate-100">{item.student.name}</h3>
                        <div className="text-xs text-slate-400">{item.student.idNumber} • {item.student.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize ${STATUS_COLORS[item.status]}`}>
                        <StatusIcon status={item.status} />
                        {item.status}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">Overall: {item.overallRate}%</span>
                    </div>
                  </div>

                  {/* Progress bars */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    {[
                      { label: 'Early Rate', value: item.earlyRate, color: item.earlyRate >= 75 ? 'bg-emerald-500' : 'bg-rose-500' },
                      { label: 'Recent Rate', value: item.recentRate, color: item.recentRate >= 75 ? 'bg-emerald-500' : item.recentRate >= 60 ? 'bg-amber-500' : 'bg-rose-500' },
                      { label: 'Recovery Score', value: item.recoveryScore, color: item.recoveryScore >= 60 ? 'bg-blue-500' : 'bg-slate-600' },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>{label}</span>
                          <span className="font-bold text-slate-200">{value}</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <span>Consistency Index: <span className="text-slate-200 font-bold">{item.consistencyIndex}/100</span></span>
                    <span className={`font-bold ${item.recoveryDelta > 0 ? 'text-emerald-400' : item.recoveryDelta < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {item.recoveryDelta > 0 ? '+' : ''}{item.recoveryDelta}% change
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center">
              <p className="text-slate-400 text-sm">No recovery data available — need at least 1 closed session.</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Summary Reports ────────────────────────────────────────── */}
      {!loading && activeTab === 'reports' && (
        <div className="space-y-5">
          {/* Filter Controls */}
          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              Filter Reports
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Section</label>
                <select
                  value={filterSection}
                  onChange={e => setFilterSection(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Sections</option>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.name} — {s.subject_code}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Month</label>
                <select
                  value={filterMonth}
                  onChange={e => setFilterMonth(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Months</option>
                  {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                    <option key={i+1} value={i+1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Year</label>
                <select
                  value={filterYear}
                  onChange={e => setFilterYear(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-blue-500"
                >
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="flex flex-col justify-end gap-2">
                <button
                  onClick={fetchReports}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Apply
                </button>
                <button
                  onClick={downloadReportCSV}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download All CSV
                </button>
              </div>
            </div>
          </div>

          {/* Reports Table */}
          {reportsData.length > 0 ? (
            <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5">Section / Subject</th>
                      <th className="px-5 py-3.5">Instructor</th>
                      <th className="px-5 py-3.5">Sessions</th>
                      <th className="px-5 py-3.5">Enrolled</th>
                      <th className="px-5 py-3.5">Avg Rate</th>
                      <th className="px-5 py-3.5">Present</th>
                      <th className="px-5 py-3.5">Late</th>
                      <th className="px-5 py-3.5">Absent</th>
                      <th className="px-5 py-3.5 text-right">Export</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {reportsData.map(r => (
                      <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-200">{r.name}</div>
                          <div className="text-[11px] text-slate-500">{r.subject_code} — {r.subject_title}</div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-400">{r.instructor_name || 'N/A'}</td>
                        <td className="px-5 py-3.5 font-bold text-slate-200">{r.sessions}</td>
                        <td className="px-5 py-3.5 text-slate-200">{r.totalEnrolled}</td>
                        <td className="px-5 py-3.5">
                          <span className={`font-black ${r.avgRate >= 80 ? 'text-emerald-400' : r.avgRate >= 75 ? 'text-amber-400' : 'text-rose-400'}`}>
                            {r.avgRate}%
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-emerald-400 font-bold">{r.totalPresent}</td>
                        <td className="px-5 py-3.5 text-amber-400 font-bold">{r.totalLate}</td>
                        <td className="px-5 py-3.5 text-rose-400 font-bold">{r.totalAbsent}</td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => downloadSectionCSV(r.id)}
                            className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30"
                            title="Download section CSV"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center">
              <FileSpreadsheet className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No records found for the selected filters.</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: Session Deep-Dive ──────────────────────────────────────── */}
      {!loading && activeTab === 'sessions' && sessionAnalyticsData && (
        <div className="space-y-6">
          {/* Punctuality Metrics bar chart */}
          {sessionAnalyticsData.sessionTrends?.filter(s => s.status === 'closed').length > 0 && (
            <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                Session Comparison — Present vs Late vs Absent
              </h3>
              <div style={{ height: 260 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={sessionAnalyticsData.sessionTrends.filter(s => s.status === 'closed').map((s, i) => ({
                      name: `S${i+1} (${s.date?.slice(5)})`,
                      present: s.present,
                      late: s.late,
                      absent: s.absent,
                      rate: s.attendanceRate
                    }))}
                    margin={{ top: 10, right: 10, left: -20, bottom: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} angle={-35} textAnchor="end" />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: 11 }}
                      labelStyle={{ color: '#e2e8f0', fontWeight: 700 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Bar dataKey="present" fill="#10b981" name="Present" stackId="a" radius={[0,0,0,0]} />
                    <Bar dataKey="late" fill="#f59e0b" name="Late" stackId="a" />
                    <Bar dataKey="absent" fill="#f43f5e" name="Absent" stackId="a" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Attendance Rate Line per session */}
          {sessionAnalyticsData.sessionTrends?.length > 0 && (
            <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Attendance Rate per Session
              </h3>
              <AttendanceTrendChart data={sessionAnalyticsData.sessionTrends} height={220} />
            </div>
          )}

          {/* Student × Session Heatmap */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                Student × Session Attendance Heatmap
              </h3>
              <span className="text-xs text-slate-500">Showing up to 20 sessions</span>
            </div>
            <SessionHeatmap
              students={heatmapStudents.map(s => ({ ...s, id_number: s.id_number }))}
              sessions={heatmapSessions.map(s => ({ id: s.sessionId, date: s.date }))}
              records={heatmapRecords}
            />
          </div>

          {/* Sessions list with stats */}
          <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                Session-by-Session Breakdown
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3">#</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Present</th>
                    <th className="px-5 py-3">Late</th>
                    <th className="px-5 py-3">Absent</th>
                    <th className="px-5 py-3">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(sessionAnalyticsData.sessionTrends || []).map((sess, idx) => (
                    <tr key={sess.sessionId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="px-5 py-3 font-bold text-slate-200">{sess.date}</td>
                      <td className="px-5 py-3">
                        {sess.status === 'active' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">LIVE</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">CLOSED</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-emerald-400 font-bold">{sess.present}</td>
                      <td className="px-5 py-3 text-amber-400 font-bold">{sess.late}</td>
                      <td className="px-5 py-3 text-rose-400 font-bold">{sess.absent}</td>
                      <td className="px-5 py-3">
                        <span className={`font-black ${sess.attendanceRate >= 80 ? 'text-emerald-400' : sess.attendanceRate >= 75 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {sess.attendanceRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
