import React, { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import { AlertTriangle, Bell, ChevronDown, ChevronUp, Mail, X, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const StudentAlertsWidget = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await api.get("/auth/my-alerts");
      setAlerts(res.data.alerts || []);
    } catch (err) {
      console.error("Failed to load alerts", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const markAsRead = async (alertId) => {
    try {
      await api.patch(`/auth/my-alerts/${alertId}/read`);
      setAlerts(prev =>
        prev.map(a => a.id === alertId ? { ...a, read_at: new Date().toISOString() } : a)
      );
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  const markAllRead = async () => {
    const unread = alerts.filter(a => !a.read_at);
    await Promise.all(unread.map(a => markAsRead(a.id)));
  };

  if (loading || alerts.length === 0 || dismissed) return null;

  const unreadCount = alerts.filter(a => !a.read_at).length;

  return (
    <div className={`rounded-2xl border shadow-lg overflow-hidden transition-all duration-300 ${
      unreadCount > 0
        ? "border-rose-500/40 shadow-rose-900/20 bg-gradient-to-br from-rose-950/50 via-slate-900/80 to-slate-900/90"
        : "border-slate-700/50 shadow-black/20 bg-slate-900/60"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
            unreadCount > 0 ? "bg-rose-500/20 border border-rose-500/40" : "bg-slate-800 border border-slate-700"
          }`}>
            {unreadCount > 0
              ? <AlertTriangle className="w-4 h-4 text-rose-400" />
              : <Bell className="w-4 h-4 text-slate-400" />
            }
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${unreadCount > 0 ? "text-rose-200" : "text-slate-300"}`}>
              Admin Alerts &amp; Warnings
            </span>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-[11px] font-semibold text-rose-300 hover:text-rose-100 px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-colors"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alert List */}
      {expanded && (
        <div className="border-t border-slate-800/60 divide-y divide-slate-800/40 max-h-72 overflow-y-auto">
          {alerts.map(alert => (
            <div
              key={alert.id}
              onClick={() => !alert.read_at && markAsRead(alert.id)}
              className={`flex gap-3 px-4 py-3.5 transition-colors cursor-pointer group ${
                !alert.read_at
                  ? "bg-rose-950/30 hover:bg-rose-950/50"
                  : "hover:bg-slate-800/30 opacity-70"
              }`}
            >
              <div className={`mt-0.5 w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center ${
                !alert.read_at ? "bg-rose-500/20" : "bg-slate-800"
              }`}>
                {!alert.read_at
                  ? <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  : <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                }
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-xs font-bold leading-snug ${!alert.read_at ? "text-rose-200" : "text-slate-400"}`}>
                    {alert.subject || "Attendance Warning"}
                  </p>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700 flex items-center gap-0.5">
                      <Mail className="w-2.5 h-2.5" />
                      {alert.channel}
                    </span>
                    {!alert.read_at && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0 animate-pulse" />
                    )}
                  </div>
                </div>
                <p className={`text-xs mt-1 leading-relaxed ${!alert.read_at ? "text-rose-100/80" : "text-slate-500"}`}>
                  {alert.message}
                </p>
                <p className="text-[10px] text-slate-600 mt-1.5 font-mono">
                  {formatDistanceToNow(new Date(alert.sent_at), { addSuffix: true })}
                  {alert.read_at && <span className="ml-2 text-emerald-700"> • Read</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
