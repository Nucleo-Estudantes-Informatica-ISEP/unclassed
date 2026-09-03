import prisma from "@/lib/prisma";

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
