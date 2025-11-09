"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocratesServer = exports.io = exports.sessionService = exports.cacheService = exports.redisClient = exports.dbPool = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const environment_1 = require("./config/environment");
const logger_1 = require("./middleware/logger");
const errorHandler_1 = require("./middleware/errorHandler");
const logger_2 = require("./middleware/logger");
const auth_1 = require("./middleware/auth");
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const swagger_1 = require("./config/swagger");
const handlers_1 = __importDefault(require("./websocket/handlers"));
// Import route handlers
const auth_2 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const sessions_1 = __importDefault(require("./routes/sessions"));
const problems_1 = __importDefault(require("./routes/problems"));
const assessments_1 = __importDefault(require("./routes/assessments"));
const adaptive_1 = __importDefault(require("./routes/adaptive"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const collaboration_1 = __importDefault(require("./routes/collaboration"));
const voice_1 = __importDefault(require("./routes/voice"));
const monitoring_1 = __importDefault(require("./routes/monitoring"));
// Application class
class SocratesServer {
    constructor() {
        this.isShuttingDown = false;
        this.app = (0, express_1.default)();
        this.server = (0, http_1.createServer)(this.app);
        this.io = new socket_io_1.Server(this.server, {
            cors: {
                origin: environment_1.config.CORS_ORIGIN,
                credentials: environment_1.config.CORS_CREDENTIALS,
            },
            pingTimeout: environment_1.config.WS_CONNECTION_TIMEOUT,
            pingInterval: environment_1.config.WS_HEARTBEAT_INTERVAL,
        });
        // Make io globally available
        exports.io = this.io;
    }
    // Initialize all services
    async initializeServices() {
        logger_1.logger.info('Initializing services...');
        // Initialize database with graceful degradation
        try {
            logger_1.logger.info('Connecting to database...');
            exports.dbPool = await (0, database_1.createDatabasePool)();
            logger_1.logger.info('Initializing database schema...');
            await (0, database_1.initializeSchema)(exports.dbPool);
            if ((0, environment_1.isDevelopment)()) {
                logger_1.logger.info('Seeding initial data...');
                await (0, database_1.seedInitialData)(exports.dbPool);
            }
            logger_1.logger.info('Database initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('Database initialization failed. Continuing in degraded mode.', { error });
            exports.dbPool = null;
        }
        // Initialize Redis with graceful degradation
        try {
            logger_1.logger.info('Connecting to Redis...');
            exports.redisClient = (0, redis_1.createRedisClient)();
            exports.cacheService = new redis_1.CacheService(exports.redisClient);
            exports.sessionService = new redis_1.SessionService(exports.redisClient);
            logger_1.logger.info('Redis initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('Redis initialization failed. Continuing without cache/session services.', { error });
            exports.redisClient = null;
            exports.cacheService = null;
            exports.sessionService = null;
        }
        logger_1.logger.info('Service initialization complete');
    }
    // Setup middleware
    setupMiddleware() {
        // Security middleware
        this.app.use((0, helmet_1.default)({
            contentSecurityPolicy: (0, environment_1.isDevelopment)() ? false : undefined,
        }));
        // CORS
        this.app.use((0, cors_1.default)({
            origin: environment_1.config.CORS_ORIGIN,
            credentials: environment_1.config.CORS_CREDENTIALS,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        }));
        // Compression
        this.app.use((0, compression_1.default)());
        // Body parsing
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        // Request logging
        this.app.use(logger_2.requestLogger);
        // Global rate limiting
        const globalLimiter = (0, express_rate_limit_1.default)({
            windowMs: environment_1.config.RATE_LIMIT_WINDOW_MS,
            max: environment_1.config.RATE_LIMIT_MAX_REQUESTS,
            message: {
                error: 'Too many requests from this IP, please try again later.',
            },
            standardHeaders: true,
            legacyHeaders: false,
        });
        this.app.use(globalLimiter);
        // Health check endpoint (before auth)
        this.app.get('/health', async (req, res) => {
            try {
                const dbHealth = exports.dbPool ? await (0, database_1.checkDatabaseHealth)(exports.dbPool) : { isHealthy: false };
                const redisHealth = exports.redisClient?.ping ? (await exports.redisClient.ping()) === 'PONG' : false;
                const health = {
                    status: 'ok',
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    version: process.env.npm_package_version || '1.0.0',
                    environment: environment_1.config.NODE_ENV,
                    services: {
                        database: dbHealth.isHealthy ? 'healthy' : 'unhealthy',
                        redis: redisHealth ? 'healthy' : 'unhealthy',
                        api: 'healthy',
                    },
                };
                const isHealthy = dbHealth.isHealthy && redisHealth;
                res.status(isHealthy ? 200 : 503).json(health);
            }
            catch (error) {
                logger_1.logger.error('Health check failed', { error });
                res.status(503).json({
                    status: 'error',
                    timestamp: new Date().toISOString(),
                    error: 'Health check failed',
                });
            }
        });
    }
    // Setup routes
    setupRoutes() {
        const apiRouter = express_1.default.Router();
        // Public routes (no auth required)
        apiRouter.use('/auth', auth_2.default);
        // Protected routes (auth required)
        apiRouter.use('/users', auth_1.authMiddleware, users_1.default);
        apiRouter.use('/sessions', sessions_1.default); // Auth handled by optionalAuthMiddleware in routes
        apiRouter.use('/problems', problems_1.default); // Auth handled by optionalAuthMiddleware in routes
        apiRouter.use('/assessments', assessments_1.default); // Auth handled by optionalAuthMiddleware in routes
        apiRouter.use('/adaptive', adaptive_1.default); // Auth handled by optionalAuthMiddleware in routes
        apiRouter.use('/analytics', auth_1.authMiddleware, analytics_1.default);
        apiRouter.use('/collaboration', auth_1.authMiddleware, collaboration_1.default);
        apiRouter.use('/voice', auth_1.authMiddleware, voice_1.default);
        apiRouter.use('/monitoring', auth_1.authMiddleware, monitoring_1.default);
        // Mount API routes
        this.app.use('/api/v1', apiRouter);
        // Setup Swagger documentation
        (0, swagger_1.setupSwagger)(this.app);
        // Serve static files for uploads
        this.app.use('/uploads', express_1.default.static(environment_1.config.UPLOAD_DIR));
        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Not Found',
                message: `Route ${req.originalUrl} not found`,
                timestamp: new Date().toISOString(),
            });
        });
        // Global error handler (must be last)
        this.app.use(errorHandler_1.errorHandler);
    }
    // Setup WebSocket handlers
    setupWebSocket() {
        // Initialize WebSocket handlers
        new handlers_1.default(this.io);
        logger_1.logger.info('WebSocket handlers configured');
    }
    // Start the server
    async start() {
        try {
            // Initialize services first
            await this.initializeServices();
            // Setup middleware and routes
            this.setupMiddleware();
            this.setupRoutes();
            this.setupWebSocket();
            // Start listening
            this.server.listen(environment_1.config.PORT, environment_1.config.HOST, () => {
                logger_1.logger.info(`Socrates API server started`, {
                    port: environment_1.config.PORT,
                    host: environment_1.config.HOST,
                    environment: environment_1.config.NODE_ENV,
                    processId: process.pid,
                });
                if ((0, environment_1.isDevelopment)()) {
                    logger_1.logger.info(`API Documentation available at: http://${environment_1.config.HOST}:${environment_1.config.PORT}/api-docs`);
                    logger_1.logger.info(`Health check available at: http://${environment_1.config.HOST}:${environment_1.config.PORT}/health`);
                }
            });
            // Setup graceful shutdown
            this.setupGracefulShutdown();
        }
        catch (error) {
            logger_1.logger.error('Failed to start server', { error });
            process.exit(1);
        }
    }
    // Setup graceful shutdown
    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            if (this.isShuttingDown) {
                logger_1.logger.warn('Shutdown already in progress, forcing exit...');
                process.exit(1);
            }
            this.isShuttingDown = true;
            logger_1.logger.info(`Received ${signal}, starting graceful shutdown...`);
            // Set a timeout for forced shutdown
            const forceShutdownTimeout = setTimeout(() => {
                logger_1.logger.error('Graceful shutdown timeout, forcing exit...');
                process.exit(1);
            }, 30000); // 30 seconds
            try {
                // Stop accepting new connections
                this.server.close(async () => {
                    logger_1.logger.info('HTTP server closed');
                    try {
                        // Close WebSocket connections
                        this.io.close(() => {
                            logger_1.logger.info('WebSocket server closed');
                        });
                        // Close database connections
                        if (exports.dbPool) {
                            await exports.dbPool.end();
                            logger_1.logger.info('Database connections closed');
                        }
                        // Close Redis connections
                        if (exports.redisClient) {
                            await exports.redisClient.quit();
                            logger_1.logger.info('Redis connections closed');
                        }
                        clearTimeout(forceShutdownTimeout);
                        logger_1.logger.info('Graceful shutdown completed');
                        process.exit(0);
                    }
                    catch (error) {
                        logger_1.logger.error('Error during shutdown', { error });
                        clearTimeout(forceShutdownTimeout);
                        process.exit(1);
                    }
                });
            }
            catch (error) {
                logger_1.logger.error('Error during shutdown', { error });
                clearTimeout(forceShutdownTimeout);
                process.exit(1);
            }
        };
        // Handle different shutdown signals
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon restart
        // Handle uncaught exceptions and rejections
        process.on('uncaughtException', (error) => {
            logger_1.logger.error('Uncaught Exception', { error });
            shutdown('uncaughtException');
        });
        process.on('unhandledRejection', (reason, promise) => {
            logger_1.logger.error('Unhandled Rejection', { reason, promise });
            shutdown('unhandledRejection');
        });
    }
    // Get Express app instance
    getApp() {
        return this.app;
    }
    // Get HTTP server instance
    getServer() {
        return this.server;
    }
    // Get Socket.IO instance
    getIO() {
        return this.io;
    }
}
exports.SocratesServer = SocratesServer;
// Create and export server instance
const server = new SocratesServer();
// Start server if this file is run directly
if (require.main === module) {
    server.start().catch((error) => {
        logger_1.logger.error('Failed to start server', { error });
        process.exit(1);
    });
}
exports.default = server;
//# sourceMappingURL=server.js.map