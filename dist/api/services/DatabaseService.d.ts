import { PoolClient, QueryResult } from 'pg';
export interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
}
export declare class DatabaseService {
    private static pool;
    private static isInitialized;
    /**
     * Initialize database connection pool
     */
    static initialize(config?: DatabaseConfig): Promise<void>;
    /**
     * Execute a query
     */
    static query(text: string, params?: any[]): Promise<QueryResult>;
    /**
     * Get a client from the pool for transactions
     */
    static getClient(): Promise<PoolClient>;
    /**
     * Execute multiple queries in a transaction
     */
    static transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
    /**
     * Check if database is healthy
     */
    static healthCheck(): Promise<boolean>;
    /**
     * Get pool statistics
     */
    static getPoolStats(): {
        totalCount: number;
        idleCount: number;
        waitingCount: number;
    } | null;
    /**
     * Close all connections
     */
    static close(): Promise<void>;
    /**
     * Initialize database schema
     */
    static initializeSchema(): Promise<void>;
    /**
     * Drop all tables (for testing purposes)
     */
    static dropSchema(): Promise<void>;
}
export default DatabaseService;
//# sourceMappingURL=DatabaseService.d.ts.map