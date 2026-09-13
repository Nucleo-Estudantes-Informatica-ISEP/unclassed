import type { LockLease } from "./types";
import * as cronLockRepo from "@/application/repositories/cronLockRepository";

export function getLeaseHeartbeatInterval(timeoutMs: number): number {
  return Math.max(1_000, Math.floor(timeoutMs / 3));
}

export class JobLock {
  constructor(
    private readonly defaultTimeout = 10 * 60 * 1_000
  ) {}

  async acquire(
    jobId: string,
    timeoutMs = this.defaultTimeout
  ): Promise<LockLease | null> {
    const effectiveTimeout = timeoutMs || this.defaultTimeout;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + effectiveTimeout);

    try {
      const reclaimed = await cronLockRepo.updateMany({
        where: { jobId, expiresAt: { lte: now } },
        data: { expiresAt, createdAt: now },
      });
      if (reclaimed.count > 0) {
        return { jobId, acquiredAt: now, timeoutMs: effectiveTimeout };
      }

      await cronLockRepo.create({
        data: { jobId, expiresAt, createdAt: now },
      });
      return { jobId, acquiredAt: now, timeoutMs: effectiveTimeout };
    } catch (error) {
      if (cronLockRepo.isUniqueConstraintError(error)) {
        try {
          const reclaimed = await cronLockRepo.updateMany({
            where: { jobId, expiresAt: { lte: new Date() } },
            data: { expiresAt, createdAt: now },
          });
          if (reclaimed.count > 0) {
            return { jobId, acquiredAt: now, timeoutMs: effectiveTimeout };
          }

          const lockCount = await cronLockRepo.count({
            where: { jobId },
          });
          if (lockCount > 1) {
            console.error(
              `Lock invariant violation for job ${jobId}: found ${lockCount} lock rows`
            );
          }
        } catch (retryError) {
          console.warn(
            `Failed to retry lock reclaim for job ${jobId}:`,
            retryError
          );
        }
        return null;
      }

      console.warn(`Failed to acquire lock for job ${jobId}:`, error);
      return null;
    }
  }

  async renew(lease: LockLease): Promise<boolean> {
    const now = new Date();
    const renewed = await cronLockRepo.updateMany({
      where: {
        jobId: lease.jobId,
        createdAt: lease.acquiredAt,
        expiresAt: { gt: now },
      },
      data: { expiresAt: new Date(now.getTime() + lease.timeoutMs) },
    });
    return renewed.count === 1;
  }

  async release(lease: LockLease): Promise<void> {
    try {
      await cronLockRepo.deleteMany({
        where: { jobId: lease.jobId, createdAt: lease.acquiredAt },
      });
    } catch {
      console.debug(
        `Lock release for job ${lease.jobId} had no effect (likely already expired)`
      );
    }
  }
}
