import { motion } from 'motion/react';

interface ChatMessageProps {
  message: string;
  isAI: boolean;
  timestamp: string;
}

export function ChatMessage({ message, isAI, timestamp }: ChatMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`mb-5 ${isAI ? 'text-left' : 'text-right'}`}
    >
      <div className={`inline-block max-w-[85%] md:max-w-[75%]`}>
        {/* Message text - chalk style */}
        <div className={`chalk-message ${isAI ? 'chalk-ai' : 'chalk-student'} mb-1.5`}>
          {message}
        </div>
        {/* Timestamp */}
        <div className="chalk-timestamp">
          {timestamp}
        </div>
      </div>

      <style>{`
        .chalk-message {
          font-family: 'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive;
          font-size: 1.1rem;
          line-height: 1.6;
          letter-spacing: 0.5px;
          color: #ffffff;
          text-shadow: 
            1px 1px 2px rgba(0,0,0,0.4),
            0 0 8px rgba(255,255,255,0.3);
          opacity: 0.95;
        }
        
        .chalk-ai {
          color: #ffffff;
        }
        
        .chalk-student {
          color: #fef08a;
          text-shadow: 
            1px 1px 2px rgba(0,0,0,0.4),
            0 0 8px rgba(254,240,138,0.4);
        }
        
        .chalk-timestamp {
          font-family: 'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive;
          font-size: 0.75rem;
          color: rgba(255,255,255,0.4);
          text-shadow: 1px 1px 1px rgba(0,0,0,0.3);
          letter-spacing: 0.5px;
        }
      `}</style>
    </motion.div>
  );
}
