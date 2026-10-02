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

    const activeRequests = await singleSwapRepo.listWithDetails({ userId: user.id, status: "ACTIVE" });
    expect(activeRequests.length).toBe(1);
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

    const activeRequests = await bundleSwapRepo.listWithDetails({ userId: user.id, status: "ACTIVE" });
    expect(activeRequests.length).toBe(1);
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
  });

  it("Concurrent matching runs against the same graph partition", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const subject = await createTestSubject();
    const class1 = await createTestClass();
    const class2 = await createTestClass();

    const req1 = await createSingleSwapRequest(
      toSessionUser(user1),
      { subjectId: subject.id, currentClassId: class1.id, preferredClassIds: [class2.id], preferenceOrderMatters: false },
      singleSwapRepo
    );

    await createSingleSwapRequest(
      toSessionUser(user2),
      { subjectId: subject.id, currentClassId: class2.id, preferredClassIds: [class1.id], preferenceOrderMatters: false },
      singleSwapRepo
    );

    const orchestrator = new MatchingOrchestrator();

    const promises = Array.from({ length: 3 }).map(() =>
      orchestrator.processImmediateMatches(req1.id).catch(e => e)
    );

    const results = await Promise.all(promises);

    // Only one should process it, others will skip due to lock
    // `processImmediateMatches` returns an array of matches (empty if skipped/no match)
    const processedCounts = results.filter(r => Array.isArray(r) && r.length > 0).length;

    // Only one match should be generated since one processing run will consume the pair
    expect(processedCounts).toBeLessThanOrEqual(1);

    const matchesInDb = await matchRepo.findMany({});
    expect(matchesInDb.length).toBeLessThanOrEqual(1);
  });

  it("Concurrent accept/reject actions against the same Match", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const subject = await createTestSubject();
    const class1 = await createTestClass();
    const class2 = await createTestClass();

    const req1 = await createSingleSwapRequest(
      toSessionUser(user1),
      { subjectId: subject.id, currentClassId: class1.id, preferredClassIds: [class2.id], preferenceOrderMatters: false },
      singleSwapRepo
    );

    await createSingleSwapRequest(
      toSessionUser(user2),
      { subjectId: subject.id, currentClassId: class2.id, preferredClassIds: [class1.id], preferenceOrderMatters: false },
      singleSwapRepo
    );

    const orchestrator = new MatchingOrchestrator();
    await orchestrator.processImmediateMatches(req1.id);

    const matches = await matchRepo.findMany({});
    expect(matches.length).toBe(1);
    const matchId = matches[0].id;

    // Concurrent accept and reject from the same user
    const promises = [
      processMatchAction(matchId, user1.id, "accept").catch(e => e),
      processMatchAction(matchId, user1.id, "reject").catch(e => e)
    ];

    const results = await Promise.all(promises);

    const successes = results.filter(r => !(r instanceof Error));
    const errors = results.filter(r => r instanceof Error);

    // At most one action should succeed
    expect(successes.length).toBeLessThanOrEqual(1);
    expect(errors.length).toBeGreaterThanOrEqual(1);

    const finalMatch = await matchRepo.findUnique({ where: { id: matchId } });
    expect(["PROPOSED", "REJECTED"]).toContain(finalMatch?.status);
  });

  it("Same user operating from multiple concurrent sessions (cancel)", async () => {
    const user = await createTestUser();
    const subject = await createTestSubject();
    const currentClass = await createTestClass();
    const targetClass = await createTestClass();

    const session = toSessionUser(user);

    const req = await createSingleSwapRequest(
      session,
      {
        subjectId: subject.id,
        currentClassId: currentClass.id,
        preferredClassIds: [targetClass.id],
        preferenceOrderMatters: false,
      },
      singleSwapRepo
    );

    const promises = Array.from({ length: 3 }).map(() =>
      cancelSwapRequest(session, req.id, singleSwapRepo).catch(e => e)
    );

    const results = await Promise.all(promises);
    const successes = results.filter(r => !(r instanceof Error));

    // One or more successes, since cancellation is idempotent
    expect(successes.length).toBeGreaterThanOrEqual(1);

    const updatedReq = await singleSwapRepo.getByIdWithDetails(req.id);
    expect(updatedReq?.status).toBe("CANCELLED");
  });

  it("Repeated/retried idempotent operations (acceptMatch twice)", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const subject = await createTestSubject();
    const class1 = await createTestClass();
    const class2 = await createTestClass();

    const req1 = await createSingleSwapRequest(
      toSessionUser(user1),
      { subjectId: subject.id, currentClassId: class1.id, preferredClassIds: [class2.id], preferenceOrderMatters: false },
      singleSwapRepo
    );

    await createSingleSwapRequest(
      toSessionUser(user2),
      { subjectId: subject.id, currentClassId: class2.id, preferredClassIds: [class1.id], preferenceOrderMatters: false },
      singleSwapRepo
    );

    const orchestrator = new MatchingOrchestrator();
    await orchestrator.processImmediateMatches(req1.id);

    const matches = await matchRepo.findMany({});
    const matchId = matches[0].id;
    // Sequential accept
    await processMatchAction(matchId, user1.id, "accept");

    // Retry accept - should either succeed silently (idempotent) or throw an expected domain error (e.g., MatchActionConflictError), but NOT leave partially-applied state
    await processMatchAction(matchId, user1.id, "accept").catch(e => e);

    // Accept could throw if already accepted, which is fine, as long as it doesn't corrupt state
    // Let's just ensure the match is still accepted
    const finalMatch = await matchRepo.findUnique({ where: { id: matchId } });

    // Find the participant status
    const participants = finalMatch?.participants as Array<{ userId: string, status: string }> | undefined;
    const participant = participants?.find(p => p.userId === user1.id);
    expect(participant?.status).toBe("accepted");
  });
});
