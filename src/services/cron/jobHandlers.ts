import type { JobExecutionResult } from "./types";
import { logger } from "@/lib/logger";
import { MatchingOrchestrator } from "@/application/matchingOrchestrator";

export class CronJobHandlers {
  private readonly matchingOrchestrator = new MatchingOrchestrator();

  async runBatchMatching(): Promise<JobExecutionResult> {
    const totalActiveRequests =
      await this.matchingOrchestrator.countActiveRequests();
    const results = await this.matchingOrchestrator.runBatchProcessing();

    logger.info(
      {
        matchesFound: results.matchesFound,
        processedPartitions: results.processedPartitions,
      },
      "Batch matching completed"
    );
    if (results.errors.length > 0) {
      logger.warn(
        { errorCount: results.errors.length },
        "Batch matching errors"
      );
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
      logger.info({ expiredMatches }, "Expired provisional matches");
    }

    return {
      processedPartitions: 0,
      matchesFound: 0,
      expiredMatches,
      totalActiveRequests:
        await this.matchingOrchestrator.countActiveRequests(),
      errors: [],
    };
  }

  async runHealthCheck(): Promise<JobExecutionResult> {
    const stats = await this.matchingOrchestrator.getAdvancedStats();
    logger.info(
      {
        activeRequests: stats.totalActiveRequests,
        activePartitions: stats.activePartitions,
      },
      "Health check completed"
    );

    const errors: string[] = [];
    if (stats.averageProcessingTime > 10_000) {
      errors.push(`High processing time: ${stats.averageProcessingTime}ms`);
    }
    if (stats.averageSatisfactionScore < 0.5) {
      errors.push(`Low satisfaction score: ${stats.averageSatisfactionScore}`);
    }
    for (const warning of errors)
      logger.warn({ warning }, "Health check warning");

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
}
