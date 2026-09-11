import { describe, it, expect, vi } from "vitest";
import prisma from "@/lib/prisma";
import * as singleSwapRequestRepo from "@/application/repositories/singleSwapRequestRepository";
import * as classRepo from "@/application/repositories/classRepository";

describe("singleSwapRequestRepository", () => {
  it("findMany calls prisma.singleSwapRequest.findMany with where and include", async () => {
    // Arrange
    const mock = [{ id: "sr-1", userId: "u1" }];
    const spy = vi
      .spyOn(prisma.singleSwapRequest, "findMany")
      .mockResolvedValueOnce(mock as Awaited<ReturnType<typeof prisma.singleSwapRequest.findMany>>);

    // Act
    const result = await singleSwapRequestRepo.findMany({
      where: { userId: "u1" },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    // Assert
    expect(spy).toHaveBeenCalledWith({
      where: { userId: "u1" },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });
    expect(result).toBe(mock);

    spy.mockRestore();
  });

  it("findById calls prisma.singleSwapRequest.findUnique with id and include", async () => {
    // Arrange
    const mock = { id: "sr-1", userId: "u1" };
    const spy = vi
      .spyOn(prisma.singleSwapRequest, "findUnique")
      .mockResolvedValueOnce(mock as Awaited<ReturnType<typeof prisma.singleSwapRequest.findUnique>>);

    // Act
    const result = await singleSwapRequestRepo.findById("sr-1", { user: true });

    // Assert
    expect(spy).toHaveBeenCalledWith({ where: { id: "sr-1" }, include: { user: true } });
    expect(result).toBe(mock);

    spy.mockRestore();
  });

  it("findFirst calls prisma.singleSwapRequest.findFirst with where", async () => {
    // Arrange
    const mock = { id: "sr-1", userId: "u1", status: "ACTIVE" };
    const spy = vi
      .spyOn(prisma.singleSwapRequest, "findFirst")
      .mockResolvedValueOnce(mock as Awaited<ReturnType<typeof prisma.singleSwapRequest.findFirst>>);

    // Act
    const result = await singleSwapRequestRepo.findFirst({
      userId: "u1",
      subjectId: "s1",
      status: "ACTIVE",
    });

    // Assert
    expect(spy).toHaveBeenCalledWith({
      where: { userId: "u1", subjectId: "s1", status: "ACTIVE" },
    });
    expect(result).toBe(mock);

    spy.mockRestore();
  });

  it("create calls prisma.singleSwapRequest.create with mapped args", async () => {
    // Arrange
    const data = {
      userId: "u1",
      subjectId: "s1",
      currentClassId: "c1",
      preferredClassIds: ["c2"],
      preferenceOrderMatters: true,
    };
    const mock = { id: "sr-2", ...data };
    
    // We also need to mock classRepo.findManyByIds because the new create uses it
    vi.spyOn(classRepo, "findManyByIds").mockResolvedValueOnce([{ id: "c2", name: "LEI12", year: 1 }] as never);

    const spy = vi
      .spyOn(prisma.singleSwapRequest, "create")
      .mockResolvedValueOnce(mock as never);

    // Act
    const result = await singleSwapRequestRepo.create(data);

    // Assert
    expect(spy).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "u1",
        subjectId: "s1",
        ticketType: "SPECIFIC_CLASS",
      }),
      include: expect.any(Object),
    });
    expect(result.id).toBe(mock.id);

    spy.mockRestore();
  });

  it("update calls prisma.singleSwapRequest.update with args", async () => {
    // Arrange
    const args = {
      where: { id: "sr-1" },
      data: { status: "CANCELLED" },
    } as const;
    const mock = { id: "sr-1", status: "CANCELLED" };
    const spy = vi
      .spyOn(prisma.singleSwapRequest, "update")
      .mockResolvedValueOnce(mock as Awaited<ReturnType<typeof prisma.singleSwapRequest.update>>);

    // Act
    const result = await singleSwapRequestRepo.update(args);

    // Assert
    expect(spy).toHaveBeenCalledWith(args);
    expect(result).toBe(mock);

    spy.mockRestore();
  });

  it("remove calls prisma.singleSwapRequest.delete with id", async () => {
    // Arrange
    const mock = { id: "sr-1", status: "CANCELLED" };
    const spy = vi
      .spyOn(prisma.singleSwapRequest, "delete")
      .mockResolvedValueOnce(mock as Awaited<ReturnType<typeof prisma.singleSwapRequest.delete>>);

    // Act
    await singleSwapRequestRepo.remove("sr-1");

    // Assert
    expect(spy).toHaveBeenCalledWith({ where: { id: "sr-1" } });

    spy.mockRestore();
  });
});
