import { NextResponse } from "next/server";
import { z } from "zod";

import { defineHandler } from "@/lib/defineHandler";
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
export const POST = defineHandler({
  auth: {
    requireAdmin: true,
    allowCronSecret: true,
    enforceSameOriginForSessionWrites: true,
    rateLimit: "matching",
  },
  schema: matchingRequestSchema,
  handler: async (context) => {
    const { requestId, requestType } = context.body;
    console.log(
      `Immediate matching requested for ${requestType} request ${requestId}`
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
          ? `Encontrado(s) ${immediateMatches.length} match(es) imediato(s)!`
          : "Não foram encontrados matches imediatos; pedido adicionado à fila de processamento em lote",
      requestId,
      requestType,
      requestedBy:
        context.authenticatedBy === "cron"
          ? "cron"
          : context.session?.email || "admin",
    });
  },
});

/**
 * PUT /api/matching
 * Run batch processing on all active partitions
 * Admin-only endpoint, typically called by cron jobs
 */
export const PUT = defineHandler({
  auth: {
    requireAdmin: true,
    allowCronSecret: true,
    enforceSameOriginForSessionWrites: true,
    rateLimit: "batch",
  },

  handler: async (context) => {
    console.log("Batch processing requested");
    const matchingService = new MatchingOrchestrator();
    const results = await matchingService.runBatchProcessing();
    const expiredCount = await matchingService.expireProvisionalMatches();
    return NextResponse.json({
      success: true,
      ...results,
      expiredProvisionalMatches: expiredCount,
      message: `Processamento em lote concluído: ${results.matchesFound} novos matches, ${expiredCount} matches provisórios expiraram`,
      executedBy:
        context.authenticatedBy === "cron"
          ? "cron"
          : context.session?.email || "admin",
    });
  },
});

/**
 * GET /api/matching
 * Get comprehensive matching statistics and system status
 */
export const GET = defineHandler({
  auth: {
    requireAdmin: true,
    allowCronSecret: true,
    rateLimit: "stats",
  },

  handler: async (context) => {
    const matchingService = new MatchingOrchestrator();
    const stats = await matchingService.getAdvancedStats();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      requestedBy:
        context.authenticatedBy === "cron"
          ? "cron"
          : context.session?.email || "admin",
      ...stats,
    });
  },
});
