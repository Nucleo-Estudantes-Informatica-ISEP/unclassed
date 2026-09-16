import * as matchRepo from "@/application/repositories/matchRepository";
import type { JsonValue } from "@/application/repositories/matchRepository";
import * as singleSwapRequestRepo from "@/application/repositories/singleSwapRequestRepository";
import * as bundleSwapRequestRepo from "@/application/repositories/bundleSwapRequestRepository";
import * as graphPartitionRepo from "@/application/repositories/graphPartitionRepository";
import * as userRepo from "@/application/repositories/userRepository";
import { emailService } from "@/services/emailService";
import {
  assertMatchActionAllowed,
  MatchActionError,
  MatchActionNotFoundError,
  MatchActionForbiddenError,
  MatchActionConflictError,
  MatchAction,
} from "@/services/matchActionRules";

export {
  MatchActionError,
  MatchActionNotFoundError,
  MatchActionForbiddenError,
  MatchActionConflictError,
};

export interface MatchParticipant {
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

export interface MatchRecord {
  id: string;
  status: string;
  isProvisional: boolean;
  provisionalUntil: Date | string | null;
  graphPartition: string;
  participants: unknown;
  singleSwapRequestIds: string[];
  bundleSwapRequestIds: string[];
  updatedAt: Date | string;
}

export function coerceParticipants(value: unknown): MatchParticipant[] {
  if (!Array.isArray(value)) return [];
  return value as MatchParticipant[];
}

export function toParticipantsJson(participants: MatchParticipant[]): JsonValue[] {
  return participants as unknown as JsonValue[];
}

export async function processMatchAction(matchId: string, userId: string, action: MatchAction) {
  const match = (await matchRepo.findUnique({
    where: { id: matchId }
  })) as MatchRecord | null;

  if (!match) {
    throw new MatchActionNotFoundError('Match não encontrado');
  }

  const participants = coerceParticipants(match.participants);
  const userParticipation = participants.find((p) => p.userId === userId);

  if (!userParticipation) {
    throw new MatchActionForbiddenError('Acesso negado');
  }

  assertMatchActionAllowed(
    { ...match, participants },
    userId,
    action
  );

  let updatedMatch;
  switch (action) {
    case 'accept':
      updatedMatch = await handleMatchAccept(match, userId);
      break;

    case 'reject':
      updatedMatch = await handleMatchReject(match, userId);
      break;

    case 'complete':
      updatedMatch = await handleMatchComplete(match, userId);
      break;

    case 'revoke':
      updatedMatch = await handleMatchRevoke(match, userId);
      break;

    default:
      throw new MatchActionError('Ação inválida');
  }

  return { updatedMatch, message: getActionMessage(action) };
}

// =============================================================================
// MATCH ACTION HANDLERS
// =============================================================================

async function handleMatchAccept(match: MatchRecord, userId: string) {
  const updatedParticipants = coerceParticipants(match.participants).map((p) => {
    if (p.userId === userId) {
      return { ...p, status: 'accepted', acceptedAt: new Date() };
    }
    return p;
  });

  const allAccepted = updatedParticipants.every((p) => p.status === 'accepted');

  const updatedMatch = await updateMatchAtomically(match, {
    participants: toParticipantsJson(updatedParticipants),
    status: allAccepted ? 'ACCEPTED' : 'PROPOSED',
    isProvisional: false,
  });

  console.log(`User ${userId} accepted match ${match.id}`);
  await notifyMatchStatusUpdate(match, 'accept', userId);

  if (allAccepted) {
    console.log(`All participants accepted match ${match.id} - moving to ACCEPTED status`);
  }

  return updatedMatch;
}

async function handleMatchReject(match: MatchRecord, userId: string) {
  console.log(`User ${userId} rejected match ${match.id} - cleaning up graph`);

  const updatedMatch = await updateMatchAtomically(match, {
    status: 'REJECTED',
    isProvisional: false,
    participants: toParticipantsJson(
      coerceParticipants(match.participants).map((p) => ({
        ...p,
        status: p.userId === userId ? 'rejected' : p.status,
        rejectedAt: p.userId === userId ? new Date() : p.rejectedAt
      }))
    )
  });

  await notifyMatchStatusUpdate(match, 'reject', userId);
  await reactivateRequestsFromMatch(match);
  await updateGraphPartitionsFromMatch(match);

  return updatedMatch;
}

async function handleMatchComplete(match: MatchRecord, userId: string) {
  console.log(`User ${userId} completed match ${match.id} - finalizing swap`);

  const updatedParticipants = coerceParticipants(match.participants).map((p) => {
    if (p.userId === userId) {
      return { ...p, status: 'completed', completedAt: new Date() };
    }
    return p;
  });

  const allCompleted = updatedParticipants.every((p) => p.status === 'completed');

  const updatedMatch = await updateMatchAtomically(match, {
    participants: toParticipantsJson(updatedParticipants),
    status: allCompleted ? 'COMPLETED' : 'ACCEPTED'
  });

  await notifyMatchStatusUpdate(match, 'complete', userId);

  if (allCompleted) {
    console.log(`Match ${match.id} fully completed - removing from graph permanently`);
    await removeRequestsFromGraph(match);

    if (match.singleSwapRequestIds.length > 0) {
      await singleSwapRequestRepo.updateMany({
        where: { id: { in: match.singleSwapRequestIds } },
        data: { status: 'COMPLETED' }
      });
    }

    if (match.bundleSwapRequestIds.length > 0) {
      await bundleSwapRequestRepo.updateMany({
        where: { id: { in: match.bundleSwapRequestIds } },
        data: { status: 'COMPLETED' }
      });
    }
  }

  return updatedMatch;
}

async function handleMatchRevoke(match: MatchRecord, userId: string) {
  const provisionalUntil = match.provisionalUntil ? new Date(match.provisionalUntil) : null;
  const now = new Date();

  if (!provisionalUntil || now > provisionalUntil) {
    throw new MatchActionConflictError('O período de revogação expirou');
  }

  console.log(`User ${userId} revoked match ${match.id} - reactivating requests`);

  const updatedMatch = await updateMatchAtomically(match, {
    status: 'REJECTED',
    participants: toParticipantsJson(
      coerceParticipants(match.participants).map((p) => ({
        ...p,
        status: p.userId === userId ? 'revoked' : p.status,
        revokedAt: p.userId === userId ? new Date() : p.revokedAt
      }))
    )
  });

  await notifyMatchStatusUpdate(match, 'revoke', userId);
  await reactivateRequestsFromMatch(match);
  await updateGraphPartitionsFromMatch(match);

  return updatedMatch;
}

async function updateMatchAtomically(
  match: MatchRecord,
  data: Parameters<typeof matchRepo.updateMany>[0]["data"]
) {
  const result = await matchRepo.updateMany({
    where: { id: match.id, updatedAt: new Date(match.updatedAt) },
    data,
  });

  if (result.count !== 1) {
    throw new MatchActionConflictError(
      "O match foi atualizado por outro participante. Atualiza a página e tenta novamente."
    );
  }

  return matchRepo.findUniqueOrThrow({ where: { id: match.id } }) as Promise<MatchRecord>;
}

async function reactivateRequestsFromMatch(match: MatchRecord) {
  console.log(`Reactivating requests from cancelled match ${match.id}`);

  if (match.singleSwapRequestIds.length > 0) {
    await singleSwapRequestRepo.updateMany({
      where: { id: { in: match.singleSwapRequestIds } },
      data: {
        status: 'ACTIVE',
        provisionalMatchId: null,
        provisionalUntil: null,
        lastProcessed: null
      }
    });
    console.log(`Reactivated ${match.singleSwapRequestIds.length} single swap requests`);
  }

  if (match.bundleSwapRequestIds.length > 0) {
    await bundleSwapRequestRepo.updateMany({
      where: { id: { in: match.bundleSwapRequestIds } },
      data: {
        status: 'ACTIVE',
        provisionalMatchId: null,
        provisionalUntil: null,
        lastProcessed: null
      }
    });
    console.log(`Reactivated ${match.bundleSwapRequestIds.length} bundle swap requests`);
  }
}

async function removeRequestsFromGraph(match: MatchRecord) {
  console.log(`Removing completed requests from graph for match ${match.id}`);

  if (match.singleSwapRequestIds.length > 0) {
    await singleSwapRequestRepo.updateMany({
      where: { id: { in: match.singleSwapRequestIds } },
      data: { status: 'COMPLETED' }
    });
  }

  if (match.bundleSwapRequestIds.length > 0) {
    await bundleSwapRequestRepo.updateMany({
      where: { id: { in: match.bundleSwapRequestIds } },
      data: { status: 'COMPLETED' }
    });
  }
}

async function updateGraphPartitionsFromMatch(match: MatchRecord) {
  console.log(`Updating graph partitions affected by match ${match.id}`);

  const affectedPartitions = new Set([match.graphPartition]);
  for (const partitionKey of Array.from(affectedPartitions)) {
    await updatePartitionRequestCount(partitionKey);
  }
}

async function updatePartitionRequestCount(partitionKey: string) {
  const [singleCount, bundleCount] = await Promise.all([
    singleSwapRequestRepo.count({
      where: {
        graphPartition: partitionKey,
        status: 'ACTIVE'
      }
    }),
    bundleSwapRequestRepo.count({
      where: {
        graphPartition: partitionKey,
        status: 'ACTIVE'
      }
    })
  ]);

  await graphPartitionRepo.update({
    where: { partitionKey },
    data: { activeRequests: singleCount + bundleCount }
  });

  console.log(`Updated partition ${partitionKey}: ${singleCount + bundleCount} active requests`);
}

function getActionMessage(action: string): string {
  switch (action) {
    case 'accept':
      return 'Match aceite! A aguardar pelos outros participantes.';
    case 'reject':
      return 'Match rejeitado. O teu pedido voltou a ficar ativo.';
    case 'complete':
      return 'Permuta concluída! Obrigado por usares a plataforma.';
    case 'revoke':
      return 'Match revogado. O teu pedido voltou a ficar ativo.';
    default:
      return 'Ação concluída.';
  }
}

async function notifyMatchStatusUpdate(match: MatchRecord, action: string, userId: string) {
  try {
    const participantIds = coerceParticipants(match.participants).map((p) => p.userId);
    const users = await userRepo.findMany({
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
