/**
 * Health Check API Endpoint
 *
 * Provides basic health status for the application and its services.
 * Used for monitoring and load balancer health checks.
 */

import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/apiAccess";
import { env } from "@/lib/env";
import { logger, safeError } from "@/lib/logger";
import { withRequestLogContext } from "@/lib/requestLogContext";
import { isAppInitialized } from "@/lib/startup";
import { getCronSchedulerStatus } from "@/services/cronScheduler";
import * as userRepository from "@/application/repositories/userRepository";

/**
 * Health check endpoint
 * Returns application status and service health
 */
export async function GET(request: NextRequest) {
  return withRequestLogContext(request, async () => {
    try {
      const startTime = Date.now();
      const authResult = await authorizeRequest(request, {
        requireAuth: false,
        allowCronSecret: true,
      });
      const includeDetailedStatus =
        authResult.ok &&
        (authResult.authenticatedBy === "cron" ||
          authResult.session?.role === "ADMIN");

      // Test database connectivity
      let dbHealth = "healthy";
      let dbResponseTime = 0;
      try {
        const dbStart = Date.now();
        await userRepository.findFirst();
        dbResponseTime = Date.now() - dbStart;
      } catch (error) {
        dbHealth = "unhealthy";
        logger.error(safeError(error), "Database health check failed:");
      }

      // Calculate total response time
      const responseTime = Date.now() - startTime;

      const healthData = {
        status: dbHealth === "healthy" ? "healthy" : "unhealthy",
        timestamp: new Date().toISOString(),
        initialized: isAppInitialized(),
        services: {
          database: {
            status: dbHealth,
          },
        },
        metrics: {
          responseTime,
        },
      };

      const responsePayload = includeDetailedStatus
        ? {
            ...healthData,
            uptime: process.uptime(),
            version: env.npm_package_version || "1.0.0",
            environment: env.NODE_ENV,
            services: {
              ...healthData.services,
              database: {
                status: dbHealth,
                responseTime: dbResponseTime,
              },
              cronScheduler: getCronSchedulerStatus(),
            },
            metrics: {
              ...healthData.metrics,
              memoryUsage: process.memoryUsage(),
              nodeVersion: process.version,
            },
          }
        : healthData;

      // Return appropriate HTTP status
      const httpStatus = healthData.status === "healthy" ? 200 : 503;

      return NextResponse.json(responsePayload, {
        status: httpStatus,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    } catch (error) {
      logger.error(safeError(error), "Health check error:");

      return NextResponse.json(
        {
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          initialized: isAppInitialized(),
        },
        {
          status: 503,
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }
  });
}
