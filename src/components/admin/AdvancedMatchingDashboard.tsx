"use client";

import { useState } from "react";
import { Card, CardContent } from "@/lib/components/ui/card";
import { Button } from "@/lib/components/ui/button";
import { Badge } from "@/lib/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/lib/components/ui/tabs";
import { Activity, AlertTriangle, RefreshCw, Play, Pause } from "lucide-react";

import { OverviewTab } from "./matching-dashboard/OverviewTab";
import { CronTab } from "./matching-dashboard/CronTab";
import { PartitionsTab } from "./matching-dashboard/PartitionsTab";
import { BatchTab } from "./matching-dashboard/BatchTab";
import { SettingsTab } from "./matching-dashboard/SettingsTab";
import { useMatchingData } from "./matching-dashboard/useMatchingData";

export default function AdvancedMatchingDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { stats, cronStats, cronHistory, isLoading, isValidating, isError, mutate } = useMatchingData(autoRefresh);

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <p className="text-lg font-medium">Falha ao carregar estatísticas de matching</p>
            <Button onClick={mutate} className="mt-4" disabled={isValidating}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Advanced Matching Dashboard</h2>
              <p className="text-sm text-muted-foreground sm:text-base mt-1">
                Monitor and control the advanced matching system with per-class graph partitioning
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={autoRefresh ? "default" : "secondary"} className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Auto-refresh {autoRefresh ? "ON" : "OFF"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAutoRefresh}
              >
                {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={mutate}
                disabled={isValidating}
              >
                <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
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

          <TabsContent value="overview">
            <OverviewTab stats={stats} />
          </TabsContent>

          <TabsContent value="cron">
            {cronStats && <CronTab cronStats={cronStats} cronHistory={cronHistory} />}
          </TabsContent>

          <TabsContent value="partitions">
            <PartitionsTab partitionStats={stats.partitionStats} />
          </TabsContent>

          <TabsContent value="batch">
            <BatchTab onSuccess={mutate} />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab 
              autoRefresh={autoRefresh} 
              toggleAutoRefresh={toggleAutoRefresh}
              partitions={stats.partitions}
              activePartitions={stats.activePartitions}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
