// Enhanced Socratic Question Types
export enum SocraticQuestionType {
  CLARIFICATION = "clarification",        // "What do you mean by...?"
  ASSUMPTIONS = "assumptions",            // "What assumptions are you making?"
  EVIDENCE = "evidence",                  // "What evidence supports this?"
  PERSPECTIVE = "perspective",            // "How might someone disagree?"
  IMPLICATIONS = "implications",          // "What might happen if...?"
  META_QUESTIONING = "meta_questioning"   // "Why is this question important?"
}

// Conversation Depth Tracking
export interface ConversationDepthTracker {
  currentDepth: number;
  maxDepthReached: number;
  conceptualConnections: string[];
  
  shouldDeepenInquiry: boolean;
  suggestedNextLevel: number;
  questionType: SocraticQuestionType;
}

// Base Student Profile
export interface StudentProfile {
  userId: string;
  learningStyle?: string;
  strengths?: string[];
  weaknesses?: string[];
  currentLevel?: number;
}

// Base Message Interface
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

// Enhanced Student Profile
export interface EnhancedStudentProfile extends StudentProfile {
  preferredQuestioningStyle: 'direct' | 'exploratory' | 'analogical';
  conceptualConnections: Map<string, string[]>;
  motivationalTriggers: string[];
  cognitiveLoadPreference: 'low' | 'medium' | 'high';
  
  // Track question effectiveness
  questionResponseHistory: {
    questionType: SocraticQuestionType;
    effectiveness: number; // 0-1 scale
    responseTime: number;
    comprehensionLevel: number;
    timestamp: Date;
  }[];
}

// Socratic Assessment Interface
export interface SocraticAssessment {
  confidenceLevel: number;
  misconceptions: string[];
  readinessForAdvancement: boolean;
  conceptualUnderstanding: number; // 0-1 scale
  depthOfThinking: number; // 1-5 scale
}

// Enhanced Message with Socratic Metadata
export interface EnhancedMessage extends Message {
  questionType?: SocraticQuestionType;
  depthLevel?: number;
  effectiveness?: number;
  targetedConcepts?: string[];
  studentConfidence?: number;
}
