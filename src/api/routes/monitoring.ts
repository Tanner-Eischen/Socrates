import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { AnalyticsService } from '../services/AnalyticsService';
import { authenticate, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { rateLimiter, analyticsRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../middleware/logger';
import os from 'os';
import process from 'process';

const router = Router();

/**
 * @swagger
 * /api/monitoring/health:
 *   get:
 *     summary: Get system health status
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: System health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded, unhealthy]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                 version:
 *                   type: string
 *                 services:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                         responseTime:
 *                           type: number
 *                     api:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                         responseTime:
 *                           type: number
 *       503:
 *         description: System is unhealthy
 */
router.get('/health', 
  rateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    const healthChecks: any = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      services: {},
    };

    // Check database health
    try {
      const dbStartTime = Date.now();
      const dbHealthy = await DatabaseService.healthCheck();
      const poolStats = DatabaseService.getPoolStats();
      const dbResponseTime = Date.now() - dbStartTime;
      
      healthChecks.services.database = {
        status: dbHealthy ? 'healthy' : 'unhealthy',
        responseTime: dbResponseTime,
        pool: poolStats ? {
          totalCount: poolStats.totalCount,
          idleCount: poolStats.idleCount,
          waitingCount: poolStats.waitingCount,
        } : undefined,
      };
    } catch (error) {
      healthChecks.services.database = {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Check API health
    const apiResponseTime = Date.now() - startTime;
    healthChecks.services.api = {
      status: 'healthy',
      responseTime: apiResponseTime,
    };

    // Determine overall status
    const allServicesHealthy = Object.values(healthChecks.services).every(
      (service: any) => service.status === 'healthy'
    );
    
    const someServicesUnhealthy = Object.values(healthChecks.services).some(
      (service: any) => service.status === 'unhealthy'
    );

    healthChecks.status = allServicesHealthy ? 'healthy' : 
                         someServicesUnhealthy ? 'unhealthy' : 'degraded';

    const statusCode = healthChecks.status === 'healthy' ? 200 : 
                      healthChecks.status === 'degraded' ? 200 : 503;

    logger.info('Health check completed', {
      status: healthChecks.status,
      responseTime: apiResponseTime,
      services: Object.keys(healthChecks.services),
    });

    return res.status(statusCode).json({
      success: true,
      data: healthChecks,
    });
  })
);

/**
 * @swagger
 * /api/monitoring/metrics:
 *   get:
 *     summary: Get system metrics (admin only)
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System metrics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/metrics', 
  authenticate, 
  requireAdmin, 
  analyticsRateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();

    // System metrics
    const systemMetrics = {
      timestamp: new Date().toISOString(),
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        uptime: process.uptime(),
        pid: process.pid,
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usage: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100,
        process: process.memoryUsage(),
      },
      cpu: {
        cores: os.cpus().length,
        loadAverage: os.loadavg(),
        usage: process.cpuUsage(),
      },
    };

    // Database metrics
    let databaseMetrics: any = {};
    try {
      const dbHealthy = await DatabaseService.healthCheck();
      const poolStats = DatabaseService.getPoolStats();
      databaseMetrics = {
        isHealthy: dbHealthy,
        pool: poolStats ? {
          totalCount: poolStats.totalCount,
          idleCount: poolStats.idleCount,
          waitingCount: poolStats.waitingCount,
        } : undefined,
      };
    } catch (error) {
      databaseMetrics = {
        isHealthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Application metrics from analytics
    let applicationMetrics = {};
    try {
      applicationMetrics = await AnalyticsService.getSystemMetrics();
    } catch (error) {
      logger.error('Failed to get application metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      applicationMetrics = {
        error: 'Failed to retrieve application metrics',
      };
    }

    const responseTime = Date.now() - startTime;

    logger.info('System metrics retrieved', {
      userId: req.user!.id,
      responseTime,
    });

    return res.json({
      success: true,
      data: {
        system: systemMetrics,
        database: databaseMetrics,
        application: applicationMetrics,
        responseTime,
      },
    });
  })
);

/**
 * @swagger
 * /api/monitoring/logs:
 *   get:
 *     summary: Get recent system logs (admin only)
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [error, warn, info, debug]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: System logs retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/logs', 
  authenticate, 
  requireAdmin, 
  analyticsRateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const offset = parseInt(req.query.offset as string) || 0;
    const level = req.query.level as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    try {
      // Query system logs from database
      let query = `
        SELECT id, level, message, metadata, timestamp, correlation_id
        FROM system_logs
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (level) {
        query += ` AND level = $${paramIndex}`;
        params.push(level);
        paramIndex++;
      }

      if (startDate) {
        query += ` AND timestamp >= $${paramIndex}`;
        params.push(new Date(startDate));
        paramIndex++;
      }

      if (endDate) {
        query += ` AND timestamp <= $${paramIndex}`;
        params.push(new Date(endDate));
        paramIndex++;
      }

      query += ` ORDER BY timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await DatabaseService.query(query, params);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total
        FROM system_logs
        WHERE 1=1
      `;
      const countParams: any[] = [];
      let countParamIndex = 1;

      if (level) {
        countQuery += ` AND level = $${countParamIndex}`;
        countParams.push(level);
        countParamIndex++;
      }

      if (startDate) {
        countQuery += ` AND timestamp >= $${countParamIndex}`;
        countParams.push(new Date(startDate));
        countParamIndex++;
      }

      if (endDate) {
        countQuery += ` AND timestamp <= $${countParamIndex}`;
        countParams.push(new Date(endDate));
        countParamIndex++;
      }

      const countResult = await DatabaseService.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      logger.info('System logs retrieved', {
        userId: req.user!.id,
        level,
        limit,
        offset,
        total,
      });

      return res.json({
        success: true,
        data: result.rows,
        pagination: {
          limit,
          offset,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Failed to retrieve system logs', {
        userId: req.user!.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve system logs',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

/**
 * @swagger
 * /api/monitoring/performance:
 *   get:
 *     summary: Get performance metrics (admin only)
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [hour, day, week, month]
 *           default: day
 *     responses:
 *       200:
 *         description: Performance metrics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/performance', 
  authenticate, 
  requireAdmin, 
  analyticsRateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const timeframe = req.query.timeframe as string || 'day';
    
    if (!['hour', 'day', 'week', 'month'].includes(timeframe)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid timeframe. Must be hour, day, week, or month.',
      });
    }

    try {
      // Calculate time range
      const now = new Date();
      const timeRanges = {
        hour: new Date(now.getTime() - 60 * 60 * 1000),
        day: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      };

      const startTime = timeRanges[timeframe as keyof typeof timeRanges];

      // Query performance metrics from analytics events
      const performanceQuery = `
        SELECT 
          event_type,
          COUNT(*) as count,
          AVG(CAST(event_data->>'processingTime' AS NUMERIC)) as avg_processing_time,
          MAX(CAST(event_data->>'processingTime' AS NUMERIC)) as max_processing_time,
          MIN(CAST(event_data->>'processingTime' AS NUMERIC)) as min_processing_time
        FROM analytics_events
        WHERE timestamp >= $1
          AND event_data->>'processingTime' IS NOT NULL
        GROUP BY event_type
        ORDER BY count DESC
      `;

      const performanceResult = await DatabaseService.query(performanceQuery, [startTime]);

      // Query error rates
      const errorQuery = `
        SELECT 
          event_type,
          COUNT(*) as total_events,
          COUNT(CASE WHEN event_type LIKE '%_failed' THEN 1 END) as failed_events,
          ROUND(
            (COUNT(CASE WHEN event_type LIKE '%_failed' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 
            2
          ) as error_rate
        FROM analytics_events
        WHERE timestamp >= $1
        GROUP BY event_type
        HAVING COUNT(*) > 0
        ORDER BY error_rate DESC
      `;

      const errorResult = await DatabaseService.query(errorQuery, [startTime]);

      // Query user activity
      const activityQuery = `
        SELECT 
          DATE_TRUNC('hour', timestamp) as hour,
          COUNT(DISTINCT user_id) as active_users,
          COUNT(*) as total_events
        FROM analytics_events
        WHERE timestamp >= $1
        GROUP BY DATE_TRUNC('hour', timestamp)
        ORDER BY hour DESC
      `;

      const activityResult = await DatabaseService.query(activityQuery, [startTime]);

      // Query most active endpoints
      const endpointQuery = `
        SELECT 
          event_data->>'endpoint' as endpoint,
          COUNT(*) as requests,
          AVG(CAST(event_data->>'responseTime' AS NUMERIC)) as avg_response_time
        FROM analytics_events
        WHERE timestamp >= $1
          AND event_data->>'endpoint' IS NOT NULL
        GROUP BY event_data->>'endpoint'
        ORDER BY requests DESC
        LIMIT 20
      `;

      const endpointResult = await DatabaseService.query(endpointQuery, [startTime]);

      logger.info('Performance metrics retrieved', {
        userId: req.user!.id,
        timeframe,
        startTime,
      });

      return res.json({
        success: true,
        data: {
          timeframe,
          startTime,
          endTime: now,
          performance: performanceResult.rows,
          errors: errorResult.rows,
          activity: activityResult.rows,
          endpoints: endpointResult.rows,
        },
      });
    } catch (error) {
      logger.error('Failed to retrieve performance metrics', {
        userId: req.user!.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve performance metrics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

/**
 * @swagger
 * /api/monitoring/alerts:
 *   get:
 *     summary: Get system alerts (admin only)
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, resolved, acknowledged]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: System alerts retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/alerts', 
  authenticate, 
  requireAdmin, 
  analyticsRateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const severity = req.query.severity as string;
    const status = req.query.status as string;

    // For now, generate alerts based on system conditions
    // In a real system, you'd have a dedicated alerts table
    const alerts: any[] = [];

    try {
      // Check for high error rates
      const errorRateQuery = `
        SELECT 
          event_type,
          COUNT(*) as total_events,
          COUNT(CASE WHEN event_type LIKE '%_failed' THEN 1 END) as failed_events,
          ROUND(
            (COUNT(CASE WHEN event_type LIKE '%_failed' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 
            2
          ) as error_rate
        FROM analytics_events
        WHERE timestamp >= NOW() - INTERVAL '1 hour'
        GROUP BY event_type
        HAVING COUNT(*) > 10 AND 
               (COUNT(CASE WHEN event_type LIKE '%_failed' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) > 0.1
        ORDER BY error_rate DESC
      `;

      const errorRateResult = await DatabaseService.query(errorRateQuery);
      
      errorRateResult.rows.forEach(row => {
        alerts.push({
          id: `error_rate_${row.event_type}`,
          type: 'error_rate',
          severity: row.error_rate > 50 ? 'critical' : row.error_rate > 25 ? 'high' : 'medium',
          status: 'active',
          title: `High Error Rate: ${row.event_type}`,
          description: `Error rate of ${row.error_rate}% detected for ${row.event_type} (${row.failed_events}/${row.total_events} requests)`,
          timestamp: new Date().toISOString(),
          metadata: {
            event_type: row.event_type,
            error_rate: row.error_rate,
            failed_events: row.failed_events,
            total_events: row.total_events,
          },
        });
      });

      // Check system resources
      const memoryUsage = ((os.totalmem() - os.freemem()) / os.totalmem()) * 100;
      if (memoryUsage > 90) {
        alerts.push({
          id: 'high_memory_usage',
          type: 'resource',
          severity: 'critical',
          status: 'active',
          title: 'High Memory Usage',
          description: `Memory usage is at ${memoryUsage.toFixed(1)}%`,
          timestamp: new Date().toISOString(),
          metadata: {
            memory_usage: memoryUsage,
            total_memory: os.totalmem(),
            free_memory: os.freemem(),
          },
        });
      } else if (memoryUsage > 80) {
        alerts.push({
          id: 'elevated_memory_usage',
          type: 'resource',
          severity: 'high',
          status: 'active',
          title: 'Elevated Memory Usage',
          description: `Memory usage is at ${memoryUsage.toFixed(1)}%`,
          timestamp: new Date().toISOString(),
          metadata: {
            memory_usage: memoryUsage,
          },
        });
      }

      // Check database health
      const dbHealthy = await DatabaseService.healthCheck();
      const poolStats = DatabaseService.getPoolStats();
      if (!dbHealthy) {
        alerts.push({
          id: 'database_unhealthy',
          type: 'database',
          severity: 'critical',
          status: 'active',
          title: 'Database Health Check Failed',
          description: 'Database health check failed',
          timestamp: new Date().toISOString(),
          metadata: {
            pool: poolStats ? {
              totalCount: poolStats.totalCount,
              idleCount: poolStats.idleCount,
              waitingCount: poolStats.waitingCount,
            } : undefined,
          },
        });
      }

      // Filter alerts based on query parameters
      let filteredAlerts = alerts;
      
      if (severity) {
        filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity);
      }
      
      if (status) {
        filteredAlerts = filteredAlerts.filter(alert => alert.status === status);
      }

      // Sort by severity and timestamp
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      filteredAlerts.sort((a, b) => {
        const severityDiff = (severityOrder[b.severity as keyof typeof severityOrder] || 0) - 
                            (severityOrder[a.severity as keyof typeof severityOrder] || 0);
        if (severityDiff !== 0) return severityDiff;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      // Apply limit
      filteredAlerts = filteredAlerts.slice(0, limit);

      logger.info('System alerts retrieved', {
        userId: req.user!.id,
        totalAlerts: alerts.length,
        filteredAlerts: filteredAlerts.length,
        severity,
        status,
      });

      return res.json({
        success: true,
        data: filteredAlerts,
        summary: {
          total: alerts.length,
          filtered: filteredAlerts.length,
          bySeverity: {
            critical: alerts.filter(a => a.severity === 'critical').length,
            high: alerts.filter(a => a.severity === 'high').length,
            medium: alerts.filter(a => a.severity === 'medium').length,
            low: alerts.filter(a => a.severity === 'low').length,
          },
          byStatus: {
            active: alerts.filter(a => a.status === 'active').length,
            resolved: alerts.filter(a => a.status === 'resolved').length,
            acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to retrieve system alerts', {
        userId: req.user!.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve system alerts',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

export default router;