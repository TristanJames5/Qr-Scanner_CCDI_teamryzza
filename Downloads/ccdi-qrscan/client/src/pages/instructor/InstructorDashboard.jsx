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
      <div className="bg-slate-50 min-h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 animate-pulse">
        <div className="h-24 bg-slate-200 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 bg-slate-200 rounded-lg"></div>
          <div className="h-48 bg-slate-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen -mt-8 pt-8 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Section */}
        <div className="bg-white p-6 sm:p-8 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">
              <BookOpen className="w-4 h-4" />
              <span>Faculty Attendance Management</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Instructor Dashboard
            </h1>
            <p className="text-sm text-slate-500">
              {user.department} • Manage class sessions, launch dynamic QR codes, and monitor live scans.
            </p>
          </div>

          {/* Risk Alerts shortcut */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/instructor/patterns"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>View Risk & Pattern Alerts</span>
            </Link>
            <Link
              to="/instructor/excuses"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <span>Review Excuse Letters</span>
            </Link>
          </div>
        </div>

        {/* Assigned Sections Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <span>My Assigned Sections ({sections.length})</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sections.map((sec) => (
              <div 
                key={sec.id} 
                className={`bg-white p-6 rounded-lg border transition-colors flex flex-col justify-between space-y-6 shadow-sm ${
                  sec.active_session_id 
                    ? 'border-emerald-300' 
                    : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Header with status badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        {sec.name}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-2">
                        {sec.subject_code} — {sec.subject_title}
                      </h3>
                    </div>

                    {sec.active_session_id ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        SESSION LIVE
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 font-medium">
                        {sec.closed_sessions_count} sessions held
                      </span>
                    )}
                  </div>

                  {/* Section details */}
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{sec.room}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>{sec.enrolled_count} Enrolled Students</span>
                    </div>
                    <div className="flex items-center gap-2 col-span-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>{sec.schedule} • {sec.academic_term}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
                  {sec.active_session_id ? (
                    <Link
                      to={`/instructor/session/${sec.active_session_id}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                    >
                      <Tv className="w-4 h-4" />
                      <span>Open Live Projector Screen</span>
                    </Link>
                  ) : (
                    <button
                      onClick={() => { setSelectedSection(sec); setLateCutoff(15); }}
                      className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Start Class Session</span>
                    </button>
                  )}

                  <Link
                    to={`/instructor/section/${sec.id}`}
                    className="py-2 px-4 rounded-md text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <span>Roster & History</span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
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
          <form onSubmit={handleStartSession} className="space-y-5">
            <div className="p-4 rounded-md bg-slate-50 border border-slate-200 text-sm space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Course:</span>
                <span className="text-slate-900 font-semibold">{selectedSection?.subject_title}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Room:</span>
                <span className="text-slate-900">{selectedSection?.room}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Expected Roster:</span>
                <span className="text-slate-900">{selectedSection?.enrolled_count} Students</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Late Cutoff Threshold (Minutes)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={lateCutoff}
                  onChange={(e) => setLateCutoff(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
                <span className="text-sm text-slate-500 font-medium">min</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Students scanning within {lateCutoff} minutes of start will be marked <span className="text-emerald-600 font-semibold">PRESENT</span>. Scans after will be marked <span className="text-amber-600 font-semibold">LATE</span>.
              </p>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedSection(null)}
                className="flex-1 py-2 rounded-md text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={startingSession}
                className="flex-1 py-2 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {startingSession ? 'Launching...' : 'Launch Projector QR'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};
