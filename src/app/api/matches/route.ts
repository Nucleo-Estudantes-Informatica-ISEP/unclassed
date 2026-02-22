import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import getServerSession from "@/services/getServerSession";

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

function coerceParticipants(value: unknown): RawParticipant[] {
  if (!Array.isArray(value)) return [];
  return value as RawParticipant[];
}

function getMatchSignature(match: MatchLike): string {
  const requestIds = [
    ...(match.singleSwapRequestIds || []),
    ...(match.bundleSwapRequestIds || []),
  ]
    .slice()
    .sort()
    .join("|");

  if (requestIds) {
    return `${match.matchType}:${requestIds}`;
  }

  const participantFlow = coerceParticipants(match.participants)
    .map(
      (p) => `${p.userId ?? "unknown"}:${p.fromClass ?? ""}->${p.toClass ?? ""}`
    )
    .sort()
    .join("|");

  return `${match.matchType}:${match.swapPattern}:${participantFlow || "no-participants"}`;
}

function dedupeMatches<T extends MatchLike>(matches: T[]): T[] {
  const bySignature = new Map<string, T>();

  for (const match of matches) {
    const signature = getMatchSignature(match);
    const current = bySignature.get(signature);

    if (!current || match.createdAt >= current.createdAt) {
      bySignature.set(signature, match);
    }
  }

  return Array.from(bySignature.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const matchType = searchParams.get("matchType");
    const userId = searchParams.get("userId");

    // Build where clause
    const where: Prisma.MatchWhereInput = {};

    if (status) {
      where.status = status;
    } else {
      where.status = {
        in: ["PROPOSED", "PROVISIONAL", "ACCEPTED", "COMPLETED"],
      };
    }

    if (matchType) {
      where.matchType = matchType;
    }

    const matches = await prisma.match.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Filter matches that involve the user (if not admin)
    let filteredMatches = matches;
    if (session.role !== "ADMIN") {
      filteredMatches = matches.filter((match) =>
        coerceParticipants(match.participants).some((p) => p.userId === session.id)
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
        const userIds = participants.map((p) => p.userId);
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
        ];
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
            user,
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
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
