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
    totalDuration: number;
    interactionCount: number;
    hintCount: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface Interaction {
    id: string;
    sessionId: string;
    userId: string;
    type: 'question' | 'answer' | 'hint' | 'feedback' | 'voice' | 'image' | 'student_response' | 'enhanced_student_response' | 'enhanced_tutor_response';
    content: string;
    metadata: Record<string, any>;
    timestamp: Date;
    processingTime?: number;
    confidenceScore?: number;
}
export interface CreateSessionData {
    userId: string;
    problemId?: string;
    problemText: string;
    problemType: string;
    difficultyLevel?: number;
}
export interface CreateInteractionData {
    sessionId: string;
    userId: string;
    type: 'question' | 'answer' | 'hint' | 'feedback' | 'voice' | 'image' | 'student_response' | 'enhanced_student_response' | 'enhanced_tutor_response';
    content: string;
    metadata?: Record<string, any>;
    processingTime?: number;
    confidenceScore?: number;
}
export declare class SessionService {
    private static db;
    private static inMemorySessions;
    private static inMemoryInteractions;
    /**
     * Check if database is available
     */
    private static isDatabaseAvailable;
    /**
     * Create a new learning session
     */
    static create(sessionData: CreateSessionData): Promise<Session>;
    /**
     * Get session by ID
     */
    static findById(id: string): Promise<Session | null>;
    /**
     * Get sessions by user ID
     */
    static findByUserId(userId: string, limit?: number, offset?: number): Promise<Session[]>;
    /**
     * Update session status
     */
    static updateStatus(id: string, status: Session['status'], endTime?: Date): Promise<Session>;
    /**
     * Add interaction to session
     */
    static addInteraction(interactionData: CreateInteractionData): Promise<Interaction>;
    /**
     * Get interactions for a session
     */
    static getInteractions(sessionId: string, limit?: number, offset?: number): Promise<Interaction[]>;
    /**
     * Get session statistics
     */
    static getSessionStats(userId: string): Promise<{
        totalSessions: number;
        completedSessions: number;
        totalDuration: number;
        averageDuration: number;
        totalInteractions: number;
        averageInteractions: number;
    }>;
    /**
     * Get active sessions for a user
     */
    static getActiveSessions(userId: string): Promise<Session[]>;
    /**
     * Delete session and all related data
     */
    static delete(id: string): Promise<void>;
}
export default SessionService;
//# sourceMappingURL=SessionService.d.ts.map