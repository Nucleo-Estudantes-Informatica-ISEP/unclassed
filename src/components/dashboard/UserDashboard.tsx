"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/lib/components/ui/card";
import { Badge } from "@/lib/components/ui/badge";
import { Button } from "@/lib/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/lib/components/ui/tabs";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeftRight, 
  Package2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Plus,
  Eye,
  Trash2,
  Users
} from "lucide-react";
import { ClientDate } from "@/components/ClientDate";

import { useSingleSwapRequests, useBundleSwapRequests, useMatches } from "@/hooks/useApi";

interface UserDashboardProps {
  userId: string;
  userRole: "USER" | "ADMIN";
}

export default function UserDashboard({ userId, userRole }: UserDashboardProps) {
  const [selectedTab, setSelectedTab] = useState("overview");
  const router = useRouter();
  
  useEffect(() => {
    // Listen for custom event to switch to matches tab
    const handleSwitchToMatches = () => {
      setSelectedTab("matches");
    };
    
    window.addEventListener('switchToMatchesTab', handleSwitchToMatches);
    
    return () => {
      window.removeEventListener('switchToMatchesTab', handleSwitchToMatches);
    };
  }, []);
  
  const { 
    data: singleRequests, 
    loading: singleLoading, 
    error: singleError 
  } = useSingleSwapRequests(userRole === "ADMIN" ? undefined : userId);
  
  const { 
    data: bundleRequests, 
    loading: bundleLoading, 
    error: bundleError 
  } = useBundleSwapRequests(userRole === "ADMIN" ? undefined : userId);
  
  const { 
    data: matches, 
    loading: matchesLoading, 
    error: matchesError 
  } = useMatches(undefined, undefined, userRole === "ADMIN" ? undefined : userId);

  const activeRequests = [
    ...(singleRequests?.filter(r => r.status === "ACTIVE") || []),
    ...(bundleRequests?.filter(r => r.status === "ACTIVE") || [])
  ];

  const matchedRequests = [
    ...(singleRequests?.filter(r => r.status === "MATCHED") || []),
    ...(bundleRequests?.filter(r => r.status === "MATCHED") || [])
  ];

  const activeMatches = matches?.filter(m => m.status === "PROPOSED" || m.status === "ACCEPTED") || [];
  const completedMatches = matches?.filter(m => m.status === "COMPLETED") || [];

  const handleCancelRequest = async (requestId: string, type: "single" | "bundle") => {
    try {
      const endpoint = type === "single" 
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

  const handleDeleteRequest = async (requestId: string, type: "single" | "bundle") => {
    if (!confirm("Tens a certeza que queres eliminar este pedido? Esta ação não pode ser desfeita.")) {
      return;
    }

    try {
      const endpoint = type === "single" 
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
      MATCHED: { variant: "secondary" as const, icon: CheckCircle, label: "Emparelhado" },
      CANCELLED: { variant: "destructive" as const, icon: XCircle, label: "Cancelado" },
      EXPIRED: { variant: "outline" as const, icon: AlertCircle, label: "Expirado" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ACTIVE;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getMatchStatusBadge = (status: string) => {
    const statusConfig = {
      PROPOSED: { variant: "outline" as const, label: "Proposto", color: "text-blue-600" },
      ACCEPTED: { variant: "default" as const, label: "Aceite", color: "text-green-600" },
      REJECTED: { variant: "destructive" as const, label: "Rejeitado", color: "text-red-600" },
      COMPLETED: { variant: "secondary" as const, label: "Completo", color: "text-gray-600" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PROPOSED;

    return (
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>
    );
  };

  if (singleLoading || bundleLoading || matchesLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">
                Gere os teus pedidos de permuta e acompanha o progresso dos matches.
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/swap-requests">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Pedido
                </Button>
              </Link>
              <Link href="/matches">
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Todos os Matches
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="requests">Pedidos</TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => setSelectedTab("requests")}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Pedidos de Permuta
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(singleRequests?.length || 0) + (bundleRequests?.length || 0)}</div>
                  <p className="text-xs text-muted-foreground">
                    {activeRequests.length} ativos • {matchedRequests.length} emparelhados
                  </p>
                  <Button variant="ghost" size="sm" className="mt-2 h-6 text-xs">
                    Ver pedidos →
                  </Button>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => router.push('/matches')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Matches
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(matches?.length || 0)}</div>
                  <p className="text-xs text-muted-foreground">
                    {activeMatches.length} em progresso • {completedMatches.length} completos
                  </p>
                  <Button variant="ghost" size="sm" className="mt-2 h-6 text-xs">
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
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>Nenhuma atividade recente</p>
                    <p className="text-sm mt-1">Cria um pedido de permuta para começar!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeMatches.slice(0, 3).map((match) => (
                      <div 
                        key={match.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                        onClick={() => router.push('/matches')}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`p-2 rounded-full ${match.matchType === 'SINGLE' ? 'bg-blue-100' : 'bg-green-100'}`}>
                            {match.matchType === 'SINGLE' ? (
                              <ArrowLeftRight className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Package2 className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              Match {match.swapPattern.toLowerCase()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {match.participants.length} participantes • <ClientDate date={match.createdAt} format="short" />
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getMatchStatusBadge(match.status)}
                          <Button variant="ghost" size="sm" className="text-xs">
                            Ver match →
                          </Button>
                        </div>
                      </div>
                    ))}
                    {activeMatches.length > 3 && (
                      <div className="text-center pt-4">
                        <Button 
                          variant="outline" 
                          onClick={() => router.push('/matches')}
                          className="w-full"
                        >
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
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Os Meus Pedidos</h2>
                <p className="text-muted-foreground">
                  Gere todos os teus pedidos de permuta
                </p>
              </div>
              <Button asChild>
                <a href="/swap-requests">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Pedido
                </a>
              </Button>
            </div>

            <div className="space-y-4">
              {/* Single Swap Requests */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <ArrowLeftRight className="h-5 w-5" />
                  Permutas Individuais
                </h3>
                {singleRequests && singleRequests.length > 0 ? (
                  <div className="grid gap-4">
                    {singleRequests.map((request) => (
                      <Card key={request.id}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold">
                                  {request.subject?.code} - {request.subject?.name}
                                </h4>
                                {getStatusBadge(request.status)}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                <strong>Turma atual:</strong> {request.currentClass?.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                <strong>Turmas preferidas:</strong>{" "}
                                {request.preferredClasses?.map((cls: any) => cls.name).join(", ")}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Criado em <ClientDate date={request.createdAt} format="short" />
                              </p>
                            </div>
                            <div className="flex gap-2">
                              {request.status === "ACTIVE" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCancelRequest(request.id, "single")}
                                  >
                                    Cancelar
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteRequest(request.id, "single")}
                                  >
                                    <Trash2 className="h-4 w-4" />
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
                      <ArrowLeftRight className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Nenhuma permuta individual criada</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Bundle Swap Requests */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Package2 className="h-5 w-5" />
                  Permutas Completas
                </h3>
                {bundleRequests && bundleRequests.length > 0 ? (
                  <div className="grid gap-4">
                    {bundleRequests.map((request) => (
                      <Card key={request.id}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold">
                                  Permuta Completa - {request.currentClass?.year}º Ano
                                </h4>
                                {getStatusBadge(request.status)}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                <strong>Turma atual:</strong> {request.currentClass?.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                <strong>Turmas preferidas:</strong>{" "}
                                {request.preferredClasses?.map((cls: any) => cls.name).join(", ")}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Criado em {new Date(request.createdAt).toLocaleDateString("pt-PT")}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              {request.status === "ACTIVE" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCancelRequest(request.id, "bundle")}
                                  >
                                    Cancelar
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteRequest(request.id, "bundle")}
                                  >
                                    <Trash2 className="h-4 w-4" />
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
                      <Package2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Nenhuma permuta completa criada</p>
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
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {match.matchType === 'SINGLE' ? (
                              <ArrowLeftRight className="h-5 w-5" />
                            ) : (
                              <Package2 className="h-5 w-5" />
                            )}
                            Match {match.swapPattern.toLowerCase()}
                            <Badge variant="outline">
                              {match.matchType === 'SINGLE' ? 'Individual' : 'Completo'}
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
                          <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div>
                              <p className="font-medium">{participant.user?.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {participant.user?.email}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm">
                                <span className="font-medium">{participant.fromClass?.name}</span>
                                {" → "}
                                <span className="font-medium">{participant.toClass?.name}</span>
                              </p>
                            </div>
                          </div>
                        ))}
                        <p className="text-xs text-muted-foreground mt-4">
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
                  <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">Nenhum match encontrado</p>
                  <p className="text-muted-foreground">
                    O sistema ainda não encontrou permutas compatíveis com os teus pedidos.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
