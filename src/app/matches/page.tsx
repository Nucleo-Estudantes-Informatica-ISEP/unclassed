import getServerSession from "@/services/getServerSession";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { ArrowLeftRight, CheckCircle2, History, Zap, Search } from "lucide-react";
import { MatchListClient } from "@/components/MatchListClient";
import { RefreshButton } from "@/components/RefreshButton";
import {
  buildMatchSignature,
  compareMatchesByRecencyDesc,
  shouldReplaceMatchByRecency,
} from "@/lib/matchDedup";

// Define the raw participant shape stored on Match.participants
interface RawParticipant {
  userId: string;
  fromClass: string;
  toClass: string;
  requestId: string;
  requestType: "single" | "bundle";
  satisfactionScore: number;
  status?: "pending" | "accepted" | "rejected" | "completed";
}

interface MatchLike {
  id: string;
  matchType: "SINGLE" | "BUNDLE";
  swapPattern: string;
  status: string;
  singleSwapRequestIds: string[];
  bundleSwapRequestIds: string[];
  participants: unknown;
  createdAt: Date;
}

// Safely coerce JSON participants to typed RawParticipant[]
function coerceParticipants(value: unknown): RawParticipant[] {
  if (!Array.isArray(value)) return [];
  // We trust backend to write correct shape; cast via unknown to satisfy TS
  return value as unknown as RawParticipant[];
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

export default async function MatchesPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  // Get user's matches with enriched participant data
  const allMatches = await prisma.match.findMany({
    where: {
      status: {
        not: "REJECTED", // Don't show rejected matches
      },
    },
    orderBy: [
      { isProvisional: "desc" }, // Provisional matches first
      { createdAt: "desc" },
    ],
  });

  // Filter matches where user is a participant
  const userMatches = allMatches.filter((match) => {
    const participants = coerceParticipants(match.participants);
    return participants.some((p) => p.userId === session.id);
  });
  const uniqueUserMatches = dedupeMatches(userMatches);

  // Enrich matches with user and class information
  const matches = await Promise.all(
    uniqueUserMatches.map(async (match) => {
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

      // Get subject information for single swaps
      let subject = null;
      if (match.matchType === "SINGLE" && match.singleSwapRequestIds.length > 0) {
        const swapRequest = await prisma.singleSwapRequest.findFirst({
          where: { id: { in: match.singleSwapRequestIds } },
          include: { subject: true },
        });
        subject = swapRequest?.subject;
      }

      const enrichedParticipants = participants.map((p) => {
        const user = users.find((u) => u.id === p.userId);
        const fromClassObj = classes.find((c) => c.id === p.fromClass);
        const toClassObj = classes.find((c) => c.id === p.toClass);

        return {
          ...p,
          user,
          fromClass: fromClassObj ?? p.fromClass,
          toClass: toClassObj ?? p.toClass,
        };
      });

      return {
        ...match,
        participants: enrichedParticipants,
        subject,
      };
    })
  );

  // Separate matches by status
  const activeMatches = matches.filter((m) =>
    ["PROPOSED", "PROVISIONAL", "ACCEPTED"].includes(m.status)
  );

  const completedMatches = matches.filter((m) => m.status === "COMPLETED");
  const replacedMatches = matches.filter((m) => m.status === "UPGRADED");

  return (
    <div className="w-full bg-background py-8">
      <div className="container mx-auto px-4 sm:px-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Matches</h1>
            <p className="text-sm text-muted-foreground sm:text-base mt-1">
              Gere os teus matches de permuta e acompanha o progresso
            </p>
          </div>
          <div className="self-start sm:self-auto">
            <RefreshButton />
          </div>
        </div>

      {activeMatches.length === 0 &&
      completedMatches.length === 0 &&
      replacedMatches.length === 0 ? (
        <div className="py-12 text-center px-2">
          <div className="mb-6 flex justify-center">
            <Search className="h-16 w-16 text-muted-foreground/50" />
          </div>
          <h3 className="mb-2 text-lg sm:text-xl font-semibold">
            Ainda não encontramos um match para ti...
          </h3>
          <h2 className="mb-2 text-base sm:text-xl font-semibold">
            Assim que um match for detetado vais receber um email!
          </h2>
        </div>
      ) : (
        <>
          {/* Active Matches */}
          {activeMatches.length > 0 && (
            <MatchListClient
              matches={activeMatches.map((match) => ({
                ...match,
                satisfactionScore: match.satisfactionScore ?? 0,
                subject: match.subject || undefined,
                createdAt: match.createdAt.toISOString(),
                updatedAt: match.updatedAt.toISOString(),
                provisionalUntil: match.provisionalUntil?.toISOString() || null,
              }))}
              currentUserId={session.id}
              title="Matches Ativos"
              emptyMessage="Nenhum match ativo"
              icon={<Zap className="w-5 h-5" />}
              badgeColor="blue"
            />
          )}

          {/* Completed Matches */}
          {completedMatches.length > 0 && (
            <>
              {activeMatches.length > 0 && (
                <div className="my-8 border-t border-border"></div>
              )}
              <MatchListClient
                matches={completedMatches.map((match) => ({
                  ...match,
                  satisfactionScore: match.satisfactionScore ?? 0,
                  subject: match.subject || undefined,
                  createdAt: match.createdAt.toISOString(),
                  updatedAt: match.updatedAt.toISOString(),
                  provisionalUntil: match.provisionalUntil?.toISOString() || null,
                }))}
                currentUserId={session.id}
                title="Matches Completos"
                emptyMessage="Nenhum match completo"
                icon={<CheckCircle2 className="w-5 h-5" />}
                badgeColor="green"
              />
            </>
          )}

          {/* Replaced/Upgraded Matches */}
          {replacedMatches.length > 0 && (
            <>
              {(activeMatches.length > 0 || completedMatches.length > 0) && (
                <div className="my-8 border-t border-border"></div>
              )}
              <MatchListClient
                matches={replacedMatches.map((match) => ({
                  ...match,
                  satisfactionScore: match.satisfactionScore ?? 0,
                  subject: match.subject || undefined,
                  createdAt: match.createdAt.toISOString(),
                  updatedAt: match.updatedAt.toISOString(),
                  provisionalUntil: match.provisionalUntil?.toISOString() || null,
                }))}
                currentUserId={session.id}
                title="Matches Substituídos"
                emptyMessage="Nenhum match substituído/atualizado"
                icon={<History className="w-5 h-5" />}
                badgeColor="yellow"
              />
            </>
          )}
        </>
      )}
      </div>
    </div>
  );
}
