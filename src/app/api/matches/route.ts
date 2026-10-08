/**
 * Match Management API
 *
 * Handles listing and filtering matches.
 */

import { NextResponse } from "next/server";

import { defineHandler } from "@/lib/defineHandler";
import {
  buildMatchSignature,
  compareMatchesByRecencyDesc,
  shouldReplaceMatchByRecency,
} from "@/lib/matchDedup";
import { toMatchDto } from "@/services/matchDto";
import * as classRepository from "@/application/repositories/classRepository";
import * as matchRepository from "@/application/repositories/matchRepository";
import * as userRepository from "@/application/repositories/userRepository";
import { coerceParticipants } from "@/application/services/matchActionService";

interface MatchLike {
  id: string;
  matchType: string;
  swapPattern: string;
  createdAt: Date;
  singleSwapRequestIds: string[];
  bundleSwapRequestIds: string[];
  participants: unknown;
}

const matchStatuses = [
  "PROPOSED",
  "PROVISIONAL",
  "ACCEPTED",
  "COMPLETED",
  "REJECTED",
  "UPGRADED",
] as const;

const matchTypes = ["SINGLE", "BUNDLE"] as const;

function sanitizeUserForMatch(
  user:
    | {
        id: string;
        name: string;
        email: string;
        phone: string | null;
        sharePhoneOnMatch: boolean | null;
      }
    | undefined,
  sessionUserId: string
) {
  if (!user) {
    return undefined;
  }

  const canSeePhone =
    user.id === sessionUserId || Boolean(user.sharePhoneOnMatch);

  return {
    ...user,
    phone: canSeePhone ? user.phone : null,
  };
}

function getMatchSignature(match: MatchLike): string {
  return buildMatchSignature({
    matchType: match.matchType,
    swapPattern: match.swapPattern,
    singleSwapRequestIds: match.singleSwapRequestIds,
    bundleSwapRequestIds: match.bundleSwapRequestIds,
    participants: coerceParticipants(match.participants).map((p) => ({
      userId: p.userId,
      fromClass: p.fromClass,
      toClass: p.toClass,
    })),
  });
}

function dedupeMatches<T extends MatchLike>(matches: T[]): T[] {
  const bySignature = new Map<string, T>();

  for (const match of matches) {
    const signature = getMatchSignature(match);
    const current = bySignature.get(signature);

    if (shouldReplaceMatchByRecency(match, current)) {
      bySignature.set(signature, match);
    }
  }

  return Array.from(bySignature.values()).sort(compareMatchesByRecencyDesc);
}

export const GET = defineHandler({
  auth: {},

  handler: async (context) => {
    const { request } = context;
    const { session } = context;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const matchType = searchParams.get("matchType");
    const userId = searchParams.get("userId");

    const where: NonNullable<
      Parameters<typeof matchRepository.findMany>[0]
    >["where"] = {};

    if (
      status &&
      matchStatuses.includes(status as (typeof matchStatuses)[number])
    ) {
      const validatedStatus = status as (typeof matchStatuses)[number];
      where.status = validatedStatus;
    } else {
      where.status = {
        in: ["PROPOSED", "PROVISIONAL", "ACCEPTED", "COMPLETED"],
      };
    }

    if (
      matchType &&
      matchTypes.includes(matchType as (typeof matchTypes)[number])
    ) {
      const validatedMatchType = matchType as (typeof matchTypes)[number];
      where.matchType = validatedMatchType;
    }

    const matches = await matchRepository.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    let filteredMatches = matches;

    if (session.role !== "ADMIN") {
      filteredMatches = matches.filter((match) =>
        coerceParticipants(match.participants).some(
          (p) => p.userId === session.id
        )
      );
    } else if (userId) {
      filteredMatches = matches.filter((match) =>
        coerceParticipants(match.participants).some((p) => p.userId === userId)
      );
    }

    const dedupedMatches = dedupeMatches(filteredMatches);

    const enrichedMatches = await Promise.all(
      dedupedMatches.map(async (match) => {
        const participants = coerceParticipants(match.participants);

        const userIds = participants
          .map((p) => p.userId)
          .filter((id): id is string => id !== undefined);

        const users = await userRepository.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            sharePhoneOnMatch: true,
          },
        });

        const sanitizedUsers = users
          .map((user) => sanitizeUserForMatch(user, session.id))
          .filter(
            (user): user is NonNullable<typeof user> => user !== undefined
          );

        const classIds = [
          ...participants.map((participant) => participant.fromClass),
          ...participants.map((participant) => participant.toClass),
        ].filter((id): id is string => id !== undefined);

        const classes = await classRepository.findManyByIds(classIds);

        return toMatchDto(
          match,
          participants,
          classes,
          sanitizedUsers,
          undefined
        );
      })
    );

    const response = NextResponse.json(enrichedMatches);
    response.headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  },
});
