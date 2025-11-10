import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../AuthContext';
import { useSocket } from '../hooks/useSocket';
import api from '../api';

interface Participant {
  userId: string;
  role: 'tutor' | 'student' | 'observer';
  joinedAt: string;
  isActive: boolean;
}

interface RoomMessage {
  id: string;
  userId: string;
  content: string;
  timestamp: string | Date;
}

export default function Collaboration() {
  const { user, logout } = useAuth();
  const token = localStorage.getItem('token');
  const { socket, connected } = useSocket(token);
  
  const [roomCode, setRoomCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [collaborationSessionId, setCollaborationSessionId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    // Server emits when room is joined successfully
    socket.on('room_joined', (data: { collaborationSession: { id: string; roomId: string }; participants: Participant[] }) => {
      setCollaborationSessionId(data.collaborationSession.id);
      setCurrentRoom(data.collaborationSession.roomId);
      setParticipants(data.participants);
      setRoomCode(data.collaborationSession.id);
      toast.success('Joined collaboration session');
    });

    // Participant lifecycle events
    socket.on('user_joined', (payload: { userId: string; role: Participant['role']; timestamp: string }) => {
      setParticipants(prev => {
        const exists = prev.find(p => p.userId === payload.userId);
        if (exists) return prev;
        return [...prev, { userId: payload.userId, role: payload.role, joinedAt: payload.timestamp, isActive: true }];
      });
    });

    socket.on('user_left', (payload: { userId: string }) => {
      setParticipants(prev => prev.filter(p => p.userId !== payload.userId));
    });

    // Message events
    socket.on('message_received', (message: RoomMessage) => {
      setMessages(prev => [...prev, message]);
    });

    // Error events
    socket.on('error', (payload: { message?: string }) => {
      toast.error(payload?.message || 'Socket error');
    });

    return () => {
      socket.off('room_joined');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('message_received');
      socket.off('error');
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createRoom = async () => {
    if (!socket || !connected) {
      toast.error('WebSocket connection not available. This feature requires a live server connection.');
      return;
    }

    try {
      // Create collaboration session via REST API
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const res = await api.post('/collaboration/sessions', {
        title: `Room ${code}`,
        description: 'Ad-hoc collaboration session',
        type: 'peer_learning',
        isPublic: true,
        maxParticipants: 10,
      });

      const session = res.data?.data;
      if (!session?.id) {
        throw new Error('Failed to create collaboration session');
      }

      setCollaborationSessionId(session.id);
      setRoomCode(session.id);

      // Join the room via WebSocket
      socket.emit('join_room', { collaborationSessionId: session.id, role: 'student' });
    } catch (err: any) {
      console.error('Failed to create collaboration session:', err);
      toast.error(err?.response?.data?.message || 'Failed to create collaboration session');
    }
  };

  const joinRoom = async () => {
    if (!roomCode.trim()) {
      toast.error('Please enter a session ID');
      return;
    }

    if (!socket || !connected) {
      toast.error('WebSocket connection not available. This feature requires a live server connection.');
      return;
    }

    try {
      // Join directly via WebSocket; server will validate and emit errors if needed
      setCollaborationSessionId(roomCode);
      socket.emit('join_room', { collaborationSessionId: roomCode, role: 'student' });
    } catch (err: any) {
      console.error('Failed to join session:', err);
      toast.error(err?.response?.data?.message || 'Failed to join session');
    }
  };

  const leaveRoom = () => {
    if (!socket || !collaborationSessionId) return;

    socket.emit('leave_room', collaborationSessionId);
    setCurrentRoom(null);
    setParticipants([]);
    setMessages([]);
    setRoomCode('');
    setCollaborationSessionId(null);
  };

  const sendMessage = () => {
    if (!socket || !collaborationSessionId || !input.trim()) return;

    socket.emit('send_message', {
      collaborationSessionId,
      type: 'text',
      content: input,
    });

    setInput('');
  };

  if (!currentRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <header className="sticky top-0 z-10 border-b-2 border-amber-200 bg-white/80 backdrop-blur">
          <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">Socrates</h1>
              <Link to="/dashboard" className="text-sm text-gray-600 hover:text-amber-700 transition-colors">
                ← Dashboard
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className="text-xs text-gray-600">
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">Collaboration</h2>
            <p className="mt-2 text-gray-600">Work together with other students in real-time</p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Create Room */}
            <div className="rounded-2xl border-2 border-amber-200 bg-white/80 backdrop-blur-sm p-8 shadow-lg">
              <h3 className="mb-4 text-xl font-semibold text-gray-900">Create a Room</h3>
              <p className="mb-6 text-gray-600">Start a new collaboration session</p>
              {!connected && (
                <div className="mb-4 rounded-xl bg-red-50 border-2 border-red-200 p-3 text-center text-sm text-red-700">
                  ⚠️ Not connected to server
                </div>
              )}
              <button
                onClick={createRoom}
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 p-3 font-semibold text-white shadow-md transition-all"
              >
                Create Session
              </button>
              {roomCode && (
                <div className="mt-4 rounded-xl bg-amber-50 border-2 border-amber-200 p-4 text-center">
                  <div className="text-sm text-gray-600 font-medium">Session ID</div>
                  <div className="mt-1 text-2xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">{roomCode}</div>
                  <div className="mt-2 text-xs text-gray-500">Share this code with others to join</div>
                </div>
              )}
            </div>

            {/* Join Room */}
            <div className="rounded-2xl border-2 border-amber-200 bg-white/80 backdrop-blur-sm p-8 shadow-lg">
              <h3 className="mb-4 text-xl font-semibold text-gray-900">Join a Session</h3>
              <p className="mb-6 text-gray-600">Enter a session ID to join</p>
              <div className="space-y-3">
                <input
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  placeholder="Enter session ID"
                  className="w-full rounded-xl bg-white border-2 border-amber-200 p-3 text-center text-xl font-mono text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <button
                  onClick={joinRoom}
                  className="w-full rounded-xl bg-amber-50 border-2 border-amber-300 hover:bg-amber-100 p-3 font-semibold text-amber-700 transition-all"
                >
                  Join Session
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <header className="border-b-2 border-amber-200 bg-white/80 backdrop-blur px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={leaveRoom} className="rounded-lg border-2 border-amber-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-amber-50 transition-all">
              ← Leave Room
            </button>
            <div>
              <div className="text-sm text-gray-600 font-medium">Room Code</div>
              <div className="font-mono font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">{currentRoom}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {participants.slice(0, 3).map((p) => (
                <div
                  key={p.userId}
                  className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border-2 border-white flex items-center justify-center text-xs font-semibold text-white shadow-md"
                  title={p.userId}
                >
                  {p.userId.charAt(0).toUpperCase()}
                </div>
              ))}
              {participants.length > 3 && (
                <div className="h-8 w-8 rounded-full bg-amber-100 border-2 border-white flex items-center justify-center text-xs text-amber-700 font-semibold shadow-md">
                  +{participants.length - 3}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-500">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.userId === user?.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-2xl p-4 shadow-md ${
                msg.userId === user?.id
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white'
                  : 'bg-white border-2 border-amber-200'
              }`}>
                <div className={`text-xs font-medium mb-1 ${msg.userId === user?.id ? 'text-amber-100' : 'text-gray-600'}`}>
                  {msg.userId === user?.id ? 'You' : `User ${msg.userId.slice(0, 6)}`}
                </div>
                <div className={msg.userId === user?.id ? 'text-white' : 'text-gray-900'}>{msg.content}</div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t-2 border-amber-200 bg-white/80 backdrop-blur p-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Type a message..."
            disabled={!connected}
            className="flex-1 rounded-xl bg-white border-2 border-amber-200 p-3 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!connected || !input.trim()}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 px-6 py-3 font-semibold text-white shadow-md transition-all disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

