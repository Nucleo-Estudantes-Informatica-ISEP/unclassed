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

describe("Immediate matching engine execution with MongoDB transactions", () => {
  const orchestrator = new MatchingOrchestrator();

  beforeEach(async () => {
    assertSafeTestDatabaseUrl();
    await clearTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  it("finds complementary requests, executes multi-document ACID transaction, creates Match, and locks requests", async () => {
    // 1. Seed two users, one subject, and two classes
    const userA = await createTestUser();
    const userB = await createTestUser();
    const subject = await createTestSubject();
    const class1 = await createTestClass();
    const class2 = await createTestClass();

    const partitionKey = `subject-${subject.id}`;

    // 2. User A is currently in class 1, wants class 2
    const reqA = await singleSwapRepo.createRaw({
      data: {
        userId: userA.id,
        subjectId: subject.id,
        currentClassId: class1.id,
        preferredClassIds: [class2.id],
        status: "ACTIVE",
        graphPartition: partitionKey,
      },
    });

    // 3. User B is currently in class 2, wants class 1
    const reqB = await singleSwapRepo.createRaw({
      data: {
        userId: userB.id,
        subjectId: subject.id,
        currentClassId: class2.id,
        preferredClassIds: [class1.id],
        status: "ACTIVE",
        graphPartition: partitionKey,
      },
    });

    // 4. Trigger immediate matching for the newly created request B
    const createdMatches = await orchestrator.processImmediateMatches(reqB.id);

    expect(createdMatches.length).toBe(1);
    const matchResult = createdMatches[0];
    expect(matchResult.pattern).toBe("DIRECT");
    expect(matchResult.satisfactionScore).toBe(1.0); // 100% satisfaction for both

    // 5. Query MongoDB for the persisted Match record
    const persistedMatches = await matchRepo.findMany({
      where: { graphPartition: partitionKey },
    });
    expect(persistedMatches.length).toBe(1);

    const matchDoc = persistedMatches[0];
    expect(matchDoc.status).toBe("PROPOSED");
    expect(matchDoc.swapPattern).toBe("DIRECT");
    expect(matchDoc.singleSwapRequestIds).toContain(reqA.id);
    expect(matchDoc.singleSwapRequestIds).toContain(reqB.id);

    // Verify participants embedded array
    const participantUserIds = (matchDoc.participants as Array<{ userId: string }>).map((p) => p.userId);
    expect(participantUserIds).toContain(userA.id);
    expect(participantUserIds).toContain(userB.id);

    // 6. Verify that both requests transitioned to MATCHED in MongoDB inside the atomic transaction
    const updatedReqA = await singleSwapRepo.findById(reqA.id);
    const updatedReqB = await singleSwapRepo.findById(reqB.id);

    expect(updatedReqA?.status).toBe("MATCHED");
    expect(updatedReqA?.provisionalMatchId).toBe(matchDoc.id);

    expect(updatedReqB?.status).toBe("MATCHED");
    expect(updatedReqB?.provisionalMatchId).toBe(matchDoc.id);
  });
});
