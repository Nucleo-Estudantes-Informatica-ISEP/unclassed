import { describe, expect, it, vi, beforeEach } from "vitest";

import * as classRepo from "@/application/repositories/classRepository";
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
  ISingleSwapRequestRepository,
  IBundleSwapRequestRepository,
} from "./swapRequestService";
import { SessionUser } from "@/application/services/userService";

describe("swapRequestService", () => {
  const mockRepo = {
    getByIdWithDetails: vi.fn(),
    updatePreferredClasses: vi.fn(),
    cancel: vi.fn(),
    remove: vi.fn(),
    listWithDetails: vi.fn(),
    create: vi.fn(),
  } satisfies ISingleSwapRequestRepository & IBundleSwapRequestRepository;

  beforeEach(() => {
    vi.resetAllMocks();
  });

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
      mockRepo.listWithDetails.mockResolvedValueOnce([]);

      await listSwapRequests({
        session: adminUser,
        queryUserId: "target-user",
        queryStatus: "ACTIVE",
        repo: mockRepo,
      });

      expect(mockRepo.listWithDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "target-user",
          status: "ACTIVE",
        })
      );
    });

    it("ignores queryUserId for normal users and uses their own id", async () => {
      mockRepo.listWithDetails.mockResolvedValueOnce([]);

      await listSwapRequests({
        session: normalUser,
        queryUserId: "target-user",
        queryStatus: "ACTIVE",
        repo: mockRepo,
      });

      expect(mockRepo.listWithDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: normalUser.id,
          status: "ACTIVE",
        })
      );
    });

    it("passes undefined for invalid queryStatus", async () => {
      mockRepo.listWithDetails.mockResolvedValueOnce([]);

      await listSwapRequests({
        session: normalUser,
        queryStatus: "INVALID_STATUS",
        repo: mockRepo,
      });

      expect(mockRepo.listWithDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: normalUser.id,
          status: undefined,
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

      mockRepo.create.mockResolvedValueOnce({
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
      }, mockRepo);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          subjectId: "sub-1",
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

      mockRepo.create.mockResolvedValueOnce({
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
      }, mockRepo);

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
      mockRepo.create.mockRejectedValueOnce(uniqueError);

      await expect(
        createSingleSwapRequest(normalUser, {
          subjectId: "sub-1",
          currentClassId: "c1",
          preferredClassIds: ["c2"],
          preferenceOrderMatters: true,
        }, mockRepo)
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
        }, mockRepo)
      ).rejects.toThrow(ConflictError);
    });

    it("throws NotFoundError when pre-validation detects missing resource", async () => {
      vi.spyOn(requestService, "validateSingleRequestCreation").mockResolvedValueOnce({
        ok: false,
        status: 404,
        error: "Disciplina não encontrada",
      });

      await expect(
        createSingleSwapRequest(normalUser, {
          subjectId: "sub-1",
          currentClassId: "c1",
          preferredClassIds: ["c2"],
          preferenceOrderMatters: true,
        }, mockRepo)
      ).rejects.toThrow(NotFoundError);
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

      mockRepo.create.mockResolvedValueOnce({
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
      }, mockRepo);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          year: 2,
        })
      );
      expect(result.id).toBe("br-1");
    });

    it("throws ValidationError when pre-validation detects bad request", async () => {
      vi.spyOn(requestService, "validateBundleRequestCreation").mockResolvedValueOnce({
        ok: false,
        status: 400,
        error: "Erro de validação de bundle",
      });

      await expect(
        createBundleSwapRequest(normalUser, {
          currentClassId: "c1",
          preferredClassIds: ["c2"],
          preferenceOrderMatters: true,
        }, mockRepo)
      ).rejects.toThrow(ValidationError);
    });

    it("throws ConflictError on unique constraint violation", async () => {
      vi.spyOn(requestService, "validateBundleRequestCreation").mockResolvedValueOnce({
        ok: true,
        userId: "user-1",
        currentClass: { id: "c1", name: "LEI21", year: 2 } as never,
        preferredClasses: [{ id: "c2", name: "LEI22", year: 2 }] as never,
      });

      const uniqueError = new Error("Unique constraint failed");
      Object.assign(uniqueError, { code: "P2002" });
      mockRepo.create.mockRejectedValueOnce(uniqueError);

      await expect(
        createBundleSwapRequest(normalUser, {
          currentClassId: "c1",
          preferredClassIds: ["c2"],
          preferenceOrderMatters: true,
        }, mockRepo)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("getSwapRequestById", () => {
    it("throws NotFoundError when request does not exist", async () => {
      mockRepo.getByIdWithDetails.mockResolvedValueOnce(null);

      await expect(
        getSwapRequestById(normalUser, "non-existent", mockRepo)
      ).rejects.toThrow(NotFoundError);
    });

    it("throws ForbiddenError when normal user attempts to access another user's request (IDOR)", async () => {
      mockRepo.getByIdWithDetails.mockResolvedValueOnce({
        id: "req-1",
        userId: "other-user",
        preferredClassIds: [],
      } as never);

      await expect(
        getSwapRequestById(normalUser, "req-1", mockRepo)
      ).rejects.toThrow(ForbiddenError);
    });

    it("allows admin to access another user's request", async () => {
      mockRepo.getByIdWithDetails.mockResolvedValueOnce({
        id: "req-1",
        userId: "other-user",
        preferredClassIds: ["c1"],
      } as never);
      vi.spyOn(classRepo, "findManyByIds").mockResolvedValueOnce([
        { id: "c1", name: "LEI11", year: 1 },
      ] as never);

      const result = await getSwapRequestById(adminUser, "req-1", mockRepo);
      expect(result.id).toBe("req-1");
    });
  });

  describe("cancelSwapRequest", () => {
    it("cancels an ACTIVE request and returns updated DTO", async () => {
      mockRepo.getByIdWithDetails.mockResolvedValueOnce({
        id: "req-1",
        userId: "user-1",
        status: "ACTIVE",
        preferredClassIds: ["c1"],
      } as never);

      mockRepo.cancel.mockResolvedValueOnce({
        id: "req-1",
        userId: "user-1",
        status: "CANCELLED",
        preferredClassIds: ["c1"],
      } as never);

      vi.spyOn(classRepo, "findManyByIds").mockResolvedValueOnce([
        { id: "c1", name: "LEI11", year: 1 },
      ] as never);

      const result = await cancelSwapRequest(normalUser, "req-1", mockRepo);

      expect(mockRepo.cancel).toHaveBeenCalledWith("req-1");
      expect(result.status).toBe("CANCELLED");
    });

    it("throws ConflictError when attempting to cancel a non-active request", async () => {
      mockRepo.getByIdWithDetails.mockResolvedValueOnce({
        id: "req-1",
        userId: "user-1",
        status: "CANCELLED",
      } as never);

      await expect(
        cancelSwapRequest(normalUser, "req-1", mockRepo)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("updateSwapRequestPreferredClasses", () => {
    it("throws ValidationError when preferredClassIds is empty", async () => {
      await expect(
        updateSwapRequestPreferredClasses(normalUser, "req-1", "single", mockRepo, [])
      ).rejects.toThrow(ValidationError);
    });

    it("throws ForbiddenError when user tries to update another user's request (IDOR)", async () => {
      mockRepo.getByIdWithDetails.mockResolvedValueOnce({
        id: "req-1",
        userId: "other-user",
        status: "ACTIVE",
      } as never);

      await expect(
        updateSwapRequestPreferredClasses(normalUser, "req-1", "single", mockRepo, ["c2"])
      ).rejects.toThrow(ForbiddenError);
    });

    it("throws ConflictError when trying to edit a CANCELLED request", async () => {
      mockRepo.getByIdWithDetails.mockResolvedValueOnce({
        id: "req-1",
        userId: "user-1",
        status: "CANCELLED",
      } as never);

      await expect(
        updateSwapRequestPreferredClasses(normalUser, "req-1", "single", mockRepo, ["c1"])
      ).rejects.toThrow(ConflictError);
    });

    it("throws NotFoundError when preferred classes do not exist in DB", async () => {
      mockRepo.getByIdWithDetails.mockResolvedValueOnce({
        id: "req-1",
        userId: "user-1",
        status: "ACTIVE",
      } as never);

      vi.spyOn(classRepo, "findManyByIds").mockResolvedValueOnce([
        { id: "c1", name: "LEI11", year: 1 }, // Only 1 found out of 2 requested
      ] as never);

      await expect(
        updateSwapRequestPreferredClasses(normalUser, "req-1", "single", mockRepo, [
          "c1",
          "missing-class",
        ])
      ).rejects.toThrow(NotFoundError);
    });

    it("enforces same-year validation for bundle updates and throws ValidationError on mismatch", async () => {
      mockRepo.getByIdWithDetails.mockResolvedValueOnce({
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
        updateSwapRequestPreferredClasses(normalUser, "br-1", "bundle", mockRepo, ["c2"])
      ).rejects.toThrow(ValidationError);
    });

    it("throws NotFoundError when currentClass is missing for bundle update", async () => {
      mockRepo.getByIdWithDetails.mockResolvedValueOnce({
        id: "br-1",
        userId: "user-1",
        status: "ACTIVE",
        currentClassId: "c1",
      } as never);

      vi.spyOn(classRepo, "findManyByIds").mockResolvedValueOnce([
        { id: "c2", name: "LEI21", year: 2 },
      ] as never);

      vi.spyOn(classRepo, "findById").mockResolvedValueOnce(null);

      await expect(
        updateSwapRequestPreferredClasses(normalUser, "br-1", "bundle", mockRepo, ["c2"])
      ).rejects.toThrow(NotFoundError);
    });

    it("updates preferred classes with strict allowlist", async () => {
      mockRepo.getByIdWithDetails.mockResolvedValueOnce({
        id: "req-1",
        userId: "user-1",
        status: "ACTIVE",
        preferredClassIds: ["c1"],
      } as never);

      mockRepo.updatePreferredClasses.mockResolvedValueOnce({
        id: "req-1",
        userId: "user-1",
        status: "ACTIVE",
        preferredClassIds: ["c2"],
        preferredClasses: [{ id: "c2", name: "LEI12", year: 1 }],
      } as never);

      vi.spyOn(classRepo, "findManyByIds")
        .mockResolvedValueOnce([{ id: "c2", name: "LEI12", year: 1 }] as never)
        .mockResolvedValueOnce([{ id: "c2", name: "LEI12", year: 1 }] as never);

      const result = await updateSwapRequestPreferredClasses(
        normalUser,
        "req-1",
        "single",
        mockRepo,
        ["c2"]
      );

      expect(mockRepo.updatePreferredClasses).toHaveBeenCalledWith("req-1", ["c2"]);
      expect(result.preferredClasses).toEqual([
        { id: "c2", name: "LEI12", year: 1 },
      ]);
    });
  });

  describe("deleteSwapRequest", () => {
    it("hard deletes request when authorized", async () => {
      mockRepo.getByIdWithDetails.mockResolvedValue({
        id: "req-1",
        userId: "user-1",
        status: "ACTIVE",
      } as never);

      mockRepo.remove.mockResolvedValueOnce(undefined as never);

      await deleteSwapRequest(normalUser, "req-1", mockRepo);

      expect(mockRepo.remove).toHaveBeenCalledWith("req-1");
    });

    it("throws ForbiddenError when non-admin tries to delete another user's request", async () => {
      mockRepo.getByIdWithDetails.mockResolvedValueOnce({
        id: "req-1",
        userId: "other-user",
      } as never);

      await expect(
        deleteSwapRequest(normalUser, "req-1", mockRepo)
      ).rejects.toThrow(ForbiddenError);
    });

    it("throws ConflictError when attempting to delete a MATCHED request", async () => {
      mockRepo.getByIdWithDetails.mockResolvedValueOnce({
        id: "req-1",
        userId: "user-1",
        status: "MATCHED",
      } as never);

      await expect(
        deleteSwapRequest(normalUser, "req-1", mockRepo)
      ).rejects.toThrow(ConflictError);
    });

    it("throws ConflictError when attempting to delete a request with provisional matches", async () => {
      mockRepo.getByIdWithDetails.mockResolvedValueOnce({
        id: "req-1",
        userId: "user-1",
        status: "ACTIVE",
        provisionalUntil: new Date(),
      } as never);

      await expect(
        deleteSwapRequest(normalUser, "req-1", mockRepo)
      ).rejects.toThrow(ConflictError);
    });
  });
});
