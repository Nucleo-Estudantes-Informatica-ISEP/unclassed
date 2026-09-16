import { describe, expect, it, vi, beforeEach } from "vitest";

import prisma from "@/lib/prisma";
import * as matchNotificationDeliveryRepo from "@/application/repositories/matchNotificationDeliveryRepository";

describe("matchNotificationDeliveryRepository", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("findUnique", () => {
    it("calls prisma.matchNotificationDelivery.findUnique", async () => {
      const mockResult = { id: "test" };
      const spy = vi.spyOn(prisma.matchNotificationDelivery, "findUnique").mockResolvedValue(mockResult as never);

      const args = { where: { id: "n1" } };
      const result = await matchNotificationDeliveryRepo.findUnique(args);

      expect(spy).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });
  });

  describe("create", () => {
    it("calls prisma.matchNotificationDelivery.create", async () => {
      const mockResult = { id: "test" };
      const spy = vi.spyOn(prisma.matchNotificationDelivery, "create").mockResolvedValue(mockResult as never);

      const args = { data: { matchId: "m1", status: "PENDING" as const } } as unknown as Parameters<typeof matchNotificationDeliveryRepo.create>[0];
      const result = await matchNotificationDeliveryRepo.create(args);

      expect(spy).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });
  });

  describe("updateMany", () => {
    it("calls prisma.matchNotificationDelivery.updateMany", async () => {
      const mockResult = { count: 1 };
      const spy = vi.spyOn(prisma.matchNotificationDelivery, "updateMany").mockResolvedValue(mockResult as never);

      const args = { data: { status: "SENT" as const } };
      const result = await matchNotificationDeliveryRepo.updateMany(args);

      expect(spy).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });
  });

  describe("deleteMany", () => {
    it("calls prisma.matchNotificationDelivery.deleteMany", async () => {
      const mockResult = { count: 1 };
      const spy = vi.spyOn(prisma.matchNotificationDelivery, "deleteMany").mockResolvedValue(mockResult as never);

      const result = await matchNotificationDeliveryRepo.deleteMany({});

      expect(spy).toHaveBeenCalledWith({});
      expect(result).toEqual(mockResult);
    });
  });
});
