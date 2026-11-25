import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as singleSwapRepo from "@/application/repositories/singleSwapRequestRepository";
import * as userRepo from "@/application/repositories/userRepository";
import type { SessionUser } from "@/application/services/userService";
import {
  cancelSwapRequest,
  createSingleSwapRequest,
  deleteSwapRequest,
  updateSwapRequestPreferredClasses,
} from "@/application/services/swapRequestService";
import {
  assertSafeTestDatabaseUrl,
  clearTestDatabase,
  createTestClass,
  createTestSubject,
  createTestUser,
} from "@tests/helpers/db";

describe("Swap request service state transitions and persistence in MongoDB", () => {
  beforeEach(async () => {
    assertSafeTestDatabaseUrl();
    await clearTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  it("completes user onboarding on request creation and updates preferences", async () => {
    const user = await createTestUser({ onboardingCompletedAt: null });
    const subject = await createTestSubject();
    const classA = await createTestClass();
    const classB = await createTestClass();
    const classC = await createTestClass();

    const session: SessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: true,
      phone: null,
      emailNotifications: true,
      sharePhoneOnMatch: false,
      onboardingCompletedAt: user.onboardingCompletedAt,
      createdAt: user.createdAt,
      role: user.role,
      roles: [],
    };

    // 1. Create request
    const created = await createSingleSwapRequest(
      session,
      {
        subjectId: subject.id,
        currentClassId: classA.id,
        preferredClassIds: [classB.id],
        preferenceOrderMatters: true,
      },
      singleSwapRepo
    );

    expect(created.id).toBeDefined();
    expect(created.status).toBe("ACTIVE");

    // Verify user onboarding was recorded in MongoDB
    const updatedUser = await userRepo.findById(user.id);
    expect(updatedUser?.onboardingCompletedAt).not.toBeNull();

    // 2. Update preferred classes
    const updated = await updateSwapRequestPreferredClasses(
      session,
      created.id,
      "single",
      singleSwapRepo,
      [classC.id]
    );

    expect(updated.preferredClasses?.map((c) => c.id)).toEqual([classC.id]);

    // 3. Cancel request
    const cancelled = await cancelSwapRequest(
      session,
      created.id,
      singleSwapRepo
    );
    expect(cancelled.status).toBe("CANCELLED");

    // 4. Attempting to cancel an already cancelled request must fail
    await expect(
      cancelSwapRequest(session, created.id, singleSwapRepo)
    ).rejects.toThrow("Apenas pedidos ativos podem ser cancelados");

    // 5. Deleting a cancelled request works
    await deleteSwapRequest(session, created.id, singleSwapRepo);
    const postDelete = await singleSwapRepo.findById(created.id);
    expect(postDelete).toBeNull();
  });
});
