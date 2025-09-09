/**
 * Match Management API
 * 
 * Handles user actions on matches (accept, reject, complete)
 * and manages graph cleanup accordingly.
 */

import { NextRequest, NextResponse } from 'next/server';
import getServerSession from '@/services/getServerSession';
import { AdvancedMatchingService } from '@/services/advancedMatchingService';
import prisma from '@/lib/prisma';

/**
 * GET /api/matches/[matchId]
 * Get match details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const match = await prisma.match.findUnique({
      where: { id: params.matchId },
      include: {
        // Get participant details
      }
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Check if user is participant
    const isParticipant = match.participants.some(
      (p: any) => p.userId === session.id
    );

    if (!isParticipant && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(match);

  } catch (error) {
    console.error('Error fetching match:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/matches/[matchId]
 * User actions: accept, reject, complete
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();
    
    if (!['accept', 'reject', 'complete', 'revoke'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const match = await prisma.match.findUnique({
      where: { id: params.matchId }
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Check if user is participant
    const userParticipation = match.participants.find(
      (p: any) => p.userId === session.id
    );

    if (!userParticipation && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    let updatedMatch;
    const matchingService = new AdvancedMatchingService();

    switch (action) {
      case 'accept':
        updatedMatch = await handleMatchAccept(match, session.id);
        break;
        
      case 'reject':
        updatedMatch = await handleMatchReject(match, session.id, matchingService);
        break;
        
      case 'complete':
        updatedMatch = await handleMatchComplete(match, session.id, matchingService);
        break;
        
      case 'revoke':
        updatedMatch = await handleMatchRevoke(match, session.id, matchingService);
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      match: updatedMatch,
      message: getActionMessage(action)
    });

  } catch (error) {
    console.error('Error updating match:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// MATCH ACTION HANDLERS
// =============================================================================

/**
 * Handle match acceptance - user confirms they want this match
 */
async function handleMatchAccept(match: any, userId: string) {
  // Update participant status
  const updatedParticipants = match.participants.map((p: any) => {
    if (p.userId === userId) {
      return { ...p, status: 'accepted', acceptedAt: new Date() };
    }
    return p;
  });

  // Check if all participants have accepted
  const allAccepted = updatedParticipants.every(
    (p: any) => p.status === 'accepted'
  );

  const updatedMatch = await prisma.match.update({
    where: { id: match.id },
    data: {
      participants: updatedParticipants,
      status: allAccepted ? 'ACCEPTED' : 'PROPOSED',
      isProvisional: false, // Remove provisional status when accepted
    }
  });

  console.log(`✅ User ${userId} accepted match ${match.id}`);
  
  if (allAccepted) {
    console.log(`🎉 All participants accepted match ${match.id} - moving to ACCEPTED status`);
  }

  return updatedMatch;
}

/**
 * Handle match rejection - clean up graph and reactivate requests
 */
async function handleMatchReject(match: any, userId: string, matchingService: AdvancedMatchingService) {
  console.log(`❌ User ${userId} rejected match ${match.id} - cleaning up graph`);

  // Mark match as rejected
  const updatedMatch = await prisma.match.update({
    where: { id: match.id },
    data: {
      status: 'REJECTED',
      isProvisional: false,
      participants: match.participants.map((p: any) => ({
        ...p,
        status: p.userId === userId ? 'rejected' : p.status,
        rejectedAt: p.userId === userId ? new Date() : p.rejectedAt
      }))
    }
  });

  // CRITICAL: Reactivate all participant requests
  await reactivateRequestsFromMatch(match);
  
  // Update graph partitions
  await updateGraphPartitionsFromMatch(match, matchingService);

  return updatedMatch;
}

/**
 * Handle match completion - finalize the swap
 */
async function handleMatchComplete(match: any, userId: string, matchingService: AdvancedMatchingService) {
  console.log(`🏁 User ${userId} completed match ${match.id} - finalizing swap`);

  // Update participant status
  const updatedParticipants = match.participants.map((p: any) => {
    if (p.userId === userId) {
      return { ...p, status: 'completed', completedAt: new Date() };
    }
    return p;
  });

  // Check if all participants have completed
  const allCompleted = updatedParticipants.every(
    (p: any) => p.status === 'completed'
  );

  const updatedMatch = await prisma.match.update({
    where: { id: match.id },
    data: {
      participants: updatedParticipants,
      status: allCompleted ? 'COMPLETED' : 'ACCEPTED'
    }
  });

  if (allCompleted) {
    console.log(`🎊 Match ${match.id} fully completed - removing from graph permanently`);
    
    // CRITICAL: Remove completed requests from graph entirely
    await removeRequestsFromGraph(match);
    
    // Update request status to completed (not just matched)
    if (match.singleSwapRequestIds.length > 0) {
      await prisma.singleSwapRequest.updateMany({
        where: { id: { in: match.singleSwapRequestIds } },
        data: { status: 'COMPLETED' }
      });
    }
    
    if (match.bundleSwapRequestIds.length > 0) {
      await prisma.bundleSwapRequest.updateMany({
        where: { id: { in: match.bundleSwapRequestIds } },
        data: { status: 'COMPLETED' }
      });
    }
  }

  return updatedMatch;
}

/**
 * Handle match revocation - user changes mind within 6-hour window
 */
async function handleMatchRevoke(match: any, userId: string, matchingService: AdvancedMatchingService) {
  // Check if revocation is still allowed (within 6 hours)
  const provisionalUntil = match.provisionalUntil ? new Date(match.provisionalUntil) : null;
  const now = new Date();

  if (!provisionalUntil || now > provisionalUntil) {
    throw new Error('Revocation period has expired');
  }

  console.log(`🔄 User ${userId} revoked match ${match.id} - reactivating requests`);

  // Mark match as revoked
  const updatedMatch = await prisma.match.update({
    where: { id: match.id },
    data: {
      status: 'REJECTED',
      participants: match.participants.map((p: any) => ({
        ...p,
        status: p.userId === userId ? 'revoked' : p.status,
        revokedAt: p.userId === userId ? new Date() : p.revokedAt
      }))
    }
  });

  // CRITICAL: Reactivate all participant requests
  await reactivateRequestsFromMatch(match);
  
  // Update graph partitions
  await updateGraphPartitionsFromMatch(match, matchingService);

  return updatedMatch;
}

// =============================================================================
// GRAPH CLEANUP UTILITIES
// =============================================================================

/**
 * Reactivate requests from a cancelled/rejected match
 */
async function reactivateRequestsFromMatch(match: any) {
  console.log(`🔄 Reactivating requests from cancelled match ${match.id}`);

  // Reactivate single swap requests
  if (match.singleSwapRequestIds.length > 0) {
    await prisma.singleSwapRequest.updateMany({
      where: { id: { in: match.singleSwapRequestIds } },
      data: {
        status: 'ACTIVE',
        provisionalMatchId: null,
        provisionalUntil: null,
        lastProcessed: null
      }
    });
    
    console.log(`✅ Reactivated ${match.singleSwapRequestIds.length} single swap requests`);
  }

  // Reactivate bundle swap requests  
  if (match.bundleSwapRequestIds.length > 0) {
    await prisma.bundleSwapRequest.updateMany({
      where: { id: { in: match.bundleSwapRequestIds } },
      data: {
        status: 'ACTIVE',
        provisionalMatchId: null,
        provisionalUntil: null,
        lastProcessed: null
      }
    });
    
    console.log(`✅ Reactivated ${match.bundleSwapRequestIds.length} bundle swap requests`);
  }
}

/**
 * Remove completed requests from graph entirely
 */
async function removeRequestsFromGraph(match: any) {
  console.log(`🗑️ Removing completed requests from graph for match ${match.id}`);

  // Delete single swap requests (they're completed)
  if (match.singleSwapRequestIds.length > 0) {
    // Don't delete, just mark as completed - keep for history
    await prisma.singleSwapRequest.updateMany({
      where: { id: { in: match.singleSwapRequestIds } },
      data: { status: 'COMPLETED' }
    });
  }

  // Delete bundle swap requests (they're completed)
  if (match.bundleSwapRequestIds.length > 0) {
    // Don't delete, just mark as completed - keep for history
    await prisma.bundleSwapRequest.updateMany({
      where: { id: { in: match.bundleSwapRequestIds } },
      data: { status: 'COMPLETED' }
    });
  }
}

/**
 * Update graph partition counts after match changes
 */
async function updateGraphPartitionsFromMatch(match: any, matchingService: AdvancedMatchingService) {
  console.log(`📊 Updating graph partitions affected by match ${match.id}`);

  // Get unique graph partitions affected
  const affectedPartitions = new Set([match.graphPartition]);
  
  // Update request counts for affected partitions
  for (const partitionKey of affectedPartitions) {
    await updatePartitionRequestCount(partitionKey);
  }
}

/**
 * Update active request count for a specific partition
 */
async function updatePartitionRequestCount(partitionKey: string) {
  const [singleCount, bundleCount] = await Promise.all([
    prisma.singleSwapRequest.count({
      where: { 
        graphPartition: partitionKey,
        status: 'ACTIVE' 
      }
    }),
    prisma.bundleSwapRequest.count({
      where: { 
        graphPartition: partitionKey,
        status: 'ACTIVE' 
      }
    })
  ]);

  await prisma.graphPartition.update({
    where: { partitionKey },
    data: { activeRequests: singleCount + bundleCount }
  });
  
  console.log(`📊 Updated partition ${partitionKey}: ${singleCount + bundleCount} active requests`);
}

/**
 * Get user-friendly message for each action
 */
function getActionMessage(action: string): string {
  switch (action) {
    case 'accept':
      return '✅ Match accepted! Waiting for other participants.';
    case 'reject':
      return '❌ Match rejected. Your request is now active again.';
    case 'complete':
      return '🎉 Swap completed! Thank you for using the system.';
    case 'revoke':
      return '🔄 Match revoked. Your request is active again.';
    default:
      return 'Action completed.';
  }
}
