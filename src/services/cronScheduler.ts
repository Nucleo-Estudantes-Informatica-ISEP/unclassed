import { CronExpressionParser } from "cron-parser";

import type { CronStats, LockLease, ScheduledJob } from "./cron/types";
import { env } from "@/lib/env";
import { logger, safeError, withJobExecution } from "@/lib/logger";
import type { CronExecution } from "@/application/repositories/cronExecutionRepository";

import { CronExecutionStore } from "./cron/executionStore";
import { CronJobHandlers } from "./cron/jobHandlers";
import { getLeaseHeartbeatInterval, JobLock } from "./cron/jobLock";
import { JobRegistry } from "./cron/jobRegistry";

export { getLeaseHeartbeatInterval } from "./cron/jobLock";

export function getNextCronRun(
  cronExpression: string,
  currentDate = new Date()
): Date {
  try {
    return CronExpressionParser.parse(cronExpression, { currentDate })
      .next()
      .toDate();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid cron expression "${cronExpression}": ${message}`);
  }
}

export class CronScheduler {
  private readonly registry = new JobRegistry();
  private readonly intervals = new Map<string, NodeJS.Timeout>();
  private readonly lock = new JobLock();
  private readonly handlers = new CronJobHandlers();
  private readonly executions = new CronExecutionStore();
  private started = false;

  constructor() {
    this.registerDefaultJobs();
  }

  start() {
    if (this.started) {
      logger.info("Cron scheduler already running");
      return;
    }

    logger.info("Starting internal cron scheduler...");
    this.started = true;

    try {
      for (const job of this.registry.values()) {
        if (job.enabled) this.scheduleJob(job);
      }
    } catch (error) {
      this.stop();
      throw error;
    }

    logger.info("Cron scheduler started with active jobs");
  }

  stop() {
    if (!this.started) return;

    logger.info("Stopping cron scheduler...");
    for (const interval of this.intervals.values()) clearInterval(interval);
    this.intervals.clear();
    this.started = false;
    logger.info("Cron scheduler stopped");
  }

  addJob(job: ScheduledJob) {
    if (this.started && job.enabled) this.scheduleJob(job);
    this.registry.add(job);
  }

  setJobEnabled(jobId: string, enabled: boolean) {
    const job = this.registry.setEnabled(jobId, enabled);
    if (!job) return;

    if (this.started) {
      if (enabled) this.scheduleJob(job);
      else this.unscheduleJob(jobId);
    }
  }

  getJobStatus() {
    return this.registry.status();
  }

  isRunning() {
    return this.started;
  }

  async getExecutionHistory(limit = 50): Promise<CronExecution[]> {
    return this.executions.history(limit);
  }

  async getCronStats(): Promise<CronStats> {
    return this.executions.stats(
      this.started,
      Array.from(this.registry.values())
    );
  }

  async runJobManually(jobId: string): Promise<void> {
    return withJobExecution(async () => {
      const job = this.registry.get(jobId);
      if (!job) throw new Error(`Job ${jobId} not found`);

      const lease = await this.lock.acquire(job.id, job.lockTimeout);
      if (!lease) throw new Error(`Job ${jobId} is already running`);
      await this.runJob(job, lease);
    });
  }

  private registerDefaultJobs() {
    this.addJob({
      id: "batch-matching",
      name: "Batch Matching",
      schedule: env.CRON_BATCH_MATCHING,
      handler: () => this.handlers.runBatchMatching(),
      enabled: true,
      isRunning: false,
      lockTimeout: 8 * 60 * 1_000,
    });
    this.addJob({
      id: "provisional-cleanup",
      name: "Provisional Match Cleanup",
      schedule: env.CRON_PROVISIONAL_CLEANUP,
      handler: () => this.handlers.cleanupProvisionalMatches(),
      enabled: true,
      isRunning: false,
      lockTimeout: 3 * 60 * 1_000,
    });
    this.addJob({
      id: "health-check",
      name: "System Health Check",
      schedule: env.CRON_HEALTH_CHECK,
      handler: () => this.handlers.runHealthCheck(),
      enabled: true,
      isRunning: false,
      lockTimeout: 2 * 60 * 1_000,
    });

    logger.info(
      {
        schedules: {
          batchMatching: env.CRON_BATCH_MATCHING,
          provisionalCleanup: env.CRON_PROVISIONAL_CLEANUP,
          healthCheck: env.CRON_HEALTH_CHECK,
        },
      },
      "Cron schedules configured"
    );
  }

  private scheduleJob(job: ScheduledJob) {
    job.nextRun = getNextCronRun(job.schedule);
    this.unscheduleJob(job.id);

    const interval = setInterval(
      () =>
        void withJobExecution(async () => {
          const now = new Date();
          if (!job.nextRun || now < job.nextRun || job.isRunning) return;

          const lease = await this.lock.acquire(job.id, job.lockTimeout);
          if (lease) void this.runJob(job, lease);
          else logger.info({ jobId: job.id }, "Job skipped: lock held");
          job.nextRun = getNextCronRun(job.schedule);
        }),
      1_000
    );

    this.intervals.set(job.id, interval);
    logger.info({ jobId: job.id, nextRun: job.nextRun }, "Scheduled job");
  }

  private unscheduleJob(jobId: string) {
    const interval = this.intervals.get(jobId);
    if (interval) clearInterval(interval);
    this.intervals.delete(jobId);
  }

  private async runJob(job: ScheduledJob, lease: LockLease) {
    if (job.isRunning) return;

    job.isRunning = true;
    job.lastRun = new Date();
    logger.info({ jobId: job.id }, "Running job");

    const startTime = Date.now();
    const heartbeat = setInterval(() => {
      void this.lock
        .renew(lease)
        .then((renewed) => {
          if (!renewed) {
            logger.error(
              { jobId: job.id },
              "Cron lock lease lost while job is running"
            );
          }
        })
        .catch((error) => {
          logger.error(
            { ...safeError(error), jobId: job.id },
            "Failed to renew cron lock"
          );
        });
    }, getLeaseHeartbeatInterval(lease.timeoutMs));
    heartbeat.unref?.();

    const execution = await this.executions.create(job);
    try {
      const result = await job.handler();
      const duration = Date.now() - startTime;
      logger.info({ jobId: job.id, durationMs: duration }, "Job completed");

      if (execution) {
        await this.executions.update(execution.id, {
          completedAt: new Date(),
          duration,
          status: "COMPLETED",
          processedPartitions: result?.processedPartitions,
          matchesFound: result?.matchesFound,
          expiredMatches: result?.expiredMatches,
          totalActiveRequests: result?.totalActiveRequests,
          metadata: result?.metadata,
          errors: result?.errors?.length ? result.errors : [],
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(
        { ...safeError(error), jobId: job.id, durationMs: duration },
        "Job failed"
      );

      if (execution) {
        await this.executions.update(execution.id, {
          completedAt: new Date(),
          duration,
          status: "FAILED",
          errors: [error instanceof Error ? error.message : String(error)],
        });
      }
    } finally {
      clearInterval(heartbeat);
      job.isRunning = false;
      await this.lock.release(lease);
    }
  }

  private enabledJobs() {
    return Array.from(this.registry.values()).filter((job) => job.enabled);
  }
}

let globalScheduler: CronScheduler | null = null;
let gracefulShutdownHooksRegistered = false;

export function getCronScheduler(): CronScheduler {
  globalScheduler ??= new CronScheduler();
  return globalScheduler;
}

export function getCronSchedulerStatus() {
  const enableScheduler = env.ENABLE_CRON_SCHEDULER;

  try {
    const cronScheduler = getCronScheduler();
    const jobStatus = cronScheduler.getJobStatus();

    return {
      enabled: enableScheduler,
      running: cronScheduler.isRunning(),
      jobs: jobStatus.map((job) => ({
        id: job.id,
        name: job.name,
        schedule: job.schedule,
        enabled: job.enabled,
        lastRun: job.lastRun,
        nextRun: job.nextRun,
        isRunning: job.isRunning,
      })),
    };
  } catch (error) {
    return {
      enabled: enableScheduler,
      running: false,
      jobs: [],
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

function registerGracefulShutdownHandlers() {
  if (gracefulShutdownHooksRegistered) return;

  const shutdown = () => {
    logger.info("Received shutdown signal, stopping cron scheduler...");
    shutdownCronScheduler();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
  gracefulShutdownHooksRegistered = true;
}

export function initializeCronScheduler() {
  const scheduler = getCronScheduler();
  if (env.ENABLE_CRON_SCHEDULER) {
    scheduler.start();
    registerGracefulShutdownHandlers();
  } else {
    logger.info("Cron scheduler disabled");
  }
}

export function shutdownCronScheduler() {
  globalScheduler?.stop();
  globalScheduler = null;
}
