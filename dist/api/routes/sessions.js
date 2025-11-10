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
const socratic_engine_1 = require("../../socratic-engine"); // ADDED FOR ENHANCED FEATURES
const router = (0, express_1.Router)();
// This would normally fetch from database - for now, inline the assessment problems
const mockProblems = [
    {
        id: 'math-linear-1',
        title: 'Linear Equations Basics',
        description: 'Solve for x: 3x + 7 = 22',
        type: 'math',
        difficultyLevel: 1,
        isAssessment: true,
        prerequisites: [],
        expectedAnswer: '5',
    },
    {
        id: 'math-quad-1',
        title: 'Quadratic Equations',
        description: 'Solve the quadratic equation: x² - 5x + 6 = 0',
        type: 'math',
        difficultyLevel: 3,
        isAssessment: true,
        prerequisites: ['math-linear-1'],
        expectedAnswer: 'x = 2, x = 3',
    },
    {
        id: 'math-geo-1',
        title: 'Area of a Rectangle',
        description: 'Find the area of a rectangle with length 8 cm and width 5 cm.',
        type: 'math',
        difficultyLevel: 1,
        isAssessment: true,
        prerequisites: [],
        expectedAnswer: '40',
    },
    {
        id: 'math-geo-2',
        title: 'Pythagorean Theorem',
        description: 'A right triangle has legs of length 3 and 4. Find the length of the hypotenuse.',
        type: 'math',
        difficultyLevel: 2,
        isAssessment: true,
        prerequisites: ['math-geo-1'],
        expectedAnswer: '5',
    },
    {
        id: 'sci-phys-1',
        title: 'Speed and Distance',
        description: 'A car travels at 60 mph for 2.5 hours. How far does it travel?',
        type: 'science',
        difficultyLevel: 2,
        isAssessment: true,
        prerequisites: [],
        expectedAnswer: '150',
    },
    {
        id: 'sci-phys-2',
        title: 'Velocity Concepts',
        description: 'If you\'re running at constant speed on a treadmill, is your position changing? Explain the concept of velocity.',
        type: 'science',
        difficultyLevel: 2,
        isAssessment: true,
        prerequisites: ['sci-phys-1'],
    },
    {
        id: 'sci-bio-1',
        title: 'Cell Structure',
        description: 'What is the powerhouse of the cell and what does it do?',
        type: 'science',
        difficultyLevel: 1,
        isAssessment: true,
        prerequisites: [],
        expectedAnswer: 'mitochondria',
    },
    {
        id: 'sci-bio-2',
        title: 'Photosynthesis',
        description: 'What are the reactants and products of photosynthesis?',
        type: 'science',
        difficultyLevel: 2,
        isAssessment: true,
        prerequisites: ['sci-bio-1'],
    },
];
function getProblemById(problemId) {
    return mockProblems.find(p => p.id === problemId);
}
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
    useEnhancedEngine: joi_1.default.boolean().default(false), // ADDED FOR ENHANCED FEATURES
});
const updateSessionSchema = joi_1.default.object({
    status: joi_1.default.string().required().valid('active', 'completed', 'paused', 'abandoned'),
    endTime: joi_1.default.date().iso().optional(),
});
const addInteractionSchema = joi_1.default.object({
    type: joi_1.default.string().required().valid('question', 'answer', 'hint', 'feedback', 'voice', 'image', 'student_response', 'enhanced_student_response', 'enhanced_tutor_response'),
    content: joi_1.default.string().required().min(1).max(10000),
    metadata: joi_1.default.object().optional(),
    processingTime: joi_1.default.number().integer().min(0).optional(),
    confidenceScore: joi_1.default.number().min(0).max(1).optional(),
});
// ADDED FOR ENHANCED FEATURES - Enhanced interaction validation schema
const enhancedInteractionSchema = joi_1.default.object({
    type: joi_1.default.string().required().valid('student_response', 'enhanced_student_response'),
    content: joi_1.default.string().required().min(1).max(10000),
    confidenceLevel: joi_1.default.number().min(0).max(1).optional(),
    metadata: joi_1.default.object({
        responseTime: joi_1.default.number().integer().min(0).optional(),
        questionType: joi_1.default.string().optional(),
        depthLevel: joi_1.default.number().integer().min(1).max(5).optional(),
        targetedConcepts: joi_1.default.array().items(joi_1.default.string()).optional()
    }).optional(),
    processingTime: joi_1.default.number().integer().min(0).optional(),
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
 *               submittedProblemId:
 *                 type: string
 *                 description: Optional submitted problem identifier
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
 *               useEnhancedEngine:
 *                 type: boolean
 *                 default: false
 *                 description: Enable enhanced Socratic features
 *     responses:
 *       201:
 *         description: Session created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.post('/', auth_1.optionalAuthMiddleware, rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const isDevEnv = process.env.NODE_ENV === 'development';
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
        const submittedProblem = ProblemProcessingService_1.ProblemProcessingServiceInstance.getSubmittedProblem(submittedProblemId, req.user?.id || 'dev-user-123');
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
            userId: req.user?.id || 'dev-user-123',
            submittedProblemId,
            problemType: sessionData.problemType,
        });
    }
    const session = await SessionService_1.SessionService.create({
        userId: req.user?.id || 'dev-user-123',
        ...sessionData,
    });
    // Track session creation (non-blocking)
    AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user?.id || 'dev-user-123',
        sessionId: session.id,
        eventType: 'session_created',
        eventData: {
            problemType: session.problemType,
            difficultyLevel: session.difficultyLevel,
            useEnhancedEngine: sessionData.useEnhancedEngine, // ADDED
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
    }).catch(err => logger_1.logger.warn('Analytics tracking failed', { error: err }));
    logger_1.logger.info('Session created successfully', {
        userId: req.user?.id || 'dev-user-123',
        sessionId: session.id,
        problemType: session.problemType,
        useEnhancedEngine: sessionData.useEnhancedEngine, // ADDED
    });
    return res.status(201).json({
        success: true,
        message: 'Session created successfully',
        data: session,
    });
}));
/**
 * @swagger
 * /api/sessions/{id}:
 *   get:
 *     summary: Get session details by ID
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Session details retrieved successfully
 *       404:
 *         description: Session not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', auth_1.authenticate, rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const session = await SessionService_1.SessionService.findById(id);
    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Session not found',
        });
    }
    // Ensure user owns the session or is admin
    if (session.userId !== (req.user?.id || 'demo-user') && req.user?.role !== 'admin') {
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
 * /api/sessions:
 *   get:
 *     summary: Get user's sessions
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, completed, paused, abandoned]
 *         description: Filter by session status
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
router.get('/', auth_1.authenticate, rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { status, limit = 20, offset = 0, userId: userIdQuery } = req.query;
    // Resolve environment/user flags early
    const isDevEnv = process.env.NODE_ENV === 'development';
    const isDevUser = !!req.user?.id && req.user.id.startsWith('dev-');
    const effectiveUserId = (isDevEnv || isDevUser) && typeof userIdQuery === 'string' && userIdQuery.length > 0
        ? userIdQuery
        : (req.user?.id || 'demo-user');
    let sessions = await SessionService_1.SessionService.findByUserId(effectiveUserId, Number(limit), Number(offset));
    // Development-friendly fallback: if authenticated dev user has no sessions, show recent
    // Trigger when in dev environment OR when the mocked dev user is present
    if (sessions.length === 0 && (isDevEnv || isDevUser)) {
        // First try demo-user sessions, then fall back to recent
        const demoSessions = await SessionService_1.SessionService.findByUserId('demo-user', Number(limit), Number(offset));
        if (demoSessions.length > 0) {
            sessions = demoSessions;
        }
        else {
            sessions = await SessionService_1.SessionService.listRecent(Number(limit), Number(offset));
        }
    }
    return res.json({
        success: true,
        data: sessions,
        pagination: {
            limit: Number(limit),
            offset: Number(offset),
            total: sessions.length,
        },
    });
}));
// Debug: list recent sessions (dev-only helper)
router.get('/dev/recent', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const recent = await SessionService_1.SessionService.listRecent(50, 0);
    return res.json({ success: true, data: recent, total: recent.length });
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
 *         description: Session ID
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
 *       404:
 *         description: Session not found
 *       401:
 *         description: Unauthorized
 */
router.patch('/:id', auth_1.authenticate, (0, auth_1.requireOwnership)('session'), rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { error, value } = updateSessionSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.details.map(detail => detail.message),
        });
    }
    const updatedSession = await SessionService_1.SessionService.updateStatus(id, value);
    if (!updatedSession) {
        return res.status(404).json({
            success: false,
            message: 'Session not found',
        });
    }
    // Track session completion
    if (value.status === 'completed') {
        AnalyticsService_1.AnalyticsService.trackEvent({
            userId: req.user?.id || 'demo-user',
            sessionId: id,
            eventType: 'session_completed',
            eventData: {
                duration: updatedSession.totalDuration,
                interactionCount: updatedSession.interactionCount,
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
        }).catch(err => logger_1.logger.warn('Analytics tracking failed', { error: err }));
    }
    logger_1.logger.info('Session status updated', {
        userId: req.user?.id || 'demo-user',
        sessionId: id,
        newStatus: value.status,
    });
    return res.json({
        success: true,
        message: 'Session updated successfully',
        data: updatedSession,
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
 *         description: Session ID
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
 *                 enum: [question, answer, hint, feedback, voice, image, student_response, enhanced_student_response, enhanced_tutor_response]
 *               content:
 *                 type: string
 *               metadata:
 *                 type: object
 *               processingTime:
 *                 type: integer
 *               confidenceScore:
 *                 type: number
 *     responses:
 *       201:
 *         description: Interaction added successfully
 *       404:
 *         description: Session not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/interactions', auth_1.authenticate, (0, auth_1.requireOwnership)('session'), rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { error, value } = addInteractionSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.details.map(detail => detail.message),
        });
    }
    const interaction = await SessionService_1.SessionService.addInteraction({
        sessionId: id,
        userId: req.user?.id || 'demo-user',
        ...value,
    });
    // Track interaction (non-blocking)
    AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user?.id || 'demo-user',
        sessionId: id,
        eventType: 'interaction_added',
        eventData: {
            interactionType: value.type,
            contentLength: value.content.length,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
    }).catch(err => logger_1.logger.warn('Analytics tracking failed', { error: err }));
    return res.status(201).json({
        success: true,
        message: 'Interaction added successfully',
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
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Interactions retrieved successfully
 *       404:
 *         description: Session not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/interactions', auth_1.authenticate, (0, auth_1.requireOwnership)('session'), rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const interactions = await SessionService_1.SessionService.getInteractions(id);
    return res.json({
        success: true,
        data: interactions,
    });
}));
// ======================== ENHANCED SOCRATIC ENDPOINTS START ========================
/**
 * @swagger
 * /api/sessions/{id}/enhanced-interactions:
 *   post:
 *     summary: Add enhanced Socratic interaction to session
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
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
 *                 enum: [student_response, enhanced_student_response]
 *               content:
 *                 type: string
 *               confidenceLevel:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *               metadata:
 *                 type: object
 *                 properties:
 *                   responseTime:
 *                     type: integer
 *     responses:
 *       201:
 *         description: Enhanced interaction processed successfully
 *       404:
 *         description: Session not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/enhanced-interactions', auth_1.optionalAuthMiddleware, rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { error, value } = enhancedInteractionSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.details.map(detail => detail.message),
        });
    }
    // Get session to ensure it exists
    const session = await SessionService_1.SessionService.findById(id);
    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Session not found',
        });
    }
    try {
        // Initialize enhanced Socratic engine
        // Check for strict mode header
        const strictMode = req.headers['x-strict-socratic'] === 'true' ||
            process.env.STRICT_SOCRATIC_MODE === 'true';
        const engine = new socratic_engine_1.SocraticEngine(undefined, strictMode);
        // Initialize session with problem
        engine.initializeSession(id);
        // Check if this session is using an assessment problem
        let problem;
        if (session.problemId) {
            problem = getProblemById(session.problemId);
        }
        if (problem && problem.isAssessment) {
            // Start in assessment mode with expected answer
            await engine.startAssessmentProblem(session.problemText, problem.expectedAnswer);
            logger_1.logger.info('Started session in assessment mode', {
                sessionId: id,
                problemId: problem.id,
                hasExpectedAnswer: !!problem.expectedAnswer
            });
        }
        else {
            // Start in normal tutoring mode
            await engine.startProblem(session.problemText);
        }
        // CRITICAL FIX: Restore conversation history from database
        const existingInteractions = await SessionService_1.SessionService.getInteractions(id);
        if (existingInteractions.length > 0) {
            // Build conversation history from stored interactions
            const conversationHistory = [];
            for (const interaction of existingInteractions) {
                if (interaction.type === 'enhanced_student_response' || interaction.type === 'student_response') {
                    conversationHistory.push({
                        role: 'user',
                        content: interaction.content,
                        timestamp: interaction.timestamp
                    });
                }
                else if (interaction.type === 'enhanced_tutor_response' || interaction.type === 'answer') {
                    conversationHistory.push({
                        role: 'assistant',
                        content: interaction.content,
                        timestamp: interaction.timestamp
                    });
                }
            }
            // Restore conversation into engine (no API calls, just rebuilding state)
            engine.restoreConversationHistory(conversationHistory);
        }
        // Get tutor response using enhanced engine with full context
        const tutorResponse = await engine.respondToStudent(value.content);
        // Get enhanced metadata from engine
        const analytics = engine.generateAnalytics();
        const depthTracker = engine.getDepthTracker();
        const questionSequence = engine.getQuestionTypeSequence();
        const currentQuestionType = questionSequence[questionSequence.length - 1];
        // Assess if student is struggling
        const studentConfidence = value.confidenceLevel || 0.5;
        const isStruggling = studentConfidence < 0.3;
        const hasDirectAnswer = engine.containsDirectAnswer(tutorResponse);
        const isUnderstandingCheck = engine.getConversationHistory().slice(-1)[0]?.isUnderstandingCheck || false;
        // Save student interaction
        const studentInteraction = await SessionService_1.SessionService.addInteraction({
            sessionId: id,
            userId: req.user?.id || 'demo-user',
            type: 'enhanced_student_response',
            content: value.content,
            metadata: {
                ...value.metadata,
                confidenceLevel: value.confidenceLevel,
            },
            processingTime: value.processingTime || 0,
            confidenceScore: value.confidenceLevel,
        });
        // Save tutor response with enhanced metadata
        const tutorInteraction = await SessionService_1.SessionService.addInteraction({
            sessionId: id,
            userId: req.user?.id || 'demo-user',
            type: 'enhanced_tutor_response',
            content: tutorResponse,
            metadata: {
                questionType: currentQuestionType,
                depthLevel: depthTracker.currentDepth,
                targetedConcepts: depthTracker.conceptualConnections.slice(-3),
                shouldDeepenInquiry: depthTracker.shouldDeepenInquiry,
            },
            processingTime: 0,
        });
        // Track enhanced interaction (non-blocking)
        AnalyticsService_1.AnalyticsService.trackEvent({
            userId: req.user?.id || 'demo-user',
            sessionId: id,
            eventType: 'enhanced_interaction',
            eventData: {
                questionType: currentQuestionType,
                depthLevel: depthTracker.currentDepth,
                confidenceLevel: value.confidenceLevel,
                conceptsExplored: depthTracker.conceptualConnections.slice(-3),
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
        }).catch(err => logger_1.logger.warn('Analytics tracking failed', { error: err }));
        logger_1.logger.info('Enhanced interaction processed', {
            userId: req.user?.id || 'demo-user',
            sessionId: id,
            questionType: currentQuestionType,
            depthLevel: depthTracker.currentDepth,
        });
        // Check if this was an assessment and it's now complete
        const wasAssessment = problem && problem.isAssessment;
        const assessmentComplete = wasAssessment && !engine.isInAssessmentMode();
        const assessmentCorrect = assessmentComplete && tutorResponse.includes('✅ Correct');
        return res.status(201).json({
            success: true,
            message: 'Enhanced interaction processed successfully',
            tutorResponse,
            questionType: currentQuestionType,
            depthLevel: depthTracker.currentDepth,
            targetedConcepts: depthTracker.conceptualConnections.slice(-3),
            // Assessment mode information
            isAssessmentMode: engine.isInAssessmentMode(),
            assessmentComplete,
            assessmentCorrect,
            // Flags - only show when relevant
            flags: {
                struggling: isStruggling,
                directAnswer: hasDirectAnswer,
                understandingCheck: isUnderstandingCheck,
            },
            analytics: {
                questionTypesUsed: analytics.questionTypesUsed,
                questionTypeDistribution: analytics.questionTypeDistribution,
                averageDepth: analytics.averageDepth,
                currentDepth: analytics.currentDepth,
                conceptsExplored: analytics.conceptsExplored,
                engagementScore: analytics.engagementScore,
                totalInteractions: analytics.totalInteractions,
            },
            data: {
                studentInteraction,
                tutorInteraction,
            },
        });
    }
    catch (engineError) {
        logger_1.logger.error('Enhanced interaction failed', {
            userId: req.user?.id || 'demo-user',
            sessionId: id,
            error: engineError,
        });
        return res.status(500).json({
            success: false,
            message: 'Failed to process enhanced interaction',
            error: process.env.NODE_ENV === 'development' ? engineError : undefined,
        });
    }
}));
/**
 * @swagger
 * /api/sessions/{id}/socratic-analytics:
 *   get:
 *     summary: Get Socratic analytics for session
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Socratic analytics retrieved successfully
 *       404:
 *         description: Session not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/socratic-analytics', auth_1.authenticate, (0, auth_1.requireOwnership)('session'), rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    // Get session to ensure it exists
    const session = await SessionService_1.SessionService.findById(id);
    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Session not found',
        });
    }
    // Get session interactions
    const interactions = await SessionService_1.SessionService.getInteractions(id);
    try {
        // Initialize enhanced engine to generate analytics
        const engine = new socratic_engine_1.SocraticEngine();
        engine.initializeSession(id);
        await engine.startProblem(session.problemText);
        // Replay interactions to rebuild state
        for (const interaction of interactions) {
            if (interaction.type === 'enhanced_student_response' || interaction.type === 'question') {
                await engine.respondToStudent(interaction.content);
            }
        }
        // Generate comprehensive analytics
        const analytics = engine.generateAnalytics();
        const depthTracker = engine.getDepthTracker();
        // Additional analytics from interactions
        const enhancedInteractions = interactions.filter(i => i.type === 'enhanced_student_response' || i.type === 'enhanced_tutor_response');
        const confidenceProgression = enhancedInteractions
            .filter(i => i.metadata?.confidenceLevel !== undefined)
            .map(i => i.metadata.confidenceLevel);
        return res.json({
            success: true,
            data: {
                ...analytics,
                confidenceProgression,
                sessionMetrics: {
                    totalDuration: session.totalDuration || 0,
                    interactionCount: interactions.length,
                    enhancedInteractionCount: enhancedInteractions.length,
                    averageResponseTime: confidenceProgression.length > 0
                        ? interactions
                            .filter(i => i.metadata?.responseTime)
                            .reduce((sum, i) => sum + (i.metadata.responseTime || 0), 0) / enhancedInteractions.length
                        : 0,
                },
                depthProgression: {
                    currentDepth: depthTracker.currentDepth,
                    maxDepthReached: depthTracker.maxDepthReached,
                    conceptualConnections: depthTracker.conceptualConnections,
                },
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to generate Socratic analytics', {
            userId: req.user?.id || 'demo-user',
            sessionId: id,
            error,
        });
        return res.status(500).json({
            success: false,
            message: 'Failed to generate analytics',
        });
    }
}));
/**
 * @swagger
 * /api/sessions/{id}/metacognitive-prompt:
 *   post:
 *     summary: Get metacognitive prompt for session
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *             properties:
 *               category:
 *                 type: string
 *                 enum: [processReflection, confidenceCheck, strategyAwareness, errorAnalysis]
 *     responses:
 *       200:
 *         description: Metacognitive prompt generated successfully
 *       404:
 *         description: Session not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/metacognitive-prompt', auth_1.authenticate, (0, auth_1.requireOwnership)('session'), rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { category } = req.body;
    if (!category || !['processReflection', 'confidenceCheck', 'strategyAwareness', 'errorAnalysis'].includes(category)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid category. Must be one of: processReflection, confidenceCheck, strategyAwareness, errorAnalysis',
        });
    }
    // Get session to ensure it exists
    const session = await SessionService_1.SessionService.findById(id);
    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Session not found',
        });
    }
    try {
        const engine = new socratic_engine_1.SocraticEngine();
        const prompt = engine.getMetacognitivePrompt(category);
        return res.json({
            success: true,
            data: {
                prompt,
                category,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to generate metacognitive prompt', {
            userId: req.user?.id || 'demo-user',
            sessionId: id,
            category,
            error,
        });
        return res.status(500).json({
            success: false,
            message: 'Failed to generate metacognitive prompt',
        });
    }
}));
// ======================== ENHANCED SOCRATIC ENDPOINTS END ========================
/**
 * @swagger
 * /api/sessions/{id}:
 *   delete:
 *     summary: Delete session
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Session deleted successfully
 *       404:
 *         description: Session not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', auth_1.authenticate, (0, auth_1.requireOwnership)('session'), rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    try {
        await SessionService_1.SessionService.delete(id);
        logger_1.logger.info('Session deleted', {
            userId: req.user?.id || 'demo-user',
            sessionId: id,
        });
        return res.json({
            success: true,
            message: 'Session deleted successfully',
        });
    }
    catch (error) {
        return res.status(404).json({
            success: false,
            message: 'Session not found',
        });
    }
}));
/**
 * @swagger
 * /api/sessions/{id}/stats:
 *   get:
 *     summary: Get session statistics
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Session statistics retrieved successfully
 *       404:
 *         description: Session not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/stats', auth_1.authenticate, (0, auth_1.requireOwnership)('session'), rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const session = await SessionService_1.SessionService.findById(id);
    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Session not found',
        });
    }
    const interactions = await SessionService_1.SessionService.getInteractions(id);
    return res.json({
        success: true,
        data: {
            sessionId: id,
            totalDuration: session.totalDuration,
            interactionCount: interactions.length,
            hintCount: session.hintCount,
            status: session.status,
            startTime: session.startTime,
            endTime: session.endTime,
        },
    });
}));
exports.default = router;
//# sourceMappingURL=sessions.js.map