import prisma from "@/lib/prisma";
import * as classRepo from "./classRepository";
import { toBundleSwapRequestDto } from "@/services/swapRequestDto";

const bundleInclude = {
  user: { select: { id: true, name: true, email: true } },
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

type BundleSwapRequestFindManyArgs = Parameters<typeof prisma.bundleSwapRequest.findMany>[0];
type BundleSwapRequestFindUniqueArgs = Parameters<typeof prisma.bundleSwapRequest.findUnique>[0];
type BundleSwapRequestFindFirstArgs = Parameters<typeof prisma.bundleSwapRequest.findFirst>[0];
type BundleSwapRequestCreateArgs = Parameters<typeof prisma.bundleSwapRequest.create>[0];
type BundleSwapRequestUpdateArgs = Parameters<typeof prisma.bundleSwapRequest.update>[0];
type BundleSwapRequestDeleteArgs = Parameters<typeof prisma.bundleSwapRequest.delete>[0];
type BundleSwapRequestWhereInput = NonNullable<BundleSwapRequestFindFirstArgs>["where"];
type BundleSwapRequestInclude = NonNullable<BundleSwapRequestFindUniqueArgs>["include"];

export async function findMany(args: BundleSwapRequestFindManyArgs) {
  return prisma.bundleSwapRequest.findMany(args);
}

export async function findById(id: string, include?: BundleSwapRequestInclude) {
  return prisma.bundleSwapRequest.findUnique({
    where: { id },
    ...(include ? { include } : {}),
  });
}

export async function findFirst(
  input: BundleSwapRequestWhereInput | { where: BundleSwapRequestWhereInput } | undefined
) {
  if (!input) {
    return null;
  }

  const where = "where" in input ? input.where : input;
  return prisma.bundleSwapRequest.findFirst({ where });
}

export async function create(args: BundleSwapRequestCreateArgs) {
  return prisma.bundleSwapRequest.create(args);
}

export async function update(args: BundleSwapRequestUpdateArgs) {
  return prisma.bundleSwapRequest.update(args);
}

export async function updateMany(args: Parameters<typeof prisma.bundleSwapRequest.updateMany>[0]) {
  return prisma.bundleSwapRequest.updateMany(args);
}

export async function count(args: Parameters<typeof prisma.bundleSwapRequest.count>[0]) {
  return prisma.bundleSwapRequest.count(args);
}

export async function deleteMany(args: Parameters<typeof prisma.bundleSwapRequest.deleteMany>[0]) {
  return prisma.bundleSwapRequest.deleteMany(args);
}

export async function remove(args: BundleSwapRequestDeleteArgs) {
  return prisma.bundleSwapRequest.delete(args);
}

// --- Domain-level Encapsulated Methods ---

export async function listWithDetails(args: BundleSwapRequestFindManyArgs) {
  const requests = await prisma.bundleSwapRequest.findMany({
    ...args,
    include: bundleInclude,
  });
  const enriched = await batchEnrichPreferredClasses(requests);
  return enriched.map(({ request, preferredClasses }) =>
    toBundleSwapRequestDto(request, preferredClasses)
  );
}

export async function getByIdWithDetails(id: string) {
  const request = await prisma.bundleSwapRequest.findUnique({
    where: { id },
    include: bundleInclude,
  });
  if (!request) return null;
  const preferredClasses = await classRepo.findManyByIds(request.preferredClassIds);
  return toBundleSwapRequestDto(request, preferredClasses);
}

export async function createWithDetails(args: BundleSwapRequestCreateArgs) {
  const request = await prisma.bundleSwapRequest.create({
    ...args,
    include: bundleInclude,
  });
  const preferredClasses = await classRepo.findManyByIds(request.preferredClassIds);
  return toBundleSwapRequestDto(request, preferredClasses);
}

export async function updateWithDetails(args: BundleSwapRequestUpdateArgs) {
  const request = await prisma.bundleSwapRequest.update({
    ...args,
    include: bundleInclude,
  });
  const preferredClasses = await classRepo.findManyByIds(request.preferredClassIds);
  return toBundleSwapRequestDto(request, preferredClasses);
}
