import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = (token: string): Socket => {
  if (socket) {
    return socket;
  }

  socket = io('http://localhost:3000', {
    auth: {
      token,
    },
    autoConnect: false,
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

