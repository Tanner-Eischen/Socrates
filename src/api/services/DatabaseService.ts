import { Pool, PoolClient, QueryResult } from 'pg';
import { logger } from '../middleware/logger';

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

export class DatabaseService {
  private static pool: Pool | null = null;
  private static isInitialized = false;

  /**
   * Initialize database connection pool
   */
  static async initialize(config?: DatabaseConfig): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const dbConfig: DatabaseConfig = config || {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'socra_teach',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        ssl: process.env.NODE_ENV === 'production',
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
        connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
      };

      this.pool = new Pool(dbConfig);

      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isInitialized = true;
      logger.info('Database connection pool initialized successfully', {
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
      });

      // Handle pool errors
      this.pool.on('error', (err) => {
        logger.error('Unexpected error on idle client', { error: err });
      });

    } catch (error: any) {
      logger.warn('Failed to initialize database connection pool', {
        error: {
          code: error.code,
          message: error.message,
        },
      });
      logger.info('Database not available - using in-memory storage fallback for authentication');
      // Don't re-throw - allow the app to start with in-memory storage
      this.isInitialized = true; // Mark as initialized to prevent retry
    }
  }

  /**
   * Execute a query
   */
  static async query(text: string, params?: any[]): Promise<QueryResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // If pool is not available (database connection failed), throw a helpful error
    if (!this.pool) {
      logger.warn('Database query attempted but database is not available', {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      });
      throw new Error('Database is not available. Sessions cannot be persisted without a database connection.');
    }

    const start = Date.now();
    
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Database query executed', {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration,
        rows: result.rowCount,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Database query failed', {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        params: params ? '[REDACTED]' : undefined,
        duration,
        error,
      });
      throw error;
    }
  }

  /**
   * Get a client from the pool for transactions
   */
  static async getClient(): Promise<PoolClient> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.pool) {
      throw new Error('Database is not available. Cannot get client without a database connection.');
    }

    return await this.pool.connect();
  }

  /**
   * Execute multiple queries in a transaction
   */
  static async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      
      logger.debug('Database transaction completed successfully');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Database transaction rolled back', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if database is healthy
   */
  static async healthCheck(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        return false;
      }

      const result = await this.query('SELECT 1 as health_check');
      return result.rows.length > 0 && result.rows[0].health_check === 1;
    } catch (error) {
      logger.error('Database health check failed', { error });
      return false;
    }
  }

  /**
   * Get pool statistics
   */
  static getPoolStats() {
    if (!this.pool) {
      return null;
    }

    return {
      totalCount: this.pool?.totalCount || 0,
      idleCount: this.pool?.idleCount || 0,
      waitingCount: this.pool?.waitingCount || 0,
    };
  }

  /**
   * Close all connections
   */
  static async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.isInitialized = false;
      logger.info('Database connection pool closed');
    }
  }

  /**
   * Initialize database schema
   */
  static async initializeSchema(): Promise<void> {
    try {
      logger.info('Initializing database schema...');

      // Create users table
      await this.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'tutor', 'admin')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          is_active BOOLEAN DEFAULT true,
          last_login TIMESTAMP WITH TIME ZONE,
          email_verified BOOLEAN DEFAULT false,
          two_factor_enabled BOOLEAN DEFAULT false
        )
      `);

      // Create user profiles table
      await this.query(`
        CREATE TABLE IF NOT EXISTS user_profiles (
          user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          preferences JSONB DEFAULT '{}',
          learning_style JSONB DEFAULT '{}',
          accessibility_settings JSONB DEFAULT '{}',
          notification_preferences JSONB DEFAULT '{}',
          timezone VARCHAR(50) DEFAULT 'UTC',
          language VARCHAR(10) DEFAULT 'en',
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create sessions table
      await this.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          id UUID PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          problem_id VARCHAR(255),
          problem_text TEXT NOT NULL,
          problem_type VARCHAR(50) NOT NULL,
          difficulty_level INTEGER DEFAULT 1,
          status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'completed', 'paused', 'abandoned')),
          start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          end_time TIMESTAMP WITH TIME ZONE,
          total_duration INTEGER DEFAULT 0,
          interaction_count INTEGER DEFAULT 0,
          hint_count INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create interactions table
      await this.query(`
        CREATE TABLE IF NOT EXISTS interactions (
          id UUID PRIMARY KEY,
          session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL CHECK (type IN ('question', 'answer', 'hint', 'feedback', 'voice', 'image')),
          content TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          processing_time INTEGER,
          confidence_score DECIMAL(3,2)
        )
      `);

      // Create collaboration sessions table
      await this.query(`
        CREATE TABLE IF NOT EXISTS collaboration_sessions (
          id UUID PRIMARY KEY,
          session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
          tutor_id UUID REFERENCES users(id) ON DELETE SET NULL,
          student_id UUID REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL CHECK (type IN ('live_tutoring', 'peer_learning', 'group_study')),
          status VARCHAR(50) NOT NULL CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
          scheduled_start TIMESTAMP WITH TIME ZONE,
          actual_start TIMESTAMP WITH TIME ZONE,
          end_time TIMESTAMP WITH TIME ZONE,
          room_id VARCHAR(255),
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create analytics events table
      await this.query(`
        CREATE TABLE IF NOT EXISTS analytics_events (
          id UUID PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
          event_type VARCHAR(100) NOT NULL,
          event_data JSONB NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          ip_address INET,
          user_agent TEXT
        )
      `);

      // Create voice interactions table
      await this.query(`
        CREATE TABLE IF NOT EXISTS voice_interactions (
          id UUID PRIMARY KEY,
          interaction_id UUID REFERENCES interactions(id) ON DELETE CASCADE,
          audio_url VARCHAR(500),
          transcript TEXT,
          language VARCHAR(10) DEFAULT 'en',
          confidence_score DECIMAL(3,2),
          processing_duration INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create system logs table
      await this.query(`
        CREATE TABLE IF NOT EXISTS system_logs (
          id UUID PRIMARY KEY,
          level VARCHAR(20) NOT NULL,
          message TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          service VARCHAR(100),
          correlation_id UUID
        )
      `);

      // Create indexes for better performance
      await this.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
      await this.query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
      await this.query(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`);
      await this.query(`CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)`);
      await this.query(`CREATE INDEX IF NOT EXISTS idx_interactions_session_id ON interactions(session_id)`);
      await this.query(`CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(type)`);
      await this.query(`CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_tutor_id ON collaboration_sessions(tutor_id)`);
      await this.query(`CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_student_id ON collaboration_sessions(student_id)`);
      await this.query(`CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id)`);
      await this.query(`CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type)`);
      await this.query(`CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp)`);
      await this.query(`CREATE INDEX IF NOT EXISTS idx_voice_interactions_interaction_id ON voice_interactions(interaction_id)`);
      await this.query(`CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level)`);
      await this.query(`CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp)`);

      logger.info('Database schema initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database schema', { error });
      throw error;
    }
  }

  /**
   * Drop all tables (for testing purposes)
   */
  static async dropSchema(): Promise<void> {
    try {
      logger.warn('Dropping database schema...');

      const tables = [
        'system_logs',
        'voice_interactions',
        'analytics_events',
        'collaboration_sessions',
        'interactions',
        'sessions',
        'user_profiles',
        'users'
      ];

      for (const table of tables) {
        await this.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      }

      logger.warn('Database schema dropped');
    } catch (error) {
      logger.error('Failed to drop database schema', { error });
      throw error;
    }
  }
}

export default DatabaseService;