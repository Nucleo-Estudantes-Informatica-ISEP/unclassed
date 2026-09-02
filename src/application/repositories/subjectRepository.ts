import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type SubjectFilter = { year?: number; semester?: number };

export async function findSubjects(filter: SubjectFilter = {}) {
  const where: Prisma.SubjectWhereInput = {};

  if (filter.year !== undefined) {
    where.year = filter.year;
  }

  if (filter.semester !== undefined) {
    where.semester = filter.semester;
  }

  return prisma.subject.findMany({
    where,
    orderBy: [
      { year: "asc" },
      { semester: "asc" },
      { code: "asc" },
    ],
  });
}

export async function findById(id: string) {
  return prisma.subject.findUnique({ where: { id } });
}

export async function findByCode(code: string) {
  return prisma.subject.findUnique({ where: { code } });
}

export async function findManyByIds(ids: string[]) {
  if (!ids || ids.length === 0) return [];
  return prisma.subject.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
}
