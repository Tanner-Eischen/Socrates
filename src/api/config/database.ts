import { Pool, PoolConfig } from 'pg';
import { logger } from '../middleware/logger';
import { randomUUID } from 'crypto';

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
  database: process.env.DB_NAME || 'socrates',
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

  // In-memory database fallback for local development
  if (process.env.DB_INMEM === 'true') {
    logger.warn('Using in-memory database (pg-mem) for development');
    // Use require to avoid type issues in TS runtime
    const { newDb } = require('pg-mem');
    const db = newDb({ autoCreateForeignKeyIndices: true });

    // Provide gen_random_uuid() so DEFAULT gen_random_uuid()::text works without pgcrypto
    db.public.registerFunction({
      name: 'gen_random_uuid',
      returns: 'text',
      implementation: () => require('crypto').randomUUID(),
    });

    const adapter = db.adapters.createPg();
    const { Pool: MemPool } = adapter;
    const memPool = new MemPool();
    return memPool as unknown as Pool;
  }

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
    // Try to ensure required extensions exist for ID generation.
    // If this fails (e.g., insufficient privileges), continue gracefully.
    try {
      await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
      logger.info('pgcrypto extension available');
    } catch (extError) {
      logger.warn('pgcrypto extension not available or cannot be created; proceeding without it', {
        error: extError instanceof Error ? extError.message : 'Unknown error',
      });
    }

    await client.query('BEGIN');

    // Create users table (align with existing schema using string IDs)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
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
        user_id VARCHAR(36) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
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

    // Create problems table (use string IDs to match existing users table type)
    await client.query(`
      CREATE TABLE IF NOT EXISTS problems (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        difficulty VARCHAR(50) NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
        category VARCHAR(100),
        tags TEXT[],
        estimated_time INTEGER,
        content JSONB DEFAULT '{}',
        solution JSONB DEFAULT '{}',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_by VARCHAR(36) REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create sessions table (use string IDs for consistency)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        problem_id VARCHAR(36) REFERENCES problems(id),
        status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE,
        metadata JSONB DEFAULT '{}'
      )
    `);

    // Extend sessions schema to include analytics-friendly columns used by AnalyticsService
    await client.query(`
      ALTER TABLE sessions 
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS total_duration INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS interaction_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS hint_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS problem_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS difficulty_level INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS problem_text TEXT
    `);

    // Helpful indexes for analytics queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
      CREATE INDEX IF NOT EXISTS idx_sessions_created_at2 ON sessions(created_at);
      CREATE INDEX IF NOT EXISTS idx_sessions_difficulty_level ON sessions(difficulty_level);
    `);

    // Create interactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS interactions (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        session_id VARCHAR(36) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
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
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        host_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        session_id VARCHAR(36) NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        session_id VARCHAR(36) NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'voice', 'system')),
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create voice interactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS voice_interactions (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_id VARCHAR(36) REFERENCES sessions(id) ON DELETE SET NULL,
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
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
        session_id VARCHAR(36) REFERENCES sessions(id) ON DELETE SET NULL,
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
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        level VARCHAR(20) NOT NULL CHECK (level IN ('error', 'warn', 'info', 'debug')),
        message TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        correlation_id VARCHAR(100)
      )
    `);

    // Create indexes for better performance (skip in pg-mem to avoid unsupported index types)
    try {
      if (process.env.DB_INMEM !== 'true') {
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
          CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
          CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
          CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
          
          CREATE INDEX IF NOT EXISTS idx_problems_category ON problems(category);
          CREATE INDEX IF NOT EXISTS idx_problems_difficulty ON problems(difficulty);
          CREATE INDEX IF NOT EXISTS idx_problems_active ON problems(is_active);
          -- Note: GIN indexes on arrays are skipped in pg-mem mode
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
      } else {
        logger.warn('Skipping index creation: pg-mem does not fully support all index types');
      }
    } catch (indexError) {
      logger.warn('Index creation failed; continuing without indexes', {
        error: indexError instanceof Error ? indexError.message : 'Unknown error',
      });
    }

    // Create updated_at trigger function (skip in pg-mem)
    try {
      if (process.env.DB_INMEM !== 'true') {
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
      } else {
        logger.warn('Skipping trigger creation: not supported in pg-mem');
      }
    } catch (triggerError) {
      logger.warn('Trigger creation failed; continuing without triggers', {
        error: triggerError instanceof Error ? triggerError.message : 'Unknown error',
      });
    }

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
      ['admin@socrates.com']
    );
    // Seed admin user in an isolated savepoint
    await client.query('SAVEPOINT seed_admin');
    try {
      if (adminCheck.rows.length === 0) {
        // Create admin user
        let bcrypt;
        try {
          bcrypt = require('bcrypt');
        } catch (e) {
          bcrypt = require('bcryptjs');
        }
        const adminPassword = await bcrypt.hash('admin123', 10);
        const adminId = require('crypto').randomUUID();
        const adminResult = await client.query(`
          INSERT INTO users (id, email, password_hash, role)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `, [adminId, 'admin@socrates.com', adminPassword, 'admin']);
        
        // Use the returned id to ensure consistency
        const adminIdReturned = adminResult.rows[0].id;

        // Create admin profile
        await client.query(`
          INSERT INTO user_profiles (user_id, first_name, last_name, display_name, bio)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          adminIdReturned,
          'System',
          'Administrator',
          'System Admin',
          'Socrates system administrator'
        ]);

        logger.info('Admin user created', { adminId });
      }
      await client.query('RELEASE SAVEPOINT seed_admin');
    } catch (e: any) {
      await client.query('ROLLBACK TO SAVEPOINT seed_admin');
      logger.warn('Admin seed step failed; continuing', { error: e?.message || e });
    }

    // Tutor user seed in isolated savepoint
    await client.query('SAVEPOINT seed_tutor');
    try {
      const tutorCheck = await client.query(
        'SELECT id FROM users WHERE email = $1',
        ['tutor@socrates.com']
      );

      let tutorId: string | null = tutorCheck.rows[0]?.id || null;
      if (!tutorId) {
        let bcrypt;
        try {
          bcrypt = require('bcrypt');
        } catch (e) {
          bcrypt = require('bcryptjs');
        }
        const tutorPassword = await bcrypt.hash('tutor123', 10);
        const newTutorId = require('crypto').randomUUID();
        const tutorResult = await client.query(`
          INSERT INTO users (id, email, password_hash, role)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `, [newTutorId, 'tutor@socrates.com', tutorPassword, 'tutor']);
        tutorId = tutorResult.rows[0].id;

        await client.query(`
          INSERT INTO user_profiles (user_id, first_name, last_name, display_name, bio)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          tutorId,
          'Ada',
          'Tutor',
          'Tutor Ada',
          'Experienced mathematics tutor'
        ]);

        logger.info('Tutor user created', { tutorId });
      }
      await client.query('RELEASE SAVEPOINT seed_tutor');
    } catch (e: any) {
      await client.query('ROLLBACK TO SAVEPOINT seed_tutor');
      logger.warn('Tutor seed step failed; continuing', { error: e?.message || e });
    }

    // Student demo user seed in isolated savepoint
    await client.query('SAVEPOINT seed_student');
    let studentId: string | null;
    try {
      const studentCheck = await client.query(
        'SELECT id FROM users WHERE email = $1',
        ['test@example.com']
      );
      studentId = studentCheck.rows[0]?.id || null;
      if (!studentId) {
        let bcrypt;
        try {
          bcrypt = require('bcrypt');
        } catch (e) {
          bcrypt = require('bcryptjs');
        }
        const studentPassword = await bcrypt.hash('password123', 10);
        const newStudentId = require('crypto').randomUUID();
        const studentResult = await client.query(`
          INSERT INTO users (id, email, password_hash, role)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `, [newStudentId, 'test@example.com', studentPassword, 'student']);
        studentId = studentResult.rows[0].id;

        await client.query(`
          INSERT INTO user_profiles (user_id, first_name, last_name, display_name, bio)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          studentId,
          'Test',
          'User',
          'Demo Student',
          'Demo account for development'
        ]);

        logger.info('Student user created', { studentId });
      }
      await client.query('RELEASE SAVEPOINT seed_student');
    } catch (e: any) {
      await client.query('ROLLBACK TO SAVEPOINT seed_student');
      logger.warn('Student seed step failed; continuing', { error: e?.message || e });
      studentId = null;
    }

    // Development user seed for local testing
    await client.query('SAVEPOINT seed_dev');
    try {
      const devEmail = 'dev@example.com';
      const devId = 'dev-user-123';
      const devCheck = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [devEmail]
      );
      if (devCheck.rows.length === 0) {
        let bcrypt;
        try { bcrypt = require('bcrypt'); } catch { bcrypt = require('bcryptjs'); }
        const devPassword = await bcrypt.hash('dev123', 10);
        await client.query(`
          INSERT INTO users (id, email, password_hash, role)
          VALUES ($1, $2, $3, $4)
        `, [devId, devEmail, devPassword, 'student']);
        await client.query(`
          INSERT INTO user_profiles (user_id, first_name, last_name, display_name, bio)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          devId,
          'Dev',
          'User',
          'Dev User',
          'Local development user account'
        ]);
        logger.info('Development user created', { devId, devEmail });
      }
      await client.query('RELEASE SAVEPOINT seed_dev');
    } catch (e: any) {
      await client.query('ROLLBACK TO SAVEPOINT seed_dev');
      logger.warn('Dev user seed step failed; continuing', { error: e?.message || e });
    }

    // Check if sample problems exist; if table is missing in pg-mem, create it inline
    let problemCount = 0;
    await client.query('SAVEPOINT problems_check');
    try {
      const problemsCheck = await client.query('SELECT COUNT(*) FROM problems');
      problemCount = parseInt(problemsCheck.rows[0].count);
      await client.query('RELEASE SAVEPOINT problems_check');
    } catch (e: any) {
      await client.query('ROLLBACK TO SAVEPOINT problems_check');
      const code = e?.code || e?.message;
      if (code === '42P01' || (typeof code === 'string' && code.includes('relation') && code.includes('does not exist'))) {
        // Create minimal problems table schema to proceed with seeding
        await client.query(`
          CREATE TABLE IF NOT EXISTS problems (
            id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            difficulty VARCHAR(50) NOT NULL,
            category VARCHAR(100),
            tags TEXT[],
            estimated_time INTEGER,
            content JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )
        `);
        problemCount = 0;
        logger.warn('Problems table was missing during seed; created minimal schema inline');
      } else {
        throw e;
      }
    }

    if (problemCount === 0) {
      await client.query('SAVEPOINT seed_problems');
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

      try {
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
        await client.query('RELEASE SAVEPOINT seed_problems');
        logger.info('Sample problems created', { count: sampleProblems.length });
      } catch (e: any) {
        await client.query('ROLLBACK TO SAVEPOINT seed_problems');
        logger.warn('Problem seeding failed; continuing without sample problems', { error: e?.message || e });
      }
    }

    // Seed sample sessions for the demo student
    await client.query('SAVEPOINT seed_sessions_top');
    if (studentId) {
      const problems = await client.query(`
        SELECT id, title, description, difficulty, content
        FROM problems
        ORDER BY created_at ASC
      `);

      const now = new Date();
      const toLevel = (d: string) => d === 'beginner' ? 1 : d === 'intermediate' ? 2 : 3;
      const toType = (title: string) => {
        if (title.toLowerCase().includes('algebra')) return 'algebra';
        if (title.toLowerCase().includes('quadratic')) return 'algebra';
        if (title.toLowerCase().includes('calculus')) return 'calculus';
        return 'math';
      };

      // Ensure studentId is a UUID; if not, look it up by email and optionally username
      if (!/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(String(studentId))) {
        let sidLookup = await client.query(`SELECT id FROM users WHERE email = $1 LIMIT 1`, ['student@example.com']);
        if (!sidLookup.rows[0]?.id) {
          try {
            sidLookup = await client.query(`SELECT id FROM users WHERE username = $1 LIMIT 1`, ['student']);
          } catch (e: any) {
            // Some schemas may not have a username column; ignore if missing
            if (e?.code !== '42703') throw e;
          }
        }
        if (sidLookup.rows[0]?.id) {
          studentId = sidLookup.rows[0].id;
        }
      }

      try {
      for (let i = 0; i < problems.rows.length; i++) {
        const p = problems.rows[i];
        const start = new Date(now.getTime() - (i + 1) * 60 * 60 * 1000);
        const end = new Date(start.getTime() + (20 + i * 10) * 60 * 1000);
        const interactionCount = 5 + i * 2;
        const hintCount = i; 
        const problemText = p.content?.problem || p.description || p.title;

        // Insert session with robust fallbacks for pg-mem missing columns
        await client.query('SAVEPOINT seed_session');
        let sessionRes;
        try {
          const sessionId = randomUUID();
          sessionRes = await client.query(`
            INSERT INTO sessions (
              id, user_id, problem_id, status,
              started_at, completed_at, metadata,
              start_time, end_time, total_duration,
              interaction_count, hint_count,
              problem_type, difficulty_level, problem_text
            )
            VALUES (
              $1, $2, $3, $4,
              $5, $6, $7,
              $8, $9, $10,
              $11, $12,
              $13, $14, $15
            )
            RETURNING id
          `, [
            sessionId,
            studentId,
            p.id,
            'completed',
            start,
            end,
            JSON.stringify({ source: 'seed', notes: 'demo session' }),
            start,
            end,
            Math.floor((end.getTime() - start.getTime()) / 1000),
            interactionCount,
            hintCount,
            toType(p.title),
            toLevel(p.difficulty),
            problemText
          ]);
          await client.query('RELEASE SAVEPOINT seed_session');
        } catch (e: any) {
          // If a column is missing (e.g., started_at), fallback to a minimal insert
          await client.query('ROLLBACK TO SAVEPOINT seed_session');
          const code = e?.code;
          if (code === '42703') {
            const sessionId = randomUUID();
            sessionRes = await client.query(`
              INSERT INTO sessions (
                id, user_id, problem_id, status,
                start_time, end_time, total_duration,
                problem_text, problem_type, difficulty_level
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              RETURNING id
            `, [
              sessionId,
              studentId,
              p.id,
              'completed',
              start,
              end,
              Math.floor((end.getTime() - start.getTime()) / 1000),
              problemText,
              toType(p.title),
              toLevel(p.difficulty)
            ]);
          } else {
            throw e;
          }
        }

        const sessionId = sessionRes.rows[0].id;

        // Seed a few interactions per session
        for (let j = 0; j < interactionCount; j++) {
          const ts = new Date(start.getTime() + j * 3 * 60 * 1000);
          await client.query('SAVEPOINT seed_interaction');
          try {
            // Prefer schema with user_id; fall back if column missing
            await client.query(`
              INSERT INTO interactions (
                id, session_id, user_id, type, input_data, output_data, timestamp, metadata
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
              randomUUID(),
              sessionId,
              studentId,
              j % 3 === 0 ? 'question' : j % 3 === 1 ? 'answer' : 'hint',
              JSON.stringify({ text: '...'}),
              JSON.stringify({ text: '...'}),
              ts,
              JSON.stringify({ source: 'seed' })
            ]);
            await client.query('RELEASE SAVEPOINT seed_interaction');
          } catch (e: any) {
            await client.query('ROLLBACK TO SAVEPOINT seed_interaction');
            if (e?.code === '42703') {
              // Fallback when user_id or input/output columns are missing
              try {
                await client.query(`
                  INSERT INTO interactions (
                    id, session_id, type, input_data, output_data, timestamp, metadata
                  )
                  VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                  randomUUID(),
                  sessionId,
                  j % 3 === 0 ? 'question' : j % 3 === 1 ? 'answer' : 'hint',
                  JSON.stringify({ text: '...'}),
                  JSON.stringify({ text: '...'}),
                  ts,
                  JSON.stringify({ source: 'seed' })
                ]);
              } catch (e2: any) {
                // Minimal fallback without input/output
                if (e2?.code === '42703' || e2?.code === '23502') {
                  await client.query(`
                    INSERT INTO interactions (
                      id, session_id, type, timestamp, metadata
                    )
                    VALUES ($1, $2, $3, $4, $5)
                  `, [
                    randomUUID(),
                    sessionId,
                    j % 3 === 0 ? 'question' : j % 3 === 1 ? 'answer' : 'hint',
                    ts,
                    JSON.stringify({ source: 'seed' })
                  ]);
                } else {
                  throw e2;
                }
              }
            } else if (e?.code === '23502') {
              // NOT NULL violation, ensure user_id is provided
              await client.query(`
                INSERT INTO interactions (
                  id, session_id, user_id, type, timestamp, metadata
                )
                VALUES ($1, $2, $3, $4, $5, $6)
              `, [
                randomUUID(),
                sessionId,
                studentId,
                j % 3 === 0 ? 'question' : j % 3 === 1 ? 'answer' : 'hint',
                ts,
                JSON.stringify({ source: 'seed' })
              ]);
            } else {
              throw e;
            }
          }
        }

        // Seed basic analytics events
        await client.query(`
          INSERT INTO analytics_events (user_id, session_id, event_type, event_data, timestamp)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          studentId,
          sessionId,
          'session_completed',
          JSON.stringify({ difficulty: p.difficulty, durationSec: Math.floor((end.getTime() - start.getTime()) / 1000) }),
          end
        ]);

        await client.query(`
          INSERT INTO analytics_events (user_id, event_type, event_data, timestamp)
          VALUES ($1, $2, $3, $4)
        `, [
          studentId,
          'api_request',
          JSON.stringify({ responseTime: 120 + i * 25 }),
          new Date(start.getTime() + 5 * 60 * 1000)
        ]);
      }

      logger.info('Demo sessions and analytics seeded for student', { studentId, count: problems.rows.length });
      await client.query('RELEASE SAVEPOINT seed_sessions_top');
      } catch (e: any) {
        await client.query('ROLLBACK TO SAVEPOINT seed_sessions_top');
        logger.warn('Session seeding failed; continuing without demo sessions', { error: e?.message || e });
      }
    }

    await client.query('COMMIT');
    logger.info('Initial data seeded successfully');
  } catch (error) {
    // Rollback the outer transaction but do not throw to avoid degraded mode
    try { await client.query('ROLLBACK'); } catch {}
    logger.error('Seed encountered errors; proceeding in partial mode', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
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