import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

// Custom error classes
export class ValidationError extends Error {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  statusCode = 401;
  code = 'AUTHENTICATION_ERROR';
  
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  statusCode = 403;
  code = 'AUTHORIZATION_ERROR';
  
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  code = 'NOT_FOUND';
  
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  statusCode = 409;
  code = 'CONFLICT';
  
  constructor(message: string = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}


export class InternalServerError extends Error {
  statusCode = 500;
  code = 'INTERNAL_SERVER_ERROR';
  
  constructor(message: string = 'Internal server error') {
    super(message);
    this.name = 'InternalServerError';
  }
}

export class ServiceUnavailableError extends Error {
  statusCode = 503;
  code = 'SERVICE_UNAVAILABLE';
  
  constructor(message: string = 'Service temporarily unavailable') {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}

export class ImageProcessingError extends Error {
  statusCode = 422;
  code = 'IMAGE_PROCESSING_ERROR';
  
  constructor(message: string = 'Failed to process image') {
    super(message);
    this.name = 'ImageProcessingError';
  }
}

export class LLMServiceError extends Error {
  statusCode = 503;
  code = 'LLM_SERVICE_ERROR';
  
  constructor(message: string = 'AI service temporarily unavailable', public retryable: boolean = true) {
    super(message);
    this.name = 'LLMServiceError';
  }
}

export class NetworkError extends Error {
  statusCode = 504;
  code = 'NETWORK_ERROR';
  
  constructor(message: string = 'Network request timed out') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class RateLimitError extends Error {
  statusCode = 429;
  code = 'RATE_LIMIT_EXCEEDED';
  
  constructor(message: string = 'Rate limit exceeded. Please try again later', public retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Error response interface
interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
  correlationId?: string;
  stack?: string;
  retryable?: boolean;
  retryAfter?: number;
}

// Main error handler middleware
export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_SERVER_ERROR';

  // Handle specific error types
  let retryable: boolean | undefined;
  let retryAfter: number | undefined;
  
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  } else if (err.name === 'MulterError') {
    statusCode = 400;
    code = 'FILE_UPLOAD_ERROR';
    message = 'File upload error: ' + err.message;
  } else if (err.name === 'SyntaxError' && 'body' in err) {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Invalid JSON in request body';
  } else if (err.name === 'ImageProcessingError') {
    statusCode = err.statusCode || 422;
    code = 'IMAGE_PROCESSING_ERROR';
    message = err.message || 'Failed to process image. Please ensure the image is clear and contains readable text.';
  } else if (err.name === 'LLMServiceError') {
    statusCode = err.statusCode || 503;
    code = 'LLM_SERVICE_ERROR';
    message = err.message || 'AI service is temporarily unavailable. Please try again in a moment.';
    retryable = (err as LLMServiceError).retryable;
  } else if (err.name === 'NetworkError' || err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
    statusCode = 504;
    code = 'NETWORK_ERROR';
    message = 'Network request timed out. Please check your connection and try again.';
  } else if (err.name === 'RateLimitError' || (err as any).response?.status === 429) {
    statusCode = 429;
    code = 'RATE_LIMIT_EXCEEDED';
    message = err.message || 'Too many requests. Please wait a moment before trying again.';
    retryAfter = (err as RateLimitError).retryAfter || 
                 (err as any).response?.headers?.['retry-after'] || 
                 60;
  } else if (err.message?.includes('OpenAI') || err.message?.includes('API key')) {
    statusCode = 503;
    code = 'LLM_SERVICE_ERROR';
    message = 'AI service configuration error. Please contact support.';
  }

  // Create error response
  const errorResponse: ErrorResponse = {
    error: getErrorName(statusCode),
    message,
    code,
    timestamp: new Date().toISOString(),
    correlationId: (req as any).correlationId,
  };
  
  if (retryable !== undefined) {
    errorResponse.retryable = retryable;
  }
  
  if (retryAfter !== undefined) {
    errorResponse.retryAfter = retryAfter;
  }

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
    user: (req as any).user,
    correlationId: (req as any).correlationId,
  };

  if (statusCode >= 500) {
    logger.error('Server Error', logData);
  } else if (statusCode >= 400) {
    logger.warn('Client Error', logData);
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Get error name from status code
const getErrorName = (statusCode: number): string => {
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
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

// Validation error helper
export const createValidationError = (message: string, details?: any): ValidationError => {
  return new ValidationError(message, details);
};

export default errorHandler;