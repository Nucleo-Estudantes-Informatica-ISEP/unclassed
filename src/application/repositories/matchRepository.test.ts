import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import * as matchRepo from "@/application/repositories/matchRepository";

describe("matchRepository", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("findMany", () => {
    it("calls prisma.match.findMany", async () => {
      const mockResult = [{ id: "test" }];
      const spy = vi.spyOn(prisma.match, "findMany").mockResolvedValue(mockResult as never);

      const args = {};
      const result = await matchRepo.findMany(args);

      expect(spy).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });

    it("calls tx.match.findMany", async () => {
      const mockResult = [{ id: "test" }];
      const mockTx = { match: { findMany: vi.fn().mockResolvedValue(mockResult as never) } } as unknown as Prisma.TransactionClient;

      const args = {};
      const result = await matchRepo.findMany(args, mockTx);

      expect(mockTx.match.findMany).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });
  });

  describe("findUnique", () => {
    it("calls prisma.match.findUnique", async () => {
      const mockResult = { id: "test" };
      const spy = vi.spyOn(prisma.match, "findUnique").mockResolvedValue(mockResult as never);

      const args = { where: { id: "m1" } };
      const result = await matchRepo.findUnique(args);

      expect(spy).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });

    it("calls tx.match.findUnique", async () => {
      const mockResult = { id: "test" };
      const mockTx = { match: { findUnique: vi.fn().mockResolvedValue(mockResult as never) } } as unknown as Prisma.TransactionClient;

      const args = { where: { id: "m1" } };
      const result = await matchRepo.findUnique(args, mockTx);

      expect(mockTx.match.findUnique).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });
  });

  describe("findUniqueOrThrow", () => {
    it("calls prisma.match.findUniqueOrThrow", async () => {
      const mockResult = { id: "test" };
      const spy = vi.spyOn(prisma.match, "findUniqueOrThrow").mockResolvedValue(mockResult as never);

      const args = { where: { id: "m1" } };
      const result = await matchRepo.findUniqueOrThrow(args);

      expect(spy).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });

    it("calls tx.match.findUniqueOrThrow", async () => {
      const mockResult = { id: "test" };
      const mockTx = { match: { findUniqueOrThrow: vi.fn().mockResolvedValue(mockResult as never) } } as unknown as Prisma.TransactionClient;

      const args = { where: { id: "m1" } };
      const result = await matchRepo.findUniqueOrThrow(args, mockTx);

      expect(mockTx.match.findUniqueOrThrow).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });
  });

  describe("create", () => {
    it("calls prisma.match.create", async () => {
      const mockResult = { id: "test" };
      const spy = vi.spyOn(prisma.match, "create").mockResolvedValue(mockResult as never);

      const args = { data: { studentId: "u1", id: "m1", status: "PENDING" as const, createdAt: new Date(), updatedAt: new Date(), requestIds: [], currentClassId: null, targetClassId: null, expiresAt: null, partitionKey: "p1" } } as unknown as Parameters<typeof matchRepo.create>[0];
      const result = await matchRepo.create(args);

      expect(spy).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });

    it("calls tx.match.create", async () => {
      const mockResult = { id: "test" };
      const mockTx = { match: { create: vi.fn().mockResolvedValue(mockResult as never) } } as unknown as Prisma.TransactionClient;

      const args = { data: { studentId: "u1", id: "m1", status: "PENDING" as const, createdAt: new Date(), updatedAt: new Date(), requestIds: [], currentClassId: null, targetClassId: null, expiresAt: null, partitionKey: "p1" } } as unknown as Parameters<typeof matchRepo.create>[0];
      const result = await matchRepo.create(args, mockTx);

      expect(mockTx.match.create).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });
  });

  describe("updateMany", () => {
    it("calls prisma.match.updateMany", async () => {
      const mockResult = { count: 1 };
      const spy = vi.spyOn(prisma.match, "updateMany").mockResolvedValue(mockResult as never);

      const args = { data: { status: "ACCEPTED" as const } };
      const result = await matchRepo.updateMany(args);

      expect(spy).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });

    it("calls tx.match.updateMany", async () => {
      const mockResult = { count: 1 };
      const mockTx = { match: { updateMany: vi.fn().mockResolvedValue(mockResult as never) } } as unknown as Prisma.TransactionClient;

      const args = { data: { status: "ACCEPTED" as const } };
      const result = await matchRepo.updateMany(args, mockTx);

      expect(mockTx.match.updateMany).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });
  });

  describe("update", () => {
    it("calls prisma.match.update", async () => {
      const mockResult = { id: "test" };
      const spy = vi.spyOn(prisma.match, "update").mockResolvedValue(mockResult as never);

      const args = { where: { id: "m1" }, data: { status: "ACCEPTED" as const } };
      const result = await matchRepo.update(args);

      expect(spy).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });

    it("calls tx.match.update", async () => {
      const mockResult = { id: "test" };
      const mockTx = { match: { update: vi.fn().mockResolvedValue(mockResult as never) } } as unknown as Prisma.TransactionClient;

      const args = { where: { id: "m1" }, data: { status: "ACCEPTED" as const } };
      const result = await matchRepo.update(args, mockTx);

      expect(mockTx.match.update).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });
  });

  describe("count", () => {
    it("calls prisma.match.count", async () => {
      const mockResult = 1;
      const spy = vi.spyOn(prisma.match, "count").mockResolvedValue(mockResult as never);

      const args = {};
      const result = await matchRepo.count(args);

      expect(spy).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });

    it("calls tx.match.count", async () => {
      const mockResult = 1;
      const mockTx = { match: { count: vi.fn().mockResolvedValue(mockResult as never) } } as unknown as Prisma.TransactionClient;

      const args = {};
      const result = await matchRepo.count(args, mockTx);

      expect(mockTx.match.count).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });
  });

  describe("deleteMany", () => {
    it("calls prisma.match.deleteMany", async () => {
      const mockResult = { count: 1 };
      const spy = vi.spyOn(prisma.match, "deleteMany").mockResolvedValue(mockResult as never);

      const args = { where: { studentId: "u1" } } as unknown as Parameters<typeof matchRepo.deleteMany>[0];
      const result = await matchRepo.deleteMany(args);

      expect(spy).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });

    it("calls tx.match.deleteMany", async () => {
      const mockResult = { count: 1 };
      const mockTx = { match: { deleteMany: vi.fn().mockResolvedValue(mockResult as never) } } as unknown as Prisma.TransactionClient;

      const args = { where: { studentId: "u1" } } as unknown as Parameters<typeof matchRepo.deleteMany>[0];
      const result = await matchRepo.deleteMany(args, mockTx);

      expect(mockTx.match.deleteMany).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });
  });

  describe("aggregateRaw", () => {
    it("calls prisma.match.aggregateRaw", async () => {
      const mockResult = { count: 1 };
      const spy = vi.spyOn(prisma.match, "aggregateRaw").mockResolvedValue(mockResult as never);

      const args = { pipeline: [] };
      const result = await matchRepo.aggregateRaw(args);

      expect(spy).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });

    it("calls tx.match.aggregateRaw", async () => {
      const mockResult = { count: 1 };
      const mockTx = { match: { aggregateRaw: vi.fn().mockResolvedValue(mockResult as never) } } as unknown as Prisma.TransactionClient;

      const args = { pipeline: [] };
      const result = await matchRepo.aggregateRaw(args, mockTx);

      expect(mockTx.match.aggregateRaw).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });
  });
});
