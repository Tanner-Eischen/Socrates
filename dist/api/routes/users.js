"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserService_1 = require("../services/UserService");
const AnalyticsService_1 = require("../services/AnalyticsService");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../middleware/logger");
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
// Validation schemas
const updateProfileSchema = joi_1.default.object({
    firstName: joi_1.default.string().min(1).max(50).optional(),
    lastName: joi_1.default.string().min(1).max(50).optional(),
    bio: joi_1.default.string().max(500).optional(),
    preferences: joi_1.default.object({
        language: joi_1.default.string().valid('en', 'es', 'fr', 'de', 'zh', 'ja').optional(),
        theme: joi_1.default.string().valid('light', 'dark', 'auto').optional(),
        notifications: joi_1.default.object({
            email: joi_1.default.boolean().optional(),
            push: joi_1.default.boolean().optional(),
            sms: joi_1.default.boolean().optional(),
        }).optional(),
        learningStyle: joi_1.default.string().valid('visual', 'auditory', 'kinesthetic', 'reading').optional(),
        difficultyPreference: joi_1.default.number().integer().min(1).max(10).optional(),
    }).optional(),
    timezone: joi_1.default.string().max(50).optional(),
    avatar: joi_1.default.string().uri().optional(),
});
const updateUserSchema = joi_1.default.object({
    email: joi_1.default.string().email().optional(),
    role: joi_1.default.string().valid('student', 'tutor', 'admin').optional(),
    isActive: joi_1.default.boolean().optional(),
    firstName: joi_1.default.string().min(1).max(50).optional(),
    lastName: joi_1.default.string().min(1).max(50).optional(),
    bio: joi_1.default.string().max(500).optional(),
    preferences: joi_1.default.object().optional(),
    timezone: joi_1.default.string().max(50).optional(),
    avatar: joi_1.default.string().uri().optional(),
});
/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', auth_1.authenticate, rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = await UserService_1.UserService.findById(req.user.id);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
        });
    }
    // Remove sensitive information safely
    const userProfile = { ...user };
    delete userProfile.passwordHash;
    return res.json({
        success: true,
        data: userProfile,
    });
}));
/**
 * @swagger
 * /api/users/profile:
 *   patch:
 *     summary: Update current user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 maxLength: 50
 *               lastName:
 *                 type: string
 *                 maxLength: 50
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *               preferences:
 *                 type: object
 *                 properties:
 *                   language:
 *                     type: string
 *                     enum: [en, es, fr, de, zh, ja]
 *                   theme:
 *                     type: string
 *                     enum: [light, dark, auto]
 *                   notifications:
 *                     type: object
 *                     properties:
 *                       email:
 *                         type: boolean
 *                       push:
 *                         type: boolean
 *                       sms:
 *                         type: boolean
 *                   learningStyle:
 *                     type: string
 *                     enum: [visual, auditory, kinesthetic, reading]
 *                   difficultyPreference:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 10
 *               timezone:
 *                 type: string
 *                 maxLength: 50
 *               avatar:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.patch('/profile', auth_1.authenticate, rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.details.map(detail => detail.message),
        });
    }
    const updatedUser = await UserService_1.UserService.updateProfile(req.user.id, value);
    // Track profile update
    AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user.id,
        eventType: 'profile_updated',
        eventData: {
            updatedFields: Object.keys(value),
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
    });
    logger_1.logger.info('User profile updated via API', {
        userId: req.user.id,
        updatedFields: Object.keys(value),
    });
    // Remove sensitive information safely
    const userProfile = { ...updatedUser };
    delete userProfile.passwordHash;
    return res.json({
        success: true,
        data: userProfile,
    });
}));
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users]
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
 *         name: role
 *         schema:
 *           type: string
 *           enum: [student, tutor, admin]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           description: Search in name and email
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/', auth_1.authenticate, (0, auth_1.requireRole)(['admin']), rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const role = req.query.role;
    const isActive = req.query.isActive === 'true' ? true :
        req.query.isActive === 'false' ? false : undefined;
    const search = req.query.search;
    const { users, total } = await UserService_1.UserService.getAll(limit, offset);
    // Apply filters locally
    let filteredUsers = users;
    if (role) {
        filteredUsers = filteredUsers.filter(u => u.role === role);
    }
    if (typeof isActive === 'boolean') {
        filteredUsers = filteredUsers.filter(u => u.isActive === isActive);
    }
    if (search) {
        const q = search.toLowerCase();
        filteredUsers = filteredUsers.filter(u => (u.name?.toLowerCase().includes(q)) || (u.email?.toLowerCase().includes(q)));
    }
    // Remove sensitive information
    const sanitizedUsers = filteredUsers.map((user) => {
        const userWithoutPassword = { ...user };
        delete userWithoutPassword.passwordHash;
        return userWithoutPassword;
    });
    // Track admin user list access
    AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user.id,
        eventType: 'admin_users_accessed',
        eventData: {
            filters: { role, isActive, search },
            resultCount: sanitizedUsers.length,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
    });
    return res.json({
        success: true,
        data: sanitizedUsers,
        pagination: {
            limit,
            offset,
            total: sanitizedUsers.length,
        },
    });
}));
/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID (Admin only)
 *     tags: [Users]
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
 *         description: User retrieved successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/:id', auth_1.authenticate, (0, auth_1.requireRole)(['admin']), rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = await UserService_1.UserService.findById(req.params.id);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
        });
    }
    // Remove sensitive information safely
    const userProfile = { ...user };
    delete userProfile.passwordHash;
    // Track admin user access
    AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user.id,
        eventType: 'admin_user_accessed',
        eventData: {
            targetUserId: req.params.id,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
    });
    return res.json({
        success: true,
        data: userProfile,
    });
}));
/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     summary: Update user (Admin only)
 *     tags: [Users]
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
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [student, tutor, admin]
 *               isActive:
 *                 type: boolean
 *               firstName:
 *                 type: string
 *                 maxLength: 50
 *               lastName:
 *                 type: string
 *                 maxLength: 50
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *               preferences:
 *                 type: object
 *               timezone:
 *                 type: string
 *                 maxLength: 50
 *               avatar:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.patch('/:id', auth_1.authenticate, (0, auth_1.requireRole)(['admin']), rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.details.map(detail => detail.message),
        });
    }
    const user = await UserService_1.UserService.findById(req.params.id);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
        });
    }
    // Update user profile
    const updatedUser = await UserService_1.UserService.updateProfile(req.params.id, value);
    // Track admin user update
    AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user.id,
        eventType: 'admin_user_updated',
        eventData: {
            targetUserId: req.params.id,
            updatedFields: Object.keys(value),
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
    });
    logger_1.logger.info('User updated by admin via API', {
        adminUserId: req.user.id,
        targetUserId: req.params.id,
        updatedFields: Object.keys(value),
    });
    // Remove sensitive information safely
    const userProfile = { ...updatedUser };
    delete userProfile.passwordHash;
    return res.json({
        success: true,
        data: userProfile,
    });
}));
/**
 * @swagger
 * /api/users/{id}/deactivate:
 *   post:
 *     summary: Deactivate user (Admin only)
 *     tags: [Users]
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
 *         description: User deactivated successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.post('/:id/deactivate', auth_1.authenticate, (0, auth_1.requireRole)(['admin']), rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = await UserService_1.UserService.findById(req.params.id);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
        });
    }
    // Prevent self-deactivation
    if (req.params.id === req.user.id) {
        return res.status(400).json({
            success: false,
            message: 'Cannot deactivate your own account',
        });
    }
    await UserService_1.UserService.deactivate(req.params.id);
    // Track user deactivation
    AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user.id,
        eventType: 'admin_user_deactivated',
        eventData: {
            targetUserId: req.params.id,
            targetUserEmail: user.email,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
    });
    logger_1.logger.info('User deactivated by admin via API', {
        adminUserId: req.user.id,
        targetUserId: req.params.id,
        targetUserEmail: user.email,
    });
    return res.json({
        success: true,
        message: 'User deactivated successfully',
    });
}));
/**
 * @swagger
 * /api/users/analytics:
 *   get:
 *     summary: Get current user's analytics
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: month
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/analytics', auth_1.authenticate, rateLimiter_1.analyticsRateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const timeframe = req.query.timeframe || 'month';
    // Map timeframe to a Date range for analytics service
    const end = new Date();
    const start = new Date(end);
    switch (timeframe) {
        case 'day':
            start.setDate(end.getDate() - 1);
            break;
        case 'week':
            start.setDate(end.getDate() - 7);
            break;
        case 'month':
            start.setMonth(end.getMonth() - 1);
            break;
        case 'year':
            start.setFullYear(end.getFullYear() - 1);
            break;
        default:
            start.setMonth(end.getMonth() - 1);
            break;
    }
    const analytics = await AnalyticsService_1.AnalyticsService.getUserAnalytics(req.user.id, { start, end });
    return res.json({
        success: true,
        data: analytics,
    });
}));
/**
 * @swagger
 * /api/users/{id}/analytics:
 *   get:
 *     summary: Get user analytics (Admin/Tutor only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: month
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/:id/analytics', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'tutor']), rateLimiter_1.analyticsRateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = await UserService_1.UserService.findById(req.params.id);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
        });
    }
    const timeframe = req.query.timeframe || 'month';
    // Map timeframe to a Date range for analytics service
    const end = new Date();
    const start = new Date(end);
    switch (timeframe) {
        case 'day':
            start.setDate(end.getDate() - 1);
            break;
        case 'week':
            start.setDate(end.getDate() - 7);
            break;
        case 'month':
            start.setMonth(end.getMonth() - 1);
            break;
        case 'year':
            start.setFullYear(end.getFullYear() - 1);
            break;
        default:
            start.setMonth(end.getMonth() - 1);
            break;
    }
    const analytics = await AnalyticsService_1.AnalyticsService.getUserAnalytics(req.params.id, { start, end });
    // Track analytics access
    AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user.id,
        eventType: 'user_analytics_accessed',
        eventData: {
            targetUserId: req.params.id,
            timeframe,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
    });
    return res.json({
        success: true,
        data: analytics,
    });
}));
/**
 * @swagger
 * /api/users/stats:
 *   get:
 *     summary: Get user statistics (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/stats', auth_1.authenticate, (0, auth_1.requireRole)(['admin']), rateLimiter_1.analyticsRateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { users } = await UserService_1.UserService.getAll(1000, 0);
    const stats = {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.isActive).length,
        inactiveUsers: users.filter(u => !u.isActive).length,
        usersByRole: {
            students: users.filter(u => u.role === 'student').length,
            tutors: users.filter(u => u.role === 'tutor').length,
            admins: users.filter(u => u.role === 'admin').length,
        },
        recentRegistrations: users.filter(u => {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return new Date(u.createdAt) > weekAgo;
        }).length,
    };
    // Track stats access
    AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user.id,
        eventType: 'admin_stats_accessed',
        eventData: {
            statsType: 'users',
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
    });
    res.json({
        success: true,
        data: stats,
    });
}));
exports.default = router;
//# sourceMappingURL=users.js.map