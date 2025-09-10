import prisma from "@/lib/prisma";
import { emailService, MatchNotificationData } from "@/services/emailService";

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

// ===== MAIN SERVICE =====

export class AdvancedMatchingService {
  private activeGraphs = new Map<string, any>(); // In-memory graph cache
  private readonly MAX_CYCLE_LENGTH = 10;
  private readonly PROCESSING_TIMEOUT = 30000; // 30 seconds
  private readonly DIRECT_MATCH_TIMEOUT = 5000; // 5 seconds

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
      partition: await this.getRequestPartition(requestId)
    };

    try {
      console.log(`🚀 Starting immediate processing for request ${requestId}`);
      
      const matches = await this.findDirectMatches(requestId, context);
      
      if (matches.length > 0) {
        console.log(`✅ Found ${matches.length} immediate matches in ${Date.now() - startTime}ms`);
        
        // Before creating new matches, check if we can upgrade existing provisional ones
        await this.upgradeProvisionalMatches(matches);
        
        return await this.createMatches(matches); // Use the calculated isProvisional from matches
      }

      console.log(`⏳ No immediate matches found for ${requestId}`);
      return [];

    } catch (error) {
      console.error(`❌ Immediate processing failed for ${requestId}:`, error);
      return [];
    }
  }

  /**
   * Find direct 2-way swaps only - Returns only the BEST match to avoid locking up other users
   */
  private async findDirectMatches(requestId: string, context: ProcessingContext): Promise<MatchResult[]> {
    const request = await this.getRequestDetails(requestId);
    if (!request) return [];

    // Find compatible requests in the same partition
    const compatibleRequests = await this.findCompatibleRequests(request, context);
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
        const satisfactionScore = this.calculateSatisfactionScore([request, compatibleRequest]);
        
        // Check if this is everyone's first choice (perfect match)
        const isFirstChoiceForAll = 
          this.getIndividualSatisfaction(request, compatibleRequest.currentClassId) === 1.0 &&
          this.getIndividualSatisfaction(compatibleRequest, request.currentClassId) === 1.0;
        
        const matchCandidate: MatchResult = {
          pattern: "DIRECT",
          participants: [
            {
              userId: request.userId,
              fromClass: request.currentClassId,
              toClass: compatibleRequest.currentClassId,
              requestId: request.requestId,
              requestType: request.requestType,
              satisfactionScore: this.getIndividualSatisfaction(request, compatibleRequest.currentClassId)
            },
            {
              userId: compatibleRequest.userId,
              fromClass: compatibleRequest.currentClassId,
              toClass: request.currentClassId,
              requestId: compatibleRequest.requestId,
              requestType: compatibleRequest.requestType,
              satisfactionScore: this.getIndividualSatisfaction(compatibleRequest, request.currentClassId)
            }
          ],
          satisfactionScore,
          processingTime: Date.now() - context.startTime,
          isProvisional: !isFirstChoiceForAll, // Provisional if not perfect for everyone
          graphPartition: context.partition.partitionKey,
          singleSwapRequestIds: request.requestType === "single" ? [request.requestId, compatibleRequest.requestId] : [],
          bundleSwapRequestIds: request.requestType === "bundle" ? [request.requestId, compatibleRequest.requestId] : []
        };
        
        // If this is a perfect match (100% satisfaction for both), return immediately
        if (isFirstChoiceForAll) {
          console.log(`🎯 Perfect match found (both get 1st choice) - stopping search`);
          return [matchCandidate];
        }
        
        // Otherwise, keep track of the best match so far
        if (satisfactionScore > bestSatisfactionScore) {
          bestMatch = matchCandidate;
          bestSatisfactionScore = satisfactionScore;
          console.log(`⭐ Better match found (${(satisfactionScore * 100).toFixed(1)}% satisfaction)`);
        }
      }
    }

    // Return the single best match, or empty array if no matches found
    if (bestMatch) {
      console.log(`✅ Best match selected with ${(bestSatisfactionScore * 100).toFixed(1)}% satisfaction`);
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
    const results = {
      processedPartitions: 0,
      matchesFound: 0,
      totalProcessingTime: 0,
      errors: [] as string[]
    };

    try {
      // Get all active partitions, prioritized
      const partitions = await this.getActivePartitions();
      
      console.log(`🔄 Starting batch processing for ${partitions.length} partitions`);

      // Process per-class graphs first (higher frequency)
      const specificClassPartitions = partitions.filter(p => p.ticketType === "SPECIFIC_CLASS");
      const allClassesPartitions = partitions.filter(p => p.ticketType === "ALL_CLASSES");

      // Process specific class partitions (every 15 min)
      for (const partition of specificClassPartitions) {
        if (this.shouldProcessPartition(partition, 15 * 60 * 1000)) { // 15 minutes
          await this.processBatchPartition(partition, results);
        }
      }

      // Process all-classes partitions (every 30 min)
      for (const partition of allClassesPartitions) {
        if (this.shouldProcessPartition(partition, 30 * 60 * 1000)) { // 30 minutes
          await this.processBatchPartition(partition, results);
        }
      }

      results.totalProcessingTime = Date.now() - startTime;
      console.log(`✅ Batch processing completed: ${results.matchesFound} matches in ${results.totalProcessingTime}ms`);

    } catch (error) {
      results.errors.push(`Batch processing failed: ${error}`);
      console.error("❌ Batch processing error:", error);
    }

    return results;
  }

  /**
   * Process a single partition with time boxing
   */
  private async processBatchPartition(partition: GraphPartition, results: any): Promise<void> {
    const startTime = Date.now();
    const context: ProcessingContext = {
      timeLimit: this.PROCESSING_TIMEOUT,
      startTime,
      processId: `batch-${partition.id}`,
      partition
    };

    try {
      // Lock partition for processing
      await this.lockPartition(partition.id, context.processId);
      
      console.log(`🔧 Processing partition ${partition.partitionKey} (${partition.activeRequests} active requests)`);

      // Build graph for this partition
      const graph = await this.buildPartitionGraph(partition, context);
      
      // Find 3-way matches with greedy approach
      const matches = await this.find3WayMatches(graph, context);
      
      if (matches.length > 0) {
        const createdMatches = await this.createMatches(matches, false); // Not provisional
        results.matchesFound += createdMatches.length;
        
        // Upgrade any existing provisional matches
        await this.upgradeProvisionalMatches(matches);
      }

      // Update partition statistics
      await this.updatePartitionStats(partition.id, {
        lastProcessed: new Date(),
        avgProcessingTime: Date.now() - startTime,
        successRate: matches.length / Math.max(partition.activeRequests, 1)
      });

      results.processedPartitions++;

    } catch (error) {
      results.errors.push(`Partition ${partition.partitionKey}: ${error}`);
      console.error(`❌ Error processing partition ${partition.partitionKey}:`, error);
    } finally {
      // Always unlock partition
      await this.unlockPartition(partition.id);
    }
  }

  /**
   * Find 3-way matches using optimized cycle detection
   */
  private async find3WayMatches(graph: Map<string, GraphEdge[]>, context: ProcessingContext): Promise<MatchResult[]> {
    const matches: MatchResult[] = [];
    const processed = new Set<string>();

    for (const [nodeId, edges] of Array.from(graph.entries())) {
      // Check timeout
      if (Date.now() - context.startTime > context.timeLimit) {
        console.log(`⏱️ Batch processing timeout reached`);
        break;
      }

      if (processed.has(nodeId)) continue;

      // Find 3-way cycles starting from this node
      const cycles = this.findCyclesFromNode(nodeId, graph, 3);
      
      for (const cycle of cycles) {
        if (cycle.length === 3) {
          const matchResult = await this.convertCycleToMatch(cycle, graph, context);
          if (matchResult) {
            matches.push(matchResult);
            // Mark all participants as processed
            cycle.forEach(id => processed.add(id));
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
      const existingProvisional = await this.findProvisionalMatchesForUsers(
        newMatch.participants.map(p => p.userId)
      );
      
      for (const existing of existingProvisional) {
        // Calculate satisfaction improvement threshold (must be at least 5% better)
        const improvementThreshold = 0.05;
        const satisfactionDiff = newMatch.satisfactionScore - (existing.satisfactionScore || 0);
        
        // Check if both matches are perfect (100% satisfaction)
        const newIsPerfect = newMatch.satisfactionScore >= 0.99; // Allow for floating point precision
        const existingIsPerfect = (existing.satisfactionScore || 0) >= 0.99;
        
        // Upgrade if satisfaction is significantly better OR if both are perfect matches
        const shouldUpgrade = satisfactionDiff > improvementThreshold || 
                             (newIsPerfect && existingIsPerfect);
        
        if (shouldUpgrade) {
          if (newIsPerfect && existingIsPerfect) {
            console.log(`⬆️ Upgrading perfect match ${existing.id} with another perfect match (both 100% satisfaction)`);
          } else {
            console.log(`⬆️ Upgrading provisional match ${existing.id}: ${Math.round((existing.satisfactionScore || 0) * 100)}% → ${Math.round(newMatch.satisfactionScore * 100)}%`);
          }
          
          // Mark old match as upgraded and reactivate its requests
          await prisma.match.update({
            where: { id: existing.id },
            data: { status: "UPGRADED" }
          });

          // Reactivate requests from the old match
          await this.reactivateRequestsFromMatch(existing);

          // For perfect matches, don't make them provisional unless the existing was also provisional
          if (newIsPerfect && !existing.isProvisional) {
            newMatch.isProvisional = false;
          } else {
            // Create new match as provisional (still allow further upgrades)
            newMatch.isProvisional = true;
          }
        } else {
          console.log(`⏳ New match satisfaction (${Math.round(newMatch.satisfactionScore * 100)}%) not significantly better than existing (${Math.round((existing.satisfactionScore || 0) * 100)}%)`);
        }
      }
    }
  }

  /**
   * Expire old provisional matches
   */
  async expireProvisionalMatches(): Promise<number> {
    const expired = await prisma.match.updateMany({
      where: {
        isProvisional: true,
        provisionalUntil: { lte: new Date() }
      },
      data: {
        status: "REJECTED",
        isProvisional: false
      }
    });

    if (expired.count > 0) {
      console.log(`⌛ Expired ${expired.count} provisional matches`);
    }

    return expired.count;
  }

  // ===== GRAPH MANAGEMENT =====

  /**
   * Get or create graph partition for a request
   */
  private async getRequestPartition(requestId: string): Promise<GraphPartition> {
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
        select: { id: true, year: true }
      });
      
      partitionKey = `subject-${request.subjectId}`;
      ticketType = "SPECIFIC_CLASS";
      subjectId = request.subjectId;
      year = subject?.year;
    } else {
      // Get class info for year
      const currentClass = await prisma.class.findUnique({
        where: { id: request.currentClassId },
        select: { year: true }
      });
      
      partitionKey = `year-${currentClass?.year}`;
      ticketType = "ALL_CLASSES";
      year = currentClass?.year;
    }

    // Get or create partition
    let partition = await prisma.graphPartition.findUnique({
      where: { partitionKey }
    });

    if (!partition) {
      partition = await prisma.graphPartition.create({
        data: {
          partitionKey,
          ticketType,
          subjectId,
          year,
          activeRequests: 0
        }
      });
    }

    return partition;
  }

  /**
   * Update request when created/modified to set graph partition
   */
  async updateRequestPartition(requestId: string, requestType: "single" | "bundle"): Promise<void> {
    const partition = await this.getRequestPartition(requestId);
    
    // Update request with partition info
    if (requestType === "single") {
      await prisma.singleSwapRequest.update({
        where: { id: requestId },
        data: { 
          graphPartition: partition.partitionKey,
          ticketType: "SPECIFIC_CLASS"
        }
      });
    } else {
      await prisma.bundleSwapRequest.update({
        where: { id: requestId },
        data: { 
          graphPartition: partition.partitionKey,
          ticketType: "ALL_CLASSES"
        }
      });
    }

    // Update partition request count
    await this.updatePartitionRequestCount(partition.partitionKey);
  }

  // ===== UTILITY METHODS =====

  private async getRequestDetails(requestId: string): Promise<GraphNode | null> {
    // Try single swap request first
    const singleRequest = await prisma.singleSwapRequest.findUnique({
      where: { id: requestId },
      include: { subject: true }
    });

    if (singleRequest) {
      return {
        requestId: singleRequest.id,
        userId: singleRequest.userId,
        currentClassId: singleRequest.currentClassId,
        preferredClassIds: singleRequest.preferredClassIds,
        preferenceOrderMatters: singleRequest.preferenceOrderMatters,
        requestType: "single",
        priority: singleRequest.priority,
        createdAt: singleRequest.createdAt,
        subjectId: singleRequest.subjectId
      } as GraphNode & { subjectId: string };
    }

    // Try bundle swap request
    const bundleRequest = await prisma.bundleSwapRequest.findUnique({
      where: { id: requestId }
    });

    if (bundleRequest) {
      return {
        requestId: bundleRequest.id,
        userId: bundleRequest.userId,
        currentClassId: bundleRequest.currentClassId,
        preferredClassIds: bundleRequest.preferredClassIds,
        preferenceOrderMatters: bundleRequest.preferenceOrderMatters,
        requestType: "bundle",
        priority: bundleRequest.priority,
        createdAt: bundleRequest.createdAt
      };
    }

    return null;
  }

  private canSwapDirectly(requestA: GraphNode, requestB: GraphNode): boolean {
    // A wants B's class AND B wants A's class
    return requestA.preferredClassIds.includes(requestB.currentClassId) &&
           requestB.preferredClassIds.includes(requestA.currentClassId);
  }

  private calculateSatisfactionScore(nodes: GraphNode[]): number {
    // Calculate overall satisfaction score (0-1)
    let totalSatisfaction = 0;
    
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const nextNode = nodes[(i + 1) % nodes.length];
      
      const preferenceIndex = node.preferredClassIds.indexOf(nextNode.currentClassId);
      if (preferenceIndex === -1) return 0; // Invalid match
      
      // Higher satisfaction for better preferences
      const satisfaction = 1 - (preferenceIndex / node.preferredClassIds.length);
      totalSatisfaction += satisfaction;
    }
    
    return totalSatisfaction / nodes.length;
  }

  private getIndividualSatisfaction(node: GraphNode, targetClassId: string): number {
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
    const satisfactionLevels = [1.0, 0.85, 0.70, 0.55, 0.40, 0.25];
    return satisfactionLevels[preferenceIndex] || 0.1; // Minimum 10% for any valid choice
  }

  private calculateEdgeWeight(fromNode: GraphNode, toNode: GraphNode): number {
    // Calculate weight based on preference order and priority
    const satisfactionScore = this.getIndividualSatisfaction(fromNode, toNode.currentClassId);
    const priorityWeight = (4 - fromNode.priority) / 3; // Higher priority = lower number, higher weight
    const timeWeight = 1.0; // Could factor in request age if needed
    
    return satisfactionScore * priorityWeight * timeWeight;
  }

  private async findCompatibleRequests(request: GraphNode, context: ProcessingContext): Promise<GraphNode[]> {
    const whereClause: any = {
      status: "ACTIVE",
      graphPartition: context.partition.partitionKey,
      id: { not: request.requestId }
    };

    // Add type-specific filters
    if (request.requestType === "single") {
      whereClause.subjectId = (request as any).subjectId;
    }

    const requests = request.requestType === "single" 
      ? await prisma.singleSwapRequest.findMany({
          where: whereClause,
          include: { subject: true }
        })
      : await prisma.bundleSwapRequest.findMany({
          where: whereClause
        });

    // Filter out users who have accepted matches, but include those with provisional matches
    const requestsWithoutAcceptedMatches = await this.filterUsersWithAcceptedMatches(requests);

    return requestsWithoutAcceptedMatches.map(r => ({
      requestId: r.id,
      userId: r.userId,
      currentClassId: r.currentClassId,
      preferredClassIds: r.preferredClassIds,
      preferenceOrderMatters: r.preferenceOrderMatters,
      requestType: request.requestType,
      priority: r.priority,
      createdAt: r.createdAt
    }));
  }

  private shouldProcessPartition(partition: GraphPartition, intervalMs: number): boolean {
    if (!partition.lastProcessed) return true;
    
    const timeSinceLastProcess = Date.now() - partition.lastProcessed.getTime();
    return timeSinceLastProcess >= intervalMs;
  }

  private async lockPartition(partitionId: string, processId: string): Promise<void> {
    await prisma.graphPartition.update({
      where: { id: partitionId },
      data: {
        isLocked: true,
        lockedAt: new Date(),
        lockedBy: processId
      }
    });
  }

  private async unlockPartition(partitionId: string): Promise<void> {
    await prisma.graphPartition.update({
      where: { id: partitionId },
      data: {
        isLocked: false,
        lockedAt: null,
        lockedBy: null
      }
    });
  }

  private async getActivePartitions(): Promise<GraphPartition[]> {
    return await prisma.graphPartition.findMany({
      where: {
        activeRequests: { gt: 0 },
        isLocked: false
      },
      orderBy: [
        { priority: "asc" },
        { activeRequests: "desc" }
      ]
    });
  }

  private async updatePartitionRequestCount(partitionKey: string): Promise<void> {
    // Count active requests in this partition
    const [singleCount, bundleCount] = await Promise.all([
      prisma.singleSwapRequest.count({
        where: { 
          graphPartition: partitionKey,
          status: "ACTIVE" 
        }
      }),
      prisma.bundleSwapRequest.count({
        where: { 
          graphPartition: partitionKey,
          status: "ACTIVE" 
        }
      })
    ]);

    await prisma.graphPartition.update({
      where: { partitionKey },
      data: { activeRequests: singleCount + bundleCount }
    });
  }

  private async updatePartitionStats(partitionId: string, stats: {
    lastProcessed: Date;
    avgProcessingTime: number;
    successRate: number;
  }): Promise<void> {
    await prisma.graphPartition.update({
      where: { id: partitionId },
      data: stats
    });
  }

  private async sendMatchNotifications(matchId: string, match: MatchResult): Promise<void> {
    try {
      console.log(`📧 Sending match notifications for match ${matchId}`);
      
      // Get detailed user information for all participants
      const userIds = match.participants.map(p => p.userId);
      const users = await prisma.user.findMany({
        where: {
          id: { in: userIds },
          emailVerified: true,
          emailNotifications: true
        }
      });
      
      // Get subject information if it's a single swap match
      let subjects: string[] = [];
      if (match.singleSwapRequestIds.length > 0) {
        const subjectData = await prisma.singleSwapRequest.findMany({
          where: { id: { in: match.singleSwapRequestIds } },
          include: { subject: true }
        });
        subjects = Array.from(new Set(subjectData.map(r => r.subject.name)));
      }
      
      // Get class names
      const allClassIds = Array.from(new Set([
        ...match.participants.map(p => p.fromClass),
        ...match.participants.map(p => p.toClass)
      ]));
      const classes = await prisma.class.findMany({
        where: { id: { in: allClassIds } }
      });
      const classMap = new Map(classes.map(c => [c.id, c.name]));
      
      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      // Send notification to each participant
      for (const participant of match.participants) {
        const user = users.find(u => u.id === participant.userId);
        if (!user) {
          console.log(`⚠️ User ${participant.userId} not found or notifications disabled`);
          continue;
        }
        
        const otherParticipants = match.participants
          .filter(p => p.userId !== participant.userId)
          .map(p => {
            const otherUser = users.find(u => u.id === p.userId);
            return otherUser ? otherUser.name : 'Utilizador';
          });
        
        const notificationData: MatchNotificationData = {
          userName: user.name,
          matchType: match.singleSwapRequestIds.length > 0 ? 'Troca de Disciplina' : 'Troca de Turma Completa',
          subjects,
          fromClass: classMap.get(participant.fromClass) || participant.fromClass,
          toClass: classMap.get(participant.toClass) || participant.toClass,
          otherParticipants,
          matchId,
          dashboardUrl: baseUrl
        };
        
        const emailSent = await emailService.sendMatchNotification(user.email, notificationData);
        if (emailSent) {
          console.log(`✅ Match notification sent to ${user.email}`);
        } else {
          console.log(`❌ Failed to send notification to ${user.email}`);
        }
      }
      
    } catch (error) {
      console.error('Error sending match notifications:', error);
    }
  }

  private async createMatches(matches: MatchResult[], globalIsProvisional?: boolean): Promise<MatchResult[]> {
    const createdMatches: MatchResult[] = [];

    for (const match of matches) {
      try {
        // Use individual match isProvisional value, or fallback to global parameter
        const isProvisional = globalIsProvisional !== undefined ? globalIsProvisional : match.isProvisional;
        const provisionalUntil = isProvisional 
          ? new Date(Date.now() + 6 * 60 * 60 * 1000) // 6 hours
          : undefined;

        const createdMatch = await prisma.match.create({
          data: {
            matchType: match.singleSwapRequestIds.length > 0 ? "SINGLE" : "BUNDLE",
            swapPattern: match.pattern,
            status: "PROPOSED",
            isProvisional,
            provisionalUntil,
            satisfactionScore: match.satisfactionScore,
            processingTime: match.processingTime,
            graphPartition: match.graphPartition,
            participants: match.participants as any,
            singleSwapRequestIds: match.singleSwapRequestIds,
            bundleSwapRequestIds: match.bundleSwapRequestIds
          }
        });

        // Update request statuses
        if (match.singleSwapRequestIds.length > 0) {
          await prisma.singleSwapRequest.updateMany({
            where: { id: { in: match.singleSwapRequestIds } },
            data: { 
              status: isProvisional ? "ACTIVE" : "MATCHED", // Keep ACTIVE if provisional for upgrades
              provisionalMatchId: createdMatch.id,
              provisionalUntil
            }
          });
        }

        if (match.bundleSwapRequestIds.length > 0) {
          await prisma.bundleSwapRequest.updateMany({
            where: { id: { in: match.bundleSwapRequestIds } },
            data: { 
              status: isProvisional ? "ACTIVE" : "MATCHED", // Keep ACTIVE if provisional for upgrades
              provisionalMatchId: createdMatch.id,
              provisionalUntil
            }
          });
        }

        createdMatches.push(match);
        
        // Send email notifications to all participants
        await this.sendMatchNotifications(createdMatch.id, match);
        
      } catch (error) {
        console.error(`Error creating match:`, error);
      }
    }

    // Update partition active request counts after creating matches
    const affectedPartitions = Array.from(new Set(matches.map(m => m.graphPartition)));
    await Promise.all(
      affectedPartitions.map(partitionKey => 
        this.updatePartitionRequestCount(partitionKey)
      )
    );

    return createdMatches;
  }

  private async findProvisionalMatches(participants: MatchParticipant[]): Promise<any[]> {
    const userIds = participants.map(p => p.userId);
    return this.findProvisionalMatchesForUsers(userIds);
  }

  /**
   * Find provisional matches for specific user IDs
   */
  private async findProvisionalMatchesForUsers(userIds: string[]): Promise<any[]> {
    // For MongoDB with Prisma, we need to use a different approach to query JSON arrays
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { isProvisional: true },
          { status: { in: ["PROPOSED", "ACCEPTED"] } }
        ]
      }
    });
    
    // Filter matches client-side to check if any participants overlap
    return matches.filter(match => {
      const matchParticipants = match.participants as any[];
      return matchParticipants.some(p => userIds.includes(p.userId));
    });
  }

  /**
   * Reactivate requests from an upgraded/cancelled match
   */
  private async reactivateRequestsFromMatch(match: any): Promise<void> {
    console.log(`🔄 Reactivating requests from upgraded match ${match.id}`);

    // Reactivate single swap requests
    if (match.singleSwapRequestIds?.length > 0) {
      await prisma.singleSwapRequest.updateMany({
        where: { id: { in: match.singleSwapRequestIds } },
        data: {
          status: 'ACTIVE',
          provisionalMatchId: null,
          provisionalUntil: null
        }
      });
      console.log(`✅ Reactivated ${match.singleSwapRequestIds.length} single swap requests`);
    }

    // Reactivate bundle swap requests  
    if (match.bundleSwapRequestIds?.length > 0) {
      await prisma.bundleSwapRequest.updateMany({
        where: { id: { in: match.bundleSwapRequestIds } },
        data: {
          status: 'ACTIVE',
          provisionalMatchId: null,
          provisionalUntil: null
        }
      });
      console.log(`✅ Reactivated ${match.bundleSwapRequestIds.length} bundle swap requests`);
    }
  }

  // Graph building and cycle detection methods
  private async buildPartitionGraph(partition: GraphPartition, context: ProcessingContext): Promise<Map<string, GraphEdge[]>> {
    const graph = new Map<string, GraphEdge[]>();
    
    try {
      console.log(`🔗 Building graph for partition ${partition.partitionKey}`);
      
      // Get all active requests in this partition
      let requests: GraphNode[];
      
      if (partition.ticketType === "SPECIFIC_CLASS") {
        // Single swap requests for specific subject
        const singleRequests = await prisma.singleSwapRequest.findMany({
          where: {
            graphPartition: partition.partitionKey,
            status: "ACTIVE"
          },
          include: { subject: true }
        });
        
        // Filter out users with accepted matches
        const filteredSingleRequests = await this.filterUsersWithAcceptedMatches(singleRequests);
        
        requests = filteredSingleRequests.map(r => ({
          requestId: r.id,
          userId: r.userId,
          currentClassId: r.currentClassId,
          preferredClassIds: r.preferredClassIds,
          requestType: "single" as const,
          priority: r.priority,
          createdAt: r.createdAt,
          subjectId: r.subjectId
        }));
      } else {
        // Bundle swap requests for year-based swaps
        const bundleRequests = await prisma.bundleSwapRequest.findMany({
          where: {
            graphPartition: partition.partitionKey,
            status: "ACTIVE"
          }
        });
        
        // Filter out users with accepted matches
        const filteredBundleRequests = await this.filterUsersWithAcceptedMatches(bundleRequests);
        
        requests = filteredBundleRequests.map(r => ({
          requestId: r.id,
          userId: r.userId,
          currentClassId: r.currentClassId,
          preferredClassIds: r.preferredClassIds,
          requestType: "bundle" as const,
          priority: r.priority,
          createdAt: r.createdAt
        }));
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
              fromClassId: request.currentClassId,
              toClassId: otherRequest.currentClassId,
              satisfactionScore: this.getIndividualSatisfaction(request, otherRequest.currentClassId)
            });
          }
        }
        
        graph.set(request.requestId, edges);
      }
      
      console.log(`🔗 Built graph with ${graph.size} nodes and ${Array.from(graph.values()).reduce((sum, edges) => sum + edges.length, 0)} edges`);
      
      return graph;
      
    } catch (error) {
      console.error(`❌ Error building graph for partition ${partition.partitionKey}:`, error);
      return new Map();
    }
  }

  private findCyclesFromNode(nodeId: string, graph: Map<string, GraphEdge[]>, maxLength: number): string[][] {
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

  private async convertCycleToMatch(cycle: string[], graph: Map<string, GraphEdge[]>, context: ProcessingContext): Promise<MatchResult | null> {
    try {
      console.log(`🔄 Converting cycle to match: ${cycle.join(' → ')}`);
      
      const participants: MatchParticipant[] = [];
      let totalSatisfactionScore = 0;
      
      // Get detailed information for each participant in the cycle
      for (let i = 0; i < cycle.length; i++) {
        const currentRequestId = cycle[i];
        const nextRequestId = cycle[(i + 1) % cycle.length];
        
        // Get the edge from current to next
        const edges = graph.get(currentRequestId) || [];
        const edge = edges.find(e => e.to === nextRequestId);
        
        if (!edge) {
          console.warn(`⚠️ Missing edge from ${currentRequestId} to ${nextRequestId}`);
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
          satisfactionScore: edge.satisfactionScore
        });
        
        totalSatisfactionScore += edge.satisfactionScore;
      }
      
      const averageSatisfactionScore = totalSatisfactionScore / cycle.length;
      
      // Determine match type based on participant requests
      const matchType = participants[0].requestType;
      const swapPattern = cycle.length === 2 ? "DIRECT" : cycle.length === 3 ? "THREE_WAY" : "MULTI_WAY";
      
      const matchResult: MatchResult = {
        pattern: swapPattern as "DIRECT" | "THREE_WAY" | "MULTI_WAY",
        participants,
        satisfactionScore: averageSatisfactionScore,
        processingTime: Date.now() - context.startTime,
        isProvisional: false,
        graphPartition: context.partition.partitionKey,
        singleSwapRequestIds: matchType === "single" ? cycle : [],
        bundleSwapRequestIds: matchType === "bundle" ? cycle : []
      };
      
      console.log(`✅ Created ${swapPattern} match with satisfaction score ${averageSatisfactionScore.toFixed(3)}`);
      
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
  private async filterUsersWithAcceptedMatches(requests: any[]): Promise<any[]> {
    if (requests.length === 0) return [];

    // Get all current matches where users have accepted (not just provisional)
    const acceptedMatches = await prisma.match.findMany({
      where: {
        status: { in: ["PROPOSED", "ACCEPTED"] },
        isProvisional: false // Only exclude users with permanent matches
      }
    });

    // Create set of user IDs who have accepted permanent matches
    const usersWithAcceptedMatches = new Set<string>();
    
    acceptedMatches.forEach(match => {
      const participants = match.participants as any[];
      participants.forEach(p => {
        if (p.status === 'accepted') {
          usersWithAcceptedMatches.add(p.userId);
        }
      });
    });

    // Filter out requests from users with accepted permanent matches
    // Users with provisional matches are still available for upgrades
    return requests.filter(request => !usersWithAcceptedMatches.has(request.userId));
  }

  /**
   * Get comprehensive matching statistics
   */
  async getAdvancedStats(): Promise<any> {
    const [partitions, matches, activeRequests] = await Promise.all([
      prisma.graphPartition.findMany(),
      prisma.match.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      }),
      Promise.all([
        prisma.singleSwapRequest.count({ where: { status: "ACTIVE" } }),
        prisma.bundleSwapRequest.count({ where: { status: "ACTIVE" } })
      ])
    ]);

    return {
      partitions: partitions.length,
      activePartitions: partitions.filter(p => p.activeRequests > 0).length,
      totalActiveRequests: activeRequests[0] + activeRequests[1],
      matches24h: matches.length,
      provisionalMatches: matches.filter(m => m.isProvisional).length,
      averageSatisfactionScore: matches.reduce((sum, m) => sum + (m.satisfactionScore || 0), 0) / matches.length,
      averageProcessingTime: matches.reduce((sum, m) => sum + (m.processingTime || 0), 0) / matches.length,
      partitionStats: partitions.map(p => ({
        partitionKey: p.partitionKey,
        ticketType: p.ticketType,
        activeRequests: p.activeRequests,
        successRate: p.successRate,
        avgProcessingTime: p.avgProcessingTime
      }))
    };
  }
}
