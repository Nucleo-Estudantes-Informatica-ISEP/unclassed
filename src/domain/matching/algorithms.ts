import type { Graph } from "@/domain/graph/graph";
import { MapGraph } from "@/domain/graph/mapGraph";

export interface MatchingRequest {
  requestId: string;
  userId: string;
  currentClassId: string;
  preferredClassIds: string[];
  preferenceOrderMatters: boolean | undefined;
  requestType: "single" | "bundle";
  priority: number;
  createdAt: Date;
  subjectId?: string;
}

export interface CompatibilityEdge {
  weight: number;
  compatibility: number;
  fromClassId: string;
  toClassId: string;
  satisfactionScore: number;
}

export interface MatchParticipant {
  userId: string;
  fromClass: string;
  toClass: string;
  requestId: string;
  requestType: "single" | "bundle";
  satisfactionScore: number;
}

export interface CycleMatch {
  pattern: "DIRECT" | "THREE_WAY" | "MULTI_WAY";
  participants: MatchParticipant[];
  satisfactionScore: number;
  processingTime: number;
  isProvisional: false;
  graphPartition: string;
  singleSwapRequestIds: string[];
  bundleSwapRequestIds: string[];
}

export type CycleFailure =
  | {
      reason: "missing-edge";
      requestId: string;
      nextRequestId: string;
    }
  | {
      reason: "missing-request";
      requestId: string;
    };

export interface RequestAvailability {
  id: string;
  status: string;
  provisionalMatchId?: string | null;
}

export function areAllRequestsAvailable(
  expectedIds: string[],
  requests: RequestAvailability[]
): boolean {
  return (
    requests.length === expectedIds.length &&
    requests.every(
      (request) =>
        expectedIds.includes(request.id) &&
        request.status === "ACTIVE" &&
        !request.provisionalMatchId
    )
  );
}

export function getIndividualSatisfaction(
  request: MatchingRequest,
  targetClassId: string
): number {
  const preferenceIndex = request.preferredClassIds.indexOf(targetClassId);
  if (preferenceIndex === -1) return 0;
  if (!request.preferenceOrderMatters) return 1;
  if (request.preferredClassIds.length === 1) return 1;

  return [1, 0.85, 0.7, 0.55, 0.4, 0.25][preferenceIndex] ?? 0.1;
}

export function calculateEdgeWeight(
  from: MatchingRequest,
  to: MatchingRequest
): number {
  const satisfaction = getIndividualSatisfaction(from, to.currentClassId);
  return satisfaction * ((4 - from.priority) / 3);
}

export function canSwapDirectly(
  first: MatchingRequest,
  second: MatchingRequest
) {
  return (
    first.preferredClassIds.includes(second.currentClassId) &&
    second.preferredClassIds.includes(first.currentClassId)
  );
}

export function calculateCycleSatisfaction(requests: MatchingRequest[]) {
  const total = requests.reduce((score, request, index) => {
    const next = requests[(index + 1) % requests.length];
    const preferenceIndex = request.preferredClassIds.indexOf(
      next.currentClassId
    );
    return preferenceIndex === -1
      ? Number.NEGATIVE_INFINITY
      : score + 1 - preferenceIndex / request.preferredClassIds.length;
  }, 0);

  return Number.isFinite(total) ? total / requests.length : 0;
}

export function buildCompatibilityGraph(
  requests: MatchingRequest[]
): MapGraph<MatchingRequest, CompatibilityEdge> {
  const graph = new MapGraph<MatchingRequest, CompatibilityEdge>();

  for (const request of requests) graph.addVertex(request.requestId, request);

  for (const request of requests) {
    for (const other of requests) {
      if (
        other.requestId === request.requestId ||
        !request.preferredClassIds.includes(other.currentClassId)
      ) {
        continue;
      }

      graph.addEdge(request.requestId, other.requestId, {
        weight: calculateEdgeWeight(request, other),
        compatibility: 1,
        fromClassId: request.currentClassId,
        toClassId: other.currentClassId,
        satisfactionScore: getIndividualSatisfaction(
          request,
          other.currentClassId
        ),
      });
    }
  }

  return graph;
}

export function findCycles<V, E>(
  graph: Graph<V, E>,
  startId: string,
  exactLength: number
): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const path: string[] = [];

  const visit = (currentId: string, depth: number) => {
    if (depth > exactLength) return;
    path.push(currentId);
    visited.add(currentId);

    for (const edge of graph.outgoingEdges(currentId)) {
      if (depth === exactLength && edge.to === startId) {
        cycles.push([...path]);
      } else if (depth < exactLength && !visited.has(edge.to)) {
        visit(edge.to, depth + 1);
      }
    }

    path.pop();
    visited.delete(currentId);
  };

  visit(startId, 1);
  return cycles;
}

export function cycleToParticipants(
  cycle: string[],
  graph: Graph<MatchingRequest, CompatibilityEdge>
): MatchParticipant[] | CycleFailure {
  const participants: MatchParticipant[] = [];

  for (let index = 0; index < cycle.length; index++) {
    const requestId = cycle[index];
    const nextRequestId = cycle[(index + 1) % cycle.length];
    const request = graph.vertex(requestId);
    const edge = graph
      .outgoingEdges(requestId)
      .find(({ to }) => to === nextRequestId);

    if (!edge) {
      return { reason: "missing-edge", requestId, nextRequestId };
    }
    if (!request) return { reason: "missing-request", requestId };

    participants.push({
      userId: request.userId,
      fromClass: request.currentClassId,
      toClass: edge.value.toClassId,
      requestId,
      requestType: request.requestType,
      satisfactionScore: edge.value.satisfactionScore,
    });
  }

  return participants;
}

export function cycleToMatch(
  cycle: string[],
  graph: Graph<MatchingRequest, CompatibilityEdge>,
  graphPartition: string,
  processingTime: number
): CycleMatch | CycleFailure | null {
  const participants = cycleToParticipants(cycle, graph);
  if (!Array.isArray(participants)) return participants;
  if (!participants.length) return null;

  const requestType = participants[0].requestType;
  return {
    pattern:
      cycle.length === 2
        ? "DIRECT"
        : cycle.length === 3
          ? "THREE_WAY"
          : "MULTI_WAY",
    participants,
    satisfactionScore:
      participants.reduce(
        (total, participant) => total + participant.satisfactionScore,
        0
      ) / participants.length,
    processingTime,
    isProvisional: false,
    graphPartition,
    singleSwapRequestIds: requestType === "single" ? cycle : [],
    bundleSwapRequestIds: requestType === "bundle" ? cycle : [],
  };
}

export interface OverlappingMatch {
  id: string;
  status: string;
  isProvisional: boolean;
  satisfactionScore?: number | null;
}

export type MatchOverlapDecision<T extends OverlappingMatch> =
  | { action: "create"; supersede: T[] }
  | { action: "skip-committed"; supersede: [] }
  | { action: "skip-not-improved"; supersede: [] };

export function decideMatchOverlap<T extends OverlappingMatch>(
  isProvisional: boolean,
  satisfactionScore: number,
  existingMatches: T[],
  improvementThreshold = 0.05
): MatchOverlapDecision<T> {
  const committed = existingMatches.filter(
    (match) =>
      !match.isProvisional &&
      (match.status === "PROPOSED" || match.status === "ACCEPTED")
  );
  if (committed.length > 0) {
    return { action: "skip-committed", supersede: [] };
  }

  const provisional = existingMatches.filter(
    (match) =>
      match.isProvisional &&
      (match.status === "PROPOSED" || match.status === "PROVISIONAL")
  );
  if (!isProvisional) {
    return { action: "create", supersede: provisional };
  }

  const improvesEveryOverlap = provisional.every(
    (match) =>
      satisfactionScore - (match.satisfactionScore ?? 0) > improvementThreshold
  );
  return improvesEveryOverlap
    ? { action: "create", supersede: provisional }
    : { action: "skip-not-improved", supersede: [] };
}
