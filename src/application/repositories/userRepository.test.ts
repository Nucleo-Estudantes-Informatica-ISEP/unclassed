import { describe, expect, it, vi } from "vitest";

import prisma from "@/lib/prisma";
import * as userRepo from "@/application/repositories/userRepository";

describe("userRepository", () => {
  it("findManyByIds returns empty array without calling prisma when ids empty", async () => {
    // Arrange
    const spy = vi.spyOn(prisma.user, "findMany");

    // Act
    const result = await userRepo.findManyByIds([]);

    // Assert
    expect(spy).not.toHaveBeenCalled();
    expect(result).toEqual([]);

    spy.mockRestore();
  });

  it("findManyByIds calls prisma.user.findMany with ids and returns selection", async () => {
    // Arrange
    const mock = [{ id: "u1", name: "Ana", email: "ana@example.com" }];
    const spy = vi
      .spyOn(prisma.user, "findMany")
      .mockResolvedValueOnce(mock as Awaited<ReturnType<typeof prisma.user.findMany>>);

    // Act
    const result = await userRepo.findManyByIds(["u1"]);

    // Assert
    expect(spy).toHaveBeenCalledWith({
      where: { id: { in: ["u1"] } },
      select: { id: true, name: true, email: true },
    });
    expect(result).toBe(mock);

    spy.mockRestore();
  });

  describe("methods with tx support", () => {
    describe("findFirst", () => {
      it("calls prisma.user.findFirst when no tx is provided", async () => {
        const mockResult = { id: "u1" };
        const spy = vi.spyOn(prisma.user, "findFirst").mockResolvedValue(mockResult as never);

        const args = { where: { id: "u1" } };
        const result = await userRepo.findFirst(args);

        expect(spy).toHaveBeenCalledWith(args);
        expect(result).toEqual(mockResult);
      });

      it("calls tx.user.findFirst when tx is provided", async () => {
        const mockResult = { id: "u1" };
        const mockTx = {
          user: {
            findFirst: vi.fn().mockResolvedValue(mockResult as never),
          },
        } as unknown as import("@prisma/client").Prisma.TransactionClient;

        const args = { where: { id: "u1" } };
        const result = await userRepo.findFirst(args, mockTx);

        expect(mockTx.user.findFirst).toHaveBeenCalledWith(args);
        expect(result).toEqual(mockResult);
      });
    });

    describe("create", () => {
      it("calls prisma.user.create when no tx is provided", async () => {
        const mockResult = { id: "u1" };
        const spy = vi.spyOn(prisma.user, "create").mockResolvedValue(mockResult as never);

        const args = { data: { email: "test@example.com", name: "Test", authProviderId: "auth1" } } as unknown as Parameters<typeof userRepo.create>[0];
        const result = await userRepo.create(args);

        expect(spy).toHaveBeenCalledWith(args);
        expect(result).toEqual(mockResult);
      });

      it("calls tx.user.create when tx is provided", async () => {
        const mockResult = { id: "u1" };
        const mockTx = {
          user: {
            create: vi.fn().mockResolvedValue(mockResult as never),
          },
        } as unknown as import("@prisma/client").Prisma.TransactionClient;

        const args = { data: { email: "test@example.com", name: "Test", authProviderId: "auth1" } } as unknown as Parameters<typeof userRepo.create>[0];
        const result = await userRepo.create(args, mockTx);

        expect(mockTx.user.create).toHaveBeenCalledWith(args);
        expect(result).toEqual(mockResult);
      });
    });

    describe("update", () => {
      it("calls prisma.user.update when no tx is provided", async () => {
        const mockResult = { id: "u1" };
        const spy = vi.spyOn(prisma.user, "update").mockResolvedValue(mockResult as never);

        const args = { where: { id: "u1" }, data: { name: "Test" } };
        const result = await userRepo.update(args);

        expect(spy).toHaveBeenCalledWith(args);
        expect(result).toEqual(mockResult);
      });

      it("calls tx.user.update when tx is provided", async () => {
        const mockResult = { id: "u1" };
        const mockTx = {
          user: {
            update: vi.fn().mockResolvedValue(mockResult as never),
          },
        } as unknown as import("@prisma/client").Prisma.TransactionClient;

        const args = { where: { id: "u1" }, data: { name: "Test" } };
        const result = await userRepo.update(args, mockTx);

        expect(mockTx.user.update).toHaveBeenCalledWith(args);
        expect(result).toEqual(mockResult);
      });
    });
  });
});
