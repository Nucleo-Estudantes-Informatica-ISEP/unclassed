import assert from "node:assert/strict";
import { test, vi } from "vitest";

import { env } from "@/lib/env";

import { JobLock } from "./cron/jobLock";
import * as cronLockRepo from "@/application/repositories/cronLockRepository";
import { JobRegistry } from "./cron/jobRegistry";
import {
  CronScheduler,
  getCronScheduler,
  getLeaseHeartbeatInterval,
  getNextCronRun,
  initializeCronScheduler,
} from "./cronScheduler";

test("renews cron leases well before their expiry", () => {
  assert.equal(getLeaseHeartbeatInterval(8 * 60 * 1_000), 160_000);
  assert.equal(getLeaseHeartbeatInterval(2_000), 1_000);
});

test("job lock releases only the acquired lease token", async () => {
  let releasedWhere: unknown;
  vi.spyOn(cronLockRepo, "updateMany").mockResolvedValue({ count: 0 } as never);
  vi.spyOn(cronLockRepo, "create").mockResolvedValue({} as never);
  vi.spyOn(cronLockRepo, "count").mockResolvedValue(1 as never);
  vi.spyOn(cronLockRepo, "deleteMany").mockImplementation(async (args: Parameters<typeof cronLockRepo.deleteMany>[0]) => {
    releasedWhere = args?.where;
    return { count: 1 } as never;
  });

  const lock = new JobLock();

  const lease = await lock.acquire("batch-matching", 60_000);
  assert.ok(lease);
  await lock.release(lease);

  assert.deepEqual(releasedWhere, {
    jobId: "batch-matching",
    createdAt: lease.acquiredAt,
  });

  vi.restoreAllMocks();
});

test("job lock treats an explicit zero timeout as the default", async () => {
  let createdData: Parameters<typeof cronLockRepo.create>[0]["data"] | undefined;
  vi.spyOn(cronLockRepo, "updateMany").mockResolvedValue({ count: 0 } as never);
  vi.spyOn(cronLockRepo, "create").mockImplementation(async (args: Parameters<typeof cronLockRepo.create>[0]) => {
    createdData = args.data;
    return {} as never;
  });
  vi.spyOn(cronLockRepo, "count").mockResolvedValue(1 as never);
  vi.spyOn(cronLockRepo, "deleteMany").mockResolvedValue({ count: 1 } as never);

  const defaultTimeout = 60_000;
  const lock = new JobLock(defaultTimeout);

  const lease = await lock.acquire("batch-matching", 0);

  assert.equal(lease?.timeoutMs, defaultTimeout);
  assert.ok(createdData);
  assert.equal(
    new Date(createdData?.expiresAt as string | Date).getTime(),
    new Date(createdData?.createdAt as string | Date).getTime() + defaultTimeout
  );

  vi.restoreAllMocks();
});

test("job registry owns add, enable, and status state", () => {
  const registry = new JobRegistry();
  registry.add({
    id: "job",
    name: "Job",
    schedule: "0 * * * *",
    handler: async () => undefined,
    enabled: true,
    isRunning: false,
  });

  registry.setEnabled("job", false);

  assert.equal(registry.get("job")?.enabled, false);
  assert.deepEqual(registry.status(), [
    {
      id: "job",
      name: "Job",
      schedule: "0 * * * *",
      enabled: false,
      isRunning: false,
      lastRun: undefined,
      nextRun: undefined,
    },
  ]);
});

test("computes custom cron schedules without an hourly fallback", () => {
  const currentDate = new Date("2026-08-07T12:03:00.000Z");

  assert.equal(
    getNextCronRun("*/10 * * * *", currentDate).toISOString(),
    "2026-08-07T12:10:00.000Z"
  );
  assert.throws(
    () => getNextCronRun("invalid", currentDate),
    /Invalid cron expression "invalid":/
  );
});

test("recovers after an invalid schedule fails startup", () => {
  const originalSchedule = env.CRON_BATCH_MATCHING;
  env.CRON_BATCH_MATCHING = "invalid";
  const scheduler = new CronScheduler();

  try {
    assert.throws(
      () => scheduler.start(),
      /Invalid cron expression "invalid":/
    );
    assert.equal(scheduler.isRunning(), false);

    scheduler.setJobEnabled("batch-matching", false);
    scheduler.start();

    assert.equal(scheduler.isRunning(), true);
    assert.ok(
      scheduler.getJobStatus().find((job) => job.id === "health-check")?.nextRun
    );
    assert.throws(() =>
      scheduler.addJob({
        id: "invalid",
        name: "Invalid",
        schedule: "invalid",
        handler: async () => undefined,
        enabled: true,
        isRunning: false,
      })
    );
    assert.equal(
      scheduler.getJobStatus().some((job) => job.id === "invalid"),
      false
    );
  } finally {
    scheduler.stop();
    env.CRON_BATCH_MATCHING = originalSchedule;
  }
});

test("registers graceful shutdown hooks for SIGINT and SIGTERM when enabled", () => {
  const originalNodeEnv = env.NODE_ENV;
  const originalEnableCronScheduler = env.ENABLE_CRON_SCHEDULER;
  const originalOn = process.on;
  const calls: Array<[string, (...args: unknown[]) => unknown]> = [];

  env.NODE_ENV = "production";
  env.ENABLE_CRON_SCHEDULER = true;
  process.on = ((signal: string, listener: (...args: unknown[]) => unknown) => {
    calls.push([signal, listener]);
    return process;
  }) as typeof process.on;

  try {
    initializeCronScheduler();

    assert.deepEqual(
      calls.map(([signal]) => signal).sort(),
      ["SIGINT", "SIGTERM"].sort()
    );
  } finally {
    process.on = originalOn;
    env.NODE_ENV = originalNodeEnv;
    env.ENABLE_CRON_SCHEDULER = originalEnableCronScheduler;
  }
});

test("does not start scheduler in production when ENABLE_CRON_SCHEDULER is false", () => {
  const originalNodeEnv = env.NODE_ENV;
  const originalEnableCronScheduler = env.ENABLE_CRON_SCHEDULER;

  // Stop global scheduler if previous tests left it running
  getCronScheduler().stop();

  env.NODE_ENV = "production";
  env.ENABLE_CRON_SCHEDULER = false;

  try {
    initializeCronScheduler();
    assert.equal(getCronScheduler().isRunning(), false);
  } finally {
    env.NODE_ENV = originalNodeEnv;
    env.ENABLE_CRON_SCHEDULER = originalEnableCronScheduler;
  }
});
