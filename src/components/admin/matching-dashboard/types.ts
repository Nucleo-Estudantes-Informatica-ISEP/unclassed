export interface MatchingStats {
  partitions: number;
  activePartitions: number;
  totalActiveRequests: number;
  matches24h: number;
  provisionalMatches: number;
  averageSatisfactionScore: number;
  averageProcessingTime: number;
  partitionStats: PartitionStat[];
}

export interface PartitionStat {
  partitionKey: string;
  ticketType: "SPECIFIC_CLASS" | "ALL_CLASSES";
  activeRequests: number;
  successRate: number;
  avgProcessingTime: number;
}

export interface BatchResult {
  success: boolean;
  processedPartitions: number;
  matchesFound: number;
  totalProcessingTime: number;
  expiredProvisionalMatches: number;
  errors: string[];
  message: string;
}

export interface CronStats {
  lastRunTime: string | null;
  totalExecutions24h: number;
  successfulExecutions24h: number;
  failedExecutions24h: number;
  totalMatchesFound24h: number;
  totalExpiredMatches24h: number;
  averageExecutionTime: number;
  successRate24h: number;
  recentExecutions: CronExecution[];
  isRunning: boolean;
  schedulerStatus: string;
  activeJobs: number;
  nextScheduledRuns: { jobName: string; nextRun: Date | null }[];
}

export interface CronExecution {
  id: string;
  jobId: string;
  jobName: string;
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  status: string;
  processedPartitions: number;
  matchesFound: number;
  expiredMatches: number;
  totalActiveRequests: number;
  errors: string[];
}
