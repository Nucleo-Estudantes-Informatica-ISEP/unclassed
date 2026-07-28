"use client";

import { AlertCircle, ArrowLeftRight, CheckCircle, Clock, Package2, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/lib/components/ui/badge";
import { Button } from "@/lib/components/ui/button";
import { Card, CardContent } from "@/lib/components/ui/card";
import { useBundleSwapRequests, useSingleSwapRequests } from "@/hooks/useApi";
import { ClientDate } from "@/components/ClientDate";

interface RequestsClientProps {
  userId: string;
}

export default function RequestsClient({ userId }: RequestsClientProps) {
  const {
    data: singleRequests,
    loading: singleLoading,
  } = useSingleSwapRequests(userId);

  const {
    data: bundleRequests,
    loading: bundleLoading,
  } = useBundleSwapRequests(userId);

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

  if (singleLoading || bundleLoading) {
    return (
      <div className="w-full bg-background py-8">
        <div className="container mx-auto px-4 sm:px-10">
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-background py-8">
      <div className="container mx-auto px-4 sm:px-10 space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Os Meus Pedidos</h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            Gere todos os teus pedidos de permuta ativos e passados
          </p>
        </div>

        <div className="space-y-8">
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
                              ?.map((cls: { name: string }) => cls.name)
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
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full sm:w-auto"
                            onClick={() => handleDeleteRequest(request.id, "single")}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                          </Button>
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
                              ?.map((cls: { name: string }) => cls.name)
                              .join(", ")}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Criado em <ClientDate date={request.createdAt} format="short" />
                          </p>
                        </div>
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
                          {request.status === "ACTIVE" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full sm:w-auto"
                              onClick={() => handleCancelRequest(request.id, "bundle")}
                            >
                              Cancelar
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full sm:w-auto"
                            onClick={() => handleDeleteRequest(request.id, "bundle")}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                          </Button>
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
      </div>
    </div>
  );
}
