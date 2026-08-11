"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Eye, Plus } from "lucide-react";

import { MatchCard } from "@/components/MatchCard";
import { Button } from "@/lib/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/lib/components/ui/card";
import {
  useBundleSwapRequests,
  useMatches,
  useSingleSwapRequests,
} from "@/hooks/useApi";
import {
  buildMatchSignature,
  compareMatchesByRecencyDesc,
  shouldReplaceMatchByRecency,
} from "@/lib/matchDedup";
import AdvancedMatchingDashboard from "@/components/admin/AdvancedMatchingDashboard";
import type { MatchDto, MatchParticipant } from "@/types/match";

interface UserDashboardProps {
  userId: string;
  userRole: "USER" | "ADMIN";
}

function getClassName(value: MatchParticipant["fromClass"]): string {
  return typeof value === "string" ? value : value.name;
}

function getMatchSignature(match: MatchDto): string {
  return buildMatchSignature({
    matchType: match.matchType,
    swapPattern: match.swapPattern,
    singleSwapRequestIds: match.singleSwapRequestIds,
    bundleSwapRequestIds: match.bundleSwapRequestIds,
    participants: match.participants.map((p) => ({
      userId: p.userId,
      fromClass: getClassName(p.fromClass),
      toClass: getClassName(p.toClass),
    })),
  });
}

function dedupeMatches(matches: MatchDto[]): MatchDto[] {
  const bySignature = new Map<string, MatchDto>();

  for (const match of matches) {
    const signature = getMatchSignature(match);
    const current = bySignature.get(signature);

    if (!current) {
      bySignature.set(signature, match);
      continue;
    }

    if (shouldReplaceMatchByRecency(match, current)) {
      bySignature.set(signature, match);
    }
  }

  return Array.from(bySignature.values()).sort(compareMatchesByRecencyDesc);
}

export default function UserDashboard({
  userId,
  userRole,
}: UserDashboardProps) {
  const router = useRouter();

  const {
    data: singleRequests,
    loading: singleLoading,
  } = useSingleSwapRequests(userRole === "ADMIN" ? undefined : userId);

  const {
    data: bundleRequests,
    loading: bundleLoading,
  } = useBundleSwapRequests(userRole === "ADMIN" ? undefined : userId);

  const {
    data: matches,
    loading: matchesLoading,
  } = useMatches(
    undefined,
    undefined,
    userRole === "ADMIN" ? undefined : userId
  );

  const activeRequests = [
    ...(singleRequests?.filter((r) => r.status === "ACTIVE") || []),
    ...(bundleRequests?.filter((r) => r.status === "ACTIVE") || []),
  ];

  const dedupedMatches = dedupeMatches(matches || []);
  const visibleMatches = dedupedMatches.filter((m) =>
    ["PROPOSED", "PROVISIONAL", "ACCEPTED", "COMPLETED"].includes(m.status)
  );

  const activeMatches = visibleMatches.filter((m) =>
    ["PROPOSED", "PROVISIONAL", "ACCEPTED"].includes(m.status)
  );
  if (singleLoading || bundleLoading || matchesLoading) {
    return (
      <div className="container mx-auto px-2 py-4 sm:px-4 sm:py-8">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-background pb-8 pt-4 sm:pt-8">
      <div className="container mx-auto px-4 sm:px-10">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="w-full">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Dashboard
              </h1>
              <p className="text-sm text-muted-foreground sm:text-base">
                Gere os teus pedidos de permuta e acompanha o progresso dos
                matches.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Link href="/swap-requests" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto shadow-lg shadow-primary/20">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Pedido
                </Button>
              </Link>
              <Link href="/matches" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto">
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Todos os Matches
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Atividade Recente</CardTitle>
              <CardDescription>
                Últimos desenvolvimentos nos teus pedidos e matches
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeMatches.length === 0 && activeRequests.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Clock className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>Nenhuma atividade recente</p>
                  <p className="mt-1 text-sm">Cria um pedido de permuta para começar!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeMatches.slice(0, 3).map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      currentUserId={userId}
                      showActions={false}
                    />
                  ))}
                  {activeMatches.length > 3 && (
                    <div className="pt-4 text-center">
                      <Button variant="outline" onClick={() => router.push("/matches")} className="w-full">
                        Ver todos os {activeMatches.length} matches
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admin Dashboard */}
          {userRole === "ADMIN" && (
            <div className="pt-4">
              <AdvancedMatchingDashboard />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
