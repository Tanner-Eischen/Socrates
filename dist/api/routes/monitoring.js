"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const DatabaseService_1 = require("../services/DatabaseService");
const AnalyticsService_1 = require("../services/AnalyticsService");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../middleware/logger");
const os_1 = __importDefault(require("os"));
const process_1 = __importDefault(require("process"));
const router = (0, express_1.Router)();
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
router.get('/health', rateLimiter_1.rateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const startTime = Date.now();
    const healthChecks = {
        timestamp: new Date().toISOString(),
        uptime: process_1.default.uptime(),
        version: process_1.default.env.npm_package_version || '1.0.0',
        services: {},
    };
    // Check database health
    try {
        const dbStartTime = Date.now();
        const dbHealthy = await DatabaseService_1.DatabaseService.healthCheck();
        const poolStats = DatabaseService_1.DatabaseService.getPoolStats();
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
    }
    catch (error) {
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
    const allServicesHealthy = Object.values(healthChecks.services).every((service) => service.status === 'healthy');
    const someServicesUnhealthy = Object.values(healthChecks.services).some((service) => service.status === 'unhealthy');
    healthChecks.status = allServicesHealthy ? 'healthy' :
        someServicesUnhealthy ? 'unhealthy' : 'degraded';
    const statusCode = healthChecks.status === 'healthy' ? 200 :
        healthChecks.status === 'degraded' ? 200 : 503;
    logger_1.logger.info('Health check completed', {
        status: healthChecks.status,
        responseTime: apiResponseTime,
        services: Object.keys(healthChecks.services),
    });
    return res.status(statusCode).json({
        success: true,
        data: healthChecks,
    });
}));
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
router.get('/metrics', auth_1.authenticate, auth_1.requireAdmin, rateLimiter_1.analyticsRateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const startTime = Date.now();
    // System metrics
    const systemMetrics = {
        timestamp: new Date().toISOString(),
        system: {
            platform: os_1.default.platform(),
            arch: os_1.default.arch(),
            nodeVersion: process_1.default.version,
            uptime: process_1.default.uptime(),
            pid: process_1.default.pid,
        },
        memory: {
            total: os_1.default.totalmem(),
            free: os_1.default.freemem(),
            used: os_1.default.totalmem() - os_1.default.freemem(),
            usage: ((os_1.default.totalmem() - os_1.default.freemem()) / os_1.default.totalmem()) * 100,
            process: process_1.default.memoryUsage(),
        },
        cpu: {
            cores: os_1.default.cpus().length,
            loadAverage: os_1.default.loadavg(),
            usage: process_1.default.cpuUsage(),
        },
    };
    // Database metrics
    let databaseMetrics = {};
    try {
        const dbHealthy = await DatabaseService_1.DatabaseService.healthCheck();
        const poolStats = DatabaseService_1.DatabaseService.getPoolStats();
        databaseMetrics = {
            isHealthy: dbHealthy,
            pool: poolStats ? {
                totalCount: poolStats.totalCount,
                idleCount: poolStats.idleCount,
                waitingCount: poolStats.waitingCount,
            } : undefined,
        };
    }
    catch (error) {
        databaseMetrics = {
            isHealthy: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
    // Application metrics from analytics
    let applicationMetrics = {};
    try {
        applicationMetrics = await AnalyticsService_1.AnalyticsService.getSystemMetrics();
    }
    catch (error) {
        logger_1.logger.error('Failed to get application metrics', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        applicationMetrics = {
            error: 'Failed to retrieve application metrics',
        };
    }
    const responseTime = Date.now() - startTime;
    logger_1.logger.info('System metrics retrieved', {
        userId: req.user.id,
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
}));
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
router.get('/logs', auth_1.authenticate, auth_1.requireAdmin, rateLimiter_1.analyticsRateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const offset = parseInt(req.query.offset) || 0;
    const level = req.query.level;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    try {
        // Query system logs from database
        let query = `
        SELECT id, level, message, metadata, timestamp, correlation_id
        FROM system_logs
        WHERE 1=1
      `;
        const params = [];
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
        const result = await DatabaseService_1.DatabaseService.query(query, params);
        // Get total count for pagination
        let countQuery = `
        SELECT COUNT(*) as total
        FROM system_logs
        WHERE 1=1
      `;
        const countParams = [];
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
        const countResult = await DatabaseService_1.DatabaseService.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);
        logger_1.logger.info('System logs retrieved', {
            userId: req.user.id,
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
    }
    catch (error) {
        logger_1.logger.error('Failed to retrieve system logs', {
            userId: req.user.id,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve system logs',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}));
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
router.get('/performance', auth_1.authenticate, auth_1.requireAdmin, rateLimiter_1.analyticsRateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const timeframe = req.query.timeframe || 'day';
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
        const startTime = timeRanges[timeframe];
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
        const performanceResult = await DatabaseService_1.DatabaseService.query(performanceQuery, [startTime]);
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
        const errorResult = await DatabaseService_1.DatabaseService.query(errorQuery, [startTime]);
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
        const activityResult = await DatabaseService_1.DatabaseService.query(activityQuery, [startTime]);
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
        const endpointResult = await DatabaseService_1.DatabaseService.query(endpointQuery, [startTime]);
        logger_1.logger.info('Performance metrics retrieved', {
            userId: req.user.id,
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
    }
    catch (error) {
        logger_1.logger.error('Failed to retrieve performance metrics', {
            userId: req.user.id,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve performance metrics',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}));
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
router.get('/alerts', auth_1.authenticate, auth_1.requireAdmin, rateLimiter_1.analyticsRateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const severity = req.query.severity;
    const status = req.query.status;
    // For now, generate alerts based on system conditions
    // In a real system, you'd have a dedicated alerts table
    const alerts = [];
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
        const errorRateResult = await DatabaseService_1.DatabaseService.query(errorRateQuery);
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
        const memoryUsage = ((os_1.default.totalmem() - os_1.default.freemem()) / os_1.default.totalmem()) * 100;
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
                    total_memory: os_1.default.totalmem(),
                    free_memory: os_1.default.freemem(),
                },
            });
        }
        else if (memoryUsage > 80) {
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
        const dbHealthy = await DatabaseService_1.DatabaseService.healthCheck();
        const poolStats = DatabaseService_1.DatabaseService.getPoolStats();
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
            const severityDiff = (severityOrder[b.severity] || 0) -
                (severityOrder[a.severity] || 0);
            if (severityDiff !== 0)
                return severityDiff;
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
        // Apply limit
        filteredAlerts = filteredAlerts.slice(0, limit);
        logger_1.logger.info('System alerts retrieved', {
            userId: req.user.id,
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
    }
    catch (error) {
        logger_1.logger.error('Failed to retrieve system alerts', {
            userId: req.user.id,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve system alerts',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}));
exports.default = router;
//# sourceMappingURL=monitoring.js.map