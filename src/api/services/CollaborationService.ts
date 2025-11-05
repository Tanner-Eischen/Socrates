import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './DatabaseService';
import { logger } from '../middleware/logger';

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

export class CollaborationService {
  private static db = DatabaseService;
  private static activeSessions = new Map<string, Set<string>>(); // roomId -> Set of userIds
  private static userSessions = new Map<string, string>(); // userId -> roomId

  /**
   * Create a new collaboration session
   */
  static async createCollaborationSession(data: CreateCollaborationSessionData): Promise<CollaborationSession> {
    try {
      const collaborationId = uuidv4();
      const roomId = `room_${collaborationId}`;
      const now = new Date();

      const query = `
        INSERT INTO collaboration_sessions (id, session_id, tutor_id, student_id, type, status, scheduled_start, room_id, metadata, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const values = [
        collaborationId,
        data.sessionId,
        data.tutorId || null,
        data.studentId,
        data.type,
        data.scheduledStart ? 'scheduled' : 'active',
        data.scheduledStart || null,
        roomId,
        JSON.stringify(data.metadata || {}),
        now,
        now,
      ];

      const result = await this.db.query(query, values);
      const collaboration = result.rows[0];

      // Initialize active session tracking
      this.activeSessions.set(roomId, new Set());

      logger.info('Collaboration session created', {
        collaborationId,
        sessionId: data.sessionId,
        type: data.type,
        roomId,
      });

      return {
        id: collaboration.id,
        sessionId: collaboration.session_id,
        tutorId: collaboration.tutor_id,
        studentId: collaboration.student_id,
        type: collaboration.type,
        status: collaboration.status,
        scheduledStart: collaboration.scheduled_start,
        actualStart: collaboration.actual_start,
        endTime: collaboration.end_time,
        roomId: collaboration.room_id,
        metadata: collaboration.metadata,
        createdAt: collaboration.created_at,
        updatedAt: collaboration.updated_at,
      };
    } catch (error) {
      logger.error('Error creating collaboration session', { error, data });
      throw error;
    }
  }

  /**
   * Join a collaboration session
   */
  static async joinSession(data: JoinSessionData): Promise<{
    success: boolean;
    collaborationSession: CollaborationSession;
    participants: CollaborationParticipant[];
  }> {
    try {
      // Get collaboration session
      const collaboration = await this.findById(data.collaborationSessionId);
      if (!collaboration) {
        throw new Error('Collaboration session not found');
      }

      // Check if user is authorized to join
      const isAuthorized = 
        collaboration.studentId === data.userId ||
        collaboration.tutorId === data.userId ||
        data.role === 'observer';

      if (!isAuthorized) {
        throw new Error('User not authorized to join this session');
      }

      // Update session status to active if not already
      if (collaboration.status === 'scheduled') {
        await this.updateStatus(data.collaborationSessionId, 'active');
        collaboration.status = 'active';
        collaboration.actualStart = new Date();
      }

      // Add user to active session tracking
      const roomParticipants = this.activeSessions.get(collaboration.roomId) || new Set();
      roomParticipants.add(data.userId);
      this.activeSessions.set(collaboration.roomId, roomParticipants);
      this.userSessions.set(data.userId, collaboration.roomId);

      // Get current participants
      const participants = await this.getActiveParticipants(collaboration.roomId);

      // Send system message about user joining
      await this.sendMessage({
        collaborationSessionId: data.collaborationSessionId,
        userId: 'system',
        type: 'system',
        content: `User joined the session as ${data.role}`,
        metadata: { userId: data.userId, role: data.role },
      });

      logger.info('User joined collaboration session', {
        collaborationSessionId: data.collaborationSessionId,
        userId: data.userId,
        role: data.role,
        roomId: collaboration.roomId,
      });

      return {
        success: true,
        collaborationSession: collaboration,
        participants,
      };
    } catch (error) {
      logger.error('Error joining collaboration session', { error, data });
      throw error;
    }
  }

  /**
   * Leave a collaboration session
   */
  static async leaveSession(collaborationSessionId: string, userId: string): Promise<void> {
    try {
      const collaboration = await this.findById(collaborationSessionId);
      if (!collaboration) {
        throw new Error('Collaboration session not found');
      }

      // Remove user from active session tracking
      const roomParticipants = this.activeSessions.get(collaboration.roomId);
      if (roomParticipants) {
        roomParticipants.delete(userId);
        if (roomParticipants.size === 0) {
          this.activeSessions.delete(collaboration.roomId);
        }
      }
      this.userSessions.delete(userId);

      // Send system message about user leaving
      await this.sendMessage({
        collaborationSessionId,
        userId: 'system',
        type: 'system',
        content: 'User left the session',
        metadata: { userId },
      });

      // If no participants left, end the session
      if (roomParticipants && roomParticipants.size === 0) {
        await this.updateStatus(collaborationSessionId, 'completed');
      }

      logger.info('User left collaboration session', {
        collaborationSessionId,
        userId,
        roomId: collaboration.roomId,
      });
    } catch (error) {
      logger.error('Error leaving collaboration session', { error, collaborationSessionId, userId });
      throw error;
    }
  }

  /**
   * Send a message in a collaboration session
   */
  static async sendMessage(data: SendMessageData): Promise<CollaborationMessage> {
    try {
      const messageId = uuidv4();
      const now = new Date();

      // Note: In a real implementation, you would store messages in a separate table
      // For now, we'll create a mock message structure
      const message: CollaborationMessage = {
        id: messageId,
        collaborationSessionId: data.collaborationSessionId,
        userId: data.userId,
        type: data.type,
        content: data.content,
        metadata: data.metadata || {},
        timestamp: now,
      };

      logger.info('Message sent in collaboration session', {
        messageId,
        collaborationSessionId: data.collaborationSessionId,
        userId: data.userId,
        type: data.type,
        contentLength: data.content.length,
      });

      return message;
    } catch (error) {
      logger.error('Error sending message', { error, data });
      throw error;
    }
  }

  /**
   * Get collaboration session by ID
   */
  static async findById(id: string): Promise<CollaborationSession | null> {
    try {
      const query = `SELECT * FROM collaboration_sessions WHERE id = $1`;
      const result = await this.db.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const collaboration = result.rows[0];
      return {
        id: collaboration.id,
        sessionId: collaboration.session_id,
        tutorId: collaboration.tutor_id,
        studentId: collaboration.student_id,
        type: collaboration.type,
        status: collaboration.status,
        scheduledStart: collaboration.scheduled_start,
        actualStart: collaboration.actual_start,
        endTime: collaboration.end_time,
        roomId: collaboration.room_id,
        metadata: collaboration.metadata,
        createdAt: collaboration.created_at,
        updatedAt: collaboration.updated_at,
      };
    } catch (error) {
      logger.error('Error finding collaboration session by ID', { error, id });
      throw error;
    }
  }

  /**
   * Get collaboration sessions by user ID
   */
  static async findByUserId(userId: string, limit: number = 20, offset: number = 0): Promise<CollaborationSession[]> {
    try {
      const query = `
        SELECT * FROM collaboration_sessions 
        WHERE tutor_id = $1 OR student_id = $1
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `;

      const result = await this.db.query(query, [userId, limit, offset]);

      return result.rows.map(collaboration => ({
        id: collaboration.id,
        sessionId: collaboration.session_id,
        tutorId: collaboration.tutor_id,
        studentId: collaboration.student_id,
        type: collaboration.type,
        status: collaboration.status,
        scheduledStart: collaboration.scheduled_start,
        actualStart: collaboration.actual_start,
        endTime: collaboration.end_time,
        roomId: collaboration.room_id,
        metadata: collaboration.metadata,
        createdAt: collaboration.created_at,
        updatedAt: collaboration.updated_at,
      }));
    } catch (error) {
      logger.error('Error finding collaboration sessions by user ID', { error, userId });
      throw error;
    }
  }

  /**
   * Update collaboration session status
   */
  static async updateStatus(id: string, status: CollaborationSession['status']): Promise<CollaborationSession> {
    try {
      const now = new Date();
      let updateFields = 'status = $1, updated_at = $2';
      const values: (CollaborationSession['status'] | Date | string)[] = [status, now];
      let paramIndex = 3;

      if (status === 'active') {
        updateFields += `, actual_start = $${paramIndex++}`;
        values.push(now);
      } else if (status === 'completed' || status === 'cancelled') {
        updateFields += `, end_time = $${paramIndex++}`;
        values.push(now);
      }

      values.push(id);

      const query = `
        UPDATE collaboration_sessions 
        SET ${updateFields}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await this.db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Collaboration session not found');
      }

      const collaboration = result.rows[0];

      logger.info('Collaboration session status updated', { id, status });

      return {
        id: collaboration.id,
        sessionId: collaboration.session_id,
        tutorId: collaboration.tutor_id,
        studentId: collaboration.student_id,
        type: collaboration.type,
        status: collaboration.status,
        scheduledStart: collaboration.scheduled_start,
        actualStart: collaboration.actual_start,
        endTime: collaboration.end_time,
        roomId: collaboration.room_id,
        metadata: collaboration.metadata,
        createdAt: collaboration.created_at,
        updatedAt: collaboration.updated_at,
      };
    } catch (error) {
      logger.error('Error updating collaboration session status', { error, id, status });
      throw error;
    }
  }

  /**
   * Get active participants in a room
   */
  static getActiveParticipants(roomId: string): CollaborationParticipant[] {
    const participants = this.activeSessions.get(roomId) || new Set();
    const now = new Date();

    return Array.from(participants).map(userId => ({
      userId,
      role: 'student', // In a real implementation, you'd track actual roles
      joinedAt: now, // In a real implementation, you'd track actual join times
      isActive: true,
    }));
  }

  /**
   * Get user's current session
   */
  static getUserCurrentSession(userId: string): string | null {
    return this.userSessions.get(userId) || null;
  }

  /**
   * Check if user is in a session
   */
  static isUserInSession(userId: string): boolean {
    return this.userSessions.has(userId);
  }

  /**
   * Get room participants count
   */
  static getRoomParticipantCount(roomId: string): number {
    const participants = this.activeSessions.get(roomId);
    return participants ? participants.size : 0;
  }

  /**
   * Get all active collaboration sessions
   */
  static async getActiveSessions(): Promise<CollaborationSession[]> {
    try {
      const query = `
        SELECT * FROM collaboration_sessions 
        WHERE status = 'active'
        ORDER BY actual_start DESC
      `;

      const result = await this.db.query(query);

      return result.rows.map(collaboration => ({
        id: collaboration.id,
        sessionId: collaboration.session_id,
        tutorId: collaboration.tutor_id,
        studentId: collaboration.student_id,
        type: collaboration.type,
        status: collaboration.status,
        scheduledStart: collaboration.scheduled_start,
        actualStart: collaboration.actual_start,
        endTime: collaboration.end_time,
        roomId: collaboration.room_id,
        metadata: collaboration.metadata,
        createdAt: collaboration.created_at,
        updatedAt: collaboration.updated_at,
      }));
    } catch (error) {
      logger.error('Error getting active collaboration sessions', { error });
      throw error;
    }
  }

  /**
   * Get collaboration statistics
   */
  static async getCollaborationStats(userId?: string): Promise<{
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    averageDuration: number;
    sessionsByType: { type: string; count: number }[];
  }> {
    try {
      let userFilter = '';
      const queryParams: any[] = [];

      if (userId) {
        userFilter = 'WHERE tutor_id = $1 OR student_id = $1';
        queryParams.push(userId);
      }

      const query = `
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
          AVG(EXTRACT(EPOCH FROM (end_time - actual_start))) as avg_duration
        FROM collaboration_sessions
        ${userFilter}
      `;

      const result = await this.db.query(query, queryParams);
      const stats = result.rows[0];

      // Get sessions by type
      const typeQuery = `
        SELECT 
          type,
          COUNT(*) as count
        FROM collaboration_sessions
        ${userFilter}
        GROUP BY type
        ORDER BY count DESC
      `;

      const typeResult = await this.db.query(typeQuery, queryParams);
      const sessionsByType = typeResult.rows.map(row => ({
        type: row.type,
        count: parseInt(row.count),
      }));

      return {
        totalSessions: parseInt(stats.total_sessions),
        activeSessions: parseInt(stats.active_sessions),
        completedSessions: parseInt(stats.completed_sessions),
        averageDuration: parseFloat(stats.avg_duration) || 0,
        sessionsByType,
      };
    } catch (error) {
      logger.error('Error getting collaboration stats', { error, userId });
      throw error;
    }
  }

  /**
   * Schedule a collaboration session
   */
  static async scheduleSession(data: CreateCollaborationSessionData & { scheduledStart: Date }): Promise<CollaborationSession> {
    try {
      const collaboration = await this.createCollaborationSession(data);

      logger.info('Collaboration session scheduled', {
        collaborationId: collaboration.id,
        scheduledStart: data.scheduledStart,
      });

      return collaboration;
    } catch (error) {
      logger.error('Error scheduling collaboration session', { error, data });
      throw error;
    }
  }

  /**
   * Cancel a scheduled collaboration session
   */
  static async cancelSession(id: string, reason?: string): Promise<void> {
    try {
      await this.updateStatus(id, 'cancelled');

      // Send system message about cancellation
      await this.sendMessage({
        collaborationSessionId: id,
        userId: 'system',
        type: 'system',
        content: 'Session cancelled',
        metadata: { reason: reason || 'No reason provided' },
      });

      logger.info('Collaboration session cancelled', { id, reason });
    } catch (error) {
      logger.error('Error cancelling collaboration session', { error, id });
      throw error;
    }
  }
}

export default CollaborationService;