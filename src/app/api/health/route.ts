/**
 * Health Check API Endpoint
 *
 * Provides basic health status for the application and its services.
 * Used for monitoring and load balancer health checks.
 */

import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/defineHandler";
import { env } from "@/lib/env";
import { isAppInitialized } from "@/lib/startup";
import { getCronSchedulerStatus } from "@/services/cronScheduler";
import * as userRepository from "@/application/repositories/userRepository";

/**
 * Health check endpoint
 * Returns application status and service health
 */
export const GET = defineHandler({
  auth: {
    requireAuth: false,
    allowCronSecret: true,
  },
  onError: (error) => {
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
  },
  handler: async (context) => {
    const startTime = Date.now();
    const includeDetailedStatus =
      context.authenticatedBy === "cron" || context.session?.role === "ADMIN";
    let dbHealth = "healthy";
    let dbResponseTime = 0;
    try {
      const dbStart = Date.now();
      await userRepository.findFirst();
      dbResponseTime = Date.now() - dbStart;
    } catch (error) {
      dbHealth = "unhealthy";
      console.error("Database health check failed:", error);
    }
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
    const httpStatus = healthData.status === "healthy" ? 200 : 503;
    return NextResponse.json(responsePayload, {
      status: httpStatus,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  },
});
