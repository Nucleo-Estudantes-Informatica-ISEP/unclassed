import { afterEach, beforeEach, describe, expect, it } from "vitest";

import * as graphPartitionRepo from "@/application/repositories/graphPartitionRepository";
import * as matchRepo from "@/application/repositories/matchRepository";
import * as singleSwapRepo from "@/application/repositories/singleSwapRequestRepository";
import * as subjectRepo from "@/application/repositories/subjectRepository";
import {
  clearTestDatabase,
  createTestClass,
  createTestSubject,
  createTestUser,
} from "@tests/helpers/db";

describe("Subject usage protection with MongoDB", () => {
  beforeEach(clearTestDatabase);
  afterEach(clearTestDatabase);

  it.each(["request", "partition", "match"] as const)(
    "keeps a subject referenced by a %s",
    async (reference) => {
      const subject = await createTestSubject();
      const partitionKey = `subject-${subject.id}`;

      if (reference === "request") {
        const user = await createTestUser();
        const schoolClass = await createTestClass();
        await singleSwapRepo.create({
          userId: user.id,
          subjectId: subject.id,
          currentClassId: schoolClass.id,
          preferredClassIds: [],
          preferenceOrderMatters: false,
        });
      } else if (reference === "partition") {
        await graphPartitionRepo.create({
          data: {
            partitionKey,
            subjectId: subject.id,
            ticketType: "SPECIFIC_CLASS",
          },
        });
      } else {
        await matchRepo.create({
          data: {
            matchType: "SINGLE",
            swapPattern: "DIRECT",
            graphPartition: partitionKey,
            participants: [],
          },
        });
      }

      expect(await subjectRepo.isInUse(subject.id)).toBe(true);
      expect(await subjectRepo.removeUnlessInUse(subject.id)).toBe(false);
      expect(await subjectRepo.findById(subject.id)).not.toBeNull();
    }
  );

  it("deletes an unreferenced subject", async () => {
    const subject = await createTestSubject();

    expect(await subjectRepo.isInUse(subject.id)).toBe(false);
    expect(await subjectRepo.removeUnlessInUse(subject.id)).toBe(true);
    expect(await subjectRepo.findById(subject.id)).toBeNull();
  });
});
