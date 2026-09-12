import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

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

  const joinSession = (sessionId) => {
    if (socket && sessionId) {
      socket.emit('join_session', sessionId);
    }
  };

  const leaveSession = (sessionId) => {
    if (socket && sessionId) {
      socket.emit('leave_session', sessionId);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, joinSession, leaveSession }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  return context;
};
