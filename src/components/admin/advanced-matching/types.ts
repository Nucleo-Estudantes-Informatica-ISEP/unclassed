import type { CronExecution as StoredCronExecution } from "@prisma/client";

import type { CronStats as SchedulerCronStats } from "@/services/cron/types";
import type { AdvancedStats } from "@/application/matchingOrchestrator";

export type MatchingStats = AdvancedStats;
export type PartitionStat = AdvancedStats["partitionStats"][number];
export type CronExecution = StoredCronExecution;
export type CronStats = SchedulerCronStats;

export interface BatchResult {
  success: boolean;
  processedPartitions: number;
  matchesFound: number;
  totalProcessingTime: number;
  expiredProvisionalMatches: number;
  errors: string[];
  message: string;
}
