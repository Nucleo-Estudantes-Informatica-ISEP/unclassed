import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as bundleSwapRepo from "@/application/repositories/bundleSwapRequestRepository";
import * as singleSwapRepo from "@/application/repositories/singleSwapRequestRepository";
import {
  assertSafeTestDatabaseUrl,
  clearTestDatabase,
  createTestClass,
  createTestSubject,
  createTestUser,
} from "@tests/helpers/db";

describe("Active Swap Request Uniqueness Constraints", () => {
  beforeEach(async () => {
    assertSafeTestDatabaseUrl();
    await clearTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  describe("SingleSwapRequest unique active constraint", () => {
    it("prevents creating duplicate ACTIVE single swap requests for the same user and subject", async () => {
      const user = await createTestUser();
      const subject = await createTestSubject();
      const classA = await createTestClass();
      const classB = await createTestClass();
      const classC = await createTestClass();

      // First ACTIVE request succeeds
      const first = await singleSwapRepo.createRaw({
        data: {
          userId: user.id,
          subjectId: subject.id,
          currentClassId: classA.id,
          preferredClassIds: [classB.id],
          graphPartition: `subject-${subject.id}`,
          status: "ACTIVE",
        },
      });
      expect(first.id).toBeDefined();

      // Second ACTIVE request for the same user and subject must fail via partial unique index
      await expect(
        singleSwapRepo.createRaw({
          data: {
            userId: user.id,
            subjectId: subject.id,
            currentClassId: classA.id,
            preferredClassIds: [classC.id],
            graphPartition: `subject-${subject.id}`,
            status: "ACTIVE",
          },
        })
      ).rejects.toThrow();
    });

    it("allows a new ACTIVE request when an older request is CANCELLED", async () => {
      const user = await createTestUser();
      const subject = await createTestSubject();
      const classA = await createTestClass();
      const classB = await createTestClass();

      await singleSwapRepo.createRaw({
        data: {
          userId: user.id,
          subjectId: subject.id,
          currentClassId: classA.id,
          preferredClassIds: [classB.id],
          graphPartition: `subject-${subject.id}`,
          status: "CANCELLED",
        },
      });

      const activeRequest = await singleSwapRepo.createRaw({
        data: {
          userId: user.id,
          subjectId: subject.id,
          currentClassId: classA.id,
          preferredClassIds: [classB.id],
          graphPartition: `subject-${subject.id}`,
          status: "ACTIVE",
        },
      });

      expect(activeRequest.status).toBe("ACTIVE");
    });
  });

  describe("BundleSwapRequest unique active constraint", () => {
    it("prevents creating duplicate ACTIVE bundle swap requests for the same user and class", async () => {
      const user = await createTestUser();
      const classA = await createTestClass();
      const classB = await createTestClass();
      const classC = await createTestClass();

      // First ACTIVE bundle request succeeds
      const first = await bundleSwapRepo.createRaw({
        data: {
          userId: user.id,
          currentClassId: classA.id,
          preferredClassIds: [classB.id],
          graphPartition: `year-${classA.year}`,
          status: "ACTIVE",
        },
      });
      expect(first.id).toBeDefined();

      // Second ACTIVE bundle request for same user and class must fail
      await expect(
        bundleSwapRepo.createRaw({
          data: {
            userId: user.id,
            currentClassId: classA.id,
            preferredClassIds: [classC.id],
            graphPartition: `year-${classA.year}`,
            status: "ACTIVE",
          },
        })
      ).rejects.toThrow();
    });

    it("allows a new ACTIVE bundle request when the previous one is CANCELLED", async () => {
      const user = await createTestUser();
      const classA = await createTestClass();
      const classB = await createTestClass();

      await bundleSwapRepo.createRaw({
        data: {
          userId: user.id,
          currentClassId: classA.id,
          preferredClassIds: [classB.id],
          graphPartition: `year-${classA.year}`,
          status: "CANCELLED",
        },
      });

      const activeBundle = await bundleSwapRepo.createRaw({
        data: {
          userId: user.id,
          currentClassId: classA.id,
          preferredClassIds: [classB.id],
          graphPartition: `year-${classA.year}`,
          status: "ACTIVE",
        },
      });

      expect(activeBundle.status).toBe("ACTIVE");
    });
  });
});
