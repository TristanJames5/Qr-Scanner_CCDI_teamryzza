import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { Zap, CheckCircle2, XCircle, Clock, Trophy, Crown, Medal } from 'lucide-react';
import confetti from 'canvas-confetti';

const OPTION_STYLES = [
  { bg: 'bg-rose-600 hover:bg-rose-500', glow: 'shadow-rose-900/60', shape: '▲', shapeColor: 'text-rose-200' },
  { bg: 'bg-blue-600 hover:bg-blue-500', glow: 'shadow-blue-900/60', shape: '◆', shapeColor: 'text-blue-200' },
  { bg: 'bg-amber-500 hover:bg-amber-400', glow: 'shadow-amber-900/60', shape: '●', shapeColor: 'text-amber-200' },
  { bg: 'bg-emerald-600 hover:bg-emerald-500', glow: 'shadow-emerald-900/60', shape: '■', shapeColor: 'text-emerald-200' },
];

const playSound = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'correct') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.24);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
      osc.start(); osc.stop(ctx.currentTime + 0.9);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.setValueAtTime(120, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(); osc.stop(ctx.currentTime + 0.6);
    } else if (type === 'tick') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start(); osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'fanfare') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.30);
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.45);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.start(); osc.stop(ctx.currentTime + 1.2);
    }
  } catch (e) {}
};

// ── Leaderboard Screen ──────────────────────────────────────────────────────
const LeaderboardScreen = ({ leaderboard = [], currentUserId, onClose }) => {
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  useEffect(() => {
    playSound('fanfare');
    // Multi-burst confetti
    const burst = (origin) => confetti({ particleCount: 80, spread: 100, origin, startVelocity: 45 });
    setTimeout(() => { burst({ x: 0.2, y: 0.5 }); burst({ x: 0.8, y: 0.5 }); }, 300);
    setTimeout(() => { burst({ x: 0.5, y: 0.3 }); }, 800);
  }, []);

  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean); // 2nd, 1st, 3rd
  const podiumHeights = ['h-28', 'h-40', 'h-20'];
  const podiumColors = ['bg-slate-400', 'bg-amber-400', 'bg-orange-400'];
  const medalEmojis = ['🥈', '🥇', '🥉'];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-indigo-950 via-slate-950 to-slate-950 text-white overflow-y-auto">
      {/* Header */}
      <div className="text-center pt-8 pb-4 px-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold mb-4">
          <Trophy className="w-4 h-4" /> QUIZ COMPLETE
        </div>
        <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
          Final Leaderboard
        </h1>
        <p className="text-slate-400 text-sm mt-1">Top performers of this Quick Recap</p>
      </div>

      {/* Podium — top 3 */}
      {top3.length > 0 && (
        <div className="flex items-end justify-center gap-3 px-6 pt-4 pb-2">
          {podiumOrder.map((player, idx) => {
            const isMe = player?.id === currentUserId;
            const realRank = leaderboard.findIndex(p => p.id === player?.id);
            return (
              <div key={player?.id || idx} className="flex flex-col items-center flex-1 max-w-[110px]">
                {/* Avatar */}
                <div className={`relative mb-2 ${realRank === 0 ? 'scale-110' : ''}`}>
                  <img
                    src={player?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player?.id_number || idx}`}
                    alt={player?.name}
                    className={`w-14 h-14 rounded-full border-4 object-cover bg-slate-800 ${
                      realRank === 0 ? 'border-amber-400 shadow-lg shadow-amber-500/40' :
                      realRank === 1 ? 'border-slate-400' : 'border-orange-400'
                    }`}
                  />
                  <div className="absolute -top-2 -right-1 text-xl">{medalEmojis[idx]}</div>
                  {realRank === 0 && (
                    <Crown className="absolute -top-5 left-1/2 -translate-x-1/2 w-5 h-5 text-amber-400 fill-amber-400" />
                  )}
                </div>
                {/* Name */}
                <p className={`text-[11px] font-bold text-center truncate w-full leading-tight mb-1 ${isMe ? 'text-amber-400' : 'text-white'}`}>
                  {player?.name?.split(' ')[0] || 'Student'}{isMe ? ' (You)' : ''}
                </p>
                {/* Points */}
                <p className="text-xs font-black text-amber-300 mb-1.5">{player?.total_points ?? 0}pts</p>
                {/* Podium bar */}
                <div className={`w-full ${podiumHeights[idx]} ${podiumColors[idx]} rounded-t-2xl flex items-start justify-center pt-2 opacity-80`}>
                  <span className="text-slate-900 font-black text-xl">{realRank + 1}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rest of leaderboard */}
      {leaderboard.length > 0 && (
        <div className="mx-4 mb-4 space-y-2 mt-4">
          {leaderboard.map((player, i) => {
            const isMe = player.id === currentUserId;
            return (
              <div
                key={player.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${
                  isMe
                    ? 'bg-amber-500/15 border-amber-500/40 ring-1 ring-amber-400'
                    : 'bg-slate-900/70 border-slate-800'
                }`}
              >
                {/* Rank */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${
                  i === 0 ? 'bg-amber-400 text-slate-900' :
                  i === 1 ? 'bg-slate-400 text-slate-900' :
                  i === 2 ? 'bg-orange-400 text-slate-900' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  {i < 3 ? ['🥇','🥈','🥉'][i] : `#${i+1}`}
                </div>

                {/* Avatar */}
                <img
                  src={player.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.id_number}`}
                  alt={player.name}
                  className="w-9 h-9 rounded-full border-2 border-slate-700 bg-slate-800 flex-shrink-0 object-cover"
                />

                {/* Name + stats */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white text-sm truncate">
                    {player.name}
                    {isMe && <span className="ml-1.5 text-amber-400 text-xs font-semibold">(You)</span>}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {player.correct_count ?? 0}/{player.answered_count ?? 0} correct
                  </div>
                </div>

                {/* Points */}
                <div className="text-right flex-shrink-0">
                  <div className={`text-lg font-black ${i === 0 ? 'text-amber-400' : 'text-slate-200'}`}>
                    {player.total_points ?? 0}
                  </div>
                  <div className="text-[10px] text-slate-500">pts</div>
                </div>
              </div>
            );
          })}

          {leaderboard.length === 0 && (
            <div className="text-center text-slate-500 py-8 text-sm">No responses recorded.</div>
          )}
        </div>
      )}

      <div className="px-4 pb-8 mt-auto">
        <button
          onClick={onClose}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-900 font-extrabold text-sm shadow-xl shadow-amber-900/30 transition-all active:scale-95"
        >
          🎉 Back to Dashboard
        </button>
      </div>
    </div>
  );
};

// ── Main Overlay ─────────────────────────────────────────────────────────────
export const ActivePromptOverlay = () => {
  const { user } = useAuth();
  const {
    activePrompt,
    promptReveal,
    promptLeaderboard,
    setActivePrompt,
    setPromptReveal,
    setPromptLeaderboard,
  } = useSocket();

  const [selectedOption, setSelectedOption] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const prevTimeRef = useRef(null);
  const prevPromptId = useRef(null);

  // Reset when new question arrives
  useEffect(() => {
    if (activePrompt && activePrompt.id !== prevPromptId.current) {
      prevPromptId.current = activePrompt.id;
      setSelectedOption(null);
      setResult(null);
      setTimeLeft(Math.max(0, Math.ceil((activePrompt.end_time - Date.now()) / 1000)));
      prevTimeRef.current = null;
    }
  }, [activePrompt?.id]);

  // Live countdown
  useEffect(() => {
    if (!activePrompt || promptReveal) return;
    const interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((activePrompt.end_time - Date.now()) / 1000));
      setTimeLeft(left);
      if (left <= 5 && left > 0 && left !== prevTimeRef.current) {
        playSound('tick');
      }
      prevTimeRef.current = left;
    }, 500);
    return () => clearInterval(interval);
  }, [activePrompt, promptReveal]);

  // Handle answer reveal sound/confetti
  useEffect(() => {
    if (!promptReveal || !selectedOption) return;
    const isCorrect = promptReveal.correctOption === selectedOption;
    if (isCorrect) {
      playSound('correct');
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.55 } });
    } else {
      playSound('wrong');
    }
  }, [promptReveal]);

  const handleSubmit = async (optionId) => {
    if (selectedOption || submitting) return;
    if (window.navigator?.vibrate) window.navigator.vibrate(50);
    setSelectedOption(optionId);
    setSubmitting(true);
    try {
      const res = await api.post(`/prompts/${activePrompt.id}/submit`, { selectedOption: optionId });
      setResult(res.data);
    } catch (err) {
      if (err.response?.status === 403) {
        setSelectedOption(null); // instructor — blocked
      } else if (err.response?.status !== 400) {
        setSelectedOption(null); // network error — let them retry
      }
    } finally {
      setSubmitting(false);
    }
  };

  const closeFully = () => {
    setActivePrompt(null);
    setPromptReveal(null);
    setPromptLeaderboard(null);
  };

  // ── Instructors never see the student quiz overlay
  if (!user || user.role === 'instructor' || user.role === 'admin') return null;

  // ── Leaderboard screen
  if (promptLeaderboard) {
    return (
      <LeaderboardScreen
        leaderboard={promptLeaderboard.leaderboard || []}
        currentUserId={user?.id}
        onClose={closeFully}
      />
    );
  }

  if (!activePrompt) return null;

  const timePct = activePrompt.time_limit_seconds > 0
    ? Math.max(0, (timeLeft / activePrompt.time_limit_seconds) * 100)
    : 0;

  const timerColor =
    timeLeft > 10 ? 'bg-amber-400' :
    timeLeft > 5  ? 'bg-orange-500' :
                    'bg-rose-500';

  const totalVotes = promptReveal
    ? Object.values(promptReveal.stats || {}).reduce((s, v) => s + v, 0)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white">
      {/* Timer bar */}
      <div className="h-2 bg-slate-800 w-full">
        <div
          className={`h-full ${timerColor} transition-all duration-1000 ease-linear`}
          style={{ width: `${timePct}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 pt-4 pb-4 overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <span className="px-3 py-1 bg-slate-900 border border-amber-500/30 text-amber-400 rounded-full text-xs font-bold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Quick Recap
          </span>
          <span className={`text-2xl font-mono font-black flex items-center gap-1.5 ${timeLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
            <Clock className="w-5 h-5 text-amber-400" />
            {timeLeft}s
          </span>
        </div>

        {/* Question */}
        <div className="flex-1 flex flex-col items-center justify-center mb-5 min-h-[80px] text-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold leading-snug">
            {activePrompt.question_text}
          </h2>
          {activePrompt.image_url && (
            <img
              src={activePrompt.image_url}
              alt="Question"
              className="mt-4 max-h-40 rounded-xl object-contain shadow-lg border border-slate-700"
            />
          )}
        </div>

        {/* Submit / Waiting banner */}
        {selectedOption && !promptReveal && (
          <div className="bg-slate-900/90 rounded-2xl p-4 text-center mb-4 border border-slate-800">
            <div className="w-6 h-6 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="font-bold text-slate-200 text-sm">Answer Submitted!</p>
            <p className="text-xs text-slate-500 mt-0.5">Waiting for instructor to reveal...</p>
          </div>
        )}

        {/* Reveal result banner */}
        {promptReveal && selectedOption && (
          <div className={`rounded-2xl p-4 text-center mb-4 border ${
            promptReveal.correctOption === selectedOption
              ? 'bg-emerald-500/15 border-emerald-500/40'
              : 'bg-rose-500/15 border-rose-500/30'
          }`}>
            {promptReveal.correctOption === selectedOption ? (
              <>
                <CheckCircle2 className="w-9 h-9 text-emerald-400 mx-auto mb-1" />
                <p className="font-black text-emerald-400 text-lg">Correct! 🎉</p>
                {result?.points > 0 && (
                  <p className="text-slate-300 text-sm mt-0.5 font-mono">+{result.points} XP</p>
                )}
              </>
            ) : (
              <>
                <XCircle className="w-9 h-9 text-rose-400 mx-auto mb-1" />
                <p className="font-black text-rose-400 text-lg">Incorrect</p>
                <p className="text-slate-400 text-sm mt-0.5">
                  Answer: <span className="text-white font-bold">{promptReveal.correctOption}</span>
                </p>
              </>
            )}
          </div>
        )}

        {/* Time's up — didn't answer */}
        {promptReveal && !selectedOption && (
          <div className="rounded-2xl p-4 text-center mb-4 border border-slate-700 bg-slate-900/70">
            <XCircle className="w-8 h-8 text-slate-500 mx-auto mb-1" />
            <p className="text-slate-400 font-bold text-sm">Time's up — no answer</p>
            <p className="text-slate-500 text-xs mt-0.5">
              Answer: <span className="text-white font-semibold">{promptReveal.correctOption}</span>
            </p>
          </div>
        )}

        {/* Option grid */}
        <div className="grid grid-cols-2 gap-3">
          {activePrompt.options.map((opt, i) => {
            const style = OPTION_STYLES[i % 4];
            const isSelected = selectedOption === opt.id;
            const isRevealed = !!promptReveal;
            const isCorrect = promptReveal?.correctOption === opt.id;
            const voteCount = promptReveal?.stats?.[opt.id] ?? 0;
            const votePct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

            let cls = `${style.bg} shadow-lg ${style.glow}`;
            if (isSelected && !isRevealed) {
              cls += ' ring-4 ring-white/40 ring-offset-2 ring-offset-slate-950 scale-[1.02]';
            }
            if (isRevealed) {
              if (isCorrect) {
                cls = 'bg-emerald-500 shadow-lg shadow-emerald-900/50 ring-4 ring-emerald-300 ring-offset-2 ring-offset-slate-950';
              } else if (isSelected) {
                cls = 'bg-rose-700 shadow-none opacity-60';
              } else {
                cls = 'bg-slate-800 shadow-none opacity-40';
              }
            }

            return (
              <button
                key={opt.id}
                onClick={() => handleSubmit(opt.id)}
                disabled={!!selectedOption || submitting || isRevealed}
                className={`relative min-h-[100px] rounded-2xl p-4 transition-all transform active:scale-95 disabled:active:scale-100 flex flex-col items-center justify-center text-center overflow-hidden ${cls}`}
              >
                {/* Bar fill behind (Kahoot-style) shown on reveal */}
                {isRevealed && (
                  <div
                    className="absolute bottom-0 left-0 h-1.5 bg-white/30 transition-all duration-1000"
                    style={{ width: `${votePct}%` }}
                  />
                )}

                {isRevealed && isCorrect && (
                  <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-white" />
                )}

                <span className={`text-2xl mb-1 ${style.shapeColor} font-black`}>{style.shape}</span>
                <span className="text-white font-extrabold text-sm sm:text-base leading-tight drop-shadow">
                  {opt.text}
                </span>

                {isRevealed && (
                  <span className="mt-1.5 text-white/70 text-xs font-bold">
                    {voteCount} vote{voteCount !== 1 ? 's' : ''} ({votePct}%)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
