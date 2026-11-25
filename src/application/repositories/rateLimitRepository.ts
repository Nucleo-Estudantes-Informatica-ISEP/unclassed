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

export async function findMany(args: Parameters<typeof prisma.rateLimitBucket.findMany>[0] = {}) {
  return prisma.rateLimitBucket.findMany(args);
}

export async function findUnique(args: Parameters<typeof prisma.rateLimitBucket.findUnique>[0]) {
  return prisma.rateLimitBucket.findUnique(args);
}

export async function deleteMany(args: Parameters<typeof prisma.rateLimitBucket.deleteMany>[0] = {}) {
  return prisma.rateLimitBucket.deleteMany(args);
}
