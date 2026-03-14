/**
 * Auth Routes Tests
 * Tests for authentication endpoints: login, register, JWT validation
 */

// Set test environment BEFORE any imports that use these variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';

import express, { Request, Response } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import authRoutes, { seedTestUser, clearTestUsers } from '../auth';
import { generateToken, verifyToken, authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { errorHandler } from '../../middleware/errorHandler';

// Mock the rate limiter to avoid 429 errors in tests
jest.mock('../../middleware/rateLimiter', () => ({
  authRateLimiter: (req: Request, res: Response, next: Function) => next(),
  rateLimiter: (req: Request, res: Response, next: Function) => next(),
}));

// Mock the UserService to avoid database dependencies
jest.mock('../../services/UserService', () => ({
  UserService: {
    findByEmail: jest.fn().mockResolvedValue(null), // Return null to use in-memory store
    findById: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(null),
    updateLastLogin: jest.fn().mockResolvedValue(undefined),
    updatePassword: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock the logger to avoid console noise in tests
jest.mock('../../middleware/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  auditLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  requestLogger: (req: Request, res: Response, next: Function) => next(),
}));

// Create test app - use the SAME authRoutes instance to share in-memory store
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/auth', authRoutes);
  // Add error handler to catch validation and auth errors
  app.use(errorHandler);
  return app;
};

describe('Auth Routes', () => {
  let app: express.Application;

  beforeEach(async () => {
    // Clear in-memory store before each test
    clearTestUsers();
    app = createTestApp();
    jest.clearAllMocks();
  });

  afterEach(() => {
    clearTestUsers();
  });

  describe('POST /api/v1/auth/register', () => {
    it('creates a new user with valid credentials', async () => {
      const newUser = {
        email: 'newuser@example.com',
        password: 'securePassword123',
        name: 'New User',
        role: 'student',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(newUser);

      // Debug: log response body if not 201
      if (response.status !== 201) {
        console.log('Registration failed:', response.status, JSON.stringify(response.body, null, 2));
      }

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', newUser.email);
      expect(response.body.user).toHaveProperty('name', newUser.name);
      expect(response.body.user).toHaveProperty('role', newUser.role);

      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', newUser.email);
      expect(response.body.user).toHaveProperty('name', newUser.name);
      expect(response.body.user).toHaveProperty('role', newUser.role);

      // Verify token is valid JWT
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET!) as jwt.JwtPayload;
      expect(decoded).toHaveProperty('email', newUser.email);
    });

    it('rejects registration with invalid email', async () => {
      const invalidUser = {
        email: 'not-an-email',
        password: 'securePassword123',
        name: 'Test User',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidUser)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('rejects registration with short password', async () => {
      const invalidUser = {
        email: 'user@example.com',
        password: 'short',
        name: 'Test User',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidUser)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('rejects registration with missing name', async () => {
      const invalidUser = {
        email: 'user@example.com',
        password: 'securePassword123',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidUser)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns JWT for valid credentials', async () => {
      // Seed a test user directly into the in-memory store
      await seedTestUser({
        email: 'logintest@example.com',
        password: 'password123',
        name: 'Login Test User',
        role: 'student',
      });

      // Now login with the seeded credentials
      const credentials = {
        email: 'logintest@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(credentials)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', credentials.email);

      // Verify token is valid JWT
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET!) as jwt.JwtPayload;
      expect(decoded).toHaveProperty('email', credentials.email);
      expect(decoded).toHaveProperty('id');
      expect(decoded).toHaveProperty('role');
    });

    it('rejects invalid credentials - wrong password', async () => {
      // Seed a test user with known password
      await seedTestUser({
        email: 'wrongpasstest@example.com',
        password: 'password123',
        name: 'Wrong Pass Test',
        role: 'student',
      });

      const credentials = {
        email: 'wrongpasstest@example.com',
        password: 'wrongpassword',
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(credentials);

      // Should get 401 for wrong password
      expect(response.status).toBe(401);
    });

    it('rejects invalid credentials - non-existent user', async () => {
      const credentials = {
        email: 'nonexistent@example.com',
        password: 'anypassword',
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(credentials);

      // Should get 401 for non-existent user
      expect(response.status).toBe(401);
    });

    it('rejects login with missing password field', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com' });

      // Should get 400 for validation error
      expect(response.status).toBe(400);
    });
  });

  describe('JWT Validation Middleware', () => {
    // Create a minimal app with protected route to test middleware
    const createProtectedApp = () => {
      const protectedApp = express();
      protectedApp.use(express.json());
      protectedApp.get('/protected', authMiddleware, (req: Request, res: Response) => {
        const authReq = req as unknown as AuthenticatedRequest;
        res.json({ message: 'Access granted', user: authReq.user });
      });
      return protectedApp;
    };

    it('allows access with valid JWT token', async () => {
      const protectedApp = createProtectedApp();

      // Generate a valid token
      const token = generateToken({
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'student',
        name: 'Test User',
      });

      const response = await request(protectedApp)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Access granted');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
    });

    it('rejects access without token', async () => {
      const protectedApp = createProtectedApp();

      const response = await request(protectedApp)
        .get('/protected')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
      expect(response.body).toHaveProperty('message', 'No token provided');
    });

    it('rejects access with invalid token', async () => {
      const protectedApp = createProtectedApp();

      const response = await request(protectedApp)
        .get('/protected')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
      expect(response.body).toHaveProperty('message', 'Invalid token');
    });

    it('rejects access with expired token', async () => {
      const protectedApp = createProtectedApp();

      // Create an expired token (expired 1 hour ago)
      const expiredToken = jwt.sign(
        { id: 'test-user-id', email: 'test@example.com', role: 'student', name: 'Test User' },
        process.env.JWT_SECRET!,
        { expiresIn: '-1h' }
      );

      const response = await request(protectedApp)
        .get('/protected')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });

  describe('Token Generation and Verification', () => {
    it('generateToken creates a valid JWT', () => {
      const payload = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'student',
        name: 'Test User',
      };

      const token = generateToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = verifyToken(token);
      expect(decoded).toMatchObject(payload);
    });

    it('verifyToken throws for invalid token', () => {
      expect(() => verifyToken('invalid-token')).toThrow('Invalid token');
    });

    it('verifyToken throws for token signed with wrong secret', () => {
      const token = jwt.sign(
        { id: 'user-123', email: 'user@example.com' },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      expect(() => verifyToken(token)).toThrow('Invalid token');
    });
  });
});
