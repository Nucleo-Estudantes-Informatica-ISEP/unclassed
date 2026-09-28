import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authorizeRequest } from "@/lib/apiAccess";
import { logger, safeError } from "@/lib/logger";
import { withRequestLogContext } from "@/lib/requestLogContext";
import { triggerImmediateMatching } from "@/services/matchingTriggers";
import { MatchingOrchestrator } from "@/application/matchingOrchestrator";

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
  return withRequestLogContext(request, async () => {
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

      logger.info("Immediate matching requested for request");

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
            ? `Encontrado(s) ${immediateMatches.length} match(es) imediato(s)!`
            : "Não foram encontrados matches imediatos; pedido adicionado à fila de processamento em lote",
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

      logger.error(safeError(error), "Matching error:");
      return NextResponse.json(
        { error: "Erro interno do servidor" },
        { status: 500 }
      );
    }
  });
}

/**
 * PUT /api/matching
 * Run batch processing on all active partitions
 * Admin-only endpoint, typically called by cron jobs
 */
export async function PUT(request: NextRequest) {
  return withRequestLogContext(request, async () => {
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

      logger.info("Batch processing requested");

      const matchingService = new MatchingOrchestrator();

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
      logger.error(safeError(error), "Batch processing error:");
      return NextResponse.json(
        { error: "Erro interno do servidor" },
        { status: 500 }
      );
    }
  });
}

/**
 * GET /api/matching
 * Get comprehensive matching statistics and system status
 */
export async function GET(request: NextRequest) {
  return withRequestLogContext(request, async () => {
    try {
      const authResult = await authorizeRequest(request, {
        requireAdmin: true,
        allowCronSecret: true,
        rateLimit: "stats",
      });

      if (!authResult.ok) {
        return authResult.response;
      }

      const matchingService = new MatchingOrchestrator();
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
      logger.error(safeError(error), "Stats error:");
      return NextResponse.json(
        { error: "Erro interno do servidor" },
        { status: 500 }
      );
    }
  });
}
