import type { Prisma } from "@prisma/client";

import prisma from "../lib/prisma";
import { emailService, MatchNotificationData } from "./emailService";

// ===== INTERFACES =====

interface GraphNode {
  requestId: string;
  userId: string;
  currentClassId: string;
  preferredClassIds: string[];
  preferenceOrderMatters?: boolean; // Whether preference order affects satisfaction
  requestType: "single" | "bundle";
  priority: number;
  createdAt: Date;
  subjectId?: string; // For single swap requests
}

interface GraphEdge {
  from: string;
  to: string;
  weight: number; // preference order + time decay
  compatibility: number; // 0-1 compatibility score
  fromClassId: string;
  toClassId: string;
  satisfactionScore: number;
}

interface MatchResult {
  pattern: "DIRECT" | "THREE_WAY" | "MULTI_WAY";
  participants: MatchParticipant[];
  satisfactionScore: number;
  processingTime: number;
  isProvisional: boolean;
  graphPartition: string;
  singleSwapRequestIds: string[];
  bundleSwapRequestIds: string[];
}

interface MatchParticipant {
  userId: string;
  fromClass: string;
  toClass: string;
  requestId: string;
  requestType: "single" | "bundle";
  satisfactionScore: number; // Individual satisfaction (0-1)
}

interface ProcessingContext {
  timeLimit: number; // Max processing time in ms
  startTime: number;
  processId: string;
  partition: GraphPartition;
}

interface GraphPartition {
  id: string;
  partitionKey: string;
  ticketType: "SPECIFIC_CLASS" | "ALL_CLASSES";
  subjectId?: string | null;
  year?: number | null;
  activeRequests: number;
  priority: number;
  lastProcessed?: Date | null;
  avgProcessingTime?: number | null;
  successRate?: number | null;
}

type ParticipantStatus = "accepted" | "rejected" | "pending" | undefined;

interface StoredParticipant {
  userId: string;
  fromClass: string;
  toClass: string;
  requestId: string;
  requestType: "single" | "bundle";
  satisfactionScore: number;
  status?: ParticipantStatus;
}

interface StoredMatch {
  id: string;
  status: "PROPOSED" | "ACCEPTED" | "REJECTED" | "UPGRADED" | string;
  isProvisional: boolean;
  provisionalUntil?: Date | null;
  satisfactionScore?: number | null;
  processingTime?: number | null;
  graphPartition?: string | null;
  participants: StoredParticipant[];
  singleSwapRequestIds?: string[];
  bundleSwapRequestIds?: string[];
  createdAt?: Date;
}

interface SingleSwapRequestRecord {
  id: string;
  userId: string;
  currentClassId: string;
  preferredClassIds: string[];
  preferenceOrderMatters?: boolean;
  requestType?: "single";
  priority: number;
  createdAt: Date;
  subjectId: string;
  graphPartition?: string;
  status?: string;
}

interface BundleSwapRequestRecord {
  id: string;
  userId: string;
  currentClassId: string;
  preferredClassIds: string[];
  preferenceOrderMatters?: boolean;
  requestType?: "bundle";
  priority: number;
  createdAt: Date;
  graphPartition?: string;
  status?: string;
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean | null;
  emailNotifications?: boolean | null;
}

const MATCH_NOTIFICATION_TYPE = "MATCH_FOUND";
const MATCH_NOTIFICATION_RESERVATION_TIMEOUT_MS = 15 * 60 * 1000;

interface ClassRecord {
  id: string;
  name: string;
  year?: number | null;
}

interface BatchProcessingResult {
  processedPartitions: number;
  matchesFound: number;
  totalProcessingTime: number;
  errors: string[];
}

interface AdvancedStats {
  partitions: number;
  activePartitions: number;
  totalActiveRequests: number;
  matches24h: number;
  provisionalMatches: number;
  averageSatisfactionScore: number;
  averageProcessingTime: number;
  partitionStats: Array<{
    partitionKey: string;
    ticketType: GraphPartition["ticketType"];
    activeRequests: number;
    successRate: number | null;
    avgProcessingTime: number | null;
  }>;
}

// ===== MAIN SERVICE =====

export class AdvancedMatchingService {
  private activeGraphs = new Map<string, unknown>(); // In-memory graph cache
  private readonly MAX_CYCLE_LENGTH = 10;
  private readonly PROCESSING_TIMEOUT = 30000; // 30 seconds
  private readonly DIRECT_MATCH_TIMEOUT = 5000; // 5 seconds
  private readonly PARTITION_LOCK_STALE_MS = 2 * 60 * 1000; // 2 minutes

  // ===== IMMEDIATE PROCESSING (<5 seconds) =====

  /**
   * Process immediate direct matches when new request arrives
   */
  async processImmediateMatches(requestId: string): Promise<MatchResult[]> {
    const startTime = Date.now();
    const context: ProcessingContext = {
      timeLimit: this.DIRECT_MATCH_TIMEOUT,
      startTime,
      processId: `immediate-${requestId}`,
      partition: await this.getRequestPartition(requestId),
    };

    try {
      console.log(`🚀 Starting immediate processing for request ${requestId}`);

      // Acquire partition lock for immediate processing to prevent race conditions
      const lockAcquired = await this.lockPartition(context.partition.id, context.processId);
      if (!lockAcquired) {
        console.log(`🔒 Skipping immediate processing for ${requestId}: partition ${context.partition.partitionKey} locked by another machine`);
        return [];
      }

      try {
        const matches = await this.findDirectMatches(requestId, context);

        if (matches.length > 0) {
          console.log(
            `✅ Found ${matches.length} immediate matches in ${Date.now() - startTime}ms`
          );

          return await this.createMatches(matches); // Use the calculated isProvisional from matches
        }

        console.log(`⏳ No immediate matches found for ${requestId}`);
        return [];
      } finally {
        // Always unlock the partition
        await this.unlockPartition(context.partition.id, context.processId);
      }
    } catch (error) {
      console.error(`❌ Immediate processing failed for ${requestId}:`, error);
      return [];
    }
  }

  /**
   * Find direct 2-way swaps only - Returns only the BEST match to avoid locking up other users
   */
  private async findDirectMatches(
    requestId: string,
    context: ProcessingContext
  ): Promise<MatchResult[]> {
    const request = await this.getRequestDetails(requestId);
    if (!request) return [];

    // Find compatible requests in the same partition
    const compatibleRequests = await this.findCompatibleRequests(
      request,
      context
    );
    let bestMatch: MatchResult | null = null;
    let bestSatisfactionScore = 0;

    for (const compatibleRequest of compatibleRequests) {
      // Check if processing time exceeded
      if (Date.now() - context.startTime > context.timeLimit) {
        console.log(`⏱️ Direct matching timeout reached`);
        break;
      }

      // Check for direct swap possibility
      const canSwapDirectly = this.canSwapDirectly(request, compatibleRequest);

      if (canSwapDirectly) {
        const satisfactionScore = this.calculateSatisfactionScore([
          request,
          compatibleRequest,
        ]);

        // Check if this is everyone's first choice (perfect match)
        const isFirstChoiceForAll =
          this.getIndividualSatisfaction(
            request,
            compatibleRequest.currentClassId
          ) === 1.0 &&
          this.getIndividualSatisfaction(
            compatibleRequest,
            request.currentClassId
          ) === 1.0;

        const matchCandidate: MatchResult = {
          pattern: "DIRECT",
          participants: [
            {
              userId: request.userId,
              fromClass: request.currentClassId,
              toClass: compatibleRequest.currentClassId,
              requestId: request.requestId,
              requestType: request.requestType,
              satisfactionScore: this.getIndividualSatisfaction(
                request,
                compatibleRequest.currentClassId
              ),
            },
            {
              userId: compatibleRequest.userId,
              fromClass: compatibleRequest.currentClassId,
              toClass: request.currentClassId,
              requestId: compatibleRequest.requestId,
              requestType: compatibleRequest.requestType,
              satisfactionScore: this.getIndividualSatisfaction(
                compatibleRequest,
                request.currentClassId
              ),
            },
          ],
          satisfactionScore,
          processingTime: Date.now() - context.startTime,
          isProvisional: !isFirstChoiceForAll, // Provisional if not perfect for everyone
          graphPartition: context.partition.partitionKey,
          singleSwapRequestIds:
            request.requestType === "single"
              ? [request.requestId, compatibleRequest.requestId]
              : [],
          bundleSwapRequestIds:
            request.requestType === "bundle"
              ? [request.requestId, compatibleRequest.requestId]
              : [],
        };

        // If this is a perfect match (100% satisfaction for both), return immediately
        if (isFirstChoiceForAll) {
          console.log(
            `🎯 Perfect match found (both get 1st choice) - stopping search`
          );
          return [matchCandidate];
        }

        // Otherwise, keep track of the best match so far
        if (satisfactionScore > bestSatisfactionScore) {
          bestMatch = matchCandidate;
          bestSatisfactionScore = satisfactionScore;
          console.log(
            `⭐ Better match found (${(satisfactionScore * 100).toFixed(1)}% satisfaction)`
          );
        }
      }
    }

    // Return the single best match, or empty array if no matches found
    if (bestMatch) {
      console.log(
        `✅ Best match selected with ${(bestSatisfactionScore * 100).toFixed(1)}% satisfaction`
      );
      return [bestMatch];
    }

    return [];
  }

  // ===== BATCH PROCESSING (15-30 minutes) =====

  /**
   * Run batch processing on all active partitions
   */
  async runBatchProcessing(): Promise<{
    processedPartitions: number;
    matchesFound: number;
    totalProcessingTime: number;
    errors: string[];
  }> {
    const startTime = Date.now();
    const results: BatchProcessingResult = {
      processedPartitions: 0,
      matchesFound: 0,
      totalProcessingTime: 0,
      errors: [],
    };

    try {
      // Get all active partitions, prioritized
      const partitions = await this.getActivePartitions();

      console.log(
        `🔄 Starting batch processing for ${partitions.length} partitions`
      );

      // Process per-class graphs first (higher frequency)
      const specificClassPartitions = partitions.filter(
        (p) => p.ticketType === "SPECIFIC_CLASS"
      );
      const allClassesPartitions = partitions.filter(
        (p) => p.ticketType === "ALL_CLASSES"
      );

      // Process specific class partitions (every 10 min)
      for (const partition of specificClassPartitions) {
        if (this.shouldProcessPartition(partition, 10 * 60 * 1000)) {
          // 10 minutes
          await this.processBatchPartition(partition, results);
        }
      }

      // Process all-classes partitions (every 7 min)
      for (const partition of allClassesPartitions) {
        if (this.shouldProcessPartition(partition, 7 * 60 * 1000)) {
          // 7 minutes
          await this.processBatchPartition(partition, results);
        }
      }

      results.totalProcessingTime = Date.now() - startTime;
      console.log(
        `✅ Batch processing completed: ${results.matchesFound} matches in ${results.totalProcessingTime}ms`
      );
    } catch (error) {
      results.errors.push(`Batch processing failed: ${String(error)}`);
      console.error("❌ Batch processing error:", error);
    }

    return results;
  }

  /**
   * Process a single partition with time boxing
   */
  private async processBatchPartition(
    partition: GraphPartition,
    results: BatchProcessingResult
  ): Promise<void> {
    const startTime = Date.now();
    const context: ProcessingContext = {
      timeLimit: this.PROCESSING_TIMEOUT,
      startTime,
      processId: `batch-${partition.id}`,
      partition,
    };

    try {
      // Lock partition for processing (distributed lock)
      const acquired = await this.lockPartition(partition.id, context.processId);
      if (!acquired) {
        console.log(
          `🔒 Skipping partition ${partition.partitionKey}: lock already held by another worker`
        );
        return;
      }

      console.log(
        `🔧 Processing partition ${partition.partitionKey} (${partition.activeRequests} active requests)`
      );

      // Build graph for this partition
      const graph = await this.buildPartitionGraph(partition);

      // Find direct and 3-way matches with greedy approach so simple swaps
      // are still recovered when immediate matching skips due to a lock.
      const matches = await this.findBatchMatches(graph, context);

      if (matches.length > 0) {
        const createdMatches = await this.createMatches(matches, false); // Not provisional
        results.matchesFound += createdMatches.length;
      }

      // Update partition statistics
      await this.updatePartitionStats(partition.id, {
        lastProcessed: new Date(),
        avgProcessingTime: Date.now() - startTime,
        successRate: matches.length / Math.max(partition.activeRequests, 1),
      });

      results.processedPartitions++;
    } catch (error) {
      results.errors.push(
        `Partition ${partition.partitionKey}: ${String(error)}`
      );
      console.error(
        `❌ Error processing partition ${partition.partitionKey}:`,
        error
      );
    } finally {
      // Always unlock partition
      await this.unlockPartition(partition.id, context.processId);
    }
  }

  /**
   * Find direct and 3-way matches using optimized cycle detection.
   * Direct 2-way swaps are prioritized because they are the simplest and most
   * reliable fallback when immediate matching was skipped.
   */
  private async findBatchMatches(
    graph: Map<string, GraphEdge[]>,
    context: ProcessingContext
  ): Promise<MatchResult[]> {
    const matches: MatchResult[] = [];
    const processed = new Set<string>();
    const candidateCycleLengths = [2, 3];

    for (const [nodeId] of Array.from(graph.entries())) {
      // Check timeout
      if (Date.now() - context.startTime > context.timeLimit) {
        console.log(`⏱️ Batch processing timeout reached`);
        break;
      }

      if (processed.has(nodeId)) continue;

      let matchedCurrentNode = false;

      for (const cycleLength of candidateCycleLengths) {
        if (matchedCurrentNode) {
          break;
        }

        const cycles = this.findCyclesFromNode(nodeId, graph, cycleLength);

        for (const cycle of cycles) {
          if (cycle.some((id: string) => processed.has(id))) {
            continue;
          }

          const matchResult = await this.convertCycleToMatch(
            cycle,
            graph,
            context
          );

          if (matchResult) {
            matches.push(matchResult);
            cycle.forEach((id: string) => processed.add(id));
            matchedCurrentNode = true;
            break;
          }
        }
      }
    }

    return matches;
  }

  // ===== PROVISIONAL MATCHING SYSTEM =====

  /**
   * Upgrade provisional matches with better alternatives
   */
  async upgradeProvisionalMatches(newMatches: MatchResult[]): Promise<void> {
    for (const newMatch of newMatches) {
      // Find existing provisional matches involving ANY of the same participants
      const existingProvisional = (
        await this.findProvisionalMatchesForUsers(
        newMatch.participants.map((p: MatchParticipant) => p.userId)
        )
      ).filter((m) => m.isProvisional);

      for (const existing of existingProvisional) {
        // Calculate satisfaction improvement threshold (must be at least 5% better)
        const improvementThreshold = 0.05;
        const satisfactionDiff =
          newMatch.satisfactionScore - (existing.satisfactionScore || 0);

        // Only upgrade when there is a real improvement.
        const shouldUpgrade = satisfactionDiff > improvementThreshold;

        if (shouldUpgrade) {
          console.log(
            `⬆️ Upgrading provisional match ${existing.id}: ${Math.round((existing.satisfactionScore || 0) * 100)}% → ${Math.round(newMatch.satisfactionScore * 100)}%`
          );

          // Mark old match as upgraded and reactivate its requests
          await prisma.match.update({
            where: { id: existing.id },
            data: { status: "UPGRADED" },
          });

          // Reactivate requests from the old match
          await this.reactivateRequestsFromMatch(existing);
        } else {
          console.log(
            `⏳ New match satisfaction (${Math.round(newMatch.satisfactionScore * 100)}%) not significantly better than existing (${Math.round((existing.satisfactionScore || 0) * 100)}%)`
          );
        }
      }
    }
  }

  /**
   * Expire old provisional matches
   */
  async expireProvisionalMatches(): Promise<number> {
    const now = new Date();
    const toExpire = (await prisma.match.findMany({
      where: {
        isProvisional: true,
        status: { in: ["PROPOSED", "PROVISIONAL"] },
        provisionalUntil: { lte: now },
      },
    })) as unknown as StoredMatch[];

    if (toExpire.length === 0) return 0;

    await prisma.match.updateMany({
      where: { id: { in: toExpire.map((m) => m.id) } },
      data: { status: "REJECTED", isProvisional: false },
    });

    // Reactivate all requests involved in the expired provisional matches
    for (const m of toExpire) {
      try {
        await this.reactivateRequestsFromMatch(m);
      } catch (e) {
        console.warn(`Failed to reactivate requests for expired match ${m.id}:`, e);
      }
    }

    console.log(`⌛ Expired ${toExpire.length} provisional matches`);
    return toExpire.length;
  }

  // ===== GRAPH MANAGEMENT =====

  /**
   * Get or create graph partition for a request
   */
  private async getRequestPartition(
    requestId: string
  ): Promise<GraphPartition> {
    const request = await this.getRequestDetails(requestId);
    if (!request) throw new Error(`Request ${requestId} not found`);

    let partitionKey: string;
    let ticketType: "SPECIFIC_CLASS" | "ALL_CLASSES";
    let subjectId: string | undefined;
    let year: number | undefined;

    if (request.requestType === "single") {
      // Get subject info
      const subject = await prisma.subject.findUnique({
        where: { id: request.subjectId },
        select: { id: true, year: true },
      });

      partitionKey = `subject-${request.subjectId}`;
      ticketType = "SPECIFIC_CLASS";
      subjectId = request.subjectId;
      year = subject?.year ?? undefined;
    } else {
      // Get class info for year
      const currentClass = await prisma.class.findUnique({
        where: { id: request.currentClassId },
        select: { year: true },
      });

      partitionKey = `year-${currentClass?.year as number | undefined}`;
      ticketType = "ALL_CLASSES";
      year = currentClass?.year ?? undefined;
    }

    // Get or create partition
    let partition = await prisma.graphPartition.findUnique({
      where: { partitionKey },
    });

    if (!partition) {
      partition = await prisma.graphPartition.create({
        data: {
          partitionKey,
          ticketType,
          subjectId,
          year,
          activeRequests: 0,
        },
      });
    }

    return partition;
  }

  /**
   * Update request when created/modified to set graph partition
   */
  async updateRequestPartition(
    requestId: string,
    requestType: "single" | "bundle"
  ): Promise<void> {
    const partition = await this.getRequestPartition(requestId);

    // Update request with partition info
    if (requestType === "single") {
      await prisma.singleSwapRequest.update({
        where: { id: requestId },
        data: {
          graphPartition: partition.partitionKey,
          ticketType: "SPECIFIC_CLASS",
        },
      });
    } else {
      await prisma.bundleSwapRequest.update({
        where: { id: requestId },
        data: {
          graphPartition: partition.partitionKey,
          ticketType: "ALL_CLASSES",
        },
      });
    }

    // Update partition request count
    await this.updatePartitionRequestCount(partition.partitionKey);
  }

  // ===== UTILITY METHODS =====

  private async getRequestDetails(
    requestId: string
  ): Promise<GraphNode | null> {
    // Try single swap request first
    const singleRequest = await prisma.singleSwapRequest.findUnique({
      where: { id: requestId },
      include: { subject: true },
    });

    if (singleRequest) {
      const sr = singleRequest as unknown as SingleSwapRequestRecord;
      return {
        requestId: sr.id,
        userId: sr.userId,
        currentClassId: sr.currentClassId,
        preferredClassIds: sr.preferredClassIds,
        preferenceOrderMatters: sr.preferenceOrderMatters,
        requestType: "single",
        priority: sr.priority,
        createdAt: sr.createdAt,
        subjectId: sr.subjectId,
      };
    }

    // Try bundle swap request
    const bundleRequest = await prisma.bundleSwapRequest.findUnique({
      where: { id: requestId },
    });

    if (bundleRequest) {
      const br = bundleRequest as unknown as BundleSwapRequestRecord;
      return {
        requestId: br.id,
        userId: br.userId,
        currentClassId: br.currentClassId,
        preferredClassIds: br.preferredClassIds,
        preferenceOrderMatters: br.preferenceOrderMatters,
        requestType: "bundle",
        priority: br.priority,
        createdAt: br.createdAt,
      };
    }

    return null;
  }

  private canSwapDirectly(requestA: GraphNode, requestB: GraphNode): boolean {
    // A wants B's class AND B wants A's class
    return (
      requestA.preferredClassIds.includes(requestB.currentClassId) &&
      requestB.preferredClassIds.includes(requestA.currentClassId)
    );
  }

  private calculateSatisfactionScore(nodes: GraphNode[]): number {
    // Calculate overall satisfaction score (0-1)
    let totalSatisfaction = 0;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const nextNode = nodes[(i + 1) % nodes.length];

      const preferenceIndex = node.preferredClassIds.indexOf(
        nextNode.currentClassId
      );
      if (preferenceIndex === -1) return 0; // Invalid match

      // Higher satisfaction for better preferences
      const satisfaction = 1 - preferenceIndex / node.preferredClassIds.length;
      totalSatisfaction += satisfaction;
    }

    return totalSatisfaction / nodes.length;
  }

  private getIndividualSatisfaction(
    node: GraphNode,
    targetClassId: string
  ): number {
    const preferenceIndex = node.preferredClassIds.indexOf(targetClassId);
    if (preferenceIndex === -1) return 0;

    // If order doesn't matter, all preferred classes have equal satisfaction
    if (!node.preferenceOrderMatters) {
      return 1.0; // 100% satisfaction for any preferred class
    }

    // Enhanced satisfaction scoring with exponential decay
    // 1st choice: 100%, 2nd: 85%, 3rd: 70%, 4th: 55%, etc.
    // This creates bigger differences between preferences
    const totalChoices = node.preferredClassIds.length;
    if (totalChoices === 1) return 1.0; // Only one choice = 100%

    // Exponential decay: each subsequent choice loses 15% more value
    const satisfactionLevels = [1.0, 0.85, 0.7, 0.55, 0.4, 0.25];
    return satisfactionLevels[preferenceIndex] || 0.1; // Minimum 10% for any valid choice
  }

  private calculateEdgeWeight(fromNode: GraphNode, toNode: GraphNode): number {
    // Calculate weight based on preference order and priority
    const satisfactionScore = this.getIndividualSatisfaction(
      fromNode,
      toNode.currentClassId
    );
    const priorityWeight = (4 - fromNode.priority) / 3; // Higher priority = lower number, higher weight
    const timeWeight = 1.0; // Could factor in request age if needed

    return satisfactionScore * priorityWeight * timeWeight;
  }

  private async findCompatibleRequests(
    request: GraphNode,
    context: ProcessingContext
  ): Promise<GraphNode[]> {
    if (request.requestType === "single") {
      const sr = request as GraphNode & { subjectId: string };
      const requests = (await prisma.singleSwapRequest.findMany({
        where: {
          status: "ACTIVE",
          graphPartition: context.partition.partitionKey,
          id: { not: request.requestId },
          subjectId: sr.subjectId,
        },
        include: { subject: true },
      })) as unknown as SingleSwapRequestRecord[];

      const filtered = await this.filterUsersWithAcceptedMatches(requests);

      return filtered.map((r: SingleSwapRequestRecord) => ({
        requestId: r.id,
        userId: r.userId,
        currentClassId: r.currentClassId,
        preferredClassIds: r.preferredClassIds,
        preferenceOrderMatters: r.preferenceOrderMatters,
        requestType: "single",
        priority: r.priority,
        createdAt: r.createdAt,
        subjectId: r.subjectId,
      }));
    }

    const requests = (await prisma.bundleSwapRequest.findMany({
      where: {
        status: "ACTIVE",
        graphPartition: context.partition.partitionKey,
        id: { not: request.requestId },
      },
    })) as unknown as BundleSwapRequestRecord[];

    const filtered = await this.filterUsersWithAcceptedMatches(requests);

    return filtered.map((r: BundleSwapRequestRecord) => ({
      requestId: r.id,
      userId: r.userId,
      currentClassId: r.currentClassId,
      preferredClassIds: r.preferredClassIds,
      preferenceOrderMatters: r.preferenceOrderMatters,
      requestType: "bundle",
      priority: r.priority,
      createdAt: r.createdAt,
    }));
  }

  private shouldProcessPartition(
    partition: GraphPartition,
    intervalMs: number
  ): boolean {
    if (!partition.lastProcessed) return true;

    const timeSinceLastProcess = Date.now() - partition.lastProcessed.getTime();
    return timeSinceLastProcess >= intervalMs;
  }

  private async lockPartition(
    partitionId: string,
    processId: string
  ): Promise<boolean> {
    // Attempt to acquire lock if free or stale
    const staleBefore = new Date(Date.now() - this.PARTITION_LOCK_STALE_MS);
    const res = await prisma.graphPartition.updateMany({
      where: {
        id: partitionId,
        OR: [
          { isLocked: false },
          {
            isLocked: true,
            lockedAt: { lt: staleBefore },
          },
        ],
      },
      data: {
        isLocked: true,
        lockedAt: new Date(),
        lockedBy: processId,
      },
    });
    return res.count === 1;
  }

  private async unlockPartition(partitionId: string, processId?: string): Promise<void> {
    // Release lock only if held by this process (if provided)
    await prisma.graphPartition.updateMany({
      where: processId ? { id: partitionId, lockedBy: processId } : { id: partitionId },
      data: {
        isLocked: false,
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  private async getActivePartitions(): Promise<GraphPartition[]> {
    const staleBefore = new Date(Date.now() - this.PARTITION_LOCK_STALE_MS);
    return await prisma.graphPartition.findMany({
      where: {
        activeRequests: { gt: 0 },
        OR: [
          { isLocked: false },
          {
            isLocked: true,
            lockedAt: { lt: staleBefore },
          },
        ],
      },
      orderBy: [{ priority: "asc" }, { activeRequests: "desc" }],
    });
  }

  /**
   * Public: Return a snapshot of the graph for a given partitionKey
   * Includes nodes (requests) and directed edges (preferences) with weights/satisfaction
   */
  async getGraphSnapshot(partitionKey: string): Promise<{
    partition: GraphPartition | null;
    partitionLabel?: string;
    nodes: Array<{
      id: string;
      userId: string;
      userName?: string;
      currentClassId: string;
      currentClassName?: string;
      preferredClassIds: string[];
      requestType: "single" | "bundle";
      priority: number;
      createdAt: Date;
      subjectId?: string;
      subjectName?: string;
    }>;
    edges: Array<{
      from: string;
      to: string;
      weight: number;
      satisfactionScore: number;
      fromClassId: string;
      fromClassName?: string;
      toClassId: string;
      toClassName?: string;
    }>;
  }> {
    // Find partition
    const partition = await prisma.graphPartition.findUnique({
      where: { partitionKey },
    });

    if (!partition) {
      return { partition: null, nodes: [], edges: [] };
    }

    // Build the list of active requests (nodes) mirroring buildPartitionGraph
    let requests: GraphNode[] = [];

    if (partition.ticketType === "SPECIFIC_CLASS") {
      const singleRequests = (await prisma.singleSwapRequest.findMany({
        where: {
          graphPartition: partition.partitionKey,
          status: "ACTIVE",
        },
        include: { subject: true },
      })) as unknown as SingleSwapRequestRecord[];

      const filtered = await this.filterUsersWithAcceptedMatches(singleRequests);

      requests = filtered.map((r: SingleSwapRequestRecord): GraphNode => ({
        requestId: r.id,
        userId: r.userId,
        currentClassId: r.currentClassId,
        preferredClassIds: r.preferredClassIds,
        requestType: "single",
        priority: r.priority,
        createdAt: r.createdAt,
        subjectId: r.subjectId,
      }));
    } else {
      const bundleRequests = (await prisma.bundleSwapRequest.findMany({
        where: {
          graphPartition: partition.partitionKey,
          status: "ACTIVE",
        },
      })) as unknown as BundleSwapRequestRecord[];

      const filtered = await this.filterUsersWithAcceptedMatches(bundleRequests);

      requests = filtered.map((r: BundleSwapRequestRecord): GraphNode => ({
        requestId: r.id,
        userId: r.userId,
        currentClassId: r.currentClassId,
        preferredClassIds: r.preferredClassIds,
        requestType: "bundle",
        priority: r.priority,
        createdAt: r.createdAt,
      }));
    }

    // Build edges
    const edges: Array<{
      from: string;
      to: string;
      weight: number;
      satisfactionScore: number;
      fromClassId: string;
      fromClassName?: string;
      toClassId: string;
      toClassName?: string;
    }> = [];

    for (const request of requests) {
      for (const other of requests) {
        if (request.requestId === other.requestId) continue;
        if (request.preferredClassIds.includes(other.currentClassId)) {
          const weight = this.calculateEdgeWeight(request, other);
          const satisfactionScore = this.getIndividualSatisfaction(
            request,
            other.currentClassId
          );
          edges.push({
            from: request.requestId,
            to: other.requestId,
            weight,
            satisfactionScore,
            fromClassId: request.currentClassId,
            toClassId: other.currentClassId,
          });
        }
      }
    }

    // Enrich with names
    const nodeUserIds = Array.from(new Set(requests.map((r) => r.userId)));
    const classIds = new Set<string>();
    requests.forEach((r) => classIds.add(r.currentClassId));
    edges.forEach((e) => { classIds.add(e.fromClassId); classIds.add(e.toClassId); });
    const subjectIds = Array.from(new Set(requests.map((r) => r.subjectId).filter(Boolean))) as string[];

    const [users, classes, subjects] = await Promise.all([
      nodeUserIds.length > 0
        ? prisma.user.findMany({ where: { id: { in: nodeUserIds } }, select: { id: true, name: true } })
        : Promise.resolve([] as { id: string; name: string }[]),
      classIds.size > 0
        ? prisma.class.findMany({ where: { id: { in: Array.from(classIds) } }, select: { id: true, name: true } })
        : Promise.resolve([] as { id: string; name: string }[]),
      subjectIds.length > 0
        ? prisma.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, name: true } })
        : Promise.resolve([] as { id: string; name: string }[]),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u.name]));
    const classMap = new Map(classes.map((c) => [c.id, c.name]));
    const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));

    const nodes = requests.map((r) => ({
      id: r.requestId,
      userId: r.userId,
      userName: userMap.get(r.userId),
      currentClassId: r.currentClassId,
      currentClassName: classMap.get(r.currentClassId),
      preferredClassIds: r.preferredClassIds,
      requestType: r.requestType,
      priority: r.priority,
      createdAt: r.createdAt,
      subjectId: r.subjectId,
      subjectName: r.subjectId ? subjectMap.get(r.subjectId) : undefined,
    }));

    const edgesWithNames = edges.map((e) => ({
      ...e,
      fromClassName: classMap.get(e.fromClassId),
      toClassName: classMap.get(e.toClassId),
    }));

    const partitionLabel = partition.ticketType === "SPECIFIC_CLASS"
      ? `Subject ${partition.subjectId || ""}`
      : `Year ${partition.year ?? ""}`;

    return { partition, partitionLabel, nodes, edges: edgesWithNames };
  }

  private async updatePartitionRequestCount(
    partitionKey: string
  ): Promise<void> {
    // Count active requests in this partition
    const [singleCount, bundleCount] = await Promise.all([
      prisma.singleSwapRequest.count({
        where: {
          graphPartition: partitionKey,
          status: "ACTIVE",
        },
      }),
      prisma.bundleSwapRequest.count({
        where: {
          graphPartition: partitionKey,
          status: "ACTIVE",
        },
      }),
    ]);

    await prisma.graphPartition.update({
      where: { partitionKey },
      data: { activeRequests: singleCount + bundleCount },
    });
  }

  private async updatePartitionStats(
    partitionId: string,
    stats: {
      lastProcessed: Date;
      avgProcessingTime: number;
      successRate: number;
    }
  ): Promise<void> {
    await prisma.graphPartition.update({
      where: { id: partitionId },
      data: stats,
    });
  }

  private async sendMatchNotifications(
    matchId: string,
    match: MatchResult
  ): Promise<void> {
    try {
      console.log(`📧 Sending match notifications for match ${matchId}`);

      // Get detailed user information for all participants
      const userIds = match.participants.map((p: MatchParticipant) => p.userId);
      const users = (await prisma.user.findMany({
        where: {
          id: { in: userIds },
          emailVerified: true,
          emailNotifications: true,
        },
      })) as unknown as UserRecord[];

      // Get subject information if it's a single swap match
      let subjects: string[] = [];
      if (match.singleSwapRequestIds.length > 0) {
        const subjectData = await prisma.singleSwapRequest.findMany({
          where: { id: { in: match.singleSwapRequestIds } },
          include: { subject: true },
        });
        subjects = Array.from(
          new Set(
            subjectData.map(
              (r: { subject: { name: string } }) => r.subject.name
            )
          )
        );
      }

      // Get class names
      const allClassIds = Array.from(
        new Set([
          ...match.participants.map((p: MatchParticipant) => p.fromClass),
          ...match.participants.map((p: MatchParticipant) => p.toClass),
        ])
      );
      const classes = (await prisma.class.findMany({
        where: { id: { in: allClassIds } },
      })) as unknown as ClassRecord[];
      const classMap = new Map<string, string>(
        classes.map((c: ClassRecord) => [c.id, c.name])
      );

      const baseUrl =
        process.env.APP_BASE_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3000";

      // Send notification to each participant
      for (const participant of match.participants) {
        const user = users.find((u: UserRecord) => u.id === participant.userId);
        if (!user) {
          console.log(
            `⚠️ User ${participant.userId} not found or notifications disabled`
          );
          continue;
        }

        const otherParticipants = match.participants
          .filter((p: MatchParticipant) => p.userId !== participant.userId)
          .map((p: MatchParticipant) => {
            const otherUser = users.find(
              (u: UserRecord) => u.id === p.userId
            );
            return otherUser ? otherUser.name : "Utilizador";
          });

        const notificationData: MatchNotificationData = {
          userName: user.name,
          matchType:
            match.singleSwapRequestIds.length > 0
              ? "Troca de Disciplina"
              : "Troca de Turma Completa",
          subjects,
          fromClass:
            classMap.get(participant.fromClass) || participant.fromClass,
          toClass: classMap.get(participant.toClass) || participant.toClass,
          otherParticipants,
          matchId,
          dashboardUrl: baseUrl,
        };

        const notificationReserved = await this.reserveMatchNotificationDelivery(
          matchId,
          user.id,
          user.email
        );

        if (!notificationReserved) {
          console.log(
            `⏭️ Match notification already handled or currently in progress for match ${matchId} to ${user.email}`
          );
          continue;
        }

        try {
          const emailSent = await emailService.sendMatchNotification(
            user.email,
            notificationData
          );

          if (emailSent) {
            await this.markMatchNotificationDeliverySent(matchId, user.id);
            console.log(`✅ Match notification sent to ${user.email}`);
            continue;
          }

          await this.markMatchNotificationDeliveryFailed(
            matchId,
            user.id,
            "Email service returned false"
          );
          console.log(`❌ Failed to send notification to ${user.email}`);
        } catch (error) {
          await this.markMatchNotificationDeliveryFailed(
            matchId,
            user.id,
            this.getErrorMessage(error)
          );
          console.error(
            `❌ Error sending notification to ${user.email} for match ${matchId}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error("Error sending match notifications:", error);
    }
  }

  private async reserveMatchNotificationDelivery(
    matchId: string,
    userId: string,
    email: string
  ): Promise<boolean> {
    const now = new Date();
    const staleReservationThreshold = new Date(
      now.getTime() - MATCH_NOTIFICATION_RESERVATION_TIMEOUT_MS
    );

    try {
      await prisma.matchNotificationDelivery.create({
        data: {
          matchId,
          userId,
          email,
          notificationType: MATCH_NOTIFICATION_TYPE,
          status: "SENDING",
          reservedAt: now,
          sentAt: null,
          lastError: null,
        },
      });
      return true;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        const existingDelivery = await prisma.matchNotificationDelivery.findUnique(
          {
            where: {
              matchId_userId_notificationType: {
                matchId,
                userId,
                notificationType: MATCH_NOTIFICATION_TYPE,
              },
            },
            select: {
              status: true,
              updatedAt: true,
            },
          }
        );

        if (!existingDelivery) {
          return false;
        }

        if (
          existingDelivery.status === "SENT" ||
          (existingDelivery.status === "SENDING" &&
            existingDelivery.updatedAt > staleReservationThreshold)
        ) {
          return false;
        }

        const reclaimedReservation =
          await prisma.matchNotificationDelivery.updateMany({
            where: {
              matchId,
              userId,
              notificationType: MATCH_NOTIFICATION_TYPE,
              OR: [
                { status: "FAILED" },
                {
                  status: "SENDING",
                  updatedAt: { lte: staleReservationThreshold },
                },
              ],
            },
            data: {
              email,
              status: "SENDING",
              reservedAt: now,
              sentAt: null,
              lastError: null,
            },
          });

        return reclaimedReservation.count > 0;
      }

      throw error;
    }
  }

  private async markMatchNotificationDeliverySent(
    matchId: string,
    userId: string
  ): Promise<void> {
    try {
      await prisma.matchNotificationDelivery.updateMany({
        where: {
          matchId,
          userId,
          notificationType: MATCH_NOTIFICATION_TYPE,
          status: "SENDING",
        },
        data: {
          status: "SENT",
          sentAt: new Date(),
          lastError: null,
        },
      });
    } catch (error) {
      console.warn(
        `Failed to mark match notification delivery as sent for match ${matchId} and user ${userId}:`,
        error
      );
    }
  }

  private async markMatchNotificationDeliveryFailed(
    matchId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    try {
      await prisma.matchNotificationDelivery.updateMany({
        where: {
          matchId,
          userId,
          notificationType: MATCH_NOTIFICATION_TYPE,
          status: "SENDING",
        },
        data: {
          status: "FAILED",
          lastError: reason.slice(0, 500),
        },
      });
    } catch (error) {
      console.warn(
        `Failed to mark match notification delivery as failed for match ${matchId} and user ${userId}:`,
        error
      );
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    );
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return "Unknown delivery error";
  }

  private async createMatches(
    matches: MatchResult[],
    globalIsProvisional?: boolean
  ): Promise<MatchResult[]> {
    const createdMatches: MatchResult[] = [];

    for (const match of matches) {
      try {
        // Use individual match isProvisional value, or fallback to global parameter
        let isProvisional =
          globalIsProvisional !== undefined
            ? globalIsProvisional
            : match.isProvisional;

        // Guard: prevent duplicate active proposals for the same participants.
        const userIds = match.participants.map((p: MatchParticipant) => p.userId);
        const existingForUsers = await this.findProvisionalMatchesForUsers(
          userIds
        );
        const committedOverlaps = existingForUsers.filter(
          (existing) =>
            !existing.isProvisional &&
            (existing.status === "PROPOSED" || existing.status === "ACCEPTED")
        );
        const provisionalOverlaps = existingForUsers.filter(
          (existing) =>
            existing.isProvisional &&
            (existing.status === "PROPOSED" ||
              existing.status === "PROVISIONAL")
        );

        if (committedOverlaps.length > 0) {
          console.log(
            `⏭️ Skipping match creation: committed overlap exists for users ${userIds.join(",")}`
          );
          continue;
        }

        if (provisionalOverlaps.length > 0) {
          if (!isProvisional) {
            // Permanent matches may supersede older provisional overlaps, but
            // never committed ones.
            for (const existing of provisionalOverlaps) {
              try {
                await prisma.match.update({
                  where: { id: existing.id },
                  data: { status: "UPGRADED" },
                });
                await this.reactivateRequestsFromMatch(existing);
              } catch (e) {
                console.warn(`Failed to upgrade prior provisional match ${existing.id}:`, e);
              }
            }
          } else {
            // New provisional: only create if it is strictly better than ALL existing overlapping ones
            const improvementThreshold = 0.05;
            const upgradableMatches = provisionalOverlaps.filter((existing) => {
              const satisfactionDiff =
                match.satisfactionScore - (existing.satisfactionScore || 0);
              return satisfactionDiff > improvementThreshold;
            });

            if (upgradableMatches.length !== provisionalOverlaps.length) {
              // Skip creating this provisional match unless it improves over all
              // active overlaps for the participating users.
              console.log(
                `⏭️ Skipping provisional match creation: not better than existing for users ${userIds.join(",")}`
              );
              continue;
            }

            // Upgrade all overlapping provisional matches now that improvement is guaranteed
            for (const existing of upgradableMatches) {
              try {
                await prisma.match.update({
                  where: { id: existing.id },
                  data: { status: "UPGRADED" },
                });
                await this.reactivateRequestsFromMatch(existing);
              } catch (e) {
                console.warn(`Failed to upgrade prior provisional match ${existing.id}:`, e);
              }
            }

            // Ensure created match remains provisional
            isProvisional = true;
          }
        }

        const provisionalUntil = isProvisional
          ? new Date(Date.now() + 6 * 60 * 60 * 1000) // 6 hours
          : undefined;

        // Use atomic transaction to prevent race conditions between multiple machines
        const result = await prisma.$transaction(async (tx) => {
          // Final check that requests are still ACTIVE (within transaction lock)
          if (match.singleSwapRequestIds.length > 0) {
            const singles = await tx.singleSwapRequest.findMany({
              where: { id: { in: match.singleSwapRequestIds } },
              select: { id: true, status: true, provisionalMatchId: true },
            });
            const allActive = singles.every((s) => s.status === "ACTIVE" && !s.provisionalMatchId);
            if (!allActive) {
              throw new Error('Single swap requests no longer active - race condition detected');
            }
          }
          
          if (match.bundleSwapRequestIds.length > 0) {
            const bundles = await tx.bundleSwapRequest.findMany({
              where: { id: { in: match.bundleSwapRequestIds } },
              select: { id: true, status: true, provisionalMatchId: true },
            });
            const allActive = bundles.every((b) => b.status === "ACTIVE" && !b.provisionalMatchId);
            if (!allActive) {
              throw new Error('Bundle swap requests no longer active - race condition detected');
            }
          }

          // Create the match atomically
          const createdMatch = await tx.match.create({
            data: {
              matchType:
                match.singleSwapRequestIds.length > 0 ? "SINGLE" : "BUNDLE",
              swapPattern: match.pattern,
              status: "PROPOSED",
              isProvisional,
              provisionalUntil,
              satisfactionScore: match.satisfactionScore,
              processingTime: match.processingTime,
              graphPartition: match.graphPartition,
              participants: match.participants as unknown as Prisma.InputJsonValue[],
              singleSwapRequestIds: match.singleSwapRequestIds,
              bundleSwapRequestIds: match.bundleSwapRequestIds,
            },
          });

          // Update request statuses atomically in same transaction
          if (match.singleSwapRequestIds.length > 0) {
            await tx.singleSwapRequest.updateMany({
              where: { id: { in: match.singleSwapRequestIds } },
              data: {
                status: "MATCHED", // Lock request while match is proposed (provisional or not)
                provisionalMatchId: createdMatch.id,
                provisionalUntil,
              },
            });
          }

          if (match.bundleSwapRequestIds.length > 0) {
            await tx.bundleSwapRequest.updateMany({
              where: { id: { in: match.bundleSwapRequestIds } },
              data: {
                status: "MATCHED", // Lock request while match is proposed (provisional or not)
                provisionalMatchId: createdMatch.id,
                provisionalUntil,
              },
            });
          }

          return { createdMatch, match };
        });

        createdMatches.push(result.match);

        // Send email notifications to all participants (outside transaction)
        await this.sendMatchNotifications(result.createdMatch.id, result.match);
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('race condition detected')) {
          console.log(`⚡ Race condition detected for match - skipping (another machine already processed these requests)`);
        } else {
          console.error(`❌ Error creating match:`, error);
        }
      }
    }

    // Update partition active request counts after creating matches
    const affectedPartitions = Array.from(
      new Set(matches.map((m: MatchResult) => m.graphPartition))
    );
    await Promise.all(
      affectedPartitions.map((partitionKey: string) =>
        this.updatePartitionRequestCount(partitionKey)
      )
    );

    return createdMatches;
  }

  private async findProvisionalMatches(
    participants: MatchParticipant[]
  ): Promise<StoredMatch[]> {
    const userIds = participants.map((p: MatchParticipant) => p.userId);
    return this.findProvisionalMatchesForUsers(userIds);
  }

  /**
   * Find active matches for specific user IDs.
   * Only active states are considered; upgraded/rejected history is ignored.
   */
  private async findProvisionalMatchesForUsers(
    userIds: string[]
  ): Promise<StoredMatch[]> {
    // For MongoDB with Prisma, we need to use a different approach to query JSON arrays
    const matches = (await prisma.match.findMany({
      where: {
        status: { in: ["PROPOSED", "ACCEPTED", "PROVISIONAL"] },
      },
    })) as unknown as StoredMatch[];

    // Filter matches client-side to check if any participants overlap
    return matches.filter((match: StoredMatch) => {
      const matchParticipants = match.participants as StoredParticipant[];
      return matchParticipants.some((p: StoredParticipant) =>
        userIds.includes(p.userId)
      );
    });
  }

  /**
   * Reactivate requests from an upgraded/cancelled match
   */
  private async reactivateRequestsFromMatch(match: StoredMatch): Promise<void> {
    console.log(`🔄 Reactivating requests from upgraded match ${match.id}`);

    // Reactivate single swap requests
    if (match.singleSwapRequestIds && match.singleSwapRequestIds.length > 0) {
      await prisma.singleSwapRequest.updateMany({
        where: { id: { in: match.singleSwapRequestIds } },
        data: {
          status: "ACTIVE",
          provisionalMatchId: null,
          provisionalUntil: null,
        },
      });
      console.log(
        `✅ Reactivated ${match.singleSwapRequestIds?.length || 0} single swap requests`
      );
    }

    // Reactivate bundle swap requests
    if (match.bundleSwapRequestIds && match.bundleSwapRequestIds.length > 0) {
      await prisma.bundleSwapRequest.updateMany({
        where: { id: { in: match.bundleSwapRequestIds } },
        data: {
          status: "ACTIVE",
          provisionalMatchId: null,
          provisionalUntil: null,
        },
      });
      console.log(
        `✅ Reactivated ${match.bundleSwapRequestIds?.length || 0} bundle swap requests`
      );
    }
  }

  // Graph building and cycle detection methods
  private async buildPartitionGraph(
    partition: GraphPartition
  ): Promise<Map<string, GraphEdge[]>> {
    const graph = new Map<string, GraphEdge[]>();

    try {
      console.log(`🔗 Building graph for partition ${partition.partitionKey}`);

      // Get all active requests in this partition
      let requests: GraphNode[];

      if (partition.ticketType === "SPECIFIC_CLASS") {
        // Single swap requests for specific subject
        const singleRequests = (await prisma.singleSwapRequest.findMany({
          where: {
            graphPartition: partition.partitionKey,
            status: "ACTIVE",
          },
          include: { subject: true },
        })) as unknown as SingleSwapRequestRecord[];

        // Filter out users with accepted matches
        const filteredSingleRequests =
          await this.filterUsersWithAcceptedMatches(singleRequests);

        requests = filteredSingleRequests.map(
          (r: SingleSwapRequestRecord): GraphNode => ({
            requestId: r.id,
            userId: r.userId,
            currentClassId: r.currentClassId,
            preferredClassIds: r.preferredClassIds,
            requestType: "single" as const,
            priority: r.priority,
            createdAt: r.createdAt,
            subjectId: r.subjectId,
          })
        );
      } else {
        // Bundle swap requests for year-based swaps
        const bundleRequests = (await prisma.bundleSwapRequest.findMany({
          where: {
            graphPartition: partition.partitionKey,
            status: "ACTIVE",
          },
        })) as unknown as BundleSwapRequestRecord[];

        // Filter out users with accepted matches
        const filteredBundleRequests =
          await this.filterUsersWithAcceptedMatches(bundleRequests);

        requests = filteredBundleRequests.map(
          (r: BundleSwapRequestRecord): GraphNode => ({
            requestId: r.id,
            userId: r.userId,
            currentClassId: r.currentClassId,
            preferredClassIds: r.preferredClassIds,
            requestType: "bundle" as const,
            priority: r.priority,
            createdAt: r.createdAt,
          })
        );
      }

      console.log(`📊 Found ${requests.length} active requests in partition`);

      // Build adjacency list representation
      for (const request of requests) {
        const edges: GraphEdge[] = [];

        // Find all requests that this request can potentially swap with
        for (const otherRequest of requests) {
          if (request.requestId === otherRequest.requestId) continue;

          // Check if current request wants other request's class
          if (request.preferredClassIds.includes(otherRequest.currentClassId)) {
            const weight = this.calculateEdgeWeight(request, otherRequest);

            edges.push({
              from: request.requestId,
              to: otherRequest.requestId,
              weight,
              compatibility: 1.0, // Default compatibility score
              fromClassId: request.currentClassId,
              toClassId: otherRequest.currentClassId,
              satisfactionScore: this.getIndividualSatisfaction(
                request,
                otherRequest.currentClassId
              ),
            });
          }
        }

        graph.set(request.requestId, edges);
      }

      console.log(
        `🔗 Built graph with ${graph.size} nodes and ${Array.from(graph.values()).reduce((sum: number, edges: GraphEdge[]) => sum + edges.length, 0)} edges`
      );

      return graph;
    } catch (error) {
      console.error(
        `❌ Error building graph for partition ${partition.partitionKey}:`,
        error
      );
      return new Map();
    }
  }

  private findCyclesFromNode(
    nodeId: string,
    graph: Map<string, GraphEdge[]>,
    maxLength: number
  ): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const path: string[] = [];

    const dfs = (currentNode: string, startNode: string, depth: number) => {
      if (depth > maxLength) return;

      path.push(currentNode);
      visited.add(currentNode);

      const edges = graph.get(currentNode) || [];

      for (const edge of edges) {
        if (depth === maxLength && edge.to === startNode) {
          // Found a cycle of exact length
          cycles.push([...path]);
        } else if (depth < maxLength && !visited.has(edge.to)) {
          // Continue DFS
          dfs(edge.to, startNode, depth + 1);
        }
      }

      // Backtrack
      path.pop();
      visited.delete(currentNode);
    };

    dfs(nodeId, nodeId, 1);

    return cycles;
  }

  private async convertCycleToMatch(
    cycle: string[],
    graph: Map<string, GraphEdge[]>,
    context: ProcessingContext
  ): Promise<MatchResult | null> {
    try {
      console.log(`🔄 Converting cycle to match: ${cycle.join(" → ")}`);

      const participants: MatchParticipant[] = [];
      let totalSatisfactionScore = 0;

      // Get detailed information for each participant in the cycle
      for (let i = 0; i < cycle.length; i++) {
        const currentRequestId = cycle[i];
        const nextRequestId = cycle[(i + 1) % cycle.length];

        // Get the edge from current to next
        const edges = graph.get(currentRequestId) || [];
        const edge = edges.find((e: GraphEdge) => e.to === nextRequestId);

        if (!edge) {
          console.warn(
            `⚠️ Missing edge from ${currentRequestId} to ${nextRequestId}`
          );
          return null;
        }

        // Get request details
        const requestDetails = await this.getRequestDetails(currentRequestId);
        if (!requestDetails) {
          console.warn(`⚠️ Request details not found for ${currentRequestId}`);
          return null;
        }

        participants.push({
          userId: requestDetails.userId,
          fromClass: requestDetails.currentClassId,
          toClass: edge.toClassId,
          requestId: currentRequestId,
          requestType: requestDetails.requestType,
          satisfactionScore: edge.satisfactionScore,
        });

        totalSatisfactionScore += edge.satisfactionScore;
      }

      const averageSatisfactionScore = totalSatisfactionScore / cycle.length;

      // Determine match type based on participant requests
      const matchType = participants[0].requestType;
      const swapPattern =
        cycle.length === 2
          ? "DIRECT"
          : cycle.length === 3
            ? "THREE_WAY"
            : "MULTI_WAY";

      const matchResult: MatchResult = {
        pattern: swapPattern as "DIRECT" | "THREE_WAY" | "MULTI_WAY",
        participants,
        satisfactionScore: averageSatisfactionScore,
        processingTime: Date.now() - context.startTime,
        isProvisional: false,
        graphPartition: context.partition.partitionKey,
        singleSwapRequestIds: matchType === "single" ? cycle : [],
        bundleSwapRequestIds: matchType === "bundle" ? cycle : [],
      };

      console.log(
        `✅ Created ${swapPattern} match with satisfaction score ${averageSatisfactionScore.toFixed(3)}`
      );

      return matchResult;
    } catch (error) {
      console.error(`❌ Error converting cycle to match:`, error);
      return null;
    }
  }

  /**
   * Filter out requests from users who have accepted matches
   * Keep users with provisional matches available for upgrades
   */
  private async filterUsersWithAcceptedMatches<T extends { userId: string }>(
    requests: T[]
  ): Promise<T[]> {
    if (requests.length === 0) return [];

    // Get all current matches where users have accepted (not just provisional)
    const acceptedMatches = (await prisma.match.findMany({
      where: {
        status: { in: ["PROPOSED", "ACCEPTED"] },
        isProvisional: false, // Only exclude users with permanent matches
      },
    })) as unknown as StoredMatch[];

    // Create set of user IDs who have accepted permanent matches
    const usersWithAcceptedMatches = new Set<string>();

    acceptedMatches.forEach((match: StoredMatch) => {
      const participants = match.participants as StoredParticipant[];
      participants.forEach((p: StoredParticipant) => {
        if (p.status === "accepted") {
          usersWithAcceptedMatches.add(p.userId);
        }
      });
    });

    // Filter out requests from users with accepted permanent matches
    // Users with provisional matches are still available for upgrades
    return requests.filter(
      (request: T) => !usersWithAcceptedMatches.has(request.userId)
    );
  }

  /**
   * Get comprehensive matching statistics
   */
  async getAdvancedStats(): Promise<AdvancedStats> {
    const [partitions, matches, activeRequests] = await Promise.all([
      prisma.graphPartition.findMany(),
      prisma.match.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      Promise.all([
        prisma.singleSwapRequest.count({ where: { status: "ACTIVE" } }),
        prisma.bundleSwapRequest.count({ where: { status: "ACTIVE" } }),
      ]),
    ]);

    const m = matches as unknown as StoredMatch[];
    const totalMatches = m.length || 1;

    return {
      partitions: partitions.length,
      activePartitions: partitions.filter((p: GraphPartition) => p.activeRequests > 0).length,
      totalActiveRequests: (activeRequests[0] as number) + (activeRequests[1] as number),
      matches24h: m.length,
      provisionalMatches: m.filter((mm: StoredMatch) => mm.isProvisional).length,
      averageSatisfactionScore:
        m.reduce(
          (sum: number, mm: StoredMatch) => sum + (mm.satisfactionScore || 0),
          0
        ) / totalMatches,
      averageProcessingTime:
        m.reduce(
          (sum: number, mm: StoredMatch) => sum + (mm.processingTime || 0),
          0
        ) / totalMatches,
      partitionStats: partitions.map((p: GraphPartition) => ({
        partitionKey: p.partitionKey,
        ticketType: p.ticketType,
        activeRequests: p.activeRequests,
        successRate: p.successRate ?? null,
        avgProcessingTime: p.avgProcessingTime ?? null,
      })),
    };
  }
}
