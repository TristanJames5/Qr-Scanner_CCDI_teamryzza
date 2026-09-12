import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Megaphone, X } from 'lucide-react';
import { format } from 'date-fns';

export const AnnouncementsWidget = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await api.get('/auth/announcements');
        setAnnouncements(res.data.announcements || []);
      } catch (err) {
        console.error('Failed to load announcements', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncements();
  }, []);

  if (loading || announcements.length === 0 || !visible) return null;

  return (
    <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/30 rounded-2xl p-4 sm:p-5 relative shadow-lg shadow-blue-900/20 mb-6">
      <button 
        onClick={() => setVisible(false)} 
        className="absolute top-3 right-3 p-1.5 rounded-lg text-blue-300 hover:text-white hover:bg-blue-500/20 transition-colors"
        title="Dismiss Announcements"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0 border border-blue-500/30">
          <Megaphone className="w-5 h-5 text-blue-400" />
        </div>
        
        <div className="flex-1 min-w-0 pr-6">
          <h3 className="text-sm font-bold text-blue-100 flex items-center gap-2">
            Campus Announcements
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase tracking-wider">
              {announcements.length} New
            </span>
          </h3>
          
          <div className="mt-3 space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {announcements.map(ann => (
              <div key={ann.id} className="bg-slate-950/40 rounded-xl p-3 border border-blue-900/30">
                <div className="flex justify-between items-start gap-2 mb-1">
                  <h4 className="text-sm font-bold text-slate-200">{ann.title}</h4>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                    ann.priority === 'urgent' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {ann.priority}
                  </span>
                </div>
                <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{ann.content}</p>
                <div className="text-[10px] text-slate-500 mt-2 font-mono flex items-center gap-2">
                  <span>{format(new Date(ann.created_at), 'MMM dd, p')}</span>
                  <span>•</span>
                  <span>From: {ann.author_name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
