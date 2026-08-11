/**
 * Health Check API Endpoint
 *
 * Provides basic health status for the application and its services.
 * Used for monitoring and load balancer health checks.
 */

import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/apiAccess";
import { getCronSchedulerStatus } from "@/lib/cronInit";
import prisma from "@/lib/prisma";
import { isAppInitialized } from "@/lib/startup";

/**
 * Health check endpoint
 * Returns application status and service health
 */
export async function GET(request: NextRequest) {
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
      await prisma.user.findFirst();
      dbResponseTime = Date.now() - dbStart;
    } catch (error) {
      dbHealth = "unhealthy";
      console.error("Database health check failed:", error);
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
          version: process.env.npm_package_version || "1.0.0",
          environment: process.env.NODE_ENV || "development",
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
    console.error("Health check error:", error);

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
}
