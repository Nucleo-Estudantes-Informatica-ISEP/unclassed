import prisma from "@/lib/prisma";

export async function findUnique(args: Parameters<typeof prisma.graphPartition.findUnique>[0]) {
  return prisma.graphPartition.findUnique(args);
}

export async function findMany(args: Parameters<typeof prisma.graphPartition.findMany>[0] = {}) {
  return prisma.graphPartition.findMany(args);
}

export async function create(args: Parameters<typeof prisma.graphPartition.create>[0]) {
  return prisma.graphPartition.create(args);
}

export async function update(args: Parameters<typeof prisma.graphPartition.update>[0]) {
  return prisma.graphPartition.update(args);
}

export async function updateMany(args: Parameters<typeof prisma.graphPartition.updateMany>[0]) {
  return prisma.graphPartition.updateMany(args);
}
