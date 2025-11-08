import { useState, useEffect, useRef } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import { Avatar } from '../components/ui/avatar';
import { Send, Sparkles, BookOpen, Brain } from 'lucide-react';
import api from '../api';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export default function SocraticDemo() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const scrollArea = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }
  }, [messages]);

  // Initialize session
  useEffect(() => {
    startSession();
  }, []);

  const startSession = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.post('/sessions', {
        problemText: 'General Socratic learning session',
        problemType: 'math',
        difficultyLevel: 5, // 1-10 scale, 5 is intermediate
        useEnhancedEngine: true,
      });
      
      setSessionId(data.data.id);
      
      // Add welcome message
      setMessages([{
        id: '1',
        role: 'assistant',
        content: "I'm here to help you learn through the Socratic method. Instead of giving you direct answers, I'll guide you with thoughtful questions. What would you like to explore?",
        timestamp: new Date(),
      }]);
      setShowWelcome(false);
    } catch (error: any) {
      console.error('Failed to start session:', error);
      setMessages([{
        id: '1',
        role: 'assistant',
        content: `Failed to connect to backend. Please make sure the backend server is running on port 3333. Error: ${error.message}`,
        timestamp: new Date(),
      }]);
      setShowWelcome(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !sessionId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data } = await api.post(`/sessions/${sessionId}/enhanced-interactions`, {
        type: 'student_response',
        content: input,
        confidenceLevel: 0.5,
        metadata: {
          responseTime: Date.now(),
        },
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.tutorResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I apologize, but I encountered an error: ${error.message}. Please make sure the backend is running.`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="container mx-auto max-w-5xl h-screen flex flex-col p-4 md:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">
                  Socratic Tutor
                </h1>
                <p className="text-sm text-gray-600">Learning through guided questions</p>
              </div>
            </div>
            {sessionId && (
              <div className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-medium">
                Connected
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col border-2 border-amber-200 shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
          <ScrollArea className="flex-1 p-4 md:p-6" ref={scrollRef}>
            {showWelcome && messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-12">
                <div className="p-6 bg-gradient-to-br from-amber-100 to-orange-100 rounded-3xl shadow-lg">
                  <Sparkles className="w-16 h-16 text-amber-600" />
                </div>
                <div className="space-y-3 max-w-2xl">
                  <h2 className="text-2xl font-bold text-gray-800">Welcome to Your Socratic Tutor!</h2>
                  <p className="text-gray-600 leading-relaxed">
                    I'm here to help you learn through the Socratic method. Instead of giving you direct answers,
                    I'll guide you with thoughtful questions to help you discover the answers yourself.
                  </p>
                  <div className="grid md:grid-cols-3 gap-4 pt-4">
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                      <BookOpen className="w-8 h-8 text-amber-600 mb-2 mx-auto" />
                      <h3 className="font-semibold text-sm mb-1">Question-Based</h3>
                      <p className="text-xs text-gray-600">Learn through guided inquiry</p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                      <Brain className="w-8 h-8 text-orange-600 mb-2 mx-auto" />
                      <h3 className="font-semibold text-sm mb-1">Critical Thinking</h3>
                      <p className="text-xs text-gray-600">Develop deeper understanding</p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                      <Sparkles className="w-8 h-8 text-yellow-600 mb-2 mx-auto" />
                      <h3 className="font-semibold text-sm mb-1">AI-Powered</h3>
                      <p className="text-xs text-gray-600">Personalized guidance</p>
                    </div>
                  </div>
                  <p className="text-sm text-amber-700 font-medium pt-4">
                    Initializing your learning session...
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <Avatar className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                        <Brain className="w-4 h-4 text-white" />
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
                          : 'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}
                    >
                      <p className="text-sm md:text-base whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    </div>
                    {message.role === 'user' && (
                      <Avatar className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                        You
                      </Avatar>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <Avatar className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-white" />
                    </Avatar>
                    <div className="bg-gray-100 border border-gray-200 rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4 bg-white">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question or share what you're learning about..."
                className="flex-1 border-2 border-amber-200 focus:border-amber-400 focus:ring-amber-400"
                disabled={isLoading || !sessionId}
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !input.trim() || !sessionId}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-6"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Remember: I'll guide you with questions, not direct answers
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
