import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { toast } from "sonner";
import { MatchingStats, CronStats, CronExecution, BatchResult } from "./types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type MatchingDataResponse = MatchingStats & {
  success: boolean;
  error?: string;
};

interface CronDataResponse {
  success: boolean;
  error?: string;
  cronStats: CronStats;
  executionHistory: CronExecution[];
}

export function useMatchingData(autoRefresh: boolean) {
  const { 
    data: matchingData, 
    error: matchingError, 
    mutate: mutateMatching,
    isValidating: isMatchingValidating
  } = useSWR<MatchingDataResponse>(
    '/api/matching',
    fetcher,
    { 
      refreshInterval: autoRefresh ? 30000 : 0,
      revalidateOnFocus: autoRefresh,
      revalidateOnReconnect: autoRefresh,
      onError: () => toast.error("Erro ao carregar estatísticas"),
      onSuccess: (data) => {
        if (!data.success) {
          toast.error("Falha ao carregar estatísticas de matching");
        }
      }
    }
  );

  const { 
    data: cronData, 
    mutate: mutateCron,
    isValidating: isCronValidating
  } = useSWR<CronDataResponse>(
    '/api/admin/cron',
    fetcher,
    { 
      refreshInterval: autoRefresh ? 30000 : 0,
      revalidateOnFocus: autoRefresh,
      revalidateOnReconnect: autoRefresh,
      onError: (err) => console.warn('Failed to load cron statistics:', err),
      onSuccess: (data) => {
        if (!data.success) {
          console.warn('Failed to load cron statistics:', data.error);
        }
      }
    }
  );

  const isLoading = (!matchingData && !matchingError);
  const isValidating = isMatchingValidating || isCronValidating;
  
  const stats = matchingData?.success ? matchingData : null;
  const cronStats = cronData?.success ? cronData.cronStats : null;
  const cronHistory = cronData?.success ? cronData.executionHistory : [];

  return {
    stats,
    cronStats,
    cronHistory,
    isLoading,
    isValidating,
    isError: matchingError || (!matchingData?.success && matchingData !== undefined),
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

export function useBatchProcessing(onSuccessCallback?: () => void) {
  return useSWRMutation<BatchResult, Error, string, never>(
    '/api/matching',
    triggerBatchFetcher,
    {
      throwOnError: false,
      onSuccess: (result) => {
        if (result.success) {
          toast.success(result.message);
          if (onSuccessCallback) onSuccessCallback();
        } else {
          toast.error("Falha no processamento em lote");
        }
      },
      onError: (error) => {
        console.error('Error running batch processing:', error);
        toast.error("Erro ao executar processamento em lote");
      }
    }
  );
}
