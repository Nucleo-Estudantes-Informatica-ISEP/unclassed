import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as matchNotificationRepo from "@/application/repositories/matchNotificationDeliveryRepository";
import * as matchRepo from "@/application/repositories/matchRepository";
import {
  MatchingOrchestrator,
  MATCH_NOTIFICATION_TYPE,
  MATCH_NOTIFICATION_RESERVATION_TIMEOUT_MS,
} from "@/application/matchingOrchestrator";
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

  it("reclaims stale SENDING reservations but respects active SENDING and SENT reservations", async () => {
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

    const orchestrator = new MatchingOrchestrator();
    
    // 1. Create a stale SENDING reservation (older than 15-minute production timeout)
    const now = new Date();
    const staleDate = new Date(now.getTime() - MATCH_NOTIFICATION_RESERVATION_TIMEOUT_MS - 1000);
    
    await matchNotificationRepo.create({
      data: {
        matchId: match.id,
        userId: user.id,
        notificationType: MATCH_NOTIFICATION_TYPE,
        email: user.email,
        status: "SENDING",
      },
    });
    
    // Manually backdate the updatedAt to simulate a stale reservation
    await matchNotificationRepo.updateMany({
      where: { matchId: match.id, userId: user.id, notificationType: MATCH_NOTIFICATION_TYPE },
      data: { updatedAt: staleDate }
    });

    // Should successfully reclaim the stale reservation
    const reclaimed = await orchestrator.reserveMatchNotificationDelivery(
      match.id,
      user.id,
      user.email
    );
    expect(reclaimed).toBe(true);

    // 2. Try to reserve again immediately (active SENDING reservation)
    const active = await orchestrator.reserveMatchNotificationDelivery(
      match.id,
      user.id,
      user.email
    );
    expect(active).toBe(false);

    // 3. Mark it as SENT and try again
    await matchNotificationRepo.updateMany({
      where: { matchId: match.id, userId: user.id, notificationType: MATCH_NOTIFICATION_TYPE },
      data: { status: "SENT" },
    });

    const sent = await orchestrator.reserveMatchNotificationDelivery(
      match.id,
      user.id,
      user.email
    );
    expect(sent).toBe(false);
  });
});
