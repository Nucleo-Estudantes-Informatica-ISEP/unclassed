export interface GraphNode {
  requestId: string;
  userId: string;
  currentClassId: string;
  preferredClassIds: string[];
  preferenceOrderMatters?: boolean;
  requestType: "single" | "bundle";
  priority: number;
  createdAt: Date;
  subjectId?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  weight: number;
  compatibility: number;
  fromClassId: string;
  toClassId: string;
  satisfactionScore: number;
}

export function getIndividualSatisfaction(
  node: GraphNode,
  targetClassId: string
): number {
  const preferenceIndex = node.preferredClassIds.indexOf(targetClassId);
  if (preferenceIndex === -1) return 0;
  if (!node.preferenceOrderMatters) return 1;
  if (node.preferredClassIds.length === 1) return 1;

  return [1, 0.85, 0.7, 0.55, 0.4, 0.25][preferenceIndex] ?? 0.1;
}

export function calculateEdgeWeight(
  fromNode: GraphNode,
  toNode: GraphNode
): number {
  const satisfaction = getIndividualSatisfaction(
    fromNode,
    toNode.currentClassId
  );
  const priorityWeight = (4 - fromNode.priority) / 3;
  return satisfaction * priorityWeight;
}

export function buildRequestGraph(
  requests: GraphNode[]
): Map<string, GraphEdge[]> {
  const graph = new Map<string, GraphEdge[]>();

  for (const request of requests) {
    const edges = requests
      .filter(
        (other) =>
          other.requestId !== request.requestId &&
          request.preferredClassIds.includes(other.currentClassId)
      )
      .map((other) => ({
        from: request.requestId,
        to: other.requestId,
        weight: calculateEdgeWeight(request, other),
        compatibility: 1,
        fromClassId: request.currentClassId,
        toClassId: other.currentClassId,
        satisfactionScore: getIndividualSatisfaction(
          request,
          other.currentClassId
        ),
      }));
    graph.set(request.requestId, edges);
  }

  return graph;
}

export function findCyclesFromNode(
  nodeId: string,
  graph: Map<string, GraphEdge[]>,
  exactLength: number
): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const path: string[] = [];

  const visit = (currentNode: string, depth: number) => {
    if (depth > exactLength) return;
    path.push(currentNode);
    visited.add(currentNode);

    for (const edge of graph.get(currentNode) ?? []) {
      if (depth === exactLength && edge.to === nodeId) {
        cycles.push([...path]);
      } else if (depth < exactLength && !visited.has(edge.to)) {
        visit(edge.to, depth + 1);
      }
    }

    path.pop();
    visited.delete(currentNode);
  };

  visit(nodeId, 1);
  return cycles;
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
  if (!improvesEveryOverlap) {
    return { action: "skip-not-improved", supersede: [] };
  }

  return { action: "create", supersede: provisional };
}
