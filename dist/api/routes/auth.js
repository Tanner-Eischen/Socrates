"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const joi_1 = __importDefault(require("joi"));
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../middleware/logger");
const UserService_1 = require("../services/UserService");
const InMemoryUserService_1 = require("../services/InMemoryUserService");
// Use in-memory storage for development (replace with actual DB in production)
const userService = process.env.NODE_ENV === 'production' ? UserService_1.UserService : InMemoryUserService_1.InMemoryUserServiceInstance;
const router = express_1.default.Router();
// Validation schemas
const registerSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(8).required(),
    name: joi_1.default.string().min(2).max(100).required(),
    role: joi_1.default.string().valid('student', 'tutor').default('student'),
});
const loginSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().required(),
    rememberMe: joi_1.default.boolean().default(false),
});
const refreshTokenSchema = joi_1.default.object({
    refreshToken: joi_1.default.string().required(),
});
const changePasswordSchema = joi_1.default.object({
    currentPassword: joi_1.default.string().required(),
    newPassword: joi_1.default.string().min(8).required(),
});
/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               role:
 *                 type: string
 *                 enum: [student, tutor]
 *                 default: student
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists
 */
router.post('/register', rateLimiter_1.authRateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // Validate request body
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
        throw new errorHandler_1.ValidationError('Validation failed', error.details);
    }
    const { email, password, name, role } = value;
    // Check if user already exists
    const existingUser = await userService.findByEmail(email);
    if (existingUser) {
        throw new errorHandler_1.ConflictError('User with this email already exists');
    }
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcryptjs_1.default.hash(password, saltRounds);
    // Create user
    const userId = (0, uuid_1.v4)();
    const user = await userService.create({
        id: userId,
        email,
        passwordHash,
        name,
        role,
    });
    // Generate tokens
    const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
    };
    const token = (0, auth_1.generateToken)(tokenPayload);
    const refreshToken = (0, auth_1.generateRefreshToken)(tokenPayload);
    // Log successful registration
    logger_1.auditLogger.info('User registered', {
        userId: user.id,
        email: user.email,
        role: user.role,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
    });
    res.status(201).json({
        message: 'User registered successfully',
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        },
        token,
        refreshToken,
        expiresIn: 24 * 60 * 60, // 24 hours in seconds
    });
}));
/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               rememberMe:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', rateLimiter_1.authRateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // Validate request body
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
        throw new errorHandler_1.ValidationError('Validation failed', error.details);
    }
    const { email, password, rememberMe } = value;
    // Find user by email
    const user = await userService.findByEmail(email);
    if (!user) {
        logger_1.auditLogger.warn('Login attempt with non-existent email', {
            email,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
        });
        throw new errorHandler_1.AuthenticationError('Invalid email or password');
    }
    // Check if user is active
    if (!user.isActive) {
        logger_1.auditLogger.warn('Login attempt with inactive account', {
            userId: user.id,
            email,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
        });
        throw new errorHandler_1.AuthenticationError('Account is deactivated');
    }
    // Verify password
    const isPasswordValid = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!isPasswordValid) {
        logger_1.auditLogger.warn('Login attempt with invalid password', {
            userId: user.id,
            email,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
        });
        throw new errorHandler_1.AuthenticationError('Invalid email or password');
    }
    // Update last login
    await userService.updateLastLogin(user.id);
    // Generate tokens
    const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
    };
    const token = (0, auth_1.generateToken)(tokenPayload);
    const refreshToken = (0, auth_1.generateRefreshToken)(tokenPayload);
    // Log successful login
    logger_1.auditLogger.info('User logged in', {
        userId: user.id,
        email: user.email,
        role: user.role,
        rememberMe,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
    });
    res.json({
        message: 'Login successful',
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        },
        token,
        refreshToken,
        expiresIn: 24 * 60 * 60, // 24 hours in seconds
    });
}));
/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh', rateLimiter_1.authRateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // Validate request body
    const { error, value } = refreshTokenSchema.validate(req.body);
    if (error) {
        throw new errorHandler_1.ValidationError('Validation failed', error.details);
    }
    const { refreshToken } = value;
    try {
        // Verify refresh token
        const decoded = (0, auth_1.verifyToken)(refreshToken);
        // Check if user still exists and is active
        const user = await userService.findById(decoded.id);
        if (!user || !user.isActive) {
            throw new errorHandler_1.AuthenticationError('User not found or inactive');
        }
        // Generate new tokens
        const tokenPayload = {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
        };
        const newToken = (0, auth_1.generateToken)(tokenPayload);
        const newRefreshToken = (0, auth_1.generateRefreshToken)(tokenPayload);
        // Log token refresh
        logger_1.auditLogger.info('Token refreshed', {
            userId: user.id,
            email: user.email,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
        });
        res.json({
            message: 'Token refreshed successfully',
            token: newToken,
            refreshToken: newRefreshToken,
            expiresIn: 24 * 60 * 60, // 24 hours in seconds
        });
    }
    catch (error) {
        logger_1.auditLogger.warn('Invalid refresh token used', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new errorHandler_1.AuthenticationError('Invalid refresh token');
    }
}));
/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // Log logout
    logger_1.auditLogger.info('User logged out', {
        userId: req.user.id,
        email: req.user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
    });
    res.json({
        message: 'Logout successful',
    });
}));
/**
 * @swagger
 * /api/v1/auth/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid current password
 */
router.post('/change-password', auth_1.authMiddleware, rateLimiter_1.authRateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // Validate request body
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
        throw new errorHandler_1.ValidationError('Validation failed', error.details);
    }
    const { currentPassword, newPassword } = value;
    const userId = req.user.id;
    // Get user with password hash
    const user = await userService.findById(userId);
    if (!user) {
        throw new errorHandler_1.AuthenticationError('User not found');
    }
    // Verify current password
    const isCurrentPasswordValid = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
        logger_1.auditLogger.warn('Password change attempt with invalid current password', {
            userId,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
        });
        throw new errorHandler_1.AuthenticationError('Invalid current password');
    }
    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcryptjs_1.default.hash(newPassword, saltRounds);
    // Update password
    await userService.updatePassword(userId, newPasswordHash);
    // Log password change
    logger_1.auditLogger.info('Password changed', {
        userId,
        email: user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
    });
    res.json({
        message: 'Password changed successfully',
    });
}));
/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/me', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    // Get user profile
    const user = await userService.findById(userId);
    if (!user) {
        throw new errorHandler_1.AuthenticationError('User not found');
    }
    res.json({
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
        },
    });
}));
exports.default = router;
//# sourceMappingURL=auth.js.map