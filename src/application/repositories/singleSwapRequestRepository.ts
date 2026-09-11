import prisma from "@/lib/prisma";
import * as classRepo from "./classRepository";
import { toSingleSwapRequestDto } from "@/services/swapRequestDto";

const singleInclude = {
  user: { select: { id: true, name: true, email: true } },
  subject: { select: { id: true, code: true, name: true, year: true } },
  currentClass: { select: { id: true, name: true, year: true } },
};

type PublicClass = {
  id: string;
  name: string;
  year: number;
};

async function batchEnrichPreferredClasses<
  T extends { preferredClassIds: string[] },
>(requests: T[]): Promise<Array<{ request: T; preferredClasses: PublicClass[] }>> {
  if (requests.length === 0) return [];
  const allClassIds = Array.from(new Set(requests.flatMap((r) => r.preferredClassIds)));
  const classes = allClassIds.length > 0 ? await classRepo.findManyByIds(allClassIds) : [];
  const classMap = new Map<string, PublicClass>(classes.map((c) => [c.id, c]));
  return requests.map((request) => ({
    request,
    preferredClasses: request.preferredClassIds
      .map((id) => classMap.get(id))
      .filter((c): c is PublicClass => c !== undefined),
  }));
}

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

export async function updateMany(args: Parameters<typeof prisma.singleSwapRequest.updateMany>[0]) {
  return prisma.singleSwapRequest.updateMany(args);
}

export async function count(args: Parameters<typeof prisma.singleSwapRequest.count>[0]) {
  return prisma.singleSwapRequest.count(args);
}

export async function deleteMany(args: Parameters<typeof prisma.singleSwapRequest.deleteMany>[0]) {
  return prisma.singleSwapRequest.deleteMany(args);
}

export async function remove(args: DeleteArgs) {
  return prisma.singleSwapRequest.delete(args);
}

// --- Domain-level Encapsulated Methods ---

export async function listWithDetails(args: FindManyArgs) {
  const requests = await prisma.singleSwapRequest.findMany({
    ...args,
    include: singleInclude,
  });
  const enriched = await batchEnrichPreferredClasses(requests);
  return enriched.map(({ request, preferredClasses }) =>
    toSingleSwapRequestDto(request, preferredClasses)
  );
}

export async function getByIdWithDetails(id: string) {
  const request = await prisma.singleSwapRequest.findUnique({
    where: { id },
    include: singleInclude,
  });
  if (!request) return null;
  const preferredClasses = await classRepo.findManyByIds(request.preferredClassIds);
  return toSingleSwapRequestDto(request, preferredClasses);
}

export async function createWithDetails(args: CreateArgs) {
  const request = await prisma.singleSwapRequest.create({
    ...args,
    include: singleInclude,
  });
  const preferredClasses = await classRepo.findManyByIds(request.preferredClassIds);
  return toSingleSwapRequestDto(request, preferredClasses);
}

export async function updateWithDetails(args: UpdateArgs) {
  const request = await prisma.singleSwapRequest.update({
    ...args,
    include: singleInclude,
  });
  const preferredClasses = await classRepo.findManyByIds(request.preferredClassIds);
  return toSingleSwapRequestDto(request, preferredClasses);
}