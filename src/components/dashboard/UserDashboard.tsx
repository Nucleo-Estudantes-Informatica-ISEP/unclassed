"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeftRight,
  CheckCircle,
  Clock,
  Eye,
  Package2,
  Plus,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/lib/components/ui/tabs";
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
  const [selectedTab, setSelectedTab] = useState("overview");
  const [matchActionLoadingId, setMatchActionLoadingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Listen for custom event to switch to matches tab
    const handleSwitchToMatches = () => {
      setSelectedTab("matches");
    };

    window.addEventListener("switchToMatchesTab", handleSwitchToMatches);

    return () => {
      window.removeEventListener("switchToMatchesTab", handleSwitchToMatches);
    };
  }, []);

  const {
    data: singleRequests,
    loading: singleLoading,
    error: singleError,
  } = useSingleSwapRequests(userRole === "ADMIN" ? undefined : userId);

  const {
    data: bundleRequests,
    loading: bundleLoading,
    error: bundleError,
  } = useBundleSwapRequests(userRole === "ADMIN" ? undefined : userId);

  const {
    data: matches,
    loading: matchesLoading,
    error: matchesError,
  } = useMatches(
    undefined,
    undefined,
    userRole === "ADMIN" ? undefined : userId
  );

  const activeRequests = [
    ...(singleRequests?.filter((r) => r.status === "ACTIVE") || []),
    ...(bundleRequests?.filter((r) => r.status === "ACTIVE") || []),
  ];

  const matchedRequests = [
    ...(singleRequests?.filter((r) => r.status === "MATCHED") || []),
    ...(bundleRequests?.filter((r) => r.status === "MATCHED") || []),
  ];

  const dedupedMatches = dedupeMatches((matches || []) as DashboardMatch[]);
  const visibleMatches = dedupedMatches.filter((m) =>
    ["PROPOSED", "PROVISIONAL", "ACCEPTED", "COMPLETED"].includes(m.status)
  );

  const activeMatches = visibleMatches.filter((m) =>
    ["PROPOSED", "PROVISIONAL", "ACCEPTED"].includes(m.status)
  );
  const completedMatches = visibleMatches.filter((m) => m.status === "COMPLETED");

  const handleCancelRequest = async (
    requestId: string,
    type: "single" | "bundle"
  ) => {
    try {
      const endpoint =
        type === "single"
          ? `/api/swap-requests/single/${requestId}`
          : `/api/swap-requests/bundle/${requestId}`;

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "CANCELLED" }),
      });

      if (!response.ok) {
        throw new Error("Erro ao cancelar pedido");
      }

      toast.success("Pedido cancelado com sucesso!");
      // Refresh data would be handled by SWR/React Query in a real app
      window.location.reload();
    } catch (error) {
      console.error("Error cancelling request:", error);
      toast.error("Erro ao cancelar pedido");
    }
  };

  const handleDeleteRequest = async (
    requestId: string,
    type: "single" | "bundle"
  ) => {
    if (
      !confirm(
        "Tens a certeza que queres eliminar este pedido? Esta ação não pode ser desfeita."
      )
    ) {
      return;
    }

    try {
      const endpoint =
        type === "single"
          ? `/api/swap-requests/single/${requestId}`
          : `/api/swap-requests/bundle/${requestId}`;

      const response = await fetch(endpoint, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erro ao eliminar pedido");
      }

      toast.success("Pedido eliminado com sucesso!");
      window.location.reload();
    } catch (error) {
      console.error("Error deleting request:", error);
      toast.error("Erro ao eliminar pedido");
    }
  };

  const handleMatchAction = async (
    matchId: string,
    action: "accept" | "reject"
  ) => {
    setMatchActionLoadingId(matchId);

    try {
      const response = await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Erro ao atualizar match");
      }

      const result = await response.json();
      toast.success(result.message || "Match atualizado com sucesso");
      window.location.reload();
    } catch (error) {
      console.error("Error updating match:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao atualizar match"
      );
    } finally {
      setMatchActionLoadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ACTIVE: { variant: "default" as const, icon: Clock, label: "Ativo" },
      MATCHED: {
        variant: "secondary" as const,
        icon: CheckCircle,
        label: "Emparelhado",
      },
      CANCELLED: {
        variant: "destructive" as const,
        icon: XCircle,
        label: "Cancelado",
      },
      EXPIRED: {
        variant: "outline" as const,
        icon: AlertCircle,
        label: "Expirado",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.ACTIVE;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

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
