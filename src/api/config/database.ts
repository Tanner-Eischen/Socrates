import { Pool, PoolConfig } from 'pg';
import { logger } from '../middleware/logger';

// Database configuration interface
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

// Default database configuration
const defaultConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'socrateach',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

// Create database connection pool
export const createDatabasePool = (config: Partial<DatabaseConfig> = {}): Pool => {
  const finalConfig = { ...defaultConfig, ...config };
  
  logger.info('Creating database connection pool', {
    host: finalConfig.host,
    port: finalConfig.port,
    database: finalConfig.database,
    user: finalConfig.user,
    max: finalConfig.max,
    ssl: !!finalConfig.ssl,
  });

  const pool = new Pool(finalConfig);

  // Handle pool events
  pool.on('connect', (client) => {
    logger.debug('New database client connected', {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    });
  });

  pool.on('acquire', (client) => {
    logger.debug('Database client acquired from pool', {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    });
  });

  pool.on('remove', (client) => {
    logger.debug('Database client removed from pool', {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    });
  });

  pool.on('error', (err, client) => {
    logger.error('Database pool error', {
      error: err.message,
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    });
  });

  return pool;
};

// Database schema initialization
export const initializeSchema = async (pool: Pool): Promise<void> => {
  logger.info('Initializing database schema');

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'tutor', 'admin')),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP WITH TIME ZONE
      )
    `);

    // Create user profiles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        display_name VARCHAR(200),
        bio TEXT,
        avatar TEXT,
        preferences JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create problems table
    await client.query(`
      CREATE TABLE IF NOT EXISTS problems (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        difficulty VARCHAR(50) NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
        category VARCHAR(100),
        tags TEXT[],
        estimated_time INTEGER,
        content JSONB DEFAULT '{}',
        solution JSONB DEFAULT '{}',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        problem_id UUID REFERENCES problems(id),
        status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE,
        metadata JSONB DEFAULT '{}'
      )
    `);

    // Create interactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS interactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        input_data JSONB DEFAULT '{}',
        output_data JSONB DEFAULT '{}',
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        processing_time INTEGER,
        metadata JSONB DEFAULT '{}'
      )
    `);

    // Create collaboration sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS collaboration_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
        max_participants INTEGER DEFAULT 10,
        is_public BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP WITH TIME ZONE,
        metadata JSONB DEFAULT '{}'
      )
    `);

    // Create collaboration participants table
    await client.query(`
      CREATE TABLE IF NOT EXISTS collaboration_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL DEFAULT 'participant' CHECK (role IN ('host', 'participant')),
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        left_at TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN NOT NULL DEFAULT true,
        UNIQUE(session_id, user_id)
      )
    `);

    // Create collaboration messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS collaboration_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'voice', 'system')),
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create voice interactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS voice_interactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('speech_to_text', 'text_to_speech')),
        input_data JSONB DEFAULT '{}',
        output_data JSONB DEFAULT '{}',
        processing_time INTEGER,
        confidence DECIMAL(3,2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create analytics events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
        event_type VARCHAR(100) NOT NULL,
        event_data JSONB DEFAULT '{}',
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ip_address INET,
        user_agent TEXT
      )
    `);

    // Create system logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        level VARCHAR(20) NOT NULL CHECK (level IN ('error', 'warn', 'info', 'debug')),
        message TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        correlation_id VARCHAR(100)
      )
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
      
      CREATE INDEX IF NOT EXISTS idx_problems_category ON problems(category);
      CREATE INDEX IF NOT EXISTS idx_problems_difficulty ON problems(difficulty);
      CREATE INDEX IF NOT EXISTS idx_problems_active ON problems(is_active);
      CREATE INDEX IF NOT EXISTS idx_problems_tags ON problems USING GIN(tags);
      
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_problem_id ON sessions(problem_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
      CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
      
      CREATE INDEX IF NOT EXISTS idx_interactions_session_id ON interactions(session_id);
      CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(type);
      CREATE INDEX IF NOT EXISTS idx_interactions_timestamp ON interactions(timestamp);
      
      CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_host_id ON collaboration_sessions(host_id);
      CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_status ON collaboration_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_public ON collaboration_sessions(is_public);
      CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_created_at ON collaboration_sessions(created_at);
      
      CREATE INDEX IF NOT EXISTS idx_collaboration_participants_session_id ON collaboration_participants(session_id);
      CREATE INDEX IF NOT EXISTS idx_collaboration_participants_user_id ON collaboration_participants(user_id);
      CREATE INDEX IF NOT EXISTS idx_collaboration_participants_active ON collaboration_participants(is_active);
      
      CREATE INDEX IF NOT EXISTS idx_collaboration_messages_session_id ON collaboration_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_collaboration_messages_user_id ON collaboration_messages(user_id);
      CREATE INDEX IF NOT EXISTS idx_collaboration_messages_created_at ON collaboration_messages(created_at);
      
      CREATE INDEX IF NOT EXISTS idx_voice_interactions_user_id ON voice_interactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_voice_interactions_session_id ON voice_interactions(session_id);
      CREATE INDEX IF NOT EXISTS idx_voice_interactions_type ON voice_interactions(type);
      CREATE INDEX IF NOT EXISTS idx_voice_interactions_created_at ON voice_interactions(created_at);
      
      CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
      
      CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
      CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_system_logs_correlation_id ON system_logs(correlation_id);
    `);

    // Create updated_at trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create triggers for updated_at columns
    await client.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
        
      DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
      CREATE TRIGGER update_user_profiles_updated_at
        BEFORE UPDATE ON user_profiles
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
        
      DROP TRIGGER IF EXISTS update_problems_updated_at ON problems;
      CREATE TRIGGER update_problems_updated_at
        BEFORE UPDATE ON problems
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query('COMMIT');
    
    logger.info('Database schema initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to initialize database schema', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  } finally {
    client.release();
  }
};

// Seed initial data
export const seedInitialData = async (pool: Pool): Promise<void> => {
  logger.info('Seeding initial data');

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Check if admin user already exists
    const adminCheck = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@socrateach.com']
    );

    if (adminCheck.rows.length === 0) {
      // Create admin user
      const bcrypt = require('bcrypt');
      const adminPassword = await bcrypt.hash('admin123', 10);
      
      const adminResult = await client.query(`
        INSERT INTO users (email, password_hash, role)
        VALUES ($1, $2, $3)
        RETURNING id
      `, ['admin@socrateach.com', adminPassword, 'admin']);

      const adminId = adminResult.rows[0].id;

      // Create admin profile
      await client.query(`
        INSERT INTO user_profiles (user_id, first_name, last_name, display_name, bio)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        adminId,
        'System',
        'Administrator',
        'System Admin',
        'SocraTeach system administrator'
      ]);

      logger.info('Admin user created', { adminId });
    }

    // Check if sample problems exist
    const problemsCheck = await client.query('SELECT COUNT(*) FROM problems');
    const problemCount = parseInt(problemsCheck.rows[0].count);

    if (problemCount === 0) {
      // Create sample problems
      const sampleProblems = [
        {
          title: 'Basic Algebra: Solving Linear Equations',
          description: 'Learn to solve linear equations using the Socratic method. We\'ll guide you through step-by-step reasoning.',
          difficulty: 'beginner',
          category: 'Mathematics',
          tags: ['algebra', 'linear-equations', 'basics'],
          estimatedTime: 20,
          content: {
            problem: 'Solve for x: 2x + 5 = 13',
            hints: [
              'What operation is being performed on x?',
              'How can you isolate the term with x?',
              'What\'s the inverse operation of addition?'
            ],
            steps: [
              'Subtract 5 from both sides',
              'Divide both sides by 2',
              'Verify your answer'
            ]
          }
        },
        {
          title: 'Quadratic Equations: Factoring Method',
          description: 'Master quadratic equations through guided discovery and the Socratic questioning approach.',
          difficulty: 'intermediate',
          category: 'Mathematics',
          tags: ['algebra', 'quadratic', 'factoring'],
          estimatedTime: 35,
          content: {
            problem: 'Solve: x² - 5x + 6 = 0',
            hints: [
              'Can you factor this quadratic expression?',
              'What two numbers multiply to 6 and add to -5?',
              'How does factoring help solve the equation?'
            ],
            steps: [
              'Factor the quadratic expression',
              'Apply the zero product property',
              'Solve for each factor',
              'Check your solutions'
            ]
          }
        },
        {
          title: 'Calculus: Understanding Derivatives',
          description: 'Explore the concept of derivatives through Socratic dialogue and visual reasoning.',
          difficulty: 'advanced',
          category: 'Mathematics',
          tags: ['calculus', 'derivatives', 'limits'],
          estimatedTime: 45,
          content: {
            problem: 'Find the derivative of f(x) = x³ + 2x² - 5x + 1',
            hints: [
              'What is the power rule for derivatives?',
              'How do you handle each term separately?',
              'What happens to constant terms?'
            ],
            steps: [
              'Apply the power rule to each term',
              'Simplify the expression',
              'Verify using the definition of derivative'
            ]
          }
        }
      ];

      for (const problem of sampleProblems) {
        await client.query(`
          INSERT INTO problems (title, description, difficulty, category, tags, estimated_time, content)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          problem.title,
          problem.description,
          problem.difficulty,
          problem.category,
          problem.tags,
          problem.estimatedTime,
          JSON.stringify(problem.content)
        ]);
      }

      logger.info('Sample problems created', { count: sampleProblems.length });
    }

    await client.query('COMMIT');
    
    logger.info('Initial data seeded successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to seed initial data', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  } finally {
    client.release();
  }
};

// Database health check
export const checkDatabaseHealth = async (pool: Pool): Promise<{
  isHealthy: boolean;
  activeConnections: number;
  totalConnections: number;
  idleConnections: number;
  waitingConnections: number;
  lastError?: string;
}> => {
  try {
    const client = await pool.connect();
    
    try {
      // Simple query to test connection
      await client.query('SELECT 1');
      
      return {
        isHealthy: true,
        activeConnections: pool.totalCount - pool.idleCount,
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingConnections: pool.waitingCount,
      };
    } finally {
      client.release();
    }
  } catch (error) {
    return {
      isHealthy: false,
      activeConnections: 0,
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingConnections: pool.waitingCount,
      lastError: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Graceful shutdown
export const closeDatabasePool = async (pool: Pool): Promise<void> => {
  logger.info('Closing database connection pool');
  
  try {
    await pool.end();
    logger.info('Database connection pool closed successfully');
  } catch (error) {
    logger.error('Error closing database connection pool', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

export default {
  createDatabasePool,
  initializeSchema,
  seedInitialData,
  checkDatabaseHealth,
  closeDatabasePool,
};