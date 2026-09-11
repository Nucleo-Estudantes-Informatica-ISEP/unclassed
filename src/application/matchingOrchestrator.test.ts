import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";

import type { Graph } from "@/domain/graph/graph";
import {
  buildCompatibilityGraph,
  type CompatibilityEdge,
  type MatchingRequest,
} from "@/domain/matching/algorithms";

import { assembleCycleMatch } from "./matchingOrchestrator";

vi.mock("@/services/emailService", () => ({ emailService: {} }));

const requests: MatchingRequest[] = [
  {
    requestId: "a",
    userId: "user-a",
    currentClassId: "class-a",
    preferredClassIds: ["class-b"],
    preferenceOrderMatters: true,
    requestType: "single",
    priority: 1,
    createdAt: new Date("2026-08-28T00:00:00.000Z"),
    subjectId: "subject-1",
  },
  {
    requestId: "b",
    userId: "user-b",
    currentClassId: "class-b",
    preferredClassIds: ["class-a"],
    preferenceOrderMatters: true,
    requestType: "single",
    priority: 1,
    createdAt: new Date("2026-08-28T00:00:00.000Z"),
    subjectId: "subject-1",
  },
];

afterEach(() => vi.restoreAllMocks());

test("assembles cycle processing time from the orchestration start", () => {
  vi.spyOn(Date, "now").mockReturnValue(1_500);

  const match = assembleCycleMatch(
    ["a", "b"],
    buildCompatibilityGraph(requests),
    "subject-1",
    1_000
  );

  assert.equal(match?.processingTime, 500);
});

test("warns when a malformed cycle has no edge", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

  const match = assembleCycleMatch(
    ["a", "missing"],
    buildCompatibilityGraph(requests),
    "subject-1",
    1_000
  );

  assert.equal(match, null);
  assert.deepEqual(warn.mock.calls, [["⚠️ Missing edge from a to missing"]]);
});

test("warns when a malformed cycle has no request details", () => {
  const edge = buildCompatibilityGraph(requests).outgoingEdges("a")[0];
  assert.ok(edge);
  const graph: Graph<MatchingRequest, CompatibilityEdge> = {
    size: 0,
    edgeCount: 1,
    addVertex: () => undefined,
    addEdge: () => undefined,
    vertex: () => undefined,
    vertices: () => new Map<string, MatchingRequest>().entries(),
    outgoingEdges: () => [edge],
  };
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

  const match = assembleCycleMatch(["a", "b"], graph, "subject-1", 1_000);

  assert.equal(match, null);
  assert.deepEqual(warn.mock.calls, [["⚠️ Request details not found for a"]]);
});
