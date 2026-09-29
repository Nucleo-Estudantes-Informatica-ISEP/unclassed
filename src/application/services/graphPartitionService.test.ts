import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/application/repositories/singleSwapRequestRepository", () => ({
  count: vi.fn(),
}));

vi.mock("@/application/repositories/bundleSwapRequestRepository", () => ({
  count: vi.fn(),
}));

vi.mock("@/application/repositories/graphPartitionRepository", () => ({
  update: vi.fn(),
}));

import * as bundleSwapRequestRepo from "@/application/repositories/bundleSwapRequestRepository";
import * as graphPartitionRepo from "@/application/repositories/graphPartitionRepository";
import * as singleSwapRequestRepo from "@/application/repositories/singleSwapRequestRepository";

import { updatePartitionRequestCount } from "./graphPartitionService";

describe("updatePartitionRequestCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the partition with the total number of active requests", async () => {
    vi.mocked(singleSwapRequestRepo.count).mockResolvedValueOnce(3);
    vi.mocked(bundleSwapRequestRepo.count).mockResolvedValueOnce(2);
    vi.mocked(graphPartitionRepo.update).mockResolvedValueOnce({} as never);

    await updatePartitionRequestCount("2DQ");

    expect(singleSwapRequestRepo.count).toHaveBeenCalledWith({
      where: {
        graphPartition: "2DQ",
        status: "ACTIVE",
      },
    });

    expect(bundleSwapRequestRepo.count).toHaveBeenCalledWith({
      where: {
        graphPartition: "2DQ",
        status: "ACTIVE",
      },
    });

    expect(graphPartitionRepo.update).toHaveBeenCalledWith({
      where: { partitionKey: "2DQ" },
      data: { activeRequests: 5 },
    });
  });
});
