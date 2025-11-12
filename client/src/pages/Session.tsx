import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import api, { getSessionJourney, getSessionReport } from '../api';
import type { TimelineEntry, SessionReport } from '../api';
import EndSessionModal from '../components/EndSessionModal';
import MathRenderer from '../components/MathRenderer';
import JourneyReplay from '../components/JourneyReplay';
import ConceptMap from '../components/ConceptMap';
import ReasoningScoreCard from '../components/ReasoningScoreCard';
import TransferGauge from '../components/TransferGauge';
import CalibrationCard from '../components/CalibrationCard';
// ComplianceScoreCard removed in strict mode
import { MessageCircle, Play, BarChart3, ArrowLeft, X, Send, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

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

// Removed client-side fallback generation; strict Socratic mode relies on engine

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
      'clarification': 'text-blue-700',
      'assumptions': 'text-purple-700', 
      'evidence': 'text-emerald-700',
      'perspective': 'text-yellow-700',
      'implications': 'text-red-700',
      'meta_questioning': 'text-indigo-700'
    };
    return colors[type] || 'text-gray-600';
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
    <div className="w-1/3 border-l-2 border-amber-200 bg-white/80 backdrop-blur p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-amber-600 text-xl">💡</span>
          <h3 className="font-semibold text-gray-900">Learning Insights</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-amber-50 text-gray-700 hover:text-gray-900 transition-all"
        >
          ✕
        </button>
      </div>

      {/* Learning Progress */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Learning Progress</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Conversation Depth</span>
            <span className="text-sm text-gray-900 font-semibold">{analytics.currentDepth}/5</span>
          </div>
          <div className="w-full bg-amber-100 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-amber-500 to-orange-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(analytics.currentDepth / 5) * 100}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Engagement Level</span>
            <span className={`text-sm font-semibold ${engagement.color}`}>{engagement.label}</span>
          </div>
          <div className="w-full bg-amber-100 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500 h-2 rounded-full"
              style={{ width: `${analytics.engagementScore * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question Types Used */}
      {analytics.questionTypeDistribution && Object.keys(analytics.questionTypeDistribution).length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Question Types Explored</h4>
          <div className="space-y-2">
            {Object.entries(analytics.questionTypeDistribution).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className={`text-sm ${getQuestionTypeColor(type)}`}>
                  {formatQuestionType(type)}
                </span>
                <span className="text-xs text-gray-600 font-medium">{count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Concepts Explored */}
      {analytics.conceptsExplored && analytics.conceptsExplored.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Concepts Explored</h4>
          <div className="flex flex-wrap gap-1">
            {analytics.conceptsExplored.map((concept, i) => (
              <span 
                key={i}
                className="rounded-full bg-amber-100 border border-amber-300 px-2 py-1 text-xs text-amber-800 font-medium"
              >
                {concept}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent Question Analysis */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Interactions</h4>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {messages.slice(-4).filter(m => m.role === 'assistant').map((msg, i) => (
            <div key={i} className="p-2 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-2 mb-1">
                {msg.questionType && (
                  <span className={`text-xs ${getQuestionTypeColor(msg.questionType)}`}>
                    {formatQuestionType(msg.questionType)}
                  </span>
                )}
                {msg.depthLevel && (
                  <span className="text-xs text-gray-600 font-medium">
                    L{msg.depthLevel}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-700 line-clamp-2">
                {msg.content}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Learning Recommendations */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Recommendations</h4>
        <div className="space-y-2">
          {analytics.currentDepth < 3 && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-blue-50 border border-blue-200">
              <span className="text-blue-600 mt-0.5 flex-shrink-0">🎯</span>
              <div>
                <p className="text-xs text-blue-800 font-medium">Deepen Understanding</p>
                <p className="text-xs text-blue-700">Try asking "why" or "how" questions</p>
              </div>
            </div>
          )}
          
          {analytics.engagementScore < 0.5 && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-50 border border-yellow-200">
              <span className="text-yellow-600 mt-0.5 flex-shrink-0">📈</span>
              <div>
                <p className="text-xs text-yellow-800 font-medium">Boost Engagement</p>
                <p className="text-xs text-yellow-700">Share more detailed thoughts</p>
              </div>
            </div>
          )}
          
          {analytics.metacognitivePrompts > 0 && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-purple-50 border border-purple-200">
              <span className="text-purple-600 mt-0.5 flex-shrink-0">💬</span>
              <div>
                <p className="text-xs text-purple-800 font-medium">Reflect on Learning</p>
                <p className="text-xs text-purple-700">Consider your problem-solving approach</p>
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
  const location = useLocation();
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
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'chat' | 'replay' | 'insights'>('chat');
  
  // Behavioral learning data
  const [journeyData, setJourneyData] = useState<TimelineEntry[]>([]);
  // Compliance data removed
  const [reportData, setReportData] = useState<SessionReport | null>(null);
  const [loadingBehavioralData, setLoadingBehavioralData] = useState(false);
  const sessionInitRef = useRef(false);

  

  useEffect(() => {
    const submittedProblemId = searchParams.get('submittedProblemId');
    interface SubmittedProblemState {
      submittedProblem?: {
        problemText?: string;
        problemType?: string;
        difficultyLevel?: number;
      };
    }
    const state = location.state as SubmittedProblemState | null;
    const submittedProblem = state?.submittedProblem;
    
    console.log('[Session] useEffect triggered', { id, submittedProblemId, useEnhancedMode });
    
    if (submittedProblemId) {
      if (sessionInitRef.current) {
        console.log('[Session] Skipping duplicate init under StrictMode');
        return;
      }
      sessionInitRef.current = true;
      console.log('[Session] Creating session from submitted problem:', submittedProblemId);
      // Handle submitted problem (from problem submission)
      (async () => {
        const cleanedId = (submittedProblemId || '').trim();
        const idLooksValid = cleanedId.length > 0 && cleanedId.toLowerCase() !== 'null';
        let fallback = submittedProblem;
        if (!fallback) {
          try {
            const fetched = await api.get(`/problems/submitted/${cleanedId}`);
            const d = fetched.data?.data;
            fallback = {
              problemText: d?.description,
              problemType: d?.type,
              difficultyLevel: typeof d?.difficulty === 'number' ? d.difficulty : 1,
            };
            console.log('[Session] Fetched submitted problem details:', d);
          } catch {
            console.warn('[Session] Could not fetch submitted problem details; proceeding without fallback');
          }
        }

        if (idLooksValid) {
          try {
            // Attempt session creation using submittedProblemId only when valid
            return await api.post('/sessions', {
              submittedProblemId: cleanedId,
              useEnhancedEngine: true
            });
          } catch (err) {
            console.warn('[Session] submittedProblemId rejected; creating session without it');
          }
        }

        // Create session without submittedProblemId using available details
        return api.post('/sessions', {
          problemText: fallback?.problemText || 'General Socratic learning session',
          problemType: fallback?.problemType || 'math',
          difficultyLevel: typeof fallback?.difficultyLevel === 'number' ? (fallback as any).difficultyLevel : 5,
          useEnhancedEngine: true
        });
      })().then(res => {
        console.log('[Session] Session created successfully:', res.data);
        const sessionData = res.data.data;
        setSessionId(sessionData.id);
        setProblem({
          description: sessionData.problemText,
          type: sessionData.problemType,
          difficultyLevel: sessionData.difficultyLevel,
        });

        const initial = sessionData.initialResponse || res.data.openingTutorResponse;
        const preview = (sessionData.problemText || '').trim();
        const short = preview.length > 220 ? `${preview.slice(0, 220)}…` : preview;
        const fallbackGreeting = `Hi! I’m your Socratic tutor. I see we’re working on: "${short}". Let’s tackle this together—what are we trying to find or show, and what’s a small first step you might try?`;
        const opening = initial || fallbackGreeting;
        setMessages([{ 
          role: 'assistant',
          content: opening,
          timestamp: new Date(),
          questionType: useEnhancedMode ? 'clarification' : undefined,
          depthLevel: useEnhancedMode ? 1 : undefined
        }]);
      }).catch(err => {
        console.error('[Session] Failed to create session:', err.response?.data || err.message);
        // Keep user on the session page without injecting fallback tutor messages
        setProblem({ description: 'Custom Socratic session', type: 'math', difficultyLevel: 1 });
      });
    } else if (id && id !== 'new') {
      if (sessionInitRef.current) {
        console.log('[Session] Skipping duplicate init under StrictMode');
        return;
      }
      sessionInitRef.current = true;
      console.log('[Session] Loading problem by ID:', id);
      // Handle regular problem (from problem bank)
      let loadedProblemData: Problem; // Store problem data for later use
      
      api.get(`/problems/${id}`).then(res => {
        console.log('[Session] Problem loaded:', res.data);
        loadedProblemData = res.data.data;
        setProblem(loadedProblemData);
        
        console.log('[Session] Creating session for problem:', loadedProblemData.id);
        // Create session with enhanced features
        return api.post('/sessions', {
          problemId: loadedProblemData.id,
          problemText: loadedProblemData.description,
          problemType: loadedProblemData.type,
          difficultyLevel: loadedProblemData.difficultyLevel,
          useEnhancedEngine: true
        });
      }).then(res => {
        console.log('[Session] Session created successfully:', res.data);
        const newSessionId = res.data.data.id;
        setSessionId(newSessionId);

        const initial = res.data.data.initialResponse || res.data.openingTutorResponse;
        const preview = (loadedProblemData.description || '').trim();
        const short = preview.length > 220 ? `${preview.slice(0, 220)}…` : preview;
        const fallbackGreeting = `Hi! I’m your Socratic tutor. I see we’re working on: "${short}". Let’s tackle this together—what are we trying to find or show, and what’s a small first step you might try?`;
        const opening = initial || fallbackGreeting;
        setMessages([{ 
          role: 'assistant',
          content: opening,
          timestamp: new Date(),
          questionType: 'clarification',
          depthLevel: 1
        }]);
      }).catch(err => {
        console.error('[Session] Failed to load problem or create session:', err.response?.data || err.message);
        // Keep user on the session page without injecting fallback tutor messages
        setProblem({ description: 'Custom Socratic session', type: 'math', difficultyLevel: 1 });
      });
    } else {
      console.log('[Session] No valid ID or submittedProblemId, staying on loading...');
    }
  }, [id, searchParams, navigate, useEnhancedMode, location]);

  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Fetch behavioral learning data when sessionId is available
  const fetchBehavioralData = useCallback(async () => {
    if (!sessionId) return;
    setLoadingBehavioralData(true);
    try {
      const [journey, report] = await Promise.all([
        getSessionJourney(sessionId).catch(() => []),
        getSessionReport(sessionId).catch(() => null),
      ]);
      setJourneyData(journey);
      setReportData(report);
    } catch (err) {
      console.error('Failed to load behavioral data:', err);
    } finally {
      setLoadingBehavioralData(false);
    }
  }, [sessionId]);

  // Fetch behavioral data when switching to Replay or Insights tab
  useEffect(() => {
    if ((activeTab === 'replay' || activeTab === 'insights') && sessionId && journeyData.length === 0) {
      fetchBehavioralData();
    }
  }, [activeTab, sessionId, journeyData, fetchBehavioralData]);

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

        // Backend returns: { success, message, tutorResponse, questionType, depthLevel, targetedConcepts, analytics, ... }
        const responseData = response.data;
        
        // Extract tutor response - backend returns it directly at response.data.tutorResponse
        const tutorResponse = responseData?.tutorResponse;
        
        if (!tutorResponse) {
          console.error('No tutor response found in response:', responseData);
          throw new Error('No tutor response received from server');
        }
        
        const assistantMessage: EnhancedMessage = {
          role: 'assistant',
          content: tutorResponse,
          timestamp: new Date(),
          questionType: responseData?.questionType,
          depthLevel: responseData?.depthLevel,
          targetedConcepts: responseData?.targetedConcepts
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        // Update analytics if provided
        if (responseData?.analytics) {
          setAnalytics(responseData.analytics);
        }
      } else {
        // Use basic endpoint (still Socratic; no fallback)
        await api.post(`/sessions/${sessionId}/interactions`, {
          type: 'question',
          content: input,
        });

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Can you explain what you tried and where your thinking hit a snag? What do you think the problem is asking you to find?',
          timestamp: new Date(),
          questionType: 'clarification',
          depthLevel: 1
        }]);
      }

    } catch (err: any) {
      console.error('Failed to send message:', err);
      
      // Show user-friendly error message
      const errorMessage = err?.response?.data?.message || 
                          err?.message || 
                          'Failed to get tutor response. Please try again.';
      
      // Add error message to chat so user knows what happened
      const errorAssistantMessage: EnhancedMessage = {
        role: 'assistant',
        content: `I'm having trouble processing that right now. ${errorMessage} Could you try rephrasing your question?`,
        timestamp: new Date(),
        questionType: 'clarification',
        depthLevel: 1
      };
      
      setMessages(prev => [...prev, errorAssistantMessage]);
      
      // Show toast notification
      toast.error(errorMessage);
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
      // Keep user in the session and still allow ending without redirect
      setShowEndModal(true);
    }
  };

  const getQuestionTypeColor = (questionType?: string): string => {
    const colors: Record<string, string> = {
      'clarification': 'bg-blue-100 text-blue-800 border border-blue-300',
      'assumptions': 'bg-purple-100 text-purple-800 border border-purple-300',
      'evidence': 'bg-emerald-100 text-emerald-800 border border-emerald-300',
      'perspective': 'bg-yellow-100 text-yellow-800 border border-yellow-300',
      'implications': 'bg-red-100 text-red-800 border border-red-300',
      'meta_questioning': 'bg-indigo-100 text-indigo-800 border border-indigo-300'
    };
    return colors[questionType || ''] || 'bg-gray-100 text-gray-800 border border-gray-300';
  };

  if (!problem) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
          <span className="text-gray-700 font-medium">Loading session…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b-2 border-amber-200 px-6 py-4 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-xl hover:bg-amber-50 text-gray-700 hover:text-amber-800 transition-all group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">{problem.title || 'Socratic Session'}</h1>
              <p className="text-sm text-gray-600 mt-0.5">{problem.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'chat' && (
              <button
                onClick={() => setShowInsights(s => !s)}
                className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-gray-700 hover:text-amber-900 text-sm font-medium transition-all"
              >
                {showInsights ? 'Hide' : 'Show'} Insights
              </button>
            )}
            <button
              onClick={handleQuit}
              className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 hover:text-red-800 text-sm font-medium transition-all flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              End Session
            </button>
          </div>
        </div>
        
        {/* Floating Tab Navigation */}
        <div className="flex justify-center mt-4">
          <div className="bg-white rounded-2xl p-1.5 inline-flex gap-1 border-2 border-amber-200 shadow-md">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'chat'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
                  : 'text-gray-700 hover:text-amber-900 hover:bg-amber-50'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              Chat
            </button>
            <button
              onClick={() => setActiveTab('replay')}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'replay'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
                  : 'text-gray-700 hover:text-amber-900 hover:bg-amber-50'
              }`}
            >
              <Play className="w-4 h-4" />
              Replay
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'insights'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
                  : 'text-gray-700 hover:text-amber-900 hover:bg-amber-50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Insights
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Tab Content */}
        {activeTab === 'chat' && (
          <>
            {/* Chat Area */}
            <div className={`flex-1 flex flex-col ${showInsights ? 'w-2/3' : 'w-full'}`}>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                <div className={`max-w-2xl px-5 py-3.5 rounded-2xl shadow-md ${
                  m.role === 'user' 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white' 
                    : 'bg-white/80 backdrop-blur border-2 border-amber-200'
                }`}>
                  <div className={`text-sm leading-relaxed whitespace-pre-wrap ${m.role === 'assistant' ? 'text-gray-900' : ''}`}>
                    <MathRenderer content={m.content} />
                  </div>
                  {m.role === 'assistant' && m.questionType && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className={`text-xs px-3 py-1 rounded-full ${getQuestionTypeColor(m.questionType)}`}>
                        {m.questionType.replace('_', ' ')}
                      </span>
                      {m.depthLevel && (
                        <span className="text-xs text-gray-600 font-medium">
                          Level {m.depthLevel}
                        </span>
                      )}
                    </div>
                  )}
                  <p className={`text-xs mt-2 font-medium ${m.role === 'user' ? 'text-amber-100' : 'text-gray-500'}`}>
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start animate-fade-in">
                <div className="max-w-2xl bg-white/80 backdrop-blur border-2 border-amber-200 px-5 py-3.5 rounded-2xl shadow-md">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                    <p className="text-sm text-gray-700">Thinking…</p>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="bg-white/80 backdrop-blur border-t-2 border-amber-200 px-6 py-5">
            {useEnhancedMode && (
              <div className="mb-4 flex items-center gap-4">
                <label className="text-sm font-medium text-gray-900">Confidence Level</label>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={confidenceLevel}
                  onChange={(e) => setConfidenceLevel(Number(e.target.value))}
                  className="flex-1 accent-amber-600"
                />
                <span className="text-sm font-semibold text-gray-900 min-w-[2rem] text-center">
                  {confidenceLevel}
                </span>
              </div>
            )}
            <div className="flex gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                rows={2}
                className="flex-1 bg-white rounded-xl border-2 border-amber-200 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500 resize-none transition-all"
                placeholder="Type your response…"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
              </div>
            </div>

            {/* Insights Panel */}
            {showInsights && analytics && (
              <SocraticInsights analytics={analytics} messages={messages} onClose={() => setShowInsights(false)} />
            )}
          </>
        )}

        {/* Replay Tab */}
        {activeTab === 'replay' && (
          <div className="flex-1 overflow-auto p-8">
            {loadingBehavioralData ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
                  <span className="text-gray-700 font-medium">Loading journey data...</span>
                </div>
              </div>
            ) : journeyData.length > 0 ? (
              <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent mb-2">Learning Journey Replay</h2>
                  <p className="text-gray-600">Review your learning progression step by step</p>
                </div>
                <div className="bg-white/80 backdrop-blur rounded-2xl p-6 border-2 border-amber-200 shadow-lg">
                  <JourneyReplay timeline={journeyData} sessionId={sessionId || ''} />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="bg-white/80 backdrop-blur rounded-2xl p-12 text-center max-w-md border-2 border-amber-200 shadow-lg">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
                    <Play className="w-8 h-8 text-amber-600" />
                  </div>
                  <p className="text-gray-900 font-semibold mb-2">No Journey Data Yet</p>
                  <p className="text-sm text-gray-600">Continue your session to generate learning insights and track your progress.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="flex-1 overflow-auto p-8">
            {loadingBehavioralData ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
                  <span className="text-gray-700 font-medium">Loading insights...</span>
                </div>
              </div>
            ) : (
              <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent mb-2">Learning Insights</h2>
                  <p className="text-gray-600">Detailed analysis of your learning progress</p>
                </div>
                
                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {reportData && <ReasoningScoreCard report={reportData} />}
                  {reportData && <TransferGauge report={reportData} />}
                  {reportData && <CalibrationCard report={reportData} />}
                  {/* Compliance card removed; strict Socratic mode without direct-answer compliance */}
                </div>

                {/* Concept Map */}
                {analytics?.conceptsExplored && analytics.conceptsExplored.length > 0 && (
                  <div className="bg-white/80 backdrop-blur rounded-2xl p-6 border-2 border-amber-200 shadow-lg">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Concept Map</h3>
                    <ConceptMap conceptualConnections={analytics.conceptsExplored} />
                  </div>
                )}

                {/* Empty State */}
                {!reportData && (
                  <div className="flex items-center justify-center min-h-[400px]">
                    <div className="bg-white/80 backdrop-blur rounded-2xl p-12 text-center max-w-md border-2 border-amber-200 shadow-lg">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
                        <BarChart3 className="w-8 h-8 text-amber-600" />
                      </div>
                      <p className="text-gray-900 font-semibold mb-2">No Insights Available</p>
                      <p className="text-sm text-gray-600">Continue your session to generate learning metrics and track your understanding.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
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