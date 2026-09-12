import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export async function findMany(args: Parameters<typeof prisma.match.findMany>[0] = {}, tx?: Prisma.TransactionClient) {
  return (tx || prisma).match.findMany(args);
}

export async function findUnique(args: Parameters<typeof prisma.match.findUnique>[0], tx?: Prisma.TransactionClient) {
  return (tx || prisma).match.findUnique(args);
}

export async function findUniqueOrThrow(args: Parameters<typeof prisma.match.findUniqueOrThrow>[0], tx?: Prisma.TransactionClient) {
  return (tx || prisma).match.findUniqueOrThrow(args);
}

export async function create(args: Parameters<typeof prisma.match.create>[0], tx?: Prisma.TransactionClient) {
  return (tx || prisma).match.create(args);
}

export async function updateMany(args: Parameters<typeof prisma.match.updateMany>[0], tx?: Prisma.TransactionClient) {
  return (tx || prisma).match.updateMany(args);
}

export async function update(args: Parameters<typeof prisma.match.update>[0], tx?: Prisma.TransactionClient) {
  return (tx || prisma).match.update(args);
}

export async function count(args: Parameters<typeof prisma.match.count>[0] = {}, tx?: Prisma.TransactionClient) {
  return (tx || prisma).match.count(args);
}

export async function deleteMany(args: Parameters<typeof prisma.match.deleteMany>[0], tx?: Prisma.TransactionClient) {
  return (tx || prisma).match.deleteMany(args);
}

export async function aggregateRaw(args: Parameters<typeof prisma.match.aggregateRaw>[0], tx?: Prisma.TransactionClient) {
  return (tx || prisma).match.aggregateRaw(args);
}

