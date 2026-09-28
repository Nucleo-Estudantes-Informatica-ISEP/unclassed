"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowLeftRight,
  Calendar,
  CheckCircle,
  Clock,
  Package2,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { logger } from "@/lib/clientLogger";
import { Badge } from "@/lib/components/ui/badge";
import { Button } from "@/lib/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/lib/components/ui/card";
import { ClientDate } from "@/components/ClientDate";

interface SwapRequestCardProps {
  request: SwapRequest;
  type: "single" | "bundle";
  onUpdate?: () => void;
  showActions?: boolean;
}

interface SwapRequestClass {
  id: string;
  name: string;
  year: number;
}

interface SwapRequestSubject {
  code?: string;
  name?: string;
  year?: number;
  semester?: number;
}

interface SwapRequest {
  id: string;
  status: string;
  createdAt: string | Date;
  currentClass?: SwapRequestClass;
  preferredClasses?: SwapRequestClass[];
  subject?: SwapRequestSubject;
}

export default function SwapRequestCard({
  request,
  type,
  onUpdate,
  showActions = true,
}: SwapRequestCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCancel = async () => {
    if (!confirm("Tens a certeza que queres cancelar este pedido?")) return;

    setIsLoading(true);
    try {
      const endpoint =
        type === "single"
          ? `/api/swap-requests/single/${request.id}`
          : `/api/swap-requests/bundle/${request.id}`;

      const response = await fetch(endpoint, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "CANCELLED" }),
      });

      if (!response.ok) {
        throw new Error("Erro ao cancelar pedido");
      }

      toast.success("Pedido cancelado com sucesso!");
      onUpdate?.();
    } catch {
      logger.error("Error cancelling request:");
      toast.error("Erro ao cancelar pedido");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Tens a certeza que queres eliminar este pedido? Esta ação não pode ser desfeita."
      )
    )
      return;

    setIsLoading(true);
    try {
      const endpoint =
        type === "single"
          ? `/api/swap-requests/single/${request.id}`
          : `/api/swap-requests/bundle/${request.id}`;

      const response = await fetch(endpoint, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Erro ao eliminar pedido");
      }

      toast.success("Pedido eliminado com sucesso!");
      onUpdate?.();
    } catch {
      logger.error("Error deleting request:");
      toast.error("Erro ao eliminar pedido");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ACTIVE: {
        variant: "default" as const,
        icon: Clock,
        label: "Ativo",
        color: "text-primary",
      },
      MATCHED: {
        variant: "secondary" as const,
        icon: CheckCircle,
        label: "Emparelhado",
        color: "text-accent-foreground",
      },
      CANCELLED: {
        variant: "destructive" as const,
        icon: XCircle,
        label: "Cancelado",
        color: "text-red-600",
      },
      EXPIRED: {
        variant: "outline" as const,
        icon: AlertCircle,
        label: "Expirado",
        color: "text-yellow-600",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.ACTIVE;
    const Icon = config.icon;

    return (
      <Badge
        variant={config.variant}
        className={`flex items-center gap-1 ${config.color}`}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Removed formatDate function - using ClientDate component instead

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`rounded-lg p-2 ${type === "single" ? "bg-primary/10" : "bg-accent/30"}`}
            >
              {type === "single" ? (
                <ArrowLeftRight
                  className={`h-5 w-5 ${type === "single" ? "text-primary" : "text-accent-foreground"}`}
                />
              ) : (
                <Package2
                  className={`h-5 w-5 ${type === "bundle" ? "text-accent-foreground" : "text-primary"}`}
                />
              )}
            </div>
            <div>
              <CardTitle className="text-base">
                {type === "single"
                  ? `${request.subject?.code} - ${request.subject?.name}`
                  : `Permuta Completa - ${request.currentClass?.year}º Ano`}
              </CardTitle>
              <CardDescription className="mt-1 flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                Criado em <ClientDate date={request.createdAt} format="time" />
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(request.status)}
            <Badge variant="outline" className="text-xs">
              {type === "single" ? "Individual" : "Completo"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Class */}
        <div className="bg-muted/50 flex items-center justify-between rounded-lg p-3">
          <div>
            <p className="text-muted-foreground text-sm font-medium">
              Turma Atual
            </p>
            <p className="font-semibold">{request.currentClass?.name}</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-sm">
              {request.currentClass?.year}º Ano
            </p>
          </div>
        </div>

        {/* Preferred Classes */}
        <div>
          <p className="text-muted-foreground mb-2 text-sm font-medium">
            Turmas Preferidas
          </p>
          <div className="flex flex-wrap gap-2">
            {request.preferredClasses?.map((cls, index) => (
              <Badge
                key={cls.id}
                variant={index === 0 ? "default" : "secondary"}
                className={index === 0 ? "border-primary/20 border-2" : ""}
              >
                {cls.name}
                {index === 0 && " (1ª opção)"}
              </Badge>
            )) || (
              <span className="text-muted-foreground text-sm">
                Nenhuma turma especificada
              </span>
            )}
          </div>
        </div>

        {/* Additional Info for Single Requests */}
        {type === "single" && request.subject && (
          <div className="grid grid-cols-2 gap-4 rounded-lg border p-3">
            <div>
              <p className="text-muted-foreground text-xs">Ano Académico</p>
              <p className="font-medium">{request.subject.year}º Ano</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Semestre</p>
              <p className="font-medium">
                {request.subject.semester}º Semestre
              </p>
            </div>
          </div>
        )}

        {/* Status Info */}
        {request.status === "MATCHED" && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
            <div className="mb-1 flex items-center gap-2">
              <Users className="text-accent-foreground h-4 w-4" />
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Match Encontrado!
              </p>
            </div>
            <p className="text-accent-foreground mb-2 text-xs dark:text-green-300">
              O sistema encontrou uma permuta compatível. Verifique a secção
              Matches para mais detalhes.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="border-green-300 bg-white text-green-700 hover:bg-green-50"
              onClick={() => {
                // Trigger tab change to matches - this would need to be passed as a prop
                window.dispatchEvent(new CustomEvent("switchToMatchesTab"));
              }}
            >
              <Users className="mr-2 h-3 w-3" />
              Ver Matches
            </Button>
          </div>
        )}

        {request.status === "ACTIVE" && (
          <div className="bg-primary/10 border-primary/30 rounded-lg border p-3">
            <div className="mb-1 flex items-center gap-2">
              <Clock className="text-primary h-4 w-4" />
              <p className="text-primary text-sm font-medium">
                À Procura de Match
              </p>
            </div>
            <p className="text-primary text-xs">
              O sistema está a procurar ativamente por permutas compatíveis.
            </p>
          </div>
        )}

        {/* Actions */}
        {showActions && request.status === "ACTIVE" && (
          <div className="flex gap-2 border-t pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isLoading}
              className="flex-1"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        {showActions && request.status !== "ACTIVE" && (
          <div className="flex justify-end border-t pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isLoading}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
