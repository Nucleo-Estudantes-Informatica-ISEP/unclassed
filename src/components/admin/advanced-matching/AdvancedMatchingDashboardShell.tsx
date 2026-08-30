"use client";

import type { ReactNode } from "react";
import { Activity, Pause, Play, RefreshCw, Settings } from "lucide-react";

import { Badge } from "@/lib/components/ui/badge";
import { Button } from "@/lib/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/lib/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/lib/components/ui/tabs";

import { BatchRunControl } from "./BatchRunControl";
import { useDashboardRefresh } from "./useDashboardRefresh";

interface AdvancedMatchingDashboardShellProps {
  overview: ReactNode;
  cronMonitor: ReactNode;
  partitions: ReactNode;
  totalPartitions: number;
  activePartitions: number;
  updatedAt: string;
}

export function AdvancedMatchingDashboardShell({
  overview,
  cronMonitor,
  partitions,
  totalPartitions,
  activePartitions,
  updatedAt,
}: AdvancedMatchingDashboardShellProps) {
  const dashboard = useDashboardRefresh();

  return (
    <div className="w-full">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Advanced Matching Dashboard
            </h2>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Monitor and control the advanced matching system with per-class
              graph partitioning
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant={dashboard.autoRefresh ? "default" : "secondary"}
              className="flex items-center gap-1"
            >
              <Activity className="h-3 w-3" />
              Auto-refresh {dashboard.autoRefresh ? "ON" : "OFF"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={dashboard.toggleAutoRefresh}
            >
              {dashboard.autoRefresh ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void dashboard.refresh()}
              disabled={dashboard.refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 ${dashboard.refreshing ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cron">Cron Monitor</TabsTrigger>
          <TabsTrigger value="partitions">Graph Partitions</TabsTrigger>
          <TabsTrigger value="batch">Batch Processing</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {overview}
        </TabsContent>
        <TabsContent value="cron" className="space-y-6">
          {cronMonitor}
        </TabsContent>
        <TabsContent value="partitions" className="space-y-6">
          {partitions}
        </TabsContent>
        <TabsContent value="batch" className="space-y-6">
          <BatchRunControl />
        </TabsContent>
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Dashboard Settings
              </CardTitle>
              <CardDescription>
                Configure dashboard refresh and display options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Auto-refresh</h3>
                  <p className="text-muted-foreground text-sm">
                    Automatically refresh statistics every 30 seconds
                  </p>
                </div>
                <Button
                  variant={dashboard.autoRefresh ? "default" : "outline"}
                  size="sm"
                  onClick={dashboard.toggleAutoRefresh}
                >
                  {dashboard.autoRefresh ? "Enabled" : "Disabled"}
                </Button>
              </div>

              <div className="border-t pt-4">
                <h3 className="mb-2 font-medium">System Information</h3>
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">
                      Total Graph Partitions
                    </p>
                    <p className="font-medium">{totalPartitions}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Active Partitions</p>
                    <p className="font-medium">{activePartitions}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Updated</p>
                    <p className="font-medium">{updatedAt}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Dashboard Version</p>
                    <p className="font-medium">v2.0 (Advanced)</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
