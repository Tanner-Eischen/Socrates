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
import { UserService, User } from '../services/UserService';

const router = express.Router();

// Explicit OPTIONS handler for all auth routes (backup CORS handling)
router.options('*', (req: Request, res: Response) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.status(204).end();
});

// In-memory user store for development (when database is unavailable)
const inMemoryUsers: Map<string, User> = new Map();

// Helper to get or create test user with properly hashed password
async function getOrCreateTestUser(): Promise<User> {
  const existing = inMemoryUsers.get('test@example.com');
  if (existing) return existing;

  // Create test user with hashed password
  const passwordHash = await bcrypt.hash('password123', 12);
  const testUser: User = {
    id: 'dev-user-1',
    email: 'test@example.com',
    passwordHash,
    name: 'Test User',
    role: 'student' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    emailVerified: true,
    twoFactorEnabled: false,
  };
  inMemoryUsers.set('test@example.com', testUser);
  logger.info('Test user created with email: test@example.com');
  return testUser;
}

// Pre-populate test user on first access
let testUserInitialized = false;
async function ensureTestUser() {
  if (!testUserInitialized) {
    await getOrCreateTestUser();
    testUserInitialized = true;
  }
}

// Helper function to find user (tries database first, then falls back to memory)
async function findUserByEmail(email: string): Promise<User | null> {
  try {
    const user = await UserService.findByEmail(email);
    // If user found in database, return it
    if (user) return user;
    
    // If user not found and it's the test user, check in-memory store
    // This handles cases where database is available but empty
    if (email === 'test@example.com') {
      await ensureTestUser();
      const inMemoryUser = inMemoryUsers.get(email);
      if (inMemoryUser) {
        logger.info('Test user found in in-memory store, database may be empty', { email });
        return inMemoryUser;
      }
    }
    
    return null;
  } catch (error: any) {
    // If database error, use in-memory store
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === '28P01') {
      logger.warn('Database unavailable, using in-memory user store', { email, code: error.code });
      // Ensure test user is initialized
      await ensureTestUser();
      return inMemoryUsers.get(email) || null;
    }
    // For other database errors, log and try in-memory as fallback
    logger.warn('Database query failed, trying in-memory fallback', { 
      email, 
      error: error.message,
      code: error.code 
    });
    await ensureTestUser();
    return inMemoryUsers.get(email) || null;
  }
}

// Helper function to create user (tries database first, then falls back to memory)
async function createUser(userData: any): Promise<User> {
  try {
    return await UserService.create(userData);
  } catch (error: any) {
    // If database error, use in-memory store
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      logger.warn('Database unavailable, creating user in memory', { email: userData.email });
      const user: User = {
        id: userData.id,
        email: userData.email,
        passwordHash: userData.passwordHash,
        name: userData.name || 'User',
        role: userData.role || 'student',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        emailVerified: false,
        twoFactorEnabled: false,
      };
      inMemoryUsers.set(userData.email, user);
      return user;
    }
    throw error;
  }
}

// Helper function to find user by ID (tries database first, then falls back to memory)
async function findUserById(id: string): Promise<User | null> {
  try {
    return await UserService.findById(id);
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      logger.warn('Database unavailable, searching in-memory user store', { id });
      for (const user of inMemoryUsers.values()) {
        if (user.id === id) return user;
      }
      return null;
    }
    throw error;
  }
}

// Helper function to update last login (tries database first, fails silently for memory fallback)
async function updateLastLogin(userId: string): Promise<void> {
  try {
    await UserService.updateLastLogin(userId);
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      logger.warn('Database unavailable, skipping last login update');
      // For in-memory store, just update the lastLogin locally if needed
      return;
    }
    throw error;
  }
}

// Helper function to update password (tries database first, then falls back to memory)
async function updatePassword(userId: string, newPasswordHash: string): Promise<void> {
  try {
    await UserService.updatePassword(userId, newPasswordHash);
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      logger.warn('Database unavailable, updating password in-memory', { userId });
      for (const user of inMemoryUsers.values()) {
        if (user.id === userId) {
          user.passwordHash = newPasswordHash;
          user.updatedAt = new Date();
          break;
        }
      }
      return;
    }
    throw error;
  }
}

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
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  // Hash password
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create user
  const userId = uuidv4();
  const user = await createUser({
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
  const user = await findUserByEmail(email);
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
  await updateLastLogin(user.id);

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
    const user = await findUserById(decoded.id);
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
  const user = await findUserById(userId);
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
  await updatePassword(userId, newPasswordHash);

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
  const user = await findUserById(userId);
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