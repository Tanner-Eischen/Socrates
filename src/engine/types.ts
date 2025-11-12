/**
 * Socratic Engine Types
 * Centralized type definitions for the Socratic Engine
 */

export enum SocraticQuestionType {
  CLARIFICATION = "clarification",        // "What do you mean by...?"
  ASSUMPTIONS = "assumptions",            // "What assumptions are you making?"
  EVIDENCE = "evidence",                  // "What evidence supports this?"
  PERSPECTIVE = "perspective",            // "How might someone disagree?"
  IMPLICATIONS = "implications",          // "What might happen if...?"
  META_QUESTIONING = "meta_questioning"   // "Why is this question important?"
}

export enum DialogueLevel {
  DIALOGUE = "dialogue",               // Level 1: reciprocal questioning
  STRATEGIC_DISCOURSE = "strategic_discourse", // Level 2: shaping, probing, refining
  META_DISCOURSE = "meta_discourse"     // Level 3: rules, collaboration, reflection
}

export enum CycleStage {
  WONDER_RECEIVE = "wonder_receive",          // Listen to premise/view
  REFLECT = "reflect",                        // Identify areas for inquiry
  REFINE_CROSS_EXAMINE = "refine_cross_examine", // Challenge assumptions/test logic
  RESTATE = "restate",                        // Student articulates updated understanding
  REPEAT = "repeat"                           // Iterate to deepen understanding
}

export enum DifficultyLevel {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate", 
  ADVANCED = "advanced"
}

export interface ConversationDepthTracker {
  currentDepth: number;
  maxDepthReached: number;
  conceptualConnections: string[];
  shouldDeepenInquiry: boolean;
  suggestedNextLevel: number;
  questionType: SocraticQuestionType;
  dialogueLevel: DialogueLevel;
  cycleStage: CycleStage;
}

export interface SocraticAssessment {
  confidenceLevel: number;
  misconceptions: string[];
  readinessForAdvancement: boolean;
  conceptualUnderstanding: number;
  depthOfThinking: number;
}

export interface EnhancedMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  questionType?: SocraticQuestionType;
  depthLevel?: number;
  effectiveness?: number;
  targetedConcepts?: string[];
  studentConfidence?: number;
  isUnderstandingCheck?: boolean;
  dialogueLevel?: DialogueLevel;
  cycleStage?: CycleStage;
  // Behavioral assessment fields
  confidenceDelta?: number;
  reasoningScore?: number;
  teachBackScore?: number;
  transferAttempt?: { problemId: string; success: boolean };
  predictedConfidence?: number;
  breakthroughMoment?: boolean;
}

export interface EnhancedStudentProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  performanceHistory: Array<{
    sessionId: string;
    masteryScore: number;
    completionRate: number;
    conceptsLearned: string[];
    hintsUsed: number;
    struggledConcepts: string[];
  }>;
  knowledgeGaps: string[];
  learningStyle: 'visual' | 'auditory' | 'kinesthetic';
  engagementMetrics?: {
    averageResponseTime: number;
    totalInteractions: number;
    engagementScore: number;
  };
  // Enhanced properties
  preferredQuestioningStyle: 'direct' | 'exploratory' | 'analogical';
  conceptualConnections: Map<string, string[]>;
  motivationalTriggers: string[];
  cognitiveLoadPreference: 'low' | 'medium' | 'high';
  questionResponseHistory: {
    questionType: SocraticQuestionType;
    effectiveness: number;
    responseTime: number;
    comprehensionLevel: number;
    timestamp: Date;
  }[];
}

export interface SessionPerformance {
  sessionId: string;
  startTime: Date;
  endTime: Date;
  totalInteractions: number;
  problemsSolved: number;
  averageResponseTime: number;
  strugglingTurns: number;
  difficultyLevel: DifficultyLevel;
  engagementScore: number;
  completionRate: number;
  conceptsExplored: string[];
  masteryScore: number;
  conceptsLearned: string[];
  hintsUsed: number;
  struggledConcepts: string[];
}

export interface BehavioralAssessment {
  teachBackScore: number;          // 0-4
  transferSuccess: boolean;        // true/false
  reasoningScore: number;          // 0-4
  calibrationError: number;        // 0-1 (abs(predicted - actual))
  depthLevelEvidence: number;      // 1-5
}

