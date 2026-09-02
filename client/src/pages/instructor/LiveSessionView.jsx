import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import api from '../../api/axios';
import { StatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { 
  Tv, 
  RotateCw, 
  Users, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  FileSpreadsheet, 
  Lock, 
  ShieldAlert, 
  Search, 
  Edit3, 
  History, 
  Sparkles,
  ArrowLeft
} from 'lucide-react';

export const LiveSessionView = () => {
  const { id: sessionId } = useParams();
  const navigate = useNavigate();
  const { socket, joinSession, leaveSession } = useSocket();

  const [sessionData, setSessionData] = useState(null);
  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Countdown timer for 30s rotation
  const [timeLeft, setTimeLeft] = useState(30);
  const [isRotating, setIsRotating] = useState(false);

  // Audio chime & UI controls
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Manual Override Modal
  const [overrideStudent, setOverrideStudent] = useState(null);
  const [overrideStatus, setOverrideStatus] = useState('present');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);

  // Close Session Confirmation Modal
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingSession, setClosingSession] = useState(false);

  // Live incoming scan activity stream (latest 6 scans)
  const [recentScans, setRecentScans] = useState([]);

  // Fullscreen container ref
  const containerRef = useRef(null);

  // Fetch initial session state
  const fetchSession = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/sessions/${sessionId}`);
      setSessionData(res.data);

      if (res.data.session.status === 'active') {
        // Fetch or rotate initial token
        const tokenRes = await api.get(`/sessions/${sessionId}/rotate-token`);
        setTokenData(tokenRes.data);
        setTimeLeft(30);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load class session');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  // Join Socket.io session room & listen to real-time events
  useEffect(() => {
    if (!sessionId) return;
    joinSession(sessionId);

    if (socket) {
      // 1. QR Code rotated
      socket.on('qr_rotated', (newToken) => {
        setTokenData(newToken);
        setTimeLeft(30);
        setIsRotating(false);
      });

      // 2. Student scanned in real-time
      socket.on('student_scanned', (event) => {
        // Play scan chime
        if (soundEnabled) {
          playScanSound();
        }

        // Add to recent live scan feed
        setRecentScans((prev) => [event, ...prev.slice(0, 7)]);

        // Update roster status and stats
        setSessionData((prev) => {
          if (!prev) return prev;
          const updatedRoster = prev.roster.map((stu) => {
            if (stu.id === event.student.id) {
              return {
                ...stu,
                status: event.status,
                scanned_at: event.scannedAt,
                method: event.method
              };
            }
            return stu;
          });

          return {
            ...prev,
            roster: updatedRoster,
            stats: event.stats
          };
        });
      });

      // 3. Manual override updated
      socket.on('manual_override_updated', (event) => {
        setSessionData((prev) => {
          if (!prev) return prev;
          const updatedRoster = prev.roster.map((stu) => {
            if (stu.id === event.studentId) {
              return {
                ...stu,
                status: event.newStatus,
                method: 'manual_override'
              };
            }
            return stu;
          });

          return {
            ...prev,
            roster: updatedRoster,
            stats: event.stats,
            auditLogs: [
              {
                id: Math.random().toString(),
                student_name: event.studentName,
                new_status: event.newStatus,
                previous_status: event.previousStatus,
                reason: event.reason,
                changed_by_name: event.changedByName,
                timestamp: event.timestamp
              },
              ...(prev.auditLogs || [])
            ]
          };
        });
      });

      // 4. Session finalized and closed
      socket.on('session_closed', (event) => {
        setSessionData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            session: { ...prev.session, status: 'closed' },
            stats: event.stats
          };
        });
        setTokenData(null);
      });
    }

    return () => {
      leaveSession(sessionId);
      if (socket) {
        socket.off('qr_rotated');
        socket.off('student_scanned');
        socket.off('manual_override_updated');
        socket.off('session_closed');
      }
    };
  }, [sessionId, socket, joinSession, leaveSession, soundEnabled]);

  // 30-Second Rotation Interval Timer
  useEffect(() => {
    if (!sessionData || sessionData.session?.status !== 'active') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Trigger token rotation
          handleRotateToken();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionData, sessionId]);

  const handleRotateToken = async () => {
    try {
      setIsRotating(true);
      const res = await api.get(`/sessions/${sessionId}/rotate-token`);
      setTokenData(res.data);
      setTimeLeft(30);
    } catch (err) {
      console.error('Failed to rotate token', err);
    } finally {
      setIsRotating(false);
    }
  };

  const playScanSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch {
      // Ignore
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const handleManualOverrideSubmit = async (e) => {
    e.preventDefault();
    if (!overrideStudent || !overrideReason) {
      alert('Please provide a reason for the manual attendance override');
      return;
    }

    try {
      setOverrideSubmitting(true);
      await api.post(`/sessions/${sessionId}/manual-override`, {
        studentId: overrideStudent.id,
        newStatus: overrideStatus,
        reason: overrideReason
      });
      setOverrideStudent(null);
      setOverrideReason('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update student status');
    } finally {
      setOverrideSubmitting(false);
    }
  };

  const handleCloseSession = async () => {
    try {
      setClosingSession(true);
      await api.post(`/sessions/${sessionId}/close`);
      setShowCloseModal(false);
      fetchSession();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to close session');
    } finally {
      setClosingSession(false);
    }
  };

  const downloadSessionCSV = () => {
    window.open(`/api/sessions/${sessionId}/export-csv`, '_blank');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-400">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p>Loading active class session projector screen...</p>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Session Error</h2>
        <p className="text-xs text-slate-400">{error || 'Session not found'}</p>
        <Link to="/instructor" className="inline-block px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600">
          Back to Sections
        </Link>
      </div>
    );
  }

  const { session, roster, stats, auditLogs } = sessionData;
  const isActive = session.status === 'active';

  // Filter roster
  const filteredRoster = (roster || []).filter((stu) => {
    const matchesSearch = stu.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          stu.id_number.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    const currentStatus = (stu.status || (isActive ? 'pending' : 'absent')).toUpperCase();
    return currentStatus === statusFilter;
  });

  return (
    <div ref={containerRef} className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            to={`/instructor/section/${session.section_id}`}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {session.section_name}
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                {session.subject_code} — {session.subject_title}
              </h1>
              {isActive ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  LIVE SESSION
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                  SESSION CLOSED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Room: <span className="text-slate-200 font-semibold">{session.room}</span> • Started at: <span className="text-slate-200">{session.start_time}</span> • Late Cutoff: <span className="text-amber-300 font-semibold">{session.late_cutoff_minutes} min</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              soundEnabled ? 'bg-blue-950/60 border-blue-700/60 text-blue-300' : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="Toggle Scan Sound Chime"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Sound On' : 'Muted'}</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Toggle Fullscreen Projector Mode"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Projector View'}</span>
          </button>

          <button
            onClick={downloadSessionCSV}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          {isActive && (
            <button
              onClick={() => setShowCloseModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white text-xs font-bold shadow-lg shadow-rose-900/30 flex items-center gap-1.5"
            >
              <Lock className="w-4 h-4" />
              <span>Finalize & Close</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Projector QR Centerpiece + Live Activity HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Rotating Dynamic QR Code (Large Display for Projector) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 relative shadow-2xl">
          {isActive && tokenData ? (
            <div className="w-full flex flex-col items-center space-y-6 text-center">
              {/* Dynamic rotation timer badge */}
              <div className="flex items-center justify-between w-full max-w-xs">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <RotateCw className={`w-3.5 h-3.5 text-blue-400 ${isRotating ? 'animate-spin' : ''}`} />
                  <span>Version #{tokenData.version}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-amber-300">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Rotates in {timeLeft}s</span>
                </div>
              </div>

              {/* QR Code Container with 30s circular countdown effect */}
              <div className="relative p-4 rounded-3xl bg-white shadow-2xl qr-container transform hover:scale-[1.02] transition-transform">
                <img
                  src={tokenData.qrDataUrl}
                  alt="Dynamic Attendance QR Code"
                  className="w-64 h-64 sm:w-72 sm:h-72 object-contain"
                />
              </div>

              {/* Backup Code Display */}
              <div className="w-full max-w-xs p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-1">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                  Camera Damaged? Use Backup Code:
                </span>
                <div className="text-2xl sm:text-3xl font-mono font-black tracking-widest text-blue-400 bg-slate-950/80 py-1.5 rounded-xl border border-slate-800">
                  {tokenData.backupCode}
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
                <span>Protected against photo sharing • Auto-rotates every 30 seconds</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-800 mx-auto flex items-center justify-center">
                <Lock className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-300">Session Closed</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                This attendance session has been finalized. All un-scanned students were recorded as absent.
              </p>
              <button
                onClick={downloadSessionCSV}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 inline-flex items-center gap-1.5 shadow-lg shadow-emerald-600/30"
              >
                <FileSpreadsheet className="w-4 h-4" /> Download Official CSV Report
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Real-time Live Attendance Dashboard & Roster */}
        <div className="lg:col-span-7 space-y-6">
          {/* Live KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="glass-card p-4 rounded-2xl border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Present</span>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-2xl font-black text-emerald-400">{stats?.present || 0}</span>
                <span className="text-xs text-emerald-400/80 font-medium">On-Time</span>
              </div>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Late</span>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-2xl font-black text-amber-400">{stats?.late || 0}</span>
                <span className="text-xs text-amber-400/80 font-medium">After Cutoff</span>
              </div>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">
                {isActive ? 'Pending' : 'Absent'}
              </span>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className={`text-2xl font-black ${isActive ? 'text-slate-400' : 'text-rose-400'}`}>
                  {isActive ? stats?.pending || 0 : stats?.absent || 0}
                </span>
                <span className="text-xs text-slate-500">
                  / {stats?.totalEnrolled || 0}
                </span>
              </div>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Turnout</span>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className={`text-2xl font-black ${stats?.attendanceRate >= 75 ? 'text-blue-400' : 'text-rose-400'}`}>
                  {stats?.attendanceRate || 0}%
                </span>
                <span className="text-xs text-slate-500 font-medium">Rate</span>
              </div>
            </div>
          </div>

          {/* Live Recent Scans Stream (Pop-in cards as students scan) */}
          {recentScans.length > 0 && (
            <div className="glass-card p-4 rounded-2xl border border-blue-500/30 bg-blue-950/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                  Live Incoming Scans
                </span>
                <span className="text-[10px] text-blue-400/80 font-mono">Real-time WebSocket feed</span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {recentScans.map((scan, idx) => (
                  <div
                    key={scan.recordId || idx}
                    className="flex-shrink-0 flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs shadow-md animate-slide-in"
                  >
                    <img
                      src={scan.student.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${scan.student.idNumber}`}
                      alt={scan.student.name}
                      className="w-6 h-6 rounded-full border border-slate-600 bg-slate-800"
                    />
                    <div>
                      <div className="font-semibold text-slate-200 truncate max-w-[120px]">{scan.student.name}</div>
                      <div className="text-[10px] text-slate-400">{new Date(scan.scannedAt).toLocaleTimeString()}</div>
                    </div>
                    <StatusBadge status={scan.status} className="text-[10px] py-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter tabs */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs self-stretch sm:self-auto overflow-x-auto">
              {['ALL', 'PRESENT', 'LATE', isActive ? 'PENDING' : 'ABSENT', 'EXCUSED'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    statusFilter === filter ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Full Session Roster Table */}
          <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="sticky top-0 bg-slate-900 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 z-10">
                  <tr>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Student ID</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Scanned Time</th>
                    <th className="px-4 py-3 text-right">Manual Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredRoster.map((stu) => {
                    const currentStatus = stu.status || (isActive ? 'pending' : 'absent');
                    return (
                      <tr key={stu.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-200 flex items-center gap-2.5">
                          <img
                            src={stu.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${stu.id_number}`}
                            alt={stu.name}
                            className="w-7 h-7 rounded-lg border border-slate-700 bg-slate-800"
                          />
                          <div>
                            <div className="font-semibold">{stu.name}</div>
                            <div className="text-[11px] text-slate-500 truncate max-w-xs">{stu.email}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-400">{stu.id_number}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={currentStatus} />
                        </td>
                        <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                          {stu.scanned_at ? new Date(stu.scanned_at).toLocaleTimeString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              setOverrideStudent(stu);
                              setOverrideStatus(stu.status || 'present');
                              setOverrideReason('');
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] inline-flex items-center gap-1 font-semibold"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Override</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Override Modal with Mandatory Audit Trail */}
      <Modal
        isOpen={!!overrideStudent}
        onClose={() => setOverrideStudent(null)}
        title="Manual Attendance Override"
        subtitle={`Audit logged override for ${overrideStudent?.name} (${overrideStudent?.id_number})`}
      >
        <form onSubmit={handleManualOverrideSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Set Attendance Status</label>
            <select
              value={overrideStatus}
              onChange={(e) => setOverrideStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-blue-500"
            >
              <option value="present">Present (On-Time)</option>
              <option value="late">Late (Tardy)</option>
              <option value="excused">Excused (Medical/Official)</option>
              <option value="absent">Absent</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Override Justification Reason (Required for Audit Trail)
            </label>
            <textarea
              rows={3}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="e.g. Phone battery drained; camera lens broken; presented medical excuse slip..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setOverrideStudent(null)}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={overrideSubmitting}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30"
            >
              {overrideSubmitting ? 'Saving Override...' : 'Save & Log Override'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Close & Finalize Session Confirmation Modal */}
      <Modal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        title="Finalize & Close Class Session"
        subtitle="This action will permanently finalize the attendance sheet."
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-300 space-y-1.5">
            <p className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              Auto-Absent Finalization Notice
            </p>
            <p>
              Closing this session will automatically mark all remaining <span className="font-bold text-white">{stats?.pending || 0} unscanned students</span> as <span className="font-bold text-rose-400">ABSENT</span> and invalidate all active QR tokens.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowCloseModal(false)}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCloseSession}
              disabled={closingSession}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-900/40"
            >
              {closingSession ? 'Closing...' : 'Yes, Close Session'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
