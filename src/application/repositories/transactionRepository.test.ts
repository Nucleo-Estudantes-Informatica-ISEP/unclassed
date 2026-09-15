import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import * as txRepo from "@/application/repositories/transactionRepository";

describe("transactionRepository", () => {
  it("executeInTransaction calls prisma.$transaction with the callback", async () => {
    // Arrange
    const mockTx = {} as Prisma.TransactionClient;
    const spy = vi
      .spyOn(prisma, "$transaction")
      .mockImplementationOnce(async (cb: Parameters<typeof prisma.$transaction>[0]) => {
        return (cb as (tx: Prisma.TransactionClient) => Promise<unknown>)(mockTx);
      });

    const callback = vi.fn().mockResolvedValue("result");

    // Act
    const result = await txRepo.executeInTransaction(callback);

    // Assert
    expect(spy).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(mockTx);
    expect(result).toBe("result");

    spy.mockRestore();
  });

  it("executeInTransaction propagates errors from the callback", async () => {
    // Arrange
    const error = new Error("Transaction failed");
    const spy = vi
      .spyOn(prisma, "$transaction")
      .mockImplementationOnce(async (cb: Parameters<typeof prisma.$transaction>[0]) => {
        return (cb as (tx: Prisma.TransactionClient) => Promise<unknown>)({} as Prisma.TransactionClient);
      });

    const callback = vi.fn().mockRejectedValue(error);

    // Act & Assert
    await expect(txRepo.executeInTransaction(callback)).rejects.toThrow("Transaction failed");

    spy.mockRestore();
  });
});
