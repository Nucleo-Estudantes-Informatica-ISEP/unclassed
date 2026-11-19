import { NextRequest } from "next/server";
import { expect, test, vi } from "vitest";

import getServerSession from "@/services/getServerSession";
import * as matchRepository from "@/application/repositories/matchRepository";

import { GET } from "./route";

vi.mock("@/services/getServerSession", () => ({ default: vi.fn() }));
vi.mock("@/services/rateLimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  resolveRateLimitIdentifier: vi.fn(),
}));
vi.mock("@/application/repositories/classRepository", () => ({
  findClasses: vi.fn().mockResolvedValue([{ id: "class-id", name: "1DA" }]),
}));
vi.mock("@/application/repositories/bundleSwapRequestRepository", () => ({
  findMany: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/application/repositories/singleSwapRequestRepository", () => ({
  findMany: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/application/repositories/matchRepository", () => ({
  findMany: vi.fn(),
}));

test("recent swaps expose class labels and dates to ordinary users", async () => {
  vi.mocked(getServerSession).mockResolvedValue({
    id: "signed-in-user",
    role: "USER",
  } as never);
  const createdAt = new Date("2026-11-01T00:00:00Z");
  vi.mocked(matchRepository.findMany).mockResolvedValue([
    {
      id: "private-match",
      createdAt,
      participants: [
        { fromClass: "class-id" },
        { fromClass: "1DA" },
        { fromClass: "unresolved-class" },
      ],
      singleSwapRequestIds: ["private-request"],
    },
  ] as never);

  const response = await GET(
    new NextRequest("http://localhost/api/dashboard/stats")
  );

  expect(response.status).toBe(200);
  expect((await response.json()).recentSwaps).toEqual([
    { createdAt: createdAt.toISOString(), classes: ["1DA", "1DA"] },
  ]);
});
