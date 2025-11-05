import { Pool, PoolConfig } from 'pg';
interface DatabaseConfig extends PoolConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean | object;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
}
export declare const createDatabasePool: (config?: Partial<DatabaseConfig>) => Pool;
export declare const initializeSchema: (pool: Pool) => Promise<void>;
export declare const seedInitialData: (pool: Pool) => Promise<void>;
export declare const checkDatabaseHealth: (pool: Pool) => Promise<{
    isHealthy: boolean;
    activeConnections: number;
    totalConnections: number;
    idleConnections: number;
    waitingConnections: number;
    lastError?: string;
}>;
export declare const closeDatabasePool: (pool: Pool) => Promise<void>;
declare const _default: {
    createDatabasePool: (config?: Partial<DatabaseConfig>) => Pool;
    initializeSchema: (pool: Pool) => Promise<void>;
    seedInitialData: (pool: Pool) => Promise<void>;
    checkDatabaseHealth: (pool: Pool) => Promise<{
        isHealthy: boolean;
        activeConnections: number;
        totalConnections: number;
        idleConnections: number;
        waitingConnections: number;
        lastError?: string;
    }>;
    closeDatabasePool: (pool: Pool) => Promise<void>;
};
export default _default;
//# sourceMappingURL=database.d.ts.map