import { NextRequest, NextResponse } from "next/server";
import getServerSession from "@/services/getServerSession";
import { AdvancedMatchingService } from "@/services/advancedMatchingService";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const matchingService = new AdvancedMatchingService();
    
    // Run batch processing (equivalent to the old algorithm)
    const results = await matchingService.runBatchProcessing();
    
    // Also expire provisional matches
    const expiredCount = await matchingService.expireProvisionalMatches();

    return NextResponse.json({
      message: "Advanced matching algorithm completed successfully",
      matchesCreated: results.matchesFound,
      processedPartitions: results.processedPartitions,
      expiredProvisionalMatches: expiredCount,
      totalProcessingTime: results.totalProcessingTime,
      errors: results.errors
    });

  } catch (error) {
    console.error("Error running advanced matching algorithm:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const matchingService = new AdvancedMatchingService();
    const stats = await matchingService.getAdvancedStats();

    return NextResponse.json(stats);

  } catch (error) {
    console.error("Error getting matching stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
