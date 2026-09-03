import prisma from "@/lib/prisma";

export async function findManyByIds(ids: string[]) {
  if (!ids || ids.length === 0) return [];

  return prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, email: true },
  });
}
