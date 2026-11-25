import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";

import { isFixtureDatabase } from "@/lib/fixtureDatabase";
import * as classRepo from "@/application/repositories/classRepository";
import * as matchRepo from "@/application/repositories/matchRepository";
import * as requestRepo from "@/application/repositories/singleSwapRequestRepository";
import * as subjectRepo from "@/application/repositories/subjectRepository";
import {
  executeInTransaction,
  type Transaction,
} from "@/application/repositories/transactionRepository";
import * as userRepo from "@/application/repositories/userRepository";

import { POST } from "./route.dev";

vi.mock("@/lib/apiAccess", () => ({
  authorizeRequest: async () => ({
    ok: true,
    authenticatedBy: "session",
    session: {},
  }),
}));
vi.mock("@/lib/fixtureDatabase", () => ({ isFixtureDatabase: vi.fn() }));
vi.mock("@/application/repositories/transactionRepository", () => ({
  executeInTransaction: vi.fn(),
}));
vi.mock("@/application/repositories/classRepository", () => ({
  findByNames: vi.fn(),
}));
vi.mock("@/application/repositories/matchRepository", () => ({
  findMany: vi.fn(),
  deleteMany: vi.fn(),
  create: vi.fn(),
}));
vi.mock("@/application/repositories/singleSwapRequestRepository", () => ({
  findMany: vi.fn(),
  deleteMany: vi.fn(),
  create: vi.fn(),
}));
vi.mock("@/application/repositories/subjectRepository", () => ({
  findByCode: vi.fn(),
}));
vi.mock("@/application/repositories/userRepository", () => ({
  upsert: vi.fn(),
}));

const tx = {} as Transaction;
const requestIds = ["fixture-request-1", "fixture-request-2"];
const fixtureParticipants = [1, 2].map((i) => ({
  userId: `test-match-${i}@example.test`,
}));

function post() {
  return POST(
    new NextRequest("http://localhost/api/test-matches", { method: "POST" })
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(isFixtureDatabase).mockReturnValue(true);
  vi.mocked(executeInTransaction).mockImplementation((callback) =>
    callback(tx)
  );
  vi.mocked(userRepo.upsert).mockImplementation(
    async ({ where }) =>
      ({
        id: where.email,
      }) as never
  );
  vi.mocked(classRepo.findByNames).mockImplementation(async (names) =>
    names.map((name) => ({ id: name, name }) as never)
  );
  vi.mocked(subjectRepo.findByCode).mockResolvedValue({
    id: "subject",
  } as never);
  vi.mocked(requestRepo.findMany).mockResolvedValue(
    requestIds.map((id) => ({ id }) as never)
  );
  vi.mocked(requestRepo.create).mockImplementation(
    async (data) =>
      ({
        ...data,
        id: data.userId,
      }) as never
  );
});

test("fixture reset rejects a non-fixture database before accessing records", async () => {
  vi.mocked(isFixtureDatabase).mockReturnValue(false);

  expect((await post()).status).toBe(404);
  expect(userRepo.upsert).not.toHaveBeenCalled();
  expect(executeInTransaction).not.toHaveBeenCalled();
});

test.each([
  {
    singleSwapRequestIds: [requestIds[0], "real-request"],
    bundleSwapRequestIds: [],
  },
  {
    singleSwapRequestIds: requestIds,
    bundleSwapRequestIds: ["bundle-request"],
  },
])(
  "fixture reset preserves requests and matches on cross-links (%j)",
  async (links) => {
    vi.mocked(matchRepo.findMany).mockResolvedValue([
      {
        id: "fixture-match",
        participants: fixtureParticipants,
        singleSwapRequestIds: requestIds,
        bundleSwapRequestIds: [],
      },
      { id: "linked-match", participants: fixtureParticipants, ...links },
    ] as never);

    expect((await post()).status).toBe(409);
    expect(matchRepo.deleteMany).not.toHaveBeenCalled();
    expect(requestRepo.deleteMany).not.toHaveBeenCalled();
    expect(requestRepo.create).not.toHaveBeenCalled();
  }
);

test("fixture reset deletes only the validated match and fixture request IDs in one transaction", async () => {
  vi.mocked(matchRepo.findMany).mockResolvedValue([
    {
      id: "fixture-match",
      participants: fixtureParticipants,
      singleSwapRequestIds: requestIds,
      bundleSwapRequestIds: [],
    },
  ] as never);

  const response = await post();
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ success: true });
  expect(executeInTransaction).toHaveBeenCalledTimes(1);
  expect(requestRepo.findMany).toHaveBeenCalledExactlyOnceWith(
    {
      where: {
        userId: { in: [1, 2, 3, 4].map((i) => `test-match-${i}@example.test`) },
      },
      select: { id: true },
    },
    tx
  );
  expect(matchRepo.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      select: expect.objectContaining({ participants: true }),
    }),
    tx
  );
  expect(matchRepo.deleteMany).toHaveBeenCalledExactlyOnceWith(
    {
      where: { id: { in: ["fixture-match"] } },
    },
    tx
  );
  expect(requestRepo.deleteMany).toHaveBeenCalledExactlyOnceWith(
    {
      where: { id: { in: requestIds } },
    },
    tx
  );
});

test("fixture reset removes an orphaned fixture match with no current fixture requests", async () => {
  vi.mocked(requestRepo.findMany).mockResolvedValue([]);
  vi.mocked(matchRepo.findMany).mockResolvedValue([
    {
      id: "fixture-orphan",
      participants: fixtureParticipants,
      singleSwapRequestIds: ["missing-request"],
      bundleSwapRequestIds: [],
    },
    {
      id: "unrelated-match",
      participants: [{ userId: "real-user" }],
      singleSwapRequestIds: ["real-request"],
      bundleSwapRequestIds: [],
    },
  ] as never);

  expect((await post()).status).toBe(200);
  expect(requestRepo.findMany).toHaveBeenLastCalledWith(
    { where: { id: { in: ["missing-request"] } }, select: { id: true } },
    tx
  );
  expect(matchRepo.deleteMany).toHaveBeenCalledExactlyOnceWith(
    { where: { id: { in: ["fixture-orphan"] } } },
    tx
  );
});
