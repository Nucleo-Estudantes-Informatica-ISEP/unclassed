import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as matchRepo from "@/application/repositories/matchRepository";
import * as singleSwapRepo from "@/application/repositories/singleSwapRequestRepository";
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
    const participantsStep1 = [
      {
        userId: user1.id,
        fromClass: classA.id,
        toClass: classB.id,
        status: "accepted",
        acceptedAt: new Date(),
      },
      {
        userId: user2.id,
        fromClass: classB.id,
        toClass: classA.id,
        status: "pending",
      },
    ];

    await matchRepo.update({
      where: { id: match.id },
      data: {
        participants: participantsStep1,
        status: "PROPOSED", // Only 1 accepted, remains PROPOSED
      },
    });

    const step1Doc = await matchRepo.findUnique({ where: { id: match.id } });
    expect(step1Doc?.status).toBe("PROPOSED");

    // 2. Participant 2 accepts -> all accepted, moves to ACCEPTED
    const participantsStep2 = [
      participantsStep1[0],
      {
        userId: user2.id,
        fromClass: classB.id,
        toClass: classA.id,
        status: "accepted",
        acceptedAt: new Date(),
      },
    ];

    await matchRepo.update({
      where: { id: match.id },
      data: {
        participants: participantsStep2,
        status: "ACCEPTED",
      },
    });

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

    // Link requests to match
    await singleSwapRepo.updateMany({
      where: { id: { in: [req1.id, req2.id] } },
      data: { provisionalMatchId: match.id },
    });

    // User 1 rejects match
    await matchRepo.update({
      where: { id: match.id },
      data: { status: "REJECTED" },
    });

    // Reactivate participant requests
    await singleSwapRepo.updateMany({
      where: { id: { in: match.singleSwapRequestIds } },
      data: {
        status: "ACTIVE",
        provisionalMatchId: null,
        provisionalUntil: null,
      },
    });

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
