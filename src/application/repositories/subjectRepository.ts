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
    orderBy: [{ year: "asc" }, { semester: "asc" }, { code: "asc" }],
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
  tx?: Prisma.TransactionClient
) {
  return (tx || prisma).subject.create(args);
}

export async function update(
  args: Parameters<typeof prisma.subject.update>[0],
  tx?: Prisma.TransactionClient
) {
  return (tx || prisma).subject.update(args);
}

export async function remove(
  args: Parameters<typeof prisma.subject.delete>[0],
  tx?: Prisma.TransactionClient
) {
  return (tx || prisma).subject.delete(args);
}

export async function deleteMany(
  args: Parameters<typeof prisma.subject.deleteMany>[0] = {},
  tx?: Prisma.TransactionClient
) {
  return (tx || prisma).subject.deleteMany(args);
}

type DbClient = Prisma.TransactionClient | typeof prisma;

// A subject is referenced by swap requests, by its persistent graph partition
// (which outlives the requests and keeps the stored year) and by matches via
// their `subject-<id>` partition key.
export async function isInUse(
  id: string,
  client: DbClient = prisma
): Promise<boolean> {
  const [requests, partitions, matches] = await Promise.all([
    client.singleSwapRequest.count({ where: { subjectId: id } }),
    client.graphPartition.count({ where: { subjectId: id } }),
    client.match.count({ where: { graphPartition: `subject-${id}` } }),
  ]);

  return requests > 0 || partitions > 0 || matches > 0;
}

// Check and delete share one transaction to narrow the window in which a
// request created in between would be orphaned. MongoDB has no foreign keys and
// a concurrent insert does not conflict with the delete, so the residual race
// is accepted and tracked as a follow-up.
export async function removeUnlessInUse(id: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    if (await isInUse(id, tx)) return false;

    await tx.subject.delete({ where: { id } });
    return true;
  });
}

export type { Subject } from "@prisma/client";
