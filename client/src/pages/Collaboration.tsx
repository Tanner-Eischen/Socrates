import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../AuthContext';
import { useSocket } from '../hooks/useSocket';

interface Participant {
  id: string;
  name: string;
  online: boolean;
}

interface RoomMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
}

export default function Collaboration() {
  const { user, logout } = useAuth();
  const token = localStorage.getItem('token');
  const { socket, connected } = useSocket(token);
  
  const [roomCode, setRoomCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('room:joined', (data: { roomId: string; participants: Participant[] }) => {
      setCurrentRoom(data.roomId);
      setParticipants(data.participants);
      toast.success('Joined room successfully!');
    });

    socket.on('room:participant-joined', (participant: Participant) => {
      setParticipants(prev => [...prev, participant]);
      toast.success(`${participant.name} joined the room`);
    });

    socket.on('room:participant-left', (participantId: string) => {
      setParticipants(prev => prev.filter(p => p.id !== participantId));
    });

    socket.on('room:message', (message: RoomMessage) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      socket.off('room:joined');
      socket.off('room:participant-joined');
      socket.off('room:participant-left');
      socket.off('room:message');
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createRoom = () => {
    if (!socket) return;
    
    const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    socket.emit('room:create', { roomId: newRoomCode });
    setRoomCode(newRoomCode);
  };

  const joinRoom = () => {
    if (!socket || !roomCode.trim()) {
      toast.error('Please enter a room code');
      return;
    }
    
    socket.emit('room:join', { roomId: roomCode.toUpperCase() });
  };

  const leaveRoom = () => {
    if (!socket || !currentRoom) return;
    
    socket.emit('room:leave', { roomId: currentRoom });
    setCurrentRoom(null);
    setParticipants([]);
    setMessages([]);
    setRoomCode('');
  };

  const sendMessage = () => {
    if (!socket || !currentRoom || !input.trim()) return;
    
    socket.emit('room:message', {
      roomId: currentRoom,
      content: input,
    });
    
    setInput('');
  };

  if (!currentRoom) {
    return (
      <div className="min-h-screen bg-bg">
        <header className="sticky top-0 z-10 border-b border-white/5 bg-bg/80 backdrop-blur">
          <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-white">SocraTeach</h1>
              <Link to="/dashboard" className="text-sm text-slate-300 hover:text-white">
                ← Dashboard
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-xs text-slate-400">
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <button onClick={logout} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5">
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white">Collaboration</h2>
            <p className="mt-2 text-slate-400">Work together with other students in real-time</p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Create Room */}
            <div className="rounded-2xl border border-white/5 bg-surface p-8">
              <h3 className="mb-4 text-xl font-semibold text-white">Create a Room</h3>
              <p className="mb-6 text-slate-400">Start a new collaboration session</p>
              <button
                onClick={createRoom}
                disabled={!connected}
                className="w-full rounded-xl bg-primary p-3 font-semibold text-black hover:bg-primary/90 disabled:opacity-50"
              >
                Create Room
              </button>
              {roomCode && (
                <div className="mt-4 rounded-xl bg-white/5 p-4 text-center">
                  <div className="text-sm text-slate-400">Room Code</div>
                  <div className="mt-1 text-2xl font-bold text-primary">{roomCode}</div>
                  <div className="mt-2 text-xs text-slate-500">Share this code with others to join</div>
                </div>
              )}
            </div>

            {/* Join Room */}
            <div className="rounded-2xl border border-white/5 bg-surface p-8">
              <h3 className="mb-4 text-xl font-semibold text-white">Join a Room</h3>
              <p className="mb-6 text-slate-400">Enter a room code to join</p>
              <div className="space-y-3">
                <input
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Enter room code"
                  className="w-full rounded-xl bg-bg border border-white/10 p-3 text-center text-xl font-mono text-white placeholder:text-slate-500 focus:border-primary focus:outline-none"
                  maxLength={6}
                />
                <button
                  onClick={joinRoom}
                  disabled={!connected || !roomCode.trim()}
                  className="w-full rounded-xl bg-primary/10 border border-primary/30 p-3 font-semibold text-primary hover:bg-primary/20 disabled:opacity-50"
                >
                  Join Room
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-bg">
      <header className="border-b border-white/5 bg-surface px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={leaveRoom} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5">
              ← Leave Room
            </button>
            <div>
              <div className="text-sm text-slate-400">Room Code</div>
              <div className="font-mono font-bold text-white">{currentRoom}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {participants.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  className="h-8 w-8 rounded-full bg-primary/20 border-2 border-surface flex items-center justify-center text-xs font-semibold text-primary"
                  title={p.name}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {participants.length > 3 && (
                <div className="h-8 w-8 rounded-full bg-white/5 border-2 border-surface flex items-center justify-center text-xs text-slate-400">
                  +{participants.length - 3}
                </div>
              )}
            </div>
            <button onClick={logout} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-400">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.userId === user?.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-2xl p-4 ${
                msg.userId === user?.id
                  ? 'bg-primary/10 border border-primary/30'
                  : 'bg-surface border border-white/5'
              }`}>
                <div className="text-xs text-slate-400 mb-1">{msg.userName}</div>
                <div className="text-white">{msg.content}</div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-white/5 bg-surface p-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Type a message..."
            disabled={!connected}
            className="flex-1 rounded-xl bg-bg border border-white/10 p-3 text-white placeholder:text-slate-500 focus:border-primary focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!connected || !input.trim()}
            className="rounded-xl bg-primary px-6 py-3 font-semibold text-black hover:bg-primary/90 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

