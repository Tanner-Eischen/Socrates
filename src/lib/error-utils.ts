/**
 * Error handling utilities for API calls and external services
 */

import { 
  LLMServiceError, 
  NetworkError, 
  RateLimitError, 
  ImageProcessingError 
} from '../api/middleware/errorHandler';

/**
 * Wrap OpenAI API calls with error handling
 */
export async function handleOpenAIError<T>(
  operation: () => Promise<T>,
  context: string = 'AI service'
): Promise<T> {
  try {
    const result = await operation();
    console.log(`[handleOpenAIError] ${context} succeeded`);
    return result;
  } catch (error: any) {
    console.error(`[handleOpenAIError] ${context} failed:`, {
      error: error.message,
      status: error.status || error.response?.status,
      code: error.code,
      type: error.constructor.name
    });
    // Handle rate limiting
    if (error?.status === 429 || error?.response?.status === 429) {
      const retryAfter = error?.response?.headers?.['retry-after'] || 
                       error?.retryAfter || 
                       60;
      throw new RateLimitError(
        `${context} rate limit exceeded. Please try again in ${retryAfter} seconds.`,
        retryAfter
      );
    }
    
    // Handle network errors
    if (error?.code === 'ETIMEDOUT' || 
        error?.code === 'ECONNREFUSED' || 
        error?.code === 'ENOTFOUND' ||
        error?.message?.includes('timeout')) {
      throw new NetworkError(
        `Network error while communicating with ${context}. Please check your connection and try again.`
      );
    }
    
    // Handle API key errors
    if (error?.status === 401 || 
        error?.response?.status === 401 ||
        error?.message?.includes('API key') ||
        error?.message?.includes('authentication')) {
      throw new LLMServiceError(
        `${context} authentication failed. Please check your API key configuration.`,
        false // Not retryable
      );
    }
    
    // Handle service unavailable
    if (error?.status === 503 || 
        error?.response?.status === 503 ||
        error?.status === 502 ||
        error?.response?.status === 502) {
      throw new LLMServiceError(
        `${context} is temporarily unavailable. Please try again in a moment.`,
        true // Retryable
      );
    }
    
    // Handle quota exceeded
    if (error?.status === 402 || 
        error?.response?.status === 402 ||
        error?.message?.includes('quota') ||
        error?.message?.includes('billing')) {
      throw new LLMServiceError(
        `${context} quota exceeded. Please check your account limits.`,
        false // Not retryable
      );
    }
    
    // Handle invalid request
    if (error?.status === 400 || error?.response?.status === 400) {
      throw new LLMServiceError(
        `Invalid request to ${context}: ${error?.message || 'Please check your input and try again.'}`,
        false // Not retryable
      );
    }
    
    // Generic LLM error
    throw new LLMServiceError(
      `${context} error: ${error?.message || 'An unexpected error occurred. Please try again.'}`,
      true // Retryable by default
    );
  }
}

/**
 * Handle image processing errors
 */
export function handleImageProcessingError(error: any, context: string = 'Image processing'): ImageProcessingError {
  if (error instanceof ImageProcessingError) {
    return error;
  }
  
  // Check for specific image processing errors
  if (error?.message?.includes('image') || error?.message?.includes('OCR')) {
    return new ImageProcessingError(
      `${context} failed: ${error.message}. Please ensure the image is clear and contains readable text.`
    );
  }
  
  // Check for file size errors
  if (error?.message?.includes('size') || error?.message?.includes('too large')) {
    return new ImageProcessingError(
      'Image file is too large. Please use an image smaller than 10MB.'
    );
  }
  
  // Check for format errors
  if (error?.message?.includes('format') || error?.message?.includes('type')) {
    return new ImageProcessingError(
      'Unsupported image format. Please use PNG, JPG, or GIF format.'
    );
  }
  
  // Generic image processing error
  return new ImageProcessingError(
    `${context} failed. Please ensure the image is clear, readable, and in a supported format.`
  );
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
  context: string = 'Operation'
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry if it's not a retryable error
      if (error instanceof LLMServiceError && !error.retryable) {
        throw error;
      }
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(2, attempt);
      
      console.warn(`${context} failed (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (error instanceof LLMServiceError) {
    return error.retryable;
  }
  
  if (error instanceof NetworkError) {
    return true;
  }
  
  if (error instanceof RateLimitError) {
    return true;
  }
  
  // Check for network-related error codes
  if (error?.code === 'ETIMEDOUT' || 
      error?.code === 'ECONNREFUSED' || 
      error?.code === 'ENOTFOUND') {
    return true;
  }
  
  // Check for 5xx errors (server errors are usually retryable)
  if (error?.status >= 500 && error?.status < 600) {
    return true;
  }
  
  return false;
}

