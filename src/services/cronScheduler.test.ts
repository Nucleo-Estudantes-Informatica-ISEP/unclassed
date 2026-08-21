import assert from "node:assert/strict";
import { test } from "node:test";

import { env } from "@/lib/env";

import { JobLock } from "./cron/jobLock";
import { JobRegistry } from "./cron/jobRegistry";
import {
  CronScheduler,
  getLeaseHeartbeatInterval,
  getNextCronRun,
} from "./cronScheduler";

test("renews cron leases well before their expiry", () => {
  assert.equal(getLeaseHeartbeatInterval(8 * 60 * 1_000), 160_000);
  assert.equal(getLeaseHeartbeatInterval(2_000), 1_000);
});

test("job lock releases only the acquired lease token", async () => {
  let releasedWhere: unknown;
  const database = {
    cronLock: {
      updateMany: async () => ({ count: 0 }),
      create: async () => ({}),
      count: async () => 1,
      deleteMany: async ({ where }: { where: unknown }) => {
        releasedWhere = where;
        return { count: 1 };
      },
    },
  } as unknown as ConstructorParameters<typeof JobLock>[0];
  const lock = new JobLock(database);

  const lease = await lock.acquire("batch-matching", 60_000);
  assert.ok(lease);
  await lock.release(lease);

  assert.deepEqual(releasedWhere, {
    jobId: "batch-matching",
    createdAt: lease.acquiredAt,
  });
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
