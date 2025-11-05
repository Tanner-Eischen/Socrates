import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import EndSessionModal from '../components/EndSessionModal';

interface EnhancedMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  questionType?: string;
  depthLevel?: number;
  studentConfidence?: number;
  targetedConcepts?: string[];
}

interface SocraticAnalytics {
  questionTypesUsed: string[];
  questionTypeDistribution: Record<string, number>;
  averageDepth: number;
  currentDepth: number;
  conceptsExplored: string[];
  confidenceProgression: number[];
  engagementScore: number;
  totalInteractions: number;
  metacognitivePrompts: number;
}

interface Problem {
  id?: string;
  title?: string;
  description: string;
  type: string;
  difficultyLevel: number;
  tags?: string[];
  category?: string;
}

// Socratic Insights Panel Component (integrated)
function SocraticInsights({ 
  analytics, 
  messages, 
  onClose 
}: {
  analytics: SocraticAnalytics;
  messages: EnhancedMessage[];
  onClose: () => void;
}) {
  const getQuestionTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      'clarification': 'text-blue-400',
      'assumptions': 'text-purple-400', 
      'evidence': 'text-green-400',
      'perspective': 'text-yellow-400',
      'implications': 'text-red-400',
      'meta_questioning': 'text-indigo-400'
    };
    return colors[type] || 'text-gray-400';
  };

  const formatQuestionType = (type: string): string => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getEngagementLevel = (score: number): { label: string; color: string } => {
    if (score >= 0.8) return { label: 'Excellent', color: 'text-green-400' };
    if (score >= 0.6) return { label: 'Good', color: 'text-blue-400' };
    if (score >= 0.4) return { label: 'Moderate', color: 'text-yellow-400' };
    return { label: 'Needs Improvement', color: 'text-red-400' };
  };

  const engagement = getEngagementLevel(analytics.engagementScore);

  return (
    <div className="w-1/3 border-l border-slate-700 bg-slate-900 p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-green-400 text-xl">💡</span>
          <h3 className="font-semibold text-gray-100">Learning Insights</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-800 text-gray-300 hover:text-gray-100"
        >
          ✕
        </button>
      </div>

      {/* Learning Progress */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Learning Progress</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Conversation Depth</span>
            <span className="text-sm text-gray-100">{analytics.currentDepth}/5</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div 
              className="bg-green-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(analytics.currentDepth / 5) * 100}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Engagement Level</span>
            <span className={`text-sm ${engagement.color}`}>{engagement.label}</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full"
              style={{ width: `${analytics.engagementScore * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question Types Used */}
      {analytics.questionTypeDistribution && Object.keys(analytics.questionTypeDistribution).length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Question Types Explored</h4>
          <div className="space-y-2">
            {Object.entries(analytics.questionTypeDistribution).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className={`text-sm ${getQuestionTypeColor(type)}`}>
                  {formatQuestionType(type)}
                </span>
                <span className="text-xs text-gray-400">{count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Concepts Explored */}
      {analytics.conceptsExplored && analytics.conceptsExplored.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Concepts Explored</h4>
          <div className="flex flex-wrap gap-1">
            {analytics.conceptsExplored.map((concept, i) => (
              <span 
                key={i}
                className="rounded-full bg-green-900/30 border border-green-700/40 px-2 py-1 text-xs text-green-300"
              >
                {concept}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent Question Analysis */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Recent Interactions</h4>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {messages.slice(-4).filter(m => m.role === 'assistant').map((msg, i) => (
            <div key={i} className="p-2 rounded-lg bg-slate-800 border border-slate-700">
              <div className="flex items-center gap-2 mb-1">
                {msg.questionType && (
                  <span className={`text-xs ${getQuestionTypeColor(msg.questionType)}`}>
                    {formatQuestionType(msg.questionType)}
                  </span>
                )}
                {msg.depthLevel && (
                  <span className="text-xs text-gray-400">
                    L{msg.depthLevel}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-300 line-clamp-2">
                {msg.content}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Learning Recommendations */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Recommendations</h4>
        <div className="space-y-2">
          {analytics.currentDepth < 3 && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-blue-900/20 border border-blue-700/30">
              <span className="text-blue-300 mt-0.5 flex-shrink-0">🎯</span>
              <div>
                <p className="text-xs text-blue-300 font-medium">Deepen Understanding</p>
                <p className="text-xs text-blue-200/80">Try asking "why" or "how" questions</p>
              </div>
            </div>
          )}
          
          {analytics.engagementScore < 0.5 && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-900/20 border border-yellow-700/30">
              <span className="text-yellow-300 mt-0.5 flex-shrink-0">📈</span>
              <div>
                <p className="text-xs text-yellow-300 font-medium">Boost Engagement</p>
                <p className="text-xs text-yellow-200/80">Share more detailed thoughts</p>
              </div>
            </div>
          )}
          
          {analytics.metacognitivePrompts > 0 && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-purple-900/20 border border-purple-700/30">
              <span className="text-purple-300 mt-0.5 flex-shrink-0">💬</span>
              <div>
                <p className="text-xs text-purple-300 font-medium">Reflect on Learning</p>
                <p className="text-xs text-purple-200/80">Consider your problem-solving approach</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Session Component
export default function Session() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<EnhancedMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [analytics, setAnalytics] = useState<SocraticAnalytics | null>(null);
  const [confidenceLevel, setConfidenceLevel] = useState(5);
  const [useEnhancedMode] = useState(true);
  const [showEndModal, setShowEndModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const submittedProblemId = searchParams.get('submittedProblemId');
    
    if (submittedProblemId) {
      // Handle submitted problem (from problem submission)
      api.post('/sessions', {
        submittedProblemId: submittedProblemId,
        useEnhancedEngine: useEnhancedMode
      }).then(res => {
        const sessionData = res.data.data;
        setSessionId(sessionData.id);
        setProblem({
          description: sessionData.problemText,
          type: sessionData.problemType,
          difficultyLevel: sessionData.difficultyLevel,
        });
        
        // Add initial enhanced message
        setMessages([{
          role: 'assistant',
          content: `I'm excited to explore this problem with you! What's your initial understanding of what we're looking for?`,
          timestamp: new Date(),
          questionType: useEnhancedMode ? 'clarification' : undefined,
          depthLevel: useEnhancedMode ? 1 : undefined
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
        
        // Create session with enhanced features
        return api.post('/sessions', {
          problemId: problemData.id,
          problemText: problemData.description,
          problemType: problemData.type,
          difficultyLevel: problemData.difficultyLevel,
          useEnhancedEngine: useEnhancedMode
        });
      }).then(res => {
        setSessionId(res.data.data.id);
        // Add initial enhanced message
        setMessages([{
          role: 'assistant',
          content: `Let's work on this problem together. What's your initial approach?`,
          timestamp: new Date(),
          questionType: useEnhancedMode ? 'clarification' : undefined,
          depthLevel: useEnhancedMode ? 1 : undefined
        }]);
      }).catch(err => {
        console.error('Failed to load problem:', err);
        navigate('/problems');
      });
    }
  }, [id, searchParams, navigate, useEnhancedMode]);

  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !sessionId) return;

    const userMessage: EnhancedMessage = {
      role: 'user',
      content: input,
      timestamp: new Date(),
      studentConfidence: useEnhancedMode ? confidenceLevel / 10 : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      let response;
      
      if (useEnhancedMode) {
        // Use enhanced endpoint
        response = await api.post(`/sessions/${sessionId}/enhanced-interactions`, {
          type: 'student_response',
          content: input,
          confidenceLevel: confidenceLevel / 10,
          metadata: {
            responseTime: Date.now()
          }
        });

        const enhancedResponse = response.data;
        
        const assistantMessage: EnhancedMessage = {
          role: 'assistant',
          content: enhancedResponse.tutorResponse,
          timestamp: new Date(),
          questionType: enhancedResponse.questionType,
          depthLevel: enhancedResponse.depthLevel,
          targetedConcepts: enhancedResponse.targetedConcepts
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        // Update analytics
        if (enhancedResponse.analytics) {
          setAnalytics(enhancedResponse.analytics);
        }
      } else {
        // Use basic endpoint
        await api.post(`/sessions/${sessionId}/interactions`, {
          type: 'question',
          content: input,
        });

        // Basic response (you'd implement actual Socratic response here)
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Great question! Let me guide you... What do you think the next step should be?',
          timestamp: new Date(),
        }]);
      }

    } catch (err) {
      console.error('Failed to send message:', err);
      // Fallback response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I understand your thinking. Can you tell me more about your approach?',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuit = async () => {
    if (!sessionId) return;
    try {
      const res = await api.get(`/sessions/${sessionId}/analytics`);
      setAnalytics(res.data.data);
      setShowEndModal(true);
    } catch (err) {
      console.error(err);
      navigate('/dashboard');
    }
  };

  const getQuestionTypeColor = (questionType?: string): string => {
    const colors: Record<string, string> = {
      'clarification': 'bg-blue-900/30 text-blue-300',
      'assumptions': 'bg-purple-900/30 text-purple-300',
      'evidence': 'bg-green-900/30 text-green-300',
      'perspective': 'bg-yellow-900/30 text-yellow-300',
      'implications': 'bg-red-900/30 text-red-300',
      'meta_questioning': 'bg-indigo-900/30 text-indigo-300'
    };
    return colors[questionType || ''] || 'bg-slate-800 text-gray-300';
  };

  if (!problem) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-gray-400">Loading session…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-300 text-sm transition"
            >
              ← Dashboard
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-100">{problem.title || 'Socratic Session'}</h1>
              <p className="text-xs text-gray-400">{problem.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInsights(s => !s)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-300 text-sm transition"
            >
              {showInsights ? 'Hide' : 'Show'} Insights
            </button>
            <button
              onClick={handleQuit}
              className="px-3 py-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-300 text-sm transition"
            >
              Quit Session
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat Area */}
        <div className={`flex-1 flex flex-col ${showInsights ? 'w-2/3' : 'w-full'}`}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xl px-4 py-2 rounded-xl ${m.role === 'user' ? 'bg-green-600 text-white' : 'bg-slate-800 text-gray-100'}`}>
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  {m.role === 'assistant' && m.questionType && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getQuestionTypeColor(m.questionType)}`}>
                        {m.questionType.replace('_', ' ')}
                      </span>
                      {m.depthLevel && <span className="text-xs text-gray-400">L{m.depthLevel}</span>}
                    </div>
                  )}
                  <p className="text-xs opacity-60 mt-1">{m.timestamp.toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-xl px-4 py-2 rounded-xl bg-slate-800 text-gray-100">
                  <p className="text-sm">Thinking…</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-800 bg-slate-900/80 px-4 py-3">
            {useEnhancedMode && (
              <div className="mb-3 flex items-center gap-3">
                <label className="text-xs text-gray-400">Confidence</label>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={confidenceLevel}
                  onChange={(e) => setConfidenceLevel(Number(e.target.value))}
                  className="flex-1 accent-green-500"
                />
                <span className="text-xs text-gray-300 w-6">{confidenceLevel}</span>
              </div>
            )}
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                rows={2}
                className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-green-400 focus:border-green-400"
                placeholder="Type your response…"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Insights Panel */}
        {showInsights && analytics && (
          <SocraticInsights analytics={analytics} messages={messages} onClose={() => setShowInsights(false)} />
        )}
      </div>

      {/* End Session Modal */}
      <EndSessionModal 
        open={showEndModal} 
        onClose={() => setShowEndModal(false)} 
        analytics={analytics ? {
          totalQuestions: analytics.totalInteractions || 0,
          socraticCompliance: analytics.engagementScore || 0,
          difficultyProgression: analytics.confidenceProgression || [],
          conceptsExplored: analytics.conceptsExplored || [],
          questionTypes: analytics.questionTypeDistribution || {},
          metacognitivePrompts: analytics.metacognitivePrompts || 0,
        } : null} 
      />
    </div>
  );
}