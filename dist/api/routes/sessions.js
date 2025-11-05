"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SessionService_1 = require("../services/SessionService");
const AnalyticsService_1 = require("../services/AnalyticsService");
const ProblemProcessingService_1 = require("../services/ProblemProcessingService");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../middleware/logger");
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
// Validation schemas
const createSessionSchema = joi_1.default.object({
    problemId: joi_1.default.string().optional(),
    submittedProblemId: joi_1.default.string().optional(),
    problemText: joi_1.default.string().when('submittedProblemId', {
        is: joi_1.default.exist(),
        then: joi_1.default.optional(),
        otherwise: joi_1.default.required()
    }).min(1).max(10000),
    problemType: joi_1.default.string().when('submittedProblemId', {
        is: joi_1.default.exist(),
        then: joi_1.default.optional(),
        otherwise: joi_1.default.required()
    }).valid('math', 'science', 'programming', 'logic', 'language', 'other'),
    difficultyLevel: joi_1.default.number().integer().min(1).max(10).default(1),
});
const updateSessionSchema = joi_1.default.object({
    status: joi_1.default.string().required().valid('active', 'completed', 'paused', 'abandoned'),
    endTime: joi_1.default.date().iso().optional(),
});
const addInteractionSchema = joi_1.default.object({
    type: joi_1.default.string().required().valid('question', 'answer', 'hint', 'feedback', 'voice', 'image'),
    content: joi_1.default.string().required().min(1).max(10000),
    metadata: joi_1.default.object().optional(),
    processingTime: joi_1.default.number().integer().min(0).optional(),
    confidenceScore: joi_1.default.number().min(0).max(1).optional(),
});
/**
 * @swagger
 * /api/sessions:
 *   post:
 *     summary: Create a new learning session
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - problemText
 *               - problemType
 *             properties:
 *               problemId:
 *                 type: string
 *                 description: Optional problem identifier
 *               problemText:
 *                 type: string
 *                 description: The problem statement
 *               problemType:
 *                 type: string
 *                 enum: [math, science, programming, logic, language, other]
 *               difficultyLevel:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *                 default: 1
 *     responses:
 *       201:
 *         description: Session created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.post('/', auth_1.authenticate, rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error, value } = createSessionSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.details.map(detail => detail.message),
        });
    }
    const { submittedProblemId, ...sessionData } = value;
    // If using a submitted problem, fetch it and use its details
    if (submittedProblemId) {
        const submittedProblem = ProblemProcessingService_1.ProblemProcessingServiceInstance.getSubmittedProblem(submittedProblemId, req.user.id);
        if (!submittedProblem) {
            return res.status(404).json({
                success: false,
                message: 'Submitted problem not found or access denied',
            });
        }
        // Use submitted problem details
        sessionData.problemId = submittedProblemId;
        sessionData.problemText = submittedProblem.parsedProblem.content || submittedProblem.parsedProblem.originalText || '';
        sessionData.problemType = 'math'; // All submitted problems are math for now
        // Map difficulty to numeric level
        const difficultyMap = {
            beginner: 1,
            intermediate: 5,
            advanced: 8,
        };
        sessionData.difficultyLevel = difficultyMap[submittedProblem.parsedProblem.difficulty] || 1;
        logger_1.logger.info('Creating session from submitted problem', {
            userId: req.user.id,
            submittedProblemId,
            problemType: sessionData.problemType,
        });
    }
    const session = await SessionService_1.SessionService.create({
        userId: req.user.id,
        ...sessionData,
    });
    // Track session creation
    await AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user.id,
        sessionId: session.id,
        eventType: 'session_created',
        eventData: {
            problemType: session.problemType,
            difficultyLevel: session.difficultyLevel,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
    });
    logger_1.logger.info('Session created via API', {
        sessionId: session.id,
        userId: req.user.id,
        problemType: session.problemType,
    });
    return res.status(201).json({
        success: true,
        data: session,
    });
}));
/**
 * @swagger
 * /api/sessions:
 *   get:
 *     summary: Get user's sessions
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, completed, paused, abandoned]
 *     responses:
 *       200:
 *         description: Sessions retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', auth_1.authenticate, rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status;
    let sessions;
    if (status === 'active' || status === 'paused') {
        sessions = await SessionService_1.SessionService.getActiveSessions(req.user.id);
    }
    else {
        sessions = await SessionService_1.SessionService.findByUserId(req.user.id, limit, offset);
    }
    // Filter by status if specified
    if (status && status !== 'active' && status !== 'paused') {
        sessions = sessions.filter(session => session.status === status);
    }
    res.json({
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
 * /api/sessions/{id}:
 *   get:
 *     summary: Get a specific session
 *     tags: [Sessions]
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
router.get('/:id', auth_1.authenticate, rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const session = await SessionService_1.SessionService.findById(req.params.id);
    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Session not found',
        });
    }
    // Check ownership
    if (session.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
        });
    }
    return res.json({
        success: true,
        data: session,
    });
}));
/**
 * @swagger
 * /api/sessions/{id}:
 *   patch:
 *     summary: Update session status
 *     tags: [Sessions]
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, completed, paused, abandoned]
 *               endTime:
 *                 type: string
 *                 format: date-time
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
router.patch('/:sessionId', auth_1.authenticate, (0, auth_1.requireOwnership)('userId'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error, value } = updateSessionSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.details.map(detail => detail.message),
        });
    }
    const session = await SessionService_1.SessionService.updateStatus(req.params.id, value.status, value.endTime ? new Date(value.endTime) : undefined);
    // Track session status change
    await AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user.id,
        sessionId: session.id,
        eventType: 'session_status_changed',
        eventData: {
            newStatus: value.status,
            totalDuration: session.totalDuration,
            interactionCount: session.interactionCount,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
    });
    logger_1.logger.info('Session status updated via API', {
        sessionId: session.id,
        userId: req.user.id,
        newStatus: value.status,
    });
    return res.json({
        success: true,
        data: session,
    });
}));
/**
 * @swagger
 * /api/sessions/{id}/interactions:
 *   post:
 *     summary: Add interaction to session
 *     tags: [Sessions]
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
 *               - type
 *               - content
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [question, answer, hint, feedback, voice, image]
 *               content:
 *                 type: string
 *               metadata:
 *                 type: object
 *               processingTime:
 *                 type: integer
 *                 minimum: 0
 *               confidenceScore:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *     responses:
 *       201:
 *         description: Interaction added successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Session not found
 *       403:
 *         description: Access denied
 */
router.post('/:id/interactions', auth_1.authenticate, (0, auth_1.requireOwnership)('userId'), rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error, value } = addInteractionSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.details.map(detail => detail.message),
        });
    }
    const interaction = await SessionService_1.SessionService.addInteraction({
        sessionId: req.params.id,
        userId: req.user.id,
        ...value,
    });
    // Track interaction
    await AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user.id,
        sessionId: req.params.id,
        eventType: 'interaction_added',
        eventData: {
            interactionType: value.type,
            contentLength: value.content.length,
            processingTime: value.processingTime,
            confidenceScore: value.confidenceScore,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
    });
    logger_1.logger.info('Interaction added via API', {
        interactionId: interaction.id,
        sessionId: req.params.id,
        userId: req.user.id,
        type: value.type,
    });
    return res.status(201).json({
        success: true,
        data: interaction,
    });
}));
/**
 * @swagger
 * /api/sessions/{id}/interactions:
 *   get:
 *     summary: Get session interactions
 *     tags: [Sessions]
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
 *     responses:
 *       200:
 *         description: Interactions retrieved successfully
 *       404:
 *         description: Session not found
 *       403:
 *         description: Access denied
 */
router.get('/:id/interactions', auth_1.authenticate, (0, auth_1.requireOwnership)('userId'), rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const interactions = await SessionService_1.SessionService.getInteractions(req.params.id, limit, offset);
    return res.json({
        success: true,
        data: interactions,
        pagination: {
            limit,
            offset,
            total: interactions.length,
        },
    });
}));
/**
 * @swagger
 * /api/sessions/{id}:
 *   delete:
 *     summary: Delete a session
 *     tags: [Sessions]
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
 *         description: Session deleted successfully
 *       404:
 *         description: Session not found
 *       403:
 *         description: Access denied
 */
router.delete('/:id', auth_1.authenticate, (0, auth_1.requireOwnership)('userId'), rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    await SessionService_1.SessionService.delete(req.params.id);
    // Track session deletion
    await AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user.id,
        eventType: 'session_deleted',
        eventData: {
            sessionId: req.params.id,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
    });
    logger_1.logger.info('Session deleted via API', {
        sessionId: req.params.id,
        userId: req.user.id,
    });
    return res.json({
        success: true,
        message: 'Session deleted successfully',
    });
}));
/**
 * @swagger
 * /api/sessions/stats:
 *   get:
 *     summary: Get user's session statistics
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', auth_1.authenticate, rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const stats = await SessionService_1.SessionService.getSessionStats(req.user.id);
    res.json({
        success: true,
        data: stats,
    });
}));
exports.default = router;
//# sourceMappingURL=sessions.js.map