import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as graphPartitionRepo from "@/application/repositories/graphPartitionRepository";
import { assertSafeTestDatabaseUrl, clearTestDatabase } from "@tests/helpers/db";
import { lockPartition, unlockPartition } from "@/services/partitionLock";

describe("GraphPartition distributed locking semantics in MongoDB", () => {

  beforeEach(async () => {
    assertSafeTestDatabaseUrl();
    await clearTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  it("enforces mutual exclusion when multiple workers try to process the same partition", async () => {
    const partition = await graphPartitionRepo.create({
      data: {
        partitionKey: "subject-test-lock-1",
        ticketType: "SPECIFIC_CLASS",
        activeRequests: 5,
        isLocked: false,
      },
    });

    // Worker 1 acquires lock
    const worker1Acquired = await lockPartition(partition.id, "worker-1");
    expect(worker1Acquired).toBe(true);

    // Worker 2 attempts to acquire the same partition lock simultaneously
    const worker2Acquired = await lockPartition(partition.id, "worker-2");
    expect(worker2Acquired).toBe(false);

    // Verify MongoDB state
    const lockedDoc = await graphPartitionRepo.findUnique({ where: { id: partition.id } });
    expect(lockedDoc?.isLocked).toBe(true);
    expect(lockedDoc?.lockedBy).toBe("worker-1");

    // Worker 1 releases lock
    await unlockPartition(partition.id, "worker-1");

    // Worker 2 now succeeds
    const worker2Retry = await lockPartition(partition.id, "worker-2");
    expect(worker2Retry).toBe(true);

    const docAfterRetry = await graphPartitionRepo.findUnique({ where: { id: partition.id } });
    expect(docAfterRetry?.isLocked).toBe(true);
    expect(docAfterRetry?.lockedBy).toBe("worker-2");
  });

  it("automatically reclaims stale partition locks if a worker died without releasing", async () => {
    const partition = await graphPartitionRepo.create({
      data: {
        partitionKey: "subject-test-lock-stale",
        ticketType: "SPECIFIC_CLASS",
        activeRequests: 2,
        isLocked: true,
        lockedBy: "dead-worker",
        // Locked 10 minutes ago (exceeding the 5 min timeout)
        lockedAt: new Date(Date.now() - 10 * 60 * 1000),
      },
    });

    // Healthy worker attempts acquisition
    const acquired = await lockPartition(partition.id, "healthy-worker");
    expect(acquired).toBe(true);

    const doc = await graphPartitionRepo.findUnique({ where: { id: partition.id } });
    expect(doc?.isLocked).toBe(true);
    expect(doc?.lockedBy).toBe("healthy-worker");
  });
});
