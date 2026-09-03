import prisma from "@/lib/prisma";

type FindManyArgs =
  Parameters<typeof prisma.singleSwapRequest.findMany>[0];

type FindFirstArgs =
  Parameters<typeof prisma.singleSwapRequest.findFirst>[0];

type CreateArgs =
  Parameters<typeof prisma.singleSwapRequest.create>[0];

type UpdateArgs =
  Parameters<typeof prisma.singleSwapRequest.update>[0];

type DeleteArgs =
  Parameters<typeof prisma.singleSwapRequest.delete>[0];

type WhereInput = NonNullable<FindFirstArgs>["where"];

type FindUniqueArgs =
  Parameters<typeof prisma.singleSwapRequest.findUnique>[0];

type Include = NonNullable<FindUniqueArgs>["include"];

export async function findMany(args: FindManyArgs) {
  return prisma.singleSwapRequest.findMany(args);
}

export async function findById(id: string, include?: Include) {
  return prisma.singleSwapRequest.findUnique({
    where: { id },
    ...(include ? { include } : {}),
  });
}

export async function findFirst(input: WhereInput | { where: WhereInput } | undefined) {
  if (!input) {
    return null;
  }

  const where = "where" in input ? input.where : input;
  return prisma.singleSwapRequest.findFirst({ where });
}

export async function create(args: CreateArgs) {
  return prisma.singleSwapRequest.create(args);
}

export async function update(args: UpdateArgs) {
  return prisma.singleSwapRequest.update(args);
}

export async function remove(args: DeleteArgs) {
  return prisma.singleSwapRequest.delete(args);
}