import * as bundleSwapRequestRepo from "@/application/repositories/bundleSwapRequestRepository";
import * as graphPartitionRepo from "@/application/repositories/graphPartitionRepository";
import * as singleSwapRequestRepo from "@/application/repositories/singleSwapRequestRepository";

export async function updatePartitionRequestCount(
  partitionKey: string,
): Promise<void> {
  const [singleCount, bundleCount] = await Promise.all([
    singleSwapRequestRepo.count({
      where: {
        graphPartition: partitionKey,
        status: "ACTIVE",
      },
    }),
    bundleSwapRequestRepo.count({
      where: {
        graphPartition: partitionKey,
        status: "ACTIVE",
      },
    }),
  ]);

  await graphPartitionRepo.update({
    where: { partitionKey },
    data: { activeRequests: singleCount + bundleCount },
  });
}
