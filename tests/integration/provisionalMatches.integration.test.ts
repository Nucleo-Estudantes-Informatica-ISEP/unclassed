import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MatchingOrchestrator } from "@/application/matchingOrchestrator";
import * as matchRepo from "@/application/repositories/matchRepository";
import * as singleSwapRepo from "@/application/repositories/singleSwapRequestRepository";
import {
  assertSafeTestDatabaseUrl,
  clearTestDatabase,
  createTestClass,
  createTestSubject,
  createTestUser,
} from "@tests/helpers/db";

describe("Provisional match expiration and request reactivation in MongoDB", () => {
  const orchestrator = new MatchingOrchestrator();

  beforeEach(async () => {
    assertSafeTestDatabaseUrl();
    await clearTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  it("expires past provisional matches, updates them to REJECTED, and reactivates participants' requests", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const subject = await createTestSubject();
    const classA = await createTestClass();
    const classB = await createTestClass();

    // 1. Create a single swap request that was put into matched/provisional state
    const request1 = await singleSwapRepo.createRaw({
      data: {
        userId: user1.id,
        subjectId: subject.id,
        currentClassId: classA.id,
        preferredClassIds: [classB.id],
        status: "MATCHED",
        graphPartition: `subject-${subject.id}`,
      },
    });

    // 2. Create an EXPIRED provisional match (provisionalUntil was 1 hour ago)
    const expiredUntil = new Date(Date.now() - 60 * 60 * 1000);
    const expiredMatch = await matchRepo.create({
      data: {
        matchType: "SINGLE",
        swapPattern: "DIRECT",
        status: "PROVISIONAL",
        isProvisional: true,
        provisionalUntil: expiredUntil,
        graphPartition: `subject-${subject.id}`,
        singleSwapRequestIds: [request1.id],
        participants: [
          {
            userId: user1.id,
            fromClass: classA.id,
            toClass: classB.id,
            requestId: request1.id,
            requestType: "single",
            status: "pending",
          },
          {
            userId: user2.id,
            fromClass: classB.id,
            toClass: classA.id,
            requestType: "single",
            status: "pending",
          },
        ],
      },
    });

    // Link provisional match to request
    await singleSwapRepo.updateMany({
      where: { id: request1.id },
      data: { provisionalMatchId: expiredMatch.id },
    });

    // 3. Create an ACTIVE (unexpired) provisional match (provisionalUntil is 4 hours in the future)
    const futureUntil = new Date(Date.now() + 4 * 60 * 60 * 1000);
    const futureMatch = await matchRepo.create({
      data: {
        matchType: "SINGLE",
        swapPattern: "DIRECT",
        status: "PROVISIONAL",
        isProvisional: true,
        provisionalUntil: futureUntil,
        graphPartition: `subject-${subject.id}`,
        participants: [
          {
            userId: user2.id,
            fromClass: classB.id,
            toClass: classA.id,
            status: "pending",
          },
        ],
      },
    });

    // 4. Run expiration engine
    const expiredCount = await orchestrator.expireProvisionalMatches();
    expect(expiredCount).toBe(1);

    // 5. Verify expired match state in MongoDB
    const updatedExpiredMatch = await matchRepo.findUnique({
      where: { id: expiredMatch.id },
    });
    expect(updatedExpiredMatch).not.toBeNull();
    expect(updatedExpiredMatch?.status).toBe("REJECTED");
    expect(updatedExpiredMatch?.isProvisional).toBe(false);

    // 6. Verify that the associated request was reactivated to ACTIVE in MongoDB
    const updatedRequest1 = await singleSwapRepo.findById(request1.id);
    expect(updatedRequest1).not.toBeNull();
    expect(updatedRequest1?.status).toBe("ACTIVE");
    expect(updatedRequest1?.provisionalMatchId).toBeNull();

    // 7. Verify future match was untouched in MongoDB
    const updatedFutureMatch = await matchRepo.findUnique({
      where: { id: futureMatch.id },
    });
    expect(updatedFutureMatch).not.toBeNull();
    expect(updatedFutureMatch?.status).toBe("PROVISIONAL");
    expect(updatedFutureMatch?.isProvisional).toBe(true);
  });
});
