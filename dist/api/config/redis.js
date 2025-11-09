"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeRedisConnections = exports.checkRedisHealth = exports.SessionService = exports.CacheService = exports.getRedisPublisher = exports.getRedisSubscriber = exports.getRedisClient = exports.initializeRedis = exports.createRedisClient = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../middleware/logger");
// Default Redis configuration
const defaultConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'socrates:',
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
};
// Redis client instances
let redisClient = null;
let redisSubscriber = null;
let redisPublisher = null;
// Create Redis client
const createRedisClient = (config = {}) => {
    const finalConfig = { ...defaultConfig, ...config };
    logger_1.logger.info('Creating Redis client', {
        host: finalConfig.host,
        port: finalConfig.port,
        db: finalConfig.db,
        keyPrefix: finalConfig.keyPrefix,
    });
    const client = new ioredis_1.default(finalConfig);
    // Handle Redis events
    client.on('connect', () => {
        logger_1.logger.info('Redis client connected', {
            host: finalConfig.host,
            port: finalConfig.port,
            db: finalConfig.db,
        });
    });
    client.on('ready', () => {
        logger_1.logger.info('Redis client ready', {
            host: finalConfig.host,
            port: finalConfig.port,
            db: finalConfig.db,
        });
    });
    client.on('error', (error) => {
        logger_1.logger.error('Redis client error', {
            error: error.message,
            host: finalConfig.host,
            port: finalConfig.port,
            db: finalConfig.db,
        });
    });
    client.on('close', () => {
        logger_1.logger.warn('Redis client connection closed', {
            host: finalConfig.host,
            port: finalConfig.port,
            db: finalConfig.db,
        });
    });
    client.on('reconnecting', (ms) => {
        logger_1.logger.info('Redis client reconnecting', {
            delay: ms,
            host: finalConfig.host,
            port: finalConfig.port,
            db: finalConfig.db,
        });
    });
    client.on('end', () => {
        logger_1.logger.info('Redis client connection ended', {
            host: finalConfig.host,
            port: finalConfig.port,
            db: finalConfig.db,
        });
    });
    return client;
};
exports.createRedisClient = createRedisClient;
// Initialize Redis clients
const initializeRedis = async () => {
    logger_1.logger.info('Initializing Redis clients');
    try {
        // Create main Redis client
        redisClient = (0, exports.createRedisClient)();
        global.socratesRedisClient = redisClient;
        await redisClient.ping();
        // Create subscriber client (for pub/sub)
        redisSubscriber = (0, exports.createRedisClient)({
            keyPrefix: '', // No prefix for pub/sub
        });
        await redisSubscriber.ping();
        // Create publisher client (for pub/sub)
        redisPublisher = (0, exports.createRedisClient)({
            keyPrefix: '', // No prefix for pub/sub
        });
        await redisPublisher.ping();
        logger_1.logger.info('Redis clients initialized successfully');
        return {
            client: redisClient,
            subscriber: redisSubscriber,
            publisher: redisPublisher,
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize Redis clients', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
};
exports.initializeRedis = initializeRedis;
// Get Redis client instances
const getRedisClient = () => {
    if (!redisClient) {
        throw new Error('Redis client not initialized. Call initializeRedis() first.');
    }
    return redisClient;
};
exports.getRedisClient = getRedisClient;
const getRedisSubscriber = () => {
    if (!redisSubscriber) {
        throw new Error('Redis subscriber not initialized. Call initializeRedis() first.');
    }
    return redisSubscriber;
};
exports.getRedisSubscriber = getRedisSubscriber;
const getRedisPublisher = () => {
    if (!redisPublisher) {
        throw new Error('Redis publisher not initialized. Call initializeRedis() first.');
    }
    return redisPublisher;
};
exports.getRedisPublisher = getRedisPublisher;
// Cache utility functions
class CacheService {
    constructor(client) {
        this.client = client || (0, exports.getRedisClient)();
    }
    // Set a value with optional expiration
    async set(key, value, ttlSeconds) {
        const serializedValue = JSON.stringify(value);
        if (ttlSeconds) {
            await this.client.setex(key, ttlSeconds, serializedValue);
        }
        else {
            await this.client.set(key, serializedValue);
        }
        logger_1.logger.debug('Cache set', { key, ttl: ttlSeconds });
    }
    // Get a value from cache
    async get(key) {
        const value = await this.client.get(key);
        if (value === null) {
            logger_1.logger.debug('Cache miss', { key });
            return null;
        }
        try {
            const parsed = JSON.parse(value);
            logger_1.logger.debug('Cache hit', { key });
            return parsed;
        }
        catch (error) {
            logger_1.logger.error('Failed to parse cached value', {
                key,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
        }
    }
    // Delete a key from cache
    async del(key) {
        await this.client.del(key);
        logger_1.logger.debug('Cache deleted', { key });
    }
    // Check if key exists
    async exists(key) {
        const result = await this.client.exists(key);
        return result === 1;
    }
    // Set expiration for a key
    async expire(key, ttlSeconds) {
        await this.client.expire(key, ttlSeconds);
        logger_1.logger.debug('Cache expiration set', { key, ttl: ttlSeconds });
    }
    // Get TTL for a key
    async ttl(key) {
        return await this.client.ttl(key);
    }
    // Increment a counter
    async incr(key) {
        return await this.client.incr(key);
    }
    // Increment a counter with expiration
    async incrWithExpire(key, ttlSeconds) {
        const pipeline = this.client.pipeline();
        pipeline.incr(key);
        pipeline.expire(key, ttlSeconds);
        const results = await pipeline.exec();
        if (results && results[0] && results[0][1]) {
            return results[0][1];
        }
        return 0;
    }
    // Get multiple keys
    async mget(keys) {
        if (keys.length === 0)
            return [];
        const values = await this.client.mget(...keys);
        return values.map((value, index) => {
            if (value === null) {
                logger_1.logger.debug('Cache miss', { key: keys[index] });
                return null;
            }
            try {
                const parsed = JSON.parse(value);
                logger_1.logger.debug('Cache hit', { key: keys[index] });
                return parsed;
            }
            catch (error) {
                logger_1.logger.error('Failed to parse cached value', {
                    key: keys[index],
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
                return null;
            }
        });
    }
    // Set multiple keys
    async mset(keyValuePairs, ttlSeconds) {
        const serializedPairs = [];
        for (const [key, value] of Object.entries(keyValuePairs)) {
            serializedPairs.push(key, JSON.stringify(value));
        }
        if (ttlSeconds) {
            const pipeline = this.client.pipeline();
            pipeline.mset(...serializedPairs);
            for (const key of Object.keys(keyValuePairs)) {
                pipeline.expire(key, ttlSeconds);
            }
            await pipeline.exec();
        }
        else {
            await this.client.mset(...serializedPairs);
        }
        logger_1.logger.debug('Cache mset', {
            keys: Object.keys(keyValuePairs),
            ttl: ttlSeconds
        });
    }
    // Clear all keys with a pattern
    async clearPattern(pattern) {
        const keys = await this.client.keys(pattern);
        if (keys.length === 0) {
            return 0;
        }
        const deleted = await this.client.del(...keys);
        logger_1.logger.debug('Cache pattern cleared', { pattern, deleted });
        return deleted;
    }
    // Get cache statistics
    async getStats() {
        const info = await this.client.info('memory');
        const keyCount = await this.client.dbsize();
        // Parse memory usage from info
        const memoryMatch = info.match(/used_memory_human:(.+)/);
        const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'Unknown';
        return {
            keyCount,
            memoryUsage,
        };
    }
}
exports.CacheService = CacheService;
// Session management using Redis
class SessionService {
    constructor(client, prefix = 'session:', defaultTTL = 3600) {
        this.client = client || (0, exports.getRedisClient)();
        this.prefix = prefix;
        this.defaultTTL = defaultTTL;
    }
    // Create a new session
    async createSession(sessionId, data, ttlSeconds) {
        const key = `${this.prefix}${sessionId}`;
        const ttl = ttlSeconds || this.defaultTTL;
        await this.client.setex(key, ttl, JSON.stringify({
            ...data,
            createdAt: new Date().toISOString(),
            lastAccessedAt: new Date().toISOString(),
        }));
        logger_1.logger.debug('Session created', { sessionId, ttl });
    }
    // Get session data
    async getSession(sessionId) {
        const key = `${this.prefix}${sessionId}`;
        const data = await this.client.get(key);
        if (!data) {
            logger_1.logger.debug('Session not found', { sessionId });
            return null;
        }
        try {
            const parsed = JSON.parse(data);
            // Update last accessed time
            parsed.lastAccessedAt = new Date().toISOString();
            await this.client.setex(key, await this.client.ttl(key), JSON.stringify(parsed));
            logger_1.logger.debug('Session retrieved', { sessionId });
            return parsed;
        }
        catch (error) {
            logger_1.logger.error('Failed to parse session data', {
                sessionId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
        }
    }
    // Update session data
    async updateSession(sessionId, data, ttlSeconds) {
        const key = `${this.prefix}${sessionId}`;
        const existingData = await this.getSession(sessionId);
        if (!existingData) {
            throw new Error(`Session ${sessionId} not found`);
        }
        const updatedData = {
            ...existingData,
            ...data,
            lastAccessedAt: new Date().toISOString(),
        };
        const ttl = ttlSeconds || await this.client.ttl(key);
        await this.client.setex(key, ttl, JSON.stringify(updatedData));
        logger_1.logger.debug('Session updated', { sessionId });
    }
    // Delete a session
    async deleteSession(sessionId) {
        const key = `${this.prefix}${sessionId}`;
        await this.client.del(key);
        logger_1.logger.debug('Session deleted', { sessionId });
    }
    // Extend session TTL
    async extendSession(sessionId, ttlSeconds) {
        const key = `${this.prefix}${sessionId}`;
        await this.client.expire(key, ttlSeconds);
        logger_1.logger.debug('Session extended', { sessionId, ttl: ttlSeconds });
    }
    // Get all active sessions for a user
    async getUserSessions(userId) {
        const pattern = `${this.prefix}*`;
        const keys = await this.client.keys(pattern);
        const userSessions = [];
        for (const key of keys) {
            const data = await this.client.get(key);
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.userId === userId) {
                        userSessions.push(key.replace(this.prefix, ''));
                    }
                }
                catch (error) {
                    // Skip invalid session data
                }
            }
        }
        return userSessions;
    }
    // Clean up expired sessions (manual cleanup)
    async cleanupExpiredSessions() {
        const pattern = `${this.prefix}*`;
        const keys = await this.client.keys(pattern);
        let cleaned = 0;
        for (const key of keys) {
            const ttl = await this.client.ttl(key);
            if (ttl === -2) { // Key doesn't exist
                cleaned++;
            }
        }
        logger_1.logger.debug('Expired sessions cleaned', { count: cleaned });
        return cleaned;
    }
}
exports.SessionService = SessionService;
// Redis health check
const checkRedisHealth = async () => {
    const startTime = Date.now();
    try {
        const client = (0, exports.getRedisClient)();
        // Test basic operation
        await client.ping();
        // Get server info
        const info = await client.info('memory');
        const clients = await client.info('clients');
        const memoryMatch = info.match(/used_memory_human:(.+)/);
        const clientsMatch = clients.match(/connected_clients:(\d+)/);
        const responseTime = Date.now() - startTime;
        return {
            isHealthy: true,
            responseTime,
            memoryUsage: memoryMatch ? memoryMatch[1].trim() : undefined,
            connectedClients: clientsMatch ? parseInt(clientsMatch[1]) : undefined,
        };
    }
    catch (error) {
        return {
            isHealthy: false,
            responseTime: Date.now() - startTime,
            lastError: error instanceof Error ? error.message : 'Unknown error',
        };
    }
};
exports.checkRedisHealth = checkRedisHealth;
// Graceful shutdown
const closeRedisConnections = async () => {
    logger_1.logger.info('Closing Redis connections');
    const promises = [];
    if (redisClient) {
        promises.push(redisClient.quit().then(() => undefined));
    }
    if (redisSubscriber) {
        promises.push(redisSubscriber.quit().then(() => undefined));
    }
    if (redisPublisher) {
        promises.push(redisPublisher.quit().then(() => undefined));
    }
    try {
        await Promise.all(promises);
        logger_1.logger.info('Redis connections closed successfully');
    }
    catch (error) {
        logger_1.logger.error('Error closing Redis connections', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
};
exports.closeRedisConnections = closeRedisConnections;
exports.default = {
    createRedisClient: exports.createRedisClient,
    initializeRedis: exports.initializeRedis,
    getRedisClient: exports.getRedisClient,
    getRedisSubscriber: exports.getRedisSubscriber,
    getRedisPublisher: exports.getRedisPublisher,
    CacheService,
    SessionService,
    checkRedisHealth: exports.checkRedisHealth,
    closeRedisConnections: exports.closeRedisConnections,
};
//# sourceMappingURL=redis.js.map