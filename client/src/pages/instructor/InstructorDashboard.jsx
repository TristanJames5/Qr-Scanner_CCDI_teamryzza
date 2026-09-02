import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { Modal } from '../../components/common/Modal';
import { 
  Play, 
  Tv, 
  Users, 
  Calendar, 
  MapPin, 
  Clock, 
  FileSpreadsheet, 
  AlertTriangle,
  ArrowRight,
  Sparkles,
  BookOpen
} from 'lucide-react';

export const InstructorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Start Session Modal state
  const [selectedSection, setSelectedSection] = useState(null);
  const [lateCutoff, setLateCutoff] = useState(15);
  const [startingSession, setStartingSession] = useState(false);

  const fetchSections = async () => {
    try {
      setLoading(true);
      const res = await api.get('/sections');
      setSections(res.data.sections || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load assigned sections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const handleStartSession = async (e) => {
    e.preventDefault();
    if (!selectedSection) return;

    try {
      setStartingSession(true);
      const res = await api.post('/sessions', {
        sectionId: selectedSection.id,
        lateCutoffMinutes: parseInt(lateCutoff) || 15
      });

      const sessionId = res.data.sessionId;
      setSelectedSection(null);
      // Navigate straight to the live projector screen
      navigate(`/instructor/session/${sessionId}`);
    } catch (err) {
      if (err.response?.data?.activeSessionId) {
        // Active session already running, navigate to it
        navigate(`/instructor/session/${err.response.data.activeSessionId}`);
      } else {
        alert(err.response?.data?.error || 'Failed to start session');
      }
    } finally {
      setStartingSession(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 animate-pulse">
        <div className="h-28 bg-slate-800/60 rounded-3xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-56 bg-slate-800/60 rounded-2xl"></div>
          <div className="h-56 bg-slate-800/60 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-blue-950/40 to-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Faculty Attendance Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Welcome, {user.name}
          </h1>
          <p className="text-sm text-slate-400">
            {user.department} • Manage class sessions, launch dynamic QR codes, and monitor live scans.
          </p>
        </div>

        {/* Risk Alerts shortcut */}
        <Link
          to="/instructor/patterns"
          className="inline-flex items-center gap-2.5 px-5 py-3.5 rounded-2xl text-xs font-bold text-amber-200 bg-amber-950/60 hover:bg-amber-900/70 border border-amber-600/50 shadow-lg shadow-amber-950/40 transition-all group"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          <span>View Risk & Pattern Alerts</span>
        </Link>
      </div>

      {/* Assigned Sections Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <span>My Assigned Sections ({sections.length})</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {sections.map((sec) => (
            <div 
              key={sec.id} 
              className={`glass-card p-6 rounded-2xl border transition-all flex flex-col justify-between space-y-6 ${
                sec.active_session_id 
                  ? 'border-blue-500/50 shadow-lg shadow-blue-500/10 bg-blue-950/20' 
                  : 'border-slate-800'
              }`}
            >
              <div>
                {/* Header with status badge */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {sec.name}
                    </span>
                    <h3 className="text-lg font-bold text-slate-100 mt-2">
                      {sec.subject_code} — {sec.subject_title}
                    </h3>
                  </div>

                  {sec.active_session_id ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      SESSION LIVE
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 font-medium">
                      {sec.closed_sessions_count} sessions held
                    </span>
                  )}
                </div>

                {/* Section details */}
                <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>{sec.room}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>{sec.enrolled_count} Enrolled Students</span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{sec.schedule} • {sec.academic_term}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-3">
                {sec.active_session_id ? (
                  <Link
                    to={`/instructor/session/${sec.active_session_id}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/30 transition-all"
                  >
                    <Tv className="w-4 h-4" />
                    <span>Open Live Projector Screen</span>
                  </Link>
                ) : (
                  <button
                    onClick={() => { setSelectedSection(sec); setLateCutoff(15); }}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-600/30 transition-all"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Start Class Session</span>
                  </button>
                )}

                <Link
                  to={`/instructor/section/${sec.id}`}
                  className="py-2.5 px-3.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-700 hover:text-white border border-slate-700/80 transition-colors flex items-center gap-1.5"
                >
                  <span>Roster & History</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Start Session Setup Modal */}
      <Modal
        isOpen={!!selectedSection}
        onClose={() => setSelectedSection(null)}
        title="Start New Class Session"
        subtitle={`Launch live rotating QR attendance for ${selectedSection?.name} (${selectedSection?.subject_code})`}
      >
        <form onSubmit={handleStartSession} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-400">
              <span>Course:</span>
              <span className="text-slate-200 font-semibold">{selectedSection?.subject_title}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Room:</span>
              <span className="text-slate-200">{selectedSection?.room}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Expected Roster:</span>
              <span className="text-slate-200">{selectedSection?.enrolled_count} Students</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Late Cutoff Threshold (Minutes)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="120"
                value={lateCutoff}
                onChange={(e) => setLateCutoff(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-blue-500"
                required
              />
              <span className="text-xs text-slate-400 font-medium">min</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Students scanning within {lateCutoff} minutes of start will be marked <span className="text-emerald-400 font-semibold">PRESENT</span>. Scans after will be marked <span className="text-amber-400 font-semibold">LATE</span>.
            </p>
          </div>

          <div className="pt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedSection(null)}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={startingSession}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30 flex items-center justify-center gap-1.5"
            >
              {startingSession ? 'Launching...' : 'Launch Projector QR'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
