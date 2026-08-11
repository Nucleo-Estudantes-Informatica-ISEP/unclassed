import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/apiAccess";
import { AdvancedMatchingService } from "@/services/advancedMatchingService";

export async function POST(request: NextRequest) {
  try {
    const authResult = await authorizeRequest(request, {
      requireAdmin: true,
      enforceSameOriginForSessionWrites: true,
    });
    if (!authResult.ok) {
      return authResult.response;
    }

    const matchingService = new AdvancedMatchingService();
    
    // Run batch processing (equivalent to the old algorithm)
    const results = await matchingService.runBatchProcessing();
    
    // Also expire provisional matches
    const expiredCount = await matchingService.expireProvisionalMatches();

    return NextResponse.json({
      message: "Algoritmo avançado de matching concluído com sucesso",
      matchesCreated: results.matchesFound,
      processedPartitions: results.processedPartitions,
      expiredProvisionalMatches: expiredCount,
      totalProcessingTime: results.totalProcessingTime,
      errors: results.errors
    });

  } catch (error) {
    console.error("Error running advanced matching algorithm:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authorizeRequest(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const matchingService = new AdvancedMatchingService();
    const stats = await matchingService.getAdvancedStats();

    return NextResponse.json(stats);

  } catch (error) {
    console.error("Error getting matching stats:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
