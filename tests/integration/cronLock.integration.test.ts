import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as cronLockRepo from "@/application/repositories/cronLockRepository";
import { JobLock } from "@/services/cron/jobLock";
import { assertSafeTestDatabaseUrl, clearTestDatabase } from "@tests/helpers/db";

describe("Distributed CronLock persistence semantics", () => {
  const lock = new JobLock(10_000);

  beforeEach(async () => {
    assertSafeTestDatabaseUrl();
    await clearTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  it("successfully acquires an available lock", async () => {
    const jobId = "batch-matching";
    const lease = await lock.acquire(jobId, 5_000);

    expect(lease).not.toBeNull();
    expect(lease?.jobId).toBe(jobId);

    const record = await cronLockRepo.findUnique({
      where: { jobId },
    });
    expect(record).not.toBeNull();
    expect(record?.jobId).toBe(jobId);
  });

  it("prevents concurrent acquisition while the lease remains active", async () => {
    const jobId = "provisional-cleanup";
    const lease1 = await lock.acquire(jobId, 10_000);
    expect(lease1).not.toBeNull();

    // Second acquisition attempt for the same job should fail
    const lease2 = await lock.acquire(jobId, 10_000);
    expect(lease2).toBeNull();
  });

  it("releases a lease so another caller can acquire the lock", async () => {
    const jobId = "health-check";
    const lease1 = await lock.acquire(jobId, 10_000);
    expect(lease1).not.toBeNull();

    if (lease1) {
      await lock.release(lease1);
    }

    const lease2 = await lock.acquire(jobId, 10_000);
    expect(lease2).not.toBeNull();
  });

  it("renews an active lease successfully", async () => {
    const jobId = "system-maintenance";
    const lease = await lock.acquire(jobId, 5_000);
    expect(lease).not.toBeNull();

    if (!lease) throw new Error("Expected lease");

    const renewed = await lock.renew(lease);
    expect(renewed).toBe(true);
  });

  it("reclaims a lease that has expired", async () => {
    const jobId = "expired-job";

    // Insert an expired lock row directly through repository
    const past = new Date(Date.now() - 5_000);
    await cronLockRepo.create({
      data: {
        jobId,
        expiresAt: past,
        createdAt: past,
      },
    });

    // Acquire should detect the expired lock and reclaim it
    const lease = await lock.acquire(jobId, 5_000);
    expect(lease).not.toBeNull();
    expect(lease?.jobId).toBe(jobId);

    const updatedRecord = await cronLockRepo.findUnique({
      where: { jobId },
    });
    expect(updatedRecord?.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
