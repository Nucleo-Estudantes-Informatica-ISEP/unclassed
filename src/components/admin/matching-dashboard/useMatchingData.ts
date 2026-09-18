import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { MatchingStats, CronStats, CronExecution, BatchResult, PartitionStat } from "./types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface MatchingDataResponse {
  success: boolean;
  error?: string;
  partitions: number;
  activePartitions: number;
  totalActiveRequests: number;
  matches24h: number;
  provisionalMatches: number;
  averageSatisfactionScore: number;
  averageProcessingTime: number;
  partitionStats: PartitionStat[];
}

interface CronDataResponse {
  success: boolean;
  error?: string;
  cronStats: CronStats;
  executionHistory: CronExecution[];
}

export function useMatchingData(autoRefresh: boolean) {
  const { data: matchingData, error: matchingError, mutate: mutateMatching } = useSWR<MatchingDataResponse>(
    '/api/matching',
    fetcher,
    { refreshInterval: autoRefresh ? 30000 : 0 }
  );

  const { data: cronData, error: cronError, mutate: mutateCron } = useSWR<CronDataResponse>(
    '/api/admin/cron',
    fetcher,
    { refreshInterval: autoRefresh ? 30000 : 0 }
  );

  const isLoading = (!matchingData && !matchingError) || (!cronData && !cronError);
  
  // matchingData contains the properties directly when successful
  const stats = matchingData?.success ? (matchingData as unknown as MatchingStats) : null;
  const cronStats = cronData?.success ? cronData.cronStats : null;
  const cronHistory = cronData?.success ? cronData.executionHistory : [];

  return {
    stats,
    cronStats,
    cronHistory,
    isLoading,
    isError: matchingError || cronError || (!matchingData?.success && matchingData) || (!cronData?.success && cronData),
    mutate: () => {
      mutateMatching();
      mutateCron();
    }
  };
}

async function triggerBatchFetcher(url: string) {
  const res = await fetch(url, { method: "PUT" });
  return res.json();
}

export function useBatchProcessing() {
  return useSWRMutation<BatchResult, Error, string, never>(
    '/api/matching',
    triggerBatchFetcher
  );
}
