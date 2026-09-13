import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export type Transaction = Prisma.TransactionClient;

export async function executeInTransaction<T>(
  callback: (tx: Transaction) => Promise<T>
): Promise<T> {
  return prisma.$transaction(callback);
}
