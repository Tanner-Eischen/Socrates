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
              <button
                onClick={createRoom}
                disabled={!connected}
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 p-3 font-semibold text-white shadow-md transition-all disabled:opacity-50"
              >
                Create Room
              </button>
              {roomCode && (
                <div className="mt-4 rounded-xl bg-amber-50 border-2 border-amber-200 p-4 text-center">
                  <div className="text-sm text-gray-600 font-medium">Room Code</div>
                  <div className="mt-1 text-2xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">{roomCode}</div>
                  <div className="mt-2 text-xs text-gray-500">Share this code with others to join</div>
                </div>
              )}
            </div>

            {/* Join Room */}
            <div className="rounded-2xl border-2 border-amber-200 bg-white/80 backdrop-blur-sm p-8 shadow-lg">
              <h3 className="mb-4 text-xl font-semibold text-gray-900">Join a Room</h3>
              <p className="mb-6 text-gray-600">Enter a room code to join</p>
              <div className="space-y-3">
                <input
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Enter room code"
                  className="w-full rounded-xl bg-white border-2 border-amber-200 p-3 text-center text-xl font-mono text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  maxLength={6}
                />
                <button
                  onClick={joinRoom}
                  disabled={!connected || !roomCode.trim()}
                  className="w-full rounded-xl bg-amber-50 border-2 border-amber-300 hover:bg-amber-100 p-3 font-semibold text-amber-700 transition-all disabled:opacity-50"
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
                  key={p.id}
                  className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border-2 border-white flex items-center justify-center text-xs font-semibold text-white shadow-md"
                  title={p.name}
                >
                  {p.name.charAt(0).toUpperCase()}
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
                <div className={`text-xs font-medium mb-1 ${msg.userId === user?.id ? 'text-amber-100' : 'text-gray-600'}`}>{msg.userName}</div>
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

