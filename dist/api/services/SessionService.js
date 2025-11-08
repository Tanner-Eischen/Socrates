"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionService = void 0;
const uuid_1 = require("uuid");
const DatabaseService_1 = require("./DatabaseService");
const logger_1 = require("../middleware/logger");
class SessionService {
    /**
     * Check if database is available
     */
    static async isDatabaseAvailable() {
        // Check if DatabaseService has a pool (database connection)
        // We'll check by looking at the DatabaseService's internal state
        // Since we can't access private members, we'll try a query and catch errors
        try {
            // Use a simple query to test database availability
            // This will throw if database is not available
            await DatabaseService_1.DatabaseService.query('SELECT 1');
            return true;
        }
        catch (error) {
            // If error message indicates database is not available, return false
            const errorMessage = error?.message || '';
            const errorCode = error?.code || '';
            if (errorMessage.includes('not available') ||
                errorCode === 'ECONNREFUSED' ||
                errorCode === 'ENOTFOUND' ||
                errorMessage.includes('Database is not available')) {
                return false;
            }
            // For other errors, assume database might be available but query failed
            // We'll still try to use it and let the error propagate
            return true;
        }
    }
    /**
     * Create a new learning session
     */
    static async create(sessionData) {
        try {
            const sessionId = (0, uuid_1.v4)();
            const now = new Date();
            // Try database first
            const dbAvailable = await this.isDatabaseAvailable();
            if (dbAvailable) {
                try {
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
                catch (dbError) {
                    // If database INSERT fails, fall back to in-memory storage
                    const errorCode = dbError?.code || '';
                    const errorMessage = dbError?.message || '';
                    if (errorCode === 'ECONNREFUSED' ||
                        errorMessage.includes('Database is not available') ||
                        errorMessage.includes('not available')) {
                        logger_1.logger.warn('Database insert failed, falling back to in-memory storage', {
                            sessionId, error: dbError
                        });
                        // Fall through to in-memory storage below
                    }
                    else {
                        // For other database errors, re-throw
                        throw dbError;
                    }
                }
            }
            // Use in-memory storage (either db not available or insert failed)
            const session = {
                id: sessionId,
                userId: sessionData.userId,
                problemId: sessionData.problemId,
                problemText: sessionData.problemText,
                problemType: sessionData.problemType,
                difficultyLevel: sessionData.difficultyLevel || 1,
                status: 'active',
                startTime: now,
                endTime: undefined,
                totalDuration: 0,
                interactionCount: 0,
                hintCount: 0,
                createdAt: now,
                updatedAt: now,
            };
            this.inMemorySessions.set(sessionId, session);
            this.inMemoryInteractions.set(sessionId, []);
            logger_1.logger.info('Learning session created (in-memory)', {
                sessionId,
                userId: sessionData.userId,
                problemType: sessionData.problemType
            });
            return session;
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
            // Try database first
            const dbAvailable = await this.isDatabaseAvailable();
            if (dbAvailable) {
                const query = `SELECT * FROM sessions WHERE id = $1`;
                const result = await this.db.query(query, [id]);
                if (result.rows.length === 0) {
                    // Check in-memory as fallback
                    return this.inMemorySessions.get(id) || null;
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
            else {
                // Database not available, use in-memory storage
                return this.inMemorySessions.get(id) || null;
            }
        }
        catch (error) {
            // If database query fails, check in-memory storage as fallback
            const errorCode = error?.code || '';
            const errorMessage = error?.message || '';
            if (errorCode === 'ECONNREFUSED' ||
                errorMessage.includes('Database is not available') ||
                errorMessage.includes('not available')) {
                logger_1.logger.warn('Database unavailable, checking in-memory storage', { sessionId: id });
                return this.inMemorySessions.get(id) || null;
            }
            // For other errors, log and throw
            logger_1.logger.error('Error finding session by ID', { error, sessionId: id });
            throw error;
        }
    }
    /**
     * Get sessions by user ID
     */
    static async findByUserId(userId, limit = 20, offset = 0) {
        try {
            const dbAvailable = await this.isDatabaseAvailable();
            if (dbAvailable) {
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
            else {
                // Use in-memory storage
                const sessions = Array.from(this.inMemorySessions.values())
                    .filter(session => session.userId === userId)
                    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                    .slice(offset, offset + limit);
                return sessions;
            }
        }
        catch (error) {
            // If database query fails, check in-memory storage as fallback
            const errorCode = error?.code || '';
            const errorMessage = error?.message || '';
            if (errorCode === 'ECONNREFUSED' ||
                errorMessage.includes('Database is not available') ||
                errorMessage.includes('not available')) {
                logger_1.logger.warn('Database unavailable, checking in-memory storage', { userId });
                const sessions = Array.from(this.inMemorySessions.values())
                    .filter(session => session.userId === userId)
                    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                    .slice(offset, offset + limit);
                return sessions;
            }
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
            const dbAvailable = await this.isDatabaseAvailable();
            if (dbAvailable) {
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
                    // Check in-memory storage
                    const session = this.inMemorySessions.get(id);
                    if (!session) {
                        throw new Error('Session not found');
                    }
                    // Update in-memory session
                    session.status = status;
                    if (status === 'completed' || status === 'abandoned') {
                        session.endTime = endTime || now;
                        const startTime = session.startTime;
                        if (startTime) {
                            const actualEndTime = endTime || now;
                            session.totalDuration = Math.floor((actualEndTime.getTime() - startTime.getTime()) / 1000);
                        }
                    }
                    session.updatedAt = now;
                    this.inMemorySessions.set(id, session);
                    logger_1.logger.info('Session status updated (in-memory)', { sessionId: id, status, totalDuration: session.totalDuration });
                    return session;
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
            else {
                // Use in-memory storage
                const session = this.inMemorySessions.get(id);
                if (!session) {
                    throw new Error('Session not found');
                }
                // Calculate total duration if ending the session
                if (status === 'completed' || status === 'abandoned') {
                    const startTime = session.startTime;
                    if (startTime) {
                        const actualEndTime = endTime || now;
                        totalDuration = Math.floor((actualEndTime.getTime() - startTime.getTime()) / 1000);
                    }
                }
                session.status = status;
                if (status === 'completed' || status === 'abandoned') {
                    session.endTime = endTime || now;
                    session.totalDuration = totalDuration;
                }
                session.updatedAt = now;
                this.inMemorySessions.set(id, session);
                logger_1.logger.info('Session status updated (in-memory)', { sessionId: id, status, totalDuration });
                return session;
            }
        }
        catch (error) {
            // If database query fails, check in-memory storage as fallback
            const errorCode = error?.code || '';
            const errorMessage = error?.message || '';
            if (errorCode === 'ECONNREFUSED' ||
                errorMessage.includes('Database is not available') ||
                errorMessage.includes('not available')) {
                logger_1.logger.warn('Database unavailable, checking in-memory storage', { sessionId: id });
                const session = this.inMemorySessions.get(id);
                if (!session) {
                    throw new Error('Session not found');
                }
                const now = new Date();
                let totalDuration = 0;
                if (status === 'completed' || status === 'abandoned') {
                    const startTime = session.startTime;
                    if (startTime) {
                        const actualEndTime = endTime || now;
                        totalDuration = Math.floor((actualEndTime.getTime() - startTime.getTime()) / 1000);
                    }
                }
                session.status = status;
                if (status === 'completed' || status === 'abandoned') {
                    session.endTime = endTime || now;
                    session.totalDuration = totalDuration;
                }
                session.updatedAt = now;
                this.inMemorySessions.set(id, session);
                logger_1.logger.info('Session status updated (in-memory fallback)', { sessionId: id, status, totalDuration });
                return session;
            }
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
            const dbAvailable = await this.isDatabaseAvailable();
            if (dbAvailable) {
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
            else {
                // Use in-memory storage
                const interaction = {
                    id: interactionId,
                    sessionId: interactionData.sessionId,
                    userId: interactionData.userId,
                    type: interactionData.type,
                    content: interactionData.content,
                    metadata: interactionData.metadata || {},
                    timestamp: now,
                    processingTime: interactionData.processingTime,
                    confidenceScore: interactionData.confidenceScore,
                };
                const interactions = this.inMemoryInteractions.get(interactionData.sessionId) || [];
                interactions.push(interaction);
                this.inMemoryInteractions.set(interactionData.sessionId, interactions);
                // Update session counts
                const session = this.inMemorySessions.get(interactionData.sessionId);
                if (session) {
                    session.interactionCount = interactions.length;
                    if (interactionData.type === 'hint') {
                        session.hintCount = (session.hintCount || 0) + 1;
                    }
                    session.updatedAt = now;
                    this.inMemorySessions.set(interactionData.sessionId, session);
                }
                logger_1.logger.info('Interaction added to session (in-memory)', {
                    interactionId,
                    sessionId: interactionData.sessionId,
                    type: interactionData.type
                });
                return interaction;
            }
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
            const dbAvailable = await this.isDatabaseAvailable();
            if (dbAvailable) {
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
            else {
                // Use in-memory storage
                const interactions = this.inMemoryInteractions.get(sessionId) || [];
                return interactions
                    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
                    .slice(offset, offset + limit);
            }
        }
        catch (error) {
            // If database query fails, check in-memory storage as fallback
            const errorCode = error?.code || '';
            const errorMessage = error?.message || '';
            if (errorCode === 'ECONNREFUSED' ||
                errorMessage.includes('Database is not available') ||
                errorMessage.includes('not available')) {
                logger_1.logger.warn('Database unavailable, checking in-memory storage', { sessionId });
                const interactions = this.inMemoryInteractions.get(sessionId) || [];
                return interactions
                    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
                    .slice(offset, offset + limit);
            }
            logger_1.logger.error('Error getting interactions', { error, sessionId });
            throw error;
        }
    }
    /**
     * Get session statistics
     */
    static async getSessionStats(userId) {
        try {
            const dbAvailable = await this.isDatabaseAvailable();
            if (dbAvailable) {
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
            else {
                // Calculate from in-memory storage
                const sessions = Array.from(this.inMemorySessions.values())
                    .filter(session => session.userId === userId);
                const totalSessions = sessions.length;
                const completedSessions = sessions.filter(s => s.status === 'completed').length;
                const totalDuration = sessions.reduce((sum, s) => sum + (s.totalDuration || 0), 0);
                const averageDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;
                const totalInteractions = sessions.reduce((sum, s) => sum + (s.interactionCount || 0), 0);
                const averageInteractions = totalSessions > 0 ? totalInteractions / totalSessions : 0;
                return {
                    totalSessions,
                    completedSessions,
                    totalDuration,
                    averageDuration,
                    totalInteractions,
                    averageInteractions,
                };
            }
        }
        catch (error) {
            // If database query fails, calculate from in-memory storage
            const errorCode = error?.code || '';
            const errorMessage = error?.message || '';
            if (errorCode === 'ECONNREFUSED' ||
                errorMessage.includes('Database is not available') ||
                errorMessage.includes('not available')) {
                logger_1.logger.warn('Database unavailable, calculating stats from in-memory storage', { userId });
                const sessions = Array.from(this.inMemorySessions.values())
                    .filter(session => session.userId === userId);
                const totalSessions = sessions.length;
                const completedSessions = sessions.filter(s => s.status === 'completed').length;
                const totalDuration = sessions.reduce((sum, s) => sum + (s.totalDuration || 0), 0);
                const averageDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;
                const totalInteractions = sessions.reduce((sum, s) => sum + (s.interactionCount || 0), 0);
                const averageInteractions = totalSessions > 0 ? totalInteractions / totalSessions : 0;
                return {
                    totalSessions,
                    completedSessions,
                    totalDuration,
                    averageDuration,
                    totalInteractions,
                    averageInteractions,
                };
            }
            logger_1.logger.error('Error getting session stats', { error, userId });
            throw error;
        }
    }
    /**
     * Get active sessions for a user
     */
    static async getActiveSessions(userId) {
        try {
            const dbAvailable = await this.isDatabaseAvailable();
            if (dbAvailable) {
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
            else {
                // Use in-memory storage
                const sessions = Array.from(this.inMemorySessions.values())
                    .filter(session => session.userId === userId && (session.status === 'active' || session.status === 'paused'))
                    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
                return sessions;
            }
        }
        catch (error) {
            // If database query fails, check in-memory storage
            const errorCode = error?.code || '';
            const errorMessage = error?.message || '';
            if (errorCode === 'ECONNREFUSED' ||
                errorMessage.includes('Database is not available') ||
                errorMessage.includes('not available')) {
                logger_1.logger.warn('Database unavailable, checking in-memory storage', { userId });
                const sessions = Array.from(this.inMemorySessions.values())
                    .filter(session => session.userId === userId && (session.status === 'active' || session.status === 'paused'))
                    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
                return sessions;
            }
            logger_1.logger.error('Error getting active sessions', { error, userId });
            throw error;
        }
    }
    /**
     * Delete session and all related data
     */
    static async delete(id) {
        try {
            const dbAvailable = await this.isDatabaseAvailable();
            if (dbAvailable) {
                // Delete interactions first (due to foreign key constraint)
                await this.db.query('DELETE FROM interactions WHERE session_id = $1', [id]);
                // Delete session
                const result = await this.db.query('DELETE FROM sessions WHERE id = $1', [id]);
                if (result.rowCount === 0) {
                    // Check if exists in in-memory storage
                    if (!this.inMemorySessions.has(id)) {
                        throw new Error('Session not found');
                    }
                    // Delete from in-memory storage
                    this.inMemorySessions.delete(id);
                    this.inMemoryInteractions.delete(id);
                    logger_1.logger.info('Session deleted (in-memory)', { sessionId: id });
                    return;
                }
                logger_1.logger.info('Session deleted', { sessionId: id });
            }
            else {
                // Use in-memory storage
                if (!this.inMemorySessions.has(id)) {
                    throw new Error('Session not found');
                }
                this.inMemorySessions.delete(id);
                this.inMemoryInteractions.delete(id);
                logger_1.logger.info('Session deleted (in-memory)', { sessionId: id });
            }
        }
        catch (error) {
            // If database query fails, try in-memory storage
            const errorCode = error?.code || '';
            const errorMessage = error?.message || '';
            if (errorCode === 'ECONNREFUSED' ||
                errorMessage.includes('Database is not available') ||
                errorMessage.includes('not available')) {
                logger_1.logger.warn('Database unavailable, deleting from in-memory storage', { sessionId: id });
                if (!this.inMemorySessions.has(id)) {
                    throw new Error('Session not found');
                }
                this.inMemorySessions.delete(id);
                this.inMemoryInteractions.delete(id);
                logger_1.logger.info('Session deleted (in-memory fallback)', { sessionId: id });
                return;
            }
            logger_1.logger.error('Error deleting session', { error, sessionId: id });
            throw error;
        }
    }
}
exports.SessionService = SessionService;
SessionService.db = DatabaseService_1.DatabaseService;
// In-memory storage fallback when database is not available
SessionService.inMemorySessions = new Map();
SessionService.inMemoryInteractions = new Map();
exports.default = SessionService;
//# sourceMappingURL=SessionService.js.map