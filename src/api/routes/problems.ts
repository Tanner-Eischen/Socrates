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
}

// Mock data - replace with actual database queries
const mockProblems: Problem[] = [
  {
    id: '1',
    title: 'Quadratic Equation Solver',
    description: 'Solve the quadratic equation: x² - 5x + 6 = 0',
    type: 'math',
    difficultyLevel: 3,
    tags: ['algebra', 'quadratic', 'equations'],
    category: 'Mathematics',
    estimatedTime: 15,
    hints: [
      'Try factoring the quadratic expression',
      'Look for two numbers that multiply to 6 and add to -5',
      'Use the quadratic formula if factoring is difficult'
    ],
    solution: 'x = 2 or x = 3',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    createdBy: 'system',
    isActive: true,
  },
  {
    id: '2',
    title: 'Binary Search Implementation',
    description: 'Implement a binary search algorithm to find an element in a sorted array',
    type: 'programming',
    difficultyLevel: 4,
    tags: ['algorithms', 'search', 'binary-search'],
    category: 'Computer Science',
    estimatedTime: 30,
    hints: [
      'Start with the middle element',
      'Compare the target with the middle element',
      'Eliminate half of the search space in each iteration'
    ],
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    createdBy: 'system',
    isActive: true,
  },
  {
    id: '3',
    title: 'Photosynthesis Process',
    description: 'Explain the process of photosynthesis and its importance in the ecosystem',
    type: 'science',
    difficultyLevel: 2,
    tags: ['biology', 'photosynthesis', 'plants'],
    category: 'Biology',
    estimatedTime: 20,
    hints: [
      'Think about what plants need to make their own food',
      'Consider the role of sunlight, water, and carbon dioxide',
      'What are the products of photosynthesis?'
    ],
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
    createdBy: 'system',
    isActive: true,
  },
];

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
  authenticate, 
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
      return req.user!.role === 'admin' || req.user!.role === 'tutor' 
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
    } catch (error) {
      logger.error('Error processing problem submission', {
        error,
        userId,
        hasImage: !!problemImage,
        hasText: !!problemText,
      });

      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process problem',
      });
    }
  })
);

export default router;