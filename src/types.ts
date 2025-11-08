// Problem Type Enum
export enum ProblemType {
  ALGEBRA = "algebra",
  GEOMETRY = "geometry",
  CALCULUS = "calculus",
  STATISTICS = "statistics",
  TRIGONOMETRY = "trigonometry",
  ARITHMETIC = "arithmetic"
}

// Difficulty Level Enum
export enum DifficultyLevel {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced"
}

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
  // Behavioral assessment fields
  confidenceDelta?: number; // Change in confidence from previous turn
  reasoningScore?: number; // 0-4 chain completeness score
  teachBackScore?: number; // 0-4 explanation quality score
  transferAttempt?: { problemId: string; success: boolean }; // Transfer challenge result
  predictedConfidence?: number; // 0-1 student self-reported confidence
  breakthroughMoment?: boolean; // Flag for significant learning moments
}

// Behavioral Assessment Interface
export interface BehavioralAssessment {
  teachBackScore: number;          // 0-4
  transferSuccess: boolean;        // true/false
  reasoningScore: number;          // 0-4
  calibrationError: number;        // 0-1 (abs(predicted - actual))
  depthLevelEvidence: number;      // 1-5
}
