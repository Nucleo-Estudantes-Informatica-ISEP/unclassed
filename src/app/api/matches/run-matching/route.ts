import { NextRequest, NextResponse } from "next/server";
import getServerSession from "@/services/getServerSession";
import { MatchingService } from "@/services/matchingService";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const matchingService = new MatchingService();
    const createdMatches = await matchingService.runMatchingAlgorithm();

    return NextResponse.json({
      message: "Matching algorithm completed successfully",
      matchesCreated: createdMatches.length,
      matches: createdMatches
    });

  } catch (error) {
    console.error("Error running matching algorithm:", error);
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

    const matchingService = new MatchingService();
    const stats = await matchingService.getMatchingStats();

    return NextResponse.json(stats);

  } catch (error) {
    console.error("Error getting matching stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
