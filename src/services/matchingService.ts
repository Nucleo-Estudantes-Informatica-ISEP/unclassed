import prisma from "@/lib/prisma";

interface MatchParticipant {
  userId: string;
  fromClass: string;
  toClass: string;
  requestId: string;
  requestType: "single" | "bundle";
}

interface MatchResult {
  pattern: "DIRECT" | "THREE_WAY" | "MULTI_WAY";
  participants: MatchParticipant[];
  singleSwapRequestIds: string[];
  bundleSwapRequestIds: string[];
}

interface GraphNode {
  requestId: string;
  userId: string;
  currentClassId: string;
  preferredClassIds: string[];
  requestType: "single" | "bundle";
}

interface GraphEdge {
  from: string; // request ID
  to: string;   // request ID
  weight: number; // preference order (lower is better)
}

export class MatchingService {
  /**
   * Main entry point - finds all possible matches using graph algorithms
   */
  async findAllMatches(): Promise<MatchResult[]> {
    const matches: MatchResult[] = [];
    
    // Find single swap matches using graph approach
    const singleMatches = await this.findSingleSwapMatchesGraph();
    matches.push(...singleMatches);
    
    // Find bundle swap matches using graph approach  
    const bundleMatches = await this.findBundleSwapMatchesGraph();
    matches.push(...bundleMatches);
    
    return matches;
  }

  /**
   * Find single swap matches using graph-based cycle detection
   */
  private async findSingleSwapMatchesGraph(): Promise<MatchResult[]> {
    const requests = await prisma.singleSwapRequest.findMany({
      where: { status: "ACTIVE" },
      include: {
        user: { select: { id: true, name: true } },
        subject: { select: { id: true, code: true } }
      }
    });

    // Group by subject since swaps only happen within the same subject
    const requestsBySubject = this.groupBy(requests, 'subjectId');
    const matches: MatchResult[] = [];

    for (const [subjectId, subjectRequests] of requestsBySubject) {
      const subjectMatches = this.findMatchesInGraph(
        subjectRequests.map(r => ({
          requestId: r.id,
          userId: r.userId,
          currentClassId: r.currentClassId,
          preferredClassIds: r.preferredClassIds,
          requestType: "single" as const
        }))
      );
      matches.push(...subjectMatches);
    }

    return matches;
  }

  /**
   * Find bundle swap matches using graph-based cycle detection
   */
  private async findBundleSwapMatchesGraph(): Promise<MatchResult[]> {
    const requests = await prisma.bundleSwapRequest.findMany({
      where: { status: "ACTIVE" },
      include: {
        user: { select: { id: true, name: true } },
        currentClass: { select: { id: true, name: true, year: true } }
      }
    });

    // Group by year since bundle swaps only happen within the same year
    const requestsByYear = this.groupBy(requests, (r: any) => r.currentClass.year);
    const matches: MatchResult[] = [];

    for (const [year, yearRequests] of requestsByYear) {
      const yearMatches = this.findMatchesInGraph(
        yearRequests.map((r: any) => ({
          requestId: r.id,
          userId: r.userId,
          currentClassId: r.currentClassId,
          preferredClassIds: r.preferredClassIds,
          requestType: "bundle" as const
        }))
      );
      matches.push(...yearMatches);
    }

    return matches;
  }

  /**
   * Core graph algorithm - finds all cycles in the preference graph
   */
  private findMatchesInGraph(nodes: GraphNode[]): MatchResult[] {
    const matches: MatchResult[] = [];
    const graph = this.buildPreferenceGraph(nodes);
    const nodeMap = this.createNodeMap(nodes);
    
    // Find all cycles using Johnson's algorithm (simplified version)
    const allCycles = this.findAllCycles(graph, nodeMap);
    
    // Convert cycles to matches
    for (const cycle of allCycles) {
      const match = this.convertCycleToMatch(cycle, nodeMap);
      if (match) {
        matches.push(match);
      }
    }

    return matches;
  }

  /**
   * Build directed graph where edges represent "wants to swap with"
   */
  private buildPreferenceGraph(nodes: GraphNode[]): Map<string, GraphEdge[]> {
    const graph = new Map<string, GraphEdge[]>();
    
    // Initialize adjacency list
    nodes.forEach(node => {
      graph.set(node.requestId, []);
    });

    // Build edges: A -> B if A wants B's class
    nodes.forEach(nodeA => {
      nodes.forEach(nodeB => {
        if (nodeA.requestId === nodeB.requestId) return;
        
        // Check if A wants B's class
        const preferenceIndex = nodeA.preferredClassIds.indexOf(nodeB.currentClassId);
        if (preferenceIndex !== -1) {
          const edge: GraphEdge = {
            from: nodeA.requestId,
            to: nodeB.requestId,
            weight: preferenceIndex // Lower index = higher preference
          };
          graph.get(nodeA.requestId)!.push(edge);
        }
      });
    });

    return graph;
  }

  /**
   * Find all cycles in the graph using DFS with backtracking
   */
  private findAllCycles(
    graph: Map<string, GraphEdge[]>, 
    nodeMap: Map<string, GraphNode>
  ): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (nodeId: string) => {
      if (recursionStack.has(nodeId)) {
        // Found a cycle - extract it from the path
        const cycleStartIndex = path.indexOf(nodeId);
        if (cycleStartIndex !== -1) {
          const cycle = path.slice(cycleStartIndex);
          if (cycle.length >= 2 && cycle.length <= 10) { // Reasonable cycle limits
            cycles.push([...cycle]);
          }
        }
        return;
      }

      if (visited.has(nodeId)) return;

      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const neighbors = graph.get(nodeId) || [];
      // Sort by preference (weight) to prioritize better matches
      const sortedNeighbors = neighbors.sort((a, b) => a.weight - b.weight);
      
      for (const edge of sortedNeighbors) {
        dfs(edge.to);
      }

      recursionStack.delete(nodeId);
      path.pop();
    };

    // Try starting from each node
    Array.from(nodeMap.keys()).forEach(nodeId => {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    });

    return this.deduplicateCycles(cycles);
  }

  /**
   * Convert a cycle of request IDs to a match result
   */
  private convertCycleToMatch(cycle: string[], nodeMap: Map<string, GraphNode>): MatchResult | null {
    if (cycle.length < 2) return null;

    const participants: MatchParticipant[] = [];
    const singleSwapRequestIds: string[] = [];
    const bundleSwapRequestIds: string[] = [];

    for (let i = 0; i < cycle.length; i++) {
      const currentId = cycle[i];
      const nextId = cycle[(i + 1) % cycle.length];
      
      const currentNode = nodeMap.get(currentId);
      const nextNode = nodeMap.get(nextId);
      
      if (!currentNode || !nextNode) continue;

      participants.push({
        userId: currentNode.userId,
        fromClass: currentNode.currentClassId,
        toClass: nextNode.currentClassId,
        requestId: currentId,
        requestType: currentNode.requestType
      });

      if (currentNode.requestType === "single") {
        singleSwapRequestIds.push(currentId);
      } else {
        bundleSwapRequestIds.push(currentId);
      }
    }

    // Determine pattern based on cycle length
    let pattern: "DIRECT" | "THREE_WAY" | "MULTI_WAY";
    if (cycle.length === 2) {
      pattern = "DIRECT";
    } else if (cycle.length === 3) {
      pattern = "THREE_WAY";
    } else {
      pattern = "MULTI_WAY";
    }

    return {
      pattern,
      participants,
      singleSwapRequestIds,
      bundleSwapRequestIds
    };
  }

  /**
   * Remove duplicate cycles (same participants, different starting points)
   */
  private deduplicateCycles(cycles: string[][]): string[][] {
    const normalized = cycles.map(cycle => {
      // Normalize by starting with the lexicographically smallest ID
      const minIndex = cycle.indexOf(Math.min(...cycle));
      return [...cycle.slice(minIndex), ...cycle.slice(0, minIndex)];
    });

    const unique = new Map<string, string[]>();
    normalized.forEach(cycle => {
      const key = cycle.join('-');
      if (!unique.has(key)) {
        unique.set(key, cycle);
      }
    });

    return Array.from(unique.values());
  }

  /**
   * Helper function to group array by key
   */
  private groupBy<T>(array: T[], keyFn: string | ((item: T) => any)): Map<any, T[]> {
    const result = new Map();
    
    array.forEach(item => {
      const key = typeof keyFn === 'string' ? (item as any)[keyFn] : keyFn(item);
      
      if (!result.has(key)) {
        result.set(key, []);
      }
      result.get(key).push(item);
    });
    
    return result;
  }

  /**
   * Create a map of request ID to node for quick lookup
   */
  private createNodeMap(nodes: GraphNode[]): Map<string, GraphNode> {
    const map = new Map<string, GraphNode>();
    nodes.forEach(node => {
      map.set(node.requestId, node);
    });
    return map;
  }

  /**
   * Create a match in the database
   */
  async createMatch(matchResult: MatchResult): Promise<any> {
    const matchType = matchResult.singleSwapRequestIds.length > 0 ? "SINGLE" : "BUNDLE";
    
    const match = await prisma.match.create({
      data: {
        matchType,
        swapPattern: matchResult.pattern,
        status: "PROPOSED",
        participants: matchResult.participants,
        singleSwapRequestIds: matchResult.singleSwapRequestIds,
        bundleSwapRequestIds: matchResult.bundleSwapRequestIds
      }
    });

    // Update request statuses to MATCHED
    if (matchResult.singleSwapRequestIds.length > 0) {
      await prisma.singleSwapRequest.updateMany({
        where: { id: { in: matchResult.singleSwapRequestIds } },
        data: { status: "MATCHED", lastProcessed: new Date() }
      });
    }

    if (matchResult.bundleSwapRequestIds.length > 0) {
      await prisma.bundleSwapRequest.updateMany({
        where: { id: { in: matchResult.bundleSwapRequestIds } },
        data: { status: "MATCHED", lastProcessed: new Date() }
      });
    }

    return match;
  }

  /**
   * Run the matching algorithm and create matches
   */
  async runMatchingAlgorithm(): Promise<any[]> {
    console.log("Starting matching algorithm...");
    
    const matches = await this.findAllMatches();
    console.log(`Found ${matches.length} potential matches`);
    
    const createdMatches = [];
    
    for (const match of matches) {
      try {
        const createdMatch = await this.createMatch(match);
        createdMatches.push(createdMatch);
        console.log(`Created ${match.pattern} match with ${match.participants.length} participants`);
      } catch (error) {
        console.error("Error creating match:", error);
        // Continue with other matches even if one fails
      }
    }
    
    console.log(`Successfully created ${createdMatches.length} matches`);
    return createdMatches;
  }

  /**
   * Get match statistics
   */
  async getMatchingStats(): Promise<{
    totalActiveRequests: number;
    totalMatches: number;
    matchesByPattern: Record<string, number>;
    matchesByType: Record<string, number>;
  }> {
    const [singleRequests, bundleRequests, matches] = await Promise.all([
      prisma.singleSwapRequest.count({ where: { status: "ACTIVE" } }),
      prisma.bundleSwapRequest.count({ where: { status: "ACTIVE" } }),
      prisma.match.findMany({ select: { swapPattern: true, matchType: true } })
    ]);

    const matchesByPattern = matches.reduce((acc, match) => {
      acc[match.swapPattern] = (acc[match.swapPattern] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const matchesByType = matches.reduce((acc, match) => {
      acc[match.matchType] = (acc[match.matchType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalActiveRequests: singleRequests + bundleRequests,
      totalMatches: matches.length,
      matchesByPattern,
      matchesByType
    };
  }
}
