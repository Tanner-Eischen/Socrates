import dotenv from 'dotenv';
import path from 'path';
import { logger } from '../middleware/logger';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Environment types
export type Environment = 'development' | 'production' | 'test';

// Configuration interface
interface Config {
  // Environment
  NODE_ENV: Environment;
  PORT: number;
  HOST: string;
  
  // Database
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_MAX_CONNECTIONS: number;
  DB_IDLE_TIMEOUT: number;
  DB_CONNECTION_TIMEOUT: number;
  DB_SSL: boolean;
  
  // Redis
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
  REDIS_DB: number;
  REDIS_KEY_PREFIX: string;
  
  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;
  
  // OpenAI
  OPENAI_API_KEY: string;
  OPENAI_ORGANIZATION?: string;
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  RATE_LIMIT_AUTH_MAX: number;
  RATE_LIMIT_UPLOAD_MAX: number;
  RATE_LIMIT_VOICE_MAX: number;
  RATE_LIMIT_ANALYTICS_MAX: number;
  
  // File Upload
  MAX_FILE_SIZE: number;
  UPLOAD_DIR: string;
  
  // Logging
  LOG_LEVEL: string;
  LOG_FILE: string;
  LOG_MAX_SIZE: string;
  LOG_MAX_FILES: string;
  
  // CORS
  CORS_ORIGIN: string | string[];
  CORS_CREDENTIALS: boolean;
  
  // Security
  BCRYPT_ROUNDS: number;
  SESSION_SECRET: string;
  COOKIE_SECURE: boolean;
  COOKIE_HTTP_ONLY: boolean;
  COOKIE_SAME_SITE: 'strict' | 'lax' | 'none';
  
  // WebSocket
  WS_HEARTBEAT_INTERVAL: number;
  WS_CONNECTION_TIMEOUT: number;
  
  // Analytics
  ANALYTICS_BATCH_SIZE: number;
  ANALYTICS_FLUSH_INTERVAL: number;
  
  // Monitoring
  HEALTH_CHECK_INTERVAL: number;
  METRICS_COLLECTION_INTERVAL: number;
}

// Default configuration values
const defaultConfig: Partial<Config> = {
  NODE_ENV: 'development',
  PORT: 3333,
  HOST: '0.0.0.0',
  
  DB_HOST: 'localhost',
  DB_PORT: 5432,
  DB_NAME: 'socrates',
  DB_USER: 'postgres',
  DB_PASSWORD: 'password',
  DB_MAX_CONNECTIONS: 20,
  DB_IDLE_TIMEOUT: 30000,
  DB_CONNECTION_TIMEOUT: 10000,
  DB_SSL: false,
  
  REDIS_HOST: 'localhost',
  REDIS_PORT: 6379,
  REDIS_DB: 0,
  REDIS_KEY_PREFIX: 'socrates:',
  
  JWT_EXPIRES_IN: '1h',
  JWT_REFRESH_EXPIRES_IN: '7d',
  
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  RATE_LIMIT_AUTH_MAX: 5,
  RATE_LIMIT_UPLOAD_MAX: 10,
  RATE_LIMIT_VOICE_MAX: 20,
  RATE_LIMIT_ANALYTICS_MAX: 50,
  
  MAX_FILE_SIZE: 25 * 1024 * 1024, // 25MB
  UPLOAD_DIR: './uploads',
  
  LOG_LEVEL: 'info',
  LOG_FILE: './logs/app.log',
  LOG_MAX_SIZE: '10m',
  LOG_MAX_FILES: '5',
  
  CORS_ORIGIN: '*',
  CORS_CREDENTIALS: true,
  
  BCRYPT_ROUNDS: 10,
  COOKIE_SECURE: false,
  COOKIE_HTTP_ONLY: true,
  COOKIE_SAME_SITE: 'lax',
  
  WS_HEARTBEAT_INTERVAL: 30000, // 30 seconds
  WS_CONNECTION_TIMEOUT: 60000, // 1 minute
  
  ANALYTICS_BATCH_SIZE: 100,
  ANALYTICS_FLUSH_INTERVAL: 5000, // 5 seconds
  
  HEALTH_CHECK_INTERVAL: 30000, // 30 seconds
  METRICS_COLLECTION_INTERVAL: 60000, // 1 minute
};

// Parse environment variable with type conversion
const parseEnvVar = <T>(
  key: string,
  defaultValue: T,
  parser?: (value: string) => T
): T => {
  const value = process.env[key];
  
  if (value === undefined) {
    return defaultValue;
  }
  
  if (parser) {
    try {
      return parser(value);
    } catch (error) {
      logger.warn(`Failed to parse environment variable ${key}`, {
        value,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return defaultValue;
    }
  }
  
  return value as unknown as T;
};

// Parse boolean from string
const parseBoolean = (value: string): boolean => {
  return value.toLowerCase() === 'true' || value === '1';
};

// Parse number from string
const parseNumber = (value: string): number => {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid number: ${value}`);
  }
  return parsed;
};

// Parse JSON from string
const parseJSON = <T>(value: string): T => {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Invalid JSON: ${value}`);
  }
};

// Parse CORS origin
const parseCorsOrigin = (value: string): string | string[] => {
  if (value === '*') {
    return '*';
  }
  
  try {
    // Try to parse as JSON array
    return JSON.parse(value);
  } catch {
    // Split by comma if not JSON
    return value.split(',').map(origin => origin.trim());
  }
};

// Build configuration object
export const config: Config = {
  NODE_ENV: parseEnvVar('NODE_ENV', defaultConfig.NODE_ENV!) as Environment,
  PORT: parseEnvVar('PORT', defaultConfig.PORT!, parseNumber),
  HOST: parseEnvVar('HOST', defaultConfig.HOST!),
  
  DB_HOST: parseEnvVar('DB_HOST', defaultConfig.DB_HOST!),
  DB_PORT: parseEnvVar('DB_PORT', defaultConfig.DB_PORT!, parseNumber),
  DB_NAME: parseEnvVar('DB_NAME', defaultConfig.DB_NAME!),
  DB_USER: parseEnvVar('DB_USER', defaultConfig.DB_USER!),
  DB_PASSWORD: parseEnvVar('DB_PASSWORD', defaultConfig.DB_PASSWORD!),
  DB_MAX_CONNECTIONS: parseEnvVar('DB_MAX_CONNECTIONS', defaultConfig.DB_MAX_CONNECTIONS!, parseNumber),
  DB_IDLE_TIMEOUT: parseEnvVar('DB_IDLE_TIMEOUT', defaultConfig.DB_IDLE_TIMEOUT!, parseNumber),
  DB_CONNECTION_TIMEOUT: parseEnvVar('DB_CONNECTION_TIMEOUT', defaultConfig.DB_CONNECTION_TIMEOUT!, parseNumber),
  DB_SSL: parseEnvVar('DB_SSL', defaultConfig.DB_SSL!, parseBoolean),
  
  REDIS_HOST: parseEnvVar('REDIS_HOST', defaultConfig.REDIS_HOST!),
  REDIS_PORT: parseEnvVar('REDIS_PORT', defaultConfig.REDIS_PORT!, parseNumber),
  REDIS_PASSWORD: parseEnvVar('REDIS_PASSWORD', undefined),
  REDIS_DB: parseEnvVar('REDIS_DB', defaultConfig.REDIS_DB!, parseNumber),
  REDIS_KEY_PREFIX: parseEnvVar('REDIS_KEY_PREFIX', defaultConfig.REDIS_KEY_PREFIX!),
  
  JWT_SECRET: parseEnvVar('JWT_SECRET', 'your-super-secret-jwt-key-change-this-in-production'),
  JWT_EXPIRES_IN: parseEnvVar('JWT_EXPIRES_IN', defaultConfig.JWT_EXPIRES_IN!),
  JWT_REFRESH_SECRET: parseEnvVar('JWT_REFRESH_SECRET', 'your-super-secret-refresh-key-change-this-in-production'),
  JWT_REFRESH_EXPIRES_IN: parseEnvVar('JWT_REFRESH_EXPIRES_IN', defaultConfig.JWT_REFRESH_EXPIRES_IN!),
  
  OPENAI_API_KEY: parseEnvVar('OPENAI_API_KEY', ''),
  OPENAI_ORGANIZATION: parseEnvVar('OPENAI_ORGANIZATION', undefined),
  
  RATE_LIMIT_WINDOW_MS: parseEnvVar('RATE_LIMIT_WINDOW_MS', defaultConfig.RATE_LIMIT_WINDOW_MS!, parseNumber),
  RATE_LIMIT_MAX_REQUESTS: parseEnvVar('RATE_LIMIT_MAX_REQUESTS', defaultConfig.RATE_LIMIT_MAX_REQUESTS!, parseNumber),
  RATE_LIMIT_AUTH_MAX: parseEnvVar('RATE_LIMIT_AUTH_MAX', defaultConfig.RATE_LIMIT_AUTH_MAX!, parseNumber),
  RATE_LIMIT_UPLOAD_MAX: parseEnvVar('RATE_LIMIT_UPLOAD_MAX', defaultConfig.RATE_LIMIT_UPLOAD_MAX!, parseNumber),
  RATE_LIMIT_VOICE_MAX: parseEnvVar('RATE_LIMIT_VOICE_MAX', defaultConfig.RATE_LIMIT_VOICE_MAX!, parseNumber),
  RATE_LIMIT_ANALYTICS_MAX: parseEnvVar('RATE_LIMIT_ANALYTICS_MAX', defaultConfig.RATE_LIMIT_ANALYTICS_MAX!, parseNumber),
  
  MAX_FILE_SIZE: parseEnvVar('MAX_FILE_SIZE', defaultConfig.MAX_FILE_SIZE!, parseNumber),
  UPLOAD_DIR: parseEnvVar('UPLOAD_DIR', defaultConfig.UPLOAD_DIR!),
  
  LOG_LEVEL: parseEnvVar('LOG_LEVEL', defaultConfig.LOG_LEVEL!),
  LOG_FILE: parseEnvVar('LOG_FILE', defaultConfig.LOG_FILE!),
  LOG_MAX_SIZE: parseEnvVar('LOG_MAX_SIZE', defaultConfig.LOG_MAX_SIZE!),
  LOG_MAX_FILES: parseEnvVar('LOG_MAX_FILES', defaultConfig.LOG_MAX_FILES!),
  
  CORS_ORIGIN: parseEnvVar('CORS_ORIGIN', defaultConfig.CORS_ORIGIN!, parseCorsOrigin),
  CORS_CREDENTIALS: parseEnvVar('CORS_CREDENTIALS', defaultConfig.CORS_CREDENTIALS!, parseBoolean),
  
  BCRYPT_ROUNDS: parseEnvVar('BCRYPT_ROUNDS', defaultConfig.BCRYPT_ROUNDS!, parseNumber),
  SESSION_SECRET: parseEnvVar('SESSION_SECRET', 'your-super-secret-session-key-change-this-in-production'),
  COOKIE_SECURE: parseEnvVar('COOKIE_SECURE', defaultConfig.COOKIE_SECURE!, parseBoolean),
  COOKIE_HTTP_ONLY: parseEnvVar('COOKIE_HTTP_ONLY', defaultConfig.COOKIE_HTTP_ONLY!, parseBoolean),
  COOKIE_SAME_SITE: parseEnvVar('COOKIE_SAME_SITE', defaultConfig.COOKIE_SAME_SITE!) as 'strict' | 'lax' | 'none',
  
  WS_HEARTBEAT_INTERVAL: parseEnvVar('WS_HEARTBEAT_INTERVAL', defaultConfig.WS_HEARTBEAT_INTERVAL!, parseNumber),
  WS_CONNECTION_TIMEOUT: parseEnvVar('WS_CONNECTION_TIMEOUT', defaultConfig.WS_CONNECTION_TIMEOUT!, parseNumber),
  
  ANALYTICS_BATCH_SIZE: parseEnvVar('ANALYTICS_BATCH_SIZE', defaultConfig.ANALYTICS_BATCH_SIZE!, parseNumber),
  ANALYTICS_FLUSH_INTERVAL: parseEnvVar('ANALYTICS_FLUSH_INTERVAL', defaultConfig.ANALYTICS_FLUSH_INTERVAL!, parseNumber),
  
  HEALTH_CHECK_INTERVAL: parseEnvVar('HEALTH_CHECK_INTERVAL', defaultConfig.HEALTH_CHECK_INTERVAL!, parseNumber),
  METRICS_COLLECTION_INTERVAL: parseEnvVar('METRICS_COLLECTION_INTERVAL', defaultConfig.METRICS_COLLECTION_INTERVAL!, parseNumber),
};

// Validate required configuration
const validateConfig = (): void => {
  const requiredVars: (keyof Config)[] = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'SESSION_SECRET',
  ];
  
  const missingVars: string[] = [];
  
  for (const varName of requiredVars) {
    if (!config[varName] || config[varName] === '') {
      missingVars.push(varName);
    }
  }
  
  // Check for default secrets in production
  if (config.NODE_ENV === 'production') {
    const defaultSecrets = [
      { key: 'JWT_SECRET', value: 'your-super-secret-jwt-key-change-this-in-production' },
      { key: 'JWT_REFRESH_SECRET', value: 'your-super-secret-refresh-key-change-this-in-production' },
      { key: 'SESSION_SECRET', value: 'your-super-secret-session-key-change-this-in-production' },
    ];
    
    for (const secret of defaultSecrets) {
      if (config[secret.key as keyof Config] === secret.value) {
        missingVars.push(`${secret.key} (using default value in production)`);
      }
    }
  }
  
  // Warn about missing OpenAI API key
  if (!config.OPENAI_API_KEY) {
    logger.warn('OPENAI_API_KEY not configured - voice features will not work');
  }
  
  if (missingVars.length > 0) {
    const message = `Missing or invalid required environment variables: ${missingVars.join(', ')}`;
    logger.error(message);
    throw new Error(message);
  }
  
  logger.info('Configuration validated successfully', {
    environment: config.NODE_ENV,
    port: config.PORT,
    database: `${config.DB_HOST}:${config.DB_PORT}/${config.DB_NAME}`,
    redis: `${config.REDIS_HOST}:${config.REDIS_PORT}/${config.REDIS_DB}`,
    logLevel: config.LOG_LEVEL,
  });
};

// Get configuration for specific environment
export const getConfig = (): Config => {
  return config;
};

// Check if running in development mode
export const isDevelopment = (): boolean => {
  return config.NODE_ENV === 'development';
};

// Check if running in production mode
export const isProduction = (): boolean => {
  return config.NODE_ENV === 'production';
};

// Check if running in test mode
export const isTest = (): boolean => {
  return config.NODE_ENV === 'test';
};

// Get database connection string
export const getDatabaseUrl = (): string => {
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = config;
  return `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
};

// Get Redis connection string
export const getRedisUrl = (): string => {
  const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB } = config;
  const auth = REDIS_PASSWORD ? `:${REDIS_PASSWORD}@` : '';
  return `redis://${auth}${REDIS_HOST}:${REDIS_PORT}/${REDIS_DB}`;
};

// Create .env template
export const createEnvTemplate = (): string => {
  return `# Socrates Environment Configuration

# Environment
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=socrates
DB_USER=postgres
DB_PASSWORD=password
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=10000
DB_SSL=false

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=socrates:

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_REFRESH_EXPIRES_IN=7d

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_ORGANIZATION=your-openai-organization-id

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_AUTH_MAX=5
RATE_LIMIT_UPLOAD_MAX=10
RATE_LIMIT_VOICE_MAX=20
RATE_LIMIT_ANALYTICS_MAX=50

# File Upload
MAX_FILE_SIZE=26214400
UPLOAD_DIR=./uploads

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5

# CORS
CORS_ORIGIN=*
CORS_CREDENTIALS=true

# Security
BCRYPT_ROUNDS=10
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
COOKIE_SECURE=false
COOKIE_HTTP_ONLY=true
COOKIE_SAME_SITE=lax

# WebSocket
WS_HEARTBEAT_INTERVAL=30000
WS_CONNECTION_TIMEOUT=60000

# Analytics
ANALYTICS_BATCH_SIZE=100
ANALYTICS_FLUSH_INTERVAL=5000

# Monitoring
HEALTH_CHECK_INTERVAL=30000
METRICS_COLLECTION_INTERVAL=60000
`;
};

// Initialize and validate configuration
validateConfig();

export default config;