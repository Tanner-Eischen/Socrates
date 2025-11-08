"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const CollaborationService_1 = require("../services/CollaborationService");
const AnalyticsService_1 = require("../services/AnalyticsService");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../middleware/logger");
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
// Validation schemas
const createSessionSchema = joi_1.default.object({
    title: joi_1.default.string().required().min(1).max(200),
    description: joi_1.default.string().max(1000).optional(),
    type: joi_1.default.string().required().valid('tutoring', 'peer_learning', 'study_group', 'workshop'),
    maxParticipants: joi_1.default.number().integer().min(2).max(50).default(10),
    isPublic: joi_1.default.boolean().default(true),
    scheduledFor: joi_1.default.date().iso().optional(),
    duration: joi_1.default.number().integer().min(15).max(480).default(60), // minutes
    tags: joi_1.default.array().items(joi_1.default.string().max(50)).max(10).default([]),
    requirements: joi_1.default.string().max(500).optional(),
});
const updateSessionSchema = joi_1.default.object({
    title: joi_1.default.string().min(1).max(200).optional(),
    description: joi_1.default.string().max(1000).optional(),
    maxParticipants: joi_1.default.number().integer().min(2).max(50).optional(),
    isPublic: joi_1.default.boolean().optional(),
    scheduledFor: joi_1.default.date().iso().optional(),
    duration: joi_1.default.number().integer().min(15).max(480).optional(),
    tags: joi_1.default.array().items(joi_1.default.string().max(50)).max(10).optional(),
    requirements: joi_1.default.string().max(500).optional(),
    status: joi_1.default.string().valid('scheduled', 'active', 'completed', 'cancelled').optional(),
});
const sendMessageSchema = joi_1.default.object({
    content: joi_1.default.string().required().min(1).max(2000),
    type: joi_1.default.string().valid('text', 'voice', 'image', 'file', 'system').default('text'),
    metadata: joi_1.default.object().optional(),
});
/**
 * @swagger
 * /api/collaboration/sessions:
 *   post:
 *     summary: Create a new collaboration session
 *     tags: [Collaboration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - type
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               type:
 *                 type: string
 *                 enum: [tutoring, peer_learning, study_group, workshop]
 *               maxParticipants:
 *                 type: integer
 *                 minimum: 2
 *                 maximum: 50
 *                 default: 10
 *               isPublic:
 *                 type: boolean
 *                 default: true
 *               scheduledFor:
 *                 type: string
 *                 format: date-time
 *               duration:
 *                 type: integer
 *                 minimum: 15
 *                 maximum: 480
 *                 default: 60
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 50
 *                 maxItems: 10
 *               requirements:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Collaboration session created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.post('/sessions', auth_1.authenticate, rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error, value } = createSessionSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.details.map(detail => detail.message),
        });
    }
    const mapType = (t) => {
        switch (t) {
            case 'tutoring':
                return 'live_tutoring';
            case 'peer_learning':
                return 'peer_learning';
            case 'study_group':
            case 'workshop':
                return 'group_study';
            default:
                return 'peer_learning';
        }
    };
    const session = await CollaborationService_1.CollaborationService.createCollaborationSession({
        sessionId: value.title, // use title as a simple session identifier
        studentId: req.user.id,
        type: mapType(value.type),
        scheduledStart: value.scheduledFor,
        metadata: {
            title: value.title,
            description: value.description,
            isPublic: value.isPublic,
            maxParticipants: value.maxParticipants,
            duration: value.duration,
            tags: value.tags,
            requirements: value.requirements,
        },
    });
    // Track session creation
    AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user.id,
        eventType: 'collaboration_session_created',
        eventData: {
            sessionId: session.id,
            type: session.type,
            isPublic: value.isPublic,
            maxParticipants: value.maxParticipants,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
    });
    logger_1.logger.info('Collaboration session created via API', {
        sessionId: session.id,
        studentId: req.user.id,
        type: session.type,
    });
    return res.status(201).json({
        success: true,
        data: session,
    });
}));
/**
 * @swagger
 * /api/collaboration/sessions:
 *   get:
 *     summary: Get collaboration sessions
 *     tags: [Collaboration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [tutoring, peer_learning, study_group, workshop]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, active, completed, cancelled]
 *       - in: query
 *         name: isPublic
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: hostId
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *     responses:
 *       200:
 *         description: Sessions retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/sessions', auth_1.authenticate, rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const type = req.query.type;
    const status = req.query.status;
    const isPublic = req.query.isPublic === 'true' ? true :
        req.query.isPublic === 'false' ? false : undefined;
    const hostId = req.query.hostId;
    const mapType = (t) => {
        if (!t)
            return undefined;
        switch (t) {
            case 'tutoring':
                return 'live_tutoring';
            case 'peer_learning':
                return 'peer_learning';
            case 'study_group':
            case 'workshop':
                return 'group_study';
            default:
                return undefined;
        }
    };
    let sessions = hostId
        ? await CollaborationService_1.CollaborationService.findByUserId(hostId, limit, offset)
        : await CollaborationService_1.CollaborationService.getActiveSessions();
    // Apply basic filters locally based on available fields
    const typeFilter = mapType(type);
    if (typeFilter) {
        sessions = sessions.filter(s => s.type === typeFilter);
    }
    if (status) {
        sessions = sessions.filter(s => s.status === status);
    }
    // Note: isPublic is not a tracked field; ignored.
    // Apply pagination if fetching active sessions without hostId
    if (!hostId) {
        sessions = sessions.slice(offset, offset + limit);
    }
    // Track session browsing
    AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user.id,
        eventType: 'collaboration_sessions_browsed',
        eventData: {
            filters: { type, status, isPublic, hostId },
            resultCount: sessions.length,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
    });
    return res.json({
        success: true,
        data: sessions,
        pagination: {
            limit,
            offset,
            total: sessions.length,
        },
    });
}));
/**
 * @swagger
 * /api/collaboration/sessions/{id}:
 *   get:
 *     summary: Get a specific collaboration session
 *     tags: [Collaboration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session retrieved successfully
 *       404:
 *         description: Session not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.get('/sessions/:id', auth_1.authenticate, rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const session = await CollaborationService_1.CollaborationService.findById(req.params.id);
    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Session not found',
        });
    }
    // Check access permissions: allow tutor, student, or admin
    const isAuthorized = req.user.role === 'admin' ||
        req.user.id === session.tutorId ||
        req.user.id === session.studentId;
    if (!isAuthorized) {
        return res.status(403).json({
            success: false,
            message: 'Access denied to session',
        });
    }
    // Get participants; recent messages not implemented
    const participants = CollaborationService_1.CollaborationService.getActiveParticipants(session.roomId);
    const recentMessages = [];
    const sessionWithDetails = {
        ...session,
        participants,
        recentMessages,
    };
    // Track session view
    AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user.id,
        eventType: 'collaboration_session_viewed',
        eventData: {
            sessionId: session.id,
            sessionType: session.type,
            isTutor: session.tutorId === req.user.id,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
    });
    return res.json({
        success: true,
        data: sessionWithDetails,
    });
}));
/**
 * @swagger
 * /api/collaboration/sessions/{id}:
 *   patch:
 *     summary: Update collaboration session (Host only)
 *     tags: [Collaboration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               maxParticipants:
 *                 type: integer
 *                 minimum: 2
 *                 maximum: 50
 *               isPublic:
 *                 type: boolean
 *               scheduledFor:
 *                 type: string
 *                 format: date-time
 *               duration:
 *                 type: integer
 *                 minimum: 15
 *                 maximum: 480
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 50
 *                 maxItems: 10
 *               requirements:
 *                 type: string
 *                 maxLength: 500
 *               status:
 *                 type: string
 *                 enum: [scheduled, active, completed, cancelled]
 *     responses:
 *       200:
 *         description: Session updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Session not found
 *       403:
 *         description: Access denied
 */
router.patch('/sessions/:id', auth_1.authenticate, rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error, value } = updateSessionSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.details.map(detail => detail.message),
        });
    }
    const session = await CollaborationService_1.CollaborationService.findById(req.params.id);
    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Session not found',
        });
    }
    // Only tutor or admin can update status
    if (session.tutorId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Only the host can update this session',
        });
    }
    if (!value.status) {
        return res.status(400).json({
            success: false,
            message: 'Only status updates are supported',
        });
    }
    const updatedSession = await CollaborationService_1.CollaborationService.updateStatus(req.params.id, value.status);
    // Track session update
    AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user.id,
        eventType: 'collaboration_session_updated',
        eventData: {
            sessionId: req.params.id,
            changes: ['status'],
            isTutor: session.tutorId === req.user.id,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
    });
    logger_1.logger.info('Collaboration session updated via API', {
        sessionId: req.params.id,
        userId: req.user.id,
        changes: ['status'],
    });
    return res.json({
        success: true,
        data: updatedSession,
    });
}));
/**
 * @swagger
 * /api/collaboration/sessions/{id}/join:
 *   post:
 *     summary: Join a collaboration session
 *     tags: [Collaboration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully joined session
 *       404:
 *         description: Session not found
 *       400:
 *         description: Cannot join session
 *       403:
 *         description: Access denied
 */
router.post('/sessions/:id/join', auth_1.authenticate, rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const session = await CollaborationService_1.CollaborationService.findById(req.params.id);
    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Session not found',
        });
    }
    // Check if session is joinable
    if (session.status === 'completed' || session.status === 'cancelled') {
        return res.status(400).json({
            success: false,
            message: 'Cannot join a completed or cancelled session',
        });
    }
    const role = req.user.id === session.tutorId ? 'tutor' : (req.user.id === session.studentId ? 'student' : 'observer');
    const joinResult = await CollaborationService_1.CollaborationService.joinSession({
        collaborationSessionId: req.params.id,
        userId: req.user.id,
        role,
    });
    // Track session join
    AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user.id,
        eventType: 'collaboration_session_joined',
        eventData: {
            sessionId: req.params.id,
            sessionType: session.type,
            role,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
    });
    logger_1.logger.info('User joined collaboration session via API', {
        sessionId: req.params.id,
        userId: req.user.id,
        sessionType: session.type,
    });
    return res.json({
        success: true,
        data: joinResult,
        message: 'Successfully joined session',
    });
}));
/**
 * @swagger
 * /api/collaboration/sessions/{id}/leave:
 *   post:
 *     summary: Leave a collaboration session
 *     tags: [Collaboration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully left session
 *       404:
 *         description: Session not found
 */
router.post('/sessions/:id/leave', auth_1.authenticate, rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const session = await CollaborationService_1.CollaborationService.findById(req.params.id);
    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Session not found',
        });
    }
    await CollaborationService_1.CollaborationService.leaveSession(req.params.id, req.user.id);
    // Track session leave
    AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user.id,
        eventType: 'collaboration_session_left',
        eventData: {
            sessionId: req.params.id,
            sessionType: session.type,
            isTutor: session.tutorId === req.user.id,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
    });
    logger_1.logger.info('User left collaboration session via API', {
        sessionId: req.params.id,
        userId: req.user.id,
    });
    return res.json({
        success: true,
        message: 'Successfully left session',
    });
}));
/**
 * @swagger
 * /api/collaboration/sessions/{id}/messages:
 *   post:
 *     summary: Send a message in collaboration session
 *     tags: [Collaboration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 2000
 *               type:
 *                 type: string
 *                 enum: [text, voice, image, file, system]
 *                 default: text
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Session not found
 *       403:
 *         description: Access denied
 */
router.post('/sessions/:id/messages', auth_1.authenticate, rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error, value } = sendMessageSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.details.map(detail => detail.message),
        });
    }
    const session = await CollaborationService_1.CollaborationService.findById(req.params.id);
    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Session not found',
        });
    }
    // Check if user is a participant
    const participants = CollaborationService_1.CollaborationService.getActiveParticipants(session.roomId);
    const isParticipant = participants.some(p => p.userId === req.user.id);
    if (!isParticipant && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Must be a participant to send messages',
        });
    }
    const message = await CollaborationService_1.CollaborationService.sendMessage({
        collaborationSessionId: req.params.id,
        userId: req.user.id,
        content: value.content,
        type: value.type,
        metadata: value.metadata,
    });
    // Track message sent
    AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user.id,
        eventType: 'collaboration_message_sent',
        eventData: {
            sessionId: req.params.id,
            messageType: value.type,
            contentLength: value.content.length,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
    });
    return res.status(201).json({
        success: true,
        data: message,
    });
}));
/**
 * @swagger
 * /api/collaboration/sessions/{id}/messages:
 *   get:
 *     summary: Get messages from collaboration session
 *     tags: [Collaboration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *       404:
 *         description: Session not found
 *       403:
 *         description: Access denied
 */
router.get('/sessions/:id/messages', auth_1.authenticate, rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const session = await CollaborationService_1.CollaborationService.findById(req.params.id);
    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Session not found',
        });
    }
    // Check access permissions: allow tutor, student, or admin
    const isAuthorized = req.user.role === 'admin' ||
        req.user.id === session.tutorId ||
        req.user.id === session.studentId;
    if (!isAuthorized) {
        return res.status(403).json({
            success: false,
            message: 'Access denied to session messages',
        });
    }
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const before = req.query.before;
    const messages = [];
    return res.json({
        success: true,
        data: messages,
        pagination: {
            limit,
            offset,
            total: 0,
        },
    });
}));
/**
 * @swagger
 * /api/collaboration/sessions/{id}/participants:
 *   get:
 *     summary: Get session participants
 *     tags: [Collaboration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Participants retrieved successfully
 *       404:
 *         description: Session not found
 *       403:
 *         description: Access denied
 */
router.get('/sessions/:id/participants', auth_1.authenticate, rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const session = await CollaborationService_1.CollaborationService.findById(req.params.id);
    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Session not found',
        });
    }
    // Check access permissions: allow tutor, student, or admin
    const isAuthorized = req.user.role === 'admin' ||
        req.user.id === session.tutorId ||
        req.user.id === session.studentId;
    if (!isAuthorized) {
        return res.status(403).json({
            success: false,
            message: 'Access denied to session participants',
        });
    }
    const participants = CollaborationService_1.CollaborationService.getActiveParticipants(session.roomId);
    return res.json({
        success: true,
        data: participants,
    });
}));
/**
 * @swagger
 * /api/collaboration/stats:
 *   get:
 *     summary: Get collaboration statistics
 *     tags: [Collaboration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', auth_1.authenticate, rateLimiter_1.analyticsRateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const stats = await CollaborationService_1.CollaborationService.getCollaborationStats(req.user.id);
    return res.json({
        success: true,
        data: stats,
    });
}));
exports.default = router;
//# sourceMappingURL=collaboration.js.map