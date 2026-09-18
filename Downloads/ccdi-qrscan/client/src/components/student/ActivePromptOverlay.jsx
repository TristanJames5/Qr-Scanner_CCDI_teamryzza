import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import api from '../../api/axios';
import { Zap, CheckCircle2, XCircle, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';

const COLORS = [
  'bg-rose-600 hover:bg-rose-500 shadow-rose-900/50',
  'bg-blue-600 hover:bg-blue-500 shadow-blue-900/50',
  'bg-amber-500 hover:bg-amber-400 shadow-amber-900/50',
  'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/50'
];

export const ActivePromptOverlay = () => {
  const { activePrompt, promptReveal, setActivePrompt, setPromptReveal } = useSocket();
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { isCorrect, points }
  const [timeLeft, setTimeLeft] = useState(0);

  // Sync timer
  useEffect(() => {
    if (!activePrompt) {
      setSelectedOption(null);
      setResult(null);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((activePrompt.end_time - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0 && !promptReveal && !selectedOption) {
          // Time up, didn't answer
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activePrompt, promptReveal, selectedOption]);

  // Handle reveal
  useEffect(() => {
    if (promptReveal && selectedOption) {
      const isCorrect = promptReveal.correctOption === selectedOption;
      if (isCorrect) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }
  }, [promptReveal, selectedOption]);

  const handleSubmit = async (optionId) => {
    if (selectedOption || submitting) return;
    
    // Provide haptic feedback if available on mobile
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }

    setSelectedOption(optionId);
    setSubmitting(true);
    
    try {
      // Calculate response time from when prompt started
      const startTime = activePrompt.end_time - (activePrompt.time_limit_seconds * 1000);
      const responseTimeMs = Date.now() - startTime;

      const res = await api.post(`/prompts/${activePrompt.id}/submit`, {
        selectedOption: optionId,
        responseTimeMs
      });

      setResult(res.data);
    } catch (err) {
      console.error('Failed to submit answer', err);
      // Reset so they can try again if it was a network error, unless it said "Already answered"
      if (err.response?.status !== 400) {
          setSelectedOption(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const closeOverlay = () => {
      setActivePrompt(null);
      setPromptReveal(null);
  };

  if (!activePrompt) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Timer Bar */}
      <div className="h-1.5 bg-slate-800 w-full relative">
        <div 
          className="absolute top-0 left-0 h-full bg-amber-400 transition-all duration-1000 ease-linear"
          style={{ width: `${Math.max(0, (timeLeft / activePrompt.time_limit_seconds) * 100)}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full p-4 sm:p-6 lg:p-8 relative">
        
        {/* Close Button if revealed */}
        {promptReveal && (
            <button onClick={closeOverlay} className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400">
                <XCircle className="w-6 h-6" />
            </button>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <span className="px-3 py-1 bg-slate-900 border border-slate-800 text-slate-300 rounded-full text-xs font-bold flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            Live Recap
          </span>
          <span className="text-2xl font-mono font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            {timeLeft}s
          </span>
        </div>

        {/* Question */}
        <div className="flex-1 flex flex-col justify-center mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-center leading-tight">
            {activePrompt.question_text}
          </h2>
        </div>

        {/* Status / Result Overlay (if answered or revealed) */}
        {(selectedOption || promptReveal) && (
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 text-center mb-8 border border-slate-800 animate-in zoom-in duration-300">
            {promptReveal ? (
              <div className="space-y-2">
                {promptReveal.correctOption === selectedOption ? (
                  <>
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                    <h3 className="text-xl font-bold text-emerald-400">Correct!</h3>
                    <p className="text-slate-300 font-mono">+{result?.points || 0} XP</p>
                  </>
                ) : (
                  <>
                    <XCircle className="w-12 h-12 text-rose-400 mx-auto" />
                    <h3 className="text-xl font-bold text-rose-400">Incorrect</h3>
                    <p className="text-slate-400">The correct answer was {promptReveal.correctOption}</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <h3 className="text-lg font-bold text-slate-300">Answer Submitted!</h3>
                <p className="text-sm text-slate-400">Waiting for others...</p>
              </div>
            )}
          </div>
        )}

        {/* Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-auto">
          {activePrompt.options.map((opt, i) => {
            const isSelected = selectedOption === opt.id;
            const isRevealed = !!promptReveal;
            const isCorrect = promptReveal?.correctOption === opt.id;
            
            let buttonClasses = COLORS[i % 4];
            let contentClasses = "opacity-100";
            
            if (selectedOption && !isSelected) {
              buttonClasses = "bg-slate-800 border-slate-700 opacity-50";
            }
            if (isRevealed) {
              if (isCorrect) {
                buttonClasses = "bg-emerald-600 shadow-emerald-900/50 ring-4 ring-emerald-400 ring-offset-4 ring-offset-slate-950";
              } else if (isSelected) {
                buttonClasses = "bg-rose-600 opacity-50";
              } else {
                buttonClasses = "bg-slate-800 opacity-30";
              }
            }

            return (
              <button
                key={opt.id}
                onClick={() => handleSubmit(opt.id)}
                disabled={!!selectedOption || submitting || isRevealed}
                className={`relative min-h-[120px] rounded-2xl p-6 shadow-lg transition-all transform active:scale-95 disabled:active:scale-100 ${buttonClasses} flex flex-col items-center justify-center text-center`}
              >
                <span className={`text-white/70 text-sm font-bold mb-2 ${contentClasses}`}>{opt.id}</span>
                <span className={`text-white font-extrabold text-lg sm:text-xl drop-shadow-md ${contentClasses}`}>
                  {opt.text}
                </span>
                
                {isRevealed && isCorrect && (
                  <CheckCircle2 className="absolute top-4 right-4 w-6 h-6 text-white" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
