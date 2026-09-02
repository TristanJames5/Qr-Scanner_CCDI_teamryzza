let ioInstance = null;

export function initSocketIO(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    // console.log(`[Socket] Client connected: ${socket.id}`);

    // Join a class session room
    socket.on('join_session', (sessionId) => {
      if (sessionId) {
        socket.join(`session:${sessionId}`);
        // console.log(`[Socket] Socket ${socket.id} joined session:${sessionId}`);
      }
    });

    // Leave a class session room
    socket.on('leave_session', (sessionId) => {
      if (sessionId) {
        socket.leave(`session:${sessionId}`);
      }
    });

    socket.on('disconnect', () => {
      // console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function broadcastSessionEvent(sessionId, eventName, payload) {
  if (ioInstance && sessionId) {
    ioInstance.to(`session:${sessionId}`).emit(eventName, payload);
  }
}

export function getIO() {
  return ioInstance;
}
