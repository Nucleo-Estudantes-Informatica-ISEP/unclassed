import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRequestGraph,
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

test("characterizes direct two-way matching", () => {
  const graph = buildRequestGraph([
    request("a", "user-a", "class-a", ["class-b"]),
    request("b", "user-b", "class-b", ["class-a"]),
  ]);

  assert.deepEqual(findCyclesFromNode("a", graph, 2), [["a", "b"]]);
  assert.equal(graph.get("a")?.[0]?.satisfactionScore, 1);
});

test("characterizes three-way matching", () => {
  const graph = buildRequestGraph([
    request("a", "user-a", "class-a", ["class-b"]),
    request("b", "user-b", "class-b", ["class-c"]),
    request("c", "user-c", "class-c", ["class-a"]),
  ]);

  assert.deepEqual(findCyclesFromNode("a", graph, 3), [["a", "b", "c"]]);
  assert.deepEqual(findCyclesFromNode("a", graph, 2), []);
});

test("does not match unsatisfiable preferences", () => {
  const graph = buildRequestGraph([
    request("a", "user-a", "class-a", ["class-c"]),
    request("b", "user-b", "class-b", ["class-a"]),
  ]);

  assert.deepEqual(findCyclesFromNode("a", graph, 2), []);
  assert.equal(graph.get("a")?.length, 0);
});

test("never replaces committed overlaps and upgrades only better provisionals", () => {
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
