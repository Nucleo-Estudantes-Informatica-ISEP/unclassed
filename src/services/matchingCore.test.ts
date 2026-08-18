import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";

import {
  buildPartitionGraph,
  convertCycleToMatch,
  decideMatchOverlap,
  findCyclesFromNode,
  type GraphNode,
} from "./matchingCore";

function request(
  requestId: string,
  userId: string,
  currentClassId: string,
  preferredClassIds: string[]
): GraphNode {
  return {
    requestId,
    userId,
    currentClassId,
    preferredClassIds,
    preferenceOrderMatters: true,
    requestType: "single",
    priority: 1,
    createdAt: new Date("2026-08-16T00:00:00.000Z"),
    subjectId: "subject-1",
  };
}

function lookup(requests: GraphNode[]) {
  return async (id: string) =>
    requests.find((candidate) => candidate.requestId === id) ?? null;
}

afterEach(() => vi.restoreAllMocks());

test("characterizes a direct-swap pair", async () => {
  vi.spyOn(Date, "now").mockReturnValue(1_500);
  const requests = [
    request("a", "user-a", "class-a", ["class-b"]),
    request("b", "user-b", "class-b", ["class-a"]),
  ];
  const graph = buildPartitionGraph(requests);
  const cycle = findCyclesFromNode("a", graph, 2)[0];

  assert.deepEqual(cycle, ["a", "b"]);
  assert.deepEqual(
    await convertCycleToMatch(
      cycle,
      graph,
      lookup(requests),
      "subject-1",
      1_000
    ),
    {
      pattern: "DIRECT",
      participants: [
        {
          userId: "user-a",
          fromClass: "class-a",
          toClass: "class-b",
          requestId: "a",
          requestType: "single",
          satisfactionScore: 1,
        },
        {
          userId: "user-b",
          fromClass: "class-b",
          toClass: "class-a",
          requestId: "b",
          requestType: "single",
          satisfactionScore: 1,
        },
      ],
      satisfactionScore: 1,
      processingTime: 500,
      isProvisional: false,
      graphPartition: "subject-1",
      singleSwapRequestIds: ["a", "b"],
      bundleSwapRequestIds: [],
    }
  );
});

test("characterizes a three-way cycle", async () => {
  const requests = [
    request("a", "user-a", "class-a", ["class-b"]),
    request("b", "user-b", "class-b", ["class-c"]),
    request("c", "user-c", "class-c", ["class-a"]),
  ];
  const graph = buildPartitionGraph(requests);
  const cycle = findCyclesFromNode("a", graph, 3)[0];
  const match = await convertCycleToMatch(
    cycle,
    graph,
    lookup(requests),
    "subject-1",
    Date.now()
  );

  assert.deepEqual(cycle, ["a", "b", "c"]);
  assert.deepEqual(findCyclesFromNode("a", graph, 2), []);
  assert.equal(match?.pattern, "THREE_WAY");
  assert.deepEqual(match?.singleSwapRequestIds, ["a", "b", "c"]);
  assert.deepEqual(
    match?.participants.map(({ fromClass, toClass }) => ({
      fromClass,
      toClass,
    })),
    [
      { fromClass: "class-a", toClass: "class-b" },
      { fromClass: "class-b", toClass: "class-c" },
      { fromClass: "class-c", toClass: "class-a" },
    ]
  );
});

test("does not match unsatisfiable preferences", () => {
  const graph = buildPartitionGraph([
    request("a", "user-a", "class-a", ["class-c"]),
    request("b", "user-b", "class-b", ["class-a"]),
  ]);

  assert.deepEqual(findCyclesFromNode("a", graph, 2), []);
  assert.equal(graph.get("a")?.length, 0);
});

test("keeps committed overlaps and upgrades only better provisionals", () => {
  assert.equal(
    decideMatchOverlap(false, 1, [
      {
        id: "committed",
        status: "ACCEPTED",
        isProvisional: false,
        satisfactionScore: 0.5,
      },
    ]).action,
    "skip-committed"
  );
  assert.equal(
    decideMatchOverlap(true, 0.84, [
      {
        id: "provisional",
        status: "PROVISIONAL",
        isProvisional: true,
        satisfactionScore: 0.8,
      },
    ]).action,
    "skip-not-improved"
  );
  assert.deepEqual(
    decideMatchOverlap(true, 0.86, [
      {
        id: "provisional",
        status: "PROVISIONAL",
        isProvisional: true,
        satisfactionScore: 0.8,
      },
    ]),
    {
      action: "create",
      supersede: [
        {
          id: "provisional",
          status: "PROVISIONAL",
          isProvisional: true,
          satisfactionScore: 0.8,
        },
      ],
    }
  );
});
