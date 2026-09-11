import type { CronExecution, Prisma } from "@prisma/client";

export interface JobExecutionResult {
  processedPartitions: number;
  matchesFound: number;
  expiredMatches: number;
  totalActiveRequests: number;
  errors: string[];
  metadata?: Prisma.InputJsonValue;
}

export interface ScheduledJob {
  id: string;
  name: string;
  schedule: string;
  handler: () => Promise<void | JobExecutionResult>;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  isRunning: boolean;
  lockTimeout?: number;
}

export interface LockLease {
  jobId: string;
  acquiredAt: Date;
  timeoutMs: number;
}

export interface ScheduledRun {
  jobName: string;
  nextRun: Date;
}

export interface CronStats {
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
