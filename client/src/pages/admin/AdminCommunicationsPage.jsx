import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Modal, ConfirmDialog } from '../../components/common/Modal';
import { ArrowLeft, Send, MessageSquare, AlertCircle, Check, X, Megaphone, CheckCircle2, Mail } from 'lucide-react';
import { format } from 'date-fns';

export const AdminCommunicationsPage = () => {
  const [activeTab, setActiveTab] = useState('announcements');
  const [announcements, setAnnouncements] = useState([]);
  const [excuses, setExcuses] = useState([]);
  const [notificationLogs, setNotificationLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, confirmText: 'Confirm' });

  // Filters
  const [announceFilter, setAnnounceFilter] = useState('all'); // all, students, instructors
  const [excuseFilter, setExcuseFilter] = useState('pending'); // pending, approved, rejected

  // Forms
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [announceForm, setAnnounceForm] = useState({ title: '', content: '', target_role: 'all' });
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyForm, setNotifyForm] = useState({ student_id: '', subject: 'CCDI QRScan: Attendance Risk Alert', message: '', channel: 'email' });
  
  // Lookup data for notifications
  const [studentsList, setStudentsList] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [annRes, excRes, notifRes, stdRes] = await Promise.all([
        api.get('/admin/announcements'),
        api.get('/admin/absence-excuses'),
        api.get('/admin/notifications/logs'),
        api.get('/admin/users?role=student')
      ]);
      setAnnouncements(annRes.data.announcements || []);
      setExcuses(excRes.data.excuses || []);
      setNotificationLogs(notifRes.data.logs || []);
      setStudentsList(stdRes.data.users || []);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
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
      showToast('Broadcast sent successfully!');
    } catch (err) { showToast(err.response?.data?.error || 'Failed to broadcast announcement', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post('/admin/notifications/send-absence-alert', notifyForm);
      setShowNotifyModal(false);
      setNotifyForm({ student_id: '', subject: 'CCDI QRScan: Attendance Risk Alert', message: '', channel: 'email' });
      fetchData();
      showToast(res.data.message || 'Alert dispatched successfully!');
    } catch (err) { showToast(err.response?.data?.error || 'Failed to dispatch alert', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleExcuseAction = (id, status) => {
    setConfirmDialog({
      isOpen: true,
      title: `${status === 'approved' ? 'Approve' : 'Reject'} Excuse`,
      message: `Are you sure you want to ${status} this absence excuse?`,
      confirmText: status === 'approved' ? 'Approve' : 'Reject',
      confirmStyle: status === 'approved' ? 'primary' : 'danger',
      onConfirm: async () => {
        try {
          await api.patch(`/admin/absence-excuses/${id}`, { status });
          fetchData();
          showToast(`Excuse ${status} successfully.`);
        } catch (err) { showToast(err.response?.data?.error || `Failed to ${status} excuse`, 'error'); }
      }
    });
  };

  const filteredAnnouncements = announcements.filter(a => announceFilter === 'all' || a.target_audience === announceFilter);
  const filteredExcuses = excuses.filter(e => e.status === excuseFilter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-xl flex items-center gap-3 animate-fade-in ${
          toast.type === 'error' ? 'bg-rose-950/90 border-rose-600/50 text-rose-300' : 'bg-emerald-950/90 border-emerald-600/50 text-emerald-300'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-500" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      <ConfirmDialog 
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        confirmStyle={confirmDialog.confirmStyle}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-2xl font-extrabold text-white font-['Outfit']">Communications Hub</h1>
            <p className="text-xs text-slate-400">Manage announcements, notifications, and absence excuse approvals.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setActiveTab('announcements')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'announcements' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-slate-900 text-slate-400 border border-slate-700'}`}>Announcements</button>
          <button onClick={() => setActiveTab('notifications')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'notifications' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-slate-900 text-slate-400 border border-slate-700'}`}>Direct Alerts</button>
          <button onClick={() => setActiveTab('excuses')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'excuses' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-slate-900 text-slate-400 border border-slate-700'}`}>Absence Excuses</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-10">Loading communications data...</div>
      ) : activeTab === 'announcements' ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-800/80 gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><Megaphone className="w-5 h-5 text-blue-400"/> Broadcasts</h2>
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                {['all', 'students', 'instructors'].map(f => (
                  <button key={f} onClick={() => setAnnounceFilter(f)} className={`px-3 py-1 text-[10px] font-bold uppercase rounded ${announceFilter === f ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-300'}`}>{f}</button>
                ))}
              </div>
            </div>
            <button onClick={() => setShowAnnounceModal(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all">
              <Send className="w-4 h-4" /> Create Broadcast
            </button>
          </div>
          
          <div className="grid gap-4">
            {filteredAnnouncements.length === 0 ? (
              <div className="text-center py-10 text-slate-500">No broadcasts found for this filter.</div>
            ) : (
              filteredAnnouncements.map(ann => (
                <div key={ann.id} className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <h3 className="text-base font-bold text-slate-200">{ann.title}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300 uppercase">Target: {ann.target_audience}</span>
                  </div>
                  <p className="text-sm text-slate-400 whitespace-pre-wrap">{ann.content}</p>
                  <div className="text-[11px] text-slate-500 mt-2 font-mono flex items-center gap-2">
                    <span>{format(new Date(ann.created_at), 'PPP p')}</span>
                    <span>•</span>
                    <span>By {ann.author_name}</span>
                    <span className={`px-1.5 py-0.5 rounded ${ann.priority === 'urgent' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>{ann.priority} Priority</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : activeTab === 'notifications' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-800/80">
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><Mail className="w-5 h-5 text-indigo-400"/> Direct Notifications (Simulated Email/SMS)</h2>
            <button onClick={() => setShowNotifyModal(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all">
              <Send className="w-4 h-4" /> Dispatch Alert
            </button>
          </div>

          <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Recipient</th>
                  <th className="px-5 py-3">Channel</th>
                  <th className="px-5 py-3">Subject / Message</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {notificationLogs.length === 0 ? (
                  <tr><td colSpan="5" className="px-5 py-8 text-center text-slate-500">No notifications dispatched yet.</td></tr>
                ) : (
                  notificationLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-800/40">
                      <td className="px-5 py-3 font-mono text-[11px] text-slate-400">{format(new Date(log.sent_at), 'MMM dd HH:mm')}</td>
                      <td className="px-5 py-3">
                        <div className="font-semibold text-slate-200">{log.recipient_name}</div>
                        <div className="text-[10px] text-slate-500">{log.recipient_contact}</div>
                      </td>
                      <td className="px-5 py-3"><span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">{log.channel}</span></td>
                      <td className="px-5 py-3">
                        <div className="font-semibold text-slate-300">{log.subject}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[200px]">{log.message}</div>
                      </td>
                      <td className="px-5 py-3"><span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">SENT</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-800/80 gap-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><MessageSquare className="w-5 h-5 text-amber-400"/> Student Absence Excuses</h2>
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                {['pending', 'approved', 'rejected'].map(f => (
                  <button key={f} onClick={() => setExcuseFilter(f)} className={`px-3 py-1 text-[10px] font-bold uppercase rounded ${excuseFilter === f ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-300'}`}>{f}</button>
                ))}
            </div>
          </div>
          
          <div className="grid gap-4">
            {filteredExcuses.length === 0 ? (
               <div className="text-center py-10 text-slate-500">No {excuseFilter} excuses found.</div>
            ) : (
              filteredExcuses.map(excuse => (
                <div key={excuse.id} className={`glass-card p-5 rounded-2xl border ${excuse.status === 'pending' ? 'border-amber-500/30 bg-amber-500/5' : 'border-slate-800'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-slate-200">{excuse.student_name} <span className="text-slate-400 font-mono text-[11px]">({excuse.student_id_number})</span></h3>
                      <p className="text-xs text-slate-400 mt-1">Section: <span className="font-semibold text-slate-300">{excuse.section_name}</span> | Date missed: <span className="font-semibold text-slate-300">{format(new Date(excuse.missed_date), 'MMM dd, yyyy')}</span></p>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                      excuse.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      excuse.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {excuse.status}
                    </span>
                  </div>
                  
                  <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/80 mb-4">
                    <p className="text-sm text-slate-300 italic">"{excuse.reason}"</p>
                  </div>

                  {excuse.status === 'pending' && (
                    <div className="flex gap-2 justify-end pt-2 border-t border-slate-800/60">
                      <button onClick={() => handleExcuseAction(excuse.id, 'rejected')} className="px-4 py-2 rounded-xl text-xs font-bold text-rose-300 hover:bg-rose-950/50 hover:text-rose-200 transition-colors flex items-center gap-1.5 border border-transparent hover:border-rose-900/50">
                        <X className="w-4 h-4" /> Reject
                      </button>
                      <button onClick={() => handleExcuseAction(excuse.id, 'approved')} className="px-4 py-2 rounded-xl text-xs font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-500/20">
                        <Check className="w-4 h-4" /> Approve Excuse
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      <Modal isOpen={showAnnounceModal} onClose={() => setShowAnnounceModal(false)} title="Create New Broadcast" subtitle="Push a system-wide announcement to users.">
        <form onSubmit={handleCreateAnnouncement} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Target Audience</label>
            <select value={announceForm.target_role} onChange={e => setAnnounceForm({...announceForm, target_role: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500">
              <option value="all">Everyone (All Users)</option>
              <option value="students">Students Only</option>
              <option value="instructors">Instructors Only</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Title</label>
            <input type="text" required value={announceForm.title} onChange={e => setAnnounceForm({...announceForm, title: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500" placeholder="e.g. Campus Holiday Notice" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Message Content</label>
            <textarea required rows={4} value={announceForm.content} onChange={e => setAnnounceForm({...announceForm, content: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500" placeholder="Type your announcement here..."></textarea>
          </div>
          <div className="pt-2 flex gap-3">
            <button type="button" onClick={() => setShowAnnounceModal(false)} className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2">
              <Send className="w-4 h-4" /> {submitting ? 'Sending...' : 'Broadcast'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Direct Notification Modal */}
      <Modal isOpen={showNotifyModal} onClose={() => setShowNotifyModal(false)} title="Dispatch Direct Alert" subtitle="Send a simulated email or SMS notification to a specific student." maxWidth="max-w-lg">
        <form onSubmit={handleSendNotification} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Select Student</label>
            <select required value={notifyForm.student_id} onChange={e => setNotifyForm({...notifyForm, student_id: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500">
              <option value="">-- Choose a student --</option>
              {studentsList.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.id_number})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Notification Channel</label>
              <select value={notifyForm.channel} onChange={e => setNotifyForm({...notifyForm, channel: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500">
                <option value="email">Email</option>
                <option value="sms">SMS Text Message</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Subject</label>
              <input type="text" required value={notifyForm.subject} onChange={e => setNotifyForm({...notifyForm, subject: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Message Content</label>
            <textarea required rows={4} value={notifyForm.message} onChange={e => setNotifyForm({...notifyForm, message: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500" placeholder="e.g. You have missed 3 consecutive classes..."></textarea>
          </div>
          <div className="pt-2 flex gap-3">
            <button type="button" onClick={() => setShowNotifyModal(false)} className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2">
              <Mail className="w-4 h-4" /> {submitting ? 'Dispatching...' : 'Dispatch Alert'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
