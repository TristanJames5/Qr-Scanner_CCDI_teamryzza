import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import api from '../api/axios';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Connect to same origin (works on localhost, LAN IP, and HTTPS tunnel!)
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

  const [activePrompt, setActivePrompt] = useState(null);
  const [promptReveal, setPromptReveal] = useState(null);

  useEffect(() => {
    if (!socket) return;
    
    socket.on('prompt:start', (prompt) => {
      setActivePrompt(prompt);
      setPromptReveal(null);
    });

    socket.on('prompt:reveal', (reveal) => {
      setPromptReveal(reveal);
    });

    return () => {
      socket.off('prompt:start');
      socket.off('prompt:reveal');
    }
  }, [socket]);

  const joinSession = async (sessionId) => {
    if (socket && sessionId) {
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
    }
  };

  const leaveSession = (sessionId) => {
    if (socket && sessionId) {
      socket.emit('leave_session', sessionId);
    }
  };

  return (
    <SocketContext.Provider value={{ 
      socket, 
      joinSession, 
      leaveSession,
      activePrompt,
      setActivePrompt,
      promptReveal,
      setPromptReveal
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  return context;
};
