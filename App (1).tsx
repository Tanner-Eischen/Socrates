import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "./components/ChatMessage";
import { ChatInput } from "./components/ChatInput";
import { ScrollArea } from "./components/ui/scroll-area";
import blackboardImage from "figma:asset/766d8fb65e8c4f3f76880c0e0f5b56dfcb0b0466.png";

interface Message {
  id: string;
  text: string;
  isAI: boolean;
  timestamp: string;
}

const initialMessages: Message[] = [
  {
    id: "1",
    text: "Hello! I'm your AI tutor. I'm here to help you learn and understand any topic. What would you like to study today?",
    isAI: true,
    timestamp: "10:00 AM",
  },
];

const mockAIResponses = [
  "Great question! Let me explain that concept step by step...",
  "I understand what you're asking. Here's a detailed breakdown...",
  "That's an interesting topic! Let's dive into it together.",
  "Excellent! You're making good progress. Let me help you with that...",
  "Good thinking! Here's what you need to know about this...",
];

export default function App() {
  const [messages, setMessages] =
    useState<Message[]>(initialMessages);
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

  const handleSendMessage = (text: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      isAI: false,
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, newMessage]);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: mockAIResponses[
          Math.floor(Math.random() * mockAIResponses.length)
        ],
        isAI: true,
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      {/* Wooden Frame Border */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #8B4513 0%, #654321 50%, #8B4513 100%)",
          boxShadow: "inset 0 0 40px rgba(0,0,0,0.5)",
        }}
      >
        {/* Wood grain texture effect */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)",
          }}
        ></div>
      </div>

      {/* Inner Frame Shadow */}
      <div
        className="absolute inset-4 md:inset-6"
        style={{
          boxShadow:
            "inset 0 4px 12px rgba(0,0,0,0.8), 0 0 0 2px #654321",
        }}
      ></div>

      {/* Blackboard Surface */}
      <div
        className="absolute inset-4 md:inset-6 overflow-hidden"
        style={{
          backgroundImage: `url(${blackboardImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Content Container */}
        <div className="relative h-full flex flex-col p-6 md:p-10">
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
                <ChatMessage
                  key={message.id}
                  message={message.text}
                  isAI={message.isAI}
                  timestamp={message.timestamp}
                />
              ))}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="mt-auto">
            <ChatInput onSendMessage={handleSendMessage} />
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