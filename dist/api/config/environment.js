"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEnvTemplate = exports.getRedisUrl = exports.getDatabaseUrl = exports.isTest = exports.isProduction = exports.isDevelopment = exports.getConfig = exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../middleware/logger");
// Load environment variables from .env file
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
// Default configuration values
const defaultConfig = {
    NODE_ENV: 'development',
    PORT: 3333,
    HOST: '0.0.0.0',
    DB_HOST: 'localhost',
    DB_PORT: 5432,
    DB_NAME: 'socrateach',
    DB_USER: 'postgres',
    DB_PASSWORD: 'password',
    DB_MAX_CONNECTIONS: 20,
    DB_IDLE_TIMEOUT: 30000,
    DB_CONNECTION_TIMEOUT: 10000,
    DB_SSL: false,
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    REDIS_DB: 0,
    REDIS_KEY_PREFIX: 'socrateach:',
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
const parseEnvVar = (key, defaultValue, parser) => {
    const value = process.env[key];
    if (value === undefined) {
        return defaultValue;
    }
    if (parser) {
        try {
            return parser(value);
        }
        catch (error) {
            logger_1.logger.warn(`Failed to parse environment variable ${key}`, {
                value,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return defaultValue;
        }
    }
    return value;
};
// Parse boolean from string
const parseBoolean = (value) => {
    return value.toLowerCase() === 'true' || value === '1';
};
// Parse number from string
const parseNumber = (value) => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
        throw new Error(`Invalid number: ${value}`);
    }
    return parsed;
};
// Parse JSON from string
const parseJSON = (value) => {
    try {
        return JSON.parse(value);
    }
    catch (error) {
        throw new Error(`Invalid JSON: ${value}`);
    }
};
// Parse CORS origin
const parseCorsOrigin = (value) => {
    if (value === '*') {
        return '*';
    }
    try {
        // Try to parse as JSON array
        return JSON.parse(value);
    }
    catch {
        // Split by comma if not JSON
        return value.split(',').map(origin => origin.trim());
    }
};
// Build configuration object
exports.config = {
    NODE_ENV: parseEnvVar('NODE_ENV', defaultConfig.NODE_ENV),
    PORT: parseEnvVar('PORT', defaultConfig.PORT, parseNumber),
    HOST: parseEnvVar('HOST', defaultConfig.HOST),
    DB_HOST: parseEnvVar('DB_HOST', defaultConfig.DB_HOST),
    DB_PORT: parseEnvVar('DB_PORT', defaultConfig.DB_PORT, parseNumber),
    DB_NAME: parseEnvVar('DB_NAME', defaultConfig.DB_NAME),
    DB_USER: parseEnvVar('DB_USER', defaultConfig.DB_USER),
    DB_PASSWORD: parseEnvVar('DB_PASSWORD', defaultConfig.DB_PASSWORD),
    DB_MAX_CONNECTIONS: parseEnvVar('DB_MAX_CONNECTIONS', defaultConfig.DB_MAX_CONNECTIONS, parseNumber),
    DB_IDLE_TIMEOUT: parseEnvVar('DB_IDLE_TIMEOUT', defaultConfig.DB_IDLE_TIMEOUT, parseNumber),
    DB_CONNECTION_TIMEOUT: parseEnvVar('DB_CONNECTION_TIMEOUT', defaultConfig.DB_CONNECTION_TIMEOUT, parseNumber),
    DB_SSL: parseEnvVar('DB_SSL', defaultConfig.DB_SSL, parseBoolean),
    REDIS_HOST: parseEnvVar('REDIS_HOST', defaultConfig.REDIS_HOST),
    REDIS_PORT: parseEnvVar('REDIS_PORT', defaultConfig.REDIS_PORT, parseNumber),
    REDIS_PASSWORD: parseEnvVar('REDIS_PASSWORD', undefined),
    REDIS_DB: parseEnvVar('REDIS_DB', defaultConfig.REDIS_DB, parseNumber),
    REDIS_KEY_PREFIX: parseEnvVar('REDIS_KEY_PREFIX', defaultConfig.REDIS_KEY_PREFIX),
    JWT_SECRET: parseEnvVar('JWT_SECRET', 'your-super-secret-jwt-key-change-this-in-production'),
    JWT_EXPIRES_IN: parseEnvVar('JWT_EXPIRES_IN', defaultConfig.JWT_EXPIRES_IN),
    JWT_REFRESH_SECRET: parseEnvVar('JWT_REFRESH_SECRET', 'your-super-secret-refresh-key-change-this-in-production'),
    JWT_REFRESH_EXPIRES_IN: parseEnvVar('JWT_REFRESH_EXPIRES_IN', defaultConfig.JWT_REFRESH_EXPIRES_IN),
    OPENAI_API_KEY: parseEnvVar('OPENAI_API_KEY', ''),
    OPENAI_ORGANIZATION: parseEnvVar('OPENAI_ORGANIZATION', undefined),
    RATE_LIMIT_WINDOW_MS: parseEnvVar('RATE_LIMIT_WINDOW_MS', defaultConfig.RATE_LIMIT_WINDOW_MS, parseNumber),
    RATE_LIMIT_MAX_REQUESTS: parseEnvVar('RATE_LIMIT_MAX_REQUESTS', defaultConfig.RATE_LIMIT_MAX_REQUESTS, parseNumber),
    RATE_LIMIT_AUTH_MAX: parseEnvVar('RATE_LIMIT_AUTH_MAX', defaultConfig.RATE_LIMIT_AUTH_MAX, parseNumber),
    RATE_LIMIT_UPLOAD_MAX: parseEnvVar('RATE_LIMIT_UPLOAD_MAX', defaultConfig.RATE_LIMIT_UPLOAD_MAX, parseNumber),
    RATE_LIMIT_VOICE_MAX: parseEnvVar('RATE_LIMIT_VOICE_MAX', defaultConfig.RATE_LIMIT_VOICE_MAX, parseNumber),
    RATE_LIMIT_ANALYTICS_MAX: parseEnvVar('RATE_LIMIT_ANALYTICS_MAX', defaultConfig.RATE_LIMIT_ANALYTICS_MAX, parseNumber),
    MAX_FILE_SIZE: parseEnvVar('MAX_FILE_SIZE', defaultConfig.MAX_FILE_SIZE, parseNumber),
    UPLOAD_DIR: parseEnvVar('UPLOAD_DIR', defaultConfig.UPLOAD_DIR),
    LOG_LEVEL: parseEnvVar('LOG_LEVEL', defaultConfig.LOG_LEVEL),
    LOG_FILE: parseEnvVar('LOG_FILE', defaultConfig.LOG_FILE),
    LOG_MAX_SIZE: parseEnvVar('LOG_MAX_SIZE', defaultConfig.LOG_MAX_SIZE),
    LOG_MAX_FILES: parseEnvVar('LOG_MAX_FILES', defaultConfig.LOG_MAX_FILES),
    CORS_ORIGIN: parseEnvVar('CORS_ORIGIN', defaultConfig.CORS_ORIGIN, parseCorsOrigin),
    CORS_CREDENTIALS: parseEnvVar('CORS_CREDENTIALS', defaultConfig.CORS_CREDENTIALS, parseBoolean),
    BCRYPT_ROUNDS: parseEnvVar('BCRYPT_ROUNDS', defaultConfig.BCRYPT_ROUNDS, parseNumber),
    SESSION_SECRET: parseEnvVar('SESSION_SECRET', 'your-super-secret-session-key-change-this-in-production'),
    COOKIE_SECURE: parseEnvVar('COOKIE_SECURE', defaultConfig.COOKIE_SECURE, parseBoolean),
    COOKIE_HTTP_ONLY: parseEnvVar('COOKIE_HTTP_ONLY', defaultConfig.COOKIE_HTTP_ONLY, parseBoolean),
    COOKIE_SAME_SITE: parseEnvVar('COOKIE_SAME_SITE', defaultConfig.COOKIE_SAME_SITE),
    WS_HEARTBEAT_INTERVAL: parseEnvVar('WS_HEARTBEAT_INTERVAL', defaultConfig.WS_HEARTBEAT_INTERVAL, parseNumber),
    WS_CONNECTION_TIMEOUT: parseEnvVar('WS_CONNECTION_TIMEOUT', defaultConfig.WS_CONNECTION_TIMEOUT, parseNumber),
    ANALYTICS_BATCH_SIZE: parseEnvVar('ANALYTICS_BATCH_SIZE', defaultConfig.ANALYTICS_BATCH_SIZE, parseNumber),
    ANALYTICS_FLUSH_INTERVAL: parseEnvVar('ANALYTICS_FLUSH_INTERVAL', defaultConfig.ANALYTICS_FLUSH_INTERVAL, parseNumber),
    HEALTH_CHECK_INTERVAL: parseEnvVar('HEALTH_CHECK_INTERVAL', defaultConfig.HEALTH_CHECK_INTERVAL, parseNumber),
    METRICS_COLLECTION_INTERVAL: parseEnvVar('METRICS_COLLECTION_INTERVAL', defaultConfig.METRICS_COLLECTION_INTERVAL, parseNumber),
};
// Validate required configuration
const validateConfig = () => {
    const requiredVars = [
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'SESSION_SECRET',
    ];
    const missingVars = [];
    for (const varName of requiredVars) {
        if (!exports.config[varName] || exports.config[varName] === '') {
            missingVars.push(varName);
        }
    }
    // Check for default secrets in production
    if (exports.config.NODE_ENV === 'production') {
        const defaultSecrets = [
            { key: 'JWT_SECRET', value: 'your-super-secret-jwt-key-change-this-in-production' },
            { key: 'JWT_REFRESH_SECRET', value: 'your-super-secret-refresh-key-change-this-in-production' },
            { key: 'SESSION_SECRET', value: 'your-super-secret-session-key-change-this-in-production' },
        ];
        for (const secret of defaultSecrets) {
            if (exports.config[secret.key] === secret.value) {
                missingVars.push(`${secret.key} (using default value in production)`);
            }
        }
    }
    // Warn about missing OpenAI API key
    if (!exports.config.OPENAI_API_KEY) {
        logger_1.logger.warn('OPENAI_API_KEY not configured - voice features will not work');
    }
    if (missingVars.length > 0) {
        const message = `Missing or invalid required environment variables: ${missingVars.join(', ')}`;
        logger_1.logger.error(message);
        throw new Error(message);
    }
    logger_1.logger.info('Configuration validated successfully', {
        environment: exports.config.NODE_ENV,
        port: exports.config.PORT,
        database: `${exports.config.DB_HOST}:${exports.config.DB_PORT}/${exports.config.DB_NAME}`,
        redis: `${exports.config.REDIS_HOST}:${exports.config.REDIS_PORT}/${exports.config.REDIS_DB}`,
        logLevel: exports.config.LOG_LEVEL,
    });
};
// Get configuration for specific environment
const getConfig = () => {
    return exports.config;
};
exports.getConfig = getConfig;
// Check if running in development mode
const isDevelopment = () => {
    return exports.config.NODE_ENV === 'development';
};
exports.isDevelopment = isDevelopment;
// Check if running in production mode
const isProduction = () => {
    return exports.config.NODE_ENV === 'production';
};
exports.isProduction = isProduction;
// Check if running in test mode
const isTest = () => {
    return exports.config.NODE_ENV === 'test';
};
exports.isTest = isTest;
// Get database connection string
const getDatabaseUrl = () => {
    const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = exports.config;
    return `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
};
exports.getDatabaseUrl = getDatabaseUrl;
// Get Redis connection string
const getRedisUrl = () => {
    const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB } = exports.config;
    const auth = REDIS_PASSWORD ? `:${REDIS_PASSWORD}@` : '';
    return `redis://${auth}${REDIS_HOST}:${REDIS_PORT}/${REDIS_DB}`;
};
exports.getRedisUrl = getRedisUrl;
// Create .env template
const createEnvTemplate = () => {
    return `# SocraTeach Environment Configuration

# Environment
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=socrateach
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
REDIS_KEY_PREFIX=socrateach:

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
exports.createEnvTemplate = createEnvTemplate;
// Initialize and validate configuration
validateConfig();
exports.default = exports.config;
//# sourceMappingURL=environment.js.map