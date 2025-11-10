import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = (token: string): Socket => {
  if (socket) {
    return socket;
  }

  const { VITE_WS_BASE_URL, VITE_API_BASE_URL } = import.meta.env;
  const baseUrl =
    VITE_WS_BASE_URL ||
    (VITE_API_BASE_URL ? VITE_API_BASE_URL.replace(/\/api\/v1$/, '') : undefined) ||
    'http://localhost:3333';

  socket = io(baseUrl, {
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

