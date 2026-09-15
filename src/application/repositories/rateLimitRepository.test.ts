import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import * as rateLimitRepo from "@/application/repositories/rateLimitRepository";

describe("rateLimitRepository", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("upsert", () => {
    it("calls prisma.rateLimitBucket.upsert", async () => {
      const mockResult = { id: "1", key: "k", count: 1, expiresAt: new Date(), createdAt: new Date() };
      const spy = vi.spyOn(prisma.rateLimitBucket, "upsert").mockResolvedValue(mockResult);

      const args = {
        where: { key: "k" },
        update: { count: { increment: 1 } },
        create: { key: "k", count: 1, expiresAt: new Date() },
      };
      const result = await rateLimitRepo.upsert(args);

      expect(spy).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });
  });

  describe("update", () => {
    it("calls prisma.rateLimitBucket.update", async () => {
      const mockResult = { id: "1", key: "k", count: 2, expiresAt: new Date(), createdAt: new Date() };
      const spy = vi.spyOn(prisma.rateLimitBucket, "update").mockResolvedValue(mockResult);

      const args = { where: { key: "k" }, data: { count: { increment: 1 } } };
      const result = await rateLimitRepo.update(args);

      expect(spy).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });
  });

  describe("deleteMany", () => {
    it("calls prisma.rateLimitBucket.deleteMany", async () => {
      const mockResult = { count: 1 };
      const spy = vi.spyOn(prisma.rateLimitBucket, "deleteMany").mockResolvedValue(mockResult);

      const args = { where: { expiresAt: { lte: new Date() } } };
      const result = await rateLimitRepo.deleteMany(args);

      expect(spy).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });
  });

  describe("isUniqueConstraintError", () => {
    it("returns true for P2002 PrismaClientKnownRequestError", () => {
      const error = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "5.x",
      });
      expect(rateLimitRepo.isUniqueConstraintError(error)).toBe(true);
    });

    it("returns false for other PrismaClientKnownRequestError codes", () => {
      const error = new Prisma.PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "5.x",
      });
      expect(rateLimitRepo.isUniqueConstraintError(error)).toBe(false);
    });

    it("returns false for non-Prisma errors", () => {
      const error = new Error("Generic error");
      expect(rateLimitRepo.isUniqueConstraintError(error)).toBe(false);
    });
  });
});
