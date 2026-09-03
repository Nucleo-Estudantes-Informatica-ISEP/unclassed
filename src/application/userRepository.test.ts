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
});
