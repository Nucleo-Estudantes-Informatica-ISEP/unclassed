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
import AdvancedMatchingDashboard from "@/components/admin/AdvancedMatchingDashboard";
import { ClientDate } from "@/components/ClientDate";

interface UserDashboardProps {
  userId: string;
  userRole: "USER" | "ADMIN";
}

export default function UserDashboard({
  userId,
  userRole,
}: UserDashboardProps) {
  const [selectedTab, setSelectedTab] = useState("overview");
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

  const activeMatches =
    matches?.filter(
      (m) => m.status === "PROPOSED" || m.status === "ACCEPTED"
    ) || [];
  const completedMatches =
    matches?.filter((m) => m.status === "COMPLETED") || [];

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
        color: "text-blue-600",
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
    <div className="container mx-auto px-2 py-4 sm:px-4 sm:py-8">
      <div className="mx-auto w-full max-w-6xl">
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
                <Button className="w-full sm:w-auto bg-[#101010] text-[#CFCFCF] hover:bg-[#101010]/90 dark:bg-[#CFCFCF] dark:text-[#101010] dark:hover:bg-[#CFCFCF]/90">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Pedido
                </Button>
              </Link>
              <Link href="/matches" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto text-[#101010] dark:text-[#CFCFCF]">
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Todos os Matches
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <Tabs
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="space-y-4 sm:space-y-6"
        >
          <TabsList className={`grid w-full ${userRole === 'ADMIN' ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="requests">Pedidos</TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
            {userRole === 'ADMIN' && (
              <TabsTrigger value="admin">Admin Dashboard</TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
              <Card
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => setSelectedTab("requests")}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Pedidos de Permuta
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold sm:text-2xl">
                    {(singleRequests?.length || 0) +
                      (bundleRequests?.length || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {activeRequests.length} ativos • {matchedRequests.length}{" "}
                    emparelhados
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 w-full text-xs sm:w-auto"
                  >
                    Ver pedidos →
                  </Button>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => router.push("/matches")}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Matches</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold sm:text-2xl">
                    {matches?.length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {activeMatches.length} em progresso •{" "}
                    {completedMatches.length} completos
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 w-full text-xs sm:w-auto"
                  >
                    Ver matches →
                  </Button>
                </CardContent>
              </Card>
            </div>

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
                        className="flex cursor-pointer flex-col gap-3 rounded-lg border p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 sm:flex-row sm:items-center sm:justify-between"
                        onClick={() => router.push("/matches")}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`rounded-full p-2 ${
                              match.matchType === "SINGLE" ? "bg-blue-100" : "bg-green-100"
                            }`}
                          >
                            {match.matchType === "SINGLE" ? (
                              <ArrowLeftRight className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Package2 className="h-4 w-4 text-green-600" />
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
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Os Meus Pedidos</h2>
                <p className="text-muted-foreground">
                  Gere todos os teus pedidos de permuta
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Single Swap Requests */}
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <ArrowLeftRight className="h-5 w-5" />
                  Permutas Individuais
                </h3>
                {singleRequests && singleRequests.length > 0 ? (
                  <div className="grid gap-4">
                    {singleRequests.map((request) => (
                      <Card key={request.id}>
                        <CardContent className="p-6">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <h4 className="font-semibold min-w-0 break-words">
                                  {request.subject?.code} - {request.subject?.name}
                                </h4>
                                {getStatusBadge(request.status)}
                              </div>
                              <p className="mb-2 text-sm text-muted-foreground">
                                <strong>Turma atual:</strong> {request.currentClass?.name}
                              </p>
                              <p className="text-sm text-muted-foreground break-words">
                                <strong>Turmas preferidas:</strong> {request.preferredClasses
                                  ?.map((cls: any) => cls.name)
                                  .join(", ")}
                              </p>
                              <p className="mt-2 text-xs text-muted-foreground">
                                Criado em <ClientDate date={request.createdAt} format="short" />
                              </p>
                            </div>
                            <div className="flex w-full gap-2 sm:w-auto sm:justify-end">
                              {request.status === "ACTIVE" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full sm:w-auto"
                                  onClick={() => handleCancelRequest(request.id, "single")}
                                >
                                  Cancelar
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <ArrowLeftRight className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Nenhuma permuta individual criada
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Bundle Swap Requests */}
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <Package2 className="h-5 w-5" />
                  Permutas Completas
                </h3>
                {bundleRequests && bundleRequests.length > 0 ? (
                  <div className="grid gap-4">
                    {bundleRequests.map((request) => (
                      <Card key={request.id}>
                        <CardContent className="p-6">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <h4 className="font-semibold min-w-0 break-words">
                                  Permuta Completa - {request.currentClass?.year}º Ano
                                </h4>
                                {getStatusBadge(request.status)}
                              </div>
                              <p className="mb-2 text-sm text-muted-foreground">
                                <strong>Turma atual:</strong> {request.currentClass?.name}
                              </p>
                              <p className="text-sm text-muted-foreground break-words">
                                <strong>Turmas preferidas:</strong> {request.preferredClasses
                                  ?.map((cls: any) => cls.name)
                                  .join(", ")}
                              </p>
                              <p className="mt-2 text-xs text-muted-foreground">
                                Criado em {new Date(request.createdAt).toLocaleDateString("pt-PT")}
                              </p>
                            </div>
                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
                              {request.status === "ACTIVE" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full sm:w-auto"
                                    onClick={() => handleCancelRequest(request.id, "bundle")}
                                  >
                                    Cancelar
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="w-full sm:w-auto"
                                    onClick={() => handleDeleteRequest(request.id, "bundle")}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Package2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Nenhuma permuta completa criada
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Matches Tab */}
          <TabsContent value="matches" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Matches Ativos</h2>
              <p className="text-muted-foreground">
                Permutas encontradas pelo sistema que envolvem os teus pedidos
              </p>
            </div>

            {matches && matches.length > 0 ? (
              <div className="space-y-4">
                {matches.map((match) => (
                  <Card key={match.id}>
                    <CardHeader>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <CardTitle className="flex flex-wrap items-center gap-2">
                            {match.matchType === "SINGLE" ? (
                              <ArrowLeftRight className="h-5 w-5" />
                            ) : (
                              <Package2 className="h-5 w-5" />
                            )}
                            Match {match.swapPattern.toLowerCase()}
                            <Badge variant="outline">
                              {match.matchType === "SINGLE" ? "Individual" : "Completo"}
                            </Badge>
                          </CardTitle>
                          <CardDescription>
                            {match.participants.length} participantes envolvidos
                          </CardDescription>
                        </div>
                        {getMatchStatusBadge(match.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <h4 className="font-medium">Participantes:</h4>
                        {match.participants.map((participant: any, index: number) => (
                          <div
                            key={index}
                            className="flex flex-col gap-2 rounded-lg bg-muted p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="font-medium break-words">{participant.user?.name}</p>
                              <p className="text-sm text-muted-foreground break-words">{participant.user?.email}</p>
                            </div>
                            <div className="text-left sm:text-right">
                              <p className="text-sm break-words">
                                <span className="font-medium">{participant.fromClass?.name}</span>
                                {" → "}
                                <span className="font-medium">{participant.toClass?.name}</span>
                              </p>
                            </div>
                          </div>
                        ))}
                        <p className="mt-4 text-xs text-muted-foreground">
                          Criado em <ClientDate date={match.createdAt} format="short" />
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="mb-2 text-lg font-medium">
                    Nenhum match encontrado
                  </p>
                  <p className="text-muted-foreground">
                    O sistema ainda não encontrou permutas compatíveis com os
                    teus pedidos.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Admin Dashboard Tab */}
          {userRole === "ADMIN" && (
            <TabsContent value="admin" className="space-y-6">
              <AdvancedMatchingDashboard />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
