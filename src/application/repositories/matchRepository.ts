import prisma from "@/lib/prisma";

export async function findMany(args: Parameters<typeof prisma.match.findMany>[0] = {}) {
  return prisma.match.findMany(args);
}

export async function findUnique(args: Parameters<typeof prisma.match.findUnique>[0]) {
  return prisma.match.findUnique(args);
}

export async function findUniqueOrThrow(args: Parameters<typeof prisma.match.findUniqueOrThrow>[0]) {
  return prisma.match.findUniqueOrThrow(args);
}

export async function create(args: Parameters<typeof prisma.match.create>[0]) {
  return prisma.match.create(args);
}

export async function updateMany(args: Parameters<typeof prisma.match.updateMany>[0]) {
  return prisma.match.updateMany(args);
}

export async function update(args: Parameters<typeof prisma.match.update>[0]) {
  return prisma.match.update(args);
}

export async function count(args: Parameters<typeof prisma.match.count>[0] = {}) {
  return prisma.match.count(args);
}

export async function deleteMany(args: Parameters<typeof prisma.match.deleteMany>[0]) {
  return prisma.match.deleteMany(args);
}
