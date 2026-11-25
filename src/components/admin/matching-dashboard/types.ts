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
  successRate: number | null;
  avgProcessingTime: number | null;
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
