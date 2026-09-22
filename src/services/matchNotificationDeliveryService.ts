import * as matchNotificationDeliveryRepo from "@/application/repositories/matchNotificationDeliveryRepository";
import { isUniqueConstraintError } from "@/services/swapRequestConflicts";

export const MATCH_NOTIFICATION_TYPE = "MATCH_FOUND";
export const MATCH_NOTIFICATION_RESERVATION_TIMEOUT_MS = 15 * 60 * 1000;

export async function reserveMatchNotificationDelivery(
  matchId: string,
  userId: string,
  email: string
): Promise<boolean> {
  const now = new Date();
  const staleReservationThreshold = new Date(
    now.getTime() - MATCH_NOTIFICATION_RESERVATION_TIMEOUT_MS
  );

  try {
    await matchNotificationDeliveryRepo.create({
      data: {
        matchId,
        userId,
        email,
        notificationType: MATCH_NOTIFICATION_TYPE,
        status: "SENDING",
        reservedAt: now,
        sentAt: null,
        lastError: null,
      },
    });
    return true;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const existingDelivery =
        await matchNotificationDeliveryRepo.findUnique({
          where: {
            matchId_userId_notificationType: {
              matchId,
              userId,
              notificationType: MATCH_NOTIFICATION_TYPE,
            },
          },
          select: {
            status: true,
            updatedAt: true,
          },
        });

      if (!existingDelivery) {
        return false;
      }

      if (
        existingDelivery.status === "SENT" ||
        (existingDelivery.status === "SENDING" &&
          existingDelivery.updatedAt > staleReservationThreshold)
      ) {
        return false;
      }

      const reclaimedReservation =
        await matchNotificationDeliveryRepo.updateMany({
          where: {
            matchId,
            userId,
            notificationType: MATCH_NOTIFICATION_TYPE,
            OR: [
              { status: "FAILED" },
              {
                status: "SENDING",
                updatedAt: { lte: staleReservationThreshold },
              },
            ],
          },
          data: {
            email,
            status: "SENDING",
            reservedAt: now,
            sentAt: null,
            lastError: null,
          },
        });

      return reclaimedReservation.count > 0;
    }

    throw error;
  }
}

export async function markMatchNotificationDeliverySent(
  matchId: string,
  userId: string
): Promise<void> {
  try {
    await matchNotificationDeliveryRepo.updateMany({
      where: {
        matchId,
        userId,
        notificationType: MATCH_NOTIFICATION_TYPE,
        status: "SENDING",
      },
      data: {
        status: "SENT",
        sentAt: new Date(),
        lastError: null,
      },
    });
  } catch (error) {
    console.warn(
      `Failed to mark match notification delivery as sent for match ${matchId} and user ${userId}:`,
      error
    );
  }
}

export async function markMatchNotificationDeliveryFailed(
  matchId: string,
  userId: string,
  reason: string
): Promise<void> {
  try {
    await matchNotificationDeliveryRepo.updateMany({
      where: {
        matchId,
        userId,
        notificationType: MATCH_NOTIFICATION_TYPE,
        status: "SENDING",
      },
      data: {
        status: "FAILED",
        lastError: reason.slice(0, 500),
      },
    });
  } catch (error) {
    console.warn(
      `Failed to mark match notification delivery as failed for match ${matchId} and user ${userId}:`,
      error
    );
  }
}
