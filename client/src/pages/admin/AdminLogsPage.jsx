import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { 
  ArrowLeft, Search, Download, ShieldAlert, Activity, MonitorSmartphone, 
  ChevronLeft, ChevronRight, Filter, AlertTriangle 
} from 'lucide-react';
import { format } from 'date-fns';

export const AdminLogsPage = () => {
  const [activeTab, setActiveTab] = useState('audit');
  const [auditLogs, setAuditLogs] = useState([]);
  const [scanLogs, setScanLogs] = useState([]);
  
  // Pagination & Filtering state
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 50;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const offset = (page - 1) * limit;
      
      if (activeTab === 'audit') {
        const res = await api.get('/admin/audit-logs', {
          params: { search, action: actionFilter, limit, offset }
        });
        setAuditLogs(res.data.logs || []);
        setTotalCount(res.data.totalCount || 0);
      } else {
        const res = await api.get('/admin/scan-logs', {
          params: { search, status: statusFilter, limit, offset }
        });
        // Note: scan-logs endpoint returns { logs } not { scans }
        setScanLogs(res.data.logs || []);
        setTotalCount(res.data.logs?.length >= limit ? page * limit + 1 : (page - 1) * limit + (res.data.logs?.length || 0)); // Fallback if backend doesn't send totalCount
      }
    } catch (err) {
      console.error('Failed to load logs', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, actionFilter, statusFilter, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, actionFilter, statusFilter, activeTab]);

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
    } catch (err) {
      alert(`Failed to export ${type} logs`);
    }
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-white font-['Outfit']">System Logs & Telemetry</h1>
            <p className="text-xs text-slate-400">Monitor administrative actions and raw QR scan events.</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('audit')} 
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'audit' 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20 border border-purple-500' 
                : 'bg-slate-900 text-slate-400 border border-slate-700 hover:bg-slate-800'
            }`}
          >
            Admin Audit Trail
          </button>
          <button 
            onClick={() => setActiveTab('scans')} 
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'scans' 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 border border-emerald-500' 
                : 'bg-slate-900 text-slate-400 border border-slate-700 hover:bg-slate-800'
            }`}
          >
            Scan Telemetry
          </button>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800/80">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={handleSearchChange}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:ring-2 focus:ring-purple-500 transition-all"
            />
          </div>
          
          {/* Dropdown Filters */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            {activeTab === 'audit' ? (
              <select 
                value={actionFilter} 
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full sm:w-auto bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Actions</option>
                <option value="CREATE_USER">Create User</option>
                <option value="UPDATE_USER">Update User</option>
                <option value="CREATE_SUBJECT">Create Subject</option>
                <option value="CREATE_SECTION">Create Section</option>
                <option value="ENROLL_STUDENT">Enroll Student</option>
                <option value="REASSIGN_INSTRUCTOR">Reassign Instructor</option>
                <option value="BROADCAST_ANNOUNCEMENT">Broadcast Announcement</option>
              </select>
            ) : (
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Statuses</option>
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
                <option value="excused">Excused</option>
              </select>
            )}
          </div>
        </div>

        <button 
          onClick={() => exportLogs(activeTab === 'audit' ? 'audit' : 'scan')} 
          className="w-full md:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 border border-slate-700 transition-colors"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              {activeTab === 'audit' ? (
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">Admin</th>
                  <th className="px-5 py-3.5">Action</th>
                  <th className="px-5 py-3.5">Target</th>
                  <th className="px-5 py-3.5">Details</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-5 py-3.5">Session</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Device/IP</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-5 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading logs...</span>
                    </div>
                  </td>
                </tr>
              ) : (activeTab === 'audit' ? auditLogs : scanLogs).length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertTriangle className="w-8 h-8 text-slate-600" />
                      <span className="text-sm font-semibold text-slate-400">No logs found</span>
                      <span className="text-xs">Try adjusting your search or filters to find what you're looking for.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                (activeTab === 'audit' ? auditLogs : scanLogs).map(log => (
                  <tr key={log.id || log.scanned_at} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3 font-mono text-[11px] text-slate-400">
                      {format(new Date(log.created_at || log.timestamp || log.scanned_at), 'MMM dd, yyyy HH:mm:ss')}
                    </td>
                    
                    {activeTab === 'audit' ? (
                      <>
                        <td className="px-5 py-3 font-medium text-purple-300">
                          {log.admin_name || 'System'}
                        </td>
                        <td className="px-5 py-3 font-mono text-[10px] uppercase">
                          <span className="px-2 py-1 bg-slate-900 rounded border border-slate-700">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-[11px]">
                          <div className="font-semibold text-slate-300">{log.target_type}</div>
                          <div className="text-slate-500 font-mono truncate max-w-[120px]">{log.target_id}</div>
                        </td>
                        <td className="px-5 py-3 text-slate-400 text-[11px] max-w-sm truncate" title={log.details}>
                          {log.details}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-5 py-3">
                          <div className="font-medium text-emerald-300">{log.student_name}</div>
                          <div className="text-slate-500 font-mono text-[10px]">{log.id_number}</div>
                        </td>
                        <td className="px-5 py-3 text-[11px]">
                          <div className="font-semibold text-slate-300">{log.subject_code}</div>
                          <div className="text-slate-500">{log.section_name}</div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            log.status === 'present' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 
                            log.status === 'late' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            log.status === 'excused' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                            'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-500 font-mono text-[10px]">
                          <div className="flex items-center gap-1.5 text-slate-400"><MonitorSmartphone className="w-3 h-3"/> {log.user_agent?.substring(0, 20)}...</div>
                          <div className="mt-0.5">{log.ip_address}</div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {(!loading && (activeTab === 'audit' ? auditLogs : scanLogs).length > 0) && (
          <div className="border-t border-slate-800 p-4 flex items-center justify-between bg-slate-900/40">
            <div className="text-[11px] text-slate-500 font-medium">
              Showing page <span className="text-white">{page}</span> {activeTab === 'audit' ? `of ${totalPages}` : ''}
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setPage(p => p + 1)}
                disabled={activeTab === 'audit' ? page >= totalPages : scanLogs.length < limit}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
