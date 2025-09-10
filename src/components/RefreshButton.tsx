"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/lib/components/ui/button";
import { Switch } from "@/lib/components/ui/switch";
import { Label } from "@/lib/components/ui/label";
import { RefreshCw } from "lucide-react";

interface RefreshButtonProps {
  autoRefreshInterval?: number; // in seconds, default 30
}

export function RefreshButton({ autoRefreshInterval = 30 }: RefreshButtonProps = {}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(autoRefreshInterval);
  const router = useRouter();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      router.refresh();
      // Add a small delay to show the loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      // Reset the countdown when manually refreshing
      setSecondsLeft(autoRefreshInterval);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh logic
  useEffect(() => {
    if (!autoRefresh) {
      setSecondsLeft(autoRefreshInterval);
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Refresh and reset countdown
          handleRefresh();
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, autoRefreshInterval]);

  return (
    <div className="flex items-center gap-4">
      {/* Auto-refresh toggle */}
      <div className="flex items-center space-x-2">
        <Switch
          id="auto-refresh"
          checked={autoRefresh}
          onCheckedChange={setAutoRefresh}
          disabled={isRefreshing}
        />
        <div className="flex flex-col">
          <Label htmlFor="auto-refresh" className="text-xs font-medium cursor-pointer">
            Atualização automática
          </Label>
          {autoRefresh && (
            <span className="text-xs text-muted-foreground">
              {secondsLeft}s
            </span>
          )}
        </div>
      </div>

      {/* Manual refresh button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-2"
      >
        <RefreshCw
          className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
        />
        {isRefreshing ? 'A atualizar...' : 'Atualizar'}
      </Button>
    </div>
  );
}
