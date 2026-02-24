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
import { emailService } from '@/services/emailService';

interface MatchParticipant {
  userId: string;
  fromClass?: string;
  toClass?: string;
  requestId?: string;
  requestType?: string;
  satisfactionScore?: number;
  status?: string;
  acceptedAt?: Date | string | null;
  rejectedAt?: Date | string | null;
  completedAt?: Date | string | null;
  revokedAt?: Date | string | null;
}

interface MatchRecord {
  id: string;
  status: string;
  isProvisional: boolean;
  provisionalUntil: Date | string | null;
  graphPartition: string;
  participants: unknown;
  singleSwapRequestIds: string[];
  bundleSwapRequestIds: string[];
}

function coerceParticipants(value: unknown): MatchParticipant[] {
  if (!Array.isArray(value)) return [];
  return value as MatchParticipant[];
}

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
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const match = (await prisma.match.findUnique({
      where: { id: params.matchId }
    })) as MatchRecord | null;

    if (!match) {
      return NextResponse.json({ error: 'Match não encontrado' }, { status: 404 });
    }

    // Check if user is participant
    const participants = coerceParticipants(match.participants);
    const isParticipant = participants.some((p) => p.userId === session.id);

    if (!isParticipant && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    return NextResponse.json(match);

  } catch (error) {
    console.error('Error fetching match:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
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
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { action } = await request.json();
    
    if (!['accept', 'reject', 'complete', 'revoke'].includes(action)) {
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }

    const match = (await prisma.match.findUnique({
      where: { id: params.matchId }
    })) as MatchRecord | null;

    if (!match) {
      return NextResponse.json({ error: 'Match não encontrado' }, { status: 404 });
    }

    // Check if user is participant
    const participants = coerceParticipants(match.participants);
    const userParticipation = participants.find((p) => p.userId === session.id);

    if (!userParticipation && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
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
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      match: updatedMatch,
      message: getActionMessage(action)
    });

  } catch (error) {
    console.error('Error updating match:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
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
async function handleMatchAccept(match: MatchRecord, userId: string) {
  // Update participant status
  const updatedParticipants = coerceParticipants(match.participants).map((p) => {
    if (p.userId === userId) {
      return { ...p, status: 'accepted', acceptedAt: new Date() };
    }
    return p;
  });

  // Check if all participants have accepted
  const allAccepted = updatedParticipants.every(
    (p) => p.status === 'accepted'
  );

  const updatedMatch = await prisma.match.update({
    where: { id: match.id },
    data: {
      participants: updatedParticipants as any,
      status: allAccepted ? 'ACCEPTED' : 'PROPOSED',
      isProvisional: false, // Remove provisional status when accepted
    }
  });

  console.log(`✅ User ${userId} accepted match ${match.id}`);
  
  // Send notification to other participants
  await notifyMatchStatusUpdate(match, 'accept', userId);
  
  if (allAccepted) {
    console.log(`🎉 All participants accepted match ${match.id} - moving to ACCEPTED status`);
  }

  return updatedMatch;
}

/**
 * Handle match rejection - clean up graph and reactivate requests
 */
async function handleMatchReject(match: MatchRecord, userId: string, matchingService: AdvancedMatchingService) {
  console.log(`❌ User ${userId} rejected match ${match.id} - cleaning up graph`);

  // Mark match as rejected
  const updatedMatch = await prisma.match.update({
    where: { id: match.id },
    data: {
      status: 'REJECTED',
      isProvisional: false,
      participants: coerceParticipants(match.participants).map((p) => ({
        ...p,
        status: p.userId === userId ? 'rejected' : p.status,
        rejectedAt: p.userId === userId ? new Date() : p.rejectedAt
      })) as any
    }
  });

  // Send notification to other participants
  await notifyMatchStatusUpdate(match, 'reject', userId);
  
  // CRITICAL: Reactivate all participant requests
  await reactivateRequestsFromMatch(match);
  
  // Update graph partitions
  await updateGraphPartitionsFromMatch(match, matchingService);

  return updatedMatch;
}

/**
 * Handle match completion - finalize the swap
 */
async function handleMatchComplete(match: MatchRecord, userId: string, matchingService: AdvancedMatchingService) {
  console.log(`🏁 User ${userId} completed match ${match.id} - finalizing swap`);

  // Update participant status
  const updatedParticipants = coerceParticipants(match.participants).map((p) => {
    if (p.userId === userId) {
      return { ...p, status: 'completed', completedAt: new Date() };
    }
    return p;
  });

  // Check if all participants have completed
  const allCompleted = updatedParticipants.every(
    (p) => p.status === 'completed'
  );

  const updatedMatch = await prisma.match.update({
    where: { id: match.id },
    data: {
      participants: updatedParticipants as any,
      status: allCompleted ? 'COMPLETED' : 'ACCEPTED'
    }
  });

  // Send notification to other participants
  await notifyMatchStatusUpdate(match, 'complete', userId);
  
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
async function handleMatchRevoke(match: MatchRecord, userId: string, matchingService: AdvancedMatchingService) {
  // Check if revocation is still allowed (within 6 hours)
  const provisionalUntil = match.provisionalUntil ? new Date(match.provisionalUntil) : null;
  const now = new Date();

  if (!provisionalUntil || now > provisionalUntil) {
    throw new Error('O período de revogação expirou');
  }

  console.log(`🔄 User ${userId} revoked match ${match.id} - reactivating requests`);

  // Mark match as revoked
  const updatedMatch = await prisma.match.update({
    where: { id: match.id },
    data: {
      status: 'REJECTED',
      participants: coerceParticipants(match.participants).map((p) => ({
        ...p,
        status: p.userId === userId ? 'revoked' : p.status,
        revokedAt: p.userId === userId ? new Date() : p.revokedAt
      })) as any
    }
  });

  // Send notification to other participants
  await notifyMatchStatusUpdate(match, 'revoke', userId);
  
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
async function reactivateRequestsFromMatch(match: MatchRecord) {
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
async function removeRequestsFromGraph(match: MatchRecord) {
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
async function updateGraphPartitionsFromMatch(match: MatchRecord, matchingService: AdvancedMatchingService) {
  console.log(`📊 Updating graph partitions affected by match ${match.id}`);

  // Get unique graph partitions affected
  const affectedPartitions = new Set([match.graphPartition]);
  
  // Update request counts for affected partitions
  for (const partitionKey of Array.from(affectedPartitions)) {
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
      return '✅ Match aceite! A aguardar pelos outros participantes.';
    case 'reject':
      return '❌ Match rejeitado. O teu pedido voltou a ficar ativo.';
    case 'complete':
      return '🎉 Permuta concluída! Obrigado por usares a plataforma.';
    case 'revoke':
      return '🔄 Match revogado. O teu pedido voltou a ficar ativo.';
    default:
      return 'Ação concluída.';
  }
}

/**
 * Send status update emails to all participants
 */
async function notifyMatchStatusUpdate(match: MatchRecord, action: string, userId: string) {
  try {
    // Get all participant user details
    const participantIds = coerceParticipants(match.participants).map((p) => p.userId);
    const users = await prisma.user.findMany({
      where: {
        id: { in: participantIds },
        emailVerified: true,
        emailNotifications: true
      }
    });
    
    const actionUser = users.find(u => u.id === userId);
    const actionUserName = actionUser ? actionUser.name : 'Um utilizador';
    
    const statusMessages = {
      'accept': `${actionUserName} aceitou o match`,
      'reject': `${actionUserName} rejeitou o match`,
      'complete': `${actionUserName} completou o match`,
      'revoke': `${actionUserName} cancelou o match`
    };
    
    const statusDetails = statusMessages[action as keyof typeof statusMessages] || 'Estado do match atualizado';
    
    // Send notification to other participants (not the one who performed the action)
    for (const user of users) {
      if (user.id !== userId) {
        await emailService.sendMatchStatusUpdate(
          user.email,
          user.name,
          match.id,
          action.toUpperCase(),
          statusDetails
        );
      }
    }
    
  } catch (error) {
    console.error('Error sending match status notifications:', error);
  }
}
