import { Router, Response } from 'express';
import { authenticate, optionalAuthMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../middleware/logger';
import Joi from 'joi';

const router = Router();

// In-memory storage for assessment completions (would be database in production)
interface AssessmentCompletion {
  userId: string;
  assessmentId: string;
  completed: boolean;
  score?: number;
  completedAt: Date;
  sessionId?: string;
}

// Mock storage - replace with database
const completionsStore: Map<string, AssessmentCompletion[]> = new Map();

// Validation schemas
const completeAssessmentSchema = Joi.object({
  score: Joi.number().min(0).max(100).optional(),
  sessionId: Joi.string().optional(),
});

/**
 * @swagger
 * /api/assessments/completions:
 *   get:
 *     summary: Get user's completed assessments
 *     tags: [Assessments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of completed assessments
 *       401:
 *         description: Unauthorized
 */
router.get('/completions',
  optionalAuthMiddleware,
  rateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id || 'demo-user';
    const completions = completionsStore.get(userId) || [];

    logger.info('Retrieved assessment completions', {
      userId,
      count: completions.length,
    });

    return res.json({
      success: true,
      data: completions,
    });
  })
);

/**
 * @swagger
 * /api/assessments/{id}/complete:
 *   post:
 *     summary: Mark an assessment as complete
 *     tags: [Assessments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Assessment ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               score:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               sessionId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Assessment marked as complete
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/complete',
  optionalAuthMiddleware,
  rateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id || 'demo-user';
    const { error, value } = completeAssessmentSchema.validate(req.body || {});

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    // Get or create user's completions list
    let userCompletions = completionsStore.get(userId) || [];
    
    // Check if already completed
    const existingIndex = userCompletions.findIndex(c => c.assessmentId === id);
    
    const completion: AssessmentCompletion = {
      userId,
      assessmentId: id,
      completed: true,
      score: value.score,
      completedAt: new Date(),
      sessionId: value.sessionId,
    };

    if (existingIndex >= 0) {
      // Update existing completion
      userCompletions[existingIndex] = completion;
    } else {
      // Add new completion
      userCompletions.push(completion);
    }

    completionsStore.set(userId, userCompletions);

    logger.info('Assessment completed', {
      userId,
      assessmentId: id,
      score: value.score,
    });

    return res.status(201).json({
      success: true,
      message: 'Assessment marked as complete',
      data: completion,
    });
  })
);

/**
 * @swagger
 * /api/assessments/{id}/status:
 *   get:
 *     summary: Get completion status for a specific assessment
 *     tags: [Assessments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Assessment ID
 *     responses:
 *       200:
 *         description: Assessment completion status
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/status',
  optionalAuthMiddleware,
  rateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id || 'demo-user';
    
    const userCompletions = completionsStore.get(userId) || [];
    const completion = userCompletions.find(c => c.assessmentId === id);

    return res.json({
      success: true,
      data: {
        assessmentId: id,
        completed: !!completion,
        completionData: completion || null,
      },
    });
  })
);

/**
 * @swagger
 * /api/assessments/{id}/prerequisites:
 *   get:
 *     summary: Get prerequisite assessments and their completion status
 *     tags: [Assessments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Assessment ID
 *     responses:
 *       200:
 *         description: Prerequisites and completion status
 *       404:
 *         description: Assessment not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/prerequisites',
  optionalAuthMiddleware,
  rateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id || 'demo-user';
    
    // Mock problem data - in production, fetch from database
    const mockProblems = [
      { id: 'math-linear-1', prerequisites: [] },
      { id: 'math-quad-1', prerequisites: ['math-linear-1'] },
      { id: 'math-geo-1', prerequisites: [] },
      { id: 'math-geo-2', prerequisites: ['math-geo-1'] },
      { id: 'sci-phys-1', prerequisites: [] },
      { id: 'sci-phys-2', prerequisites: ['sci-phys-1'] },
      { id: 'sci-bio-1', prerequisites: [] },
      { id: 'sci-bio-2', prerequisites: ['sci-bio-1'] },
    ];

    const assessment = mockProblems.find(p => p.id === id);
    
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found',
      });
    }

    // Get user's completions
    const userCompletions = completionsStore.get(userId) || [];
    
    // Check prerequisite completion status
    const prerequisiteStatus = assessment.prerequisites.map(prereqId => {
      const prereqCompletion = userCompletions.find(c => c.assessmentId === prereqId);
      return {
        assessmentId: prereqId,
        completed: !!prereqCompletion,
        completedAt: prereqCompletion?.completedAt || null,
      };
    });

    const allPrerequisitesMet = prerequisiteStatus.every(p => p.completed);

    return res.json({
      success: true,
      data: {
        assessmentId: id,
        prerequisites: prerequisiteStatus,
        allPrerequisitesMet,
        canAttempt: allPrerequisitesMet,
      },
    });
  })
);

/**
 * @swagger
 * /api/assessments/progress:
 *   get:
 *     summary: Get overall assessment progress for user
 *     tags: [Assessments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's assessment progress
 *       401:
 *         description: Unauthorized
 */
router.get('/progress',
  optionalAuthMiddleware,
  rateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id || 'demo-user';
    const userCompletions = completionsStore.get(userId) || [];

    // Total assessments available
    const totalAssessments = 8; // Would fetch from database

    // Calculate progress by category
    const categoryProgress = {
      'Math - Algebra': {
        completed: userCompletions.filter(c => c.assessmentId.startsWith('math-') && 
                                              ['math-linear-1', 'math-quad-1'].includes(c.assessmentId)).length,
        total: 2,
      },
      'Math - Geometry': {
        completed: userCompletions.filter(c => c.assessmentId.startsWith('math-geo')).length,
        total: 2,
      },
      'Science - Physics': {
        completed: userCompletions.filter(c => c.assessmentId.startsWith('sci-phys')).length,
        total: 2,
      },
      'Science - Biology': {
        completed: userCompletions.filter(c => c.assessmentId.startsWith('sci-bio')).length,
        total: 2,
      },
    };

    return res.json({
      success: true,
      data: {
        overall: {
          completed: userCompletions.length,
          total: totalAssessments,
          percentage: Math.round((userCompletions.length / totalAssessments) * 100),
        },
        byCategory: categoryProgress,
        recentCompletions: userCompletions
          .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
          .slice(0, 5),
      },
    });
  })
);

export default router;

