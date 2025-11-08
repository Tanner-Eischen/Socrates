"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const AnalyticsService_1 = require("../services/AnalyticsService");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../middleware/logger");
const ProblemProcessingService_1 = require("../services/ProblemProcessingService");
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
// Configure multer for image uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'problem-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB max
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        else {
            cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
        }
    }
});
// Mock data - replace with actual database queries
const mockProblems = [
    // Math - Algebra Fundamentals
    {
        id: 'math-linear-1',
        title: 'Linear Equations Basics',
        description: 'Solve for x: 3x + 7 = 22',
        type: 'math',
        difficultyLevel: 1,
        tags: ['algebra', 'linear', 'equations', 'basics'],
        category: 'Math - Algebra',
        estimatedTime: 5,
        hints: ['What operation can you use to isolate x?', 'Remember to do the same thing to both sides'],
        solution: 'x = 5',
        expectedAnswer: '5',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        createdBy: 'system',
        isActive: true,
        isAssessment: true,
        prerequisites: [],
    },
    {
        id: 'math-quad-1',
        title: 'Quadratic Equations',
        description: 'Solve the quadratic equation: x² - 5x + 6 = 0',
        type: 'math',
        difficultyLevel: 3,
        tags: ['algebra', 'quadratic', 'equations'],
        category: 'Math - Algebra',
        estimatedTime: 10,
        hints: [
            'Try factoring the quadratic expression',
            'Look for two numbers that multiply to 6 and add to -5',
        ],
        solution: 'x = 2 or x = 3',
        expectedAnswer: 'x = 2, x = 3',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        createdBy: 'system',
        isActive: true,
        isAssessment: true,
        prerequisites: ['math-linear-1'],
    },
    // Math - Geometry
    {
        id: 'math-geo-1',
        title: 'Area of a Rectangle',
        description: 'Find the area of a rectangle with length 8 cm and width 5 cm.',
        type: 'math',
        difficultyLevel: 1,
        tags: ['geometry', 'area', 'rectangle'],
        category: 'Math - Geometry',
        estimatedTime: 5,
        hints: ['What formula calculates the area of a rectangle?'],
        solution: '40 cm²',
        expectedAnswer: '40',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
        createdBy: 'system',
        isActive: true,
        isAssessment: true,
        prerequisites: [],
    },
    {
        id: 'math-geo-2',
        title: 'Pythagorean Theorem',
        description: 'A right triangle has legs of length 3 and 4. Find the length of the hypotenuse.',
        type: 'math',
        difficultyLevel: 2,
        tags: ['geometry', 'pythagorean', 'triangles'],
        category: 'Math - Geometry',
        estimatedTime: 10,
        hints: ['Remember: a² + b² = c²', 'The hypotenuse is the longest side'],
        solution: '5',
        expectedAnswer: '5',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
        createdBy: 'system',
        isActive: true,
        isAssessment: true,
        prerequisites: ['math-geo-1'],
    },
    // Science - Physics
    {
        id: 'sci-phys-1',
        title: 'Speed and Distance',
        description: 'A car travels at 60 mph for 2.5 hours. How far does it travel?',
        type: 'science',
        difficultyLevel: 2,
        tags: ['physics', 'motion', 'speed'],
        category: 'Science - Physics',
        estimatedTime: 8,
        hints: ['Distance = Speed × Time', 'Make sure your units match'],
        solution: '150 miles',
        expectedAnswer: '150',
        createdAt: new Date('2024-01-03'),
        updatedAt: new Date('2024-01-03'),
        createdBy: 'system',
        isActive: true,
        isAssessment: true,
        prerequisites: [],
    },
    {
        id: 'sci-phys-2',
        title: 'Velocity Concepts',
        description: 'If you\'re running at constant speed on a treadmill, is your position changing? Explain the concept of velocity.',
        type: 'science',
        difficultyLevel: 2,
        tags: ['physics', 'velocity', 'motion'],
        category: 'Science - Physics',
        estimatedTime: 10,
        hints: ['Think about the difference between speed and velocity', 'Consider position relative to different reference frames'],
        solution: 'Velocity is speed with direction. On a treadmill, your position relative to the room doesn\'t change even though you\'re moving.',
        createdAt: new Date('2024-01-03'),
        updatedAt: new Date('2024-01-03'),
        createdBy: 'system',
        isActive: true,
        isAssessment: true,
        prerequisites: ['sci-phys-1'],
    },
    // Science - Biology
    {
        id: 'sci-bio-1',
        title: 'Cell Structure',
        description: 'What is the powerhouse of the cell and what does it do?',
        type: 'science',
        difficultyLevel: 1,
        tags: ['biology', 'cells', 'organelles'],
        category: 'Science - Biology',
        estimatedTime: 5,
        hints: ['This organelle produces energy', 'It\'s often called the "powerhouse"'],
        solution: 'Mitochondria - produces ATP (energy) for the cell',
        expectedAnswer: 'mitochondria',
        createdAt: new Date('2024-01-04'),
        updatedAt: new Date('2024-01-04'),
        createdBy: 'system',
        isActive: true,
        isAssessment: true,
        prerequisites: [],
    },
    {
        id: 'sci-bio-2',
        title: 'Photosynthesis',
        description: 'What are the reactants and products of photosynthesis?',
        type: 'science',
        difficultyLevel: 2,
        tags: ['biology', 'photosynthesis', 'plants'],
        category: 'Science - Biology',
        estimatedTime: 10,
        hints: [
            'Think about what plants need to make their own food',
            'What do plants release that we breathe?'
        ],
        solution: 'Reactants: CO2 + H2O + Light Energy. Products: Glucose + O2',
        createdAt: new Date('2024-01-04'),
        updatedAt: new Date('2024-01-04'),
        createdBy: 'system',
        isActive: true,
        isAssessment: true,
        prerequisites: ['sci-bio-1'],
    },
];
// Validation schemas
const createProblemSchema = joi_1.default.object({
    title: joi_1.default.string().required().min(1).max(200),
    description: joi_1.default.string().required().min(1).max(5000),
    type: joi_1.default.string().required().valid('math', 'science', 'programming', 'logic', 'language', 'other'),
    difficultyLevel: joi_1.default.number().integer().min(1).max(10).required(),
    tags: joi_1.default.array().items(joi_1.default.string().max(50)).max(10).default([]),
    category: joi_1.default.string().required().max(100),
    estimatedTime: joi_1.default.number().integer().min(1).max(300).required(),
    hints: joi_1.default.array().items(joi_1.default.string().max(500)).max(10).default([]),
    solution: joi_1.default.string().max(5000).optional(),
});
const updateProblemSchema = joi_1.default.object({
    title: joi_1.default.string().min(1).max(200).optional(),
    description: joi_1.default.string().min(1).max(5000).optional(),
    type: joi_1.default.string().valid('math', 'science', 'programming', 'logic', 'language', 'other').optional(),
    difficultyLevel: joi_1.default.number().integer().min(1).max(10).optional(),
    tags: joi_1.default.array().items(joi_1.default.string().max(50)).max(10).optional(),
    category: joi_1.default.string().max(100).optional(),
    estimatedTime: joi_1.default.number().integer().min(1).max(300).optional(),
    hints: joi_1.default.array().items(joi_1.default.string().max(500)).max(10).optional(),
    solution: joi_1.default.string().max(5000).optional(),
    isActive: joi_1.default.boolean().optional(),
});
/**
 * @swagger
 * /api/problems:
 *   get:
 *     summary: Get problems with filtering and pagination
 *     tags: [Problems]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [math, science, programming, logic, language, other]
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *           description: Comma-separated list of tags
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           description: Search in title and description
 *     responses:
 *       200:
 *         description: Problems retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', auth_1.optionalAuthMiddleware, rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const type = req.query.type;
    const difficulty = parseInt(req.query.difficulty);
    const category = req.query.category;
    const tagsQuery = req.query.tags;
    const search = req.query.search;
    let filteredProblems = mockProblems.filter(p => p.isActive);
    // Apply filters
    if (type) {
        filteredProblems = filteredProblems.filter(p => p.type === type);
    }
    if (difficulty) {
        filteredProblems = filteredProblems.filter(p => p.difficultyLevel === difficulty);
    }
    if (category) {
        filteredProblems = filteredProblems.filter(p => p.category.toLowerCase().includes(category.toLowerCase()));
    }
    if (tagsQuery) {
        const tags = tagsQuery.split(',').map(t => t.trim().toLowerCase());
        filteredProblems = filteredProblems.filter(p => tags.some(tag => p.tags.some(pTag => pTag.toLowerCase().includes(tag))));
    }
    if (search) {
        const searchLower = search.toLowerCase();
        filteredProblems = filteredProblems.filter(p => p.title.toLowerCase().includes(searchLower) ||
            p.description.toLowerCase().includes(searchLower));
    }
    // Apply pagination
    const total = filteredProblems.length;
    const paginatedProblems = filteredProblems.slice(offset, offset + limit);
    // Remove solution from response for non-admin users
    const responseProblems = paginatedProblems.map(p => {
        const { solution, ...problemWithoutSolution } = p;
        return (req.user?.role === 'admin' || req.user?.role === 'tutor')
            ? p
            : problemWithoutSolution;
    });
    // Track problem browsing (non-blocking)
    AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user?.id || 'demo-user',
        eventType: 'problems_browsed',
        eventData: {
            filters: { type, difficulty, category, tags: tagsQuery, search },
            resultCount: responseProblems.length,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
    }).catch(err => logger_1.logger.warn('Analytics tracking failed', { error: err }));
    return res.json({
        success: true,
        data: responseProblems,
        pagination: {
            limit,
            offset,
            total,
            hasMore: offset + limit < total,
        },
    });
}));
/**
 * @swagger
 * /api/problems/{id}:
 *   get:
 *     summary: Get a specific problem
 *     tags: [Problems]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Problem retrieved successfully
 *       404:
 *         description: Problem not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', auth_1.authenticate, rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const problem = mockProblems.find(p => p.id === req.params.id && p.isActive);
    if (!problem) {
        return res.status(404).json({
            success: false,
            message: 'Problem not found',
        });
    }
    // Remove solution from response for non-admin users
    const responseProblem = req.user.role === 'admin' || req.user.role === 'tutor'
        ? problem
        : { ...problem, solution: undefined };
    // Track problem view (non-blocking)
    AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user?.id || 'demo-user',
        eventType: 'problem_viewed',
        eventData: {
            problemId: problem.id,
            problemType: problem.type,
            difficultyLevel: problem.difficultyLevel,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
    }).catch(err => logger_1.logger.warn('Analytics tracking failed', { error: err }));
    logger_1.logger.info('Problem viewed via API', {
        problemId: problem.id,
        userId: req.user.id,
        problemType: problem.type,
    });
    return res.json({
        success: true,
        data: responseProblem,
    });
}));
/**
 * @swagger
 * /api/problems:
 *   post:
 *     summary: Create a new problem (Admin/Tutor only)
 *     tags: [Problems]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - type
 *               - difficultyLevel
 *               - category
 *               - estimatedTime
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 maxLength: 5000
 *               type:
 *                 type: string
 *                 enum: [math, science, programming, logic, language, other]
 *               difficultyLevel:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *               category:
 *                 type: string
 *                 maxLength: 100
 *               estimatedTime:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 300
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 50
 *                 maxItems: 10
 *               hints:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 500
 *                 maxItems: 10
 *               solution:
 *                 type: string
 *                 maxLength: 5000
 *     responses:
 *       201:
 *         description: Problem created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.post('/', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'tutor']), rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error, value } = createProblemSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.details.map(detail => detail.message),
        });
    }
    const newProblem = {
        id: (mockProblems.length + 1).toString(),
        ...value,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: req.user.id,
        isActive: true,
    };
    mockProblems.push(newProblem);
    // Track problem creation (non-blocking)
    AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user?.id || 'demo-user',
        eventType: 'problem_created',
        eventData: {
            problemId: newProblem.id,
            problemType: newProblem.type,
            difficultyLevel: newProblem.difficultyLevel,
            category: newProblem.category,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
    }).catch(err => logger_1.logger.warn('Analytics tracking failed', { error: err }));
    logger_1.logger.info('Problem created via API', {
        problemId: newProblem.id,
        userId: req.user.id,
        problemType: newProblem.type,
    });
    return res.status(201).json({
        success: true,
        data: newProblem,
    });
}));
/**
 * @swagger
 * /api/problems/{id}:
 *   patch:
 *     summary: Update a problem (Admin/Tutor only)
 *     tags: [Problems]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 maxLength: 5000
 *               type:
 *                 type: string
 *                 enum: [math, science, programming, logic, language, other]
 *               difficultyLevel:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *               category:
 *                 type: string
 *                 maxLength: 100
 *               estimatedTime:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 300
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 50
 *                 maxItems: 10
 *               hints:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 500
 *                 maxItems: 10
 *               solution:
 *                 type: string
 *                 maxLength: 5000
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Problem updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Problem not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.patch('/:id', auth_1.authenticate, (0, auth_1.requireRole)(['admin', 'tutor']), rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error, value } = updateProblemSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.details.map(detail => detail.message),
        });
    }
    const problemIndex = mockProblems.findIndex(p => p.id === req.params.id);
    if (problemIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'Problem not found',
        });
    }
    // Update problem
    mockProblems[problemIndex] = {
        ...mockProblems[problemIndex],
        ...value,
        updatedAt: new Date(),
    };
    const updatedProblem = mockProblems[problemIndex];
    // Track problem update (non-blocking)
    AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user?.id || 'demo-user',
        eventType: 'problem_updated',
        eventData: {
            problemId: updatedProblem.id,
            changes: Object.keys(value),
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
    }).catch(err => logger_1.logger.warn('Analytics tracking failed', { error: err }));
    logger_1.logger.info('Problem updated via API', {
        problemId: updatedProblem.id,
        userId: req.user.id,
        changes: Object.keys(value),
    });
    return res.json({
        success: true,
        data: updatedProblem,
    });
}));
/**
 * @swagger
 * /api/problems/{id}:
 *   delete:
 *     summary: Delete a problem (Admin only)
 *     tags: [Problems]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Problem deleted successfully
 *       404:
 *         description: Problem not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.delete('/:id', auth_1.authenticate, (0, auth_1.requireRole)(['admin']), rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const problemIndex = mockProblems.findIndex(p => p.id === req.params.id);
    if (problemIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'Problem not found',
        });
    }
    const deletedProblem = mockProblems[problemIndex];
    // Soft delete - mark as inactive
    mockProblems[problemIndex].isActive = false;
    mockProblems[problemIndex].updatedAt = new Date();
    // Track problem deletion (non-blocking)
    AnalyticsService_1.AnalyticsService.trackEvent({
        userId: req.user?.id || 'demo-user',
        eventType: 'problem_deleted',
        eventData: {
            problemId: deletedProblem.id,
            problemType: deletedProblem.type,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
    }).catch(err => logger_1.logger.warn('Analytics tracking failed', { error: err }));
    logger_1.logger.info('Problem deleted via API', {
        problemId: deletedProblem.id,
        userId: req.user.id,
    });
    return res.json({
        success: true,
        message: 'Problem deleted successfully',
    });
}));
/**
 * @swagger
 * /api/problems/categories:
 *   get:
 *     summary: Get all problem categories
 *     tags: [Problems]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/categories', auth_1.authenticate, rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const categories = [...new Set(mockProblems
            .filter(p => p.isActive)
            .map(p => p.category))].sort();
    return res.json({
        success: true,
        data: categories,
    });
}));
/**
 * @swagger
 * /api/problems/tags:
 *   get:
 *     summary: Get all problem tags
 *     tags: [Problems]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tags retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/tags', auth_1.authenticate, rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const allTags = mockProblems
        .filter(p => p.isActive)
        .flatMap(p => p.tags);
    const uniqueTags = [...new Set(allTags)].sort();
    return res.json({
        success: true,
        data: uniqueTags,
    });
}));
/**
 * @swagger
 * /api/v1/problems/submit:
 *   post:
 *     summary: Submit a new problem (text or image) for AI tutoring
 *     tags: [Problems]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               problemText:
 *                 type: string
 *                 description: Problem text (if not uploading image)
 *               problemImage:
 *                 type: string
 *                 format: binary
 *                 description: Problem image file (if not providing text)
 *     responses:
 *       200:
 *         description: Problem submitted and parsed successfully
 *       400:
 *         description: Invalid input or parsing error
 *       401:
 *         description: Unauthorized
 */
router.post('/submit', auth_1.optionalAuthMiddleware, upload.single('problemImage'), rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { problemText } = req.body;
    const problemImage = req.file;
    const userId = req.user?.id || 'demo-user';
    // Must provide either text or image
    if (!problemText && !problemImage) {
        return res.status(400).json({
            success: false,
            message: 'Please provide either problem text or upload an image',
        });
    }
    try {
        let submittedProblem;
        if (problemImage) {
            // Process image submission
            logger_1.logger.info('Processing image problem submission', {
                userId,
                filename: problemImage.filename,
                size: problemImage.size,
            });
            submittedProblem = await ProblemProcessingService_1.ProblemProcessingServiceInstance.processImageProblem(userId, problemImage.path);
        }
        else {
            // Process text submission
            logger_1.logger.info('Processing text problem submission', {
                userId,
                textLength: problemText.length,
            });
            submittedProblem = await ProblemProcessingService_1.ProblemProcessingServiceInstance.processTextProblem(userId, problemText);
        }
        // Track problem submission (non-blocking)
        AnalyticsService_1.AnalyticsService.trackEvent({
            userId,
            eventType: 'problem_submitted',
            eventData: {
                problemId: submittedProblem.id,
                type: submittedProblem.parsedProblem.problemType,
                difficulty: submittedProblem.parsedProblem.difficulty,
                submissionMethod: problemImage ? 'image' : 'text',
            },
        }).catch(err => logger_1.logger.warn('Analytics tracking failed', { error: err }));
        return res.json({
            success: true,
            message: 'Problem submitted and parsed successfully',
            data: {
                id: submittedProblem.id,
                type: submittedProblem.parsedProblem.problemType,
                difficulty: submittedProblem.parsedProblem.difficulty,
                description: submittedProblem.parsedProblem.content,
                originalText: submittedProblem.parsedProblem.originalText,
                mathConcepts: submittedProblem.parsedProblem.mathConcepts,
                metadata: submittedProblem.parsedProblem.metadata,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Error processing problem submission', {
            error,
            userId,
            hasImage: !!problemImage,
            hasText: !!problemText,
        });
        // Let the error handler middleware handle the error
        // It will format the response appropriately
        throw error;
    }
}));
exports.default = router;
//# sourceMappingURL=problems.js.map