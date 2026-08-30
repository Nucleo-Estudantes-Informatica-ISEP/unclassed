import { getCronScheduler } from "@/services/cronScheduler";
import { AdvancedMatchingDashboardShell } from "@/components/admin/advanced-matching/AdvancedMatchingDashboardShell";
import { CronMonitor } from "@/components/admin/advanced-matching/CronMonitor";
import { DashboardLoadError } from "@/components/admin/advanced-matching/DashboardLoadError";
import { MatchingStatsOverview } from "@/components/admin/advanced-matching/MatchingStatsOverview";
import { PartitionTable } from "@/components/admin/advanced-matching/PartitionTable";
import { MatchingOrchestrator } from "@/application/matchingOrchestrator";

export default async function AdvancedMatchingDashboard() {
  const scheduler = getCronScheduler();
  const [matchingResult, cronResult] = await Promise.allSettled([
    new MatchingOrchestrator().getAdvancedStats(),
    Promise.all([scheduler.getCronStats(), scheduler.getExecutionHistory(100)]),
  ]);

  if (matchingResult.status === "rejected") {
    console.error("Error loading matching stats:", matchingResult.reason);
    return <DashboardLoadError />;
  }

  if (cronResult.status === "rejected") {
    console.warn("Failed to load cron statistics:", cronResult.reason);
  }

  const stats = matchingResult.value;
  const [cronStats, cronHistory] =
    cronResult.status === "fulfilled" ? cronResult.value : [null, []];

  return (
    <AdvancedMatchingDashboardShell
      overview={<MatchingStatsOverview stats={stats} />}
      cronMonitor={<CronMonitor stats={cronStats} history={cronHistory} />}
      partitions={<PartitionTable partitions={stats.partitionStats} />}
      totalPartitions={stats.partitions}
      activePartitions={stats.activePartitions}
      updatedAt={new Date().toLocaleTimeString()}
    />
  );
}
