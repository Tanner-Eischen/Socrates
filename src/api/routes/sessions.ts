import { Router, Response } from 'express';
import { SessionService } from '../services/SessionService';
import { AnalyticsService } from '../services/AnalyticsService';
import { ProblemProcessingServiceInstance } from '../services/ProblemProcessingService';
import { authenticate, requireOwnership, optionalAuthMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../middleware/logger';
import Joi from 'joi';
import { SocraticEngine } from '../../socratic-engine'; // ADDED FOR ENHANCED FEATURES

const router = Router();

// Validation schemas
const createSessionSchema = Joi.object({
  problemId: Joi.string().optional(),
  submittedProblemId: Joi.string().optional(),
  problemText: Joi.string().when('submittedProblemId', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required()
  }).min(1).max(10000),
  problemType: Joi.string().when('submittedProblemId', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required()
  }).valid('math', 'science', 'programming', 'logic', 'language', 'other'),
  difficultyLevel: Joi.number().integer().min(1).max(10).default(1),
  useEnhancedEngine: Joi.boolean().default(false), // ADDED FOR ENHANCED FEATURES
});

const updateSessionSchema = Joi.object({
  status: Joi.string().required().valid('active', 'completed', 'paused', 'abandoned'),
  endTime: Joi.date().iso().optional(),
});

const addInteractionSchema = Joi.object({
  type: Joi.string().required().valid('question', 'answer', 'hint', 'feedback', 'voice', 'image', 'student_response', 'enhanced_student_response', 'enhanced_tutor_response'),
  content: Joi.string().required().min(1).max(10000),
  metadata: Joi.object().optional(),
  processingTime: Joi.number().integer().min(0).optional(),
  confidenceScore: Joi.number().min(0).max(1).optional(),
});

// ADDED FOR ENHANCED FEATURES - Enhanced interaction validation schema
const enhancedInteractionSchema = Joi.object({
  type: Joi.string().required().valid('student_response', 'enhanced_student_response'),
  content: Joi.string().required().min(1).max(10000),
  confidenceLevel: Joi.number().min(0).max(1).optional(),
  metadata: Joi.object({
    responseTime: Joi.number().integer().min(0).optional(),
    questionType: Joi.string().optional(),
    depthLevel: Joi.number().integer().min(1).max(5).optional(),
    targetedConcepts: Joi.array().items(Joi.string()).optional()
  }).optional(),
  processingTime: Joi.number().integer().min(0).optional(),
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
router.post('/',
  optionalAuthMiddleware,
  rateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
        const submittedProblem = ProblemProcessingServiceInstance.getSubmittedProblem(
          submittedProblemId,
          req.user?.id || 'demo-user'
        );

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
      const difficultyMap: Record<string, number> = {
        beginner: 1,
        intermediate: 5,
        advanced: 8,
      };
      sessionData.difficultyLevel = difficultyMap[submittedProblem.parsedProblem.difficulty] || 1;

      logger.info('Creating session from submitted problem', {
        userId: req.user?.id || 'demo-user',
        submittedProblemId,
        problemType: sessionData.problemType,
      });
    }

    const session = await SessionService.create({
      userId: req.user?.id || 'demo-user',
      ...sessionData,
    });

    // Track session creation (non-blocking)
    AnalyticsService.trackEvent({
      userId: req.user?.id || 'demo-user',
      sessionId: session.id,
      eventType: 'session_created',
      eventData: {
        problemType: session.problemType,
        difficultyLevel: session.difficultyLevel,
        useEnhancedEngine: sessionData.useEnhancedEngine, // ADDED
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    }).catch(err => logger.warn('Analytics tracking failed', { error: err }));

    logger.info('Session created successfully', {
      userId: req.user?.id || 'demo-user',
      sessionId: session.id,
      problemType: session.problemType,
      useEnhancedEngine: sessionData.useEnhancedEngine, // ADDED
    });

    return res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: session,
    });
  })
);

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
router.get('/:id',
  authenticate,
  rateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const session = await SessionService.findById(id);
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
  })
);

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
router.get('/',
  authenticate,
  rateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { status, limit = 20, offset = 0 } = req.query;

    const sessions = await SessionService.findByUserId(
      req.user?.id || 'demo-user',
      Number(limit),
      Number(offset)
    );

    return res.json({
      success: true,
      data: sessions,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: sessions.length,
      },
    });
  })
);

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
router.patch('/:id',
  authenticate,
  requireOwnership('session'),
  rateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { error, value } = updateSessionSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const updatedSession = await SessionService.updateStatus(id, value);
    if (!updatedSession) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Track session completion
    if (value.status === 'completed') {
      AnalyticsService.trackEvent({
        userId: req.user?.id || 'demo-user',
        sessionId: id,
        eventType: 'session_completed',
        eventData: {
          duration: updatedSession.totalDuration,
          interactionCount: updatedSession.interactionCount,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      }).catch(err => logger.warn('Analytics tracking failed', { error: err }));
    }

    logger.info('Session status updated', {
      userId: req.user?.id || 'demo-user',
      sessionId: id,
      newStatus: value.status,
    });

    return res.json({
      success: true,
      message: 'Session updated successfully',
      data: updatedSession,
    });
  })
);

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
router.post('/:id/interactions',
  authenticate,
  requireOwnership('session'),
  rateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { error, value } = addInteractionSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const interaction = await SessionService.addInteraction({
      sessionId: id,
      userId: req.user?.id || 'demo-user',
      ...value,
    });

    // Track interaction (non-blocking)
    AnalyticsService.trackEvent({
      userId: req.user?.id || 'demo-user',
      sessionId: id,
      eventType: 'interaction_added',
      eventData: {
        interactionType: value.type,
        contentLength: value.content.length,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    }).catch(err => logger.warn('Analytics tracking failed', { error: err }));

    return res.status(201).json({
      success: true,
      message: 'Interaction added successfully',
      data: interaction,
    });
  })
);

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
router.get('/:id/interactions',
  authenticate,
  requireOwnership('session'),
  rateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const interactions = await SessionService.getInteractions(id);

    return res.json({
      success: true,
      data: interactions,
    });
  })
);

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
router.post('/:id/enhanced-interactions',
  optionalAuthMiddleware,
  rateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
    const session = await SessionService.findById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    try {
      // Initialize enhanced Socratic engine
      const engine = new SocraticEngine();
      
      // Initialize session with problem
      engine.initializeSession(id);
      await engine.startProblem(session.problemText);
      
      // Get tutor response using enhanced engine
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
      const studentInteraction = await SessionService.addInteraction({
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
      const tutorInteraction = await SessionService.addInteraction({
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
      AnalyticsService.trackEvent({
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
      }).catch(err => logger.warn('Analytics tracking failed', { error: err }));

      logger.info('Enhanced interaction processed', {
        userId: req.user?.id || 'demo-user',
        sessionId: id,
        questionType: currentQuestionType,
        depthLevel: depthTracker.currentDepth,
      });

      return res.status(201).json({
        success: true,
        message: 'Enhanced interaction processed successfully',
        tutorResponse,
        questionType: currentQuestionType,
        depthLevel: depthTracker.currentDepth,
        targetedConcepts: depthTracker.conceptualConnections.slice(-3),
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

    } catch (engineError) {
      logger.error('Enhanced interaction failed', {
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
  })
);

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
router.get('/:id/socratic-analytics',
  authenticate,
  requireOwnership('session'),
  rateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    // Get session to ensure it exists
    const session = await SessionService.findById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Get session interactions
    const interactions = await SessionService.getInteractions(id);

    try {
      // Initialize enhanced engine to generate analytics
      const engine = new SocraticEngine();
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
      const enhancedInteractions = interactions.filter(i => 
        i.type === 'enhanced_student_response' || i.type === 'enhanced_tutor_response'
      );

      const confidenceProgression = enhancedInteractions
        .filter(i => i.metadata?.confidenceLevel !== undefined)
        .map(i => i.metadata!.confidenceLevel!);

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
                  .reduce((sum, i) => sum + (i.metadata!.responseTime! || 0), 0) / enhancedInteractions.length
              : 0,
          },
          depthProgression: {
            currentDepth: depthTracker.currentDepth,
            maxDepthReached: depthTracker.maxDepthReached,
            conceptualConnections: depthTracker.conceptualConnections,
          },
        },
      });

    } catch (error) {
      logger.error('Failed to generate Socratic analytics', {
        userId: req.user?.id || 'demo-user',
        sessionId: id,
        error,
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to generate analytics',
      });
    }
  })
);

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
router.post('/:id/metacognitive-prompt',
  authenticate,
  requireOwnership('session'),
  rateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { category } = req.body;

    if (!category || !['processReflection', 'confidenceCheck', 'strategyAwareness', 'errorAnalysis'].includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category. Must be one of: processReflection, confidenceCheck, strategyAwareness, errorAnalysis',
      });
    }

    // Get session to ensure it exists
    const session = await SessionService.findById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    try {
      const engine = new SocraticEngine();
      const prompt = engine.getMetacognitivePrompt(category);

      return res.json({
        success: true,
        data: {
          prompt,
          category,
        },
      });

    } catch (error) {
      logger.error('Failed to generate metacognitive prompt', {
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
  })
);

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
router.delete('/:id',
  authenticate,
  requireOwnership('session'),
  rateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    try {
      await SessionService.delete(id);
      
      logger.info('Session deleted', {
        userId: req.user?.id || 'demo-user',
        sessionId: id,
      });

      return res.json({
        success: true,
        message: 'Session deleted successfully',
      });
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }
  })
);

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
router.get('/:id/stats', 
  authenticate, 
  requireOwnership('session'),
  rateLimiter, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const session = await SessionService.findById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    const interactions = await SessionService.getInteractions(id);

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
  })
);

export default router;