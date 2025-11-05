import { SocraticQuestionType, EnhancedMessage, EnhancedStudentProfile } from './socratic-engine';
export interface Session {
    id: string;
    userId: string;
    problemId?: string;
    problemText: string;
    problemType: string;
    difficultyLevel: number;
    status: 'active' | 'completed' | 'paused' | 'abandoned';
    startTime: Date;
    endTime?: Date;
    totalDuration?: number;
    interactionCount: number;
    createdAt: Date;
    updatedAt: Date;
    maxDepthReached: number;
    questionTypesUsed: SocraticQuestionType[];
    conceptsExplored: string[];
    averageConfidenceLevel: number;
    useEnhancedEngine: boolean;
}
export interface Interaction {
    id: string;
    sessionId: string;
    type: 'question' | 'answer' | 'hint' | 'feedback' | 'voice' | 'image' | 'student_response' | 'enhanced_student_response' | 'enhanced_tutor_response';
    content: string;
    metadata?: {
        questionType?: SocraticQuestionType;
        depthLevel?: number;
        targetedConcepts?: string[];
        confidenceLevel?: number;
        responseTime?: number;
        shouldDeepenInquiry?: boolean;
        effectiveness?: number;
        misconceptions?: string[];
    };
    processingTime?: number;
    confidenceScore?: number;
    timestamp: Date;
    userId: string;
}
export interface SessionProgress {
    conversation: EnhancedMessage[];
    currentProblem: string;
    difficulty: any;
    strugglingTurns: number;
    depthTracker?: {
        currentDepth: number;
        maxDepthReached: number;
        conceptualConnections: string[];
    };
}
export declare class SessionManager {
    private static instance;
    private sessions;
    private interactions;
    private engines;
    private constructor();
    static getInstance(): SessionManager;
    createSession(data: {
        userId: string;
        problemId?: string;
        problemText: string;
        problemType: string;
        difficultyLevel?: number;
        useEnhancedEngine?: boolean;
    }): Promise<Session>;
    getSession(sessionId: string): Promise<Session | null>;
    updateSession(sessionId: string, updates: Partial<Session>): Promise<Session | null>;
    addInteraction(sessionId: string, interaction: Omit<Interaction, 'id' | 'sessionId' | 'timestamp'>): Promise<Interaction>;
    addEnhancedInteraction(sessionId: string, data: {
        type: string;
        content: string;
        confidenceLevel?: number;
        metadata?: any;
        processingTime?: number;
        userId: string;
    }): Promise<{
        interaction: Interaction;
        tutorResponse?: string;
        analytics?: any;
    }>;
    getSessionInteractions(sessionId: string): Promise<Interaction[]>;
    saveSessionProgress(sessionId: string, progress: SessionProgress): Promise<void>;
    generateSessionAnalytics(sessionId: string): Promise<{
        questionTypesUsed: string[];
        questionTypeDistribution: Record<string, number>;
        averageDepth: number;
        currentDepth: number;
        conceptsExplored: string[];
        confidenceProgression: number[];
        engagementScore: number;
        totalInteractions: number;
        metacognitivePrompts: number;
    } | null>;
    getMetacognitivePrompt(sessionId: string, category: string): Promise<string | null>;
    private updateSessionEnhancedMetrics;
    listUserSessions(userId: string, options?: {
        status?: string;
        limit?: number;
        offset?: number;
        useEnhancedEngine?: boolean;
    }): Promise<{
        sessions: Session[];
        total: number;
        hasMore: boolean;
    }>;
    completeSession(sessionId: string): Promise<Session | null>;
    deleteSession(sessionId: string): Promise<boolean>;
    getSessionStats(userId?: string): Promise<{
        totalSessions: number;
        activeSessions: number;
        completedSessions: number;
        averageSessionDuration: number;
        enhancedSessionsUsed: number;
        averageDepthReached: number;
    }>;
    initializeEngineForSession(sessionId: string, studentProfile?: EnhancedStudentProfile): Promise<void>;
    private generateSessionId;
    private generateInteractionId;
}
export declare const sessionManager: SessionManager;
//# sourceMappingURL=session-manager.d.ts.map