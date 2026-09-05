/**
 * Application Initialization Endpoint
 *
 * This endpoint is called during application startup to initialize
 * all background services like the cron scheduler.
 */

import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/apiAccess";
import { initializeApplication, isAppInitialized } from "@/lib/startup";
import { getCronSchedulerStatus } from "@/services/cronScheduler";

/**
 * Initialize application services
 * This endpoint should be called once during application startup
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authorizeRequest(request, {
      requireAdmin: true,
      allowCronSecret: true,
      enforceSameOriginForSessionWrites: true,
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    // Initialize the application
    initializeApplication();

    // Get status information
    const cronStatus = getCronSchedulerStatus();

    return NextResponse.json({
      success: true,
      message: "Aplicação inicializada com sucesso",
      initializedBy:
        authResult.authenticatedBy === "cron"
          ? "cron"
          : authResult.session?.email || "admin",
      initialized: isAppInitialized(),
      services: {
        cronScheduler: cronStatus,
      },
    });
  } catch (error) {
    console.error("Failed to initialize application:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Falha ao inicializar a aplicação",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

/**
 * Get application initialization status
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorizeRequest(request, {
      requireAdmin: true,
      allowCronSecret: true,
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const cronStatus = getCronSchedulerStatus();

    return NextResponse.json({
      initialized: isAppInitialized(),
      requestedBy:
        authResult.authenticatedBy === "cron"
          ? "cron"
          : authResult.session?.email || "admin",
      services: {
        cronScheduler: cronStatus,
      },
    });
  } catch (error) {
    console.error("Failed to get application status:", error);

    return NextResponse.json(
      {
        initialized: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
