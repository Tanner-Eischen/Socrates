export interface CollaborationSession {
    id: string;
    sessionId: string;
    tutorId?: string;
    studentId: string;
    type: 'live_tutoring' | 'peer_learning' | 'group_study';
    status: 'scheduled' | 'active' | 'completed' | 'cancelled';
    scheduledStart?: Date;
    actualStart?: Date;
    endTime?: Date;
    roomId: string;
    metadata: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
export interface CollaborationParticipant {
    userId: string;
    role: 'tutor' | 'student' | 'observer';
    joinedAt: Date;
    leftAt?: Date;
    isActive: boolean;
}
export interface CollaborationMessage {
    id: string;
    collaborationSessionId: string;
    userId: string;
    type: 'text' | 'voice' | 'image' | 'system';
    content: string;
    metadata: Record<string, any>;
    timestamp: Date;
}
export interface CreateCollaborationSessionData {
    sessionId: string;
    tutorId?: string;
    studentId: string;
    type: 'live_tutoring' | 'peer_learning' | 'group_study';
    scheduledStart?: Date;
    metadata?: Record<string, any>;
}
export interface JoinSessionData {
    collaborationSessionId: string;
    userId: string;
    role: 'tutor' | 'student' | 'observer';
}
export interface SendMessageData {
    collaborationSessionId: string;
    userId: string;
    type: 'text' | 'voice' | 'image' | 'system';
    content: string;
    metadata?: Record<string, any>;
}
export declare class CollaborationService {
    private static db;
    private static activeSessions;
    private static userSessions;
    /**
     * Create a new collaboration session
     */
    static createCollaborationSession(data: CreateCollaborationSessionData): Promise<CollaborationSession>;
    /**
     * Join a collaboration session
     */
    static joinSession(data: JoinSessionData): Promise<{
        success: boolean;
        collaborationSession: CollaborationSession;
        participants: CollaborationParticipant[];
    }>;
    /**
     * Leave a collaboration session
     */
    static leaveSession(collaborationSessionId: string, userId: string): Promise<void>;
    /**
     * Send a message in a collaboration session
     */
    static sendMessage(data: SendMessageData): Promise<CollaborationMessage>;
    /**
     * Get collaboration session by ID
     */
    static findById(id: string): Promise<CollaborationSession | null>;
    /**
     * Get collaboration sessions by user ID
     */
    static findByUserId(userId: string, limit?: number, offset?: number): Promise<CollaborationSession[]>;
    /**
     * Update collaboration session status
     */
    static updateStatus(id: string, status: CollaborationSession['status']): Promise<CollaborationSession>;
    /**
     * Get active participants in a room
     */
    static getActiveParticipants(roomId: string): CollaborationParticipant[];
    /**
     * Get user's current session
     */
    static getUserCurrentSession(userId: string): string | null;
    /**
     * Check if user is in a session
     */
    static isUserInSession(userId: string): boolean;
    /**
     * Get room participants count
     */
    static getRoomParticipantCount(roomId: string): number;
    /**
     * Get all active collaboration sessions
     */
    static getActiveSessions(): Promise<CollaborationSession[]>;
    /**
     * Get collaboration statistics
     */
    static getCollaborationStats(userId?: string): Promise<{
        totalSessions: number;
        activeSessions: number;
        completedSessions: number;
        averageDuration: number;
        sessionsByType: {
            type: string;
            count: number;
        }[];
    }>;
    /**
     * Schedule a collaboration session
     */
    static scheduleSession(data: CreateCollaborationSessionData & {
        scheduledStart: Date;
    }): Promise<CollaborationSession>;
    /**
     * Cancel a scheduled collaboration session
     */
    static cancelSession(id: string, reason?: string): Promise<void>;
}
export default CollaborationService;
//# sourceMappingURL=CollaborationService.d.ts.map