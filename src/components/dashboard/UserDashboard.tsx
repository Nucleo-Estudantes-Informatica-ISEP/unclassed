"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  Clock,
  Eye,
  Package2,
  Plus,
} from "lucide-react";

import { Badge } from "@/lib/components/ui/badge";
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
import { ClientDate } from "@/components/ClientDate";

interface UserDashboardProps {
  userId: string;
  userRole: "USER" | "ADMIN";
}

type DashboardMatch = {
  id: string;
  matchType: string;
  status: string;
  swapPattern: string;
  participants: Array<{
    userId?: string;
    status?: string;
    user?: { name?: string; email?: string };
    fromClass?: { name?: string };
    toClass?: { name?: string };
  }>;
  createdAt: string;
  singleSwapRequestIds?: string[];
  bundleSwapRequestIds?: string[];
};

function getMatchSignature(match: DashboardMatch): string {
  return buildMatchSignature({
    matchType: match.matchType,
    swapPattern: match.swapPattern,
    singleSwapRequestIds: match.singleSwapRequestIds,
    bundleSwapRequestIds: match.bundleSwapRequestIds,
    participants: match.participants.map((p) => ({
      userId: p.userId,
      fromClass: p.fromClass?.name,
      toClass: p.toClass?.name,
    })),
  });
}

function dedupeMatches(matches: DashboardMatch[]): DashboardMatch[] {
  const bySignature = new Map<string, DashboardMatch>();

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

  const dedupedMatches = dedupeMatches((matches || []) as DashboardMatch[]);
  const visibleMatches = dedupedMatches.filter((m) =>
    ["PROPOSED", "PROVISIONAL", "ACCEPTED", "COMPLETED"].includes(m.status)
  );

  const activeMatches = visibleMatches.filter((m) =>
    ["PROPOSED", "PROVISIONAL", "ACCEPTED"].includes(m.status)
  );
  const getMatchStatusBadge = (status: string) => {
    const statusConfig = {
      PROPOSED: {
        variant: "outline" as const,
        label: "Proposto",
        color: "text-primary",
      },
      PROVISIONAL: {
        variant: "outline" as const,
        label: "Provisório",
        color: "text-amber-600",
      },
      ACCEPTED: {
        variant: "default" as const,
        label: "Aceite",
        color: "text-green-600",
      },
      REJECTED: {
        variant: "destructive" as const,
        label: "Rejeitado",
        color: "text-red-600",
      },
      COMPLETED: {
        variant: "secondary" as const,
        label: "Completo",
        color: "text-gray-600",
      },
      UPGRADED: {
        variant: "secondary" as const,
        label: "Substituído",
        color: "text-gray-500",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig.PROPOSED;

    return (
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>
    );
  };

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
                    <div
                      key={match.id}
                      className="flex cursor-pointer flex-col gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                      onClick={() => router.push("/matches")}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`rounded-full p-2 ${
                            match.matchType === "SINGLE" ? "bg-primary/10" : "bg-accent/30"
                          }`}
                        >
                          {match.matchType === "SINGLE" ? (
                            <ArrowLeftRight className="h-4 w-4 text-primary" />
                          ) : (
                            <Package2 className="h-4 w-4 text-accent-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium break-words">
                            Match {match.swapPattern.toLowerCase()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {match.participants.length} participantes • <ClientDate date={match.createdAt} format="short" />
                          </p>
                        </div>
                      </div>
                      <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
                        {getMatchStatusBadge(match.status)}
                        <Button variant="ghost" size="sm" className="w-full text-xs sm:w-auto">
                          Ver match →
                        </Button>
                      </div>
                    </div>
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
