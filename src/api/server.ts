import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import rateLimit from 'express-rate-limit';
import { config, isDevelopment } from './config/environment';
import { logger } from './middleware/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger';
import { authMiddleware } from './middleware/auth';
import { createDatabasePool, initializeSchema, seedInitialData, checkDatabaseHealth } from './config/database';
import { createRedisClient, CacheService, SessionService } from './config/redis';
import { setupSwagger } from './config/swagger';
import WebSocketHandlers from './websocket/handlers';

// Import route handlers
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import sessionRoutes from './routes/sessions';
import problemRoutes from './routes/problems';
import assessmentRoutes from './routes/assessments';
import adaptiveRoutes from './routes/adaptive';
import analyticsRoutes from './routes/analytics';
import collaborationRoutes from './routes/collaboration';
import voiceRoutes from './routes/voice';
import monitoringRoutes from './routes/monitoring';

// Global services
export let dbPool: any;
export let redisClient: any;
export let cacheService: any;
export let sessionService: any;
export let io: SocketIOServer;

// Application class
class SocratesServer {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private isShuttingDown = false;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    // Configure Socket.IO CORS
    const socketOrigin = (config.CORS_ORIGIN === '*')
      // Echo back the request origin when credentials are used
      ? ((origin: string, callback: (err: Error | null, allow: boolean | string) => void) => {
          callback(null, origin || '*');
        })
      : config.CORS_ORIGIN;

    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: socketOrigin as any,
        credentials: config.CORS_CREDENTIALS,
      },
      pingTimeout: config.WS_CONNECTION_TIMEOUT,
      pingInterval: config.WS_HEARTBEAT_INTERVAL,
    });

    // Make io globally available
    io = this.io;
  }

  // Initialize all services
  private async initializeServices(): Promise<void> {
    logger.info('Initializing services...');

    // Initialize database with graceful degradation
    try {
      logger.info('Connecting to database...');
      dbPool = await createDatabasePool();

      logger.info('Initializing database schema...');
      await initializeSchema(dbPool);

      if (isDevelopment()) {
        logger.info('Seeding initial data...');
        await seedInitialData(dbPool);
      }
      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error('Database initialization failed. Continuing in degraded mode.', { error });
      dbPool = null;
    }

    // Initialize Redis with graceful degradation
    try {
      logger.info('Connecting to Redis...');
      redisClient = createRedisClient();
      cacheService = new CacheService(redisClient);
      sessionService = new SessionService(redisClient);
      logger.info('Redis initialized successfully');
    } catch (error) {
      logger.error('Redis initialization failed. Continuing without cache/session services.', { error });
      redisClient = null;
      cacheService = null;
      sessionService = null;
    }

    logger.info('Service initialization complete');
  }

  // Setup middleware
  private setupMiddleware(): void {
    // CRITICAL: Handle OPTIONS requests FIRST, before ANY other middleware
    this.app.options('*', (req, res, next) => {
      try {
        const origin = req.headers.origin;
        const allowedOrigin = origin || '*';
        logger.debug('OPTIONS preflight request', { origin, allowedOrigin, path: req.path });
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
        return res.status(204).end();
      } catch (error) {
        logger.error('OPTIONS handler error', { error });
        return res.status(204).end();
      }
    });

    // CORS - must be before other middleware
    // Configure CORS to allow requests from frontend
    // When credentials are enabled, browsers require the actual origin (not '*')
    let expressCorsOrigin: any;
    if (config.CORS_ORIGIN === '*' || (Array.isArray(config.CORS_ORIGIN) && config.CORS_ORIGIN.length === 0)) {
      // Allow all origins - return the requesting origin when credentials are used
      expressCorsOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean | string) => void) => {
        // Always allow the origin - return it for credentials, or '*' if no origin
        const allowedOrigin = origin || '*';
        logger.debug('CORS: Allowing origin', { origin, allowedOrigin });
        callback(null, allowedOrigin);
      };
    } else if (Array.isArray(config.CORS_ORIGIN)) {
      expressCorsOrigin = config.CORS_ORIGIN;
    } else {
      expressCorsOrigin = config.CORS_ORIGIN;
    }

    logger.info('CORS configuration', { 
      CORS_ORIGIN: config.CORS_ORIGIN, 
      CORS_CREDENTIALS: config.CORS_CREDENTIALS 
    });

    // CORS configuration
    const corsOptions = {
      origin: expressCorsOrigin,
      credentials: config.CORS_CREDENTIALS,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      preflightContinue: false,
      optionsSuccessStatus: 204,
    };
    
    this.app.use(cors(corsOptions));

    // Security middleware (after CORS)
    this.app.use(helmet({
      contentSecurityPolicy: isDevelopment() ? false : undefined,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use(requestLogger);

    // Global rate limiting
    const globalLimiter = rateLimit({
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      max: config.RATE_LIMIT_MAX_REQUESTS,
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
        const dbHealth = dbPool ? await checkDatabaseHealth(dbPool) : { isHealthy: false } as any;
        const redisHealth = redisClient?.ping ? (await redisClient.ping()) === 'PONG' : false;
        
        const health = {
          status: 'ok',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: process.env.npm_package_version || '1.0.0',
          environment: config.NODE_ENV,
          services: {
            database: dbHealth.isHealthy ? 'healthy' : 'unhealthy',
            redis: redisHealth ? 'healthy' : 'unhealthy',
            api: 'healthy',
          },
        };

        const isHealthy = dbHealth.isHealthy && redisHealth;
        res.status(isHealthy ? 200 : 503).json(health);
      } catch (error) {
        logger.error('Health check failed', { error });
        res.status(503).json({
          status: 'error',
          timestamp: new Date().toISOString(),
          error: 'Health check failed',
        });
      }
    });
  }

  // Setup routes
  private setupRoutes(): void {
    const apiRouter = express.Router();

    // Public routes (no auth required)
    apiRouter.use('/auth', authRoutes);
    
    // Protected routes (auth required)
    apiRouter.use('/users', authMiddleware, userRoutes);
    apiRouter.use('/sessions', sessionRoutes); // Auth handled by optionalAuthMiddleware in routes
    apiRouter.use('/problems', problemRoutes); // Auth handled by optionalAuthMiddleware in routes
    apiRouter.use('/assessments', assessmentRoutes); // Auth handled by optionalAuthMiddleware in routes
    apiRouter.use('/adaptive', adaptiveRoutes); // Auth handled by optionalAuthMiddleware in routes
    apiRouter.use('/analytics', authMiddleware, analyticsRoutes);
    apiRouter.use('/collaboration', authMiddleware, collaborationRoutes);
    apiRouter.use('/voice', authMiddleware, voiceRoutes);
    apiRouter.use('/monitoring', authMiddleware, monitoringRoutes);

    // Mount API routes
    this.app.use('/api/v1', apiRouter);

    // Setup Swagger documentation
    setupSwagger(this.app);

    // Serve static files for uploads
    this.app.use('/uploads', express.static(config.UPLOAD_DIR));

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString(),
      });
    });

    // Global error handler (must be last)
    this.app.use(errorHandler);
  }

  // Setup WebSocket handlers
  private setupWebSocket(): void {
    // Initialize WebSocket handlers
    new WebSocketHandlers(this.io);
    logger.info('WebSocket handlers configured');
  }

  // Start the server
  public async start(): Promise<void> {
    try {
      // Initialize services first
      await this.initializeServices();

      // Setup middleware and routes
      this.setupMiddleware();
      this.setupRoutes();
      this.setupWebSocket();

      // Start listening
      this.server.listen(config.PORT, config.HOST, () => {
        logger.info(`Socrates API server started`, {
          port: config.PORT,
          host: config.HOST,
          environment: config.NODE_ENV,
          processId: process.pid,
        });

        if (isDevelopment()) {
          logger.info(`API Documentation available at: http://${config.HOST}:${config.PORT}/api-docs`);
          logger.info(`Health check available at: http://${config.HOST}:${config.PORT}/health`);
        }
      });

      // Setup graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start server', { error });
      process.exit(1);
    }
  }

  // Setup graceful shutdown
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) {
        logger.warn('Shutdown already in progress, forcing exit...');
        process.exit(1);
      }

      this.isShuttingDown = true;
      logger.info(`Received ${signal}, starting graceful shutdown...`);

      // Set a timeout for forced shutdown
      const forceShutdownTimeout = setTimeout(() => {
        logger.error('Graceful shutdown timeout, forcing exit...');
        process.exit(1);
      }, 30000); // 30 seconds

      try {
        // Stop accepting new connections
        this.server.close(async () => {
          logger.info('HTTP server closed');

          try {
            // Close WebSocket connections
            this.io.close(() => {
              logger.info('WebSocket server closed');
            });

            // Close database connections
            if (dbPool) {
              await dbPool.end();
              logger.info('Database connections closed');
            }

            // Close Redis connections
            if (redisClient) {
              await redisClient.quit();
              logger.info('Redis connections closed');
            }

            clearTimeout(forceShutdownTimeout);
            logger.info('Graceful shutdown completed');
            process.exit(0);
          } catch (error) {
            logger.error('Error during shutdown', { error });
            clearTimeout(forceShutdownTimeout);
            process.exit(1);
          }
        });
      } catch (error) {
        logger.error('Error during shutdown', { error });
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
      logger.error('Uncaught Exception', { error });
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise });
      shutdown('unhandledRejection');
    });
  }

  // Get Express app instance
  public getApp(): express.Application {
    return this.app;
  }

  // Get HTTP server instance
  public getServer(): any {
    return this.server;
  }

  // Get Socket.IO instance
  public getIO(): SocketIOServer {
    return this.io;
  }
}

// Create and export server instance
const server = new SocratesServer();

// Start server if this file is run directly
if (require.main === module) {
  server.start().catch((error) => {
    logger.error('Failed to start server', { error });
    process.exit(1);
  });
}

export default server;
export { SocratesServer };