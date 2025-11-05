import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../AuthContext';
import api, { submitProblemImage } from '../api';
import MathRenderer from '../components/MathRenderer';
import Chalkboard from '../components/Chalkboard';
import TypingText from '../components/TypingText';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  imageUrl?: string;
  imageFile?: File;
  isTyping?: boolean;
  flags?: {
    struggling?: boolean;
    directAnswer?: boolean;
    understandingCheck?: boolean;
  };
}

export default function Chat() {
  const { user, logout } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (20MB max)
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Image must be smaller than 20MB');
      return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      toast.error('Please upload a valid image (JPEG, PNG, GIF, or WebP)');
      return;
    }

    setSelectedImage(file);

    // Generate preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendMessage = async () => {
    const messageText = input.trim();
    const hasImage = selectedImage !== null;

    if (!messageText && !hasImage) {
      return;
    }

    // Create user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText || 'Image uploaded',
      timestamp: new Date(),
      imageUrl: imagePreview || undefined,
      imageFile: selectedImage || undefined,
      isTyping: true,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    const imageToProcess = selectedImage;
    removeImage();
    setLoading(true);

    try {
      let problemText = messageText;
      let extractedProblemId: string | null = null;
      let currentSessionId = sessionId;

      // If image is included, process it first
      if (imageToProcess) {
        try {
          const result = await submitProblemImage(imageToProcess);
          extractedProblemId = result.data.id;
          problemText = result.data.parsedProblem?.content || result.data.parsedProblem?.originalText || messageText || 'Problem from image';
        } catch (error) {
          console.error('Image processing error:', error);
          toast.error('Failed to process image. Please try again.');
          setLoading(false);
          return;
        }
      }

      // Create session if it doesn't exist
      if (!currentSessionId) {
        const sessionResponse = await api.post('/sessions', {
          submittedProblemId: extractedProblemId || undefined,
          problemText: problemText || messageText || 'General question',
          problemType: 'math',
          difficultyLevel: 1,
          useEnhancedEngine: true,
        });

        currentSessionId = sessionResponse.data.data.id;
        setSessionId(currentSessionId);
      }

      // Send message to tutor
      const response = await api.post(`/sessions/${currentSessionId}/enhanced-interactions`, {
        type: 'student_response',
        content: problemText || messageText,
        confidenceLevel: 0.5,
        metadata: {
          responseTime: Date.now(),
          hasImage: imageToProcess !== null,
        },
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.tutorResponse,
        timestamp: new Date(),
        isTyping: true,
        flags: response.data.flags || {},
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Failed to send message:', error);
      const errorMessage = error.response?.data?.message || 'Failed to send message. Please try again.';
      toast.error(errorMessage);

      // Add error message from assistant
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your message. Please try again or rephrase your question.',
        timestamp: new Date(),
        isTyping: true,
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
  };

  return (
    <Chalkboard>
      <div className="flex h-full flex-col relative">
        {/* Minimal Header */}
        <header className="px-6 py-3 flex items-center justify-between border-b border-white/10">
          <h1 className="text-xl font-semibold text-yellow-200" style={{ fontFamily: 'serif', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
            SocraTeach
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-yellow-100">{user?.name || user?.email}</span>
            <button
              onClick={logout}
              className="px-3 py-1.5 text-sm text-yellow-200 hover:text-white transition-colors border border-yellow-200/30 rounded"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-4xl mx-auto">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-full text-center py-16">
                <div className="text-6xl mb-4" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>📝</div>
                <h2 className="text-2xl font-semibold text-white mb-2" style={{ fontFamily: 'serif', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                  Start a conversation
                </h2>
                <p className="text-yellow-100 mb-6" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                  Type a message or upload an image to get started
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                  >
                    <div className="max-w-[85%]">
                      {message.imageUrl && (
                        <div className="mb-3">
                          <img
                            src={message.imageUrl}
                            alt="Uploaded"
                            className="max-w-full max-h-64 rounded border-2 border-yellow-200/30 object-contain shadow-lg"
                            style={{ boxShadow: '0 4px 8px rgba(0,0,0,0.3)' }}
                          />
                        </div>
                      )}
                      <div>
                        {/* Flags - only show when relevant */}
                        {message.role === 'assistant' && message.flags && (
                          <div className="mb-2 flex flex-wrap gap-2" style={{ fontFamily: 'serif' }}>
                            {message.flags.struggling && (
                              <span 
                                className="text-sm text-yellow-200 px-2 py-1 rounded border border-yellow-200/30"
                                style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)' }}
                              >
                                ⚠️ Struggling
                              </span>
                            )}
                            {message.flags.directAnswer && (
                              <span 
                                className="text-sm text-red-300 px-2 py-1 rounded border border-red-300/30"
                                style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)' }}
                              >
                                ✗ Direct Answer
                              </span>
                            )}
                            {message.flags.understandingCheck && (
                              <span 
                                className="text-sm text-cyan-200 px-2 py-1 rounded border border-cyan-200/30"
                                style={{ textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)' }}
                              >
                                ✓ Check
                              </span>
                            )}
                          </div>
                        )}
                        <div 
                          className="whitespace-pre-wrap break-words text-lg leading-relaxed" 
                          style={{ 
                            fontFamily: 'serif',
                            ...(message.role === 'user' ? { 
                              color: '#fef08a', // yellow-200
                              textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5), 0 0 4px rgba(0, 0, 0, 0.3)'
                            } : {
                              color: '#ffffff', // white
                              textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5), 0 0 4px rgba(0, 0, 0, 0.3)'
                            })
                          }}
                        >
                          {message.isTyping === true ? (
                            <TypingText 
                              text={message.content} 
                              role={message.role}
                              speed={60}
                              onComplete={() => {
                                setMessages(prev => prev.map(msg => 
                                  msg.id === message.id ? { ...msg, isTyping: false } : msg
                                ));
                              }}
                            />
                          ) : (
                            <MathRenderer 
                              content={message.content} 
                              textColor={message.role === 'user' ? 'text-yellow-200' : 'text-white'}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start animate-fadeIn">
                    <div className="text-white text-lg">
                      <span className="inline-block animate-pulse">Writing...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-white/10 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            {/* Image Preview */}
            {imagePreview && (
              <div className="mb-3 relative inline-block">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-w-xs max-h-32 rounded border-2 border-yellow-200/30 object-contain"
                  style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                />
                <button
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center hover:bg-red-700 transition-colors border-2 border-white"
                  title="Remove image"
                >
                  ×
                </button>
              </div>
            )}

            <div className="flex items-end gap-3">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-yellow-200 hover:text-white transition-colors border border-yellow-200/30 rounded"
                title="Upload image"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </button>
              <textarea
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                disabled={loading}
                rows={1}
                className="flex-1 bg-transparent border-2 border-yellow-200/30 px-4 py-3 text-yellow-200 placeholder:text-yellow-300/50 focus:border-yellow-200 focus:outline-none resize-none disabled:opacity-50 overflow-y-auto rounded"
                style={{ 
                  minHeight: '44px', 
                  maxHeight: '128px',
                  fontFamily: 'serif',
                  fontSize: '18px',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                }}
              />
              <button
                onClick={sendMessage}
                disabled={loading || (!input.trim() && !selectedImage)}
                className="px-6 py-3 font-semibold text-black bg-yellow-200 hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded border-2 border-yellow-300"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </Chalkboard>
  );
}

