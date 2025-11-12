#!/usr/bin/env node

/**
 * Socrates API Server Entry Point
 * 
 * This is the main entry point for the Socrates API server.
 * It initializes and starts the Express server with all necessary
 * middleware, routes, and services.
 */

// Load environment variables FIRST before anything else
import dotenv from 'dotenv';
dotenv.config({ override: true });

// Log API key status (without exposing the full key)
const apiKey = process.env.OPENAI_API_KEY?.trim();
if (!apiKey || apiKey.length === 0) {
  console.error('[Server Startup] ⚠️  WARNING: OPENAI_API_KEY is not set!');
  console.error('[Server Startup] The Socratic engine will not work without a valid OpenAI API key.');
  console.error('[Server Startup] Please set OPENAI_API_KEY in your .env file.');
} else {
  console.log('[Server Startup] ✅ OpenAI API key found:', {
    keyLength: apiKey.length,
    keyPrefix: apiKey.substring(0, 7),
    isProjectKey: apiKey.startsWith('sk-proj'),
    nodeEnv: process.env.NODE_ENV
  });
}

import { logger } from './middleware/logger';
import server from './server';

// Set process title
process.title = 'socrates-api';

// Log startup information
logger.info('Starting Socrates API Server...', {
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch,
  pid: process.pid,
  cwd: process.cwd(),
});

// Start the server
server.start().catch((error) => {
  logger.error('Failed to start Socrates API server', { 
    error: error.message,
    stack: error.stack 
  });
  process.exit(1);
});

// Export server for testing
export default server;