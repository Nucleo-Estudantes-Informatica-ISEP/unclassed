import { AdvancedMatchingService } from "./advancedMatchingService";

interface ScheduledJob {
  id: string;
  name: string;
  schedule: string; // Cron expression
  handler: () => Promise<void>;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  isRunning: boolean;
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
    // High frequency batch processing (weekdays 8-22)
    this.addJob({
      id: 'batch-matching-high-freq',
      name: 'Batch Matching (High Frequency)',
      schedule: '*/15 8-22 * * 1-5', // Every 15 minutes, 8AM-10PM, Mon-Fri
      handler: this.runBatchMatching.bind(this),
      enabled: true,
      isRunning: false
    });

    // Low frequency batch processing (weekends)
    this.addJob({
      id: 'batch-matching-low-freq',
      name: 'Batch Matching (Low Frequency)',
      schedule: '0 10,14,18 * * 6,0', // 10AM, 2PM, 6PM on weekends
      handler: this.runBatchMatching.bind(this),
      enabled: true,
      isRunning: false
    });

    // Provisional match cleanup (every 30 minutes)
    this.addJob({
      id: 'provisional-cleanup',
      name: 'Provisional Match Cleanup',
      schedule: '*/30 * * * *', // Every 30 minutes
      handler: this.cleanupProvisionalMatches.bind(this),
      enabled: true,
      isRunning: false
    });

    // System health check (every hour)
    this.addJob({
      id: 'health-check',
      name: 'System Health Check',
      schedule: '0 * * * *', // Every hour
      handler: this.runHealthCheck.bind(this),
      enabled: true,
      isRunning: false
    });
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
   * Schedule a specific job
   */
  private scheduleJob(job: ScheduledJob) {
    // Calculate next run time
    job.nextRun = this.getNextRunTime(job.schedule);
    
    // Set up interval checking
    const checkInterval = setInterval(() => {
      const now = new Date();
      
      if (job.nextRun && now >= job.nextRun && !job.isRunning) {
        this.runJob(job);
        job.nextRun = this.getNextRunTime(job.schedule);
      }
    }, 60000); // Check every minute

    this.intervals.set(job.id, checkInterval);
    console.log(`📅 Scheduled job '${job.name}' - next run: ${job.nextRun?.toISOString()}`);
  }

  /**
   * Run a specific job
   */
  private async runJob(job: ScheduledJob) {
    if (job.isRunning) return;

    job.isRunning = true;
    job.lastRun = new Date();
    
    console.log(`🔄 Running job: ${job.name}`);
    const startTime = Date.now();

    try {
      await job.handler();
      const duration = Date.now() - startTime;
      console.log(`✅ Job '${job.name}' completed in ${duration}ms`);
    } catch (error) {
      console.error(`❌ Job '${job.name}' failed:`, error);
    } finally {
      job.isRunning = false;
    }
  }

  /**
   * Parse cron expression and get next run time
   * Simplified cron parser - for production consider using a proper cron library
   */
  private getNextRunTime(cronExpression: string): Date {
    const now = new Date();
    const [minute, hour, dayOfMonth, month, dayOfWeek] = cronExpression.split(' ');

    // Simple implementation for common patterns
    // For a full implementation, use a library like 'node-cron'
    
    if (cronExpression === '*/15 8-22 * * 1-5') {
      // Every 15 minutes, 8AM-10PM, Mon-Fri
      return this.getNextWeekdayRun(now, [8, 22], 15);
    }
    
    if (cronExpression === '0 10,14,18 * * 6,0') {
      // 10AM, 2PM, 6PM on weekends
      return this.getNextWeekendRun(now, [10, 14, 18]);
    }
    
    if (cronExpression === '*/30 * * * *') {
      // Every 30 minutes
      return this.getNextInterval(now, 30);
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
   * Job handlers
   */
  private async runBatchMatching(): Promise<void> {
    try {
      const results = await this.matchingService.runBatchProcessing();
      console.log(`🔄 Batch matching completed: ${results.matchesFound} matches found, ${results.processedPartitions} partitions processed`);
      
      if (results.errors.length > 0) {
        console.warn("⚠️ Batch matching errors:", results.errors);
      }
    } catch (error) {
      console.error("❌ Batch matching failed:", error);
      throw error;
    }
  }

  private async cleanupProvisionalMatches(): Promise<void> {
    try {
      const expiredCount = await this.matchingService.expireProvisionalMatches();
      if (expiredCount > 0) {
        console.log(`🧹 Expired ${expiredCount} provisional matches`);
      }
    } catch (error) {
      console.error("❌ Provisional cleanup failed:", error);
      throw error;
    }
  }

  private async runHealthCheck(): Promise<void> {
    try {
      const stats = await this.matchingService.getAdvancedStats();
      console.log(`💓 Health check: ${stats.totalActiveRequests} active requests, ${stats.activePartitions} active partitions`);
      
      // Log warnings for concerning metrics
      if (stats.averageProcessingTime > 10000) {
        console.warn(`⚠️ High processing time: ${stats.averageProcessingTime}ms`);
      }
      
      if (stats.averageSatisfactionScore < 0.5) {
        console.warn(`⚠️ Low satisfaction score: ${stats.averageSatisfactionScore}`);
      }
    } catch (error) {
      console.error("❌ Health check failed:", error);
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
