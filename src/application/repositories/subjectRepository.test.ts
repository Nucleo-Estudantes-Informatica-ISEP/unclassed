import { describe, it, expect, vi } from "vitest";
import prisma from "@/lib/prisma";
import { findSubjects, isInUse } from "@/application/repositories/subjectRepository";

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

  it("create calls prisma.subject.create", async () => {
    const mock = { id: "s1", code: "ALGAN", name: "Algebra", year: 1, semester: 1 };
    const spy = vi
      .spyOn(prisma.subject, "create")
      .mockResolvedValueOnce(mock as never);

    const args = { data: { code: "ALGAN", name: "Algebra", year: 1, semester: 1 } };
    const res = await import("@/application/repositories/subjectRepository").then((m) => m.create(args));

    expect(spy).toHaveBeenCalledWith(args);
    expect(res).toBe(mock);

    spy.mockRestore();
  });

  it("update calls prisma.subject.update", async () => {
  const mock = {
    id: "s1",
    code: "ALGAN",
    name: "Álgebra",
    year: 1,
    semester: 1,
  };
  const spy = vi
    .spyOn(prisma.subject, "update")
    .mockResolvedValueOnce(mock as never);

  const args = {
    where: { id: "s1" },
    data: { name: "Álgebra" },
  };
  const res = await import(
    "@/application/repositories/subjectRepository"
  ).then((m) => m.update(args));

  expect(spy).toHaveBeenCalledWith(args);
  expect(res).toBe(mock);

  spy.mockRestore();
});

it("remove calls prisma.subject.delete", async () => {
  const mock = {
    id: "s1",
    code: "ALGAN",
    name: "Álgebra",
    year: 1,
    semester: 1,
  };
  const spy = vi
    .spyOn(prisma.subject, "delete")
    .mockResolvedValueOnce(mock as never);

  const args = { where: { id: "s1" } };
  const res = await import(
    "@/application/repositories/subjectRepository"
  ).then((m) => m.remove(args));

  expect(spy).toHaveBeenCalledWith(args);
  expect(res).toBe(mock);

  spy.mockRestore();
});

  it("deleteMany calls prisma.subject.deleteMany", async () => {
    const mock = { count: 1 };
    const spy = vi
      .spyOn(prisma.subject, "deleteMany")
      .mockResolvedValueOnce(mock as never);

    const res = await import("@/application/repositories/subjectRepository").then((m) => m.deleteMany());

    expect(spy).toHaveBeenCalledWith({});
    expect(res).toBe(mock);

    spy.mockRestore();
  });

  describe("isInUse", () => {
    function mockCounts(requests: number, partitions: number, matches: number) {
      vi.spyOn(prisma.singleSwapRequest, "count").mockResolvedValueOnce(requests);
      vi.spyOn(prisma.graphPartition, "count").mockResolvedValueOnce(partitions);
      vi.spyOn(prisma.match, "count").mockResolvedValueOnce(matches);
    }

    it("is false when nothing references the subject", async () => {
      mockCounts(0, 0, 0);
      expect(await isInUse("64b7f0c2a1b2c3d4e5f60789")).toBe(false);
    });

    it.each([
      ["a swap request", [1, 0, 0]],
      ["a graph partition that outlives its requests", [0, 1, 0]],
      ["a match on the subject partition", [0, 0, 1]],
    ] as const)("is true when %s references the subject", async (_label, counts) => {
      mockCounts(counts[0], counts[1], counts[2]);
      expect(await isInUse("64b7f0c2a1b2c3d4e5f60789")).toBe(true);
    });

    it("queries the subject partition key for matches", async () => {
      mockCounts(0, 0, 0);
      await isInUse("64b7f0c2a1b2c3d4e5f60789");
      expect(prisma.match.count).toHaveBeenCalledWith({
        where: { graphPartition: "subject-64b7f0c2a1b2c3d4e5f60789" },
      });
    });
  });
});
