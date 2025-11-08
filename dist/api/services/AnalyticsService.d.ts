export interface AnalyticsEvent {
    id: string;
    userId?: string;
    sessionId?: string;
    eventType: string;
    eventData: Record<string, any>;
    timestamp: Date;
    ipAddress?: string;
    userAgent?: string;
}
export interface LearningAnalytics {
    userId: string;
    totalSessions: number;
    completedSessions: number;
    averageSessionDuration: number;
    totalInteractions: number;
    averageInteractionsPerSession: number;
    hintsUsed: number;
    problemsSolved: number;
    difficultyProgression: number[];
    learningVelocity: number;
    engagementScore: number;
    masteryLevel: number;
}
export interface SystemMetrics {
    activeUsers: number;
    totalSessions: number;
    averageSessionDuration: number;
    errorRate: number;
    responseTime: number;
    throughput: number;
}
export interface CreateEventData {
    userId?: string;
    sessionId?: string;
    eventType: string;
    eventData: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}
export declare class AnalyticsService {
    private static db;
    /**
     * Track an analytics event (gracefully handles database unavailability)
     */
    static trackEvent(eventData: CreateEventData): Promise<AnalyticsEvent | null>;
    /**
     * Get learning analytics for a user
     */
    static getUserAnalytics(userId: string, timeRange?: {
        start: Date;
        end: Date;
    }): Promise<LearningAnalytics>;
    /**
     * Get system-wide metrics
     */
    static getSystemMetrics(timeRange?: {
        start: Date;
        end: Date;
    }): Promise<SystemMetrics>;
    /**
     * Get events by type
     */
    static getEventsByType(eventType: string, limit?: number, offset?: number, timeRange?: {
        start: Date;
        end: Date;
    }): Promise<AnalyticsEvent[]>;
    /**
     * Get user behavior patterns
     */
    static getUserBehaviorPatterns(userId: string): Promise<{
        sessionTimes: {
            hour: number;
            count: number;
        }[];
        problemTypes: {
            type: string;
            count: number;
        }[];
        difficultyPreference: {
            level: number;
            count: number;
        }[];
        averageSessionLength: number;
        peakActivityHour: number;
    }>;
    /**
     * Calculate engagement score based on various metrics
     */
    private static calculateEngagementScore;
    /**
     * Calculate mastery level based on difficulty progression
     */
    private static calculateMasteryLevel;
    /**
     * Generate learning insights for a user
     */
    static generateLearningInsights(userId: string): Promise<{
        strengths: string[];
        improvements: string[];
        recommendations: string[];
        nextSteps: string[];
    }>;
}
export default AnalyticsService;
//# sourceMappingURL=AnalyticsService.d.ts.map