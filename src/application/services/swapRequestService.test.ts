import { describe, expect, it, vi } from "vitest";

import * as classRepo from "@/application/repositories/classRepository";
import * as singleSwapRequestRepo from "@/application/repositories/singleSwapRequestRepository";
import * as bundleSwapRequestRepo from "@/application/repositories/bundleSwapRequestRepository";
import * as requestService from "@/application/services/requestService";
import * as userService from "@/application/services/userService";
import * as matchingTriggers from "@/services/matchingTriggers";
import {
  listSwapRequests,
  createSingleSwapRequest,
  createBundleSwapRequest,
  getSwapRequestById,
  updateSwapRequestPreferredClasses,
  cancelSwapRequest,
  deleteSwapRequest,
  SwapRequestNotFoundError as NotFoundError,
  SwapRequestForbiddenError as ForbiddenError,
  SwapRequestConflictError as ConflictError,
  SwapRequestValidationError as ValidationError,
} from "./swapRequestService";
import { SessionUser } from "@/application/services/userService";

describe("swapRequestService", () => {
  const normalUser: SessionUser = {
    id: "user-1",
    name: "User One",
    email: "user1@example.com",
    emailVerified: true,
    phone: null,
    emailNotifications: true,
    sharePhoneOnMatch: false,
    role: "USER",
    roles: ["user"],
    createdAt: new Date("2026-01-01"),
    onboardingCompletedAt: new Date("2026-01-01"),
  };

  const adminUser: SessionUser = {
    id: "admin-1",
    name: "Admin One",
    email: "admin@example.com",
    emailVerified: true,
    phone: null,
    emailNotifications: true,
    sharePhoneOnMatch: false,
    role: "ADMIN",
    roles: ["admin"],
    createdAt: new Date("2026-01-01"),
    onboardingCompletedAt: new Date("2026-01-01"),
  };


  describe("listSwapRequests", () => {
    it("allows admin to filter by target userId and status", async () => {
      const findManySpy = vi
        .spyOn(singleSwapRequestRepo, "listWithDetails")
        .mockResolvedValueOnce([]);

      await listSwapRequests({
        session: adminUser,
        queryUserId: "target-user",
        queryStatus: "ACTIVE",
        type: "single",
      });

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "target-user", status: "ACTIVE" },
        })
      );
    });
  });

  describe("createSingleSwapRequest", () => {
    it("creates a single swap request, triggers matching and records onboarding", async () => {
      const userWithoutOnboarding: SessionUser = {
        ...normalUser,
        onboardingCompletedAt: null,
      };

      vi.spyOn(requestService, "validateSingleRequestCreation").mockResolvedValueOnce({
        ok: true,
        userId: "user-1",
        subject: { id: "sub-1", code: "PROG", name: "Prog", year: 1 } as never,
        currentClass: { id: "c1", name: "LEI11", year: 1 } as never,
        preferredClasses: [{ id: "c2", name: "LEI12", year: 1 }] as never,
      });

      const createSpy = vi
        .spyOn(singleSwapRequestRepo, "createWithDetails")
        .mockResolvedValueOnce({
          id: "sr-1",
          userId: "user-1",
          subjectId: "sub-1",
          currentClassId: "c1",
          preferredClassIds: ["c2"],
          preferenceOrderMatters: true,
          ticketType: "SPECIFIC_CLASS",
          status: "ACTIVE",
          priority: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as never);

      vi.spyOn(classRepo, "findManyByIds").mockResolvedValueOnce([
        { id: "c2", name: "LEI12", year: 1 },
      ] as never);

      const matchSpy = vi
        .spyOn(matchingTriggers, "triggerImmediateMatching")
        .mockResolvedValueOnce(undefined as never);
      const onboardingSpy = vi
        .spyOn(userService, "markOnboardingComplete")
        .mockResolvedValueOnce({ count: 1 } as never);

      const result = await createSingleSwapRequest(userWithoutOnboarding, {
        subjectId: "sub-1",
        currentClassId: "c1",
        preferredClassIds: ["c2"],
        preferenceOrderMatters: true,
      });

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-1",
            subjectId: "sub-1",
            ticketType: "SPECIFIC_CLASS",
            graphPartition: "subject-sub-1",
          }),
        })
      );
      expect(result.id).toBe("sr-1");
      expect(matchSpy).toHaveBeenCalledWith("sr-1", "single");
      expect(onboardingSpy).toHaveBeenCalledWith("user-1");
    });

    it("matching trigger failure does not prevent request creation", async () => {
      vi.spyOn(requestService, "validateSingleRequestCreation").mockResolvedValueOnce({
        ok: true,
        userId: "user-1",
        subject: { id: "sub-1", code: "PROG", name: "Prog", year: 1 } as never,
        currentClass: { id: "c1", name: "LEI11", year: 1 } as never,
        preferredClasses: [{ id: "c2", name: "LEI12", year: 1 }] as never,
      });

      vi.spyOn(singleSwapRequestRepo, "createWithDetails").mockResolvedValueOnce({
        id: "sr-2",
        userId: "user-1",
        subjectId: "sub-1",
        currentClassId: "c1",
        preferredClassIds: ["c2"],
        preferenceOrderMatters: true,
        ticketType: "SPECIFIC_CLASS",
        status: "ACTIVE",
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      vi.spyOn(classRepo, "findManyByIds").mockResolvedValueOnce([
        { id: "c2", name: "LEI12", year: 1 },
      ] as never);

      vi.spyOn(matchingTriggers, "triggerImmediateMatching").mockRejectedValueOnce(
        new Error("Matching engine temporarily unavailable")
      );

      const result = await createSingleSwapRequest(normalUser, {
        subjectId: "sub-1",
        currentClassId: "c1",
        preferredClassIds: ["c2"],
        preferenceOrderMatters: true,
      });

      expect(result.id).toBe("sr-2");
    });

    it("throws ConflictError on unique constraint violation", async () => {
      vi.spyOn(requestService, "validateSingleRequestCreation").mockResolvedValueOnce({
        ok: true,
        userId: "user-1",
        subject: { id: "sub-1", code: "PROG", name: "Prog", year: 1 } as never,
        currentClass: { id: "c1", name: "LEI11", year: 1 } as never,
        preferredClasses: [{ id: "c2", name: "LEI12", year: 1 }] as never,
      });

      const uniqueError = new Error("Unique constraint failed");
      Object.assign(uniqueError, { code: "P2002" });
      vi.spyOn(singleSwapRequestRepo, "createWithDetails").mockRejectedValueOnce(uniqueError);

      await expect(
        createSingleSwapRequest(normalUser, {
          subjectId: "sub-1",
          currentClassId: "c1",
          preferredClassIds: ["c2"],
          preferenceOrderMatters: true,
        })
      ).rejects.toThrow(ConflictError);
    });

    it("throws ServiceError with status 409 when pre-validation detects duplicate active request", async () => {
      vi.spyOn(requestService, "validateSingleRequestCreation").mockResolvedValueOnce({
        ok: false,
        status: 409,
        error: "Já tens um pedido ativo para esta disciplina",
      });

      await expect(
        createSingleSwapRequest(normalUser, {
          subjectId: "sub-1",
          currentClassId: "c1",
          preferredClassIds: ["c2"],
          preferenceOrderMatters: true,
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("createBundleSwapRequest", () => {
    it("creates a bundle swap request and calculates year partition", async () => {
      vi.spyOn(requestService, "validateBundleRequestCreation").mockResolvedValueOnce({
        ok: true,
        userId: "user-1",
        currentClass: { id: "c1", name: "LEI21", year: 2 } as never,
        preferredClasses: [{ id: "c2", name: "LEI22", year: 2 }] as never,
      });

      const createSpy = vi
        .spyOn(bundleSwapRequestRepo, "createWithDetails")
        .mockResolvedValueOnce({
          id: "br-1",
          userId: "user-1",
          currentClassId: "c1",
          preferredClassIds: ["c2"],
          preferenceOrderMatters: true,
          ticketType: "ALL_CLASSES",
          status: "ACTIVE",
          priority: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as never);

      vi.spyOn(classRepo, "findManyByIds").mockResolvedValueOnce([
        { id: "c2", name: "LEI22", year: 2 },
      ] as never);

      const result = await createBundleSwapRequest(normalUser, {
        currentClassId: "c1",
        preferredClassIds: ["c2"],
        preferenceOrderMatters: true,
      });

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-1",
            ticketType: "ALL_CLASSES",
            graphPartition: "year-2",
          }),
        })
      );
      expect(result.id).toBe("br-1");
    });
  });

  describe("getSwapRequestById", () => {
    it("throws NotFoundError when request does not exist", async () => {
      vi.spyOn(singleSwapRequestRepo, "getByIdWithDetails").mockResolvedValueOnce(null);

      await expect(
        getSwapRequestById(normalUser, "non-existent", "single")
      ).rejects.toThrow(NotFoundError);
    });

    it("throws ForbiddenError when normal user attempts to access another user's request (IDOR)", async () => {
      vi.spyOn(singleSwapRequestRepo, "getByIdWithDetails").mockResolvedValueOnce({
        id: "req-1",
        userId: "other-user",
        preferredClassIds: [],
      } as never);

      await expect(
        getSwapRequestById(normalUser, "req-1", "single")
      ).rejects.toThrow(ForbiddenError);
    });

    it("allows admin to access another user's request", async () => {
      vi.spyOn(singleSwapRequestRepo, "getByIdWithDetails").mockResolvedValueOnce({
        id: "req-1",
        userId: "other-user",
        preferredClassIds: ["c1"],
      } as never);
      vi.spyOn(classRepo, "findManyByIds").mockResolvedValueOnce([
        { id: "c1", name: "LEI11", year: 1 },
      ] as never);

      const result = await getSwapRequestById(adminUser, "req-1", "single");
      expect(result.id).toBe("req-1");
    });
  });

  describe("cancelSwapRequest", () => {
    it("cancels an ACTIVE request and returns updated DTO", async () => {
      vi.spyOn(singleSwapRequestRepo, "getByIdWithDetails")
        .mockResolvedValueOnce({
          id: "req-1",
          userId: "user-1",
          status: "ACTIVE",
          preferredClassIds: ["c1"],
        } as never)
        .mockResolvedValueOnce({
          id: "req-1",
          userId: "user-1",
          status: "CANCELLED",
          preferredClassIds: ["c1"],
        } as never);

      const updateSpy = vi
        .spyOn(singleSwapRequestRepo, "updateMany")
        .mockResolvedValueOnce({ count: 1 } as never);

      vi.spyOn(classRepo, "findManyByIds").mockResolvedValueOnce([
        { id: "c1", name: "LEI11", year: 1 },
      ] as never);

      const result = await cancelSwapRequest(normalUser, "req-1", "single");

      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: "req-1", status: "ACTIVE" },
        data: { status: "CANCELLED", updatedAt: expect.any(Date) },
      });
      expect(result.status).toBe("CANCELLED");
    });

    it("throws ConflictError when attempting to cancel a non-active request", async () => {
      vi.spyOn(singleSwapRequestRepo, "getByIdWithDetails").mockResolvedValueOnce({
        id: "req-1",
        userId: "user-1",
        status: "CANCELLED",
      } as never);

      await expect(
        cancelSwapRequest(normalUser, "req-1", "single")
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("updateSwapRequestPreferredClasses", () => {
    it("throws ForbiddenError when user tries to update another user's request (IDOR)", async () => {
      vi.spyOn(singleSwapRequestRepo, "getByIdWithDetails").mockResolvedValueOnce({
        id: "req-1",
        userId: "other-user",
        status: "ACTIVE",
      } as never);

      await expect(
        updateSwapRequestPreferredClasses(normalUser, "req-1", "single", ["c2"])
      ).rejects.toThrow(ForbiddenError);
    });

    it("throws ConflictError when trying to edit a CANCELLED request", async () => {
      vi.spyOn(singleSwapRequestRepo, "getByIdWithDetails").mockResolvedValueOnce({
        id: "req-1",
        userId: "user-1",
        status: "CANCELLED",
      } as never);

      await expect(
        updateSwapRequestPreferredClasses(normalUser, "req-1", "single", ["c1"])
      ).rejects.toThrow(ConflictError);
    });

    it("throws NotFoundError when preferred classes do not exist in DB", async () => {
      vi.spyOn(singleSwapRequestRepo, "getByIdWithDetails").mockResolvedValueOnce({
        id: "req-1",
        userId: "user-1",
        status: "ACTIVE",
      } as never);

      vi.spyOn(classRepo, "findManyByIds").mockResolvedValueOnce([
        { id: "c1", name: "LEI11", year: 1 }, // Only 1 found out of 2 requested
      ] as never);

      await expect(
        updateSwapRequestPreferredClasses(normalUser, "req-1", "single", [
          "c1",
          "missing-class",
        ])
      ).rejects.toThrow(NotFoundError);
    });

    it("enforces same-year validation for bundle updates and throws ValidationError on mismatch", async () => {
      vi.spyOn(bundleSwapRequestRepo, "getByIdWithDetails").mockResolvedValueOnce({
        id: "br-1",
        userId: "user-1",
        currentClassId: "c1",
        status: "ACTIVE",
      } as never);

      vi.spyOn(classRepo, "findManyByIds").mockResolvedValueOnce([
        { id: "c2", name: "LEI21", year: 2 },
      ] as never);

      vi.spyOn(classRepo, "findById").mockResolvedValueOnce({
        id: "c1",
        name: "LEI11",
        year: 1, // Year 1 vs Year 2!
      } as never);

      await expect(
        updateSwapRequestPreferredClasses(normalUser, "br-1", "bundle", ["c2"])
      ).rejects.toThrow(ValidationError);
    });

    it("updates preferred classes with strict allowlist", async () => {
      vi.spyOn(singleSwapRequestRepo, "getByIdWithDetails")
        .mockResolvedValueOnce({
          id: "req-1",
          userId: "user-1",
          status: "ACTIVE",
          preferredClassIds: ["c1"],
        } as never)
        .mockResolvedValueOnce({
          id: "req-1",
          userId: "user-1",
          status: "ACTIVE",
          preferredClassIds: ["c2"],
          preferredClasses: [{ id: "c2", name: "LEI12", year: 1 }],
        } as never);

      const updateSpy = vi
        .spyOn(singleSwapRequestRepo, "updateMany")
        .mockResolvedValueOnce({ count: 1 } as never);

      vi.spyOn(classRepo, "findManyByIds")
        .mockResolvedValueOnce([{ id: "c2", name: "LEI12", year: 1 }] as never)
        .mockResolvedValueOnce([{ id: "c2", name: "LEI12", year: 1 }] as never);

      const result = await updateSwapRequestPreferredClasses(
        normalUser,
        "req-1",
        "single",
        ["c2"]
      );

      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: "req-1", status: "ACTIVE" },
        data: {
          preferredClassIds: ["c2"],
          updatedAt: expect.any(Date),
        },
      });
      expect(result.preferredClasses).toEqual([
        { id: "c2", name: "LEI12", year: 1 },
      ]);
    });
  });

  describe("deleteSwapRequest", () => {
    it("hard deletes request when authorized", async () => {
      vi.spyOn(singleSwapRequestRepo, "getByIdWithDetails").mockResolvedValue({
        id: "req-1",
        userId: "user-1",
        status: "ACTIVE",
      } as never);

      const removeSpy = vi
        .spyOn(singleSwapRequestRepo, "remove")
        .mockResolvedValueOnce({} as never);

      const result = await deleteSwapRequest(normalUser, "req-1", "single");

      expect(removeSpy).toHaveBeenCalledWith({
        where: { id: "req-1" },
      });
      expect(result.message).toBe("Pedido de permuta eliminado com sucesso");
    });

    it("throws ForbiddenError when non-admin tries to delete another user's request", async () => {
      vi.spyOn(singleSwapRequestRepo, "getByIdWithDetails").mockResolvedValueOnce({
        id: "req-1",
        userId: "other-user",
      } as never);

      await expect(
        deleteSwapRequest(normalUser, "req-1", "single")
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
