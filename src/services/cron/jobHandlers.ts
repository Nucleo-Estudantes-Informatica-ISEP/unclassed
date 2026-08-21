import type { JobExecutionResult } from "./types";
import prisma from "@/lib/prisma";
import { AdvancedMatchingService } from "@/services/advancedMatchingService";

export class CronJobHandlers {
  private readonly matchingOrchestrator = new AdvancedMatchingService();

  constructor(private readonly database = prisma) {}

  async runBatchMatching(): Promise<JobExecutionResult> {
    const totalActiveRequests = await this.countActiveRequests();
    const results = await this.matchingOrchestrator.runBatchProcessing();

    console.log(
      `🔄 Batch matching completed: ${results.matchesFound} matches found, ${results.processedPartitions} partitions processed`
    );
    if (results.errors.length > 0) {
      console.warn("⚠️ Batch matching errors:", results.errors);
    }

    return {
      processedPartitions: results.processedPartitions,
      matchesFound: results.matchesFound,
      expiredMatches: 0,
      totalActiveRequests,
      errors: results.errors,
    };
  }

  async cleanupProvisionalMatches(): Promise<JobExecutionResult> {
    const expiredMatches =
      await this.matchingOrchestrator.expireProvisionalMatches();
    if (expiredMatches > 0) {
      console.log(`🧹 Expired ${expiredMatches} provisional matches`);
    }

    return {
      processedPartitions: 0,
      matchesFound: 0,
      expiredMatches,
      totalActiveRequests: await this.countActiveRequests(),
      errors: [],
    };
  }

  async runHealthCheck(): Promise<JobExecutionResult> {
    const stats = await this.matchingOrchestrator.getAdvancedStats();
    console.log(
      `💓 Health check: ${stats.totalActiveRequests} active requests, ${stats.activePartitions} active partitions`
    );

    const errors: string[] = [];
    if (stats.averageProcessingTime > 10_000) {
      errors.push(`High processing time: ${stats.averageProcessingTime}ms`);
    }
    if (stats.averageSatisfactionScore < 0.5) {
      errors.push(`Low satisfaction score: ${stats.averageSatisfactionScore}`);
    }
    for (const warning of errors) console.warn(`⚠️ ${warning}`);

    return {
      processedPartitions: stats.activePartitions,
      matchesFound: 0,
      expiredMatches: 0,
      totalActiveRequests: stats.totalActiveRequests,
      errors,
      metadata: {
        averageProcessingTime: stats.averageProcessingTime,
        averageSatisfactionScore: stats.averageSatisfactionScore,
        totalPartitions: stats.partitions,
      },
    };
  }

  private async countActiveRequests() {
    const [single, bundle] = await Promise.all([
      this.database.singleSwapRequest.count({ where: { status: "ACTIVE" } }),
      this.database.bundleSwapRequest.count({ where: { status: "ACTIVE" } }),
    ]);
    return single + bundle;
  }
}
