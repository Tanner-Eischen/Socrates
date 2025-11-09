import { Router, Response } from 'express';
import { authenticate, optionalAuthMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../middleware/logger';
import { AdaptiveLearningService } from '../../services/adaptive-learning';

const router = Router();

/**
 * @swagger
 * /api/adaptive/ability:
 *   get:
 *     summary: Get student ability levels across all categories
 *     tags: [Adaptive Learning]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student ability data
 */
router.get('/ability',
  optionalAuthMiddleware,
  rateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id || 'demo-user';
    const abilities = AdaptiveLearningService.getAllAbilities(userId);

    return res.json({
      success: true,
      data: abilities
    });
  })
);

/**
 * @swagger
 * /api/adaptive/ability/{category}:
 *   get:
 *     summary: Get student ability level for a specific category
 *     tags: [Adaptive Learning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: Category name (e.g., "Math - Algebra")
 *     responses:
 *       200:
 *         description: Student ability for the category
 */
router.get('/ability/:category',
  optionalAuthMiddleware,
  rateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id || 'demo-user';
    const { category } = req.params;
    
    const ability = AdaptiveLearningService.getAbility(userId, category);

    return res.json({
      success: true,
      data: ability
    });
  })
);

/**
 * @swagger
 * /api/adaptive/recommend:
 *   post:
 *     summary: Get personalized assessment recommendation
 *     tags: [Adaptive Learning]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category:
 *                 type: string
 *                 description: Category to get recommendation for
 *               availableAssessments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     difficulty:
 *                       type: number
 *                     category:
 *                       type: string
 *                     completed:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Recommended assessment
 */
router.post('/recommend',
  optionalAuthMiddleware,
  rateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id || 'demo-user';
    const { category, availableAssessments } = req.body;

    if (!category || !availableAssessments) {
      return res.status(400).json({
        success: false,
        message: 'Category and availableAssessments are required'
      });
    }

    const recommendation = AdaptiveLearningService.recommendNextAssessment(
      userId,
      category,
      availableAssessments
    );

    if (!recommendation) {
      return res.json({
        success: true,
        message: 'No assessments available in this category',
        data: null
      });
    }

    return res.json({
      success: true,
      data: recommendation
    });
  })
);

/**
 * @swagger
 * /api/adaptive/analytics:
 *   get:
 *     summary: Get comprehensive learning analytics for student
 *     tags: [Adaptive Learning]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Learning analytics data
 */
router.get('/analytics',
  optionalAuthMiddleware,
  rateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id || 'demo-user';
    const analytics = AdaptiveLearningService.getLearningAnalytics(userId);

    return res.json({
      success: true,
      data: analytics
    });
  })
);

/**
 * @swagger
 * /api/adaptive/reset:
 *   post:
 *     summary: Reset student abilities (admin/testing only)
 *     tags: [Adaptive Learning]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Abilities reset successfully
 */
router.post('/reset',
  optionalAuthMiddleware,
  rateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id || 'demo-user';
    AdaptiveLearningService.resetAbilities(userId);

    return res.json({
      success: true,
      message: 'Student abilities reset successfully'
    });
  })
);

export default router;

