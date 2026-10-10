import { describe, expect, it, vi } from "vitest";

import prisma from "@/lib/prisma";
import * as classRepo from "@/application/repositories/classRepository";

describe("classRepository", () => {
  it("findClasses builds where clause and calls prisma.class.findMany (AAA)", async () => {
    // Arrange
    const mock = [{ id: "c1", name: "Turma A", year: 2024 }];
    const spy = vi
      .spyOn(prisma.class, "findMany")
      .mockResolvedValueOnce(
        mock as Awaited<ReturnType<typeof prisma.class.findMany>>
      );

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
      .mockResolvedValueOnce(
        mock as Awaited<ReturnType<typeof prisma.class.findUnique>>
      );

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
      .mockResolvedValueOnce(
        mock as Awaited<ReturnType<typeof prisma.class.findMany>>
      );

    // Act
    const res = await classRepo.findManyByIds(["c1"]);

    // Assert
    expect(spy).toHaveBeenCalledWith({
      where: { id: { in: ["c1"] } },
      select: { id: true, name: true, year: true },
    });
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
      .mockResolvedValueOnce(
        mock as Awaited<ReturnType<typeof prisma.class.findMany>>
      );

    // Act
    const res = await classRepo.findByNames(["Turma A"]);

    // Assert
    expect(spy).toHaveBeenCalledWith({ where: { name: { in: ["Turma A"] } } });
    expect(res).toBe(mock);

    spy.mockRestore();
  });

  it("create calls prisma.class.create", async () => {
    const mock = { id: "c1", name: "1DA", year: 1 };
    const spy = vi
      .spyOn(prisma.class, "create")
      .mockResolvedValueOnce(mock as never);

    const args = { data: { name: "1DA", year: 1 } };
    const res = await classRepo.create(args);

    expect(spy).toHaveBeenCalledWith(args);
    expect(res).toBe(mock);

    spy.mockRestore();
  });

  it("update calls prisma.class.update", async () => {
    const mock = { id: "c1", name: "1DA", year: 1 };
    const spy = vi
      .spyOn(prisma.class, "update")
      .mockResolvedValueOnce(mock as never);

    const args = {
      where: { id: "c1" },
      data: { name: "1DB" },
    };
    const res = await classRepo.update(args);

    expect(spy).toHaveBeenCalledWith(args);
    expect(res).toBe(mock);

    spy.mockRestore();
  });

  it("remove calls prisma.class.delete", async () => {
    const mock = { id: "c1", name: "1DA", year: 1 };
    const spy = vi
      .spyOn(prisma.class, "delete")
      .mockResolvedValueOnce(mock as never);

    const args = { where: { id: "c1" } };
    const res = await classRepo.remove(args);

    expect(spy).toHaveBeenCalledWith(args);
    expect(res).toBe(mock);

    spy.mockRestore();
  });

    it("isInUse detects a Match referencing the class", async () => {
    const classId = "class-1";

    const classSpy = vi
      .spyOn(prisma.class, "findUnique")
      .mockResolvedValueOnce({
        id: classId,
        name: "1DA",
        year: 1,
      } as never);

    const singleSpy = vi
      .spyOn(prisma.singleSwapRequest, "count")
      .mockResolvedValueOnce(0);

    const bundleSpy = vi
      .spyOn(prisma.bundleSwapRequest, "count")
      .mockResolvedValueOnce(0);

    const matchSpy = vi
      .spyOn(prisma.match, "aggregateRaw")
      .mockResolvedValueOnce([{ _id: "match-1" }] as never);

    try {
      expect(await classRepo.isInUse(classId)).toBe(true);

      expect(matchSpy).toHaveBeenCalledWith({
        pipeline: [
          {
            $match: {
              participants: {
                $elemMatch: {
                  $or: [
                    { fromClass: { $in: [classId, "1DA"] } },
                    { toClass: { $in: [classId, "1DA"] } },
                  ],
                },
              },
            },
          },
          { $limit: 1 },
          { $project: { _id: 1 } },
        ],
      });

      expect(classSpy).toHaveBeenCalledOnce();
      expect(singleSpy).toHaveBeenCalledOnce();
      expect(bundleSpy).toHaveBeenCalledOnce();
    } finally {
      classSpy.mockRestore();
      singleSpy.mockRestore();
      bundleSpy.mockRestore();
      matchSpy.mockRestore();
    }
  });

  it("isInUse returns false when the class has no requests or matches", async () => {
    const classSpy = vi
      .spyOn(prisma.class, "findUnique")
      .mockResolvedValueOnce({ id: "class-1", name: "1DA", year: 1 } as never);

    const singleSpy = vi
      .spyOn(prisma.singleSwapRequest, "count")
      .mockResolvedValueOnce(0);

    const bundleSpy = vi
      .spyOn(prisma.bundleSwapRequest, "count")
      .mockResolvedValueOnce(0);

    const matchSpy = vi
      .spyOn(prisma.match, "aggregateRaw")
      .mockResolvedValueOnce([] as never);

    try {
      expect(await classRepo.isInUse("class-1")).toBe(false);
    } finally {
      classSpy.mockRestore();
      singleSpy.mockRestore();
      bundleSpy.mockRestore();
      matchSpy.mockRestore();
    }
  });

  it("normalizes class names before creating them", async () => {
    const spy = vi
      .spyOn(prisma.class, "create")
      .mockResolvedValueOnce({ id: "c1", name: "1DA", year: 1 } as never);

    try {
      await classRepo.create({
        data: { name: " 1da ", year: 1 },
      });

      expect(spy).toHaveBeenCalledWith({
        data: { name: "1DA", year: 1 },
      });
    } finally {
      spy.mockRestore();
    }
  });

  it("normalizes class names before updating them", async () => {
    const spy = vi
      .spyOn(prisma.class, "update")
      .mockResolvedValueOnce({ id: "c1", name: "1DB", year: 1 } as never);

    try {
      await classRepo.update({
        where: { id: "c1" },
        data: { name: " 1db " },
      });

      expect(spy).toHaveBeenCalledWith({
        where: { id: "c1" },
        data: { name: "1DB" },
      });
    } finally {
      spy.mockRestore();
    }
  });

  it("deleteMany calls prisma.class.deleteMany", async () => {
    const mock = { count: 1 };
    const spy = vi
      .spyOn(prisma.class, "deleteMany")
      .mockResolvedValueOnce(mock as never);

    const res = await classRepo.deleteMany();

    expect(spy).toHaveBeenCalledWith({});
    expect(res).toBe(mock);

    spy.mockRestore();
  });
});
