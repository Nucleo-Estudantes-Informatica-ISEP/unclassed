import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/services/emailService", () => ({
  emailService: {
    sendMatchStatusUpdate: vi.fn(),
  },
}));

import * as matchRepo from "@/application/repositories/matchRepository";
import * as singleSwapRequestRepo from "@/application/repositories/singleSwapRequestRepository";
import * as bundleSwapRequestRepo from "@/application/repositories/bundleSwapRequestRepository";
import * as graphPartitionRepo from "@/application/repositories/graphPartitionRepository";
import * as userRepo from "@/application/repositories/userRepository";
import {
  processMatchAction,
  MatchActionNotFoundError,
  MatchActionForbiddenError,
  MatchActionConflictError,
} from "./matchActionService";

describe("matchActionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("processMatchAction", () => {
    it("throws MatchActionNotFoundError when match does not exist", async () => {
      vi.spyOn(matchRepo, "findUnique").mockResolvedValueOnce(null);

      await expect(
        processMatchAction("unknown-match", "user-1", "accept")
      ).rejects.toThrow(MatchActionNotFoundError);
    });

    it("throws MatchActionForbiddenError when user is not a participant", async () => {
      vi.spyOn(matchRepo, "findUnique").mockResolvedValueOnce({
        id: "match-1",
        status: "PROPOSED",
        isProvisional: false,
        provisionalUntil: null,
        graphPartition: "part-1",
        participants: [{ userId: "user-other", status: "pending" }],
        singleSwapRequestIds: [],
        bundleSwapRequestIds: [],
        updatedAt: new Date(),
      } as never);

      await expect(
        processMatchAction("match-1", "user-1", "accept")
      ).rejects.toThrow(MatchActionForbiddenError);
    });

    it("throws MatchActionConflictError when match action violates rules", async () => {
      vi.spyOn(matchRepo, "findUnique").mockResolvedValueOnce({
        id: "match-1",
        status: "COMPLETED",
        isProvisional: false,
        provisionalUntil: null,
        graphPartition: "part-1",
        participants: [{ userId: "user-1", status: "completed" }],
        singleSwapRequestIds: [],
        bundleSwapRequestIds: [],
        updatedAt: new Date(),
      } as never);

      await expect(
        processMatchAction("match-1", "user-1", "accept")
      ).rejects.toThrow(MatchActionConflictError);
    });

    it("accepts match and updates participant atomically", async () => {
      const updatedAt = new Date();
      const matchData = {
        id: "match-1",
        status: "PROPOSED",
        isProvisional: false,
        provisionalUntil: null,
        graphPartition: "part-1",
        participants: [
          { userId: "user-1", status: "pending" },
          { userId: "user-2", status: "pending" },
        ],
        singleSwapRequestIds: [],
        bundleSwapRequestIds: [],
        updatedAt,
      };

      vi.spyOn(matchRepo, "findUnique").mockResolvedValueOnce(matchData as never);
      vi.spyOn(matchRepo, "updateMany").mockResolvedValueOnce({ count: 1 });
      vi.spyOn(matchRepo, "findUniqueOrThrow").mockResolvedValueOnce({
        ...matchData,
        participants: [
          { userId: "user-1", status: "accepted" },
          { userId: "user-2", status: "pending" },
        ],
      } as never);
      vi.spyOn(userRepo, "findMany").mockResolvedValueOnce([]);

      const result = await processMatchAction("match-1", "user-1", "accept");

      expect(result.message).toBe("Match aceite! A aguardar pelos outros participantes.");
      expect(matchRepo.updateMany).toHaveBeenCalledWith({
        where: { id: "match-1", updatedAt: new Date(updatedAt) },
        data: expect.objectContaining({
          status: "PROPOSED",
        }),
      });
    });

    it("rejects match, reactivates requests, and updates partition count", async () => {
      const updatedAt = new Date();
      const matchData = {
        id: "match-1",
        status: "PROPOSED",
        isProvisional: false,
        provisionalUntil: null,
        graphPartition: "part-1",
        participants: [
          { userId: "user-1", status: "pending" },
          { userId: "user-2", status: "pending" },
        ],
        singleSwapRequestIds: ["req-1"],
        bundleSwapRequestIds: ["bundle-1"],
        updatedAt,
      };

      vi.spyOn(matchRepo, "findUnique").mockResolvedValueOnce(matchData as never);
      vi.spyOn(matchRepo, "updateMany").mockResolvedValueOnce({ count: 1 });
      vi.spyOn(matchRepo, "findUniqueOrThrow").mockResolvedValueOnce({
        ...matchData,
        status: "REJECTED",
      } as never);
      vi.spyOn(userRepo, "findMany").mockResolvedValueOnce([]);
      vi.spyOn(singleSwapRequestRepo, "updateMany").mockResolvedValue({ count: 1 });
      vi.spyOn(bundleSwapRequestRepo, "updateMany").mockResolvedValue({ count: 1 });
      vi.spyOn(singleSwapRequestRepo, "count").mockResolvedValue(1);
      vi.spyOn(bundleSwapRequestRepo, "count").mockResolvedValue(1);
      vi.spyOn(graphPartitionRepo, "update").mockResolvedValue({} as never);

      const result = await processMatchAction("match-1", "user-1", "reject");

      expect(result.message).toBe("Match rejeitado. O teu pedido voltou a ficar ativo.");
      expect(singleSwapRequestRepo.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["req-1"] } },
        data: {
          status: "ACTIVE",
          provisionalMatchId: null,
          provisionalUntil: null,
          lastProcessed: null,
        },
      });
      expect(bundleSwapRequestRepo.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["bundle-1"] } },
        data: {
          status: "ACTIVE",
          provisionalMatchId: null,
          provisionalUntil: null,
          lastProcessed: null,
        },
      });
    });
  });
});
