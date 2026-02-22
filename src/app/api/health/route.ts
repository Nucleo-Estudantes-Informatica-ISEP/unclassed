/**
 * Health Check API Endpoint
 *
 * Provides basic health status for the application and its services.
 * Used for monitoring and load balancer health checks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCronSchedulerStatus } from '@/lib/cronInit';
import { isAppInitialized } from '@/lib/startup';
import prisma from '@/lib/prisma';

/**
 * Health check endpoint
 * Returns application status and service health
 */
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();

    // Test database connectivity
    let dbHealth = 'healthy';
    let dbResponseTime = 0;
    try {
      const dbStart = Date.now();
      await prisma.user.findFirst();
      dbResponseTime = Date.now() - dbStart;
    } catch (error) {
      dbHealth = 'unhealthy';
      console.error('Database health check failed:', error);
    }

    // Get cron scheduler status
    const cronStatus = getCronSchedulerStatus();

    // Calculate total response time
    const responseTime = Date.now() - startTime;

    const healthData = {
      status: dbHealth === 'healthy' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      initialized: isAppInitialized(),
      services: {
        database: {
          status: dbHealth,
          responseTime: dbResponseTime
        },
        cronScheduler: cronStatus
      },
      metrics: {
        responseTime,
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version
      }
    };

    // Return appropriate HTTP status
    const httpStatus = healthData.status === 'healthy' ? 200 : 503;

    return NextResponse.json(healthData, {
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Health check error:', error);

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      initialized: isAppInitialized()
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}
