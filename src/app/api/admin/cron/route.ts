import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/apiAccess";
import { getCronScheduler } from "@/services/cronScheduler";

/**
 * GET /api/admin/cron
 * Get comprehensive cron statistics and execution history
 * Admin-only endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorizeRequest(request, { requireAdmin: true });
    if (!authResult.ok) {
      return authResult.response;
    }

    console.log('🔍 Fetching fresh admin cron data');
    const scheduler = getCronScheduler();
    
    // Get comprehensive cron statistics
    const [cronStats, executionHistory, jobStatus] = await Promise.all([
      scheduler.getCronStats(),
      scheduler.getExecutionHistory(100),
      scheduler.getJobStatus()
    ]);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      cronStats,
      executionHistory,
      jobStatus,
      scheduler: {
        isStarted: cronStats.schedulerStatus === 'RUNNING',
        activeJobs: cronStats.activeJobs,
        nextScheduledRuns: cronStats.nextScheduledRuns
      }
    });

  } catch (error) {
    console.error("Error getting cron statistics:", error);
    return NextResponse.json(
      { error: "Falha ao obter estatísticas do cron" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/cron
 * Manually trigger a cron job or control the scheduler
 * Admin-only endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authorizeRequest(request, {
      requireAdmin: true,
      enforceSameOriginForSessionWrites: true,
    });
    if (!authResult.ok) {
      return authResult.response;
    }

    const body = await request.json();
    const { action, jobId } = body;

    const scheduler = getCronScheduler();
    switch (action) {
      case "run_job":
        if (!jobId) {
          return NextResponse.json({ error: "O ID do job é obrigatório" }, { status: 400 });
        }
        
        await scheduler.runJobManually(jobId);
        console.log(`🚀 Admin manually triggered job: ${jobId}`);
        return NextResponse.json({
          success: true,
          message: `Job ${jobId} executado com sucesso`,
          timestamp: new Date().toISOString()
        });

      case "start_scheduler":
        scheduler.start();
        console.log("🚀 Admin started cron scheduler");
        return NextResponse.json({
          success: true,
          message: "Agendador cron iniciado",
          timestamp: new Date().toISOString()
        });

      case "stop_scheduler":
        scheduler.stop();
        console.log("🛑 Admin stopped cron scheduler");
        return NextResponse.json({
          success: true,
          message: "Agendador cron parado",
          timestamp: new Date().toISOString()
        });

      case "enable_job":
        if (!jobId) {
          return NextResponse.json({ error: "O ID do job é obrigatório" }, { status: 400 });
        }
        
        scheduler.setJobEnabled(jobId, true);
        console.log(`✅ Admin enabled job: ${jobId}`);
        return NextResponse.json({
          success: true,
          message: `Job ${jobId} enabled`,
          timestamp: new Date().toISOString()
        });

      case "disable_job":
        if (!jobId) {
          return NextResponse.json({ error: "O ID do job é obrigatório" }, { status: 400 });
        }
        
        scheduler.setJobEnabled(jobId, false);
        console.log(`❌ Admin disabled job: ${jobId}`);
        return NextResponse.json({
          success: true,
          message: `Job ${jobId} disabled`,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    }

  } catch (error) {
    console.error("Error controlling cron scheduler:", error);
    return NextResponse.json(
      { 
        error: "Falha ao controlar o agendador cron", 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
