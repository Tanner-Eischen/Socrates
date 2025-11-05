import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import MathRenderer from '../components/MathRenderer';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function Session() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [problem, setProblem] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const submittedProblemId = searchParams.get('submittedProblemId');
    
    if (submittedProblemId) {
      // Handle submitted problem (from problem submission)
      // Create session with submitted problem ID
      api.post('/sessions', {
        submittedProblemId: submittedProblemId,
      }).then(res => {
        const sessionData = res.data.data;
        setSessionId(sessionData.id);
        setProblem({
          description: sessionData.problemText,
          type: sessionData.problemType,
          difficultyLevel: sessionData.difficultyLevel,
        });
        
        // Add initial message
        setMessages([{
          role: 'assistant',
          content: `I've analyzed your problem. Let's work through it together. What's your initial approach or what part would you like to start with?`,
          timestamp: new Date(),
        }]);
      }).catch(err => {
        console.error('Failed to create session:', err);
        navigate('/dashboard');
      });
    } else if (id && id !== 'new') {
      // Handle regular problem (from problem bank)
      api.get(`/problems/${id}`).then(res => {
        const problemData = res.data.data;
        setProblem(problemData);
        
        // Create session
        return api.post('/sessions', {
          problemId: problemData.id,
          problemText: problemData.description,
          problemType: problemData.type,
          difficultyLevel: problemData.difficultyLevel,
        });
      }).then(res => {
        setSessionId(res.data.data.id);
        // Add initial message
        setMessages([{
          role: 'assistant',
          content: `Let's work on this problem together. What's your initial approach?`,
          timestamp: new Date(),
        }]);
      }).catch(err => {
        console.error('Failed to load problem:', err);
        navigate('/problems');
      });
    }
  }, [id, searchParams, navigate]);

  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !sessionId) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Send interaction to backend
      await api.post(`/sessions/${sessionId}/interactions`, {
        type: 'question',
        content: input,
      });

      // For now, add a simple response
      // In production, backend should return the Socratic response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Great question! Let me guide you... (Backend integration needed)',
        timestamp: new Date(),
      }]);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!problem) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="text-slate-400">Loading session...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-bg">
      {/* Header */}
      <header className="border-b border-white/5 bg-surface px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/problems')}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5"
            >
              ← Back
            </button>
            <h2 className="font-semibold text-white">{problem.title}</h2>
          </div>
          <button
            onClick={logout}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl p-4 ${
                msg.role === 'user'
                  ? 'bg-primary/10 border border-primary/30 text-white'
                  : 'bg-surface border border-white/5 text-slate-200'
              }`}
            >
              <MathRenderer content={msg.content} />
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl border border-white/5 bg-surface p-4 text-slate-400">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/5 bg-surface p-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Type your answer or question..."
            disabled={loading}
            className="flex-1 rounded-xl bg-bg border border-white/10 p-3 text-white placeholder:text-slate-500 focus:border-primary focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="rounded-xl bg-primary px-6 py-3 font-semibold text-black hover:bg-primary/90 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

