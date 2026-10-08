import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

export type SubjectFilter = { year?: number; semester?: number };

type SubjectWhereInput = NonNullable<
  Parameters<typeof prisma.subject.findMany>[0]
>["where"];

export async function findSubjects(filter: SubjectFilter = {}) {
  const where: SubjectWhereInput = {};

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

  return prisma.subject.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
}

export async function create(
  args: Parameters<typeof prisma.subject.create>[0],
  tx?: Prisma.TransactionClient,
) {
  return (tx || prisma).subject.create(args);
}

export async function update(
  args: Parameters<typeof prisma.subject.update>[0],
  tx?: Prisma.TransactionClient,
) {
  return (tx || prisma).subject.update(args);
}

export async function remove(
  args: Parameters<typeof prisma.subject.delete>[0],
  tx?: Prisma.TransactionClient,
) {
  return (tx || prisma).subject.delete(args);
}

export async function deleteMany(
  args: Parameters<typeof prisma.subject.deleteMany>[0] = {},
  tx?: Prisma.TransactionClient,
) {
  return (tx || prisma).subject.deleteMany(args);
}

export function isKnownRequestError(error: unknown, code: string) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === code
  );
}

export async function isInUse(id: string): Promise<boolean> {
  const count = await prisma.singleSwapRequest.count({
    where: { subjectId: id },
  });

  return count > 0;
}

export type { Subject } from "@prisma/client";
