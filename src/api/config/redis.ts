import Redis, { RedisOptions } from 'ioredis';
import { logger } from '../middleware/logger';

// Redis configuration interface
interface RedisConfig extends RedisOptions {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
  lazyConnect?: boolean;
}

// Default Redis configuration
const defaultConfig: RedisConfig = {
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
let redisClient: Redis | null = null;
let redisSubscriber: Redis | null = null;
let redisPublisher: Redis | null = null;

// Create Redis client
export const createRedisClient = (config: Partial<RedisConfig> = {}): Redis => {
  const finalConfig = { ...defaultConfig, ...config };
  
  logger.info('Creating Redis client', {
    host: finalConfig.host,
    port: finalConfig.port,
    db: finalConfig.db,
    keyPrefix: finalConfig.keyPrefix,
  });

  const client = new Redis(finalConfig);

  // Handle Redis events
  client.on('connect', () => {
    logger.info('Redis client connected', {
      host: finalConfig.host,
      port: finalConfig.port,
      db: finalConfig.db,
    });
  });

  client.on('ready', () => {
    logger.info('Redis client ready', {
      host: finalConfig.host,
      port: finalConfig.port,
      db: finalConfig.db,
    });
  });

  client.on('error', (error: Error) => {
    logger.error('Redis client error', {
      error: error.message,
      host: finalConfig.host,
      port: finalConfig.port,
      db: finalConfig.db,
    });
  });

  client.on('close', () => {
    logger.warn('Redis client connection closed', {
      host: finalConfig.host,
      port: finalConfig.port,
      db: finalConfig.db,
    });
  });

  client.on('reconnecting', (ms: number) => {
    logger.info('Redis client reconnecting', {
      delay: ms,
      host: finalConfig.host,
      port: finalConfig.port,
      db: finalConfig.db,
    });
  });

  client.on('end', () => {
    logger.info('Redis client connection ended', {
      host: finalConfig.host,
      port: finalConfig.port,
      db: finalConfig.db,
    });
  });

  return client;
};

// Initialize Redis clients
export const initializeRedis = async (): Promise<{
  client: Redis;
  subscriber: Redis;
  publisher: Redis;
}> => {
  logger.info('Initializing Redis clients');

  try {
    // Create main Redis client
    redisClient = createRedisClient();
    (global as any).socratesRedisClient = redisClient;
    await redisClient.ping();

    // Create subscriber client (for pub/sub)
    redisSubscriber = createRedisClient({
      keyPrefix: '', // No prefix for pub/sub
    });
    await redisSubscriber.ping();

    // Create publisher client (for pub/sub)
    redisPublisher = createRedisClient({
      keyPrefix: '', // No prefix for pub/sub
    });
    await redisPublisher.ping();

    logger.info('Redis clients initialized successfully');

    return {
      client: redisClient,
      subscriber: redisSubscriber,
      publisher: redisPublisher,
    };
  } catch (error) {
    logger.error('Failed to initialize Redis clients', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

// Get Redis client instances
export const getRedisClient = (): Redis => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initializeRedis() first.');
  }
  return redisClient;
};

export const getRedisSubscriber = (): Redis => {
  if (!redisSubscriber) {
    throw new Error('Redis subscriber not initialized. Call initializeRedis() first.');
  }
  return redisSubscriber;
};

export const getRedisPublisher = (): Redis => {
  if (!redisPublisher) {
    throw new Error('Redis publisher not initialized. Call initializeRedis() first.');
  }
  return redisPublisher;
};

// Cache utility functions
export class CacheService {
  private client: Redis;

  constructor(client?: Redis) {
    this.client = client || getRedisClient();
  }

  // Set a value with optional expiration
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const serializedValue = JSON.stringify(value);
    
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, serializedValue);
    } else {
      await this.client.set(key, serializedValue);
    }

    logger.debug('Cache set', { key, ttl: ttlSeconds });
  }

  // Get a value from cache
  async get<T = any>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    
    if (value === null) {
      logger.debug('Cache miss', { key });
      return null;
    }

    try {
      const parsed = JSON.parse(value);
      logger.debug('Cache hit', { key });
      return parsed;
    } catch (error) {
      logger.error('Failed to parse cached value', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  // Delete a key from cache
  async del(key: string): Promise<void> {
    await this.client.del(key);
    logger.debug('Cache deleted', { key });
  }

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  // Set expiration for a key
  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
    logger.debug('Cache expiration set', { key, ttl: ttlSeconds });
  }

  // Get TTL for a key
  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  // Increment a counter
  async incr(key: string): Promise<number> {
    return await this.client.incr(key);
  }

  // Increment a counter with expiration
  async incrWithExpire(key: string, ttlSeconds: number): Promise<number> {
    const pipeline = this.client.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, ttlSeconds);
    const results = await pipeline.exec();
    
    if (results && results[0] && results[0][1]) {
      return results[0][1] as number;
    }
    
    return 0;
  }

  // Get multiple keys
  async mget(keys: string[]): Promise<(any | null)[]> {
    if (keys.length === 0) return [];
    
    const values = await this.client.mget(...keys);
    
    return values.map((value: string | null, index: number) => {
      if (value === null) {
        logger.debug('Cache miss', { key: keys[index] });
        return null;
      }
      
      try {
        const parsed = JSON.parse(value);
        logger.debug('Cache hit', { key: keys[index] });
        return parsed;
      } catch (error) {
        logger.error('Failed to parse cached value', {
          key: keys[index],
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return null;
      }
    });
  }

  // Set multiple keys
  async mset(keyValuePairs: Record<string, any>, ttlSeconds?: number): Promise<void> {
    const serializedPairs: string[] = [];
    
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
    } else {
      await this.client.mset(...serializedPairs);
    }

    logger.debug('Cache mset', { 
      keys: Object.keys(keyValuePairs), 
      ttl: ttlSeconds 
    });
  }

  // Clear all keys with a pattern
  async clearPattern(pattern: string): Promise<number> {
    const keys = await this.client.keys(pattern);
    
    if (keys.length === 0) {
      return 0;
    }
    
    const deleted = await this.client.del(...keys);
    logger.debug('Cache pattern cleared', { pattern, deleted });
    
    return deleted;
  }

  // Get cache statistics
  async getStats(): Promise<{
    keyCount: number;
    memoryUsage: string;
    hitRate?: number;
  }> {
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

// Session management using Redis
export class SessionService {
  private client: Redis;
  private prefix: string;
  private defaultTTL: number;

  constructor(client?: Redis, prefix = 'session:', defaultTTL = 3600) {
    this.client = client || getRedisClient();
    this.prefix = prefix;
    this.defaultTTL = defaultTTL;
  }

  // Create a new session
  async createSession(sessionId: string, data: any, ttlSeconds?: number): Promise<void> {
    const key = `${this.prefix}${sessionId}`;
    const ttl = ttlSeconds || this.defaultTTL;
    
    await this.client.setex(key, ttl, JSON.stringify({
      ...data,
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    }));

    logger.debug('Session created', { sessionId, ttl });
  }

  // Get session data
  async getSession(sessionId: string): Promise<any | null> {
    const key = `${this.prefix}${sessionId}`;
    const data = await this.client.get(key);
    
    if (!data) {
      logger.debug('Session not found', { sessionId });
      return null;
    }

    try {
      const parsed = JSON.parse(data);
      
      // Update last accessed time
      parsed.lastAccessedAt = new Date().toISOString();
      await this.client.setex(key, await this.client.ttl(key), JSON.stringify(parsed));
      
      logger.debug('Session retrieved', { sessionId });
      return parsed;
    } catch (error) {
      logger.error('Failed to parse session data', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  // Update session data
  async updateSession(sessionId: string, data: any, ttlSeconds?: number): Promise<void> {
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

    logger.debug('Session updated', { sessionId });
  }

  // Delete a session
  async deleteSession(sessionId: string): Promise<void> {
    const key = `${this.prefix}${sessionId}`;
    await this.client.del(key);
    
    logger.debug('Session deleted', { sessionId });
  }

  // Extend session TTL
  async extendSession(sessionId: string, ttlSeconds: number): Promise<void> {
    const key = `${this.prefix}${sessionId}`;
    await this.client.expire(key, ttlSeconds);
    
    logger.debug('Session extended', { sessionId, ttl: ttlSeconds });
  }

  // Get all active sessions for a user
  async getUserSessions(userId: string): Promise<string[]> {
    const pattern = `${this.prefix}*`;
    const keys = await this.client.keys(pattern);
    const userSessions: string[] = [];

    for (const key of keys) {
      const data = await this.client.get(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (parsed.userId === userId) {
            userSessions.push(key.replace(this.prefix, ''));
          }
        } catch (error) {
          // Skip invalid session data
        }
      }
    }

    return userSessions;
  }

  // Clean up expired sessions (manual cleanup)
  async cleanupExpiredSessions(): Promise<number> {
    const pattern = `${this.prefix}*`;
    const keys = await this.client.keys(pattern);
    let cleaned = 0;

    for (const key of keys) {
      const ttl = await this.client.ttl(key);
      if (ttl === -2) { // Key doesn't exist
        cleaned++;
      }
    }

    logger.debug('Expired sessions cleaned', { count: cleaned });
    return cleaned;
  }
}

// Redis health check
export const checkRedisHealth = async (): Promise<{
  isHealthy: boolean;
  responseTime: number;
  memoryUsage?: string;
  connectedClients?: number;
  lastError?: string;
}> => {
  const startTime = Date.now();
  
  try {
    const client = getRedisClient();
    
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
  } catch (error) {
    return {
      isHealthy: false,
      responseTime: Date.now() - startTime,
      lastError: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Graceful shutdown
export const closeRedisConnections = async (): Promise<void> => {
  logger.info('Closing Redis connections');
  
  const promises: Promise<void>[] = [];
  
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
    logger.info('Redis connections closed successfully');
  } catch (error) {
    logger.error('Error closing Redis connections', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

export default {
  createRedisClient,
  initializeRedis,
  getRedisClient,
  getRedisSubscriber,
  getRedisPublisher,
  CacheService,
  SessionService,
  checkRedisHealth,
  closeRedisConnections,
};