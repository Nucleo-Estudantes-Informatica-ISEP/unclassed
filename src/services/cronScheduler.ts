import type { CronExecution } from "@prisma/client";
import { CronExpressionParser } from "cron-parser";

import type { CronStats, LockLease, ScheduledJob } from "./cron/types";
import { env } from "@/lib/env";

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
      console.log("🔄 Cron scheduler already running");
      return;
    }

    console.log("🚀 Starting internal cron scheduler...");
    this.started = true;

    try {
      for (const job of this.registry.values()) {
        if (job.enabled) this.scheduleJob(job);
      }
    } catch (error) {
      this.stop();
      throw error;
    }

    console.log(
      `✅ Cron scheduler started with ${this.enabledJobs().length} active jobs`
    );
  }

  stop() {
    if (!this.started) return;

    console.log("🛑 Stopping cron scheduler...");
    for (const interval of this.intervals.values()) clearInterval(interval);
    this.intervals.clear();
    this.started = false;
    console.log("✅ Cron scheduler stopped");
  }

  addJob(job: ScheduledJob) {
    if (this.started && job.enabled) this.scheduleJob(job);
    this.registry.add(job);
  }

  setJobEnabled(jobId: string, enabled: boolean) {
    const job = this.registry.get(jobId);
    if (!job) return;

    if (this.started) {
      if (enabled) this.scheduleJob(job);
      else this.unscheduleJob(jobId);
    }
    this.registry.setEnabled(jobId, enabled);
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
    const job = this.registry.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    const lease = await this.lock.acquire(job.id, job.lockTimeout);
    if (!lease) throw new Error(`Job ${jobId} is already running`);
    await this.runJob(job, lease);
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

    console.log("🕐 Cron schedules configured:");
    console.log(`  - Batch Matching: ${env.CRON_BATCH_MATCHING} (lock: 8min)`);
    console.log(
      `  - Provisional Cleanup: ${env.CRON_PROVISIONAL_CLEANUP} (lock: 3min)`
    );
    console.log(`  - Health Check: ${env.CRON_HEALTH_CHECK} (lock: 2min)`);
  }

  private scheduleJob(job: ScheduledJob) {
    job.nextRun = getNextCronRun(job.schedule);
    this.unscheduleJob(job.id);

    const interval = setInterval(async () => {
      const now = new Date();
      if (!job.nextRun || now < job.nextRun || job.isRunning) return;

      const lease = await this.lock.acquire(job.id, job.lockTimeout);
      if (lease) void this.runJob(job, lease);
      else
        console.log(
          `🔒 Job '${job.name}' skipped - another instance is running`
        );
      job.nextRun = getNextCronRun(job.schedule);
    }, 1_000);

    this.intervals.set(job.id, interval);
    console.log(
      `📅 Scheduled job '${job.name}' - next run: ${job.nextRun.toISOString()}, check interval: 1000ms`
    );
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
    console.log(`🔄 Running job: ${job.name}`);

    const startTime = Date.now();
    const heartbeat = setInterval(() => {
      void this.lock
        .renew(lease)
        .then((renewed) => {
          if (!renewed) {
            console.error(
              `Cron lock lease lost while '${job.name}' is still running`
            );
          }
        })
        .catch((error) => {
          console.error(`Failed to renew cron lock for '${job.name}':`, error);
        });
    }, getLeaseHeartbeatInterval(lease.timeoutMs));
    heartbeat.unref?.();

    const execution = await this.executions.create(job);
    try {
      const result = await job.handler();
      const duration = Date.now() - startTime;
      console.log(`✅ Job '${job.name}' completed in ${duration}ms`);

      if (execution) {
        await this.executions.update(execution.id, {
          completedAt: new Date(),
          duration,
          status: "COMPLETED",
          ...(result ?? {}),
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Job '${job.name}' failed:`, error);

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

export function getCronScheduler(): CronScheduler {
  globalScheduler ??= new CronScheduler();
  return globalScheduler;
}

export function initializeCronScheduler() {
  const scheduler = getCronScheduler();
  if (env.NODE_ENV === "production" || env.ENABLE_CRON_SCHEDULER) {
    scheduler.start();
  } else {
    console.log("🔄 Cron scheduler disabled (development mode)");
  }
}

export function shutdownCronScheduler() {
  globalScheduler?.stop();
  globalScheduler = null;
}
