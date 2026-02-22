import { AdvancedMatchingService } from "./advancedMatchingService";
import { CronExecution, Prisma, PrismaClient } from "@prisma/client";
import { getCache } from "./cache";

interface JobExecutionResult {
  processedPartitions: number;
  matchesFound: number;
  expiredMatches: number;
  totalActiveRequests: number;
  errors: string[];
  metadata?: Prisma.InputJsonValue;
}

interface ScheduledRun {
  jobName: string;
  nextRun: Date;
}

interface CronStats {
  lastRunTime: Date | null;
  totalExecutions24h: number;
  successfulExecutions24h: number;
  failedExecutions24h: number;
  totalMatchesFound24h: number;
  totalExpiredMatches24h: number;
  averageExecutionTime: number;
  successRate24h: number;
  recentExecutions: CronExecution[];
  isRunning: boolean;
  schedulerStatus: "RUNNING" | "STOPPED";
  activeJobs: number;
  nextScheduledRuns: ScheduledRun[];
}

interface ScheduledJob {
  id: string;
  name: string;
  schedule: string; // Cron expression
  handler: () => Promise<void | JobExecutionResult>;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  isRunning: boolean;
  lockTimeout?: number; // Lock timeout in milliseconds
}

/**
 * Internal cron scheduler that works without external cron services
 * Supports self-hosting and Vercel deployments
 */
export class CronScheduler {
  private jobs: Map<string, ScheduledJob> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isStarted = false;
  private matchingService = new AdvancedMatchingService();
  private prisma = new PrismaClient();
  private readonly LOCK_TIMEOUT = 10 * 60 * 1000; // 10 minutes default lock timeout

  /**
   * Invalidate admin cron cache when job states change
   */
  private invalidateAdminCache() {
    try {
      const cache = getCache();
      cache.deletePattern('admin:cron:.*');
      console.log('🗑️ Invalidated admin cron cache after job execution');
    } catch (error) {
      console.warn('Failed to invalidate admin cache:', error);
    }
  }

  constructor() {
    this.registerDefaultJobs();
  }

  /**
   * Start the cron scheduler
   */
  start() {
    if (this.isStarted) {
      console.log("🔄 Cron scheduler already running");
      return;
    }

    console.log("🚀 Starting internal cron scheduler...");
    this.isStarted = true;

    // Schedule all enabled jobs
    for (const job of this.jobs.values()) {
      if (job.enabled) {
        this.scheduleJob(job);
      }
    }

    // Schedule cleanup task
    this.scheduleCleanup();

    console.log(`✅ Cron scheduler started with ${Array.from(this.jobs.values()).filter(j => j.enabled).length} active jobs`);
  }

  /**
   * Stop the cron scheduler
   */
  stop() {
    if (!this.isStarted) return;

    console.log("🛑 Stopping cron scheduler...");

    // Clear all intervals
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();

    this.isStarted = false;
    console.log("✅ Cron scheduler stopped");
  }

  /**
   * Register default matching jobs
   */
  private registerDefaultJobs() {
    // Get schedules from environment variables with fallbacks
    const batchSchedule = process.env.CRON_BATCH_MATCHING || '*/5 * * * *';
    const cleanupSchedule = process.env.CRON_PROVISIONAL_CLEANUP || '*/30 * * * *';
    const healthCheckSchedule = process.env.CRON_HEALTH_CHECK || '0 * * * *';

    // Batch processing
    this.addJob({
      id: 'batch-matching',
      name: 'Batch Matching',
      schedule: batchSchedule,
      handler: this.runBatchMatching.bind(this),
      enabled: true,
      isRunning: false,
      lockTimeout: 8 * 60 * 1000 // 8 minutes for batch matching
    });

    // Provisional match cleanup
    this.addJob({
      id: 'provisional-cleanup',
      name: 'Provisional Match Cleanup',
      schedule: cleanupSchedule,
      handler: this.cleanupProvisionalMatches.bind(this),
      enabled: true,
      isRunning: false,
      lockTimeout: 3 * 60 * 1000 // 3 minutes for cleanup
    });

    // System health check
    this.addJob({
      id: 'health-check',
      name: 'System Health Check',
      schedule: healthCheckSchedule,
      handler: this.runHealthCheck.bind(this),
      enabled: true,
      isRunning: false,
      lockTimeout: 2 * 60 * 1000 // 2 minutes for health check
    });

    console.log(`🕐 Cron schedules configured:`);
    console.log(`  - Batch Matching: ${batchSchedule} (lock: 8min)`);
    console.log(`  - Provisional Cleanup: ${cleanupSchedule} (lock: 3min)`);
    console.log(`  - Health Check: ${healthCheckSchedule} (lock: 2min)`);
  }

  /**
   * Add a new cron job
   */
  addJob(job: ScheduledJob) {
    this.jobs.set(job.id, job);

    if (this.isStarted && job.enabled) {
      this.scheduleJob(job);
    }
  }

  /**
   * Enable/disable a job
   */
  setJobEnabled(jobId: string, enabled: boolean) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.enabled = enabled;

    if (this.isStarted) {
      if (enabled) {
        this.scheduleJob(job);
      } else {
        const interval = this.intervals.get(jobId);
        if (interval) {
          clearInterval(interval);
          this.intervals.delete(jobId);
        }
      }
    }
  }

  /**
   * Get job status
   */
  getJobStatus() {
    return Array.from(this.jobs.values()).map(job => ({
      id: job.id,
      name: job.name,
      schedule: job.schedule,
      enabled: job.enabled,
      isRunning: job.isRunning,
      lastRun: job.lastRun,
      nextRun: job.nextRun
    }));
  }

  /**
   * Schedule a specific job with improved precision
   */
  private scheduleJob(job: ScheduledJob) {
    // Calculate next run time
    job.nextRun = this.getNextRunTime(job.schedule);

    // Use more precise interval based on job schedule
    const checkIntervalMs = this.getCheckInterval(job.schedule);

    const checkInterval = setInterval(async () => {
      const now = new Date();

      if (job.nextRun && now >= job.nextRun && !job.isRunning) {
        // Try to acquire lock before running
        const lockAcquired = await this.acquireLock(job.id, job.lockTimeout || this.LOCK_TIMEOUT);

        if (lockAcquired) {
          this.runJob(job);
          job.nextRun = this.getNextRunTime(job.schedule);
        } else {
          console.log(`🔒 Job '${job.name}' skipped - another instance is running`);
          // Recalculate next run to avoid immediate retry
          job.nextRun = this.getNextRunTime(job.schedule);
        }
      }
    }, checkIntervalMs);

    this.intervals.set(job.id, checkInterval);
    console.log(`📅 Scheduled job '${job.name}' - next run: ${job.nextRun?.toISOString()}, check interval: ${checkIntervalMs}ms`);
  }

  /**
   * Get appropriate check interval based on cron schedule
   */
  private getCheckInterval(cronExpression: string): number {
    if (cronExpression.includes('*/5 * * * *')) {
      return 30000; // Check every 30 seconds for 5-minute jobs
    }
    if (cronExpression.includes('*/30 * * * *')) {
      return 60000; // Check every minute for 30-minute jobs
    }
    if (cronExpression.includes('0 * * * *')) {
      return 60000; // Check every minute for hourly jobs
    }
    return 60000; // Default: check every minute
  }

  /**
   * Acquire distributed lock using database
   */
  private async acquireLock(jobId: string, timeoutMs: number): Promise<boolean> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + timeoutMs);

    try {
      // Reclaim stale lock atomically (no delete/create gap).
      const reclaimed = await this.prisma.cronLock.updateMany({
        where: {
          jobId,
          expiresAt: { lte: now }
        },
        data: {
          expiresAt,
          createdAt: now
        }
      });

      if (reclaimed.count > 0) {
        return true;
      }

      // No stale lock was reclaimable; try to create a fresh one.
      await this.prisma.cronLock.create({
        data: {
          jobId,
          expiresAt,
          createdAt: now
        }
      });

      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        // Another instance may have raced us. Retry reclaim in case the
        // lock became stale between the first reclaim attempt and create.
        try {
          const reclaimedOnRetry = await this.prisma.cronLock.updateMany({
            where: {
              jobId,
              expiresAt: { lte: new Date() }
            },
            data: {
              expiresAt,
              createdAt: now
            }
          });

          if (reclaimedOnRetry.count > 0) {
            return true;
          }

          // Defensive visibility: with a valid unique index this should never be > 1.
          const lockCount = await this.prisma.cronLock.count({ where: { jobId } });
          if (lockCount > 1) {
            console.error(
              `Lock invariant violation for job ${jobId}: found ${lockCount} lock rows`
            );
          }
        } catch (retryError) {
          console.warn(`Failed to retry lock reclaim for job ${jobId}:`, retryError);
        }

        return false;
      }

      console.warn(`Failed to acquire lock for job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Release distributed lock
   */
  private async releaseLock(jobId: string): Promise<void> {
    try {
      await this.prisma.cronLock.delete({
        where: { jobId }
      });
    } catch (error) {
      // Ignore errors - lock might have expired or been deleted already
      console.debug(`Lock release for job ${jobId} had no effect (likely already expired)`);
    }
  }

  /**
   * Run a specific job with proper lock management
   */
  private async runJob(job: ScheduledJob) {
    if (job.isRunning) return;

    job.isRunning = true;
    job.lastRun = new Date();

    console.log(`🔄 Running job: ${job.name}`);
    const startTime = Date.now();

    // Create execution record
    let executionRecord;
    try {
      executionRecord = await this.prisma.cronExecution.create({
        data: {
          jobId: job.id,
          jobName: job.name,
          startedAt: new Date(),
          status: 'RUNNING'
        }
      });
    } catch (error) {
      console.warn('Failed to create cron execution record:', error);
    }

    try {
      const result = await job.handler();
      const duration = Date.now() - startTime;
      console.log(`✅ Job '${job.name}' completed in ${duration}ms`);

      // Update execution record with success
      if (executionRecord) {
        await this.updateExecutionRecord(executionRecord.id, {
          completedAt: new Date(),
          duration,
          status: 'COMPLETED',
          ...(result != null && typeof result === 'object' ? result : {})
        });
      }

      // Invalidate admin cache after successful job completion
      this.invalidateAdminCache();
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Job '${job.name}' failed:`, error);

      // Update execution record with failure
      if (executionRecord) {
        await this.updateExecutionRecord(executionRecord.id, {
          completedAt: new Date(),
          duration,
          status: 'FAILED',
          errors: [error instanceof Error ? error.message : String(error)]
        });
      }

      // Invalidate admin cache after job failure too
      this.invalidateAdminCache();
    } finally {
      job.isRunning = false;
      // Release the lock
      await this.releaseLock(job.id);
    }
  }

  /**
   * Parse cron expression and get next run time with improved precision
   */
  private getNextRunTime(cronExpression: string): Date {
    const now = new Date();

    if (cronExpression === '*/5 * * * *') {
      // Every 5 minutes - align to exact 5-minute boundaries
      const next = new Date(now);
      const currentMinutes = next.getMinutes();
      const nextMinutes = Math.ceil(currentMinutes / 5) * 5;

      if (nextMinutes >= 60) {
        next.setHours(next.getHours() + 1);
        next.setMinutes(0, 0, 0);
      } else {
        next.setMinutes(nextMinutes, 0, 0);
      }

      // Ensure we're at least 10 seconds in the future to avoid immediate execution
      if (next.getTime() - now.getTime() < 10000) {
        next.setMinutes(next.getMinutes() + 5);
      }

      return next;
    }

    if (cronExpression === '*/30 * * * *') {
      // Every 30 minutes - align to 0 or 30 minutes
      const next = new Date(now);
      const currentMinutes = next.getMinutes();
      const nextMinutes = currentMinutes < 30 ? 30 : 60;

      if (nextMinutes >= 60) {
        next.setHours(next.getHours() + 1);
        next.setMinutes(0, 0, 0);
      } else {
        next.setMinutes(nextMinutes, 0, 0);
      }

      return next;
    }

    if (cronExpression === '0 * * * *') {
      // Every hour
      const next = new Date(now);
      next.setMinutes(0, 0, 0);
      next.setHours(next.getHours() + 1);
      return next;
    }

    // Fallback: next hour
    const next = new Date(now);
    next.setHours(next.getHours() + 1, 0, 0, 0);
    return next;
  }

  private getNextWeekdayRun(now: Date, hourRange: [number, number], intervalMinutes: number): Date {
    const [startHour, endHour] = hourRange;
    const next = new Date(now);

    // Check if we're in a weekday
    const dayOfWeek = next.getDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // It's weekend, go to next Monday
      const daysUntilMonday = dayOfWeek === 0 ? 1 : 2;
      next.setDate(next.getDate() + daysUntilMonday);
      next.setHours(startHour, 0, 0, 0);
      return next;
    }

    // We're on a weekday
    const currentHour = next.getHours();

    if (currentHour < startHour) {
      // Before work hours
      next.setHours(startHour, 0, 0, 0);
      return next;
    } else if (currentHour >= endHour) {
      // After work hours, go to next day
      next.setDate(next.getDate() + 1);
      next.setHours(startHour, 0, 0, 0);
      return next;
    } else {
      // During work hours, next interval
      return this.getNextInterval(now, intervalMinutes);
    }
  }

  private getNextWeekendRun(now: Date, hours: number[]): Date {
    const next = new Date(now);
    const dayOfWeek = next.getDay();
    const currentHour = next.getHours();

    // If it's weekend
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Find next hour
      for (const hour of hours) {
        if (currentHour < hour || (currentHour === hour && next.getMinutes() === 0)) {
          next.setHours(hour, 0, 0, 0);
          return next;
        }
      }

      // No more hours today, go to next weekend day or next weekend
      if (dayOfWeek === 6) {
        // Saturday -> Sunday
        next.setDate(next.getDate() + 1);
      } else {
        // Sunday -> next Saturday
        next.setDate(next.getDate() + 6);
      }
      next.setHours(hours[0], 0, 0, 0);
      return next;
    } else {
      // It's weekday, go to next weekend
      const daysUntilSaturday = 6 - dayOfWeek;
      next.setDate(next.getDate() + daysUntilSaturday);
      next.setHours(hours[0], 0, 0, 0);
      return next;
    }
  }

  private getNextInterval(now: Date, intervalMinutes: number): Date {
    const next = new Date(now);
    next.setMinutes(Math.ceil(next.getMinutes() / intervalMinutes) * intervalMinutes, 0, 0);

    if (next <= now) {
      next.setMinutes(next.getMinutes() + intervalMinutes);
    }

    return next;
  }

  /**
   * Helper method to update execution record
   */
  private async updateExecutionRecord(
    executionId: string,
    data: Prisma.CronExecutionUpdateInput
  ) {
    try {
      await this.prisma.cronExecution.update({
        where: { id: executionId },
        data
      });
    } catch (error) {
      console.warn('Failed to update cron execution record:', error);
    }
  }

  /**
   * Job handlers
   */
  private async runBatchMatching(): Promise<JobExecutionResult> {
    try {
      // Get initial active request count
      const totalActiveRequests = await this.prisma.singleSwapRequest.count({ where: { status: 'ACTIVE' } }) +
                                  await this.prisma.bundleSwapRequest.count({ where: { status: 'ACTIVE' } });

      const results = await this.matchingService.runBatchProcessing();
      console.log(`🔄 Batch matching completed: ${results.matchesFound} matches found, ${results.processedPartitions} partitions processed`);

      if (results.errors.length > 0) {
        console.warn("⚠️ Batch matching errors:", results.errors);
      }

      // Return execution statistics
      return {
        processedPartitions: results.processedPartitions,
        matchesFound: results.matchesFound,
        expiredMatches: 0, // Will be updated by cleanup job
        totalActiveRequests,
        errors: results.errors
      };
    } catch (error) {
      console.error("❌ Batch matching failed:", error);
      throw error;
    }
  }

  private async cleanupProvisionalMatches(): Promise<JobExecutionResult> {
    try {
      const expiredCount = await this.matchingService.expireProvisionalMatches();
      if (expiredCount > 0) {
        console.log(`🧹 Expired ${expiredCount} provisional matches`);
      }

      return {
        processedPartitions: 0,
        matchesFound: 0,
        expiredMatches: expiredCount,
        totalActiveRequests: await this.prisma.singleSwapRequest.count({ where: { status: 'ACTIVE' } }) +
                            await this.prisma.bundleSwapRequest.count({ where: { status: 'ACTIVE' } }),
        errors: []
      };
    } catch (error) {
      console.error("❌ Provisional cleanup failed:", error);
      throw error;
    }
  }

  private async runHealthCheck(): Promise<JobExecutionResult> {
    try {
      const stats = await this.matchingService.getAdvancedStats();
      console.log(`💓 Health check: ${stats.totalActiveRequests} active requests, ${stats.activePartitions} active partitions`);

      const warnings: string[] = [];

      // Log warnings for concerning metrics
      if (stats.averageProcessingTime > 10000) {
        const warning = `High processing time: ${stats.averageProcessingTime}ms`;
        console.warn(`⚠️ ${warning}`);
        warnings.push(warning);
      }

      if (stats.averageSatisfactionScore < 0.5) {
        const warning = `Low satisfaction score: ${stats.averageSatisfactionScore}`;
        console.warn(`⚠️ ${warning}`);
        warnings.push(warning);
      }

      return {
        processedPartitions: stats.activePartitions,
        matchesFound: 0,
        expiredMatches: 0,
        totalActiveRequests: stats.totalActiveRequests,
        errors: warnings,
        metadata: {
          averageProcessingTime: stats.averageProcessingTime,
          averageSatisfactionScore: stats.averageSatisfactionScore,
          totalPartitions: stats.partitions
        }
      };
    } catch (error) {
      console.error("❌ Health check failed:", error);
      throw error;
    }
  }

  private scheduleCleanup() {
    // Clean up completed jobs and rate limit entries every hour
    const cleanupInterval = setInterval(() => {
      console.log("🧹 Running periodic cleanup...");
      // Add any additional cleanup logic here
    }, 3600000); // 1 hour

    this.intervals.set('cleanup', cleanupInterval);
  }

  /**
   * Get cron execution history
   */
  async getExecutionHistory(limit: number = 50): Promise<CronExecution[]> {
    try {
      return await this.prisma.cronExecution.findMany({
        orderBy: { startedAt: 'desc' },
        take: limit
      });
    } catch (error) {
      console.error('Failed to get execution history:', error);
      return [];
    }
  }

  /**
   * Get cron statistics
   */
  async getCronStats(): Promise<CronStats> {
    try {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [recentExecutions, last24hExecutions, lastWeekExecutions, lastExecution] = await Promise.all([
        this.prisma.cronExecution.findMany({
          where: { startedAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) } }, // Last hour
          orderBy: { startedAt: 'desc' }
        }),
        this.prisma.cronExecution.findMany({
          where: { startedAt: { gte: last24Hours } }
        }),
        this.prisma.cronExecution.findMany({
          where: { startedAt: { gte: lastWeek } }
        }),
        this.prisma.cronExecution.findFirst({
          where: { status: 'COMPLETED' },
          orderBy: { completedAt: 'desc' }
        })
      ]);

      const completedLast24h = last24hExecutions.filter(e => e.status === 'COMPLETED');
      const failedLast24h = last24hExecutions.filter(e => e.status === 'FAILED');

      const totalMatches24h = completedLast24h.reduce((sum, e) => sum + e.matchesFound, 0);
      const totalExpired24h = completedLast24h.reduce((sum, e) => sum + e.expiredMatches, 0);
      const avgDuration = completedLast24h.length > 0
        ? completedLast24h.reduce((sum, e) => sum + (e.duration || 0), 0) / completedLast24h.length
        : 0;

      return {
        lastRunTime: lastExecution?.completedAt ?? lastExecution?.startedAt ?? null,
        totalExecutions24h: last24hExecutions.length,
        successfulExecutions24h: completedLast24h.length,
        failedExecutions24h: failedLast24h.length,
        totalMatchesFound24h: totalMatches24h,
        totalExpiredMatches24h: totalExpired24h,
        averageExecutionTime: Math.round(avgDuration),
        successRate24h: last24hExecutions.length > 0 ? (completedLast24h.length / last24hExecutions.length) : 0,
        recentExecutions: recentExecutions.slice(0, 10),
        isRunning: recentExecutions.some(e => e.status === 'RUNNING'),
        schedulerStatus: this.isStarted ? 'RUNNING' : 'STOPPED',
        activeJobs: Array.from(this.jobs.values()).filter(j => j.enabled).length,
        nextScheduledRuns: Array.from(this.jobs.values())
          .filter(j => j.enabled && j.nextRun)
          .map((j) => ({ jobName: j.name, nextRun: j.nextRun! }))
          .sort((a, b) => (a.nextRun?.getTime() || 0) - (b.nextRun?.getTime() || 0))
      };
    } catch (error) {
      console.error('Failed to get cron stats:', error);
      return {
        lastRunTime: null,
        totalExecutions24h: 0,
        successfulExecutions24h: 0,
        failedExecutions24h: 0,
        totalMatchesFound24h: 0,
        totalExpiredMatches24h: 0,
        averageExecutionTime: 0,
        successRate24h: 0,
        recentExecutions: [],
        isRunning: false,
        schedulerStatus: this.isStarted ? 'RUNNING' : 'STOPPED',
        activeJobs: 0,
        nextScheduledRuns: []
      };
    }
  }

  /**
   * Manual job execution (for testing/admin)
   */
  async runJobManually(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    await this.runJob(job);
  }
}

// Global scheduler instance
let globalScheduler: CronScheduler | null = null;

/**
 * Get or create the global cron scheduler
 */
export function getCronScheduler(): CronScheduler {
  if (!globalScheduler) {
    globalScheduler = new CronScheduler();
  }
  return globalScheduler;
}

/**
 * Initialize cron scheduler on app start
 * Call this in your main application entry point
 */
export function initializeCronScheduler() {
  const scheduler = getCronScheduler();

  // Only start in production or when explicitly enabled
  const shouldStart = process.env.NODE_ENV === 'production' ||
                     process.env.ENABLE_CRON_SCHEDULER === 'true';

  if (shouldStart) {
    scheduler.start();
  } else {
    console.log("🔄 Cron scheduler disabled (development mode)");
  }
}

/**
 * Graceful shutdown handler
 */
export function shutdownCronScheduler() {
  if (globalScheduler) {
    globalScheduler.stop();
    globalScheduler = null;
  }
}
