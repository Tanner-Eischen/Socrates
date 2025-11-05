"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = exports.requireOwnership = exports.requireTutorOrAdmin = exports.requireAdmin = exports.requireRole = exports.optionalAuthMiddleware = exports.authMiddleware = exports.verifyToken = exports.generateRefreshToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("./logger");
// JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
// Generate JWT token
const generateToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};
exports.generateToken = generateToken;
// Generate refresh token
const generateRefreshToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
};
exports.generateRefreshToken = generateRefreshToken;
// Verify JWT token
const verifyToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch (error) {
        throw new Error('Invalid token');
    }
};
exports.verifyToken = verifyToken;
// Authentication middleware
const authMiddleware = (req, res, next) => {
    const authReq = req;
    try {
        // Development mode: Bypass authentication with mock user
        if (process.env.NODE_ENV === 'development') {
            authReq.user = {
                id: 'dev-user-123',
                email: 'dev@example.com',
                name: 'Dev User',
                role: 'student',
            };
            logger_1.logger.info('Development mode: Authentication bypassed', {
                url: authReq.url,
                method: authReq.method,
            });
            return next();
        }
        const authHeader = authReq.headers.authorization;
        if (!authHeader) {
            logger_1.auditLogger.warn('Authentication attempt without token', {
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
        const decoded = (0, exports.verifyToken)(token);
        authReq.user = decoded;
        // Log successful authentication
        logger_1.auditLogger.info('Successful authentication', {
            userId: decoded.id,
            email: decoded.email,
            role: decoded.role,
            ip: authReq.ip,
            userAgent: authReq.get('User-Agent'),
            url: authReq.url,
            method: authReq.method,
        });
        return next();
    }
    catch (error) {
        logger_1.auditLogger.warn('Authentication failed', {
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
exports.authMiddleware = authMiddleware;
// Optional authentication middleware (doesn't fail if no token)
const optionalAuthMiddleware = (req, res, next) => {
    try {
        const authReq = req;
        const authHeader = authReq.headers.authorization;
        if (authHeader) {
            const token = authHeader.startsWith('Bearer ')
                ? authHeader.slice(7)
                : authHeader;
            const decoded = (0, exports.verifyToken)(token);
            authReq.user = decoded;
        }
        next();
    }
    catch (error) {
        // Continue without authentication
        next();
    }
};
exports.optionalAuthMiddleware = optionalAuthMiddleware;
// Role-based authorization middleware
const requireRole = (roles) => {
    return ((req, res, next) => {
        const authReq = req;
        if (!authReq.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        if (!allowedRoles.includes(authReq.user.role)) {
            logger_1.auditLogger.warn('Authorization failed - insufficient role', {
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
    });
};
exports.requireRole = requireRole;
// Admin only middleware
exports.requireAdmin = (0, exports.requireRole)('admin');
// Tutor or Admin middleware
exports.requireTutorOrAdmin = (0, exports.requireRole)(['tutor', 'admin']);
// User ownership middleware (user can only access their own resources)
const requireOwnership = (userIdParam = 'userId') => {
    return ((req, res, next) => {
        const authReq = req;
        if (!authReq.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }
        const resourceUserId = req.params[userIdParam] || req.body.userId || req.query.userId;
        // Admin can access any resource
        if (authReq.user.role === 'admin') {
            return next();
        }
        // User can only access their own resources
        if (authReq.user.id !== resourceUserId) {
            logger_1.auditLogger.warn('Authorization failed - resource ownership', {
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
    });
};
exports.requireOwnership = requireOwnership;
exports.default = exports.authMiddleware;
exports.authenticate = exports.authMiddleware;
//# sourceMappingURL=auth.js.map