import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import { RiskBadge, StatusBadge } from '../../components/common/Badge';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Users, 
  Filter, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowLeft,
  Mail,
  UserX,
  FileSpreadsheet
} from 'lucide-react';

export const PatternAlertsPage = () => {
  const [searchParams] = useSearchParams();
  const initialSectionId = searchParams.get('sectionId') || '';

  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState(initialSectionId);
  const [windowSize, setWindowSize] = useState(5);
  const [threshold, setThreshold] = useState(3);
  
  const [patternData, setPatternData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch sections list
  useEffect(() => {
    const fetchSections = async () => {
      try {
        const res = await api.get('/sections');
        const list = res.data.sections || [];
        setSections(list);
        if (!selectedSectionId && list.length > 0) {
          setSelectedSectionId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load sections', err);
      }
    };
    fetchSections();
  }, []);

  // Fetch pattern data when section or params change
  useEffect(() => {
    if (!selectedSectionId) return;

    const fetchPatterns = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get(`/analytics/section/${selectedSectionId}/patterns`, {
          params: { windowSize, threshold }
        });
        setPatternData(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to calculate pattern alerts');
      } finally {
        setLoading(false);
      }
    };

    fetchPatterns();
  }, [selectedSectionId, windowSize, threshold]);

  const selectedSection = sections.find(s => s.id === selectedSectionId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-amber-600/40 bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-900 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/instructor"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Intelligent Pattern Detection Engine</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 font-['Outfit']">
                Absenteeism & Risk Pattern Alerts
              </h1>
              <p className="text-xs text-slate-400">
                Algorithmic detection of students who missed <span className="text-amber-300 font-bold">N out of their last M sessions</span> or are below institutional passing limits.
              </p>
            </div>
          </div>
        </div>

        {/* Section & Parameter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800/80">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Select Section</label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-amber-500"
            >
              {sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.name} — {sec.subject_code} ({sec.room})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Moving Session Window Size (M)
            </label>
            <select
              value={windowSize}
              onChange={(e) => setWindowSize(parseInt(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-amber-500"
            >
              <option value="3">Last 3 Class Sessions</option>
              <option value="5">Last 5 Class Sessions (Standard)</option>
              <option value="8">Last 8 Class Sessions (Midterm)</option>
              <option value="10">Last 10 Class Sessions</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Minimum Absences Threshold (N)
            </label>
            <select
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-amber-500"
            >
              <option value="2">2 Absences in Window</option>
              <option value="3">3 Absences in Window (Chronic)</option>
              <option value="4">4 Absences in Window (Severe Drop Risk)</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Sessions Evaluated</span>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-100">{patternData?.totalSessionsEvaluated || 0}</span>
            <span className="text-xs text-slate-500">recent</span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Enrolled</span>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-100">{patternData?.stats?.totalEnrolled || 0}</span>
            <span className="text-xs text-slate-500">students</span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-rose-900/40 bg-rose-950/10">
          <span className="text-[11px] font-semibold text-rose-400 uppercase">At-Risk Flagged</span>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-rose-400">{patternData?.alerts?.length || 0}</span>
            <span className="text-xs text-rose-400/80">students</span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-amber-900/40 bg-amber-950/10">
          <span className="text-[11px] font-semibold text-amber-400 uppercase">Critical Drop Risk</span>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-300">
              {patternData?.alerts?.filter(a => a.riskLevel === 'CRITICAL').length || 0}
            </span>
            <span className="text-xs text-amber-400/80">students</span>
          </div>
        </div>
      </div>

      {/* Flagged At-Risk Students Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <span>Pattern Analysis Results ({patternData?.alerts?.length || 0} Flagged)</span>
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">
            Analyzing attendance patterns...
          </div>
        ) : patternData?.alerts?.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {patternData.alerts.map((alert) => (
              <div
                key={alert.student.id}
                className={`glass-card p-6 rounded-2xl border transition-all space-y-4 ${
                  alert.riskLevel === 'CRITICAL'
                    ? 'border-rose-600/60 bg-rose-950/20 shadow-lg shadow-rose-950/20'
                    : alert.riskLevel === 'HIGH'
                      ? 'border-amber-600/50 bg-amber-950/15'
                      : 'border-yellow-600/40'
                }`}
              >
                {/* Header: Student Info + Risk Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={alert.student.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${alert.student.idNumber}`}
                      alt={alert.student.name}
                      className="w-11 h-11 rounded-xl border border-slate-700 bg-slate-800"
                    />
                    <div>
                      <h3 className="text-base font-bold text-slate-100">{alert.student.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-mono text-slate-300 font-semibold">{alert.student.idNumber}</span>
                        <span>•</span>
                        <span>{alert.student.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <RiskBadge riskLevel={alert.riskLevel} />
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                      Overall: {alert.overallStats.overallRatePercent}%
                    </span>
                  </div>
                </div>

                {/* Risk Diagnosis Reason */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>{alert.riskReason}</span>
                </div>

                {/* Session Timeline sequence in evaluation window */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Recent Evaluation Timeline (Last {alert.windowStats.evaluatedSessions} Sessions):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {alert.windowStats.history.map((sess, idx) => (
                      <div
                        key={sess.sessionId || idx}
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Session #{idx + 1}</span>
                          <span className="font-mono">{sess.date ? sess.date.slice(5) : ''}</span>
                        </div>
                        <StatusBadge status={sess.status} className="justify-center" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended Academic Action */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Action: Contact student for academic counseling & notification to department head.
                  </span>
                  <a
                    href={`mailto:${alert.student.email}?subject=Attendance Warning Notice - ${selectedSection?.subject_code}`}
                    className="inline-flex items-center gap-1.5 font-semibold text-blue-400 hover:text-blue-300"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Send Notice Email</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-200">No Chronic Absenteeism Patterns Detected</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              All enrolled students in this section are maintaining satisfactory attendance records above the selected {threshold}-absence threshold in the last {windowSize} sessions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
