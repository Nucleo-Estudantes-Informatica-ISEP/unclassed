import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as matchRepo from "@/application/repositories/matchRepository";
import { validateSingleRequestCreation } from "@/application/services/requestService";
import { hasBlockingAcceptedMatch } from "@/services/matchParticipation";
import {
  assertSafeTestDatabaseUrl,
  clearTestDatabase,
  createTestClass,
  createTestSubject,
  createTestUser,
} from "@tests/helpers/db";

describe("Match participation and blocking status persistence in MongoDB", () => {
  beforeEach(async () => {
    assertSafeTestDatabaseUrl();
    await clearTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  it("detects accepted matches via MongoDB raw aggregation and blocks new request creation", async () => {
    const user = await createTestUser();
    const subject = await createTestSubject();
    const classA = await createTestClass();
    const classB = await createTestClass();

    // Initially, user has no matches and is allowed to create requests
    const initialValidation = await validateSingleRequestCreation({
      userId: user.id,
      subjectId: subject.id,
      currentClassId: classA.id,
      preferredClassIds: [classB.id],
    });
    expect(initialValidation.ok).toBe(true);

    // Create a match where this user has accepted status in the embedded participants array
    await matchRepo.create({
      data: {
        matchType: "SINGLE",
        swapPattern: "DIRECT",
        status: "ACCEPTED",
        graphPartition: `subject-${subject.id}`,
        participants: [
          {
            userId: user.id,
            status: "accepted",
            fromClass: classA.id,
            toClass: classB.id,
          },
        ],
      },
    });

    // hasBlockingAcceptedMatch executes MongoDB raw aggregation pipeline with $elemMatch
    const isBlocked = await hasBlockingAcceptedMatch(user.id);
    expect(isBlocked).toBe(true);

    // validateSingleRequestCreation must reject creating new requests with 409 conflict
    const blockedValidation = await validateSingleRequestCreation({
      userId: user.id,
      subjectId: subject.id,
      currentClassId: classA.id,
      preferredClassIds: [classB.id],
    });

    expect(blockedValidation.ok).toBe(false);
    if (!blockedValidation.ok) {
      expect(blockedValidation.status).toBe(409);
      expect(blockedValidation.error).toContain("matches aceites pendentes");
    }
  });

  it("unblocks user when match status transitions to REJECTED or COMPLETED", async () => {
    const user = await createTestUser();
    const classA = await createTestClass();
    const classB = await createTestClass();

    const match = await matchRepo.create({
      data: {
        matchType: "SINGLE",
        swapPattern: "DIRECT",
        status: "PROPOSED",
        graphPartition: "test-partition",
        participants: [
          {
            userId: user.id,
            status: "accepted",
            fromClass: classA.id,
            toClass: classB.id,
          },
        ],
      },
    });

    expect(await hasBlockingAcceptedMatch(user.id)).toBe(true);

    // Transition match to REJECTED in MongoDB
    await matchRepo.update({
      where: { id: match.id },
      data: { status: "REJECTED" },
    });

    expect(await hasBlockingAcceptedMatch(user.id)).toBe(false);
  });
});
