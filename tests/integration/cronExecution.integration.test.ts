import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CronExecutionStore } from "@/services/cron/executionStore";
import { ScheduledJob } from "@/services/cron/types";
import { assertSafeTestDatabaseUrl, clearTestDatabase } from "@tests/helpers/db";

describe("Cron execution history and state transitions in MongoDB", () => {
  const store = new CronExecutionStore();

  beforeEach(async () => {
    assertSafeTestDatabaseUrl();
    await clearTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  it("records execution lifecycle from RUNNING to SUCCESS in MongoDB", async () => {
    const job: ScheduledJob = {
      id: "batch-matching",
      name: "Batch Matching Job",
      schedule: "*/5 * * * *",
      enabled: true,
      isRunning: false,
      lockTimeout: 60_000,
      handler: async () => {},
    };

    const record = await store.create(job);
    expect(record).not.toBeNull();
    expect(record?.jobId).toBe("batch-matching");
    expect(record?.status).toBe("RUNNING");

    if (!record) throw new Error("Expected record");

    // Update execution status to COMPLETED
    const completedAt = new Date();
    await store.update(record.id, {
      status: "COMPLETED",
      completedAt,
      duration: 1250,
      matchesFound: 2,
    });

    const history = await store.history(10);
    expect(history.length).toBe(1);
    expect(history[0].id).toBe(record.id);
    expect(history[0].status).toBe("COMPLETED");
    expect(history[0].duration).toBe(1250);
  });

  it("returns execution history ordered by startedAt descending", async () => {
    const job: ScheduledJob = {
      id: "cleanup",
      name: "Provisional Cleanup",
      schedule: "*/30 * * * *",
      enabled: true,
      isRunning: false,
      lockTimeout: 60_000,
      handler: async () => {},
    };

    const r1 = await store.create(job);
    const r2 = await store.create(job);

    const history = await store.history(10);
    expect(history.length).toBe(2);
    // Most recent execution first
    expect(history[0].id).toBe(r2?.id);
    expect(history[1].id).toBe(r1?.id);
  });
});
