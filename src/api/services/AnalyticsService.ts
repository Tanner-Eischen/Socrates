import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './DatabaseService';
import { logger } from '../middleware/logger';

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

export class AnalyticsService {
  private static db = DatabaseService;

  /**
   * Track an analytics event (gracefully handles database unavailability)
   */
  static async trackEvent(eventData: CreateEventData): Promise<AnalyticsEvent | null> {
    try {
      const eventId = uuidv4();
      const now = new Date();

      const query = `
        INSERT INTO analytics_events (id, user_id, session_id, event_type, event_data, timestamp, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        eventId,
        eventData.userId || null,
        eventData.sessionId || null,
        eventData.eventType,
        JSON.stringify(eventData.eventData),
        now,
        eventData.ipAddress || null,
        eventData.userAgent || null,
      ];

      const result = await this.db.query(query, values);
      const event = result.rows[0];

      logger.debug('Analytics event tracked', { 
        eventId, 
        eventType: eventData.eventType, 
        userId: eventData.userId 
      });

      return {
        id: event.id,
        userId: event.user_id,
        sessionId: event.session_id,
        eventType: event.event_type,
        eventData: event.event_data,
        timestamp: event.timestamp,
        ipAddress: event.ip_address,
        userAgent: event.user_agent,
      };
    } catch (error: any) {
      // If database is not available, log warning and return null instead of throwing
      const errorMessage = error?.message || '';
      if (errorMessage.includes('not available') || 
          error?.code === 'ECONNREFUSED' ||
          error?.code === 'ENOTFOUND') {
        logger.debug('Analytics event not tracked (database unavailable)', { 
          eventType: eventData.eventType, 
          userId: eventData.userId 
        });
        return null;
      }
      // For other errors, log and return null (don't throw)
      logger.warn('Error tracking analytics event', { error: error?.message || error, eventData });
      return null;
    }
  }

  /**
   * Get learning analytics for a user
   */
  static async getUserAnalytics(userId: string, timeRange?: { start: Date; end: Date }): Promise<LearningAnalytics> {
    try {
      let timeFilter = '';
      const queryParams: Array<string | number | Date> = [userId];

      if (timeRange) {
        timeFilter = 'AND s.created_at BETWEEN $2 AND $3';
        queryParams.push(timeRange.start, timeRange.end);
      }

      // Get session statistics
      const sessionQuery = `
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
          COALESCE(AVG(total_duration), 0) as avg_duration,
          COALESCE(SUM(interaction_count), 0) as total_interactions,
          COALESCE(AVG(interaction_count), 0) as avg_interactions,
          COALESCE(SUM(hint_count), 0) as hints_used,
          ARRAY_AGG(difficulty_level ORDER BY created_at) as difficulty_levels
        FROM sessions s
        WHERE s.user_id = $1 ${timeFilter}
      `;

      const sessionResult = await this.db.query(sessionQuery, queryParams);
      const sessionStats = sessionResult.rows[0];

      // Calculate learning velocity (problems solved per hour)
      const velocityQuery = `
        SELECT 
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as problems_solved,
          COALESCE(SUM(total_duration), 0) as total_time
        FROM sessions s
        WHERE s.user_id = $1 ${timeFilter}
      `;

      const velocityResult = await this.db.query(velocityQuery, queryParams);
      const velocityStats = velocityResult.rows[0];

      const totalHours = Math.max(velocityStats.total_time / 3600, 1); // Avoid division by zero
      const learningVelocity = velocityStats.problems_solved / totalHours;

      // Calculate engagement score based on various factors
      const engagementScore = this.calculateEngagementScore({
        totalSessions: parseInt(sessionStats.total_sessions),
        completedSessions: parseInt(sessionStats.completed_sessions),
        averageSessionDuration: parseFloat(sessionStats.avg_duration),
        totalInteractions: parseInt(sessionStats.total_interactions),
        hintsUsed: parseInt(sessionStats.hints_used),
      });

      // Calculate mastery level based on difficulty progression
      const difficultyLevels = sessionStats.difficulty_levels || [];
      const masteryLevel = this.calculateMasteryLevel(difficultyLevels);

      return {
        userId,
        totalSessions: parseInt(sessionStats.total_sessions),
        completedSessions: parseInt(sessionStats.completed_sessions),
        averageSessionDuration: parseFloat(sessionStats.avg_duration),
        totalInteractions: parseInt(sessionStats.total_interactions),
        averageInteractionsPerSession: parseFloat(sessionStats.avg_interactions),
        hintsUsed: parseInt(sessionStats.hints_used),
        problemsSolved: parseInt(velocityStats.problems_solved),
        difficultyProgression: difficultyLevels,
        learningVelocity,
        engagementScore,
        masteryLevel,
      };
    } catch (error) {
      logger.error('Error getting user analytics', { error, userId });
      throw error;
    }
  }

  /**
   * Get system-wide metrics
   */
  static async getSystemMetrics(timeRange?: { start: Date; end: Date }): Promise<SystemMetrics> {
    try {
      let timeFilter = '';
      const queryParams: any[] = [];

      if (timeRange) {
        timeFilter = 'WHERE created_at BETWEEN $1 AND $2';
        queryParams.push(timeRange.start, timeRange.end);
      }

      // Get active users (users with sessions in the time range)
      const activeUsersQuery = `
        SELECT COUNT(DISTINCT user_id) as active_users
        FROM sessions s
        ${timeFilter}
      `;

      const activeUsersResult = await this.db.query(activeUsersQuery, queryParams);
      const activeUsers = parseInt(activeUsersResult.rows[0].active_users);

      // Get session metrics
      const sessionMetricsQuery = `
        SELECT 
          COUNT(*) as total_sessions,
          COALESCE(AVG(total_duration), 0) as avg_duration
        FROM sessions s
        ${timeFilter}
      `;

      const sessionMetricsResult = await this.db.query(sessionMetricsQuery, queryParams);
      const sessionMetrics = sessionMetricsResult.rows[0];

      // Get error rate from system logs
      const errorRateQuery = `
        SELECT 
          COUNT(CASE WHEN level = 'error' THEN 1 END) as error_count,
          COUNT(*) as total_logs
        FROM system_logs
        ${timeFilter.replace('created_at', 'timestamp')}
      `;

      const errorRateResult = await this.db.query(errorRateQuery, queryParams);
      const errorStats = errorRateResult.rows[0];
      const errorRate = errorStats.total_logs > 0 ? 
        (errorStats.error_count / errorStats.total_logs) * 100 : 0;

      // Calculate response time and throughput from analytics events
      const performanceQuery = `
        SELECT 
          AVG(CAST(event_data->>'responseTime' AS NUMERIC)) as avg_response_time,
          COUNT(*) as total_requests
        FROM analytics_events
        WHERE event_type = 'api_request' ${timeFilter ? 'AND ' + timeFilter.replace('created_at', 'timestamp') : ''}
      `;

      const performanceResult = await this.db.query(performanceQuery, queryParams);
      const performanceStats = performanceResult.rows[0];

      const responseTime = parseFloat(performanceStats.avg_response_time) || 0;
      const throughput = timeRange ? 
        performanceStats.total_requests / ((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60)) : 
        performanceStats.total_requests;

      return {
        activeUsers,
        totalSessions: parseInt(sessionMetrics.total_sessions),
        averageSessionDuration: parseFloat(sessionMetrics.avg_duration),
        errorRate,
        responseTime,
        throughput,
      };
    } catch (error) {
      logger.error('Error getting system metrics', { error });
      throw error;
    }
  }

  /**
   * Get events by type
   */
  static async getEventsByType(
    eventType: string, 
    limit: number = 100, 
    offset: number = 0,
    timeRange?: { start: Date; end: Date }
  ): Promise<AnalyticsEvent[]> {
    try {
      let timeFilter = '';
      const queryParams: Array<string | number | Date> = [eventType, limit, offset];

      if (timeRange) {
        timeFilter = 'AND timestamp BETWEEN $4 AND $5';
        queryParams.push(timeRange.start, timeRange.end);
      }

      const query = `
        SELECT * FROM analytics_events
        WHERE event_type = $1 ${timeFilter}
        ORDER BY timestamp DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.db.query(query, queryParams);

      return result.rows.map(event => ({
        id: event.id,
        userId: event.user_id,
        sessionId: event.session_id,
        eventType: event.event_type,
        eventData: event.event_data,
        timestamp: event.timestamp,
        ipAddress: event.ip_address,
        userAgent: event.user_agent,
      }));
    } catch (error) {
      logger.error('Error getting events by type', { error, eventType });
      throw error;
    }
  }

  /**
   * Get user behavior patterns
   */
  static async getUserBehaviorPatterns(userId: string): Promise<{
    sessionTimes: { hour: number; count: number }[];
    problemTypes: { type: string; count: number }[];
    difficultyPreference: { level: number; count: number }[];
    averageSessionLength: number;
    peakActivityHour: number;
  }> {
    try {
      // Get session times distribution
      const sessionTimesQuery = `
        SELECT 
          EXTRACT(HOUR FROM start_time) as hour,
          COUNT(*) as count
        FROM sessions
        WHERE user_id = $1
        GROUP BY EXTRACT(HOUR FROM start_time)
        ORDER BY hour
      `;

      const sessionTimesResult = await this.db.query(sessionTimesQuery, [userId]);
      const sessionTimes = sessionTimesResult.rows.map(row => ({
        hour: parseInt(row.hour),
        count: parseInt(row.count),
      }));

      // Get problem types distribution
      const problemTypesQuery = `
        SELECT 
          problem_type as type,
          COUNT(*) as count
        FROM sessions
        WHERE user_id = $1
        GROUP BY problem_type
        ORDER BY count DESC
      `;

      const problemTypesResult = await this.db.query(problemTypesQuery, [userId]);
      const problemTypes = problemTypesResult.rows.map(row => ({
        type: row.type,
        count: parseInt(row.count),
      }));

      // Get difficulty preference
      const difficultyQuery = `
        SELECT 
          difficulty_level as level,
          COUNT(*) as count
        FROM sessions
        WHERE user_id = $1
        GROUP BY difficulty_level
        ORDER BY level
      `;

      const difficultyResult = await this.db.query(difficultyQuery, [userId]);
      const difficultyPreference = difficultyResult.rows.map(row => ({
        level: parseInt(row.level),
        count: parseInt(row.count),
      }));

      // Calculate average session length
      const avgLengthQuery = `
        SELECT AVG(total_duration) as avg_length
        FROM sessions
        WHERE user_id = $1 AND status = 'completed'
      `;

      const avgLengthResult = await this.db.query(avgLengthQuery, [userId]);
      const averageSessionLength = parseFloat(avgLengthResult.rows[0].avg_length) || 0;

      // Find peak activity hour
      const peakActivityHour = sessionTimes.length > 0 ? 
        sessionTimes.reduce((max, current) => current.count > max.count ? current : max).hour : 0;

      return {
        sessionTimes,
        problemTypes,
        difficultyPreference,
        averageSessionLength,
        peakActivityHour,
      };
    } catch (error) {
      logger.error('Error getting user behavior patterns', { error, userId });
      throw error;
    }
  }

  /**
   * Calculate engagement score based on various metrics
   */
  private static calculateEngagementScore(metrics: {
    totalSessions: number;
    completedSessions: number;
    averageSessionDuration: number;
    totalInteractions: number;
    hintsUsed: number;
  }): number {
    const {
      totalSessions,
      completedSessions,
      averageSessionDuration,
      totalInteractions,
      hintsUsed,
    } = metrics;

    if (totalSessions === 0) return 0;

    // Completion rate (0-30 points)
    const completionRate = (completedSessions / totalSessions) * 30;

    // Session duration score (0-25 points) - optimal around 15-30 minutes
    const optimalDuration = 1800; // 30 minutes in seconds
    const durationScore = Math.max(0, 25 - Math.abs(averageSessionDuration - optimalDuration) / 100);

    // Interaction density (0-25 points)
    const interactionDensity = totalSessions > 0 ? 
      Math.min(25, (totalInteractions / totalSessions) * 2) : 0;

    // Hint usage efficiency (0-20 points) - fewer hints is better
    const hintEfficiency = totalInteractions > 0 ? 
      Math.max(0, 20 - (hintsUsed / totalInteractions) * 40) : 20;

    return Math.round(completionRate + durationScore + interactionDensity + hintEfficiency);
  }

  /**
   * Calculate mastery level based on difficulty progression
   */
  private static calculateMasteryLevel(difficultyLevels: number[]): number {
    if (difficultyLevels.length === 0) return 0;

    // Get recent difficulty levels (last 10 sessions)
    const recentLevels = difficultyLevels.slice(-10);
    const averageRecentLevel = recentLevels.reduce((sum, level) => sum + level, 0) / recentLevels.length;

    // Calculate progression trend
    const firstHalf = recentLevels.slice(0, Math.floor(recentLevels.length / 2));
    const secondHalf = recentLevels.slice(Math.floor(recentLevels.length / 2));

    const firstHalfAvg = firstHalf.length > 0 ? 
      firstHalf.reduce((sum, level) => sum + level, 0) / firstHalf.length : 0;
    const secondHalfAvg = secondHalf.length > 0 ? 
      secondHalf.reduce((sum, level) => sum + level, 0) / secondHalf.length : 0;

    const progressionTrend = secondHalfAvg - firstHalfAvg;

    // Mastery level is based on current difficulty and positive progression
    const masteryLevel = Math.min(100, (averageRecentLevel * 20) + (progressionTrend * 10));

    return Math.max(0, Math.round(masteryLevel));
  }

  /**
   * Generate learning insights for a user
   */
  static async generateLearningInsights(userId: string): Promise<{
    strengths: string[];
    improvements: string[];
    recommendations: string[];
    nextSteps: string[];
  }> {
    try {
      const analytics = await this.getUserAnalytics(userId);
      const behaviorPatterns = await this.getUserBehaviorPatterns(userId);

      const insights = {
        strengths: [] as string[],
        improvements: [] as string[],
        recommendations: [] as string[],
        nextSteps: [] as string[],
      };

      // Analyze strengths
      if (analytics.engagementScore > 70) {
        insights.strengths.push('High engagement and consistent learning habits');
      }
      if (analytics.masteryLevel > 60) {
        insights.strengths.push('Strong problem-solving skills and good progression');
      }
      if (analytics.learningVelocity > 2) {
        insights.strengths.push('Efficient learning pace and quick problem resolution');
      }

      // Analyze areas for improvement
      if (analytics.hintsUsed / Math.max(analytics.totalInteractions, 1) > 0.3) {
        insights.improvements.push('Reduce dependency on hints by practicing foundational concepts');
      }
      if (analytics.completedSessions / Math.max(analytics.totalSessions, 1) < 0.7) {
        insights.improvements.push('Focus on completing sessions to build consistency');
      }
      if (analytics.averageSessionDuration < 600) { // Less than 10 minutes
        insights.improvements.push('Extend session duration for deeper learning');
      }

      // Generate recommendations
      const mostCommonProblemType = behaviorPatterns.problemTypes[0]?.type;
      if (mostCommonProblemType) {
        insights.recommendations.push(`Continue practicing ${mostCommonProblemType} problems to build expertise`);
      }

      if (behaviorPatterns.peakActivityHour) {
        insights.recommendations.push(`Schedule learning sessions around ${behaviorPatterns.peakActivityHour}:00 for optimal performance`);
      }

      // Suggest next steps
      const currentDifficulty = Math.max(...analytics.difficultyProgression.slice(-5));
      if (analytics.masteryLevel > 70 && currentDifficulty < 5) {
        insights.nextSteps.push(`Try difficulty level ${currentDifficulty + 1} problems to challenge yourself`);
      }

      insights.nextSteps.push('Set a goal to complete 3 sessions this week');
      insights.nextSteps.push('Practice problems without hints to build confidence');

      return insights;
    } catch (error) {
      logger.error('Error generating learning insights', { error, userId });
      throw error;
    }
  }
}

export default AnalyticsService;