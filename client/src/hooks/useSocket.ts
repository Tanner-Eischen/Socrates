import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { initSocket, disconnectSocket } from '../lib/socket';

export function useSocket(token: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      setSocket(null);
      setConnected(false);
      return;
    }

    const socketInstance = initSocket(token);
    
    socketInstance.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    socketInstance.connect();
    setSocket(socketInstance);

    return () => {
      disconnectSocket();
    };
  }, [token]);

  return { socket, connected };
}

