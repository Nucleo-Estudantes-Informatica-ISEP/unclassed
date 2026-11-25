import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as singleSwapRepo from "@/application/repositories/singleSwapRequestRepository";
import { executeInTransaction } from "@/application/repositories/transactionRepository";
import {
  assertSafeTestDatabaseUrl,
  clearTestDatabase,
  createTestClass,
  createTestSubject,
  createTestUser,
} from "@tests/helpers/db";

describe("Transactions persistence semantics", () => {
  beforeEach(async () => {
    assertSafeTestDatabaseUrl();
    await clearTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  it("successfully commits multi-document operations executed within a transaction", async () => {
    const user = await createTestUser();
    const subject = await createTestSubject();
    const classA = await createTestClass();
    const classB = await createTestClass();

    const created = await executeInTransaction(async (tx) => {
      return singleSwapRepo.createRaw(
        {
          data: {
            userId: user.id,
            subjectId: subject.id,
            currentClassId: classA.id,
            preferredClassIds: [classB.id],
            graphPartition: `subject-${subject.id}`,
            status: "ACTIVE",
          },
        },
        tx
      );
    });

    expect(created.id).toBeDefined();

    const persisted = await singleSwapRepo.findById(created.id);
    expect(persisted).not.toBeNull();
    expect(persisted?.userId).toBe(user.id);
    expect(persisted?.status).toBe("ACTIVE");
  });

  it("rolls back all writes when an error is thrown inside the transaction", async () => {
    const user = await createTestUser();
    const subject = await createTestSubject();
    const classA = await createTestClass();
    const classB = await createTestClass();

    const initialRequestCount = await singleSwapRepo.count({});

    await expect(
      executeInTransaction(async (tx) => {
        await singleSwapRepo.createRaw(
          {
            data: {
              userId: user.id,
              subjectId: subject.id,
              currentClassId: classA.id,
              preferredClassIds: [classB.id],
              graphPartition: `subject-${subject.id}`,
              status: "ACTIVE",
            },
          },
          tx
        );

        throw new Error("Simulated transactional failure");
      })
    ).rejects.toThrow("Simulated transactional failure");

    const finalRequestCount = await singleSwapRepo.count({});
    expect(finalRequestCount).toBe(initialRequestCount);
  });
});
