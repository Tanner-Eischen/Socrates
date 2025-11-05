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
export declare enum DifficultyLevel {
    BEGINNER = "beginner",
    INTERMEDIATE = "intermediate",
    ADVANCED = "advanced"
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
export declare class SocraticEngine {
    private openai;
    private conversation;
    private problem;
    private sessionId;
    private studentProfile?;
    private currentDifficulty;
    private sessionStartTime;
    private strugglingTurns;
    private lastResponseTime;
    private depthTracker;
    private questionTypeSequence;
    private metacognitivePrompts;
    private conceptualFramework;
    private sessionManager?;
    private lastUnderstandingCheckTurn;
    private understandingCheckCount;
    constructor(sessionManager?: any);
    private initializeEnhancedFeatures;
    private initializeMetacognitivePrompts;
    private initializeConceptualFramework;
    initializeSession(sessionId: string, studentProfile?: EnhancedStudentProfile): void;
    startProblem(problem: string): Promise<string>;
    respondToStudent(studentInput: string): Promise<string>;
    private buildEnhancedSystemPrompt;
    private selectInitialQuestionType;
    private assessStudentResponse;
    private selectNextQuestionType;
    private updateDepthTracker;
    private updateStruggling;
    private buildContextualGuidance;
    /**
     * Determine if an understanding check is needed
     */
    private shouldPerformUnderstandingCheck;
    /**
     * Select appropriate question type for understanding check
     */
    private selectUnderstandingCheckQuestionType;
    private assessConceptualUnderstanding;
    private assessThinkingDepth;
    private extractConcepts;
    private generateLearningObjective;
    private determineStudentLevel;
    private updateStudentProfile;
    getConversationHistory(): EnhancedMessage[];
    getCurrentProblem(): string;
    getConversationLength(): number;
    getCurrentDifficulty(): DifficultyLevel;
    updateDifficulty(newDifficulty: DifficultyLevel): void;
    /**
     * Automatically adjust difficulty level based on student assessment
     */
    private autoAdjustDifficulty;
    getDepthTracker(): ConversationDepthTracker;
    getQuestionTypeSequence(): SocraticQuestionType[];
    getMetacognitivePrompt(category: string): string;
    /**
     * Get understanding check information
     */
    getUnderstandingCheckInfo(): {
        count: number;
        checks: Array<{
            turn: number;
            questionType: SocraticQuestionType;
            confidence: number;
        }>;
        averageConfidenceAfterCheck: number;
    };
    containsDirectAnswer(response: string): boolean;
    getSessionPerformance(): SessionPerformance;
    private calculateCompletionRate;
    generateAnalytics(): {
        questionTypesUsed: string[];
        questionTypeDistribution: Record<string, number>;
        averageDepth: number;
        currentDepth: number;
        conceptsExplored: string[];
        confidenceProgression: number[];
        engagementScore: number;
        totalInteractions: number;
        metacognitivePrompts: number;
    };
}
//# sourceMappingURL=socratic-engine.d.ts.map