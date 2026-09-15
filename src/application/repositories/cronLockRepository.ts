import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export async function create(args: Parameters<typeof prisma.cronLock.create>[0]) {
  return prisma.cronLock.create(args);
}

export async function updateMany(args: Parameters<typeof prisma.cronLock.updateMany>[0]) {
  return prisma.cronLock.updateMany(args);
}

export async function deleteMany(args: Parameters<typeof prisma.cronLock.deleteMany>[0]) {
  return prisma.cronLock.deleteMany(args);
}

export async function count(args: Parameters<typeof prisma.cronLock.count>[0]) {
  return prisma.cronLock.count(args);
}

export function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
