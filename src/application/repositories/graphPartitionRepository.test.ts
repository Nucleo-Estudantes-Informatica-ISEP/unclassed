import { describe, expect, it, vi, beforeEach } from "vitest";

import prisma from "@/lib/prisma";
import * as graphPartitionRepo from "@/application/repositories/graphPartitionRepository";

describe("graphPartitionRepository", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("findUnique", () => {
    it("calls prisma.graphPartition.findUnique", async () => {
      const mockResult = { id: "test" };
      const spy = vi.spyOn(prisma.graphPartition, "findUnique").mockResolvedValue(mockResult as never);

      const args = { where: { id: "p1" } };
      const result = await graphPartitionRepo.findUnique(args);

      expect(spy).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });
  });

  describe("findMany", () => {
    it("calls prisma.graphPartition.findMany", async () => {
      const mockResult = [{ id: "test" }];
      const spy = vi.spyOn(prisma.graphPartition, "findMany").mockResolvedValue(mockResult as never);

      const args = {};
      const result = await graphPartitionRepo.findMany(args);

      expect(spy).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });
  });

  describe("create", () => {
    it("calls prisma.graphPartition.create", async () => {
      const mockResult = { id: "test" };
      const spy = vi.spyOn(prisma.graphPartition, "create").mockResolvedValue(mockResult as never);

      const args = { data: { id: "p1" } } as unknown as Parameters<typeof graphPartitionRepo.create>[0];
      const result = await graphPartitionRepo.create(args);

      expect(spy).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });
  });

  describe("update", () => {
    it("calls prisma.graphPartition.update", async () => {
      const mockResult = { id: "test" };
      const spy = vi.spyOn(prisma.graphPartition, "update").mockResolvedValue(mockResult as never);

      const args = { where: { id: "p1" }, data: { isDirty: true } };
      const result = await graphPartitionRepo.update(args);

      expect(spy).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });
  });

  describe("updateMany", () => {
    it("calls prisma.graphPartition.updateMany", async () => {
      const mockResult = { count: 1 };
      const spy = vi.spyOn(prisma.graphPartition, "updateMany").mockResolvedValue(mockResult as never);

      const args = { data: { isDirty: false } };
      const result = await graphPartitionRepo.updateMany(args);

      expect(spy).toHaveBeenCalledWith(args);
      expect(result).toEqual(mockResult);
    });
  });
});
