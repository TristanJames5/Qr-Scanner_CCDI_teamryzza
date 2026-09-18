import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { Zap, CheckCircle2, XCircle, Clock, Trophy, Star, Crown } from 'lucide-react';
import confetti from 'canvas-confetti';

const COLORS = [
  { bg: 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700', shadow: 'shadow-rose-900/60', letter: '🔴' },
  { bg: 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700', shadow: 'shadow-blue-900/60', letter: '🔵' },
  { bg: 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600', shadow: 'shadow-amber-900/60', letter: '🟡' },
  { bg: 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700', shadow: 'shadow-emerald-900/60', letter: '🟢' },
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
      osc.frequency.setValueAtTime(120, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(); osc.stop(ctx.currentTime + 0.5);
    } else if (type === 'tick') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start(); osc.stop(ctx.currentTime + 0.08);
    }
  } catch (e) { /* browsers may block without user interaction */ }
};

export const ActivePromptOverlay = () => {
  const { user } = useAuth();
  const { activePrompt, promptReveal, promptLeaderboard, setActivePrompt, setPromptReveal, setPromptLeaderboard } = useSocket();
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const prevTimeRef = useRef(null);

  // Reset state when new question arrives
  useEffect(() => {
    if (activePrompt) {
      setSelectedOption(null);
      setResult(null);
      setTimeLeft(Math.max(0, Math.ceil((activePrompt.end_time - Date.now()) / 1000)));
      prevTimeRef.current = null;
    }
  }, [activePrompt?.id]);

  // Live countdown ticker
  useEffect(() => {
    if (!activePrompt || promptReveal) return;
    const interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((activePrompt.end_time - Date.now()) / 1000));
      setTimeLeft(left);

      // Tick sound for last 5 seconds
      if (left <= 5 && left > 0 && left !== prevTimeRef.current) {
        playSound('tick');
      }
      prevTimeRef.current = left;
    }, 500);
    return () => clearInterval(interval);
  }, [activePrompt, promptReveal]);

  // Handle reveal event
  useEffect(() => {
    if (!promptReveal || !selectedOption) return;
    const isCorrect = promptReveal.correctOption === selectedOption;
    if (isCorrect) {
      playSound('correct');
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
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
        // Instructor blocked — silently dismiss
        setSelectedOption(null);
      } else if (err.response?.status !== 400) {
        setSelectedOption(null);
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

  // ── INSTRUCTORS: Never see the quiz overlay ─────────────────────────────────
  if (!user || user.role === 'instructor' || user.role === 'admin') return null;

  // ── LEADERBOARD SCREEN ──────────────────────────────────────────────────────
  if (promptLeaderboard) {
    const { leaderboard = [] } = promptLeaderboard;
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex flex-col items-center justify-center p-4 animate-in fade-in duration-500">
        {/* Confetti burst on mount */}
        <div className="text-center mb-8 space-y-2">
          <Trophy className="w-16 h-16 text-amber-400 mx-auto animate-bounce" />
          <h1 className="text-3xl sm:text-4xl font-black text-white">Quiz Complete!</h1>
          <p className="text-slate-400 text-sm">Here are the top participants</p>
        </div>

        <div className="w-full max-w-md space-y-3">
          {leaderboard.slice(0, 10).map((player, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
            const isMe = player.id === user?.id;
            return (
              <div
                key={player.id}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                  isMe
                    ? 'bg-amber-500/20 border-amber-500/50 ring-2 ring-amber-400'
                    : i === 0
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-lg font-black text-slate-300 flex-shrink-0">
                  {medal || `#${i + 1}`}
                </div>
                <img
                  src={player.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.id_number}`}
                  alt={player.name}
                  className="w-10 h-10 rounded-full border-2 border-slate-700 bg-slate-800 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white truncate">
                    {player.name} {isMe && <span className="text-amber-400 text-xs">(You)</span>}
                  </div>
                  <div className="text-xs text-slate-400">{player.correct_count}/{player.answered_count} correct</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-black text-amber-400">{player.total_points ?? 0}</div>
                  <div className="text-[10px] text-slate-500">pts</div>
                </div>
              </div>
            );
          })}

          {leaderboard.length === 0 && (
            <div className="text-center text-slate-500 py-8">No responses recorded.</div>
          )}
        </div>

        <button
          onClick={closeFully}
          className="mt-8 px-8 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold text-sm shadow-xl shadow-amber-900/40 transition-all"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // ── NO ACTIVE PROMPT ────────────────────────────────────────────────────────
  if (!activePrompt) return null;

  const timePct = activePrompt.time_limit_seconds > 0
    ? Math.max(0, (timeLeft / activePrompt.time_limit_seconds) * 100)
    : 0;

  const timerColor = timeLeft > 10 ? 'bg-amber-400' : timeLeft > 5 ? 'bg-orange-500' : 'bg-rose-500';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Timer Progress Bar */}
      <div className="h-2 bg-slate-800 w-full relative">
        <div
          className={`absolute top-0 left-0 h-full ${timerColor} transition-all duration-1000 ease-linear`}
          style={{ width: `${timePct}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full p-4 sm:p-6">
        {/* Header: Live Recap badge + Timer */}
        <div className="flex justify-between items-center mb-6">
          <span className="px-3 py-1 bg-slate-900 border border-amber-500/30 text-amber-400 rounded-full text-xs font-bold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Live Recap
          </span>
          <span className={`text-2xl font-mono font-black flex items-center gap-2 ${timeLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
            <Clock className="w-5 h-5 text-amber-400" />
            {timeLeft}s
          </span>
        </div>

        {/* Question */}
        <div className="flex-1 flex flex-col justify-center mb-6">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-center leading-tight">
            {activePrompt.question_text}
          </h2>
          {activePrompt.image_url && (
            <img
              src={activePrompt.image_url}
              alt="Question"
              className="mt-4 max-h-44 rounded-xl mx-auto object-contain shadow-lg border border-slate-700"
            />
          )}
        </div>

        {/* Submitted / Result banner */}
        {(selectedOption || promptReveal) && !promptReveal && (
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-2xl p-5 text-center mb-4 border border-slate-800 animate-in zoom-in duration-200">
            <div className="w-7 h-7 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="font-bold text-slate-200">Answer Submitted!</p>
            <p className="text-xs text-slate-500 mt-1">Waiting for instructor to reveal...</p>
          </div>
        )}

        {promptReveal && (
          <div className={`rounded-2xl p-5 text-center mb-4 border animate-in zoom-in duration-200 ${
            promptReveal.correctOption === selectedOption
              ? 'bg-emerald-500/20 border-emerald-500/40'
              : selectedOption
              ? 'bg-rose-500/20 border-rose-500/40'
              : 'bg-slate-900/80 border-slate-700'
          }`}>
            {promptReveal.correctOption === selectedOption ? (
              <>
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="text-lg font-black text-emerald-400">Correct! 🎉</p>
                <p className="text-slate-300 font-mono text-sm mt-1">+{result?.points ?? 0} XP</p>
              </>
            ) : selectedOption ? (
              <>
                <XCircle className="w-10 h-10 text-rose-400 mx-auto mb-2" />
                <p className="text-lg font-black text-rose-400">Incorrect</p>
                <p className="text-slate-400 text-sm mt-1">
                  Correct answer: <span className="text-white font-bold">{promptReveal.correctOption}</span>
                </p>
              </>
            ) : (
              <>
                <XCircle className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                <p className="text-slate-400 font-bold">Time's up — you didn't answer</p>
                <p className="text-slate-500 text-sm mt-1">
                  Correct answer: <span className="text-white font-bold">{promptReveal.correctOption}</span>
                </p>
              </>
            )}
          </div>
        )}

        {/* Answer Options Grid */}
        <div className="grid grid-cols-2 gap-3">
          {activePrompt.options.map((opt, i) => {
            const color = COLORS[i % 4];
            const isSelected = selectedOption === opt.id;
            const isRevealed = !!promptReveal;
            const isCorrect = promptReveal?.correctOption === opt.id;

            let cls = `${color.bg} shadow-lg ${color.shadow}`;
            if (isSelected && !isRevealed) {
              cls = `${color.bg} shadow-lg ${color.shadow} ring-4 ring-white/50 ring-offset-2 ring-offset-slate-950 scale-[1.02]`;
            }
            if (isRevealed) {
              if (isCorrect) {
                cls = 'bg-emerald-500 shadow-lg shadow-emerald-900/60 ring-4 ring-emerald-300 ring-offset-2 ring-offset-slate-950';
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
                className={`relative min-h-[110px] rounded-2xl p-4 transition-all transform active:scale-95 disabled:active:scale-100 flex flex-col items-center justify-center text-center ${cls}`}
              >
                {isRevealed && isCorrect && (
                  <CheckCircle2 className="absolute top-3 right-3 w-5 h-5 text-white" />
                )}
                {isRevealed && promptReveal && (
                  <div className="absolute bottom-2 left-0 right-0 text-center text-xs font-bold text-white/70">
                    {promptReveal.stats?.[opt.id] ?? 0} votes
                  </div>
                )}
                <span className="text-white/60 text-xs font-bold mb-1">{opt.id}</span>
                <span className="text-white font-extrabold text-base sm:text-lg drop-shadow leading-tight">
                  {opt.text}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
