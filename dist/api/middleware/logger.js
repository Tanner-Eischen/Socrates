"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = exports.correlationIdMiddleware = exports.performanceLogger = exports.auditLogger = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
// Create logs directory if it doesn't exist
const logsDir = path_1.default.join(process.cwd(), 'logs');
// Custom log format
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json(), winston_1.default.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (stack) {
        log += `\n${stack}`;
    }
    if (Object.keys(meta).length > 0) {
        log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    return log;
}));
// Create logger instance
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'socrates-api' },
    transports: [
        // Console transport for development
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
        }),
        // File transport for all logs
        new winston_1.default.transports.File({
            filename: path_1.default.join(logsDir, 'app.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Separate file for errors
        new winston_1.default.transports.File({
            filename: path_1.default.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
    ],
});
// Create audit logger for security events
exports.auditLogger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    defaultMeta: { service: 'socrates-audit' },
    transports: [
        new winston_1.default.transports.File({
            filename: path_1.default.join(logsDir, 'audit.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 10,
        }),
    ],
});
// Performance logger for monitoring
exports.performanceLogger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    defaultMeta: { service: 'socrates-performance' },
    transports: [
        new winston_1.default.transports.File({
            filename: path_1.default.join(logsDir, 'performance.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
    ],
});
// Log correlation ID middleware
const correlationIdMiddleware = (req, res, next) => {
    const correlationId = req.headers['x-correlation-id'] ||
        req.headers['x-request-id'] ||
        Math.random().toString(36).substring(2, 15);
    req.correlationId = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    // Add correlation ID to all log entries for this request
    req.logger = exports.logger.child({ correlationId });
    next();
};
exports.correlationIdMiddleware = correlationIdMiddleware;
// Request logging middleware
const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            correlationId: req.correlationId,
        };
        if (res.statusCode >= 400) {
            exports.logger.warn('HTTP Request', logData);
        }
        else {
            exports.logger.info('HTTP Request', logData);
        }
        // Log performance metrics
        exports.performanceLogger.info('Request Performance', {
            ...logData,
            timestamp: new Date().toISOString(),
        });
    });
    next();
};
exports.requestLogger = requestLogger;
exports.default = exports.logger;
//# sourceMappingURL=logger.js.map