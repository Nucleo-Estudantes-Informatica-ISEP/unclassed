import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";

import * as bundleSwapRequestRepo from "@/application/repositories/bundleSwapRequestRepository";
import * as classRepo from "@/application/repositories/classRepository";
import * as graphPartitionRepo from "@/application/repositories/graphPartitionRepository";
import * as matchRepo from "@/application/repositories/matchRepository";
import * as singleSwapRequestRepo from "@/application/repositories/singleSwapRequestRepository";
import * as subjectRepo from "@/application/repositories/subjectRepository";
import * as userRepo from "@/application/repositories/userRepository";
import type { Graph } from "@/domain/graph/graph";
import {
  buildCompatibilityGraph,
  type CompatibilityEdge,
  type MatchingRequest,
} from "@/domain/matching/algorithms";

import {
  assembleCycleMatch,
  MatchingOrchestrator,
} from "./matchingOrchestrator";

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
  assert.deepEqual(warn.mock.calls, [["Missing edge from a to missing"]]);
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
  assert.deepEqual(warn.mock.calls, [["Request details not found for a"]]);
});

test("getGraphSnapshot preserves nodes and compatibility edges", async () => {
  const createdAt = new Date("2026-09-01T12:00:00.000Z");

  vi.spyOn(graphPartitionRepo, "findUnique").mockResolvedValue({
    id: "partition-1",
    partitionKey: "subject-1",
    ticketType: "SPECIFIC_CLASS",
    subjectId: "subject-1",
    year: null,
    activeRequests: 3,
    priority: 1,
    lastProcessed: null,
    avgProcessingTime: null,
    successRate: null,
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
    createdAt,
    updatedAt: createdAt,
  });

  vi.spyOn(singleSwapRequestRepo, "findMany").mockResolvedValue([
    {
      id: "single-a",
      userId: "user-a",
      currentClassId: "class-a",
      preferredClassIds: ["class-b"],
      preferenceOrderMatters: true,
      priority: 1,
      createdAt,
      subjectId: "subject-1",
      graphPartition: "subject-1",
      status: "ACTIVE",
    },
    {
      id: "single-b",
      userId: "user-b",
      currentClassId: "class-b",
      preferredClassIds: ["class-a"],
      preferenceOrderMatters: true,
      priority: 1,
      createdAt,
      subjectId: "subject-1",
      graphPartition: "subject-1",
      status: "ACTIVE",
    },
  ] as never);

  vi.spyOn(bundleSwapRequestRepo, "findMany").mockResolvedValue([
    {
      id: "bundle-c",
      userId: "user-c",
      currentClassId: "class-c",
      preferredClassIds: ["class-a"],
      preferenceOrderMatters: true,
      priority: 2,
      createdAt,
      graphPartition: "subject-1",
      status: "ACTIVE",
    },
  ] as never);

  // No users are excluded by an already accepted permanent match.
  vi.spyOn(matchRepo, "findMany").mockResolvedValue([]);

  vi.spyOn(userRepo, "findMany").mockResolvedValue([
    { id: "user-a", name: "Alice" },
    { id: "user-b", name: "Bob" },
    { id: "user-c", name: "Carol" },
  ] as never);

  vi.spyOn(classRepo, "findManyByIds").mockResolvedValue([
    { id: "class-a", name: "Class A" },
    { id: "class-b", name: "Class B" },
    { id: "class-c", name: "Class C" },
  ] as never);

  vi.spyOn(subjectRepo, "findManyByIds").mockResolvedValue([
    { id: "subject-1", name: "Algorithms" },
  ] as never);

  const orchestrator = new MatchingOrchestrator();
  const snapshot = await orchestrator.getGraphSnapshot("subject-1");

  assert.deepEqual(
    snapshot.nodes.map((node) => ({
      id: node.id,
      userId: node.userId,
      userName: node.userName,
      currentClassId: node.currentClassId,
      currentClassName: node.currentClassName,
      requestType: node.requestType,
      subjectName: node.subjectName,
    })),
    [
      {
        id: "single-a",
        userId: "user-a",
        userName: "Alice",
        currentClassId: "class-a",
        currentClassName: "Class A",
        requestType: "single",
        subjectName: "Algorithms",
      },
      {
        id: "single-b",
        userId: "user-b",
        userName: "Bob",
        currentClassId: "class-b",
        currentClassName: "Class B",
        requestType: "single",
        subjectName: "Algorithms",
      },
      {
        id: "bundle-c",
        userId: "user-c",
        userName: "Carol",
        currentClassId: "class-c",
        currentClassName: "Class C",
        requestType: "bundle",
        subjectName: undefined,
      },
    ]
  );

  assert.deepEqual(
    snapshot.edges.map((edge) => ({
      from: edge.from,
      to: edge.to,
      weight: edge.weight,
      satisfactionScore: edge.satisfactionScore,
      fromClassId: edge.fromClassId,
      fromClassName: edge.fromClassName,
      toClassId: edge.toClassId,
      toClassName: edge.toClassName,
    })),
    [
      {
        from: "single-a",
        to: "single-b",
        weight: 1,
        satisfactionScore: 1,
        fromClassId: "class-a",
        fromClassName: "Class A",
        toClassId: "class-b",
        toClassName: "Class B",
      },
      {
        from: "single-b",
        to: "single-a",
        weight: 1,
        satisfactionScore: 1,
        fromClassId: "class-b",
        fromClassName: "Class B",
        toClassId: "class-a",
        toClassName: "Class A",
      },
      {
        from: "bundle-c",
        to: "single-a",
        weight: 0.6666666666666666,
        satisfactionScore: 1,
        fromClassId: "class-c",
        fromClassName: "Class C",
        toClassId: "class-a",
        toClassName: "Class A",
      },
    ]
  );
});