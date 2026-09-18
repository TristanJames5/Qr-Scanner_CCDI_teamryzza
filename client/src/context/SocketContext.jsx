import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import api from '../api/axios';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [activePrompt, setActivePrompt] = useState(null);
  const [promptReveal, setPromptReveal] = useState(null);
  // After all questions done, this holds the ranked leaderboard
  const [promptLeaderboard, setPromptLeaderboard] = useState(null);

  useEffect(() => {
    const newSocket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Students and instructors both receive these events once in a room
    socket.on('prompt:start', (prompt) => {
      setActivePrompt(prompt);
      setPromptReveal(null);
      setPromptLeaderboard(null);
    });

    socket.on('prompt:reveal', (reveal) => {
      setPromptReveal(reveal);
    });

    socket.on('prompt:leaderboard', (data) => {
      setPromptLeaderboard(data);
      // Clear the active prompt so the overlay transitions to the leaderboard view
      setActivePrompt(null);
      setPromptReveal(null);
    });

    return () => {
      socket.off('prompt:start');
      socket.off('prompt:reveal');
      socket.off('prompt:leaderboard');
    };
  }, [socket]);

  // Students call this when they load their dashboard to join their active session room
  const joinSession = useCallback(async (sessionId) => {
    if (!socket || !sessionId) return;
    socket.emit('join_session', sessionId);

    // Fetch active prompt if we reconnected or joined late
    try {
      const res = await api.get(`/prompts/session/${sessionId}/active`);
      if (res.data?.prompt) {
        setActivePrompt(res.data.prompt);
      }
    } catch (err) {
      console.error('Failed to sync active prompt state:', err);
    }
  }, [socket]);

  const leaveSession = useCallback((sessionId) => {
    if (socket && sessionId) {
      socket.emit('leave_session', sessionId);
    }
  }, [socket]);

  return (
    <SocketContext.Provider value={{
      socket,
      joinSession,
      leaveSession,
      activePrompt,
      setActivePrompt,
      promptReveal,
      setPromptReveal,
      promptLeaderboard,
      setPromptLeaderboard,
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
