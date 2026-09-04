import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Modal } from '../../components/common/Modal';
import { ArrowLeft, Send, MessageSquare, AlertCircle, Check, X, Megaphone } from 'lucide-react';
import { format } from 'date-fns';

export const AdminCommunicationsPage = () => {
  const [activeTab, setActiveTab] = useState('announcements');
  const [announcements, setAnnouncements] = useState([]);
  const [excuses, setExcuses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [announceForm, setAnnounceForm] = useState({ title: '', content: '', target_role: 'all' });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [annRes, excRes] = await Promise.all([
        api.get('/admin/announcements'),
        api.get('/admin/absence-excuses')
      ]);
      setAnnouncements(annRes.data.announcements || []);
      setExcuses(excRes.data.excuses || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/admin/announcements', announceForm);
      setShowAnnounceModal(false);
      setAnnounceForm({ title: '', content: '', target_role: 'all' });
      fetchData();
    } catch (err) { alert('Failed to broadcast announcement'); }
    finally { setSubmitting(false); }
  };

  const handleExcuseAction = async (id, status) => {
    try {
      await api.patch(`/admin/absence-excuses/${id}`, { status });
      fetchData();
    } catch (err) { alert(`Failed to ${status} excuse`); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-2xl font-extrabold text-white font-['Outfit']">Communications Hub</h1>
            <p className="text-xs text-slate-400">Manage announcements and absence excuse approvals.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('announcements')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'announcements' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-700'}`}>Announcements</button>
          <button onClick={() => setActiveTab('excuses')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'excuses' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-700'}`}>Absence Excuses</button>
        </div>
      </div>

      {activeTab === 'announcements' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-800/80">
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><Megaphone className="w-5 h-5 text-blue-400"/> Broadcast Announcement</h2>
            <button onClick={() => setShowAnnounceModal(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-blue-500/20">
              <Send className="w-4 h-4" /> Create Broadcast
            </button>
          </div>
          <div className="grid gap-4">
            {announcements.map(ann => (
              <div key={ann.id} className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <h3 className="text-base font-bold text-slate-200">{ann.title}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">Target: {ann.target_role}</span>
                </div>
                <p className="text-sm text-slate-400 whitespace-pre-wrap">{ann.content}</p>
                <div className="text-[11px] text-slate-500 mt-2 font-mono">{format(new Date(ann.created_at), 'PPP p')} • By {ann.author_name}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800/80">
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><MessageSquare className="w-5 h-5 text-amber-400"/> Student Absence Excuses</h2>
          </div>
          <div className="grid gap-4">
            {excuses.filter(e => e.status === 'pending').map(excuse => (
              <div key={excuse.id} className="glass-card p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-slate-200">{excuse.student_name} <span className="text-slate-400 font-mono text-[11px]">({excuse.student_id_number})</span></h3>
                    <p className="text-xs text-slate-400 mt-1">Section: <span className="font-semibold text-slate-300">{excuse.section_name}</span> | Date missed: <span className="font-semibold text-slate-300">{format(new Date(excuse.missed_date), 'MMM dd, yyyy')}</span></p>
                  </div>
                  <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider">Pending Review</span>
                </div>
                <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/50 mb-4">
                  <p className="text-sm text-slate-300 italic">"{excuse.reason}"</p>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => handleExcuseAction(excuse.id, 'rejected')} className="px-4 py-2 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"><X className="w-4 h-4"/> Reject</button>
                  <button onClick={() => handleExcuseAction(excuse.id, 'approved')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all"><Check className="w-4 h-4"/> Approve & Excuse Absence</button>
                </div>
              </div>
            ))}
            {excuses.filter(e => e.status !== 'pending').length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Recently Processed</h3>
                {excuses.filter(e => e.status !== 'pending').map(excuse => (
                  <div key={excuse.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 flex justify-between items-center mb-2">
                    <div>
                      <p className="text-xs font-medium text-slate-300">{excuse.student_name} <span className="text-slate-500">missed {format(new Date(excuse.missed_date), 'MMM dd, yyyy')}</span></p>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-md">Reason: {excuse.reason}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${excuse.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>{excuse.status.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Modal isOpen={showAnnounceModal} onClose={() => setShowAnnounceModal(false)} title="Broadcast Announcement">
        <form onSubmit={handleCreateAnnouncement} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Title</label>
            <input type="text" required value={announceForm.title} onChange={(e) => setAnnounceForm({ ...announceForm, title: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Target Audience</label>
            <select value={announceForm.target_role} onChange={(e) => setAnnounceForm({ ...announceForm, target_role: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="all">Everyone</option><option value="student">Students Only</option><option value="instructor">Instructors Only</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Message Content</label>
            <textarea rows={4} required value={announceForm.content} onChange={(e) => setAnnounceForm({ ...announceForm, content: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200" />
          </div>
          <div className="pt-2 flex gap-2">
            <button type="button" onClick={() => setShowAnnounceModal(false)} className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-400 bg-slate-800">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 flex justify-center items-center gap-2"><Send className="w-4 h-4"/> Broadcast</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
