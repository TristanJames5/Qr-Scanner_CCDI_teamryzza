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
  UserCheck,
  FileText,
  Upload,
  X,
  Loader2
} from 'lucide-react';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Excuse Letter State
  const [excuseModal, setExcuseModal] = useState(null); // { recordId, subject }
  const [excuseReason, setExcuseReason] = useState('');
  const [excuseFile, setExcuseFile] = useState(null);
  const [excuseSubmitting, setExcuseSubmitting] = useState(false);
  const [excuseError, setExcuseError] = useState('');
  const [excuseSuccess, setExcuseSuccess] = useState('');

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
      <div className="bg-slate-50 min-h-screen -mt-8 pt-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto animate-pulse space-y-6">
          <div className="h-28 bg-slate-200 rounded-lg"></div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="h-24 bg-slate-200 rounded-lg"></div>
            <div className="h-24 bg-slate-200 rounded-lg"></div>
            <div className="h-24 bg-slate-200 rounded-lg"></div>
            <div className="h-24 bg-slate-200 rounded-lg"></div>
          </div>
          <div className="h-64 bg-slate-200 rounded-lg"></div>
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
    <div className="bg-slate-50 text-slate-900 min-h-screen -mt-8 pt-8 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header Section */}
        <div className="bg-white p-6 sm:p-8 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">
              <UserCheck className="w-4 h-4" />
              <span>Student Attendance Portal</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Student Dashboard
            </h1>
            <p className="text-sm text-slate-500">
              ID: <span className="text-slate-700 font-mono font-medium">{user.id_number}</span> • {user.department}
            </p>
          </div>

          {/* Quick Action Button */}
          <Link
            to="/student/scan"
            className="inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-md font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Scan className="w-5 h-5" />
            <div className="text-left">
              <div className="text-xs text-blue-100 font-medium leading-none mb-0.5">Class In Session?</div>
              <div className="text-sm font-bold leading-none">Open QR Scanner</div>
            </div>
          </Link>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Overall Attendance Rate */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 col-span-2 sm:col-span-1 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall Rate</span>
              <TrendingUp className={`w-4 h-4 ${overallRate >= 75 ? 'text-emerald-500' : 'text-rose-500'}`} />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className={`text-3xl font-extrabold ${overallRate >= 80 ? 'text-emerald-600' : overallRate >= 75 ? 'text-amber-600' : 'text-rose-600'}`}>
                {overallRate}%
              </span>
            </div>
            <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${overallRate >= 80 ? 'bg-emerald-500' : overallRate >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`}
                style={{ width: `${overallRate}%` }}
              />
            </div>
          </div>

          {/* Present */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">On-Time</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-slate-900">{totalPresent}</span>
              <span className="text-xs text-slate-500 ml-1">sessions</span>
            </div>
          </div>

          {/* Late */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Late</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-slate-900">{totalLate}</span>
              <span className="text-xs text-slate-500 ml-1">sessions</span>
            </div>
          </div>

          {/* Absent */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Absent</span>
              <XCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-slate-900">{totalAbsent}</span>
              <span className="text-xs text-slate-500 ml-1">sessions</span>
            </div>
          </div>

          {/* Total Sessions */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Held</span>
              <Calendar className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-slate-900">{totalSessions}</span>
              <span className="text-xs text-slate-500 ml-1">sessions</span>
            </div>
          </div>
        </div>

        {/* Warning Notice if at risk */}
        {overallRate < 75 && (
          <div className="p-4 rounded-md bg-rose-50 border border-rose-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-rose-800">Attendance Passing Cutoff Warning</h4>
              <p className="text-xs text-rose-700 mt-0.5">
                Your overall attendance rate is currently {overallRate}%, which is below CCDI's institutional requirement of 75%. Please ensure you attend all upcoming sessions to avoid academic penalties or drop status.
              </p>
            </div>
          </div>
        )}

        {/* Enrolled Courses / Sections Breakdown */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <span>My Enrolled Subjects ({data?.sections?.length || 0})</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {data?.sections?.map((sec) => (
              <div key={sec.id} className="bg-white p-6 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors flex flex-col justify-between space-y-4 shadow-sm">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      {sec.name}
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${sec.ratePercent >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : sec.ratePercent >= 75 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                      {sec.ratePercent}% Rate
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    {sec.subject_code} — {sec.subject_title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Instructor: <span className="text-slate-700">{sec.instructor_name || 'N/A'}</span></p>
                  
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {sec.room}</span>
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {sec.schedule}</span>
                  </div>
                </div>

                <div className="pt-3">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500">Breakdown:</span>
                    <span className="text-slate-700 font-medium">
                      <span className="text-emerald-600">{sec.present}P</span> • <span className="text-amber-600">{sec.late}L</span> • <span className="text-rose-600">{sec.absent}A</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                    {sec.totalSessions > 0 ? (
                      <>
                        <div style={{ width: `${(sec.present / sec.totalSessions) * 100}%` }} className="bg-emerald-500 h-full" title={`Present: ${sec.present}`} />
                        <div style={{ width: `${(sec.late / sec.totalSessions) * 100}%` }} className="bg-amber-500 h-full" title={`Late: ${sec.late}`} />
                        <div style={{ width: `${(sec.absent / sec.totalSessions) * 100}%` }} className="bg-rose-500 h-full" title={`Absent: ${sec.absent}`} />
                      </>
                    ) : (
                      <div className="w-full bg-slate-200 h-full" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Attendance Scans History */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>My Recent Attendance Activity</span>
          </h2>

          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-xs font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Date & Time</th>
                    <th className="px-5 py-3.5">Subject & Section</th>
                    <th className="px-5 py-3.5">Room</th>
                    <th className="px-5 py-3.5">Attendance Status</th>
                    <th className="px-5 py-3.5">Method</th>
                    <th className="px-5 py-3.5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data?.recentLogs?.length > 0 ? (
                    data.recentLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-slate-900">
                          <div>{log.date}</div>
                          <div className="text-xs text-slate-500 font-normal">{new Date(log.scanned_at).toLocaleTimeString()}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-slate-900">{log.subject_code} ({log.section_name})</div>
                          <div className="text-xs text-slate-500 truncate max-w-xs">{log.subject_title}</div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">{log.room}</td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={log.status} />
                        </td>
                        <td className="px-5 py-3.5 capitalize text-slate-500 font-mono text-xs">
                          {log.method.replace('_', ' ')}
                        </td>
                        <td className="px-5 py-3.5">
                          {log.status === 'absent' && (
                            <button
                              onClick={() => {
                                setExcuseModal({ recordId: log.id, subject: `${log.subject_code} (${log.section_name}) — ${log.date}` });
                                setExcuseReason('');
                                setExcuseFile(null);
                                setExcuseError('');
                                setExcuseSuccess('');
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white text-slate-700 border border-slate-300 text-xs font-medium hover:bg-slate-50 transition-colors shadow-sm"
                            >
                              <FileText className="w-3.5 h-3.5 text-slate-400" />
                              Submit Excuse
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                        No attendance scans recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Excuse Letter Modal ─────────────────────────────────────────────── */}
        {excuseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
            <div className="bg-white rounded-lg border border-slate-200 p-6 w-full max-w-md space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Submit Excuse Letter
                </h3>
                <button onClick={() => setExcuseModal(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-slate-600">For: <span className="text-slate-900 font-medium">{excuseModal.subject}</span></p>

              {excuseSuccess ? (
                <div className="p-4 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm text-center">
                  <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-emerald-600" />
                  {excuseSuccess}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">Reason for Absence</label>
                    <textarea
                      value={excuseReason}
                      onChange={(e) => setExcuseReason(e.target.value)}
                      placeholder="e.g., Medical appointment, family emergency..."
                      className="w-full p-3 rounded-md bg-white border border-slate-300 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">Upload Supporting Document</label>
                    <label className="flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-md bg-slate-50 border-2 border-dashed border-slate-300 text-slate-500 text-sm cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                      <Upload className="w-5 h-5 text-slate-400" />
                      <span className="text-center">
                        {excuseFile ? (
                          <span className="text-slate-900 font-medium">{excuseFile.name}</span>
                        ) : (
                          "Click to upload (JPG, PNG, PDF — max 5MB)"
                        )}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && file.size > 5 * 1024 * 1024) {
                            setExcuseError('File must be smaller than 5MB.');
                            return;
                          }
                          setExcuseFile(file || null);
                          setExcuseError('');
                        }}
                      />
                    </label>
                  </div>

                  {excuseError && (
                    <p className="text-sm text-rose-600 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> {excuseError}
                    </p>
                  )}

                  <button
                    disabled={excuseSubmitting || !excuseReason.trim() || !excuseFile}
                    onClick={async () => {
                      try {
                        setExcuseSubmitting(true);
                        setExcuseError('');

                        // Step 1: Get Cloudinary upload signature from our backend
                        let sigData;
                        try {
                          const sigRes = await api.get('/excuses/signature');
                          sigData = sigRes.data;
                        } catch {
                          // Fallback
                          sigData = null;
                        }

                        let attachmentUrl = '';

                        if (sigData && sigData.cloudName) {
                          const formData = new FormData();
                          formData.append('file', excuseFile);
                          formData.append('api_key', sigData.apiKey);
                          formData.append('timestamp', sigData.timestamp);
                          formData.append('signature', sigData.signature);
                          formData.append('folder', sigData.folder);

                          const cloudRes = await fetch(
                            `https://api.cloudinary.com/v1_1/${sigData.cloudName}/auto/upload`,
                            { method: 'POST', body: formData }
                          );
                          const cloudData = await cloudRes.json();
                          if (!cloudRes.ok) throw new Error(cloudData.error?.message || 'Upload failed');
                          attachmentUrl = cloudData.secure_url;
                        } else {
                          attachmentUrl = `local://excuse_${Date.now()}_${excuseFile.name}`;
                        }

                        // Step 3: Submit
                        await api.post('/excuses', {
                          attendance_record_id: excuseModal.recordId,
                          reason: excuseReason.trim(),
                          attachment_url: attachmentUrl,
                        });

                        setExcuseSuccess('Excuse letter submitted! Your instructor will review it shortly.');
                      } catch (err) {
                        setExcuseError(err.response?.data?.error || err.message || 'Failed to submit excuse.');
                      } finally {
                        setExcuseSubmitting(false);
                      }
                    }}
                    className="w-full py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    {excuseSubmitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                    ) : (
                      <><FileText className="w-4 h-4" /> Submit Excuse Letter</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
