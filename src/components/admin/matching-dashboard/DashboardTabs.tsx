"use client";

import type { ReactNode } from "react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/lib/components/ui/tabs";

interface DashboardTabsProps {
  overview: ReactNode;
  cron: ReactNode;
  partitions: ReactNode;
  batch: ReactNode;
  settings: ReactNode;
}

export function DashboardTabs({
  overview,
  cron,
  partitions,
  batch,
  settings,
}: DashboardTabsProps) {
  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="cron">Cron Monitor</TabsTrigger>
        <TabsTrigger value="partitions">Graph Partitions</TabsTrigger>
        <TabsTrigger value="batch">Batch Processing</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">{overview}</TabsContent>
      <TabsContent value="cron">{cron}</TabsContent>
      <TabsContent value="partitions">{partitions}</TabsContent>
      <TabsContent value="batch">{batch}</TabsContent>
      <TabsContent value="settings">{settings}</TabsContent>
    </Tabs>
  );
}
