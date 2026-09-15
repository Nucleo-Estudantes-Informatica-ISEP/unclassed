import * as graphPartitionRepo from "@/application/repositories/graphPartitionRepository";

export const PARTITION_LOCK_STALE_MS = 2 * 60 * 1000; // 2 minutes

export async function lockPartition(
  partitionId: string,
  processId: string
): Promise<boolean> {
  // Attempt to acquire lock if free or stale
  const staleBefore = new Date(Date.now() - PARTITION_LOCK_STALE_MS);
  const res = await graphPartitionRepo.updateMany({
    where: {
      id: partitionId,
      OR: [
        { isLocked: false },
        {
          isLocked: true,
          lockedAt: { lt: staleBefore },
        },
      ],
    },
    data: {
      isLocked: true,
      lockedAt: new Date(),
      lockedBy: processId,
    },
  });

  return res.count === 1;
}

export async function unlockPartition(
  partitionId: string,
  processId?: string
): Promise<void> {
  // Release lock only if held by this process (if provided)
  await graphPartitionRepo.updateMany({
    where: processId
      ? { id: partitionId, lockedBy: processId }
      : { id: partitionId },
    data: {
      isLocked: false,
      lockedAt: null,
      lockedBy: null,
    },
  });
}
