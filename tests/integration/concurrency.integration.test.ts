import {
  assertSafeTestDatabaseUrl,
  clearTestDatabase,
  createActiveSingleRequest,
  createTestClass,
  createTestSubject,
  createTestUser,
  seedProposedMatch,
} from "@tests/helpers/db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { JobLock } from "@/services/cron/jobLock";
import { MatchingOrchestrator } from "@/application/matchingOrchestrator";
import * as bundleSwapRepo from "@/application/repositories/bundleSwapRequestRepository";
import * as cronLockRepo from "@/application/repositories/cronLockRepository";
import * as graphPartitionRepo from "@/application/repositories/graphPartitionRepository";
import * as matchRepo from "@/application/repositories/matchRepository";
import * as singleSwapRepo from "@/application/repositories/singleSwapRequestRepository";
import {
  MatchActionConflictError,
  MatchActionError,
  processMatchAction,
} from "@/application/services/matchActionService";
import {
  cancelSwapRequest,
  createBundleSwapRequest,
  createSingleSwapRequest,
  SwapRequestConflictError,
  SwapRequestForbiddenError,
} from "@/application/services/swapRequestService";
import { SessionUser } from "@/application/services/userService";

vi.mock("@/services/matchingTriggers", () => ({
  triggerImmediateMatching: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/services/emailService", () => ({
  emailService: {
    sendMatchNotification: vi.fn().mockResolvedValue(undefined),
    sendMatchStatusUpdate: vi.fn().mockResolvedValue(undefined),
  },
}));

function toSessionUser(user: Omit<SessionUser, "role" | "roles">): SessionUser {
  return {
    ...user,
    role: "USER",
    roles: [],
  };
}

describe("Concurrency invariants", () => {
  beforeEach(async () => {
    assertSafeTestDatabaseUrl();
    await clearTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  it("Multiple concurrent attempts to create the same active SingleSwapRequest", async () => {
    const user = await createTestUser();
    const subject = await createTestSubject();
    const currentClass = await createTestClass();
    const targetClass = await createTestClass();
    const session = toSessionUser(user);

    const promises = Array.from({ length: 5 }).map(() =>
      createSingleSwapRequest(
        session,
        {
          subjectId: subject.id,
          currentClassId: currentClass.id,
          preferredClassIds: [targetClass.id],
          preferenceOrderMatters: false,
        },
        singleSwapRepo
      ).catch((e) => e)
    );

    const results = await Promise.all(promises);

    const successes = results.filter((r) => !(r instanceof Error));
    const conflicts = results.filter(
      (r) => r instanceof SwapRequestConflictError
    );

    expect(successes.length).toBe(1);
    expect(conflicts.length).toBe(4);

    const allRequests = await singleSwapRepo.findMany({
      where: { userId: user.id },
    });
    expect(allRequests.length).toBe(1);
    expect(allRequests[0].status).toBe("ACTIVE");
  });

  it("Multiple concurrent attempts to create the same active BundleSwapRequest", async () => {
    const user = await createTestUser();
    const currentClass = await createTestClass({ year: 2 });
    const targetClass = await createTestClass({ year: 2 });
    const session = toSessionUser(user);

    const promises = Array.from({ length: 5 }).map(() =>
      createBundleSwapRequest(
        session,
        {
          currentClassId: currentClass.id,
          preferredClassIds: [targetClass.id],
          preferenceOrderMatters: false,
        },
        bundleSwapRepo
      ).catch((e) => e)
    );

    const results = await Promise.all(promises);

    const successes = results.filter((r) => !(r instanceof Error));
    const conflicts = results.filter(
      (r) => r instanceof SwapRequestConflictError
    );

    expect(successes.length).toBe(1);
    expect(conflicts.length).toBe(4);

    const allRequests = await bundleSwapRepo.findMany({
      where: { userId: user.id },
    });
    expect(allRequests.length).toBe(1);
    expect(allRequests[0].status).toBe("ACTIVE");
  });

  it("Two workers attempting to acquire the same CronLock", async () => {
    const lock1 = new JobLock(5000);
    const lock2 = new JobLock(5000);
    const jobId = "concurrent-job-lock";

    const promises = [lock1.acquire(jobId, 5000), lock2.acquire(jobId, 5000)];

    const results = await Promise.all(promises);
    const successfulLeases = results.filter((r) => r !== null);

    expect(successfulLeases.length).toBe(1);

    // Invariant: Only one CronLock owner at a time
    const lockCount = await cronLockRepo.count({ where: { jobId } });
    expect(lockCount).toBe(1);
    const lockInDb = await cronLockRepo.findUnique({ where: { jobId } });
    expect(lockInDb).not.toBeNull();
    expect(lockInDb?.jobId).toBe(jobId);
    const expectedExpiry = successfulLeases[0]!.acquiredAt.getTime() + 5000;
    expect(
      Math.abs(lockInDb!.expiresAt.getTime() - expectedExpiry)
    ).toBeLessThanOrEqual(100);
  });

  it("Lock lease renewal while another worker attempts acquisition", async () => {
    const lock1 = new JobLock(5000);
    const lock2 = new JobLock(5000);
    const jobId = "renew-vs-acquire";

    const lease1 = await lock1.acquire(jobId, 5000);
    expect(lease1).not.toBeNull();

    const preRenewalLock = await cronLockRepo.findUnique({ where: { jobId } });
    expect(preRenewalLock).not.toBeNull();
    const preRenewalExpiry = preRenewalLock!.expiresAt.getTime();

    // Ensure clock advances past initial acquire timestamp to guarantee deterministic expiry extension
    await new Promise((resolve) => setTimeout(resolve, 20));

    const [renewResult, acquireResult] = await Promise.all([
      lock1.renew(lease1!),
      lock2.acquire(jobId, 5000),
    ]);

    expect(renewResult).toBe(true);
    expect(acquireResult).toBeNull();

    // Invariant: Only one CronLock record exists, and lease duration is properly extended
    const lockCount = await cronLockRepo.count({ where: { jobId } });
    expect(lockCount).toBe(1);
    const lockInDb = await cronLockRepo.findUnique({ where: { jobId } });
    expect(lockInDb).not.toBeNull();
    expect(lockInDb?.expiresAt.getTime()).toBeGreaterThan(
      preRenewalExpiry
    );
  });

  it("Concurrent matching runs against the same graph partition", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const subject = await createTestSubject();
    const class1 = await createTestClass();
    const class2 = await createTestClass();

    await graphPartitionRepo.create({
      data: {
        partitionKey: `subject-${subject.id}`,
        ticketType: "SPECIFIC_CLASS",
        subjectId: subject.id,
        activeRequests: 2,
      },
    });

    // Set up directly to avoid fire-and-forget background matching side effects
    const req1 = await createActiveSingleRequest(
      user1.id,
      subject.id,
      class1.id,
      class2.id
    );
    const req2 = await createActiveSingleRequest(
      user2.id,
      subject.id,
      class2.id,
      class1.id
    );

    const orchestrator = new MatchingOrchestrator();

    const promises = [
      orchestrator.processImmediateMatches(req1.id).catch((e) => e),
      orchestrator.processImmediateMatches(req2.id).catch((e) => e),
      orchestrator.processImmediateMatches(req1.id).catch((e) => e),
    ];

    const results = await Promise.all(promises);

    const processedCounts = results.filter(
      (r) => Array.isArray(r) && r.length > 0
    ).length;
    const errors = results.filter((r) => r instanceof Error);

    // Exactly one match must be generated
    expect(errors.length).toBe(0);
    expect(processedCounts).toBe(1);

    const matchesInDb = await matchRepo.findMany({});
    expect(matchesInDb.length).toBe(1);

    // Invariant: No duplicate committed matches, no orphaned references
    expect(matchesInDb[0].singleSwapRequestIds).toHaveLength(2);
    expect(matchesInDb[0].singleSwapRequestIds).toContain(req1.id);
    expect(matchesInDb[0].singleSwapRequestIds).toContain(req2.id);

    // Invariant: No partially-applied state transitions on requests
    const updatedReq1 = await singleSwapRepo.findUnique({
      where: { id: req1.id },
    });
    const updatedReq2 = await singleSwapRepo.findUnique({
      where: { id: req2.id },
    });
    expect(updatedReq1?.status).toBe("MATCHED");
    expect(updatedReq2?.status).toBe("MATCHED");
    expect(updatedReq1?.provisionalMatchId).toBe(matchesInDb[0].id);
    expect(updatedReq2?.provisionalMatchId).toBe(matchesInDb[0].id);

    // Invariant: Partition lock is cleanly released, not stuck
    const partition = await graphPartitionRepo.findUnique({
      where: { partitionKey: `subject-${subject.id}` },
    });
    expect(partition?.isLocked).toBe(false);
    expect(partition?.lockedBy).toBeNull();
    // activeRequests becomes 0 because the requests transitioned from ACTIVE to MATCHED
    expect(partition?.activeRequests).toBe(0);
  });

  it("Concurrent accept/reject actions against the same Match", async () => {
    const { user1, subject, match, req1, req2 } = await seedProposedMatch();

    // Concurrent accept and reject from the same user
    const promises = [
      processMatchAction(match.id, user1.id, "accept").catch((e) => e),
      processMatchAction(match.id, user1.id, "reject").catch((e) => e),
    ];

    const results = await Promise.all(promises);

    const successes = results.filter((r) => !(r instanceof Error));
    const conflicts = results.filter(
      (r) =>
        r instanceof MatchActionError || r instanceof MatchActionConflictError
    );

    expect(successes.length).toBeGreaterThanOrEqual(1);
    expect(successes.length + conflicts.length).toBe(2);

    const finalMatch = await matchRepo.findUnique({ where: { id: match.id } });
    expect(["PROPOSED", "REJECTED"]).toContain(finalMatch?.status);

    const finalReq1 = await singleSwapRepo.findUnique({
      where: { id: req1.id },
    });
    const finalReq2 = await singleSwapRepo.findUnique({
      where: { id: req2.id },
    });

    if (finalMatch?.status === "REJECTED") {
      // Both requests should revert to ACTIVE with no provisionalMatchId
      expect(finalReq1?.status).toBe("ACTIVE");
      expect(finalReq1?.provisionalMatchId).toBeNull();
      expect(finalReq2?.status).toBe("ACTIVE");
      expect(finalReq2?.provisionalMatchId).toBeNull();

      const finalPartition = await graphPartitionRepo.findUnique({
        where: { partitionKey: `subject-${subject.id}` },
      });
      expect(finalPartition?.activeRequests).toBe(2);
    } else {
      expect(finalMatch?.status).toBe("PROPOSED");
      const participants = finalMatch?.participants as
        Array<{ userId: string; status: string }> | undefined;
      const p1 = participants?.find((p) => p.userId === user1.id);
      expect(p1?.status).toBe("accepted");
      expect(finalReq1?.status).toBe("MATCHED");
      expect(finalReq1?.provisionalMatchId).toBe(match.id);
      expect(finalReq2?.status).toBe("MATCHED");
      expect(finalReq2?.provisionalMatchId).toBe(match.id);

      const finalPartition = await graphPartitionRepo.findUnique({
        where: { partitionKey: `subject-${subject.id}` },
      });
      expect(finalPartition?.activeRequests).toBe(0);
    }
  });

  it.todo(
    "Concurrent non-atomic cancels from the same user succeed gracefully (known tolerated check-then-act race - #170)"
  );

  it("Repeated/retried idempotent operations (acceptMatch concurrently)", async () => {
    const { user1, match } = await seedProposedMatch();

    // Run multiple accept match operations exactly concurrently
    const promises = Array.from({ length: 3 }).map(() =>
      processMatchAction(match.id, user1.id, "accept").catch((e) => e)
    );
    const results = await Promise.all(promises);

    const successes = results.filter((r) => !(r instanceof Error));
    const conflicts = results.filter((r) => r instanceof Error);

    // Exactly one action wins atomic update; the other encounters concurrency conflict
    expect(successes.length).toBe(1);
    expect(conflicts.length).toBe(2);

    const finalMatch = await matchRepo.findUnique({ where: { id: match.id } });

    const participants = finalMatch?.participants as
      Array<{ userId: string; status: string }> | undefined;
    const participant = participants?.find((p) => p.userId === user1.id);
    expect(participant?.status).toBe("accepted");

    // Invariant: Idempotent operations have exactly one effective result, no duplicate participant entries
    const participantEntries = participants?.filter(
      (p) => p.userId === user1.id
    );
    expect(participantEntries?.length).toBe(1);

    const matchCount = await matchRepo.count({ where: { id: match.id } });
    expect(matchCount).toBe(1);
  });

  it("Concurrent accept and reject by different participants yields a valid consistent state", async () => {
    const { user1, user2, subject, match, req1, req2 } =
      await seedProposedMatch();

    // User 1 accepts while User 2 rejects concurrently
    const promises = [
      processMatchAction(match.id, user1.id, "accept").catch((e) => e),
      processMatchAction(match.id, user2.id, "reject").catch((e) => e),
    ];

    const results = await Promise.all(promises);

    const successes = results.filter((r) => !(r instanceof Error));
    const conflicts = results.filter(
      (r) =>
        r instanceof MatchActionError || r instanceof MatchActionConflictError
    );

    expect(successes.length).toBeGreaterThanOrEqual(1);
    expect(successes.length + conflicts.length).toBe(2);

    const finalMatch = await matchRepo.findUnique({ where: { id: match.id } });
    const finalReq1 = await singleSwapRepo.findUnique({
      where: { id: req1.id },
    });
    const finalReq2 = await singleSwapRepo.findUnique({
      where: { id: req2.id },
    });

    const participants = finalMatch?.participants as
      Array<{ userId: string; status: string }> | undefined;
    const p1 = participants?.find((p) => p.userId === user1.id);
    const p2 = participants?.find((p) => p.userId === user2.id);

    // Invariant: No partially-applied state transitions or orphaned references
    if (finalMatch?.status === "REJECTED") {
      expect(finalReq1?.status).toBe("ACTIVE");
      expect(finalReq1?.provisionalMatchId).toBeNull();
      expect(finalReq2?.status).toBe("ACTIVE");
      expect(finalReq2?.provisionalMatchId).toBeNull();
      expect(p2?.status).toBe("rejected");
      if (successes.length === 2) {
        expect(p1?.status).toBe("accepted");
      } else {
        expect(p1?.status).toBe("pending");
      }

      const finalPartition = await graphPartitionRepo.findUnique({
        where: { partitionKey: `subject-${subject.id}` },
      });
      expect(finalPartition?.activeRequests).toBe(2);
    } else {
      expect(finalMatch?.status).toBe("PROPOSED");
      expect(p1?.status).toBe("accepted");
      expect(p2?.status).toBe("pending");
      expect(finalReq1?.status).toBe("MATCHED");
      expect(finalReq1?.provisionalMatchId).toBe(match.id);
      expect(finalReq2?.status).toBe("MATCHED");
      expect(finalReq2?.provisionalMatchId).toBe(match.id);

      const finalPartition = await graphPartitionRepo.findUnique({
        where: { partitionKey: `subject-${subject.id}` },
      });
      expect(finalPartition?.activeRequests).toBe(0);
    }
  });

  it.todo(
    "Same user operating from multiple concurrent sessions with conflicting operations - cancel vs update (known tolerated check-then-act race - #170)"
  );

  it("User Isolation / Authorization under concurrency", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    const subject = await createTestSubject();
    const class1 = await createTestClass();
    const class2 = await createTestClass();

    const reqA = await createActiveSingleRequest(
      userA.id,
      subject.id,
      class1.id,
      class2.id
    );

    const sessionA = toSessionUser(userA);
    const sessionB = toSessionUser(userB); // Unauthorized attacker

    // Both attempt to cancel the same request simultaneously
    const promises = [
      cancelSwapRequest(sessionB, reqA.id, singleSwapRepo).catch((e) => e),
      cancelSwapRequest(sessionA, reqA.id, singleSwapRepo).catch((e) => e),
    ];

    const results = await Promise.all(promises);

    const attackerResult = results[0];
    const ownerResult = results[1];

    expect(attackerResult).toBeInstanceOf(SwapRequestForbiddenError);
    expect(ownerResult).not.toBeInstanceOf(Error);

    // Verify DB integrity: cancelled correctly and only once, B made no mutations
    const finalReq = await singleSwapRepo.findUnique({
      where: { id: reqA.id },
    });
    expect(finalReq?.status).toBe("CANCELLED");

    const count = await singleSwapRepo.count({
      where: { id: reqA.id, status: "CANCELLED" },
    });
    expect(count).toBe(1);
  });
});
