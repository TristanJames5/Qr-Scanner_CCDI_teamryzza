import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Lock, Trophy, Star, Zap, Calendar, Monitor, Gift, Flame, Users } from 'lucide-react';

// Tier icon map
const TIER_ICONS_MAP = {
  1: <span className="text-amber-400">⏰</span>,
  2: <span className="text-orange-400">🔥</span>,
  3: <span className="text-blue-400">📅</span>,
  4: <span className="text-yellow-400">🏆</span>,
  5: <span className="text-cyan-400">💻</span>,
  6: <span className="text-pink-400">🎉</span>,
  7: <span className="text-green-400">💪</span>,
  8: <span className="text-purple-400">👥</span>,
};

const TIER_COLORS = {
  1: 'border-amber-500/30 text-amber-400',
  2: 'border-orange-500/30 text-orange-400',
  3: 'border-blue-500/30 text-blue-400',
  4: 'border-yellow-500/30 text-yellow-400',
  5: 'border-cyan-500/30 text-cyan-400',
  6: 'border-pink-500/30 text-pink-400',
  7: 'border-green-500/30 text-green-400',
  8: 'border-purple-500/30 text-purple-400',
};

const TIER_BG = {
  1: 'bg-amber-500/10',
  2: 'bg-orange-500/10',
  3: 'bg-blue-500/10',
  4: 'bg-yellow-500/10',
  5: 'bg-cyan-500/10',
  6: 'bg-pink-500/10',
  7: 'bg-green-500/10',
  8: 'bg-purple-500/10',
};

// Single flat badge card — matches screenshot style
function BadgeCard({ badge }) {
  const color = TIER_COLORS[badge.tier] || 'border-slate-700 text-slate-400';
  const bg = TIER_BG[badge.tier] || '';
  const earned = badge.earned;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
        earned
          ? `${bg} ${color} border`
          : 'border-slate-800 bg-slate-900/40 opacity-50'
      }`}
    >
      {/* Left icon area */}
      <div
        className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center border text-lg ${
          earned
            ? `${bg} ${color} border`
            : 'bg-slate-800 border-slate-700 text-slate-600'
        }`}
      >
        {earned ? TIER_ICONS_MAP[badge.tier] : <Lock className="w-4 h-4 text-slate-600" />}
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold leading-tight truncate ${earned ? 'text-white' : 'text-slate-500'}`}>
          {badge.name}
        </p>
        <p className={`text-xs mt-0.5 leading-tight line-clamp-1 ${earned ? 'text-slate-400' : 'text-slate-600'}`}>
          {badge.description}
        </p>
      </div>

      {/* XP chip */}
      <div className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
        earned ? `${bg} ${color.split(' ')[1]}` : 'text-slate-600 bg-slate-800'
      }`}>
        +{badge.xp} XP
      </div>
    </div>
  );
}

export function BadgesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTier, setActiveTier] = useState('all');
  const [filterEarned, setFilterEarned] = useState('all'); // 'all' | 'earned' | 'locked'

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/gamification/badges/all');
        setData(res.data);
      } catch (e) {
        console.error('Failed to load badges', e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-slate-500 py-12">Failed to load badges.</div>;
  }

  const { tiers, totalBadges, totalEarned } = data;

  // Flatten for 'all' view
  const allBadges = tiers.flatMap(t => t.badges);

  // Filter badges
  const getBadges = () => {
    let source = activeTier === 'all'
      ? allBadges
      : tiers.find(t => t.tier === parseInt(activeTier))?.badges || [];

    if (filterEarned === 'earned') source = source.filter(b => b.earned);
    if (filterEarned === 'locked') source = source.filter(b => !b.earned);
    return source;
  };

  const displayedBadges = getBadges();
  const pct = Math.round((totalEarned / totalBadges) * 100);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header progress card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" /> Achievements
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">
              {totalEarned} of {totalBadges} badges earned
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-amber-400">{pct}%</div>
            <div className="text-xs text-slate-500">Complete</div>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Tier progress pills */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {tiers.map(t => {
            const tPct = t.badges.length > 0 ? Math.round((t.earnedCount / t.badges.length) * 100) : 0;
            return (
              <div
                key={t.tier}
                onClick={() => setActiveTier(activeTier === String(t.tier) ? 'all' : String(t.tier))}
                className={`cursor-pointer rounded-xl p-2 text-center border transition-all ${
                  activeTier === String(t.tier)
                    ? `${TIER_BG[t.tier]} ${TIER_COLORS[t.tier]} border`
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="text-lg mb-0.5">{t.icon}</div>
                <div className="text-[10px] font-bold text-slate-300 truncate">{t.name.split('&')[0].trim()}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{t.earnedCount}/{t.badges.length}</div>
                <div className="mt-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full"
                    style={{ width: `${tPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter controls */}
      <div className="flex gap-2">
        {['all', 'earned', 'locked'].map(f => (
          <button
            key={f}
            onClick={() => setFilterEarned(f)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
              filterEarned === f
                ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-900/30'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {f === 'all' ? `All (${allBadges.length})` :
             f === 'earned' ? `Earned (${allBadges.filter(b=>b.earned).length})` :
             `Locked (${allBadges.filter(b=>!b.earned).length})`}
          </button>
        ))}
      </div>

      {/* Tier label */}
      {activeTier !== 'all' && (() => {
        const t = tiers.find(t => t.tier === parseInt(activeTier));
        return t ? (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold ${TIER_BG[t.tier]} ${TIER_COLORS[t.tier]}`}>
            <span className="text-base">{t.icon}</span>
            {t.name}
            <span className="ml-auto text-xs opacity-60">{t.earnedCount}/{t.badges.length}</span>
          </div>
        ) : null;
      })()}

      {/* Badge list */}
      <div className="space-y-2">
        {displayedBadges.length === 0 ? (
          <div className="text-center text-slate-500 py-12 text-sm">No badges found.</div>
        ) : (
          displayedBadges.map(badge => (
            <BadgeCard key={badge.key} badge={badge} />
          ))
        )}
      </div>
    </div>
  );
}
