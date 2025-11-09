import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { AnalyticsService } from '../services/AnalyticsService';
import { authenticate, requireRole, optionalAuthMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../middleware/logger';
import { ProblemProcessingServiceInstance } from '../services/ProblemProcessingService';
import Joi from 'joi';
import { LEARNING_ASSESSMENTS, PROBLEM_BANK } from './assessment-data';

const router = Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'problem-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
    }
  }
});

// Mock problem database - in production, this would be a proper database
interface Problem {
  id: string;
  title: string;
  description: string;
  type: string;
  difficultyLevel: number;
  tags: string[];
  category: string;
  estimatedTime: number;
  hints: string[];
  solution?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isActive: boolean;
  isAssessment: boolean; // New: Marks if this is a learning assessment
  prerequisites?: string[]; // New: IDs of prerequisite assessments
  expectedAnswer?: string; // New: Expected answer format for assessments
}

// Combine assessments and problem bank problems
const mockProblems: Problem[] = [
  ...LEARNING_ASSESSMENTS,
  ...PROBLEM_BANK,
];

// Helper function to get problem by ID
export function getProblemById(id: string): Problem | undefined {
  return mockProblems.find(p => p.id === id && p.isActive);
}

// Note: Legacy inline problems removed - all problems now in assessment-data.ts
/*
// Keeping old code structure for reference
const oldMockProblems: Problem[] = [
  {
    id: 'alg-1',
    title: 'Linear Equations - Basic',
    description: 'Solve for x: 3x + 7 = 22',
    type: 'math',
    difficultyLevel: 1,
    tags: ['algebra', 'linear', 'equations', 'basics'],
    category: 'Algebra',
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
    id: 'alg-2',
    title: 'Understanding Variables',
    description: 'Explain what a variable represents in an equation and why we use letters like x and y in algebra.',
    type: 'math',
    difficultyLevel: 1,
    tags: ['algebra', 'variables', 'comprehension'],
    category: 'Algebra',
    estimatedTime: 8,
    hints: ['Think about what unknowns are', 'Variables are placeholders'],
    expectedAnswer: 'variable placeholder unknown',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    createdBy: 'system',
    isActive: true,
    isAssessment: true,
    prerequisites: ['alg-1'],
  },
  {
    id: 'alg-3',
    title: 'Systems of Equations',
    description: 'Solve the system: x + y = 10 and x - y = 2. What is the value of x?',
    type: 'math',
    difficultyLevel: 2,
    tags: ['algebra', 'systems', 'equations'],
    category: 'Algebra',
    estimatedTime: 10,
    hints: ['Try adding the two equations together', 'What happens when you add x - y to x + y?'],
    solution: 'x = 6',
    expectedAnswer: '6',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    createdBy: 'system',
    isActive: true,
    isAssessment: true,
    prerequisites: ['alg-1', 'alg-2'],
  },
  {
    id: 'alg-4',
    title: 'Quadratic Equations',
    description: 'Solve: x² - 5x + 6 = 0. Give both solutions.',
    type: 'math',
    difficultyLevel: 3,
    tags: ['algebra', 'quadratic', 'factoring'],
    category: 'Algebra',
    estimatedTime: 12,
    hints: ['Try factoring', 'Look for two numbers that multiply to 6 and add to -5'],
    solution: 'x = 2 or x = 3',
    expectedAnswer: '2 3',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    createdBy: 'system',
    isActive: true,
    isAssessment: true,
    prerequisites: ['alg-3'],
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
  
  // ==================== PROBLEM BANK (isAssessment: false) ====================
  // These are used for the Problem Bank page with Socratic tutoring
  
  {
    id: 'prob-algebra-1',
    title: 'Exploring Linear Relationships',
    description: 'A train travels at a constant speed. After 2 hours, it has covered 150 miles. After 5 hours, it has covered 375 miles. How can we express the relationship between time and distance?',
    type: 'math',
    difficultyLevel: 2,
    tags: ['algebra', 'linear', 'relationships', 'real-world'],
    category: 'Math - Algebra',
    estimatedTime: 15,
    hints: ['Think about the rate of change', 'How much distance is covered per hour?'],
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
    createdBy: 'system',
    isActive: true,
    isAssessment: false,
    prerequisites: [],
  },
  {
    id: 'prob-geometry-1',
    title: 'Garden Design Problem',
    description: 'You want to create a rectangular garden with an area of 60 square meters. You have 32 meters of fencing to go around it. What should the dimensions be?',
    type: 'math',
    difficultyLevel: 3,
    tags: ['geometry', 'area', 'perimeter', 'problem-solving'],
    category: 'Math - Geometry',
    estimatedTime: 20,
    hints: ['Think about the formulas for area and perimeter', 'Can you set up two equations?'],
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
    createdBy: 'system',
    isActive: true,
    isAssessment: false,
    prerequisites: [],
  },
  {
    id: 'prob-physics-1',
    title: 'Falling Object',
    description: 'If you drop a ball from a tall building, it falls faster and faster. Why does this happen, and how would you describe its motion?',
    type: 'science',
    difficultyLevel: 2,
    tags: ['physics', 'gravity', 'motion', 'acceleration'],
    category: 'Science - Physics',
    estimatedTime: 15,
    hints: ['Think about forces acting on the ball', 'What does gravity do?'],
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
    createdBy: 'system',
    isActive: true,
    isAssessment: false,
    prerequisites: [],
  },
  {
    id: 'prob-biology-1',
    title: 'Photosynthesis Investigation',
    description: 'What are the reactants and products of photosynthesis?',
    type: 'science',
    difficultyLevel: 2,
    tags: ['biology', 'photosynthesis', 'plants', 'energy'],
    category: 'Science - Biology',
    estimatedTime: 15,
    hints: ['What do plants need to make their own food?', 'What do plants release?'],
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
    createdBy: 'system',
    isActive: true,
    isAssessment: false,
    prerequisites: [],
  },
  {
    id: 'prob-critical-thinking-1',
    title: 'The Bridge Problem',
    description: 'Four people need to cross a bridge at night. The bridge can only hold two people at a time. They have one flashlight and it must be carried across. Person A takes 1 minute to cross, B takes 2 minutes, C takes 5 minutes, and D takes 10 minutes. When two people cross together, they must go at the slower person\'s pace. What is the minimum time for all four to cross?',
    type: 'logic',
    difficultyLevel: 4,
    tags: ['logic', 'problem-solving', 'optimization', 'critical-thinking'],
    category: 'Critical Thinking',
    estimatedTime: 25,
    hints: ['Think about who should cross together', 'Consider sending the flashlight back with the fastest person'],
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
    createdBy: 'system',
    isActive: true,
    isAssessment: false,
    prerequisites: [],
  },
];
*/

// Validation schemas
const createProblemSchema = Joi.object({
  title: Joi.string().required().min(1).max(200),
  description: Joi.string().required().min(1).max(5000),
  type: Joi.string().required().valid('math', 'science', 'programming', 'logic', 'language', 'other'),
  difficultyLevel: Joi.number().integer().min(1).max(10).required(),
  tags: Joi.array().items(Joi.string().max(50)).max(10).default([]),
  category: Joi.string().required().max(100),
  estimatedTime: Joi.number().integer().min(1).max(300).required(),
  hints: Joi.array().items(Joi.string().max(500)).max(10).default([]),
  solution: Joi.string().max(5000).optional(),
});

const updateProblemSchema = Joi.object({
  title: Joi.string().min(1).max(200).optional(),
  description: Joi.string().min(1).max(5000).optional(),
  type: Joi.string().valid('math', 'science', 'programming', 'logic', 'language', 'other').optional(),
  difficultyLevel: Joi.number().integer().min(1).max(10).optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
  category: Joi.string().max(100).optional(),
  estimatedTime: Joi.number().integer().min(1).max(300).optional(),
  hints: Joi.array().items(Joi.string().max(500)).max(10).optional(),
  solution: Joi.string().max(5000).optional(),
  isActive: Joi.boolean().optional(),
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
router.get('/', 
  optionalAuthMiddleware, 
  rateLimiter, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const type = req.query.type as string;
    const difficulty = parseInt(req.query.difficulty as string);
    const category = req.query.category as string;
    const tagsQuery = req.query.tags as string;
    const search = req.query.search as string;

    let filteredProblems = mockProblems.filter(p => p.isActive);

    // Apply filters
    if (type) {
      filteredProblems = filteredProblems.filter(p => p.type === type);
    }
    if (difficulty) {
      filteredProblems = filteredProblems.filter(p => p.difficultyLevel === difficulty);
    }
    if (category) {
      filteredProblems = filteredProblems.filter(p => 
        p.category.toLowerCase().includes(category.toLowerCase())
      );
    }
    if (tagsQuery) {
      const tags = tagsQuery.split(',').map(t => t.trim().toLowerCase());
      filteredProblems = filteredProblems.filter(p => 
        tags.some(tag => p.tags.some(pTag => pTag.toLowerCase().includes(tag)))
      );
    }
    if (search) {
      const searchLower = search.toLowerCase();
      filteredProblems = filteredProblems.filter(p => 
        p.title.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      );
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
    AnalyticsService.trackEvent({
      userId: req.user?.id || 'demo-user',
      eventType: 'problems_browsed',
      eventData: {
        filters: { type, difficulty, category, tags: tagsQuery, search },
        resultCount: responseProblems.length,
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    }).catch(err => logger.warn('Analytics tracking failed', { error: err }));

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
  })
);

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
router.get('/:id', 
  authenticate, 
  rateLimiter, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const problem = mockProblems.find(p => p.id === req.params.id && p.isActive);
    
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found',
      });
    }

    // Remove solution from response for non-admin users
    const responseProblem = req.user!.role === 'admin' || req.user!.role === 'tutor' 
      ? problem 
      : { ...problem, solution: undefined };

    // Track problem view (non-blocking)
    AnalyticsService.trackEvent({
      userId: req.user?.id || 'demo-user',
      eventType: 'problem_viewed',
      eventData: {
        problemId: problem.id,
        problemType: problem.type,
        difficultyLevel: problem.difficultyLevel,
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    }).catch(err => logger.warn('Analytics tracking failed', { error: err }));

    logger.info('Problem viewed via API', {
      problemId: problem.id,
      userId: req.user!.id,
      problemType: problem.type,
    });

    return res.json({
      success: true,
      data: responseProblem,
    });
  })
);

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
router.post('/', 
  authenticate, 
  requireRole(['admin', 'tutor']),
  rateLimiter, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { error, value } = createProblemSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const newProblem: Problem = {
      id: (mockProblems.length + 1).toString(),
      ...value,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.user!.id,
      isActive: true,
    };

    mockProblems.push(newProblem);

    // Track problem creation (non-blocking)
    AnalyticsService.trackEvent({
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
    }).catch(err => logger.warn('Analytics tracking failed', { error: err }));

    logger.info('Problem created via API', {
      problemId: newProblem.id,
      userId: req.user!.id,
      problemType: newProblem.type,
    });

    return res.status(201).json({
      success: true,
      data: newProblem,
    });
  })
);

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
router.patch('/:id', 
  authenticate, 
  requireRole(['admin', 'tutor']),
  rateLimiter, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
    AnalyticsService.trackEvent({
      userId: req.user?.id || 'demo-user',
      eventType: 'problem_updated',
      eventData: {
        problemId: updatedProblem.id,
        changes: Object.keys(value),
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    }).catch(err => logger.warn('Analytics tracking failed', { error: err }));

    logger.info('Problem updated via API', {
      problemId: updatedProblem.id,
      userId: req.user!.id,
      changes: Object.keys(value),
    });

    return res.json({
      success: true,
      data: updatedProblem,
    });
  })
);

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
router.delete('/:id', 
  authenticate, 
  requireRole(['admin']),
  rateLimiter, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
    AnalyticsService.trackEvent({
      userId: req.user?.id || 'demo-user',
      eventType: 'problem_deleted',
      eventData: {
        problemId: deletedProblem.id,
        problemType: deletedProblem.type,
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    }).catch(err => logger.warn('Analytics tracking failed', { error: err }));

    logger.info('Problem deleted via API', {
      problemId: deletedProblem.id,
      userId: req.user!.id,
    });

    return res.json({
      success: true,
      message: 'Problem deleted successfully',
    });
  })
);

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
router.get('/categories', 
  authenticate, 
  rateLimiter, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const categories = [...new Set(mockProblems
      .filter(p => p.isActive)
      .map(p => p.category)
    )].sort();

    return res.json({
      success: true,
      data: categories,
    });
  })
);

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
router.get('/tags', 
  authenticate, 
  rateLimiter, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const allTags = mockProblems
      .filter(p => p.isActive)
      .flatMap(p => p.tags);
    
    const uniqueTags = [...new Set(allTags)].sort();

    return res.json({
      success: true,
      data: uniqueTags,
    });
  })
);

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
router.post('/submit',
  optionalAuthMiddleware,
  upload.single('problemImage'),
  rateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
        logger.info('Processing image problem submission', {
          userId,
          filename: problemImage.filename,
          size: problemImage.size,
        });

        submittedProblem = await ProblemProcessingServiceInstance.processImageProblem(
          userId,
          problemImage.path
        );
      } else {
        // Process text submission
        logger.info('Processing text problem submission', {
          userId,
          textLength: problemText.length,
        });

        submittedProblem = await ProblemProcessingServiceInstance.processTextProblem(
          userId,
          problemText
        );
      }

      // Track problem submission (non-blocking)
      AnalyticsService.trackEvent({
        userId,
        eventType: 'problem_submitted',
        eventData: {
          problemId: submittedProblem.id,
          type: submittedProblem.parsedProblem.problemType,
          difficulty: submittedProblem.parsedProblem.difficulty,
          submissionMethod: problemImage ? 'image' : 'text',
        },
      }).catch(err => logger.warn('Analytics tracking failed', { error: err }));

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
    } catch (error: any) {
      logger.error('Error processing problem submission', {
        error,
        userId,
        hasImage: !!problemImage,
        hasText: !!problemText,
      });

      // Let the error handler middleware handle the error
      // It will format the response appropriately
      throw error;
    }
  })
);

export default router;
