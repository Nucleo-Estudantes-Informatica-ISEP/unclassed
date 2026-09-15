import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as matchNotificationRepo from "@/application/repositories/matchNotificationDeliveryRepository";
import * as matchRepo from "@/application/repositories/matchRepository";
import {
  assertSafeTestDatabaseUrl,
  clearTestDatabase,
  createTestUser,
} from "@tests/helpers/db";

describe("Match notification delivery reservation persistence", () => {
  beforeEach(async () => {
    assertSafeTestDatabaseUrl();
    await clearTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  it("enforces uniqueness on [matchId, userId, notificationType] compound key", async () => {
    const user = await createTestUser();
    const match = await matchRepo.create({
      data: {
        matchType: "SINGLE",
        swapPattern: "DIRECT",
        status: "PROVISIONAL",
        graphPartition: "test-partition",
        participants: [],
      },
    });

    const firstReservation = await matchNotificationRepo.create({
      data: {
        matchId: match.id,
        userId: user.id,
        notificationType: "MATCH_PROVISIONAL",
        email: user.email,
        status: "SENDING",
      },
    });
    expect(firstReservation.id).toBeDefined();

    // Second reservation for same match, user, and notificationType must fail with duplicate key
    await expect(
      matchNotificationRepo.create({
        data: {
          matchId: match.id,
          userId: user.id,
          notificationType: "MATCH_PROVISIONAL",
          email: user.email,
          status: "SENDING",
        },
      })
    ).rejects.toThrow();
  });

  it("allows reservations for different notification types for the same match and user", async () => {
    const user = await createTestUser();
    const match = await matchRepo.create({
      data: {
        matchType: "SINGLE",
        swapPattern: "DIRECT",
        status: "PROVISIONAL",
        graphPartition: "test-partition",
        participants: [],
      },
    });

    const provisional = await matchNotificationRepo.create({
      data: {
        matchId: match.id,
        userId: user.id,
        notificationType: "MATCH_PROVISIONAL",
        email: user.email,
        status: "SENT",
      },
    });

    const confirmed = await matchNotificationRepo.create({
      data: {
        matchId: match.id,
        userId: user.id,
        notificationType: "MATCH_CONFIRMED",
        email: user.email,
        status: "SENDING",
      },
    });

    expect(provisional.id).toBeDefined();
    expect(confirmed.id).toBeDefined();
    expect(provisional.id).not.toBe(confirmed.id);
  });
});
