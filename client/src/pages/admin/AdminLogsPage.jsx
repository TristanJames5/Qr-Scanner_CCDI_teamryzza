import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { ArrowLeft, Search, Download, Clock, ShieldAlert, Activity, MonitorSmartphone } from 'lucide-react';
import { format } from 'date-fns';

export const AdminLogsPage = () => {
  const [activeTab, setActiveTab] = useState('audit');
  const [auditLogs, setAuditLogs] = useState([]);
  const [scanLogs, setScanLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [auditRes, scanRes] = await Promise.all([
        api.get('/admin/audit-logs'),
        api.get('/admin/scan-logs')
      ]);
      setAuditLogs(auditRes.data.logs || []);
      setScanLogs(scanRes.data.scans || []);
    } catch (err) { console.error('Failed to load logs', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const exportLogs = async (type) => {
    try {
      const res = await api.get(`/admin/${type}-logs/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_logs_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) { alert(`Failed to export ${type} logs`); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-2xl font-extrabold text-white font-['Outfit']">System Logs & Telemetry</h1>
            <p className="text-xs text-slate-400">Monitor admin actions and raw QR scan events.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('audit')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'audit' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-700'}`}>Admin Audit Trail</button>
          <button onClick={() => setActiveTab('scans')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'scans' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-700'}`}>Scan Telemetry</button>
        </div>
      </div>

      <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-800/80">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          {activeTab === 'audit' ? <ShieldAlert className="w-5 h-5 text-amber-400"/> : <Activity className="w-5 h-5 text-emerald-400"/>}
          {activeTab === 'audit' ? 'Administrative Actions Log' : 'Live QR Scan Events'}
        </h2>
        <button onClick={() => exportLogs(activeTab === 'audit' ? 'audit' : 'scan')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-white flex items-center gap-2 border border-slate-700">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
            {activeTab === 'audit' ? (
              <tr><th className="px-5 py-3">Timestamp</th><th className="px-5 py-3">Admin</th><th className="px-5 py-3">Action</th><th className="px-5 py-3">Target</th><th className="px-5 py-3">Details</th></tr>
            ) : (
              <tr><th className="px-5 py-3">Timestamp</th><th className="px-5 py-3">Student</th><th className="px-5 py-3">Session</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Device/IP</th></tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? <tr><td colSpan="5" className="text-center py-6 text-slate-500">Loading logs...</td></tr> : 
              (activeTab === 'audit' ? auditLogs : scanLogs).map(log => (
                <tr key={log.id} className="hover:bg-slate-800/40">
                  <td className="px-5 py-3 font-mono text-[11px] text-slate-400">{format(new Date(log.created_at || log.scanned_at), 'MMM dd, yyyy HH:mm:ss')}</td>
                  {activeTab === 'audit' ? (
                    <>
                      <td className="px-5 py-3 font-medium text-purple-300">{log.admin_name}</td>
                      <td className="px-5 py-3 font-mono text-[11px] uppercase">{log.action_type}</td>
                      <td className="px-5 py-3">{log.target_resource}</td>
                      <td className="px-5 py-3 text-slate-400 truncate max-w-xs">{log.action_details}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-3 font-medium text-emerald-300">{log.student_name} <span className="text-slate-500 font-mono text-[10px]">({log.student_id_number})</span></td>
                      <td className="px-5 py-3">{log.section_name} - {log.session_title}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.status === 'present' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{log.status.toUpperCase()}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-500 flex items-center gap-1"><MonitorSmartphone className="w-3 h-3"/> {log.device_info}</td>
                    </>
                  )}
                </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
