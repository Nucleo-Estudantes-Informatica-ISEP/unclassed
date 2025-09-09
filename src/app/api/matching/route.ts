import { NextRequest, NextResponse } from "next/server";
import { AdvancedMatchingService } from "@/services/advancedMatchingService";

/**
 * POST /api/matching
 * Trigger immediate direct matching for a specific request
 * Used when a new request is created or modified
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, requestType } = body;

    if (!requestId || !requestType) {
      return NextResponse.json(
        { error: "Missing requestId or requestType" }, 
        { status: 400 }
      );
    }

    console.log(`🔍 Immediate matching requested for ${requestType} request ${requestId}`);
    
    const matchingService = new AdvancedMatchingService();
    
    // Update request partition info
    await matchingService.updateRequestPartition(requestId, requestType);
    
    // Process immediate matches (< 5 seconds)
    const immediateMatches = await matchingService.processImmediateMatches(requestId);
    
    return NextResponse.json({
      success: true,
      immediateMatches: immediateMatches.length,
      matches: immediateMatches,
      message: immediateMatches.length > 0 
        ? `🎉 Found ${immediateMatches.length} immediate match(es)!`
        : "⏳ No immediate matches found, added to queue for batch processing",
      requestId,
      requestType,
      userId: request.headers.get('user-id') || 'anonymous'
    });

  } catch (error) {
    console.error('Matching error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
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
    console.log('🔄 Batch processing requested');
    
    const matchingService = new AdvancedMatchingService();
    
    // Run batch processing
    const results = await matchingService.runBatchProcessing();
    
    // Expire old provisional matches
    const expiredCount = await matchingService.expireProvisionalMatches();
    
    return NextResponse.json({
      success: true,
      ...results,
      expiredProvisionalMatches: expiredCount,
      message: `Batch processing completed: ${results.matchesFound} new matches, ${expiredCount} provisional matches expired`,
      executedBy: 'system'
    });

  } catch (error) {
    console.error('Batch processing error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
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
    const matchingService = new AdvancedMatchingService();
    const stats = await matchingService.getAdvancedStats();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      requestedBy: 'anonymous',
      ...stats
    });

  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
