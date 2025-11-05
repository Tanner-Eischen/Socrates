import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './DatabaseService';
import { logger } from '../middleware/logger';

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
  type: 'question' | 'answer' | 'hint' | 'feedback' | 'voice' | 'image';
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
  type: 'question' | 'answer' | 'hint' | 'feedback' | 'voice' | 'image';
  content: string;
  metadata?: Record<string, any>;
  processingTime?: number;
  confidenceScore?: number;
}

export class SessionService {
  private static db = DatabaseService;

  /**
   * Create a new learning session
   */
  static async create(sessionData: CreateSessionData): Promise<Session> {
    try {
      const sessionId = uuidv4();
      const now = new Date();

      const query = `
        INSERT INTO sessions (id, user_id, problem_id, problem_text, problem_type, difficulty_level, status, start_time, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const values = [
        sessionId,
        sessionData.userId,
        sessionData.problemId || null,
        sessionData.problemText,
        sessionData.problemType,
        sessionData.difficultyLevel || 1,
        'active',
        now,
        now,
        now,
      ];

      const result = await this.db.query(query, values);
      const session = result.rows[0];

      logger.info('Learning session created', { 
        sessionId, 
        userId: sessionData.userId, 
        problemType: sessionData.problemType 
      });

      return {
        id: session.id,
        userId: session.user_id,
        problemId: session.problem_id,
        problemText: session.problem_text,
        problemType: session.problem_type,
        difficultyLevel: session.difficulty_level,
        status: session.status,
        startTime: session.start_time,
        endTime: session.end_time,
        totalDuration: session.total_duration,
        interactionCount: session.interaction_count,
        hintCount: session.hint_count,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
      };
    } catch (error) {
      logger.error('Error creating session', { error, sessionData });
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  static async findById(id: string): Promise<Session | null> {
    try {
      const query = `SELECT * FROM sessions WHERE id = $1`;
      const result = await this.db.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const session = result.rows[0];
      return {
        id: session.id,
        userId: session.user_id,
        problemId: session.problem_id,
        problemText: session.problem_text,
        problemType: session.problem_type,
        difficultyLevel: session.difficulty_level,
        status: session.status,
        startTime: session.start_time,
        endTime: session.end_time,
        totalDuration: session.total_duration,
        interactionCount: session.interaction_count,
        hintCount: session.hint_count,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
      };
    } catch (error) {
      logger.error('Error finding session by ID', { error, sessionId: id });
      throw error;
    }
  }

  /**
   * Get sessions by user ID
   */
  static async findByUserId(userId: string, limit: number = 20, offset: number = 0): Promise<Session[]> {
    try {
      const query = `
        SELECT * FROM sessions 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `;
      
      const result = await this.db.query(query, [userId, limit, offset]);

      return result.rows.map(session => ({
        id: session.id,
        userId: session.user_id,
        problemId: session.problem_id,
        problemText: session.problem_text,
        problemType: session.problem_type,
        difficultyLevel: session.difficulty_level,
        status: session.status,
        startTime: session.start_time,
        endTime: session.end_time,
        totalDuration: session.total_duration,
        interactionCount: session.interaction_count,
        hintCount: session.hint_count,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
      }));
    } catch (error) {
      logger.error('Error finding sessions by user ID', { error, userId });
      throw error;
    }
  }

  /**
   * Update session status
   */
  static async updateStatus(id: string, status: Session['status'], endTime?: Date): Promise<Session> {
    try {
      const now = new Date();
      let totalDuration = 0;

      // Calculate total duration if ending the session
      if (status === 'completed' || status === 'abandoned') {
        const sessionQuery = `SELECT start_time FROM sessions WHERE id = $1`;
        const sessionResult = await this.db.query(sessionQuery, [id]);
        
        if (sessionResult.rows.length > 0) {
          const startTime = new Date(sessionResult.rows[0].start_time);
          const actualEndTime = endTime || now;
          totalDuration = Math.floor((actualEndTime.getTime() - startTime.getTime()) / 1000); // in seconds
        }
      }

      const query = `
        UPDATE sessions 
        SET status = $1, end_time = $2, total_duration = $3, updated_at = $4
        WHERE id = $5
        RETURNING *
      `;

      const values = [
        status,
        (status === 'completed' || status === 'abandoned') ? (endTime || now) : null,
        totalDuration,
        now,
        id,
      ];

      const result = await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Session not found');
      }

      const session = result.rows[0];

      logger.info('Session status updated', { sessionId: id, status, totalDuration });

      return {
        id: session.id,
        userId: session.user_id,
        problemId: session.problem_id,
        problemText: session.problem_text,
        problemType: session.problem_type,
        difficultyLevel: session.difficulty_level,
        status: session.status,
        startTime: session.start_time,
        endTime: session.end_time,
        totalDuration: session.total_duration,
        interactionCount: session.interaction_count,
        hintCount: session.hint_count,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
      };
    } catch (error) {
      logger.error('Error updating session status', { error, sessionId: id, status });
      throw error;
    }
  }

  /**
   * Add interaction to session
   */
  static async addInteraction(interactionData: CreateInteractionData): Promise<Interaction> {
    try {
      const interactionId = uuidv4();
      const now = new Date();

      // Insert interaction
      const interactionQuery = `
        INSERT INTO interactions (id, session_id, user_id, type, content, metadata, timestamp, processing_time, confidence_score)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const interactionValues = [
        interactionId,
        interactionData.sessionId,
        interactionData.userId,
        interactionData.type,
        interactionData.content,
        JSON.stringify(interactionData.metadata || {}),
        now,
        interactionData.processingTime || null,
        interactionData.confidenceScore || null,
      ];

      const interactionResult = await this.db.query(interactionQuery, interactionValues);

      // Update session interaction count and hint count
      const updateQuery = `
        UPDATE sessions 
        SET interaction_count = interaction_count + 1,
            hint_count = hint_count + CASE WHEN $2 = 'hint' THEN 1 ELSE 0 END,
            updated_at = $3
        WHERE id = $1
      `;

      await this.db.query(updateQuery, [interactionData.sessionId, interactionData.type, now]);

      const interaction = interactionResult.rows[0];

      logger.info('Interaction added to session', { 
        interactionId, 
        sessionId: interactionData.sessionId, 
        type: interactionData.type 
      });

      return {
        id: interaction.id,
        sessionId: interaction.session_id,
        userId: interaction.user_id,
        type: interaction.type,
        content: interaction.content,
        metadata: interaction.metadata,
        timestamp: interaction.timestamp,
        processingTime: interaction.processing_time,
        confidenceScore: interaction.confidence_score,
      };
    } catch (error) {
      logger.error('Error adding interaction', { error, interactionData });
      throw error;
    }
  }

  /**
   * Get interactions for a session
   */
  static async getInteractions(sessionId: string, limit: number = 50, offset: number = 0): Promise<Interaction[]> {
    try {
      const query = `
        SELECT * FROM interactions 
        WHERE session_id = $1 
        ORDER BY timestamp ASC 
        LIMIT $2 OFFSET $3
      `;

      const result = await this.db.query(query, [sessionId, limit, offset]);

      return result.rows.map(interaction => ({
        id: interaction.id,
        sessionId: interaction.session_id,
        userId: interaction.user_id,
        type: interaction.type,
        content: interaction.content,
        metadata: interaction.metadata,
        timestamp: interaction.timestamp,
        processingTime: interaction.processing_time,
        confidenceScore: interaction.confidence_score,
      }));
    } catch (error) {
      logger.error('Error getting interactions', { error, sessionId });
      throw error;
    }
  }

  /**
   * Get session statistics
   */
  static async getSessionStats(userId: string): Promise<{
    totalSessions: number;
    completedSessions: number;
    totalDuration: number;
    averageDuration: number;
    totalInteractions: number;
    averageInteractions: number;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
          COALESCE(SUM(total_duration), 0) as total_duration,
          COALESCE(AVG(total_duration), 0) as average_duration,
          COALESCE(SUM(interaction_count), 0) as total_interactions,
          COALESCE(AVG(interaction_count), 0) as average_interactions
        FROM sessions 
        WHERE user_id = $1
      `;

      const result = await this.db.query(query, [userId]);
      const stats = result.rows[0];

      return {
        totalSessions: parseInt(stats.total_sessions),
        completedSessions: parseInt(stats.completed_sessions),
        totalDuration: parseInt(stats.total_duration),
        averageDuration: parseFloat(stats.average_duration),
        totalInteractions: parseInt(stats.total_interactions),
        averageInteractions: parseFloat(stats.average_interactions),
      };
    } catch (error) {
      logger.error('Error getting session stats', { error, userId });
      throw error;
    }
  }

  /**
   * Get active sessions for a user
   */
  static async getActiveSessions(userId: string): Promise<Session[]> {
    try {
      const query = `
        SELECT * FROM sessions 
        WHERE user_id = $1 AND status IN ('active', 'paused')
        ORDER BY updated_at DESC
      `;

      const result = await this.db.query(query, [userId]);

      return result.rows.map(session => ({
        id: session.id,
        userId: session.user_id,
        problemId: session.problem_id,
        problemText: session.problem_text,
        problemType: session.problem_type,
        difficultyLevel: session.difficulty_level,
        status: session.status,
        startTime: session.start_time,
        endTime: session.end_time,
        totalDuration: session.total_duration,
        interactionCount: session.interaction_count,
        hintCount: session.hint_count,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
      }));
    } catch (error) {
      logger.error('Error getting active sessions', { error, userId });
      throw error;
    }
  }

  /**
   * Delete session and all related data
   */
  static async delete(id: string): Promise<void> {
    try {
      // Delete interactions first (due to foreign key constraint)
      await this.db.query('DELETE FROM interactions WHERE session_id = $1', [id]);
      
      // Delete session
      const result = await this.db.query('DELETE FROM sessions WHERE id = $1', [id]);

      if (result.rowCount === 0) {
        throw new Error('Session not found');
      }

      logger.info('Session deleted', { sessionId: id });
    } catch (error) {
      logger.error('Error deleting session', { error, sessionId: id });
      throw error;
    }
  }
}

export default SessionService;