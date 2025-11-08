import { Router, Response } from 'express';
import { AnalyticsService } from '../services/AnalyticsService';
import { SessionService } from '../services/SessionService';
import { authenticate, requireRole, requireOwnership, AuthenticatedRequest } from '../middleware/auth';
import { analyticsRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../middleware/logger';
import Joi from 'joi';
import { SocraticEngine } from '../../socratic-engine';

const router = Router();

// Validation schemas
const trackEventSchema = Joi.object({
  eventType: Joi.string().required().min(1).max(100),
  eventData: Joi.object().optional(),
  sessionId: Joi.string().optional(),
});

const analyticsQuerySchema = Joi.object({
  timeframe: Joi.string().valid('hour', 'day', 'week', 'month', 'year').default('day'),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  eventType: Joi.string().optional(),
  userId: Joi.string().optional(),
  sessionId: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(1000).default(100),
  offset: Joi.number().integer().min(0).default(0),
});

/**
 * @swagger
 * /api/analytics/track:
 *   post:
 *     summary: Track an analytics event
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventType
 *             properties:
 *               eventType:
 *                 type: string
 *                 maxLength: 100
 *                 description: Type of event to track
 *               eventData:
 *                 type: object
 *                 description: Additional event data
 *               sessionId:
 *                 type: string
 *                 description: Associated session ID
 *     responses:
 *       201:
 *         description: Event tracked successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.post('/track', 
  authenticate, 
  analyticsRateLimiter, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { error, value } = trackEventSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const event = await AnalyticsService.trackEvent({
      userId: req.user?.id || 'demo-user',
      sessionId: value.sessionId,
      eventType: value.eventType,
      eventData: value.eventData || {},
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Event may be null if database is unavailable
    return res.status(201).json({
      success: true,
      message: event ? 'Analytics event tracked successfully' : 'Analytics event tracking attempted (database unavailable)',
      data: event,
    });
  })
);

/**
 * @swagger
 * /api/analytics/user:
 *   get:
 *     summary: Get current user's analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [hour, day, week, month, year]
 *           default: day
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/user', 
  authenticate, 
  analyticsRateLimiter, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { error, value } = analyticsQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const buildTimeRange = (timeframe?: string, startDate?: Date, endDate?: Date): { start: Date; end: Date } | undefined => {
      if (startDate && endDate) return { start: new Date(startDate), end: new Date(endDate) };
      const now = new Date();
      switch (timeframe) {
        case 'hour':
          return { start: new Date(now.getTime() - 60 * 60 * 1000), end: now };
        case 'day':
          return { start: new Date(now.getTime() - 24 * 60 * 60 * 1000), end: now };
        case 'week':
          return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
        case 'month':
          return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end: now };
        case 'year':
          return { start: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000), end: now };
        default:
          return undefined;
      }
    };

    const timeRange = buildTimeRange(value.timeframe, value.startDate as any, value.endDate as any);

    const analytics = await AnalyticsService.getUserAnalytics(
      req.user!.id,
      timeRange
    );

    return res.json({
      success: true,
      data: analytics,
    });
  })
);

/**
 * @swagger
 * /api/analytics/events:
 *   get:
 *     summary: Get analytics events (Admin/Tutor only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [hour, day, week, month, year]
 *           default: day
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: sessionId
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *     responses:
 *       200:
 *         description: Events retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/events', 
  authenticate, 
  requireRole(['admin', 'tutor']),
  analyticsRateLimiter, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { error, value } = analyticsQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const buildTimeRange = (timeframe?: string, startDate?: Date, endDate?: Date): { start: Date; end: Date } | undefined => {
      if (startDate && endDate) return { start: new Date(startDate), end: new Date(endDate) };
      const now = new Date();
      switch (timeframe) {
        case 'hour':
          return { start: new Date(now.getTime() - 60 * 60 * 1000), end: now };
        case 'day':
          return { start: new Date(now.getTime() - 24 * 60 * 60 * 1000), end: now };
        case 'week':
          return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
        case 'month':
          return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end: now };
        case 'year':
          return { start: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000), end: now };
        default:
          return undefined;
      }
    };

    const timeRange = buildTimeRange(value.timeframe, value.startDate as any, value.endDate as any);

    const events = await AnalyticsService.getEventsByType(
      value.eventType || 'api_request',
      value.limit,
      value.offset,
      timeRange
    );

    // Filter by additional criteria if provided
    let filteredEvents = events;
    if (value.userId) {
      filteredEvents = filteredEvents.filter(event => event.userId === value.userId);
    }
    if (value.sessionId) {
      filteredEvents = filteredEvents.filter(event => event.sessionId === value.sessionId);
    }

    // Track analytics access (non-blocking)
    AnalyticsService.trackEvent({
      userId: req.user?.id || 'demo-user',
      eventType: 'analytics_events_accessed',
      eventData: {
        filters: {
          timeframe: value.timeframe,
          eventType: value.eventType,
          userId: value.userId,
          sessionId: value.sessionId,
        },
        resultCount: filteredEvents.length,
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.json({
      success: true,
      data: filteredEvents,
      pagination: {
        limit: value.limit,
        offset: value.offset,
        total: filteredEvents.length,
      },
    });
  })
);

/**
 * @swagger
 * /api/analytics/system:
 *   get:
 *     summary: Get system-wide analytics (Admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [hour, day, week, month, year]
 *           default: day
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: System analytics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/system', 
  authenticate, 
  requireRole(['admin']),
  analyticsRateLimiter, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { error, value } = analyticsQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const buildTimeRange = (timeframe?: string, startDate?: Date, endDate?: Date): { start: Date; end: Date } | undefined => {
      if (startDate && endDate) return { start: new Date(startDate), end: new Date(endDate) };
      const now = new Date();
      switch (timeframe) {
        case 'hour':
          return { start: new Date(now.getTime() - 60 * 60 * 1000), end: now };
        case 'day':
          return { start: new Date(now.getTime() - 24 * 60 * 60 * 1000), end: now };
        case 'week':
          return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
        case 'month':
          return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end: now };
        case 'year':
          return { start: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000), end: now };
        default:
          return undefined;
      }
    };

    const timeRange = buildTimeRange(value.timeframe, value.startDate as any, value.endDate as any);

    const systemMetrics = await AnalyticsService.getSystemMetrics(timeRange);

    // Track system analytics access (non-blocking)
    AnalyticsService.trackEvent({
      userId: req.user?.id || 'demo-user',
      eventType: 'system_analytics_accessed',
      eventData: {
        timeframe: value.timeframe,
        startDate: value.startDate,
        endDate: value.endDate,
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    logger.info('System analytics accessed', {
      userId: req.user!.id,
      timeframe: value.timeframe,
    });

    return res.json({
      success: true,
      data: systemMetrics,
    });
  })
);

/**
 * @swagger
 * /api/analytics/insights:
 *   get:
 *     summary: Get learning insights for current user
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *           default: month
 *     responses:
 *       200:
 *         description: Learning insights retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/insights', 
  authenticate, 
  analyticsRateLimiter, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timeframe = req.query.timeframe as string || 'month';
    
    if (!['week', 'month', 'year'].includes(timeframe)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid timeframe. Must be week, month, or year.',
      });
    }

    const insights = await AnalyticsService.generateLearningInsights(req.user!.id);

    return res.json({
      success: true,
      data: insights,
    });
  })
);

/**
 * @swagger
 * /api/analytics/behavior:
 *   get:
 *     summary: Get user behavior analysis (Admin/Tutor only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           description: User ID to analyze (optional for tutors, required for specific user analysis)
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *           default: month
 *     responses:
 *       200:
 *         description: Behavior analysis retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/behavior', 
  authenticate, 
  requireRole(['admin', 'tutor']),
  analyticsRateLimiter, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.query.userId as string || req.user!.id;
    const timeframe = req.query.timeframe as string || 'month';
    
    if (!['week', 'month', 'year'].includes(timeframe)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid timeframe. Must be week, month, or year.',
      });
    }

    // If tutor is requesting analysis for another user, they need admin privileges
    if (req.user!.role === 'tutor' && userId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'Tutors can only analyze their own behavior',
      });
    }

    const behaviorAnalysis = await AnalyticsService.getUserBehaviorPatterns(userId);

    // Track behavior analysis access (non-blocking)
    AnalyticsService.trackEvent({
      userId: req.user?.id || 'demo-user',
      eventType: 'behavior_analysis_accessed',
      eventData: {
        targetUserId: userId,
        timeframe,
        isOwnAnalysis: userId === req.user!.id,
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.json({
      success: true,
      data: behaviorAnalysis,
    });
  })
);

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get dashboard analytics summary
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard analytics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/dashboard', 
  authenticate, 
  analyticsRateLimiter, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const role = req.user!.role;

    // Get different analytics based on user role
    let dashboardData;

    if (role === 'admin') {
      // Admin gets system-wide metrics
      const now = new Date();
      const dayRange = { start: new Date(now.getTime() - 24 * 60 * 60 * 1000), end: now };
      const weekRange = { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
      const systemMetrics = await AnalyticsService.getSystemMetrics(dayRange);
      const userAnalytics = await AnalyticsService.getUserAnalytics(userId, weekRange);
      
      dashboardData = {
        systemMetrics,
        personalAnalytics: userAnalytics,
        role: 'admin',
      };
    } else if (role === 'tutor') {
      // Tutor gets their analytics plus limited system insights
      const now = new Date();
      const weekRange = { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
      const userAnalytics = await AnalyticsService.getUserAnalytics(userId, weekRange);
      const insights = await AnalyticsService.generateLearningInsights(userId);
      
      dashboardData = {
        personalAnalytics: userAnalytics,
        learningInsights: insights,
        role: 'tutor',
      };
    } else {
      // Student gets personal analytics and insights
      const now = new Date();
      const weekRange = { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
      const userAnalytics = await AnalyticsService.getUserAnalytics(userId, weekRange);
      const insights = await AnalyticsService.generateLearningInsights(userId);
      
      dashboardData = {
        personalAnalytics: userAnalytics,
        learningInsights: insights,
        role: 'student',
      };
    }

    // Track dashboard access (non-blocking)
    AnalyticsService.trackEvent({
      userId,
      eventType: 'dashboard_accessed',
      eventData: {
        role,
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.json({
      success: true,
      data: dashboardData,
    });
  })
);

/**
 * @swagger
 * /api/analytics/export:
 *   get:
 *     summary: Export analytics data (Admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: month
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Analytics data exported successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/export', 
  authenticate, 
  requireRole(['admin']),
  analyticsRateLimiter, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const format = req.query.format as string || 'json';
    const timeframe = req.query.timeframe as string || 'month';
    const eventType = req.query.eventType as string;
    const userId = req.query.userId as string;

    if (!['json', 'csv'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Must be json or csv.',
      });
    }

    // Get analytics data for export
    const buildTimeRange = (timeframe?: string): { start: Date; end: Date } | undefined => {
      const now = new Date();
      switch (timeframe) {
        case 'day':
          return { start: new Date(now.getTime() - 24 * 60 * 60 * 1000), end: now };
        case 'week':
          return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
        case 'month':
          return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end: now };
        case 'year':
          return { start: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000), end: now };
        default:
          return undefined;
      }
    };

    const timeRange = buildTimeRange(timeframe);

    const events = await AnalyticsService.getEventsByType(
      eventType || 'api_request',
      10000, // Large limit for export
      0,
      timeRange
    );

    let filteredEvents = events;
    if (userId) {
      filteredEvents = filteredEvents.filter(event => event.userId === userId);
    }

    // Track export (non-blocking)
    AnalyticsService.trackEvent({
      userId: req.user?.id || 'demo-user',
      eventType: 'analytics_exported',
      eventData: {
        format,
        timeframe,
        eventType,
        userId,
        recordCount: filteredEvents.length,
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    logger.info('Analytics data exported', {
      userId: req.user!.id,
      format,
      recordCount: filteredEvents.length,
    });

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeader = 'ID,User ID,Session ID,Event Type,Timestamp,IP Address,User Agent,Event Data\n';
      const csvRows = filteredEvents.map(event => 
        `${event.id},${event.userId},${event.sessionId || ''},${event.eventType},${event.timestamp},${event.ipAddress || ''},${event.userAgent || ''},"${JSON.stringify(event.eventData).replace(/"/g, '""')}"`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-${Date.now()}.csv"`);
      return res.send(csvHeader + csvRows);
    } else {
      return res.json({
        success: true,
        data: filteredEvents,
        exportInfo: {
          format,
          timestamp: new Date().toISOString(),
          recordCount: filteredEvents.length,
        },
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/sessions/{id}/journey:
 *   get:
 *     summary: Get learning journey timeline for a session
 *     tags: [Analytics]
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
 *         description: Journey timeline retrieved successfully
 *       404:
 *         description: Session not found
 *       401:
 *         description: Unauthorized
 */
router.get('/sessions/:id/journey',
  authenticate,
  requireOwnership('session'),
  analyticsRateLimiter,
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

    try {
      // Initialize engine and replay conversation
      const engine = new SocraticEngine();
      engine.initializeSession(id);
      await engine.startProblem(session.problemText);

      // Replay interactions to rebuild state
      for (const interaction of interactions) {
        if (interaction.type === 'enhanced_student_response' || interaction.type === 'question' || interaction.type === 'student_response') {
          await engine.respondToStudent(interaction.content);
        }
      }

      // Get conversation history
      const conversation = engine.getConversationHistory();

      // Build timeline
      const timeline = conversation
        .filter(msg => msg.role !== 'system')
        .map((msg, index) => {
          const turn = Math.floor(index / 2) + 1;
          return {
            turn,
            questionType: msg.questionType || 'unknown',
            depth: msg.depthLevel || 1,
            confidence: msg.studentConfidence || 0,
            confidenceDelta: msg.confidenceDelta,
            teachBackScore: msg.teachBackScore,
            transferSuccess: msg.transferAttempt?.success,
            reasoningScore: msg.reasoningScore,
            breakthrough: msg.breakthroughMoment || false
          };
        })
        .filter(entry => entry.questionType !== 'unknown' || entry.depth > 0);

      return res.json({
        success: true,
        data: timeline,
      });
    } catch (error) {
      logger.error('Failed to generate journey timeline', {
        userId: req.user?.id,
        sessionId: id,
        error,
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to generate journey timeline',
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/sessions/{id}/compliance:
 *   get:
 *     summary: Get Socratic compliance metrics for a session
 *     tags: [Analytics]
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
 *         description: Compliance metrics retrieved successfully
 *       404:
 *         description: Session not found
 *       401:
 *         description: Unauthorized
 */
router.get('/sessions/:id/compliance',
  authenticate,
  requireOwnership('session'),
  analyticsRateLimiter,
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

    try {
      // Initialize engine and replay conversation
      const engine = new SocraticEngine();
      engine.initializeSession(id);
      await engine.startProblem(session.problemText);

      // Replay interactions to rebuild state
      for (const interaction of interactions) {
        if (interaction.type === 'enhanced_student_response' || interaction.type === 'question' || interaction.type === 'student_response') {
          await engine.respondToStudent(interaction.content);
        }
      }

      // Get compliance metrics
      const complianceMetrics = engine.getSocraticComplianceMetrics();

      return res.json({
        success: true,
        data: complianceMetrics,
      });
    } catch (error) {
      logger.error('Failed to generate compliance metrics', {
        userId: req.user?.id,
        sessionId: id,
        error,
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to generate compliance metrics',
      });
    }
  })
);

/**
 * @swagger
 * /api/v1/analytics/session/{id}/report:
 *   get:
 *     summary: Get aggregated learning metrics report for a session
 *     tags: [Analytics]
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
 *         description: Learning report retrieved successfully
 *       404:
 *         description: Session not found
 *       401:
 *         description: Unauthorized
 */
router.get('/session/:id/report',
  authenticate,
  requireOwnership('session'),
  analyticsRateLimiter,
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

    try {
      // Initialize engine and replay conversation
      const engine = new SocraticEngine();
      engine.initializeSession(id);
      await engine.startProblem(session.problemText);

      // Replay interactions to rebuild state
      for (const interaction of interactions) {
        if (interaction.type === 'enhanced_student_response' || interaction.type === 'question' || interaction.type === 'student_response') {
          await engine.respondToStudent(interaction.content);
        }
      }

      // Get learning gains
      const learningGains = engine.computeSessionLearningGains();

      return res.json({
        success: true,
        data: {
          transferSuccessRate: learningGains.transferSuccessRate,
          avgTeachBackScore: learningGains.teachBackScores.length > 0
            ? learningGains.teachBackScores.reduce((sum, score) => sum + score, 0) / learningGains.teachBackScores.length
            : 0,
          avgReasoningScore: learningGains.reasoningScoreAvg,
          calibrationErrorAvg: learningGains.calibrationErrorAvg,
          depthTrajectory: learningGains.depthTrajectory,
          breakthroughs: learningGains.breakthroughs
        },
      });
    } catch (error) {
      logger.error('Failed to generate learning report', {
        userId: req.user?.id,
        sessionId: id,
        error,
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to generate learning report',
      });
    }
  })
);

export default router;