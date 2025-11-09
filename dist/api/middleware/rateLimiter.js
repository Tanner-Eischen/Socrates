"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.progressiveRateLimiter = exports.burstRateLimiter = exports.analyticsRateLimiter = exports.voiceRateLimiter = exports.uploadRateLimiter = exports.authRateLimiter = exports.rateLimiter = void 0;
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
const logger_1 = require("./logger");
const errorHandler_1 = require("./errorHandler");
const redis_1 = require("../config/redis");
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
const createRateLimiter = (config) => {
    try {
        const existingRedisClient = global.socratesRedisClient;
        const storeClient = existingRedisClient || (0, redis_1.getRedisClient)();
        return new rate_limiter_flexible_1.RateLimiterRedis({
            storeClient,
            ...config,
        });
    }
    catch (error) {
        logger_1.logger.warn('Redis not available, using memory rate limiter', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return new rate_limiter_flexible_1.RateLimiterMemory(config);
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
const getClientId = (req) => {
    const user = req.user;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    if (user && user.id) {
        return `${ip}:${user.id}`;
    }
    return ip;
};
// Generic rate limiter middleware factory
const createRateLimiterMiddleware = (limiterType) => {
    return async (req, res, next) => {
        try {
            const clientId = getClientId(req);
            const rateLimiter = rateLimiters[limiterType];
            const resRateLimiter = await rateLimiter.consume(clientId);
            // Add rate limit headers
            res.setHeader('X-RateLimit-Limit', rateLimiterConfig[limiterType].points);
            res.setHeader('X-RateLimit-Remaining', resRateLimiter.remainingPoints);
            res.setHeader('X-RateLimit-Reset', new Date(Date.now() + resRateLimiter.msBeforeNext).toUTCString());
            next();
        }
        catch (rejRes) {
            // Rate limit exceeded
            const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
            // Add rate limit headers
            res.setHeader('X-RateLimit-Limit', rateLimiterConfig[limiterType].points);
            res.setHeader('X-RateLimit-Remaining', 0);
            res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rejRes.msBeforeNext).toUTCString());
            res.setHeader('Retry-After', secs);
            // Log rate limit violation
            logger_1.logger.warn('Rate limit exceeded', {
                clientId: getClientId(req),
                limiterType,
                url: req.url,
                method: req.method,
                userAgent: req.get('User-Agent'),
                retryAfter: secs,
            });
            const error = new errorHandler_1.RateLimitError(`Rate limit exceeded. Try again in ${secs} seconds.`);
            next(error);
        }
    };
};
// Export specific rate limiter middlewares
exports.rateLimiter = createRateLimiterMiddleware('general');
exports.authRateLimiter = createRateLimiterMiddleware('auth');
exports.uploadRateLimiter = createRateLimiterMiddleware('upload');
exports.voiceRateLimiter = createRateLimiterMiddleware('voice');
exports.analyticsRateLimiter = createRateLimiterMiddleware('analytics');
// Burst rate limiter for expensive operations
const burstRateLimiter = async (req, res, next) => {
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
    }
    catch (rejRes) {
        const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
        logger_1.logger.warn('Burst rate limit exceeded', {
            clientId: getClientId(req),
            url: req.url,
            method: req.method,
            retryAfter: secs,
        });
        const error = new errorHandler_1.RateLimitError(`Burst rate limit exceeded. Try again in ${Math.round(secs / 60)} minutes.`);
        next(error);
    }
};
exports.burstRateLimiter = burstRateLimiter;
// Progressive rate limiter (increases penalty for repeated violations)
const progressiveRateLimiter = (basePoints = 10) => {
    return async (req, res, next) => {
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
        }
        catch (rejRes) {
            const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
            logger_1.logger.warn('Progressive rate limit exceeded', {
                clientId: getClientId(req),
                basePoints,
                url: req.url,
                method: req.method,
                retryAfter: secs,
            });
            const error = new errorHandler_1.RateLimitError(`Progressive rate limit exceeded. Try again in ${secs} seconds.`);
            next(error);
        }
    };
};
exports.progressiveRateLimiter = progressiveRateLimiter;
exports.default = exports.rateLimiter;
//# sourceMappingURL=rateLimiter.js.map