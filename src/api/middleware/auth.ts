import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger, auditLogger } from './logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name: string;
  };
}

export interface JWTPayload {
  id: string;
  email: string;
  role: string;
  name: string;
  iat?: number;
  exp?: number;
}

// JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Generate JWT token
export const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
};

// Generate refresh token
export const generateRefreshToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN as any });
};

// Verify JWT token
export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Authentication middleware
export const authMiddleware: RequestHandler = (req, res, next) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const authHeader = authReq.headers.authorization;
    
    if (!authHeader) {
      auditLogger.warn('Authentication attempt without token', {
        ip: authReq.ip,
        userAgent: authReq.get('User-Agent'),
        url: authReq.url,
        method: authReq.method,
      });
      
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided',
      });
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    const decoded = verifyToken(token);
    authReq.user = decoded;

    // Log successful authentication
    auditLogger.info('Successful authentication', {
      userId: decoded.id,
      email: decoded.email,
      role: decoded.role,
      ip: authReq.ip,
      userAgent: authReq.get('User-Agent'),
      url: authReq.url,
      method: authReq.method,
    });

    return next();
  } catch (error) {
    auditLogger.warn('Authentication failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: authReq.ip,
      userAgent: authReq.get('User-Agent'),
      url: authReq.url,
      method: authReq.method,
    });

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token',
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuthMiddleware: RequestHandler = (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const authHeader = authReq.headers.authorization;
    
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;

      const decoded = verifyToken(token);
      authReq.user = decoded;
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Role-based authorization middleware
export const requireRole = (roles: string | string[]) => {
  return ((req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(authReq.user.role)) {
      auditLogger.warn('Authorization failed - insufficient role', {
        userId: authReq.user.id,
        userRole: authReq.user.role,
        requiredRoles: allowedRoles,
        ip: authReq.ip,
        url: authReq.url,
        method: authReq.method,
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
    }

    return next();
  }) as RequestHandler;
};

// Admin only middleware
export const requireAdmin = requireRole('admin');

// Tutor or Admin middleware
export const requireTutorOrAdmin = requireRole(['tutor', 'admin']);

// User ownership middleware (user can only access their own resources)
export const requireOwnership = (userIdParam: string = 'userId') => {
  return ((req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const resourceUserId = (req as any).params[userIdParam] || (req as any).body.userId || (req as any).query.userId;
    
    // Admin can access any resource
    if (authReq.user.role === 'admin') {
      return next();
    }

    // User can only access their own resources
    if (authReq.user.id !== resourceUserId) {
      auditLogger.warn('Authorization failed - resource ownership', {
        userId: authReq.user.id,
        attemptedResourceUserId: resourceUserId,
        ip: authReq.ip,
        url: authReq.url,
        method: authReq.method,
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only access your own resources',
      });
    }

    return next();
  }) as RequestHandler;
};

export default authMiddleware;
export const authenticate = authMiddleware;