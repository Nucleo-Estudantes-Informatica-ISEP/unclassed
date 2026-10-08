import { NextResponse } from "next/server";
import { z } from "zod";

import { defineHandler } from "@/lib/defineHandler";
import { logger } from "@/lib/logger";
import { getCronScheduler } from "@/services/cronScheduler";

/**
 * GET /api/admin/cron
 * Get comprehensive cron statistics and execution history
 * Admin-only endpoint
 */
export const GET = defineHandler({
  auth: {
    requireAdmin: true,
    rateLimit: "stats",
  },
  errorMessage: "Falha ao obter estatísticas do cron",
  handler: async () => {
    logger.info("Fetching fresh admin cron data");
    const scheduler = getCronScheduler();
    const [cronStats, executionHistory, jobStatus] = await Promise.all([
      scheduler.getCronStats(),
      scheduler.getExecutionHistory(100),
      scheduler.getJobStatus(),
    ]);
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      cronStats,
      executionHistory,
      jobStatus,
      scheduler: {
        isStarted: cronStats.schedulerStatus === "RUNNING",
        activeJobs: cronStats.activeJobs,
        nextScheduledRuns: cronStats.nextScheduledRuns,
      },
    });
  },
});

/**
 * POST /api/admin/cron
 * Manually trigger a cron job or control the scheduler
 * Admin-only endpoint
 */
export const POST = defineHandler({
  schema: z.object({ action: z.string(), jobId: z.string().optional() }),
  auth: {
    requireAdmin: true,
    enforceSameOriginForSessionWrites: true,
    rateLimit: "batch",
  },
  errorMessage: "Falha ao controlar o agendador cron",
  handler: async (context) => {
    const { action, jobId } = context.body;
    const scheduler = getCronScheduler();
    switch (action) {
      case "run_job":
        if (!jobId) {
          return NextResponse.json(
            { error: "O ID do job é obrigatório" },
            { status: 400 }
          );
        }

        await scheduler.runJobManually(jobId);
        logger.info("Admin manually triggered job:");
        return NextResponse.json({
          success: true,
          message: `Job ${jobId} executado com sucesso`,
          timestamp: new Date().toISOString(),
        });

      case "start_scheduler":
        scheduler.start();
        logger.info("Admin started cron scheduler");
        return NextResponse.json({
          success: true,
          message: "Agendador cron iniciado",
          timestamp: new Date().toISOString(),
        });

      case "stop_scheduler":
        scheduler.stop();
        logger.info("Admin stopped cron scheduler");
        return NextResponse.json({
          success: true,
          message: "Agendador cron parado",
          timestamp: new Date().toISOString(),
        });

      case "enable_job":
        if (!jobId) {
          return NextResponse.json(
            { error: "O ID do job é obrigatório" },
            { status: 400 }
          );
        }

        scheduler.setJobEnabled(jobId, true);
        logger.info("Admin enabled job:");
        return NextResponse.json({
          success: true,
          message: `Job ${jobId} enabled`,
          timestamp: new Date().toISOString(),
        });

      case "disable_job":
        if (!jobId) {
          return NextResponse.json(
            { error: "O ID do job é obrigatório" },
            { status: 400 }
          );
        }

        scheduler.setJobEnabled(jobId, false);
        logger.info("Admin disabled job:");
        return NextResponse.json({
          success: true,
          message: `Job ${jobId} disabled`,
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    }
  },
});
