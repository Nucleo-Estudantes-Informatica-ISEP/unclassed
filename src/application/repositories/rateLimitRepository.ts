import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export async function upsert(args: Parameters<typeof prisma.rateLimitBucket.upsert>[0]) {
  return prisma.rateLimitBucket.upsert(args);
}

export async function update(args: Parameters<typeof prisma.rateLimitBucket.update>[0]) {
  return prisma.rateLimitBucket.update(args);
}

export function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function deleteMany(args: Parameters<typeof prisma.rateLimitBucket.deleteMany>[0]) {
  return prisma.rateLimitBucket.deleteMany(args);
}
