"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";

const REFRESH_INTERVAL = 30_000;
const REFRESH_KEY = "advanced-matching-dashboard-refresh";

export function useDashboardRefresh() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const router = useRouter();
  const refresh = useSWR(
    REFRESH_KEY,
    () => {
      router.refresh();
      return Date.now();
    },
    {
      refreshInterval: autoRefresh ? REFRESH_INTERVAL : 0,
      revalidateOnFocus: false,
      revalidateOnMount: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    }
  );

  return {
    autoRefresh,
    refreshing: refresh.isValidating,
    refresh: refresh.mutate,
    toggleAutoRefresh: () => setAutoRefresh((enabled) => !enabled),
  };
}
