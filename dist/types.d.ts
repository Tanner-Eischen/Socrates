export declare enum ProblemType {
    ALGEBRA = "algebra",
    GEOMETRY = "geometry",
    CALCULUS = "calculus",
    STATISTICS = "statistics",
    TRIGONOMETRY = "trigonometry",
    ARITHMETIC = "arithmetic"
}
export declare enum DifficultyLevel {
    BEGINNER = "beginner",
    INTERMEDIATE = "intermediate",
    ADVANCED = "advanced"
}
export declare enum SocraticQuestionType {
    CLARIFICATION = "clarification",// "What do you mean by...?"
    ASSUMPTIONS = "assumptions",// "What assumptions are you making?"
    EVIDENCE = "evidence",// "What evidence supports this?"
    PERSPECTIVE = "perspective",// "How might someone disagree?"
    IMPLICATIONS = "implications",// "What might happen if...?"
    META_QUESTIONING = "meta_questioning"
}
export interface ConversationDepthTracker {
    currentDepth: number;
    maxDepthReached: number;
    conceptualConnections: string[];
    shouldDeepenInquiry: boolean;
    suggestedNextLevel: number;
    questionType: SocraticQuestionType;
}
export interface StudentProfile {
    userId: string;
    learningStyle?: string;
    strengths?: string[];
    weaknesses?: string[];
    currentLevel?: number;
}
export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date;
}
export interface EnhancedStudentProfile extends StudentProfile {
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
export interface SocraticAssessment {
    confidenceLevel: number;
    misconceptions: string[];
    readinessForAdvancement: boolean;
    conceptualUnderstanding: number;
    depthOfThinking: number;
}
export interface EnhancedMessage extends Message {
    questionType?: SocraticQuestionType;
    depthLevel?: number;
    effectiveness?: number;
    targetedConcepts?: string[];
    studentConfidence?: number;
    confidenceDelta?: number;
    reasoningScore?: number;
    teachBackScore?: number;
    transferAttempt?: {
        problemId: string;
        success: boolean;
    };
    predictedConfidence?: number;
    breakthroughMoment?: boolean;
}
export interface BehavioralAssessment {
    teachBackScore: number;
    transferSuccess: boolean;
    reasoningScore: number;
    calibrationError: number;
    depthLevelEvidence: number;
}
//# sourceMappingURL=types.d.ts.map