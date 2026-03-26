import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/apiAccess";
import { AdvancedMatchingService } from "@/services/advancedMatchingService";

/**
 * GET/POST /api/cron/batch-matching
 * Scheduled endpoint for batch processing matches
 * Called by internal cron scheduler, external cron services, or manual triggers
 */
export async function GET(request: NextRequest) {
  return handleBatchMatching(request);
}

export async function POST(request: NextRequest) {
  return handleBatchMatching(request);
}

async function handleBatchMatching(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const authResult = await authorizeRequest(request, {
      requireAdmin: true,
      allowCronSecret: true,
      enforceSameOriginForSessionWrites: true,
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const startTime = Date.now();
    const triggerSource =
      authResult.authenticatedBy === "cron"
        ? "cron:scheduled"
        : `user:${authResult.session?.email || "admin"}`;
    console.log(
      `🔄 Starting batch matching triggered by ${triggerSource} at ${new Date().toISOString()}`
    );

    const matchingService = new AdvancedMatchingService();

    // Run batch processing
    const results = await matchingService.runBatchProcessing();

    // Expire old provisional matches
    const expiredCount = await matchingService.expireProvisionalMatches();

    const totalTime = Date.now() - startTime;

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      executionTime: totalTime,
      triggerSource,
      ...results,
      expiredProvisionalMatches: expiredCount,
      message: `✅ Processamento em lote concluído com sucesso`,
    };

    console.log(`✅ Batch matching completed in ${totalTime}ms:`, {
      partitions: results.processedPartitions,
      matches: results.matchesFound,
      expired: expiredCount,
      errors: results.errors.length,
      triggerSource,
    });

    // Log errors if any
    if (results.errors.length > 0) {
      console.warn("⚠️ Batch processing errors:", results.errors);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Scheduled batch matching failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        timestamp: new Date().toISOString(),
        message: `❌ O processamento em lote agendado falhou: ${error}`,
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint
 */
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
