import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

export type ClassFilter = { year?: number };

type ClassWhereInput = NonNullable<
  Parameters<typeof prisma.class.findMany>[0]
>["where"];

export async function findClasses(filter: ClassFilter = {}) {
  const where: ClassWhereInput = {};

  if (filter.year !== undefined) {
    where.year = filter.year;
  }

  return prisma.class.findMany({
    where,
    orderBy: [{ year: "asc" }, { name: "asc" }],
  });
}

export function normalizeClassName(name: string) {
  return name.trim().toUpperCase();
}

export async function hasNameConflict(name: string, excludeId?: string) {
  const normalizedName = normalizeClassName(name);
  const classes = await prisma.class.findMany({
    where: excludeId ? { id: { not: excludeId } } : {},
    select: { name: true },
  });
  return classes.some(
    (item) => normalizeClassName(item.name) === normalizedName
  );
}

export async function findById(id: string) {
  return prisma.class.findUnique({ where: { id } });
}

export async function findManyByIds(ids: string[]) {
  if (!ids || ids.length === 0) return [];

  return prisma.class.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, year: true },
  });
}

export async function findByNames(names: string[]) {
  if (!names || names.length === 0) return [];

  return prisma.class.findMany({
    where: { name: { in: names } },
  });
}

export async function create(
  args: Parameters<typeof prisma.class.create>[0],
  tx?: Prisma.TransactionClient
) {
  return (tx || prisma).class.create({
    ...args,
    data: {
      ...args.data,
      name: normalizeClassName(args.data.name),
    },
  });
}

export async function update(
  args: Parameters<typeof prisma.class.update>[0],
  tx?: Prisma.TransactionClient
) {
  return (tx || prisma).class.update({
    ...args,
    data: {
      ...args.data,
      ...(typeof args.data.name === "string"
        ? { name: normalizeClassName(args.data.name) }
        : {}),
    },
  });
}

export async function remove(
  args: Parameters<typeof prisma.class.delete>[0],
  tx?: Prisma.TransactionClient
) {
  return (tx || prisma).class.delete(args);
}

export async function deleteMany(
  args: Parameters<typeof prisma.class.deleteMany>[0] = {},
  tx?: Prisma.TransactionClient
) {
  return (tx || prisma).class.deleteMany(args);
}

export async function isInUse(id: string): Promise<boolean> {
  const existingClass = await prisma.class.findUnique({
    where: { id },
    select: { name: true },
  });

  const classReferences = [id];
  if (existingClass) {
    classReferences.push(existingClass.name);
  }

  const [singleCount, bundleCount, matches] = await Promise.all([
    prisma.singleSwapRequest.count({
      where: {
        OR: [{ currentClassId: id }, { preferredClassIds: { has: id } }],
      },
    }),
    prisma.bundleSwapRequest.count({
      where: {
        OR: [{ currentClassId: id }, { preferredClassIds: { has: id } }],
      },
    }),
    prisma.match.aggregateRaw({
      pipeline: [
        {
          $match: {
            participants: {
              $elemMatch: {
                $or: [
                  { fromClass: { $in: classReferences } },
                  { toClass: { $in: classReferences } },
                ],
              },
            },
          },
        },
        { $limit: 1 },
        { $project: { _id: 1 } },
      ],
    }),
  ]);

  return (
    singleCount > 0 ||
    bundleCount > 0 ||
    (Array.isArray(matches) && matches.length > 0)
  );
}

export type { Class } from "@prisma/client";
