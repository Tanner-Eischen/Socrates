import { useEffect, useState } from 'react';

interface TypingTextProps {
  text: string;
  speed?: number; // milliseconds per word
  onComplete?: () => void;
  className?: string;
  role?: 'user' | 'assistant';
}

export default function TypingText({ 
  text, 
  speed = 80, 
  onComplete,
  className = '',
  role = 'assistant'
}: TypingTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!text) {
      setDisplayedText('');
      setIsComplete(true);
      onComplete?.();
      return;
    }

    setDisplayedText('');
    setIsComplete(false);
    
    // Split by words but keep spaces - more natural typing
    const tokens = text.match(/(\S+|\s+)/g) || [];
    let currentIndex = 0;

    const typeNextToken = () => {
      if (currentIndex < tokens.length) {
        setDisplayedText(prev => prev + tokens[currentIndex]);
        currentIndex++;
        setTimeout(typeNextToken, speed);
      } else {
        setIsComplete(true);
        onComplete?.();
      }
    };

    const timer = setTimeout(typeNextToken, speed);
    return () => clearTimeout(timer);
  }, [text, speed, onComplete]);

  // Chalk colors based on role
  const getChalkColor = () => {
    if (role === 'user') {
      return 'text-yellow-200'; // Yellow chalk for student
    }
    return 'text-white'; // White chalk for tutor
  };

  const getTextShadow = () => {
    // Add text shadow for chalk-like appearance
    return { textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5), 0 0 4px rgba(0, 0, 0, 0.3)' };
  };

  return (
    <span 
      className={`${getChalkColor()} ${className} ${!isComplete ? 'after:content-["|"] after:animate-pulse' : ''}`}
      style={getTextShadow()}
    >
      {displayedText}
    </span>
  );
}

