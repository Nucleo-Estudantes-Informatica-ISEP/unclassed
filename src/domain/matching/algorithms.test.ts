import assert from "node:assert/strict";
import { test } from "vitest";

import {
  areAllRequestsAvailable,
  buildCompatibilityGraph,
  cycleToMatch,
  cycleToParticipants,
  decideMatchOverlap,
  findCycles,
  getIndividualSatisfaction,
  type MatchingRequest,
} from "./algorithms";

function request(
  requestId: string,
  userId: string,
  currentClassId: string,
  preferredClassIds: string[]
): MatchingRequest {
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

function requireCycleMatch(result: ReturnType<typeof cycleToMatch>) {
  assert.ok(result && !("reason" in result));
  return result;
}

test("characterizes direct two-way matching", () => {
  const graph = buildCompatibilityGraph([
    request("a", "user-a", "class-a", ["class-b"]),
    request("b", "user-b", "class-b", ["class-a"]),
  ]);

  assert.deepEqual(findCycles(graph, "a", 2), [["a", "b"]]);
  assert.equal(graph.outgoingEdges("a")[0]?.value.satisfactionScore, 1);
  const match = requireCycleMatch(
    cycleToMatch(["a", "b"], graph, "subject-1", 500)
  );
  assert.equal(match?.pattern, "DIRECT");
  assert.equal(match?.satisfactionScore, 1);
  assert.equal(match?.processingTime, 500);
  assert.deepEqual(cycleToParticipants(["a", "b"], graph), [
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
  ]);
});

test("characterizes three-way matching", () => {
  const graph = buildCompatibilityGraph([
    request("a", "user-a", "class-a", ["class-b"]),
    request("b", "user-b", "class-b", ["class-c"]),
    request("c", "user-c", "class-c", ["class-a"]),
  ]);

  assert.deepEqual(findCycles(graph, "a", 3), [["a", "b", "c"]]);
  assert.deepEqual(findCycles(graph, "a", 2), []);
  assert.equal(
    requireCycleMatch(cycleToMatch(["a", "b", "c"], graph, "subject-1", 0))
      .pattern,
    "THREE_WAY"
  );
});

test("assembles multi-way matches and averages satisfaction", () => {
  const graph = buildCompatibilityGraph([
    request("a", "user-a", "class-a", ["unused-class", "class-b"]),
    request("b", "user-b", "class-b", ["class-c"]),
    request("c", "user-c", "class-c", ["class-d"]),
    request("d", "user-d", "class-d", ["class-a"]),
  ]);

  const match = requireCycleMatch(
    cycleToMatch(["a", "b", "c", "d"], graph, "subject-1", 250)
  );

  assert.equal(match?.pattern, "MULTI_WAY");
  assert.equal(match?.satisfactionScore, (0.85 + 1 + 1 + 1) / 4);
  assert.equal(match?.processingTime, 250);
  assert.deepEqual(match?.singleSwapRequestIds, ["a", "b", "c", "d"]);
});

test("does not match unsatisfiable preferences", () => {
  const graph = buildCompatibilityGraph([
    request("a", "user-a", "class-a", ["class-c"]),
    request("b", "user-b", "class-b", ["class-a"]),
  ]);

  assert.deepEqual(findCycles(graph, "a", 2), []);
  assert.equal(graph.outgoingEdges("a").length, 0);
});

test("honors whether preference order affects satisfaction", () => {
  const ordered = request("a", "user-a", "class-a", ["class-b", "class-c"]);

  assert.equal(getIndividualSatisfaction(ordered, "class-c"), 0.85);
  assert.equal(
    getIndividualSatisfaction(
      { ...ordered, preferenceOrderMatters: false },
      "class-c"
    ),
    1
  );
  assert.equal(
    getIndividualSatisfaction(
      { ...ordered, preferenceOrderMatters: undefined },
      "class-c"
    ),
    1
  );
});

test("rejects a match when a request disappeared after graph creation", () => {
  assert.equal(
    areAllRequestsAvailable(
      ["a", "b"],
      [{ id: "a", status: "ACTIVE", provisionalMatchId: null }]
    ),
    false
  );
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
