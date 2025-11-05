import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../components/ChatMessage";
import { ChatInput } from "../components/ChatInput";
import { ScrollArea } from "../components/ui/scroll-area";
import { DemoPanel } from "../components/DemoPanel";
import api, { submitProblemImage } from "../api";
import toast from "react-hot-toast";

interface Message {
  id: string;
  text: string;
  isAI: boolean;
  timestamp: string;
  imageUrl?: string;
  questionType?: string;
}

const initialMessages: Message[] = [
  {
    id: "1",
    text: "Hello! I'm your AI tutor. I'm here to help you learn and understand any topic. What would you like to study today?",
    isAI: true,
    timestamp: "10:00 AM",
  },
];

// Demo scenario data
const DEMO_SCENARIOS: Record<string, { problem: string; turns: string[] }> = {
  'algebra-beginner': {
    problem: 'Solve 2x + 5 = 13',
    turns: [
      "I don't know... maybe x is 8?",
      "Wait, that doesn't seem right. I'm confused about what to do.",
      "Oh, so I should do something to both sides? But I'm not sure what operation.",
      "Subtract 5 from both sides? So 2x = 8? Is that right?",
      "Now I have 2x = 8. Do I divide? I think x = 4, but I'm not completely sure.",
    ],
  },
  'geometry-intermediate': {
    problem: 'Find the area of a triangle with base 10 cm and height 7 cm',
    turns: [
      "Is it just 10 times 7? That would be 70?",
      "Actually, I think triangles are different. But I can't remember the formula exactly.",
      "Maybe it's half of that? So 35? But I'm not sure why.",
      "I think the formula involves base and height, but I'm mixing it up with rectangle area.",
      "So it's (1/2) × base × height? That would be 35 cm²? I think that's it!",
    ],
  },
  'calculus-advanced': {
    problem: 'Given f(x) = x³ - 3x, find the critical points and determine local extrema.',
    turns: [
      "I know I need the derivative, but I'm not sure what to do with it after.",
      "The derivative is... let me think... 3x² - 3? I think that's right.",
      "Now I need to set it equal to zero? So 3x² - 3 = 0 means x² = 1?",
      "So x = 1 or -1. But what do I do now? I forget the next step.",
      "Oh right, I need to check if they're max or min. Can I use the second derivative?",
    ],
  },
};

export default function TutorCLI() {
  const [messages, setMessages] =
    useState<Message[]>(initialMessages);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer =
        scrollAreaRef.current.querySelector(
          "[data-radix-scroll-area-viewport]",
        );
      if (scrollContainer) {
        scrollContainer.scrollTop =
          scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string, imageFile?: File) => {
    if ((!text.trim() && !imageFile) || loading) return;

    // Generate image preview if image is provided
    let imagePreview: string | undefined;
    if (imageFile) {
      // Wait for image to load
      imagePreview = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(imageFile);
      });
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text || 'Image uploaded',
      isAI: false,
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
      imageUrl: imagePreview,
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      let currentSessionId = sessionId;
      let problemText = text;
      let extractedProblemId: string | null = null;

      // If image is included, process it first
      if (imageFile) {
        try {
          const result = await submitProblemImage(imageFile);
          
          // Check if the response is successful and has data
          if (!result.success || !result.data) {
            throw new Error(result.message || 'Failed to process image');
          }
          
          extractedProblemId = result.data.id;
          problemText = result.data.description || result.data.originalText || text || 'Problem from image';
        } catch (error) {
          console.error('Image processing error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to process image. Please try again.';
          toast.error(errorMessage);
          setLoading(false);
          return;
        }
      }

      // Create session if it doesn't exist
      if (!currentSessionId) {
        const sessionResponse = await api.post('/sessions', {
          submittedProblemId: extractedProblemId || undefined,
          problemText: problemText || 'General question',
          problemType: 'math',
          difficultyLevel: 1,
          useEnhancedEngine: true,
        });

        currentSessionId = sessionResponse.data.data.id;
        setSessionId(currentSessionId);

        // If this is the first message, the session creation might have a welcome message
        if (sessionResponse.data.data?.initialResponse) {
          const welcomeMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: sessionResponse.data.data.initialResponse,
            isAI: true,
            timestamp: new Date().toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            }),
          };
          setMessages((prev) => [...prev, welcomeMessage]);
          setLoading(false);
          return;
        }
      }

      // Send message to tutor via enhanced interactions
      const response = await api.post(`/sessions/${currentSessionId}/enhanced-interactions`, {
        type: 'student_response',
        content: problemText,
        confidenceLevel: 0.5,
        metadata: {
          responseTime: Date.now(),
        },
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.tutorResponse,
        isAI: true,
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
        questionType: response.data.questionType,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Failed to send message:', error);
      const errorMessage = error.response?.data?.message || 'Failed to send message. Please try again.';
      toast.error(errorMessage);

      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: 'I apologize, but I encountered an error processing your message. Please try again or rephrase your question.',
        isAI: true,
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setLoading(false);
    }
  };

  const handleScenarioSelect = async (scenario: { id: string; name: string; problem: string; difficulty: string; description: string }) => {
    // Clear existing messages and session
    setMessages([]);
    setSessionId(null);
    setLoading(true);

    try {
      // Create a new session with the scenario problem
      const sessionResponse = await api.post('/sessions', {
        problemText: scenario.problem,
        problemType: 'math',
        difficultyLevel: scenario.difficulty === 'beginner' ? 1 : scenario.difficulty === 'intermediate' ? 2 : 3,
        useEnhancedEngine: true,
      });

      const newSessionId = sessionResponse.data.data.id;
      setSessionId(newSessionId);

      // Add initial tutor greeting (either from API or custom)
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        text: sessionResponse.data.data?.initialResponse || `Let's work on this problem together: "${scenario.problem}". Take your time and think through each step. What's your first thought about how to approach this?`,
        isAI: true,
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
      };
      setMessages([welcomeMessage]);

      // Get the scenario data and simulate the demo turns using the real API
      const scenarioData = DEMO_SCENARIOS[scenario.id];
      if (!scenarioData) {
        setLoading(false);
        return;
      }

      // Simulate the demo turns with real API calls
      for (let i = 0; i < scenarioData.turns.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Add student turn
        const studentMessage: Message = {
          id: `${Date.now()}-student-${i}`,
          text: scenarioData.turns[i],
          isAI: false,
          timestamp: new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          }),
        };
        setMessages((prev) => [...prev, studentMessage]);

        // Get real tutor response from API
        try {
          const response = await api.post(`/sessions/${newSessionId}/enhanced-interactions`, {
            type: 'student_response',
            content: scenarioData.turns[i],
            confidenceLevel: 0.5,
            metadata: {
              responseTime: Date.now(),
            },
          });

          const tutorResponse: Message = {
            id: `${Date.now()}-tutor-${i}`,
            text: response.data.tutorResponse,
            isAI: true,
            timestamp: new Date().toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            }),
            questionType: response.data.questionType,
          };
          setMessages((prev) => [...prev, tutorResponse]);
        } catch (error) {
          console.error('Error in demo turn:', error);
          // Continue with next turn even if one fails
        }
      }
    } catch (error: any) {
      console.error('Failed to start scenario:', error);
      toast.error('Failed to start demo scenario. Please try again.');
      setMessages(initialMessages);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      style={{ 
        height: '100vh', 
        width: '100vw', 
        position: 'relative', 
        overflow: 'hidden',
        backgroundColor: '#1a1a1a'
      }}
    >
      {/* Wooden Frame Border */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(135deg, #8B4513 0%, #654321 50%, #8B4513 100%)",
          boxShadow: "inset 0 0 40px rgba(0,0,0,0.5)",
        }}
      >
        {/* Wood grain texture effect */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.2,
            backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)",
          }}
        ></div>
      </div>

      {/* Inner Frame Shadow */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          right: '16px',
          bottom: '16px',
          boxShadow: "inset 0 4px 12px rgba(0,0,0,0.8), 0 0 0 2px #654321",
        }}
      ></div>

      {/* Blackboard Surface */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          right: '16px',
          bottom: '16px',
          overflow: 'hidden',
          background: `
            linear-gradient(180deg, rgba(27, 40, 20, 0.95) 0%, rgba(20, 30, 15, 0.98) 100%),
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(255, 255, 255, 0.03) 2px,
              rgba(255, 255, 255, 0.03) 4px
            ),
            radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.03) 0%, transparent 50%)
          `,
          borderRadius: "8px",
          boxShadow: "inset 0 0 100px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Demo Panel */}
        <DemoPanel onSelectScenario={handleScenarioSelect} />

        {/* Content Container - positioned over the blackboard */}
        <div style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: '40px',
          zIndex: 10
        }}>
          {/* Header - Chalk Text */}
          <div className="mb-8 text-center">
            <h1 className="chalk-title">AI Tutor</h1>
            <div className="h-0.5 w-40 mx-auto bg-white/40 rounded-full mt-3"></div>
          </div>

          {/* Chat Messages Area */}
          <ScrollArea
            ref={scrollAreaRef}
            className="flex-1 pr-2 mb-6"
          >
            <div className="space-y-2">
              {messages.map((message) => (
                <div key={message.id}>
                  {message.imageUrl && (
                    <div style={{ 
                      marginBottom: '8px',
                      marginLeft: message.isAI ? 0 : 'auto',
                      marginRight: message.isAI ? 'auto' : 0,
                      display: 'inline-block',
                      maxWidth: '300px'
                    }}>
                      <img
                        src={message.imageUrl}
                        alt="Uploaded"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '200px',
                          borderRadius: '8px',
                          border: '2px solid rgba(255,255,255,0.3)',
                          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                          objectFit: 'contain'
                        }}
                      />
                    </div>
                  )}
                  <ChatMessage
                    message={message.text}
                    isAI={message.isAI}
                    timestamp={message.timestamp}
                    questionType={message.questionType}
                  />
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="mt-auto">
            <ChatInput onSendMessage={handleSendMessage} disabled={loading} />
            {loading && (
              <div style={{ 
                textAlign: 'center', 
                marginTop: '10px',
                color: 'rgba(255,255,255,0.7)',
                fontFamily: "'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive",
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
              }}>
                Thinking...
              </div>
            )}
          </div>
        </div>

        {/* Chalk Eraser and Pieces */}
        <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8 flex gap-2 opacity-60">
          <div className="w-16 h-4 bg-gradient-to-r from-amber-100 to-amber-50 rounded shadow-sm transform rotate-6"></div>
          <div className="w-12 h-3 bg-white/90 rounded-full transform rotate-12 shadow-sm"></div>
          <div className="w-10 h-3 bg-yellow-50/80 rounded-full transform -rotate-6 shadow-sm"></div>
        </div>
      </div>

      <style>{`
        .chalk-title {
          font-family: 'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive;
          font-size: 2.5rem;
          color: #ffffff;
          text-shadow: 
            2px 2px 3px rgba(0,0,0,0.3),
            0 0 10px rgba(255,255,255,0.5);
          letter-spacing: 2px;
          opacity: 0.95;
        }
        
        /* Custom scrollbar for blackboard */
        [data-radix-scroll-area-viewport] {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.2) transparent;
        }
        
        [data-radix-scroll-area-viewport]::-webkit-scrollbar {
          width: 6px;
        }
        
        [data-radix-scroll-area-viewport]::-webkit-scrollbar-track {
          background: transparent;
        }
        
        [data-radix-scroll-area-viewport]::-webkit-scrollbar-thumb {
          background-color: rgba(255,255,255,0.2);
          border-radius: 3px;
        }
        
        [data-radix-scroll-area-viewport]::-webkit-scrollbar-thumb:hover {
          background-color: rgba(255,255,255,0.3);
        }
      `}</style>
    </div>
  );
}

