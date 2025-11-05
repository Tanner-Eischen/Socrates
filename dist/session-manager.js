"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionManager = exports.SessionManager = void 0;
const socratic_engine_1 = require("./socratic-engine");
class SessionManager {
    constructor() {
        this.sessions = new Map();
        this.interactions = new Map();
        this.engines = new Map();
    }
    static getInstance() {
        if (!SessionManager.instance) {
            SessionManager.instance = new SessionManager();
        }
        return SessionManager.instance;
    }
    // Create new session with enhanced capabilities
    async createSession(data) {
        const sessionId = this.generateSessionId();
        const now = new Date();
        const session = {
            id: sessionId,
            userId: data.userId,
            problemId: data.problemId,
            problemText: data.problemText,
            problemType: data.problemType,
            difficultyLevel: data.difficultyLevel || 1,
            status: 'active',
            startTime: now,
            interactionCount: 0,
            createdAt: now,
            updatedAt: now,
            // Enhanced properties
            maxDepthReached: 1,
            questionTypesUsed: [],
            conceptsExplored: [],
            averageConfidenceLevel: 0.5,
            useEnhancedEngine: data.useEnhancedEngine || false
        };
        this.sessions.set(sessionId, session);
        this.interactions.set(sessionId, []);
        // Initialize Socratic engine for this session
        const engine = new socratic_engine_1.SocraticEngine();
        this.engines.set(sessionId, engine);
        return session;
    }
    // Get session with enhanced data
    async getSession(sessionId) {
        return this.sessions.get(sessionId) || null;
    }
    // Update session with enhanced tracking
    async updateSession(sessionId, updates) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return null;
        const updatedSession = {
            ...session,
            ...updates,
            updatedAt: new Date()
        };
        this.sessions.set(sessionId, updatedSession);
        return updatedSession;
    }
    // Add interaction with enhanced metadata support
    async addInteraction(sessionId, interaction) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        const newInteraction = {
            id: this.generateInteractionId(),
            sessionId,
            timestamp: new Date(),
            ...interaction
        };
        const sessionInteractions = this.interactions.get(sessionId) || [];
        sessionInteractions.push(newInteraction);
        this.interactions.set(sessionId, sessionInteractions);
        // Update session interaction count and enhanced metrics
        session.interactionCount = sessionInteractions.length;
        // Update enhanced metrics if metadata is available
        if (newInteraction.metadata) {
            this.updateSessionEnhancedMetrics(session, newInteraction);
        }
        this.sessions.set(sessionId, session);
        return newInteraction;
    }
    // Enhanced interaction processing
    async addEnhancedInteraction(sessionId, data) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        let engine = this.engines.get(sessionId);
        if (!engine) {
            // Initialize engine if not exists
            engine = new socratic_engine_1.SocraticEngine();
            engine.initializeSession(sessionId);
            await engine.startProblem(session.problemText);
            this.engines.set(sessionId, engine);
        }
        let tutorResponse;
        let analytics;
        // Handle student response
        if (data.type === 'enhanced_student_response' || data.type === 'student_response') {
            // Get tutor response from enhanced engine
            tutorResponse = await engine.respondToStudent(data.content);
            // Generate analytics
            analytics = engine.generateAnalytics();
            // Get enhanced metadata from engine
            const depthTracker = engine.getDepthTracker();
            const questionSequence = engine.getQuestionTypeSequence();
            const currentQuestion = questionSequence[questionSequence.length - 1];
            // Save student interaction
            await this.addInteraction(sessionId, {
                type: 'enhanced_student_response',
                content: data.content,
                metadata: {
                    confidenceLevel: data.confidenceLevel,
                    responseTime: data.metadata?.responseTime || 0
                },
                processingTime: data.processingTime || 0,
                confidenceScore: data.confidenceLevel,
                userId: data.userId
            });
            // Save tutor response with enhanced metadata
            const tutorInteraction = await this.addInteraction(sessionId, {
                type: 'enhanced_tutor_response',
                content: tutorResponse,
                metadata: {
                    questionType: currentQuestion,
                    depthLevel: depthTracker.currentDepth,
                    targetedConcepts: depthTracker.conceptualConnections.slice(-3),
                    shouldDeepenInquiry: depthTracker.shouldDeepenInquiry
                },
                processingTime: 0,
                userId: data.userId
            });
            return {
                interaction: tutorInteraction,
                tutorResponse,
                analytics
            };
        }
        // Handle regular interaction
        const interaction = await this.addInteraction(sessionId, {
            type: data.type,
            content: data.content,
            processingTime: data.processingTime,
            userId: data.userId
        });
        return { interaction };
    }
    // Get all interactions for a session
    async getSessionInteractions(sessionId) {
        return this.interactions.get(sessionId) || [];
    }
    // Save session progress with enhanced data
    async saveSessionProgress(sessionId, progress) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        // Update session with progress data
        const updates = {
            updatedAt: new Date()
        };
        // Update enhanced metrics from progress
        if (progress.depthTracker) {
            updates.maxDepthReached = progress.depthTracker.maxDepthReached;
            updates.conceptsExplored = [...new Set(progress.depthTracker.conceptualConnections)];
        }
        await this.updateSession(sessionId, updates);
    }
    // Generate session analytics
    async generateSessionAnalytics(sessionId) {
        const engine = this.engines.get(sessionId);
        if (!engine)
            return null;
        return engine.generateAnalytics();
    }
    // Get metacognitive prompt for session
    async getMetacognitivePrompt(sessionId, category) {
        const engine = this.engines.get(sessionId);
        if (!engine)
            return null;
        return engine.getMetacognitivePrompt(category);
    }
    // Update enhanced session metrics
    updateSessionEnhancedMetrics(session, interaction) {
        const metadata = interaction.metadata;
        if (!metadata)
            return;
        // Update question types used
        if (metadata.questionType) {
            if (!session.questionTypesUsed.includes(metadata.questionType)) {
                session.questionTypesUsed.push(metadata.questionType);
            }
        }
        // Update max depth reached
        if (metadata.depthLevel) {
            session.maxDepthReached = Math.max(session.maxDepthReached, metadata.depthLevel);
        }
        // Update concepts explored
        if (metadata.targetedConcepts) {
            const newConcepts = metadata.targetedConcepts.filter(concept => !session.conceptsExplored.includes(concept));
            session.conceptsExplored.push(...newConcepts);
        }
        // Update average confidence level
        if (metadata.confidenceLevel !== undefined) {
            const currentTotal = session.averageConfidenceLevel * session.interactionCount;
            session.averageConfidenceLevel = (currentTotal + metadata.confidenceLevel) / (session.interactionCount + 1);
        }
    }
    // List sessions for user with enhanced filtering
    async listUserSessions(userId, options) {
        const allSessions = Array.from(this.sessions.values())
            .filter(session => session.userId === userId);
        // Apply filters
        let filteredSessions = allSessions;
        if (options?.status) {
            filteredSessions = filteredSessions.filter(session => session.status === options.status);
        }
        if (options?.useEnhancedEngine !== undefined) {
            filteredSessions = filteredSessions.filter(session => session.useEnhancedEngine === options.useEnhancedEngine);
        }
        // Sort by most recent first
        filteredSessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        const total = filteredSessions.length;
        const offset = options?.offset || 0;
        const limit = options?.limit || 20;
        const paginatedSessions = filteredSessions.slice(offset, offset + limit);
        const hasMore = offset + limit < total;
        return {
            sessions: paginatedSessions,
            total,
            hasMore
        };
    }
    // Complete session with enhanced final metrics
    async completeSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return null;
        const engine = this.engines.get(sessionId);
        const finalAnalytics = engine ? engine.generateAnalytics() : null;
        const updates = {
            status: 'completed',
            endTime: new Date(),
            totalDuration: new Date().getTime() - session.startTime.getTime()
        };
        // Add final enhanced metrics
        if (finalAnalytics) {
            updates.maxDepthReached = finalAnalytics.averageDepth;
            updates.conceptsExplored = finalAnalytics.conceptsExplored;
            updates.questionTypesUsed = finalAnalytics.questionTypesUsed;
        }
        return this.updateSession(sessionId, updates);
    }
    // Delete session and cleanup
    async deleteSession(sessionId) {
        const deleted = this.sessions.delete(sessionId);
        this.interactions.delete(sessionId);
        this.engines.delete(sessionId);
        return deleted;
    }
    // Get session statistics
    async getSessionStats(userId) {
        const allSessions = Array.from(this.sessions.values());
        const userSessions = userId
            ? allSessions.filter(session => session.userId === userId)
            : allSessions;
        const totalSessions = userSessions.length;
        const activeSessions = userSessions.filter(s => s.status === 'active').length;
        const completedSessions = userSessions.filter(s => s.status === 'completed').length;
        const enhancedSessionsUsed = userSessions.filter(s => s.useEnhancedEngine).length;
        const completedWithDuration = userSessions.filter(s => s.totalDuration);
        const averageSessionDuration = completedWithDuration.length > 0
            ? completedWithDuration.reduce((sum, s) => sum + (s.totalDuration || 0), 0) / completedWithDuration.length
            : 0;
        const averageDepthReached = userSessions.length > 0
            ? userSessions.reduce((sum, s) => sum + s.maxDepthReached, 0) / userSessions.length
            : 0;
        return {
            totalSessions,
            activeSessions,
            completedSessions,
            averageSessionDuration,
            enhancedSessionsUsed,
            averageDepthReached
        };
    }
    // Initialize engine for existing session
    async initializeEngineForSession(sessionId, studentProfile) {
        const session = this.sessions.get(sessionId);
        if (!session)
            throw new Error('Session not found');
        const engine = new socratic_engine_1.SocraticEngine();
        engine.initializeSession(sessionId, studentProfile);
        // Load existing interactions to reconstruct conversation state
        const interactions = this.interactions.get(sessionId) || [];
        // If there are existing interactions, reconstruct the conversation
        if (interactions.length > 0) {
            // Start the problem in the engine
            await engine.startProblem(session.problemText);
            // Replay student responses to rebuild conversation state
            for (const interaction of interactions) {
                if (interaction.type === 'enhanced_student_response' || interaction.type === 'question') {
                    await engine.respondToStudent(interaction.content);
                }
            }
        }
        this.engines.set(sessionId, engine);
    }
    // Utility methods
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    generateInteractionId() {
        return 'interaction_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}
exports.SessionManager = SessionManager;
// Export singleton instance
exports.sessionManager = SessionManager.getInstance();
//# sourceMappingURL=session-manager.js.map