import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import { RateLimitError } from './errorHandler';
import { getRedisClient } from '../config/redis';

// Rate limiter configuration
const rateLimiterConfig = {
  // General API rate limiting
  general: {
    keyPrefix: 'general_rl',
    points: 100, // Number of requests
    duration: 60, // Per 60 seconds
    blockDuration: 60, // Block for 60 seconds if limit exceeded
  },
  
  // Authentication endpoints (more restrictive)
  auth: {
    keyPrefix: 'auth_rl',
    points: 5, // Number of requests
    duration: 60, // Per 60 seconds
    blockDuration: 300, // Block for 5 minutes if limit exceeded
  },
  
  // File upload endpoints
  upload: {
    keyPrefix: 'upload_rl',
    points: 10, // Number of requests
    duration: 60, // Per 60 seconds
    blockDuration: 120, // Block for 2 minutes if limit exceeded
  },
  
  // Voice processing endpoints
  voice: {
    keyPrefix: 'voice_rl',
    points: 20, // Number of requests
    duration: 60, // Per 60 seconds
    blockDuration: 60, // Block for 1 minute if limit exceeded
  },
  
  // Analytics endpoints
  analytics: {
    keyPrefix: 'analytics_rl',
    points: 50, // Number of requests
    duration: 60, // Per 60 seconds
    blockDuration: 60, // Block for 1 minute if limit exceeded
  },
};

// Create rate limiter using Redis if initialized; fall back to memory otherwise
const createRateLimiter = (config: any) => {
  try {
    const existingRedisClient = (global as any).socrateachRedisClient;
    const storeClient = existingRedisClient || getRedisClient();
    return new RateLimiterRedis({
      storeClient,
      ...config,
    });
  } catch (error) {
    logger.warn('Redis not available, using memory rate limiter', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return new RateLimiterMemory(config);
  }
};

// Create rate limiter instances
const rateLimiters = {
  general: createRateLimiter(rateLimiterConfig.general),
  auth: createRateLimiter(rateLimiterConfig.auth),
  upload: createRateLimiter(rateLimiterConfig.upload),
  voice: createRateLimiter(rateLimiterConfig.voice),
  analytics: createRateLimiter(rateLimiterConfig.analytics),
};

// Get client identifier (IP + User ID if authenticated)
const getClientId = (req: Request): string => {
  const user = (req as any).user;
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  
  if (user && user.id) {
    return `${ip}:${user.id}`;
  }
  
  return ip;
};

// Generic rate limiter middleware factory
const createRateLimiterMiddleware = (limiterType: keyof typeof rateLimiters) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientId = getClientId(req);
      const rateLimiter = rateLimiters[limiterType];
      
      const resRateLimiter = await rateLimiter.consume(clientId);
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', rateLimiterConfig[limiterType].points);
      res.setHeader('X-RateLimit-Remaining', resRateLimiter.remainingPoints);
      res.setHeader(
        'X-RateLimit-Reset',
        new Date(Date.now() + resRateLimiter.msBeforeNext).toUTCString()
      );
      
      next();
    } catch (rejRes: any) {
      // Rate limit exceeded
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', rateLimiterConfig[limiterType].points);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader(
        'X-RateLimit-Reset',
        new Date(Date.now() + rejRes.msBeforeNext).toUTCString()
      );
      res.setHeader('Retry-After', secs);
      
      // Log rate limit violation
      logger.warn('Rate limit exceeded', {
        clientId: getClientId(req),
        limiterType,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        retryAfter: secs,
      });
      
      const error = new RateLimitError(`Rate limit exceeded. Try again in ${secs} seconds.`);
      next(error);
    }
  };
};

// Export specific rate limiter middlewares
export const rateLimiter = createRateLimiterMiddleware('general');
export const authRateLimiter = createRateLimiterMiddleware('auth');
export const uploadRateLimiter = createRateLimiterMiddleware('upload');
export const voiceRateLimiter = createRateLimiterMiddleware('voice');
export const analyticsRateLimiter = createRateLimiterMiddleware('analytics');

// Burst rate limiter for expensive operations
export const burstRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = getClientId(req);
    
    // Create a temporary burst limiter
    const burstLimiter = createRateLimiter({
      keyPrefix: 'burst_rl',
      points: 3, // Only 3 requests
      duration: 300, // Per 5 minutes
      blockDuration: 600, // Block for 10 minutes
    });
    
    const resRateLimiter = await burstLimiter.consume(clientId);
    
    res.setHeader('X-BurstLimit-Remaining', String(resRateLimiter.remainingPoints));
    
    next();
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    
    logger.warn('Burst rate limit exceeded', {
      clientId: getClientId(req),
      url: req.url,
      method: req.method,
      retryAfter: secs,
    });
    
    const error = new RateLimitError(`Burst rate limit exceeded. Try again in ${Math.round(secs / 60)} minutes.`);
    next(error);
  }
};

// Progressive rate limiter (increases penalty for repeated violations)
export const progressiveRateLimiter = (basePoints: number = 10) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientId = getClientId(req);
      
      // Create progressive limiter
      const progressiveLimiter = createRateLimiter({
        keyPrefix: 'progressive_rl',
        points: basePoints,
        duration: 60,
        blockDuration: 60,
        execEvenly: true, // Spread requests evenly across duration
      });
      
      const resRateLimiter = await progressiveLimiter.consume(clientId);
      
      res.setHeader('X-Progressive-Remaining', resRateLimiter.remainingPoints);
      
      next();
    } catch (rejRes: any) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
      
      logger.warn('Progressive rate limit exceeded', {
        clientId: getClientId(req),
        basePoints,
        url: req.url,
        method: req.method,
        retryAfter: secs,
      });
      
      const error = new RateLimitError(`Progressive rate limit exceeded. Try again in ${secs} seconds.`);
      next(error);
    }
  };
};

export default rateLimiter;