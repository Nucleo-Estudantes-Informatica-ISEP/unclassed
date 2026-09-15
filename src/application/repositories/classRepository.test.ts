import { describe, it, expect, vi } from "vitest";
import prisma from "@/lib/prisma";
import * as classRepo from "@/application/repositories/classRepository";

describe("classRepository", () => {
  it("findClasses builds where clause and calls prisma.class.findMany (AAA)", async () => {
    // Arrange
    const mock = [{ id: "c1", name: "Turma A", year: 2024 }];
    const spy = vi
      .spyOn(prisma.class, "findMany")
      .mockResolvedValueOnce(mock as Awaited<ReturnType<typeof prisma.class.findMany>>);

    // Act
    const res = await classRepo.findClasses({ year: 2024 });

    // Assert
    expect(spy).toHaveBeenCalled();
    const arg = spy.mock.calls[0]?.[0];
    expect(arg).toBeDefined();
    expect(arg?.where).toMatchObject({ year: 2024 });
    expect(res).toBe(mock);

    spy.mockRestore();
  });

  it("findById calls prisma.class.findUnique and returns value", async () => {
    // Arrange
    const mock = { id: "c1", name: "Turma A" };
    const spy = vi
      .spyOn(prisma.class, "findUnique")
      .mockResolvedValueOnce(mock as Awaited<ReturnType<typeof prisma.class.findUnique>>);

    // Act
    const res = await classRepo.findById("c1");

    // Assert
    expect(spy).toHaveBeenCalledWith({ where: { id: "c1" } });
    expect(res).toBe(mock);

    spy.mockRestore();
  });

  it("findManyByIds returns empty array without calling prisma when ids empty", async () => {
    // Arrange
    const spy = vi.spyOn(prisma.class, "findMany");

    // Act
    const res = await classRepo.findManyByIds([]);

    // Assert
    expect(spy).not.toHaveBeenCalled();
    expect(res).toEqual([]);

    spy.mockRestore();
  });

  it("findManyByIds calls prisma.class.findMany with ids and returns selection", async () => {
    // Arrange
    const mock = [{ id: "c1", name: "Turma A" }];
    const spy = vi
      .spyOn(prisma.class, "findMany")
      .mockResolvedValueOnce(mock as Awaited<ReturnType<typeof prisma.class.findMany>>);

    // Act
    const res = await classRepo.findManyByIds(["c1"]);

    // Assert
    expect(spy).toHaveBeenCalledWith({ where: { id: { in: ["c1"] } }, select: { id: true, name: true, year: true } });
    expect(res).toBe(mock);

    spy.mockRestore();
  });

  it("findByNames returns empty array without calling prisma when names empty", async () => {
    // Arrange
    const spy = vi.spyOn(prisma.class, "findMany");

    // Act
    const res = await classRepo.findByNames([]);

    // Assert
    expect(spy).not.toHaveBeenCalled();
    expect(res).toEqual([]);

    spy.mockRestore();
  });

  it("findByNames calls prisma.class.findMany with names and returns value", async () => {
    // Arrange
    const mock = [{ id: "c1", name: "Turma A" }];
    const spy = vi
      .spyOn(prisma.class, "findMany")
      .mockResolvedValueOnce(mock as Awaited<ReturnType<typeof prisma.class.findMany>>);

    // Act
    const res = await classRepo.findByNames(["Turma A"]);

    // Assert
    expect(spy).toHaveBeenCalledWith({ where: { name: { in: ["Turma A"] } } });
    expect(res).toBe(mock);

    spy.mockRestore();
  });
});
