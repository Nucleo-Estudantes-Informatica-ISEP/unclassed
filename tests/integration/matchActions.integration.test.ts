import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as matchRepo from "@/application/repositories/matchRepository";
import * as singleSwapRepo from "@/application/repositories/singleSwapRequestRepository";
import * as graphPartitionRepo from "@/application/repositories/graphPartitionRepository";
import { processMatchAction } from "@/application/services/matchActionService";
import {
  assertSafeTestDatabaseUrl,
  clearTestDatabase,
  createTestClass,
  createTestSubject,
  createTestUser,
} from "@tests/helpers/db";

describe("Match actions, optimistic concurrency, and request reactivation in MongoDB", () => {
  beforeEach(async () => {
    assertSafeTestDatabaseUrl();
    await clearTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  it("handles multi-participant acceptance: remains PROPOSED on partial accept, transitions to ACCEPTED when all accept", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const subject = await createTestSubject();
    const classA = await createTestClass();
    const classB = await createTestClass();

    const match = await matchRepo.create({
      data: {
        matchType: "SINGLE",
        swapPattern: "DIRECT",
        status: "PROPOSED",
        graphPartition: `subject-${subject.id}`,
        participants: [
          {
            userId: user1.id,
            fromClass: classA.id,
            toClass: classB.id,
            status: "pending",
          },
          {
            userId: user2.id,
            fromClass: classB.id,
            toClass: classA.id,
            status: "pending",
          },
        ],
      },
    });

    // 1. Participant 1 accepts
    await processMatchAction(match.id, user1.id, "accept");

    const step1Doc = await matchRepo.findUnique({ where: { id: match.id } });
    expect(step1Doc?.status).toBe("PROPOSED");

    // 2. Participant 2 accepts -> all accepted, moves to ACCEPTED
    await processMatchAction(match.id, user2.id, "accept");

    const step2Doc = await matchRepo.findUnique({ where: { id: match.id } });
    expect(step2Doc?.status).toBe("ACCEPTED");
  });

  it("reactivates linked swap requests when a match is rejected", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const subject = await createTestSubject();
    const classA = await createTestClass();
    const classB = await createTestClass();

    const req1 = await singleSwapRepo.createRaw({
      data: {
        userId: user1.id,
        subjectId: subject.id,
        currentClassId: classA.id,
        preferredClassIds: [classB.id],
        status: "MATCHED",
        graphPartition: `subject-${subject.id}`,
      },
    });

    const req2 = await singleSwapRepo.createRaw({
      data: {
        userId: user2.id,
        subjectId: subject.id,
        currentClassId: classB.id,
        preferredClassIds: [classA.id],
        status: "MATCHED",
        graphPartition: `subject-${subject.id}`,
      },
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
          { userId: user2.id, requestId: req2.id, status: "pending" },
        ],
      },
    });

    await graphPartitionRepo.create({
      data: {
        partitionKey: `subject-${subject.id}`,
        ticketType: "SPECIFIC_CLASS",
        activeRequests: 2,
      },
    });

    // Link requests to match
    await singleSwapRepo.updateMany({
      where: { id: { in: [req1.id, req2.id] } },
      data: { provisionalMatchId: match.id },
    });

    // User 1 rejects match
    await processMatchAction(match.id, user1.id, "reject");

    const refreshedReq1 = await singleSwapRepo.findById(req1.id);
    const refreshedReq2 = await singleSwapRepo.findById(req2.id);

    expect(refreshedReq1?.status).toBe("ACTIVE");
    expect(refreshedReq1?.provisionalMatchId).toBeNull();

    expect(refreshedReq2?.status).toBe("ACTIVE");
    expect(refreshedReq2?.provisionalMatchId).toBeNull();
  });

  it("prevents lost updates via optimistic concurrency check on updatedAt", async () => {
    const user = await createTestUser();
    const subject = await createTestSubject();

    const match = await matchRepo.create({
      data: {
        matchType: "SINGLE",
        swapPattern: "DIRECT",
        status: "PROPOSED",
        graphPartition: `subject-${subject.id}`,
        participants: [{ userId: user.id, status: "pending" }],
      },
    });

    const originalUpdatedAt = match.updatedAt;

    // First update succeeds because updatedAt matches
    const firstUpdate = await matchRepo.updateMany({
      where: { id: match.id, updatedAt: originalUpdatedAt },
      data: { status: "ACCEPTED" },
    });
    expect(firstUpdate.count).toBe(1);

    // Second concurrent update with the stale updatedAt fails (count === 0)
    const staleUpdate = await matchRepo.updateMany({
      where: { id: match.id, updatedAt: originalUpdatedAt },
      data: { status: "REJECTED" },
    });
    expect(staleUpdate.count).toBe(0);

    // Verify status remained ACCEPTED
    const finalDoc = await matchRepo.findUnique({ where: { id: match.id } });
    expect(finalDoc?.status).toBe("ACCEPTED");
  });
});
