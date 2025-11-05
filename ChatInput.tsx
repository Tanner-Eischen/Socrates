import { useState } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
}

export function ChatInput({ onSendMessage }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex gap-3 items-center p-4 rounded-lg border-2 border-white/20 bg-slate-900/20">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your tutor a question..."
          className="flex-1 bg-transparent chalk-input outline-none"
        />
        <button
          type="submit"
          className="flex-shrink-0 w-10 h-10 rounded-full bg-white/90 hover:bg-white transition-colors flex items-center justify-center shadow-lg"
        >
          <Send className="h-5 w-5 text-slate-800" />
        </button>
      </div>

      <style>{`
        .chalk-input {
          font-family: 'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive;
          font-size: 1rem;
          color: #ffffff;
          letter-spacing: 0.5px;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        }
        
        .chalk-input::placeholder {
          color: rgba(255,255,255,0.4);
          text-shadow: 1px 1px 1px rgba(0,0,0,0.3);
        }
      `}</style>
    </form>
  );
}
