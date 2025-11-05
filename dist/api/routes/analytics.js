"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AnalyticsService_1 = require("../services/AnalyticsService");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../middleware/logger");
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
// Validation schemas
const trackEventSchema = joi_1.default.object({
    eventType: joi_1.default.string().required().min(1).max(100),
    eventData: joi_1.default.object().optional(),
    sessionId: joi_1.default.string().optional(),
});
const analyticsQuerySchema = joi_1.default.object({
    timeframe: joi_1.default.string().valid('hour', 'day', 'week', 'month', 'year').default('day'),
    startDate: joi_1.default.date().iso().optional(),
    endDate: joi_1.default.date().iso().optional(),
    eventType: joi_1.default.string().optional(),
    userId: joi_1.default.string().optional(),
    sessionId: joi_1.default.string().optional(),
    limit: joi_1.default.number().integer().min(1).max(1000).default(100),
    offset: joi_1.default.number().integer().min(0).default(0),
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
router.post('/track', auth_1.authenticate, rateLimiter_1.analyticsRateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error, value } = trackEventSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.details.map(detail => detail.message),
        });
    }
    const event = await AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user.id,
        sessionId: value.sessionId,
        eventType: value.eventType,
        eventData: value.eventData || {},
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
    });
    return res.status(201).json({
        success: true,
        data: event,
    });
}));
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
router.get('/user', auth_1.authenticate, rateLimiter_1.analyticsRateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error, value } = analyticsQuerySchema.validate(req.query);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.details.map(detail => detail.message),
        });
    }
    const buildTimeRange = (timeframe, startDate, endDate) => {
        if (startDate && endDate)
            return { start: new Date(startDate), end: new Date(endDate) };
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
    const timeRange = buildTimeRange(value.timeframe, value.startDate, value.endDate);
    const analytics = await AnalyticsService_1.AnalyticsService.getUserAnalytics(req.user.id, timeRange);
    return res.json({
        success: true,
        data: analytics,
    });
}));
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
router.get('/events', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'tutor']), rateLimiter_1.analyticsRateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error, value } = analyticsQuerySchema.validate(req.query);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.details.map(detail => detail.message),
        });
    }
    const buildTimeRange = (timeframe, startDate, endDate) => {
        if (startDate && endDate)
            return { start: new Date(startDate), end: new Date(endDate) };
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
    const timeRange = buildTimeRange(value.timeframe, value.startDate, value.endDate);
    const events = await AnalyticsService_1.AnalyticsService.getEventsByType(value.eventType || 'api_request', value.limit, value.offset, timeRange);
    // Filter by additional criteria if provided
    let filteredEvents = events;
    if (value.userId) {
        filteredEvents = filteredEvents.filter(event => event.userId === value.userId);
    }
    if (value.sessionId) {
        filteredEvents = filteredEvents.filter(event => event.sessionId === value.sessionId);
    }
    // Track analytics access
    await AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user.id,
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
}));
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
router.get('/system', auth_1.authenticate, (0, auth_1.requireRole)(['admin']), rateLimiter_1.analyticsRateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error, value } = analyticsQuerySchema.validate(req.query);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.details.map(detail => detail.message),
        });
    }
    const buildTimeRange = (timeframe, startDate, endDate) => {
        if (startDate && endDate)
            return { start: new Date(startDate), end: new Date(endDate) };
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
    const timeRange = buildTimeRange(value.timeframe, value.startDate, value.endDate);
    const systemMetrics = await AnalyticsService_1.AnalyticsService.getSystemMetrics(timeRange);
    // Track system analytics access
    await AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user.id,
        eventType: 'system_analytics_accessed',
        eventData: {
            timeframe: value.timeframe,
            startDate: value.startDate,
            endDate: value.endDate,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
    });
    logger_1.logger.info('System analytics accessed', {
        userId: req.user.id,
        timeframe: value.timeframe,
    });
    return res.json({
        success: true,
        data: systemMetrics,
    });
}));
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
router.get('/insights', auth_1.authenticate, rateLimiter_1.analyticsRateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const timeframe = req.query.timeframe || 'month';
    if (!['week', 'month', 'year'].includes(timeframe)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid timeframe. Must be week, month, or year.',
        });
    }
    const insights = await AnalyticsService_1.AnalyticsService.generateLearningInsights(req.user.id);
    return res.json({
        success: true,
        data: insights,
    });
}));
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
router.get('/behavior', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'tutor']), rateLimiter_1.analyticsRateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.query.userId || req.user.id;
    const timeframe = req.query.timeframe || 'month';
    if (!['week', 'month', 'year'].includes(timeframe)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid timeframe. Must be week, month, or year.',
        });
    }
    // If tutor is requesting analysis for another user, they need admin privileges
    if (req.user.role === 'tutor' && userId !== req.user.id) {
        return res.status(403).json({
            success: false,
            message: 'Tutors can only analyze their own behavior',
        });
    }
    const behaviorAnalysis = await AnalyticsService_1.AnalyticsService.getUserBehaviorPatterns(userId);
    // Track behavior analysis access
    await AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user.id,
        eventType: 'behavior_analysis_accessed',
        eventData: {
            targetUserId: userId,
            timeframe,
            isOwnAnalysis: userId === req.user.id,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
    });
    return res.json({
        success: true,
        data: behaviorAnalysis,
    });
}));
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
router.get('/dashboard', auth_1.authenticate, rateLimiter_1.analyticsRateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;
    // Get different analytics based on user role
    let dashboardData;
    if (role === 'admin') {
        // Admin gets system-wide metrics
        const now = new Date();
        const dayRange = { start: new Date(now.getTime() - 24 * 60 * 60 * 1000), end: now };
        const weekRange = { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
        const systemMetrics = await AnalyticsService_1.AnalyticsService.getSystemMetrics(dayRange);
        const userAnalytics = await AnalyticsService_1.AnalyticsService.getUserAnalytics(userId, weekRange);
        dashboardData = {
            systemMetrics,
            personalAnalytics: userAnalytics,
            role: 'admin',
        };
    }
    else if (role === 'tutor') {
        // Tutor gets their analytics plus limited system insights
        const now = new Date();
        const weekRange = { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
        const userAnalytics = await AnalyticsService_1.AnalyticsService.getUserAnalytics(userId, weekRange);
        const insights = await AnalyticsService_1.AnalyticsService.generateLearningInsights(userId);
        dashboardData = {
            personalAnalytics: userAnalytics,
            learningInsights: insights,
            role: 'tutor',
        };
    }
    else {
        // Student gets personal analytics and insights
        const now = new Date();
        const weekRange = { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
        const userAnalytics = await AnalyticsService_1.AnalyticsService.getUserAnalytics(userId, weekRange);
        const insights = await AnalyticsService_1.AnalyticsService.generateLearningInsights(userId);
        dashboardData = {
            personalAnalytics: userAnalytics,
            learningInsights: insights,
            role: 'student',
        };
    }
    // Track dashboard access
    await AnalyticsService_1.AnalyticsService.trackEvent({
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
}));
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
router.get('/export', auth_1.authenticate, (0, auth_1.requireRole)(['admin']), rateLimiter_1.analyticsRateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const format = req.query.format || 'json';
    const timeframe = req.query.timeframe || 'month';
    const eventType = req.query.eventType;
    const userId = req.query.userId;
    if (!['json', 'csv'].includes(format)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid format. Must be json or csv.',
        });
    }
    // Get analytics data for export
    const buildTimeRange = (timeframe) => {
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
    const events = await AnalyticsService_1.AnalyticsService.getEventsByType(eventType || 'api_request', 10000, // Large limit for export
    0, timeRange);
    let filteredEvents = events;
    if (userId) {
        filteredEvents = filteredEvents.filter(event => event.userId === userId);
    }
    // Track export
    await AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user.id,
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
    logger_1.logger.info('Analytics data exported', {
        userId: req.user.id,
        format,
        recordCount: filteredEvents.length,
    });
    if (format === 'csv') {
        // Convert to CSV format
        const csvHeader = 'ID,User ID,Session ID,Event Type,Timestamp,IP Address,User Agent,Event Data\n';
        const csvRows = filteredEvents.map(event => `${event.id},${event.userId},${event.sessionId || ''},${event.eventType},${event.timestamp},${event.ipAddress || ''},${event.userAgent || ''},"${JSON.stringify(event.eventData).replace(/"/g, '""')}"`).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="analytics-${Date.now()}.csv"`);
        return res.send(csvHeader + csvRows);
    }
    else {
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
}));
exports.default = router;
//# sourceMappingURL=analytics.js.map