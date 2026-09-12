import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export async function executeInTransaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(callback);
}
