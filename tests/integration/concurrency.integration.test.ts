import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as singleSwapRepo from "@/application/repositories/singleSwapRequestRepository";
import * as bundleSwapRepo from "@/application/repositories/bundleSwapRequestRepository";
import * as matchRepo from "@/application/repositories/matchRepository";
import * as cronLockRepo from "@/application/repositories/cronLockRepository";
import {
  createSingleSwapRequest,
  createBundleSwapRequest,
  cancelSwapRequest,
  SwapRequestConflictError,
  SwapRequestForbiddenError,
} from "@/application/services/swapRequestService";
import { JobLock } from "@/services/cron/jobLock";
import { MatchingOrchestrator } from "@/application/matchingOrchestrator";
import { processMatchAction } from "@/application/services/matchActionService";
import { SessionUser } from "@/application/services/userService";
import {
  assertSafeTestDatabaseUrl,
  clearTestDatabase,
  createTestUser,
  createTestSubject,
  createTestClass,
} from "@tests/helpers/db";

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
    const conflicts = results.filter((r) => r instanceof SwapRequestConflictError);

    expect(successes.length).toBe(1);
    expect(conflicts.length).toBe(4);

    const allRequests = await singleSwapRepo.findMany({ where: { userId: user.id } });
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
    const conflicts = results.filter((r) => r instanceof SwapRequestConflictError);

    expect(successes.length).toBe(1);
    expect(conflicts.length).toBe(4);

    const allRequests = await bundleSwapRepo.findMany({ where: { userId: user.id } });
    expect(allRequests.length).toBe(1);
    expect(allRequests[0].status).toBe("ACTIVE");
  });

  it("Two workers attempting to acquire the same CronLock", async () => {
    const lock1 = new JobLock(5000);
    const lock2 = new JobLock(5000);
    const jobId = "concurrent-job-lock";

    const promises = [
      lock1.acquire(jobId, 5000),
      lock2.acquire(jobId, 5000)
    ];

    const results = await Promise.all(promises);
    const successfulLeases = results.filter(r => r !== null);

    expect(successfulLeases.length).toBe(1);

    const locksInDb = await cronLockRepo.findUnique({ where: { jobId } });
    expect(locksInDb).not.toBeNull();
  });

  it("Lock lease renewal while another worker attempts acquisition", async () => {
    const lock1 = new JobLock(5000);
    const lock2 = new JobLock(5000);
    const jobId = "renew-vs-acquire";

    const lease1 = await lock1.acquire(jobId, 5000);
    expect(lease1).not.toBeNull();

    const [renewResult, acquireResult] = await Promise.all([
      lock1.renew(lease1!),
      lock2.acquire(jobId, 5000)
    ]);

    expect(renewResult).toBe(true);
    expect(acquireResult).toBeNull();

    const lockInDb = await cronLockRepo.findUnique({ where: { jobId } });
    expect(lockInDb).not.toBeNull();
    // Validate DB persistence
    expect(lockInDb?.expiresAt.getTime()).toBeGreaterThan(lease1!.acquiredAt.getTime() + 4000);
  });

  it("Concurrent matching runs against the same graph partition", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const subject = await createTestSubject();
    const class1 = await createTestClass();
    const class2 = await createTestClass();

    // Set up directly to avoid fire-and-forget background matching side effects
    const req1 = await singleSwapRepo.createRaw({
      data: {
        userId: user1.id,
        subjectId: subject.id,
        currentClassId: class1.id,
        preferredClassIds: [class2.id],
        ticketType: "SPECIFIC_CLASS",
        priority: 1,
        status: "ACTIVE",
        graphPartition: `subject-${subject.id}`,
        preferenceOrderMatters: false,
      }
    });

    await singleSwapRepo.createRaw({
      data: {
        userId: user2.id,
        subjectId: subject.id,
        currentClassId: class2.id,
        preferredClassIds: [class1.id],
        ticketType: "SPECIFIC_CLASS",
        priority: 1,
        status: "ACTIVE",
        graphPartition: `subject-${subject.id}`,
        preferenceOrderMatters: false,
      }
    });

    const orchestrator = new MatchingOrchestrator();

    const promises = Array.from({ length: 3 }).map(() =>
      orchestrator.processImmediateMatches(req1.id).catch(e => e)
    );

    const results = await Promise.all(promises);

    const processedCounts = results.filter(r => Array.isArray(r) && r.length > 0).length;

    // Exactly one match must be generated and strictly exactly one processing run succeeds
    expect(processedCounts).toBe(1);

    const matchesInDb = await matchRepo.findMany({});
    expect(matchesInDb.length).toBe(1);
  });

  it("Concurrent accept/reject actions against the same Match", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const subject = await createTestSubject();
    const class1 = await createTestClass();
    const class2 = await createTestClass();

    const req1 = await singleSwapRepo.createRaw({
      data: {
        userId: user1.id, subjectId: subject.id, currentClassId: class1.id, preferredClassIds: [class2.id],
        ticketType: "SPECIFIC_CLASS", priority: 1, status: "MATCHED", graphPartition: `subject-${subject.id}`,
        preferenceOrderMatters: false,
      }
    });
    const req2 = await singleSwapRepo.createRaw({
      data: {
        userId: user2.id, subjectId: subject.id, currentClassId: class2.id, preferredClassIds: [class1.id],
        ticketType: "SPECIFIC_CLASS", priority: 1, status: "MATCHED", graphPartition: `subject-${subject.id}`,
        preferenceOrderMatters: false,
      }
    });

    const match = await matchRepo.create({
      data: {
        matchType: "SINGLE",
        swapPattern: "DIRECT",
        status: "PROPOSED",
        graphPartition: `subject-${subject.id}`,
        singleSwapRequestIds: [req1.id, req2.id],
        participants: [
          { userId: user1.id, requestId: req1.id, status: "pending" },
          { userId: user2.id, requestId: req2.id, status: "pending" }
        ],
      }
    });

    // Concurrent accept and reject from the same user
    const promises = [
      processMatchAction(match.id, user1.id, "accept").catch(e => e),
      processMatchAction(match.id, user1.id, "reject").catch(e => e)
    ];

    const results = await Promise.all(promises);

    const successes = results.filter(r => !(r instanceof Error));
    const errors = results.filter(r => r instanceof Error);

    expect(successes.length).toBe(1);
    expect(errors.length).toBe(1);

    const finalMatch = await matchRepo.findUnique({ where: { id: match.id } });
    expect(["PROPOSED", "REJECTED"]).toContain(finalMatch?.status);

    const finalReq1 = await singleSwapRepo.findUnique({ where: { id: req1.id } });
    const finalReq2 = await singleSwapRepo.findUnique({ where: { id: req2.id } });

    if (finalMatch?.status === "REJECTED") {
      // Both requests should revert to ACTIVE with no provisionalMatchId
      expect(finalReq1?.status).toBe("ACTIVE");
      expect(finalReq1?.provisionalMatchId).toBeNull();
      expect(finalReq2?.status).toBe("ACTIVE");
      expect(finalReq2?.provisionalMatchId).toBeNull();
    } else {
      expect(finalMatch?.status).toBe("PROPOSED");
      const participants = finalMatch?.participants as Array<{ userId: string, status: string }> | undefined;
      const p1 = participants?.find(p => p.userId === user1.id);
      expect(p1?.status).toBe("accepted");
    }
  });

  it("Same user operating from multiple concurrent sessions (cancel)", async () => {
    const user = await createTestUser();
    const subject = await createTestSubject();
    const currentClass = await createTestClass();
    const targetClass = await createTestClass();
    const session = toSessionUser(user);

    const req = await singleSwapRepo.createRaw({
      data: {
        userId: user.id, subjectId: subject.id, currentClassId: currentClass.id, preferredClassIds: [targetClass.id],
        ticketType: "SPECIFIC_CLASS", priority: 1, status: "ACTIVE", graphPartition: `subject-${subject.id}`,
        preferenceOrderMatters: false,
      }
    });

    const promises = Array.from({ length: 3 }).map(() =>
      cancelSwapRequest(session, req.id, singleSwapRepo).catch(e => e)
    );

    const results = await Promise.all(promises);
    const successes = results.filter(r => !(r instanceof Error));

    expect(successes.length).toBeGreaterThanOrEqual(1);

    const updatedReq = await singleSwapRepo.getByIdWithDetails(req.id);
    expect(updatedReq?.status).toBe("CANCELLED");

    const count = await singleSwapRepo.count({ where: { id: req.id } });
    expect(count).toBe(1);
  });

  it("Repeated/retried idempotent operations (acceptMatch concurrently)", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const subject = await createTestSubject();
    const class1 = await createTestClass();
    const class2 = await createTestClass();

    const req1 = await singleSwapRepo.createRaw({
      data: {
        userId: user1.id, subjectId: subject.id, currentClassId: class1.id, preferredClassIds: [class2.id],
        ticketType: "SPECIFIC_CLASS", priority: 1, status: "MATCHED", graphPartition: `subject-${subject.id}`,
        preferenceOrderMatters: false,
      }
    });
    const req2 = await singleSwapRepo.createRaw({
      data: {
        userId: user2.id, subjectId: subject.id, currentClassId: class2.id, preferredClassIds: [class1.id],
        ticketType: "SPECIFIC_CLASS", priority: 1, status: "MATCHED", graphPartition: `subject-${subject.id}`,
        preferenceOrderMatters: false,
      }
    });

    const match = await matchRepo.create({
      data: {
        matchType: "SINGLE", swapPattern: "DIRECT", status: "PROPOSED", graphPartition: `subject-${subject.id}`,
        singleSwapRequestIds: [req1.id, req2.id],
        participants: [
          { userId: user1.id, requestId: req1.id, status: "pending" },
          { userId: user2.id, requestId: req2.id, status: "pending" }
        ],
      }
    });

    // Run multiple accept match operations exactly concurrently
    const promises = Array.from({ length: 3 }).map(() =>
      processMatchAction(match.id, user1.id, "accept").catch(e => e)
    );
    const results = await Promise.all(promises);

    const successes = results.filter(r => !(r instanceof Error));
    expect(successes.length).toBeGreaterThanOrEqual(1);

    const finalMatch = await matchRepo.findUnique({ where: { id: match.id } });

    const participants = finalMatch?.participants as Array<{ userId: string, status: string }> | undefined;
    const participant = participants?.find(p => p.userId === user1.id);
    expect(participant?.status).toBe("accepted");
  });

  it("User Isolation / Authorization under concurrency", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    const subject = await createTestSubject();
    const class1 = await createTestClass();
    const class2 = await createTestClass();

    const reqA = await singleSwapRepo.createRaw({
      data: {
        userId: userA.id, subjectId: subject.id, currentClassId: class1.id, preferredClassIds: [class2.id],
        ticketType: "SPECIFIC_CLASS", priority: 1, status: "ACTIVE", graphPartition: `subject-${subject.id}`,
        preferenceOrderMatters: false,
      }
    });

    const sessionA = toSessionUser(userA);
    const sessionB = toSessionUser(userB); // Unauthorized attacker

    // Both attempt to cancel the same request simultaneously
    const promises = [
      cancelSwapRequest(sessionB, reqA.id, singleSwapRepo).catch(e => e),
      cancelSwapRequest(sessionA, reqA.id, singleSwapRepo).catch(e => e),
    ];

    const results = await Promise.all(promises);

    const attackerResult = results[0];
    const ownerResult = results[1];

    expect(attackerResult).toBeInstanceOf(SwapRequestForbiddenError);
    expect(ownerResult).not.toBeInstanceOf(Error);

    // Verify DB integrity: cancelled correctly and only once, B made no mutations
    const finalReq = await singleSwapRepo.findUnique({ where: { id: reqA.id } });
    expect(finalReq?.status).toBe("CANCELLED");
  });
});
