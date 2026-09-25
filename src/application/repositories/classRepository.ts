import prisma from "@/lib/prisma";

export type ClassFilter = { year?: number };

type ClassWhereInput = NonNullable<Parameters<typeof prisma.class.findMany>[0]>["where"];

export async function findClasses(filter: ClassFilter = {}) {
  const where: ClassWhereInput = {};
  if (filter.year !== undefined) where.year = filter.year;
  return prisma.class.findMany({ where, orderBy: [{ year: "asc" }, { name: "asc" }] });
}

export async function findById(id: string) {
  return prisma.class.findUnique({ where: { id } });
}

export async function findManyByIds(ids: string[]) {
  if (!ids || ids.length === 0) return [];
  return prisma.class.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, year: true } });
}

export async function findByNames(names: string[]) {
  if (!names || names.length === 0) return [];
  return prisma.class.findMany({ where: { name: { in: names } } });
}
export async function create(args: Parameters<typeof prisma.class.create>[0], tx?: import("@prisma/client").Prisma.TransactionClient) {
  return (tx || prisma).class.create(args);
}

export async function deleteMany(args: Parameters<typeof prisma.class.deleteMany>[0] = {}, tx?: import("@prisma/client").Prisma.TransactionClient) {
  return (tx || prisma).class.deleteMany(args);
}

export type { Class } from "@prisma/client";
