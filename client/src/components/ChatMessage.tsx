interface ChatMessageProps {
  message: string;
  isAI: boolean;
  timestamp: string;
  questionType?: string;
}

// Helper function to format question type for display
function formatQuestionType(questionType?: string): string {
  if (!questionType) return '';
  
  const typeMap: Record<string, string> = {
    'clarification': 'Clarification',
    'assumptions': 'Assumptions',
    'evidence': 'Evidence',
    'perspective': 'Perspective',
    'implications': 'Implications',
    'meta_questioning': 'Meta-Questioning'
  };
  
  return typeMap[questionType] || questionType;
}

export function ChatMessage({ message, isAI, timestamp, questionType }: ChatMessageProps) {
  return (
    <div
      className={`mb-5 ${isAI ? 'text-left' : 'text-right'}`}
      style={{
        animation: 'fadeIn 0.4s ease-in',
      }}
    >
      <div className={`inline-block max-w-[85%] md:max-w-[75%]`}>
        {/* Question type badge for tutor messages */}
        {isAI && questionType && (
          <div className="chalk-question-type mb-2">
            [{formatQuestionType(questionType)}]
          </div>
        )}
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
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
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
        
        .chalk-question-type {
          font-family: 'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive;
          font-size: 0.7rem;
          color: rgba(255,255,255,0.6);
          text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
          letter-spacing: 0.5px;
          font-weight: bold;
          text-transform: uppercase;
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}

