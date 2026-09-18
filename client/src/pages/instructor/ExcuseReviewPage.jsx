import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { 
  FileText, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ExternalLink,
  Loader2,
  Inbox
} from 'lucide-react';

export const ExcuseReviewPage = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [actionLoading, setActionLoading] = useState(null); // id of request being processed

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/excuses?status=${filter}`);
      setRequests(res.data.requests || []);
    } catch (err) {
      console.error('Failed to load excuse requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const handleReview = async (id, decision) => {
    try {
      setActionLoading(id);
      await api.put(`/excuses/${id}/review`, { decision });
      // Remove the reviewed request from the list
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to process review.');
    } finally {
      setActionLoading(null);
    }
  };

  const statusColors = {
    pending: 'text-amber-300 bg-amber-500/20 border-amber-500/30',
    approved: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/30',
    rejected: 'text-rose-300 bg-rose-500/20 border-rose-500/30',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={user.role === 'admin' ? '/admin' : '/instructor'}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors p-2 rounded-xl bg-slate-900 border border-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <h1 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            Excuse Letter Review
          </h1>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['pending', 'approved', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
              filter === status
                ? statusColors[status]
                : 'text-slate-400 bg-slate-900 border-slate-800 hover:border-slate-700'
            }`}
          >
            {status === 'pending' && <Clock className="w-3.5 h-3.5 inline mr-1" />}
            {status === 'approved' && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />}
            {status === 'rejected' && <XCircle className="w-3.5 h-3.5 inline mr-1" />}
            {status}
          </button>
        ))}
      </div>

      {/* Request List */}
      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-slate-500 mx-auto" />
          <p className="text-sm text-slate-500 mt-2">Loading requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-2xl border border-slate-800">
          <Inbox className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm text-slate-500 mt-3">No {filter} excuse requests found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="glass-card rounded-2xl border border-slate-800 p-5 space-y-3">
              {/* Top row: Student info + subject */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    {req.student_name}
                    <span className="text-slate-500 font-normal ml-2 text-xs">({req.id_number})</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {req.subject_code} — {req.section_name} • Session: {req.session_date}
                  </p>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize ${statusColors[req.status]}`}>
                  {req.status}
                </span>
              </div>

              {/* Reason */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <p className="text-xs font-semibold text-slate-400 mb-1">Reason:</p>
                <p className="text-sm text-slate-200">{req.reason}</p>
              </div>

              {/* Attachment Link */}
              <a
                href={req.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Attached Document
              </a>

              {/* Action Buttons (only for pending) */}
              {req.status === 'pending' && (
                <div className="flex gap-3 pt-2 border-t border-slate-800">
                  <button
                    disabled={actionLoading === req.id}
                    onClick={() => handleReview(req.id, 'approved')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs font-bold transition-colors"
                  >
                    {actionLoading === req.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    Approve — Mark Excused
                  </button>
                  <button
                    disabled={actionLoading === req.id}
                    onClick={() => handleReview(req.id, 'rejected')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 text-white text-xs font-bold transition-colors"
                  >
                    {actionLoading === req.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    Reject
                  </button>
                </div>
              )}

              {/* Submitted timestamp */}
              <p className="text-[11px] text-slate-600">
                Submitted {new Date(req.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
