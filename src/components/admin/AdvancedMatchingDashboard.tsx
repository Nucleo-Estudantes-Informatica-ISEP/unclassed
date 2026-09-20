import { AlertTriangle } from "lucide-react";

import { Card, CardContent } from "@/lib/components/ui/card";
import { getCronScheduler } from "@/services/cronScheduler";
import { RefreshButton } from "@/components/RefreshButton";
import { MatchingOrchestrator } from "@/application/matchingOrchestrator";

import { BatchTab } from "./matching-dashboard/BatchTab";
import { CronTab } from "./matching-dashboard/CronTab";
import { DashboardTabs } from "./matching-dashboard/DashboardTabs";
import { OverviewTab } from "./matching-dashboard/OverviewTab";
import { PartitionsTab } from "./matching-dashboard/PartitionsTab";
import { SettingsTab } from "./matching-dashboard/SettingsTab";

async function loadDashboardData() {
  try {
    const scheduler = getCronScheduler();
    const [stats, cronStats, cronHistory] = await Promise.all([
      new MatchingOrchestrator().getAdvancedStats(),
      scheduler.getCronStats(),
      scheduler.getExecutionHistory(100),
    ]);

    return { stats, cronStats, cronHistory, loadedAt: new Date() };
  } catch (error) {
    console.error("Failed to load matching dashboard:", error);
    return null;
  }
}

export default async function AdvancedMatchingDashboard() {
  const data = await loadDashboardData();

  if (!data) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <p className="text-lg font-medium">
            Falha ao carregar estatísticas de matching
          </p>
          <div className="mt-4 flex justify-center">
            <RefreshButton />
          </div>
        </CardContent>
      </Card>
    );
  }

  const { stats, cronStats, cronHistory, loadedAt } = data;

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
          <RefreshButton />
        </div>
      </div>

      <DashboardTabs
        overview={<OverviewTab stats={stats} />}
        cron={<CronTab cronStats={cronStats} cronHistory={cronHistory} />}
        partitions={<PartitionsTab partitionStats={stats.partitionStats} />}
        batch={<BatchTab />}
        settings={
          <SettingsTab
            partitions={stats.partitions}
            activePartitions={stats.activePartitions}
            loadedAt={loadedAt}
          />
        }
      />
    </div>
  );
}
