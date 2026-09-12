import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Star, ArrowLeft, AlertTriangle, ShieldCheck, User, Award, Flame, Zap } from 'lucide-react';
import api from '../../api/axios';

export const LeaderboardPage = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const res = await api.get('/gamification/leaderboard');
        setLeaderboard(res.data.leaderboard || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-40 bg-slate-800/60 rounded-3xl"></div>
          <div className="h-96 bg-slate-800/60 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header with Back button */}
      <div className="flex items-center justify-between">
        <Link 
          to="/student"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors p-2 rounded-xl bg-slate-900 border border-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
      </div>

      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 mb-2 shadow-lg shadow-amber-500/20">
          <Trophy className="w-8 h-8" />
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white font-['Outfit']">School Leaderboard</h1>
        <p className="text-slate-400 max-w-xl mx-auto text-sm">
          Top students ranked by Attendance XP. Earn XP by arriving early, maintaining streaks, and unlocking badges.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/90 text-xs text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 text-center">Rank</th>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4 text-center">Level</th>
                <th className="px-6 py-4 text-center">Streak</th>
                <th className="px-6 py-4 text-right">Total XP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {leaderboard.length > 0 ? (
                leaderboard.map((stu) => (
                  <tr key={stu.id} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        {stu.rank === 1 ? (
                          <span className="w-8 h-8 flex items-center justify-center bg-yellow-500 text-yellow-950 font-black rounded-full shadow-lg shadow-yellow-500/30 ring-2 ring-yellow-400">1</span>
                        ) : stu.rank === 2 ? (
                          <span className="w-8 h-8 flex items-center justify-center bg-slate-300 text-slate-900 font-black rounded-full shadow-lg shadow-slate-300/30 ring-2 ring-slate-200">2</span>
                        ) : stu.rank === 3 ? (
                          <span className="w-8 h-8 flex items-center justify-center bg-amber-700 text-amber-100 font-black rounded-full shadow-lg shadow-amber-700/30 ring-2 ring-amber-600">3</span>
                        ) : (
                          <span className="w-8 h-8 flex items-center justify-center text-slate-400 font-bold">{stu.rank}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {stu.avatar_url ? (
                          <img src={stu.avatar_url} alt="avatar" className="w-10 h-10 rounded-full border border-slate-700 object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-100 flex items-center gap-2">
                            {stu.name}
                            {stu.topBadge && (
                              <span title={stu.topBadge.badge_name} className="text-lg">{stu.topBadge.badge_emoji}</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">{stu.department || 'CCDI Student'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span 
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border"
                        style={{ color: stu.level?.color, borderColor: `${stu.level?.color}40`, backgroundColor: `${stu.level?.color}15` }}
                      >
                        <Star className="w-3 h-3" />
                        {stu.level?.name || 'Beginner'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <Flame className={`w-4 h-4 ${stu.streak > 0 ? 'text-orange-500' : 'text-slate-600'}`} />
                        <span className={`font-bold ${stu.streak > 0 ? 'text-orange-400' : 'text-slate-500'}`}>{stu.streak}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-black text-lg text-amber-400 flex items-center justify-end gap-1">
                        {stu.totalXP} <span className="text-[10px] font-bold text-amber-500/70 uppercase">XP</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No leaderboard data available yet. Start scanning to earn XP!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
