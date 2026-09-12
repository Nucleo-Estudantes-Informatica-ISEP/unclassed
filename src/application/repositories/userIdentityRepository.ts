import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export async function findUnique(args: Parameters<typeof prisma.userIdentity.findUnique>[0], tx?: Prisma.TransactionClient) {
  return (tx || prisma).userIdentity.findUnique(args);
}

export async function create(args: Parameters<typeof prisma.userIdentity.create>[0], tx?: Prisma.TransactionClient) {
  return (tx || prisma).userIdentity.create(args);
}
