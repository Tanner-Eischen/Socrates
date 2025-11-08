#!/usr/bin/env node

/**
 * Socrates API Server Entry Point
 * 
 * This is the main entry point for the Socrates API server.
 * It initializes and starts the Express server with all necessary
 * middleware, routes, and services.
 */

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