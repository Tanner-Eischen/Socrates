import { BehavioralAssessment } from './types';
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
    private probeType?;
    private lastProbeTurn;
    private strictMode;
    private isAssessmentMode;
    private expectedAnswer?;
    private studentHasAnswered;
    constructor(sessionManager?: any, strictMode?: boolean);
    private initializeEnhancedFeatures;
    private initializeMetacognitivePrompts;
    private initializeConceptualFramework;
    initializeSession(sessionId: string, studentProfile?: EnhancedStudentProfile): void;
    startProblem(problem: string): Promise<string>;
    /**
     * Enable assessment mode for this session
     * In assessment mode, the tutor accepts direct answers and focuses on reasoning
     */
    enableAssessmentMode(expectedAnswer?: string): void;
    /**
     * Disable assessment mode (return to normal tutoring)
     */
    disableAssessmentMode(): void;
    /**
     * Start a problem in assessment mode
     * Different behavior: asks for direct answer instead of Socratic questioning
     */
    startAssessmentProblem(problem: string, expectedAnswer?: string): Promise<string>;
    /**
     * Check if student's answer matches the expected answer
     * Uses flexible matching to account for different formats
     */
    private checkAnswer;
    /**
     * Extract numbers from a string for answer comparison
     */
    private extractNumbers;
    /**
     * Suggest prerequisites when student is struggling in assessment mode
     */
    suggestPrerequisites(prerequisites?: string[]): string;
    /**
     * Get the current assessment mode status
     */
    isInAssessmentMode(): boolean;
    respondToStudent(studentInput: string): Promise<string>;
    private buildDetailedGuidance;
    private buildEnhancedSystemPrompt;
    private selectInitialQuestionType;
    private assessStudentResponse;
    private selectNextQuestionType;
    /**
     * Enhanced contextual question selection with rich question bank
     * Selects appropriate questions based on question type, confidence level, and special contexts
     */
    private selectContextualQuestion;
    private updateDepthTracker;
    private updateStruggling;
    private buildContextualGuidance;
    /**
     * Determine if an understanding check is needed
     * Cycles through teach-back, transfer, and question generation probes
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
    /**
     * Restore conversation history from database interactions
     * This allows the engine to maintain context across API calls
     */
    restoreConversationHistory(interactions: Array<{
        role: 'user' | 'assistant';
        content: string;
        timestamp?: Date;
    }>): void;
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
    /**
     * Parses predicted confidence from student response
     * Looks for pattern: "confidence: <0-1>" or similar
     */
    private parsePredictedConfidence;
    /**
     * Computes confidence delta from previous turn
     */
    private computeConfidenceDelta;
    /**
     * Computes calibration error: abs(predicted - actual)
     */
    private computeCalibrationError;
    /**
     * Scores reasoning chain quality (0-4) based on rubric:
     * - Identifies assumptions (1 point)
     * - States evidence/reasoning (1 point)
     * - Makes logical connections (1 point)
     * - Acknowledges limitations (1 point)
     */
    scoreReasoningChain(explanation: string, concept: string): Promise<number>;
    /**
     * Assesses teach-back quality (0-4) by reusing reasoning chain scoring
     * with added coherence criterion
     */
    assessTeachBack(explanation: string, concept: string): Promise<number>;
    /**
     * Generates a transfer challenge for a given concept and difficulty level
     * Uses curated templates to avoid LLM drift
     */
    generateTransferChallenge(concept: string, difficulty: DifficultyLevel): {
        prompt: string;
        expectedApproach: string;
    };
    /**
     * Assesses if a transfer response matches the expected approach
     */
    assessTransferResponse(response: string, expectedApproach: string): Promise<boolean>;
    /**
     * Computes behavioral depth level (1-5) based on assessment evidence
     */
    computeBehavioralDepthLevel(assessment: BehavioralAssessment): number;
    /**
     * Assesses student question quality (1-5) from "What is X?" to "How does X connect to Y?"
     */
    assessStudentQuestionQuality(question: string, concept: string): Promise<number>;
    /**
     * Gets Socratic compliance metrics
     */
    getSocraticComplianceMetrics(): {
        directAnswerViolations: number;
        complianceScore: number;
        lastViolationTurn: number;
        examples: string[];
    };
    /**
     * Computes session-level learning gains from behavioral assessments
     */
    computeSessionLearningGains(): {
        depthTrajectory: number[];
        teachBackScores: number[];
        transferSuccessRate: number;
        reasoningScoreAvg: number;
        calibrationErrorAvg: number;
        breakthroughs: number;
    };
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
        learningGains: {
            depthTrajectory: number[];
            teachBackScores: number[];
            transferSuccessRate: number;
            reasoningScoreAvg: number;
            calibrationErrorAvg: number;
            breakthroughs: number;
        };
    };
}
//# sourceMappingURL=socratic-engine.d.ts.map