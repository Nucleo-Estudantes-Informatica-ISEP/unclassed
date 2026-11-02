import { afterEach, beforeEach, describe, expect, it } from "vitest";

import * as classRepo from "@/application/repositories/classRepository";
import * as matchRepo from "@/application/repositories/matchRepository";
import {
  assertSafeTestDatabaseUrl,
  clearTestDatabase,
  createTestClass,
  createTestUser,
} from "@tests/helpers/db";

describe("Class usage protection with MongoDB matches", () => {
  beforeEach(async () => {
    assertSafeTestDatabaseUrl();
    await clearTestDatabase();
  });

  afterEach(async () => {
    assertSafeTestDatabaseUrl();
    await clearTestDatabase();
  });

  it.each(["fromClass", "toClass"] as const)(
    "detects a match referencing a class ID through %s",
    async (field) => {
      const user = await createTestUser();
      const classA = await createTestClass();
      const classB = await createTestClass();

      await matchRepo.create({
        data: {
          matchType: "SINGLE",
          swapPattern: "DIRECT",
          status: "PROPOSED",
          graphPartition: "class-usage-test",
          participants: [
            {
              userId: user.id,
              fromClass:
                field === "fromClass" ? classA.id : classB.id,
              toClass:
                field === "toClass" ? classA.id : classB.id,
            },
          ],
        },
      });

      expect(await classRepo.isInUse(classA.id)).toBe(true);
    }
  );

  it.each(["fromClass", "toClass"] as const)(
    "detects a match referencing a class name through %s",
    async (field) => {
      const user = await createTestUser();
      const classA = await createTestClass();
      const classB = await createTestClass();

      await matchRepo.create({
        data: {
          matchType: "SINGLE",
          swapPattern: "DIRECT",
          status: "REJECTED",
          graphPartition: "class-usage-test",
          participants: [
            {
              userId: user.id,
              fromClass:
                field === "fromClass" ? classA.name : classB.name,
              toClass:
                field === "toClass" ? classA.name : classB.name,
            },
          ],
        },
      });

      expect(await classRepo.isInUse(classA.id)).toBe(true);
    }
  );

  it("detects a provisional match", async () => {
    const user = await createTestUser();
    const classA = await createTestClass();
    const classB = await createTestClass();

    await matchRepo.create({
      data: {
        matchType: "SINGLE",
        swapPattern: "DIRECT",
        status: "PROPOSED",
        isProvisional: true,
        graphPartition: "class-usage-test",
        participants: [
          {
            userId: user.id,
            fromClass: classA.id,
            toClass: classB.id,
          },
        ],
      },
    });

    expect(await classRepo.isInUse(classA.id)).toBe(true);
    expect(await classRepo.isInUse(classB.id)).toBe(true);
  });

  it("does not mark an unreferenced class as in use", async () => {
    const classA = await createTestClass();

    expect(await classRepo.isInUse(classA.id)).toBe(false);
  });
});
