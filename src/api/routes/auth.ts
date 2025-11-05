import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { 
  generateToken, 
  generateRefreshToken, 
  verifyToken, 
  authMiddleware,
  authenticate,
  AuthenticatedRequest 
} from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler, ValidationError, AuthenticationError, ConflictError } from '../middleware/errorHandler';
import { logger, auditLogger } from '../middleware/logger';
import { UserService } from '../services/UserService';

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(2).max(100).required(),
  role: Joi.string().valid('student', 'tutor').default('student'),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  rememberMe: Joi.boolean().default(false),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
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
router.post('/register', authRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    throw new ValidationError('Validation failed', error.details);
  }

  const { email, password, name, role } = value;

  // Check if user already exists
  const existingUser = await UserService.findByEmail(email);
  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  // Hash password
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create user
  const userId = uuidv4();
  const user = await UserService.create({
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

  const token = generateToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Log successful registration
  auditLogger.info('User registered', {
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
router.post('/login', authRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    throw new ValidationError('Validation failed', error.details);
  }

  const { email, password, rememberMe } = value;

  // Find user by email
  const user = await UserService.findByEmail(email);
  if (!user) {
    auditLogger.warn('Login attempt with non-existent email', {
      email,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    throw new AuthenticationError('Invalid email or password');
  }

  // Check if user is active
  if (!user.isActive) {
    auditLogger.warn('Login attempt with inactive account', {
      userId: user.id,
      email,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    throw new AuthenticationError('Account is deactivated');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    auditLogger.warn('Login attempt with invalid password', {
      userId: user.id,
      email,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    throw new AuthenticationError('Invalid email or password');
  }

  // Update last login
  await UserService.updateLastLogin(user.id);

  // Generate tokens
  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };

  const token = generateToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Log successful login
  auditLogger.info('User logged in', {
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
router.post('/refresh', authRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const { error, value } = refreshTokenSchema.validate(req.body);
  if (error) {
    throw new ValidationError('Validation failed', error.details);
  }

  const { refreshToken } = value;

  try {
    // Verify refresh token
    const decoded = verifyToken(refreshToken);

    // Check if user still exists and is active
    const user = await UserService.findById(decoded.id);
    if (!user || !user.isActive) {
      throw new AuthenticationError('User not found or inactive');
    }

    // Generate new tokens
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const newToken = generateToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    // Log token refresh
    auditLogger.info('Token refreshed', {
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
  } catch (error) {
    auditLogger.warn('Invalid refresh token used', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new AuthenticationError('Invalid refresh token');
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
router.post('/logout', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Log logout
  auditLogger.info('User logged out', {
    userId: req.user!.id,
    email: req.user!.email,
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
router.post('/change-password', authMiddleware, authRateLimiter, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Validate request body
  const { error, value } = changePasswordSchema.validate(req.body);
  if (error) {
    throw new ValidationError('Validation failed', error.details);
  }

  const { currentPassword, newPassword } = value;
  const userId = req.user!.id;

  // Get user with password hash
  const user = await UserService.findById(userId);
  if (!user) {
    throw new AuthenticationError('User not found');
  }

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isCurrentPasswordValid) {
    auditLogger.warn('Password change attempt with invalid current password', {
      userId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    throw new AuthenticationError('Invalid current password');
  }

  // Hash new password
  const saltRounds = 12;
  const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

  // Update password
  await UserService.updatePassword(userId, newPasswordHash);

  // Log password change
  auditLogger.info('Password changed', {
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
router.get('/me', authenticate, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  // Get user profile
  const user = await UserService.findById(userId);
  if (!user) {
    throw new AuthenticationError('User not found');
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

export default router;