import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { authorizeRequest } from "@/lib/apiAccess";
import {
  buildMatchSignature,
  compareMatchesByRecencyDesc,
  shouldReplaceMatchByRecency,
} from "@/lib/matchDedup";
import prisma from "@/lib/prisma";

interface MatchLike {
  id: string;
  matchType: string;
  swapPattern: string;
  createdAt: Date;
  singleSwapRequestIds: string[];
  bundleSwapRequestIds: string[];
  participants: unknown;
}

interface RawParticipant {
  userId?: string;
  fromClass?: string;
  toClass?: string;
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

function coerceParticipants(value: unknown): RawParticipant[] {
  if (!Array.isArray(value)) return [];
  return value as RawParticipant[];
}

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

export async function GET(request: NextRequest) {
  try {
    const authResult = await authorizeRequest(request);
    if (!authResult.ok) {
      return authResult.response;
    }
    const { session } = authResult;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const matchType = searchParams.get("matchType");
    const userId = searchParams.get("userId");

    // Build where clause
    const where: Prisma.MatchWhereInput = {};

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

    const matches = await prisma.match.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Filter matches that involve the user (if not admin)
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

    const dedupedMatches = dedupeMatches(
      filteredMatches as unknown as MatchLike[]
    );

    // Enrich matches with user and class information
    const enrichedMatches = await Promise.all(
      dedupedMatches.map(async (match) => {
        const participants = coerceParticipants(match.participants);

        // Get user information for participants
        const userIds = participants
          .map((p) => p.userId)
          .filter((id): id is string => id !== undefined);
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            sharePhoneOnMatch: true,
          },
        });
        // Get class information
        const classIds = [
          ...participants.map((p) => p.fromClass),
          ...participants.map((p) => p.toClass),
        ].filter((id): id is string => id !== undefined);
        const classes = await prisma.class.findMany({
          where: { id: { in: classIds } },
          select: { id: true, name: true, year: true },
        });

        const enrichedParticipants = participants.map((p) => {
          const user = users.find((u) => u.id === p.userId);
          const fromClass = classes.find((c) => c.id === p.fromClass);
          const toClass = classes.find((c) => c.id === p.toClass);

          return {
            ...p,
            user: sanitizeUserForMatch(user, session.id),
            fromClass,
            toClass,
          };
        });

        const result = {
          ...match,
          participants: enrichedParticipants,
        };
        return result;
      })
    );

    const response = NextResponse.json(enrichedMatches);
    // Prevent caching to ensure fresh data
    response.headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return response;
  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
