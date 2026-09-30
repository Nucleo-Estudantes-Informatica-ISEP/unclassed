/**
 * Match Management API
 *
 * Handles user actions through the application match lifecycle service.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { defineHandler } from "@/lib/defineHandler";
import { MatchActionError, matchActions } from "@/services/matchActionRules";
import * as matchRepo from "@/application/repositories/matchRepository";
import {
  coerceParticipants,
  processMatchAction,
  type MatchRecord,
} from "@/application/services/matchActionService";

const matchActionSchema = z.object({ action: z.enum(matchActions) });

export const GET = defineHandler({
  handler: async ({ params, session }) => {
    const match = (await matchRepo.findUnique({
      where: { id: params.matchId as string },
    })) as MatchRecord | null;
    if (!match) {
      return NextResponse.json(
        { error: "Match não encontrado" },
        { status: 404 }
      );
    }
    const participants = coerceParticipants(match.participants);
    const isParticipant = participants.some((p) => p.userId === session.id);
    if (!isParticipant && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    return NextResponse.json(match);
  },
});

export const PATCH = defineHandler({
  schema: matchActionSchema,
  onError: (error) => {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    }
    if (error instanceof MatchActionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
  },
  handler: async ({ params, session, body }) => {
    const { updatedMatch, message } = await processMatchAction(
      params.matchId as string,
      session.id,
      body.action
    );
    return NextResponse.json({ success: true, match: updatedMatch, message });
  },
});
