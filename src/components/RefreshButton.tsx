
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { Button } from "@/lib/components/ui/button";
import { Label } from "@/lib/components/ui/label";
import { Switch } from "@/lib/components/ui/switch";

interface RefreshButtonProps {
  autoRefreshInterval?: number; // in seconds, default 30
  initialAutoRefresh?: boolean;
}

export function RefreshButton({
  autoRefreshInterval = 30,
  initialAutoRefresh = false,
}: RefreshButtonProps = {}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(initialAutoRefresh);
  const [secondsLeft, setSecondsLeft] = useState(autoRefreshInterval);

  const router = useRouter();

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      router.refresh();

      // Show the loading state briefly
      await new Promise<void>((resolve) => setTimeout(resolve, 500));

      // Reset countdown
      setSecondsLeft(autoRefreshInterval);
    } finally {
      setIsRefreshing(false);
    }
  }, [autoRefreshInterval, router]);

  // Auto-refresh countdown
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;

      setSecondsLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void handleRefresh();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [autoRefresh, handleRefresh]);

  // Refresh when countdown reaches zero
  useEffect(() => {
    if (!autoRefresh || secondsLeft > 0 || isRefreshing) return;

    void handleRefresh();
  }, [autoRefresh, secondsLeft, isRefreshing, handleRefresh]);

  return (
    <div className="flex items-center gap-4">
      {/* Auto-refresh toggle */}
      <div className="flex items-center space-x-2">
        <Switch
          id="auto-refresh"
          checked={autoRefresh}
          onCheckedChange={(checked) => {
            setAutoRefresh(checked);
            setSecondsLeft(autoRefreshInterval);
          }}
          disabled={isRefreshing}
        />

        <div className="flex flex-col">
          <Label
            htmlFor="auto-refresh"
            className="cursor-pointer text-xs font-medium"
          >
            Automatic refresh
          </Label>

          {autoRefresh && (
            <span className="text-muted-foreground text-xs">
              {secondsLeft}s
            </span>
          )}
        </div>
      </div>

      {/* Manual refresh button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => void handleRefresh()}
        disabled={isRefreshing}
        className="flex items-center gap-2"
      >
        <RefreshCw
          className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
        />
        {isRefreshing ? "A atualizar..." : "Atualizar"}
      </Button>
    </div>
  );
}
