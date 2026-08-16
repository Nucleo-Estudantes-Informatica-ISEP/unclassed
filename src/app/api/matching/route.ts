import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authorizeRequest } from "@/lib/apiAccess";
import { AdvancedMatchingService } from "@/services/advancedMatchingService";
import { triggerImmediateMatching } from "@/services/matchingTriggers";

const matchingRequestSchema = z.object({
  requestId: z.string().min(1),
  requestType: z.enum(["single", "bundle"]),
});

/**
 * POST /api/matching
 * Trigger immediate direct matching for a specific request
 * Used when a new request is created or modified
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authorizeRequest(request, {
      requireAdmin: true,
      allowCronSecret: true,
      enforceSameOriginForSessionWrites: true,
      rateLimit: "matching",
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { requestId, requestType } = matchingRequestSchema.parse(
      await request.json()
    );

    console.log(
      `🔍 Immediate matching requested for ${requestType} request ${requestId}`
    );

    const immediateMatches = await triggerImmediateMatching(
      requestId,
      requestType
    );

    return NextResponse.json({
      success: true,
      immediateMatches: immediateMatches.length,
      matches: immediateMatches,
      message:
        immediateMatches.length > 0
          ? `🎉 Encontrado(s) ${immediateMatches.length} match(es) imediato(s)!`
          : "⏳ Não foram encontrados matches imediatos; pedido adicionado à fila de processamento em lote",
      requestId,
      requestType,
      requestedBy:
        authResult.authenticatedBy === "cron"
          ? "cron"
          : authResult.session?.email || "admin",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validação falhou", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Matching error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/matching
 * Run batch processing on all active partitions
 * Admin-only endpoint, typically called by cron jobs
 */
export async function PUT(request: NextRequest) {
  try {
    const authResult = await authorizeRequest(request, {
      requireAdmin: true,
      allowCronSecret: true,
      enforceSameOriginForSessionWrites: true,
      rateLimit: "batch",
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    console.log("🔄 Batch processing requested");

    const matchingService = new AdvancedMatchingService();

    // Run batch processing
    const results = await matchingService.runBatchProcessing();

    // Expire old provisional matches
    const expiredCount = await matchingService.expireProvisionalMatches();

    return NextResponse.json({
      success: true,
      ...results,
      expiredProvisionalMatches: expiredCount,
      message: `Processamento em lote concluído: ${results.matchesFound} novos matches, ${expiredCount} matches provisórios expiraram`,
      executedBy:
        authResult.authenticatedBy === "cron"
          ? "cron"
          : authResult.session?.email || "admin",
    });
  } catch (error) {
    console.error("Batch processing error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/matching
 * Get comprehensive matching statistics and system status
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorizeRequest(request, {
      requireAdmin: true,
      allowCronSecret: true,
      rateLimit: "stats",
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const matchingService = new AdvancedMatchingService();
    const stats = await matchingService.getAdvancedStats();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      requestedBy:
        authResult.authenticatedBy === "cron"
          ? "cron"
          : authResult.session?.email || "admin",
      ...stats,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
