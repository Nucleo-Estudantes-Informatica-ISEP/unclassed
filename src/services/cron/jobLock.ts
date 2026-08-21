import { Prisma } from "@prisma/client";

import type { LockLease } from "./types";
import prisma from "@/lib/prisma";

export function getLeaseHeartbeatInterval(timeoutMs: number): number {
  return Math.max(1_000, Math.floor(timeoutMs / 3));
}

export class JobLock {
  constructor(
    private readonly database = prisma,
    private readonly defaultTimeout = 10 * 60 * 1_000
  ) {}

  async acquire(
    jobId: string,
    timeoutMs = this.defaultTimeout
  ): Promise<LockLease | null> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + timeoutMs);

    try {
      const reclaimed = await this.database.cronLock.updateMany({
        where: { jobId, expiresAt: { lte: now } },
        data: { expiresAt, createdAt: now },
      });
      if (reclaimed.count > 0) return { jobId, acquiredAt: now, timeoutMs };

      await this.database.cronLock.create({
        data: { jobId, expiresAt, createdAt: now },
      });
      return { jobId, acquiredAt: now, timeoutMs };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        try {
          const reclaimed = await this.database.cronLock.updateMany({
            where: { jobId, expiresAt: { lte: new Date() } },
            data: { expiresAt, createdAt: now },
          });
          if (reclaimed.count > 0) return { jobId, acquiredAt: now, timeoutMs };

          const lockCount = await this.database.cronLock.count({
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
    const renewed = await this.database.cronLock.updateMany({
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
      await this.database.cronLock.deleteMany({
        where: { jobId: lease.jobId, createdAt: lease.acquiredAt },
      });
    } catch {
      console.debug(
        `Lock release for job ${lease.jobId} had no effect (likely already expired)`
      );
    }
  }
}
