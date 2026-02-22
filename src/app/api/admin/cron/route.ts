import { NextRequest, NextResponse } from "next/server";
import getServerSession from "@/services/getServerSession";
import { getCronScheduler } from "@/services/cronScheduler";
import { getCache, CacheKeys } from "@/services/cache";

/**
 * GET /api/admin/cron
 * Get comprehensive cron statistics and execution history
 * Admin-only endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso de administrador necessário" }, { status: 403 });
    }

    const cache = getCache();
    const cacheTTL = parseInt(process.env.ADMIN_CACHE_TTL || '300'); // Default 5 minutes
    
    // Try to get cached data first
    const cachedStats = cache.get(CacheKeys.ADMIN_CRON_STATS);
    const cachedHistory = cache.get(CacheKeys.ADMIN_EXECUTION_HISTORY);
    const cachedJobs = cache.get(CacheKeys.ADMIN_JOB_STATUS);
    
    if (cachedStats && cachedHistory && cachedJobs) {
      console.log('📦 Serving admin cron data from cache');
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        cached: true,
        cronStats: cachedStats,
        executionHistory: cachedHistory,
        jobStatus: cachedJobs,
        scheduler: {
          isStarted: (cachedStats as any).schedulerStatus === 'RUNNING',
          activeJobs: (cachedStats as any).activeJobs || 0,
          nextScheduledRuns: (cachedStats as any).nextScheduledRuns || []
        }
      });
    }

    console.log('🔍 Fetching fresh admin cron data');
    const scheduler = getCronScheduler();
    
    // Get comprehensive cron statistics
    const [cronStats, executionHistory, jobStatus] = await Promise.all([
      scheduler.getCronStats(),
      scheduler.getExecutionHistory(100),
      scheduler.getJobStatus()
    ]);

    // Cache the results
    cache.set(CacheKeys.ADMIN_CRON_STATS, cronStats, cacheTTL);
    cache.set(CacheKeys.ADMIN_EXECUTION_HISTORY, executionHistory, cacheTTL);
    cache.set(CacheKeys.ADMIN_JOB_STATUS, jobStatus, cacheTTL);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      cached: false,
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
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso de administrador necessário" }, { status: 403 });
    }

    const body = await request.json();
    const { action, jobId } = body;

    const scheduler = getCronScheduler();
    const cache = getCache();

    // Helper function to invalidate admin cron cache
    const invalidateCache = () => {
      cache.deletePattern('admin:cron:.*');
      console.log('🗑️ Invalidated admin cron cache');
    };

    switch (action) {
      case "run_job":
        if (!jobId) {
          return NextResponse.json({ error: "O ID do job é obrigatório" }, { status: 400 });
        }
        
        await scheduler.runJobManually(jobId);
        console.log(`🚀 Admin manually triggered job: ${jobId}`);
        invalidateCache();
        
        return NextResponse.json({
          success: true,
          message: `Job ${jobId} executado com sucesso`,
          timestamp: new Date().toISOString()
        });

      case "start_scheduler":
        scheduler.start();
        console.log("🚀 Admin started cron scheduler");
        invalidateCache();
        
        return NextResponse.json({
          success: true,
          message: "Agendador cron iniciado",
          timestamp: new Date().toISOString()
        });

      case "stop_scheduler":
        scheduler.stop();
        console.log("🛑 Admin stopped cron scheduler");
        invalidateCache();
        
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
        invalidateCache();
        
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
        invalidateCache();
        
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
