import assert from "node:assert/strict";
import { test } from "node:test";

import { CronScheduler, getNextCronRun } from "./cronScheduler";

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
  const originalSchedule = process.env.CRON_BATCH_MATCHING;
  process.env.CRON_BATCH_MATCHING = "invalid";
  const scheduler = new CronScheduler();

  try {
    assert.throws(() => scheduler.start(), /Invalid cron expression "invalid":/);
    assert.equal(scheduler.isRunning(), false);

    scheduler.setJobEnabled("batch-matching", false);
    scheduler.start();

    assert.equal(scheduler.isRunning(), true);
    assert.ok(scheduler.getJobStatus().find((job) => job.id === "health-check")?.nextRun);
    assert.throws(() =>
      scheduler.addJob({
        id: "invalid",
        name: "Invalid",
        schedule: "invalid",
        handler: async () => undefined,
        enabled: true,
        isRunning: false
      })
    );
    assert.equal(scheduler.getJobStatus().some((job) => job.id === "invalid"), false);
  } finally {
    scheduler.stop();
    if (originalSchedule === undefined) {
      delete process.env.CRON_BATCH_MATCHING;
    } else {
      process.env.CRON_BATCH_MATCHING = originalSchedule;
    }
  }
});
