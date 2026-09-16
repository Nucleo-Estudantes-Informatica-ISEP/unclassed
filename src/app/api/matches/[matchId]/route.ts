/**
 * Match Management API
 * 
 * Handles user actions on matches (accept, reject, complete)
 * and manages graph cleanup accordingly.
 */


import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authorizeRequest } from '@/lib/apiAccess';
import * as matchRepo from "@/application/repositories/matchRepository";
import {
  matchActions,
  MatchActionError,
  MatchActionNotFoundError,
  MatchActionForbiddenError,
} from '@/services/matchActionRules';
import { processMatchAction, coerceParticipants, MatchRecord } from '@/application/services/matchActionService';

const matchActionSchema = z.object({ action: z.enum(matchActions) });

type MatchRouteContext = {
  params: Promise<{ matchId: string }>;
};

/**
 * GET /api/matches/[matchId]
 * Get match details
 */
export async function GET(
  request: NextRequest,
  { params }: MatchRouteContext
) {
  try {
    const { matchId } = await params;
    const authResult = await authorizeRequest(request);
    if (!authResult.ok) {
      return authResult.response;
    }
    const { session } = authResult;

    const match = (await matchRepo.findUnique({
      where: { id: matchId }
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
  { params }: MatchRouteContext
) {
  try {
    const { matchId } = await params;
    const authResult = await authorizeRequest(request, {
      enforceSameOriginForSessionWrites: true,
    });
    if (!authResult.ok) {
      return authResult.response;
    }
    const { session } = authResult;

    const { action } = matchActionSchema.parse(await request.json());

    const { updatedMatch, message } = await processMatchAction(matchId, session.id, action);

    return NextResponse.json({
      success: true,
      match: updatedMatch,
      message
    });

  } catch (error) {
    console.error('Error updating match:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }
    if (error instanceof MatchActionNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof MatchActionForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof MatchActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status ?? 409 });
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
