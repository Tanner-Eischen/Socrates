#!/usr/bin/env node
"use strict";
/**
 * Socrates API Server Entry Point
 *
 * This is the main entry point for the Socrates API server.
 * It initializes and starts the Express server with all necessary
 * middleware, routes, and services.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./middleware/logger");
const server_1 = __importDefault(require("./server"));
// Set process title
process.title = 'socrates-api';
// Log startup information
logger_1.logger.info('Starting Socrates API Server...', {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    cwd: process.cwd(),
});
// Start the server
server_1.default.start().catch((error) => {
    logger_1.logger.error('Failed to start Socrates API server', {
        error: error.message,
        stack: error.stack
    });
    process.exit(1);
});
// Export server for testing
exports.default = server_1.default;
//# sourceMappingURL=index.js.map