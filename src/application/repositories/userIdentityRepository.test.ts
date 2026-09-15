import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import * as userIdentityRepo from "@/application/repositories/userIdentityRepository";

describe("userIdentityRepository", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("findUnique", () => {
    it("calls prisma.userIdentity.findUnique when no tx is provided", async () => {
      const mockResult = { provider: "test", providerSubject: "sub", userId: "u1" };
      const spy = vi.spyOn(prisma.userIdentity, "findUnique").mockResolvedValue(mockResult as never);

      const args = { where: { provider_providerSubject: { provider: "test", providerSubject: "sub" } } };
      const result = await userIdentityRepo.findUnique(args);

      expect(spy).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });

    it("calls tx.userIdentity.findUnique when tx is provided", async () => {
      const mockResult = { provider: "test", providerSubject: "sub", userId: "u1" };
      const mockTx = {
        userIdentity: {
          findUnique: vi.fn().mockResolvedValue(mockResult as never),
        },
      } as unknown as Prisma.TransactionClient;

      const args = { where: { provider_providerSubject: { provider: "test", providerSubject: "sub" } } };
      const result = await userIdentityRepo.findUnique(args, mockTx);

      expect(mockTx.userIdentity.findUnique).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });
  });

  describe("create", () => {
    it("calls prisma.userIdentity.create when no tx is provided", async () => {
      const mockResult = { provider: "test", providerSubject: "sub", userId: "u1" };
      const spy = vi.spyOn(prisma.userIdentity, "create").mockResolvedValue(mockResult as never);

      const args = { data: { provider: "test", providerSubject: "sub", userId: "u1" } };
      const result = await userIdentityRepo.create(args);

      expect(spy).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });

    it("calls tx.userIdentity.create when tx is provided", async () => {
      const mockResult = { provider: "test", providerSubject: "sub", userId: "u1" };
      const mockTx = {
        userIdentity: {
          create: vi.fn().mockResolvedValue(mockResult as never),
        },
      } as unknown as Prisma.TransactionClient;

      const args = { data: { provider: "test", providerSubject: "sub", userId: "u1" } };
      const result = await userIdentityRepo.create(args, mockTx);

      expect(mockTx.userIdentity.create).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });
  });
});
