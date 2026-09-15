
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export async function create(args: Parameters<typeof prisma.cronExecution.create>[0]) {
  return prisma.cronExecution.create(args);
}

export async function update(args: Parameters<typeof prisma.cronExecution.update>[0]) {
  return prisma.cronExecution.update(args);
}

export async function findMany(args: Parameters<typeof prisma.cronExecution.findMany>[0]) {
  return prisma.cronExecution.findMany(args);
}

export async function findFirst(args: Parameters<typeof prisma.cronExecution.findFirst>[0]) {
  return prisma.cronExecution.findFirst(args);
}
export type { CronExecution, CronStatus } from "@prisma/client";
export type JsonValue = Prisma.InputJsonValue;
