"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createValidationError = exports.notFoundHandler = exports.asyncHandler = exports.errorHandler = exports.ServiceUnavailableError = exports.InternalServerError = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = void 0;
const logger_1 = require("./logger");
// Custom error classes
class ValidationError extends Error {
    constructor(message, details) {
        super(message);
        this.details = details;
        this.statusCode = 400;
        this.code = 'VALIDATION_ERROR';
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends Error {
    constructor(message = 'Authentication required') {
        super(message);
        this.statusCode = 401;
        this.code = 'AUTHENTICATION_ERROR';
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends Error {
    constructor(message = 'Insufficient permissions') {
        super(message);
        this.statusCode = 403;
        this.code = 'AUTHORIZATION_ERROR';
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends Error {
    constructor(message = 'Resource not found') {
        super(message);
        this.statusCode = 404;
        this.code = 'NOT_FOUND';
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends Error {
    constructor(message = 'Resource conflict') {
        super(message);
        this.statusCode = 409;
        this.code = 'CONFLICT';
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends Error {
    constructor(message = 'Rate limit exceeded') {
        super(message);
        this.statusCode = 429;
        this.code = 'RATE_LIMIT_EXCEEDED';
        this.name = 'RateLimitError';
    }
}
exports.RateLimitError = RateLimitError;
class InternalServerError extends Error {
    constructor(message = 'Internal server error') {
        super(message);
        this.statusCode = 500;
        this.code = 'INTERNAL_SERVER_ERROR';
        this.name = 'InternalServerError';
    }
}
exports.InternalServerError = InternalServerError;
class ServiceUnavailableError extends Error {
    constructor(message = 'Service temporarily unavailable') {
        super(message);
        this.statusCode = 503;
        this.code = 'SERVICE_UNAVAILABLE';
        this.name = 'ServiceUnavailableError';
    }
}
exports.ServiceUnavailableError = ServiceUnavailableError;
// Main error handler middleware
const errorHandler = (err, req, res, next) => {
    // Default error values
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let code = err.code || 'INTERNAL_SERVER_ERROR';
    // Handle specific error types
    if (err.name === 'ValidationError') {
        statusCode = 400;
        code = 'VALIDATION_ERROR';
    }
    else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        code = 'INVALID_TOKEN';
        message = 'Invalid authentication token';
    }
    else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        code = 'TOKEN_EXPIRED';
        message = 'Authentication token has expired';
    }
    else if (err.name === 'MulterError') {
        statusCode = 400;
        code = 'FILE_UPLOAD_ERROR';
        message = 'File upload error: ' + err.message;
    }
    else if (err.name === 'SyntaxError' && 'body' in err) {
        statusCode = 400;
        code = 'INVALID_JSON';
        message = 'Invalid JSON in request body';
    }
    // Create error response
    const errorResponse = {
        error: getErrorName(statusCode),
        message,
        code,
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
    };
    // Add details for validation errors
    if (err.details) {
        errorResponse.details = err.details;
    }
    // Add stack trace in development
    if (process.env.NODE_ENV === 'development' && err.stack) {
        errorResponse.stack = err.stack;
    }
    // Log error
    const logData = {
        error: {
            name: err.name,
            message: err.message,
            stack: err.stack,
            code: err.code,
        },
        request: {
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: req.body,
            params: req.params,
            query: req.query,
        },
        user: req.user,
        correlationId: req.correlationId,
    };
    if (statusCode >= 500) {
        logger_1.logger.error('Server Error', logData);
    }
    else if (statusCode >= 400) {
        logger_1.logger.warn('Client Error', logData);
    }
    // Send error response
    res.status(statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
// Get error name from status code
const getErrorName = (statusCode) => {
    switch (statusCode) {
        case 400: return 'Bad Request';
        case 401: return 'Unauthorized';
        case 403: return 'Forbidden';
        case 404: return 'Not Found';
        case 409: return 'Conflict';
        case 422: return 'Unprocessable Entity';
        case 429: return 'Too Many Requests';
        case 500: return 'Internal Server Error';
        case 502: return 'Bad Gateway';
        case 503: return 'Service Unavailable';
        case 504: return 'Gateway Timeout';
        default: return 'Error';
    }
};
// Async error wrapper
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
// 404 handler
const notFoundHandler = (req, res, next) => {
    const error = new NotFoundError(`Route ${req.originalUrl} not found`);
    next(error);
};
exports.notFoundHandler = notFoundHandler;
// Validation error helper
const createValidationError = (message, details) => {
    return new ValidationError(message, details);
};
exports.createValidationError = createValidationError;
exports.default = exports.errorHandler;
//# sourceMappingURL=errorHandler.js.map