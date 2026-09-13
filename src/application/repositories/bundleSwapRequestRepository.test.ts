import { describe, it, expect, vi } from "vitest";
import prisma from "@/lib/prisma";
import * as bundleSwapRequestRepo from "@/application/repositories/bundleSwapRequestRepository";
import * as classRepo from "@/application/repositories/classRepository";

describe("bundleSwapRequestRepository", () => {
  it("findMany calls prisma.bundleSwapRequest.findMany with where and include", async () => {
    const mock = [{ id: "br-1", userId: "u1" }];
    const spy = vi
      .spyOn(prisma.bundleSwapRequest, "findMany")
      .mockResolvedValueOnce(mock as Awaited<ReturnType<typeof prisma.bundleSwapRequest.findMany>>);

    const result = await bundleSwapRequestRepo.findMany({
      where: { userId: "u1" },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    expect(spy).toHaveBeenCalledWith({
      where: { userId: "u1" },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });
    expect(result).toBe(mock);

    spy.mockRestore();
  });

  it("findFirst calls prisma.bundleSwapRequest.findFirst with where", async () => {
    const mock = { id: "br-1", userId: "u1", status: "ACTIVE" };
    const spy = vi
      .spyOn(prisma.bundleSwapRequest, "findFirst")
      .mockResolvedValueOnce(mock as Awaited<ReturnType<typeof prisma.bundleSwapRequest.findFirst>>);

    const result = await bundleSwapRequestRepo.findFirst({
      userId: "u1",
      currentClassId: "c1",
      status: "ACTIVE",
    });

    expect(spy).toHaveBeenCalledWith({
      where: { userId: "u1", currentClassId: "c1", status: "ACTIVE" },
    });
    expect(result).toBe(mock);

    spy.mockRestore();
  });

  it("findById calls prisma.bundleSwapRequest.findUnique with id and include", async () => {
    // Arrange
    const mock = { id: "br-1", userId: "u1", currentClassId: "c1" };
    const spy = vi
      .spyOn(prisma.bundleSwapRequest, "findUnique")
      .mockResolvedValueOnce(mock as Awaited<ReturnType<typeof prisma.bundleSwapRequest.findUnique>>);

    // Act
    const result = await bundleSwapRequestRepo.findById("br-1", { currentClass: true });

    // Assert
    expect(spy).toHaveBeenCalledWith({
      where: { id: "br-1" },
      include: { currentClass: true },
    });
    expect(result).toBe(mock);

    spy.mockRestore();
  });

  it("create calls prisma.bundleSwapRequest.create with mapped args", async () => {
    // Arrange
    const data = {
      userId: "u1",
      currentClassId: "c1",
      preferredClassIds: ["c2"],
      preferenceOrderMatters: true,
      year: 2,
    };
    const mock = { id: "br-2", ...data };
    
    // We also need to mock classRepo.findManyByIds because the new create uses it
    vi.spyOn(classRepo, "findManyByIds").mockResolvedValueOnce([{ id: "c2", name: "LEI12", year: 1 }] as never);

    const spy = vi
      .spyOn(prisma.bundleSwapRequest, "create")
      .mockResolvedValueOnce(mock as never);

    // Act
    const result = await bundleSwapRequestRepo.create(data);

    // Assert
    expect(spy).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "u1",
        ticketType: "ALL_CLASSES",
        graphPartition: "year-2",
      }),
      include: expect.any(Object),
    });
    expect(result.id).toBe(mock.id);

    spy.mockRestore();
  });

  it("update calls prisma.bundleSwapRequest.update with args", async () => {
    // Arrange
    const args = {
      where: { id: "br-1" },
      data: { status: "CANCELLED" },
    } as const;
    const mock = { id: "br-1", status: "CANCELLED" };
    const spy = vi
      .spyOn(prisma.bundleSwapRequest, "update")
      .mockResolvedValueOnce(mock as Awaited<ReturnType<typeof prisma.bundleSwapRequest.update>>);

    // Act
    const result = await bundleSwapRequestRepo.update(args);

    // Assert
    expect(spy).toHaveBeenCalledWith(args);
    expect(result).toBe(mock);

    spy.mockRestore();
  });

  it("remove calls prisma.bundleSwapRequest.delete with id", async () => {
    // Arrange
    const mock = { id: "br-1", status: "CANCELLED" };
    const spy = vi
      .spyOn(prisma.bundleSwapRequest, "delete")
      .mockResolvedValueOnce(mock as Awaited<ReturnType<typeof prisma.bundleSwapRequest.delete>>);

    // Act
    await bundleSwapRequestRepo.remove("br-1");

    // Assert
    expect(spy).toHaveBeenCalledWith({ where: { id: "br-1" } });

    spy.mockRestore();
  });
});
