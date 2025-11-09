"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.specs = exports.setupSwagger = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Socrates API',
            version: '1.0.0',
            description: `
        Socrates is a production-ready, multi-modal learning platform that uses the Socratic method 
        to guide students through problem-solving processes. This API provides comprehensive endpoints 
        for user management, learning sessions, collaboration, voice interactions, analytics, and monitoring.
        
        ## Features
        - **Multi-Modal Learning**: Support for text, voice, and image-based interactions
        - **Real-time Collaboration**: Live tutoring sessions and peer learning
        - **Advanced Analytics**: Comprehensive learning analytics and performance monitoring
        - **Voice Integration**: Speech-to-text and text-to-speech capabilities
        - **Secure Authentication**: JWT-based authentication with role-based access control
        - **Production Ready**: Comprehensive logging, monitoring, and error handling
        
        ## Authentication
        Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:
        \`Authorization: Bearer <your-jwt-token>\`
        
        ## Rate Limiting
        API endpoints are rate-limited to ensure fair usage and system stability. Different endpoints 
        have different rate limits based on their resource requirements.
        
        ## Error Handling
        All endpoints return consistent error responses with appropriate HTTP status codes and 
        detailed error messages to help with debugging and integration.
      `,
            contact: {
                name: 'Socrates Support',
                email: 'support@socrates.com',
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT',
            },
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server',
            },
            {
                url: 'https://api.socrates.com',
                description: 'Production server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT token for authentication',
                },
            },
            schemas: {
                Error: {
                    type: 'object',
                    required: ['success', 'message'],
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false,
                        },
                        message: {
                            type: 'string',
                            example: 'An error occurred',
                        },
                        error: {
                            type: 'string',
                            example: 'Detailed error message',
                        },
                        errors: {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                            example: ['Validation error 1', 'Validation error 2'],
                        },
                        correlationId: {
                            type: 'string',
                            example: 'abc123-def456-ghi789',
                        },
                    },
                },
                SuccessResponse: {
                    type: 'object',
                    required: ['success'],
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true,
                        },
                        message: {
                            type: 'string',
                            example: 'Operation completed successfully',
                        },
                        data: {
                            type: 'object',
                            description: 'Response data (varies by endpoint)',
                        },
                    },
                },
                User: {
                    type: 'object',
                    required: ['id', 'email', 'role'],
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            example: '123e4567-e89b-12d3-a456-426614174000',
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            example: 'user@example.com',
                        },
                        role: {
                            type: 'string',
                            enum: ['student', 'tutor', 'admin'],
                            example: 'student',
                        },
                        isActive: {
                            type: 'boolean',
                            example: true,
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-01T00:00:00.000Z',
                        },
                        lastLoginAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-01T12:00:00.000Z',
                        },
                    },
                },
                UserProfile: {
                    type: 'object',
                    properties: {
                        userId: {
                            type: 'string',
                            format: 'uuid',
                        },
                        firstName: {
                            type: 'string',
                            example: 'John',
                        },
                        lastName: {
                            type: 'string',
                            example: 'Doe',
                        },
                        displayName: {
                            type: 'string',
                            example: 'John Doe',
                        },
                        bio: {
                            type: 'string',
                            example: 'Passionate learner and educator',
                        },
                        avatar: {
                            type: 'string',
                            format: 'uri',
                            example: 'https://example.com/avatar.jpg',
                        },
                        preferences: {
                            type: 'object',
                            properties: {
                                language: {
                                    type: 'string',
                                    example: 'en',
                                },
                                theme: {
                                    type: 'string',
                                    enum: ['light', 'dark'],
                                    example: 'light',
                                },
                                notifications: {
                                    type: 'object',
                                    properties: {
                                        email: {
                                            type: 'boolean',
                                            example: true,
                                        },
                                        push: {
                                            type: 'boolean',
                                            example: false,
                                        },
                                    },
                                },
                            },
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                },
                Session: {
                    type: 'object',
                    required: ['id', 'userId', 'problemId', 'status'],
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        userId: {
                            type: 'string',
                            format: 'uuid',
                        },
                        problemId: {
                            type: 'string',
                            format: 'uuid',
                        },
                        status: {
                            type: 'string',
                            enum: ['active', 'completed', 'abandoned'],
                            example: 'active',
                        },
                        startedAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                        completedAt: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                        },
                        metadata: {
                            type: 'object',
                            description: 'Additional session metadata',
                        },
                    },
                },
                Problem: {
                    type: 'object',
                    required: ['id', 'title', 'description', 'difficulty'],
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        title: {
                            type: 'string',
                            example: 'Quadratic Equations',
                        },
                        description: {
                            type: 'string',
                            example: 'Solve quadratic equations using various methods',
                        },
                        difficulty: {
                            type: 'string',
                            enum: ['beginner', 'intermediate', 'advanced'],
                            example: 'intermediate',
                        },
                        category: {
                            type: 'string',
                            example: 'Mathematics',
                        },
                        tags: {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                            example: ['algebra', 'equations', 'quadratic'],
                        },
                        estimatedTime: {
                            type: 'integer',
                            description: 'Estimated time in minutes',
                            example: 30,
                        },
                        isActive: {
                            type: 'boolean',
                            example: true,
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                },
                CollaborationSession: {
                    type: 'object',
                    required: ['id', 'hostId', 'title', 'status'],
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        hostId: {
                            type: 'string',
                            format: 'uuid',
                        },
                        title: {
                            type: 'string',
                            example: 'Math Study Group',
                        },
                        description: {
                            type: 'string',
                            example: 'Working on algebra problems together',
                        },
                        status: {
                            type: 'string',
                            enum: ['active', 'ended'],
                            example: 'active',
                        },
                        maxParticipants: {
                            type: 'integer',
                            example: 10,
                        },
                        isPublic: {
                            type: 'boolean',
                            example: true,
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                        endedAt: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                        },
                    },
                },
                VoiceInteraction: {
                    type: 'object',
                    required: ['id', 'userId', 'type'],
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        userId: {
                            type: 'string',
                            format: 'uuid',
                        },
                        sessionId: {
                            type: 'string',
                            format: 'uuid',
                            nullable: true,
                        },
                        type: {
                            type: 'string',
                            enum: ['speech_to_text', 'text_to_speech'],
                            example: 'speech_to_text',
                        },
                        inputData: {
                            type: 'object',
                            description: 'Input data for the voice interaction',
                        },
                        outputData: {
                            type: 'object',
                            description: 'Output data from the voice interaction',
                        },
                        processingTime: {
                            type: 'integer',
                            description: 'Processing time in milliseconds',
                            example: 1500,
                        },
                        confidence: {
                            type: 'number',
                            minimum: 0,
                            maximum: 1,
                            example: 0.95,
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                },
                AnalyticsEvent: {
                    type: 'object',
                    required: ['id', 'userId', 'eventType'],
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        userId: {
                            type: 'string',
                            format: 'uuid',
                        },
                        sessionId: {
                            type: 'string',
                            format: 'uuid',
                            nullable: true,
                        },
                        eventType: {
                            type: 'string',
                            example: 'session_started',
                        },
                        eventData: {
                            type: 'object',
                            description: 'Event-specific data',
                        },
                        timestamp: {
                            type: 'string',
                            format: 'date-time',
                        },
                        ipAddress: {
                            type: 'string',
                            example: '192.168.1.1',
                        },
                        userAgent: {
                            type: 'string',
                            example: 'Mozilla/5.0...',
                        },
                    },
                },
                Pagination: {
                    type: 'object',
                    properties: {
                        limit: {
                            type: 'integer',
                            example: 20,
                        },
                        offset: {
                            type: 'integer',
                            example: 0,
                        },
                        total: {
                            type: 'integer',
                            example: 100,
                        },
                        pages: {
                            type: 'integer',
                            example: 5,
                        },
                    },
                },
            },
            responses: {
                UnauthorizedError: {
                    description: 'Authentication required',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error',
                            },
                            example: {
                                success: false,
                                message: 'Authentication required',
                                error: 'No token provided',
                            },
                        },
                    },
                },
                ForbiddenError: {
                    description: 'Insufficient permissions',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error',
                            },
                            example: {
                                success: false,
                                message: 'Insufficient permissions',
                                error: 'Admin access required',
                            },
                        },
                    },
                },
                NotFoundError: {
                    description: 'Resource not found',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error',
                            },
                            example: {
                                success: false,
                                message: 'Resource not found',
                                error: 'The requested resource could not be found',
                            },
                        },
                    },
                },
                ValidationError: {
                    description: 'Validation error',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error',
                            },
                            example: {
                                success: false,
                                message: 'Validation error',
                                errors: ['Email is required', 'Password must be at least 8 characters'],
                            },
                        },
                    },
                },
                RateLimitError: {
                    description: 'Rate limit exceeded',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error',
                            },
                            example: {
                                success: false,
                                message: 'Rate limit exceeded',
                                error: 'Too many requests, please try again later',
                            },
                        },
                    },
                },
                ServerError: {
                    description: 'Internal server error',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error',
                            },
                            example: {
                                success: false,
                                message: 'Internal server error',
                                error: 'An unexpected error occurred',
                                correlationId: 'abc123-def456-ghi789',
                            },
                        },
                    },
                },
            },
        },
        tags: [
            {
                name: 'Authentication',
                description: 'User authentication and authorization endpoints',
            },
            {
                name: 'Users',
                description: 'User management and profile endpoints',
            },
            {
                name: 'Sessions',
                description: 'Learning session management endpoints',
            },
            {
                name: 'Problems',
                description: 'Educational problem management endpoints',
            },
            {
                name: 'Collaboration',
                description: 'Real-time collaboration and tutoring endpoints',
            },
            {
                name: 'Voice',
                description: 'Voice interaction and processing endpoints',
            },
            {
                name: 'Analytics',
                description: 'Analytics and reporting endpoints',
            },
            {
                name: 'Monitoring',
                description: 'System monitoring and health check endpoints',
            },
        ],
    },
    apis: [
        './src/api/routes/*.ts',
        './src/api/middleware/*.ts',
        './src/api/services/*.ts',
    ],
};
const specs = (0, swagger_jsdoc_1.default)(options);
exports.specs = specs;
const setupSwagger = (app) => {
    // Swagger UI options
    const swaggerUiOptions = {
        explorer: true,
        swaggerOptions: {
            docExpansion: 'none',
            filter: true,
            showRequestDuration: true,
            tryItOutEnabled: true,
            requestInterceptor: (req) => {
                // Add correlation ID to all requests
                req.headers['X-Correlation-ID'] = `swagger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                return req;
            },
        },
        customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0 }
      .swagger-ui .info .title { color: #2c3e50 }
      .swagger-ui .scheme-container { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0 }
    `,
        customSiteTitle: 'Socrates API Documentation',
        customfavIcon: '/favicon.ico',
    };
    // Serve Swagger UI
    app.use('/api/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(specs, swaggerUiOptions));
    // Serve raw OpenAPI spec
    app.get('/api/docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(specs);
    });
    // Serve OpenAPI spec in YAML format
    app.get('/api/docs.yaml', (req, res) => {
        res.setHeader('Content-Type', 'text/yaml');
        const yaml = require('js-yaml');
        res.send(yaml.dump(specs));
    });
    console.log('📚 Swagger documentation available at /api/docs');
    console.log('📄 OpenAPI spec available at /api/docs.json');
    console.log('📄 OpenAPI spec (YAML) available at /api/docs.yaml');
};
exports.setupSwagger = setupSwagger;
exports.default = exports.setupSwagger;
//# sourceMappingURL=swagger.js.map