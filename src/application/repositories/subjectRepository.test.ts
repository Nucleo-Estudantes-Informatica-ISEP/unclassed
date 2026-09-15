import { describe, it, expect, vi } from "vitest";
import prisma from "@/lib/prisma";
import { findSubjects } from "@/application/repositories/subjectRepository";

describe("subjectRepository", () => {
  it("findSubjects builds where clause and calls prisma.subject.findMany (AAA)", async () => {
    // Arrange
    const mockSubjects = [
      { id: "s1", code: "CS101", year: 2, semester: 1 },
    ];
    const spy = vi
      .spyOn(prisma.subject, "findMany")
      .mockResolvedValueOnce(mockSubjects as Awaited<ReturnType<typeof prisma.subject.findMany>>);

    // Act
    const result = await findSubjects({ year: 2, semester: 1 });

    // Assert
    expect(spy).toHaveBeenCalled();
    const callArg = spy.mock.calls[0]?.[0];
    expect(callArg).toBeDefined();
    expect(callArg?.where).toMatchObject({ year: 2, semester: 1 });
    expect(result).toBe(mockSubjects);

    spy.mockRestore();
  });

  it("findById calls prisma.subject.findUnique and returns value", async () => {
    // Arrange
    const mock = { id: "s1", name: "Algoritmos" };
    const spy = vi
      .spyOn(prisma.subject, "findUnique")
      .mockResolvedValueOnce(mock as Awaited<ReturnType<typeof prisma.subject.findUnique>>);

    // Act
    const result = await import("@/application/repositories/subjectRepository").then((m) => m.findById("s1"));

    // Assert
    expect(spy).toHaveBeenCalledWith({ where: { id: "s1" } });
    expect(result).toBe(mock);

    spy.mockRestore();
  });

  it("findByCode calls prisma.subject.findUnique with code and returns value", async () => {
    // Arrange
    const mock = { id: "s2", code: "ALGAN", name: "Algebra" };
    const spy = vi
      .spyOn(prisma.subject, "findUnique")
      .mockResolvedValueOnce(mock as Awaited<ReturnType<typeof prisma.subject.findUnique>>);

    // Act
    const result = await import("@/application/repositories/subjectRepository").then((m) => m.findByCode("ALGAN"));

    // Assert
    expect(spy).toHaveBeenCalledWith({ where: { code: "ALGAN" } });
    expect(result).toBe(mock);

    spy.mockRestore();
  });

  it("findManyByIds returns empty array without calling prisma when ids empty", async () => {
    // Arrange
    const spy = vi.spyOn(prisma.subject, "findMany");

    // Act
    const result = await import("@/application/repositories/subjectRepository").then((m) => m.findManyByIds([]));

    // Assert
    expect(spy).not.toHaveBeenCalled();
    expect(result).toEqual([]);

    spy.mockRestore();
  });

  it("findManyByIds calls prisma.subject.findMany with ids and returns selection", async () => {
    // Arrange
    const mock = [{ id: "s1", name: "Algoritmos" }];
    const spy = vi
      .spyOn(prisma.subject, "findMany")
      .mockResolvedValueOnce(mock as Awaited<ReturnType<typeof prisma.subject.findMany>>);

    // Act
    const result = await import("@/application/repositories/subjectRepository").then((m) => m.findManyByIds(["s1"]));

    // Assert
    expect(spy).toHaveBeenCalledWith({ where: { id: { in: ["s1"] } }, select: { id: true, name: true } });
    expect(result).toBe(mock);

    spy.mockRestore();
  });
});
