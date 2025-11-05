"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionService = void 0;
const uuid_1 = require("uuid");
const DatabaseService_1 = require("./DatabaseService");
const logger_1 = require("../middleware/logger");
class SessionService {
    /**
     * Create a new learning session
     */
    static async create(sessionData) {
        try {
            const sessionId = (0, uuid_1.v4)();
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
            logger_1.logger.info('Learning session created', {
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
        }
        catch (error) {
            logger_1.logger.error('Error creating session', { error, sessionData });
            throw error;
        }
    }
    /**
     * Get session by ID
     */
    static async findById(id) {
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
        }
        catch (error) {
            logger_1.logger.error('Error finding session by ID', { error, sessionId: id });
            throw error;
        }
    }
    /**
     * Get sessions by user ID
     */
    static async findByUserId(userId, limit = 20, offset = 0) {
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
        }
        catch (error) {
            logger_1.logger.error('Error finding sessions by user ID', { error, userId });
            throw error;
        }
    }
    /**
     * Update session status
     */
    static async updateStatus(id, status, endTime) {
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
            logger_1.logger.info('Session status updated', { sessionId: id, status, totalDuration });
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
        }
        catch (error) {
            logger_1.logger.error('Error updating session status', { error, sessionId: id, status });
            throw error;
        }
    }
    /**
     * Add interaction to session
     */
    static async addInteraction(interactionData) {
        try {
            const interactionId = (0, uuid_1.v4)();
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
            logger_1.logger.info('Interaction added to session', {
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
        }
        catch (error) {
            logger_1.logger.error('Error adding interaction', { error, interactionData });
            throw error;
        }
    }
    /**
     * Get interactions for a session
     */
    static async getInteractions(sessionId, limit = 50, offset = 0) {
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
        }
        catch (error) {
            logger_1.logger.error('Error getting interactions', { error, sessionId });
            throw error;
        }
    }
    /**
     * Get session statistics
     */
    static async getSessionStats(userId) {
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
        }
        catch (error) {
            logger_1.logger.error('Error getting session stats', { error, userId });
            throw error;
        }
    }
    /**
     * Get active sessions for a user
     */
    static async getActiveSessions(userId) {
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
        }
        catch (error) {
            logger_1.logger.error('Error getting active sessions', { error, userId });
            throw error;
        }
    }
    /**
     * Delete session and all related data
     */
    static async delete(id) {
        try {
            // Delete interactions first (due to foreign key constraint)
            await this.db.query('DELETE FROM interactions WHERE session_id = $1', [id]);
            // Delete session
            const result = await this.db.query('DELETE FROM sessions WHERE id = $1', [id]);
            if (result.rowCount === 0) {
                throw new Error('Session not found');
            }
            logger_1.logger.info('Session deleted', { sessionId: id });
        }
        catch (error) {
            logger_1.logger.error('Error deleting session', { error, sessionId: id });
            throw error;
        }
    }
}
exports.SessionService = SessionService;
SessionService.db = DatabaseService_1.DatabaseService;
exports.default = SessionService;
//# sourceMappingURL=SessionService.js.map