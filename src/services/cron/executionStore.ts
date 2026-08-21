import type { CronExecution, Prisma } from "@prisma/client";

import type { CronStats, ScheduledJob } from "./types";
import prisma from "@/lib/prisma";

export class CronExecutionStore {
  constructor(private readonly database = prisma) {}

  async create(job: ScheduledJob): Promise<CronExecution | null> {
    try {
      return await this.database.cronExecution.create({
        data: {
          jobId: job.id,
          jobName: job.name,
          startedAt: new Date(),
          status: "RUNNING",
        },
      });
    } catch (error) {
      console.warn("Failed to create cron execution record:", error);
      return null;
    }
  }

  async update(id: string, data: Prisma.CronExecutionUpdateInput) {
    try {
      await this.database.cronExecution.update({ where: { id }, data });
    } catch (error) {
      console.warn("Failed to update cron execution record:", error);
    }
  }

  async history(limit = 50): Promise<CronExecution[]> {
    try {
      return await this.database.cronExecution.findMany({
        orderBy: { startedAt: "desc" },
        take: limit,
      });
    } catch (error) {
      console.error("Failed to get execution history:", error);
      return [];
    }
  }

  async stats(
    schedulerRunning: boolean,
    jobs: ScheduledJob[]
  ): Promise<CronStats> {
    const schedulerStatus = schedulerRunning ? "RUNNING" : "STOPPED";
    const enabledJobs = jobs.filter((job) => job.enabled);
    const nextScheduledRuns = enabledJobs
      .filter((job): job is ScheduledJob & { nextRun: Date } =>
        Boolean(job.nextRun)
      )
      .map((job) => ({ jobName: job.name, nextRun: job.nextRun }))
      .sort(
        (first, second) => first.nextRun.getTime() - second.nextRun.getTime()
      );

    try {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1_000);
      const [recent, last24h, last] = await Promise.all([
        this.database.cronExecution.findMany({
          where: {
            startedAt: { gte: new Date(now.getTime() - 60 * 60 * 1_000) },
          },
          orderBy: { startedAt: "desc" },
        }),
        this.database.cronExecution.findMany({
          where: { startedAt: { gte: last24Hours } },
        }),
        this.database.cronExecution.findFirst({
          where: { status: "COMPLETED" },
          orderBy: { completedAt: "desc" },
        }),
      ]);
      const completed = last24h.filter(({ status }) => status === "COMPLETED");
      const failed = last24h.filter(({ status }) => status === "FAILED");
      const averageExecutionTime = completed.length
        ? completed.reduce((sum, run) => sum + (run.duration ?? 0), 0) /
          completed.length
        : 0;

      return {
        lastRunTime: last?.completedAt ?? last?.startedAt ?? null,
        totalExecutions24h: last24h.length,
        successfulExecutions24h: completed.length,
        failedExecutions24h: failed.length,
        totalMatchesFound24h: completed.reduce(
          (sum, run) => sum + run.matchesFound,
          0
        ),
        totalExpiredMatches24h: completed.reduce(
          (sum, run) => sum + run.expiredMatches,
          0
        ),
        averageExecutionTime: Math.round(averageExecutionTime),
        successRate24h: last24h.length ? completed.length / last24h.length : 0,
        recentExecutions: recent.slice(0, 10),
        isRunning: recent.some(({ status }) => status === "RUNNING"),
        schedulerStatus,
        activeJobs: enabledJobs.length,
        nextScheduledRuns,
      };
    } catch (error) {
      console.error("Failed to get cron stats:", error);
      return {
        lastRunTime: null,
        totalExecutions24h: 0,
        successfulExecutions24h: 0,
        failedExecutions24h: 0,
        totalMatchesFound24h: 0,
        totalExpiredMatches24h: 0,
        averageExecutionTime: 0,
        successRate24h: 0,
        recentExecutions: [],
        isRunning: false,
        schedulerStatus,
        activeJobs: 0,
        nextScheduledRuns: [],
      };
    }
  }
}
