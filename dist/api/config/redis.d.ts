import Redis, { RedisOptions } from 'ioredis';
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
export declare const createRedisClient: (config?: Partial<RedisConfig>) => Redis;
export declare const initializeRedis: () => Promise<{
    client: Redis;
    subscriber: Redis;
    publisher: Redis;
}>;
export declare const getRedisClient: () => Redis;
export declare const getRedisSubscriber: () => Redis;
export declare const getRedisPublisher: () => Redis;
export declare class CacheService {
    private client;
    constructor(client?: Redis);
    set(key: string, value: any, ttlSeconds?: number): Promise<void>;
    get<T = any>(key: string): Promise<T | null>;
    del(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    expire(key: string, ttlSeconds: number): Promise<void>;
    ttl(key: string): Promise<number>;
    incr(key: string): Promise<number>;
    incrWithExpire(key: string, ttlSeconds: number): Promise<number>;
    mget(keys: string[]): Promise<(any | null)[]>;
    mset(keyValuePairs: Record<string, any>, ttlSeconds?: number): Promise<void>;
    clearPattern(pattern: string): Promise<number>;
    getStats(): Promise<{
        keyCount: number;
        memoryUsage: string;
        hitRate?: number;
    }>;
}
export declare class SessionService {
    private client;
    private prefix;
    private defaultTTL;
    constructor(client?: Redis, prefix?: string, defaultTTL?: number);
    createSession(sessionId: string, data: any, ttlSeconds?: number): Promise<void>;
    getSession(sessionId: string): Promise<any | null>;
    updateSession(sessionId: string, data: any, ttlSeconds?: number): Promise<void>;
    deleteSession(sessionId: string): Promise<void>;
    extendSession(sessionId: string, ttlSeconds: number): Promise<void>;
    getUserSessions(userId: string): Promise<string[]>;
    cleanupExpiredSessions(): Promise<number>;
}
export declare const checkRedisHealth: () => Promise<{
    isHealthy: boolean;
    responseTime: number;
    memoryUsage?: string;
    connectedClients?: number;
    lastError?: string;
}>;
export declare const closeRedisConnections: () => Promise<void>;
declare const _default: {
    createRedisClient: (config?: Partial<RedisConfig>) => Redis;
    initializeRedis: () => Promise<{
        client: Redis;
        subscriber: Redis;
        publisher: Redis;
    }>;
    getRedisClient: () => Redis;
    getRedisSubscriber: () => Redis;
    getRedisPublisher: () => Redis;
    CacheService: typeof CacheService;
    SessionService: typeof SessionService;
    checkRedisHealth: () => Promise<{
        isHealthy: boolean;
        responseTime: number;
        memoryUsage?: string;
        connectedClients?: number;
        lastError?: string;
    }>;
    closeRedisConnections: () => Promise<void>;
};
export default _default;
//# sourceMappingURL=redis.d.ts.map