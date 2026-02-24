"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/lib/components/ui/card";
import { Badge } from "@/lib/components/ui/badge";
import { Button } from "@/lib/components/ui/button";
import { 
  ArrowLeftRight, 
  Package2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Trash2,
  Edit3,
  Users,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
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

export default function SwapRequestCard({ request, type, onUpdate, showActions = true }: SwapRequestCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCancel = async () => {
    if (!confirm("Tens a certeza que queres cancelar este pedido?")) return;
    
    setIsLoading(true);
    try {
      const endpoint = type === "single" 
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
    } catch (error) {
      console.error("Error cancelling request:", error);
      toast.error("Erro ao cancelar pedido");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Tens a certeza que queres eliminar este pedido? Esta ação não pode ser desfeita.")) return;
    
    setIsLoading(true);
    try {
      const endpoint = type === "single" 
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
    } catch (error) {
      console.error("Error deleting request:", error);
      toast.error("Erro ao eliminar pedido");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ACTIVE: { variant: "default" as const, icon: Clock, label: "Ativo", color: "text-blue-600" },
      MATCHED: { variant: "secondary" as const, icon: CheckCircle, label: "Emparelhado", color: "text-green-600" },
      CANCELLED: { variant: "destructive" as const, icon: XCircle, label: "Cancelado", color: "text-red-600" },
      EXPIRED: { variant: "outline" as const, icon: AlertCircle, label: "Expirado", color: "text-yellow-600" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ACTIVE;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`flex items-center gap-1 ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  // Removed formatDate function - using ClientDate component instead

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${type === 'single' ? 'bg-blue-100 dark:bg-blue-900/20' : 'bg-green-100 dark:bg-green-900/20'}`}>
              {type === 'single' ? (
                <ArrowLeftRight className={`h-5 w-5 ${type === 'single' ? 'text-blue-600' : 'text-green-600'}`} />
              ) : (
                <Package2 className={`h-5 w-5 ${type === 'bundle' ? 'text-green-600' : 'text-blue-600'}`} />
              )}
            </div>
            <div>
              <CardTitle className="text-base">
                {type === 'single' 
                  ? `${request.subject?.code} - ${request.subject?.name}`
                  : `Permuta Completa - ${request.currentClass?.year}º Ano`
                }
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Calendar className="h-3 w-3" />
                Criado em <ClientDate date={request.createdAt} format="time" />
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(request.status)}
            <Badge variant="outline" className="text-xs">
              {type === 'single' ? 'Individual' : 'Completo'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Class */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Turma Atual</p>
            <p className="font-semibold">{request.currentClass?.name}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{request.currentClass?.year}º Ano</p>
          </div>
        </div>

        {/* Preferred Classes */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Turmas Preferidas</p>
          <div className="flex flex-wrap gap-2">
            {request.preferredClasses?.map((cls, index) => (
              <Badge 
                key={cls.id} 
                variant={index === 0 ? "default" : "secondary"}
                className={index === 0 ? "border-2 border-primary/20" : ""}
              >
                {cls.name}
                {index === 0 && " (1ª opção)"}
              </Badge>
            )) || (
              <span className="text-sm text-muted-foreground">Nenhuma turma especificada</span>
            )}
          </div>
        </div>

        {/* Additional Info for Single Requests */}
        {type === 'single' && request.subject && (
          <div className="grid grid-cols-2 gap-4 p-3 border rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Ano Académico</p>
              <p className="font-medium">{request.subject.year}º Ano</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Semestre</p>
              <p className="font-medium">{request.subject.semester}º Semestre</p>
            </div>
          </div>
        )}

        {/* Status Info */}
        {request.status === 'MATCHED' && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-green-600" />
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Match Encontrado!
              </p>
            </div>
            <p className="text-xs text-green-600 dark:text-green-300 mb-2">
              O sistema encontrou uma permuta compatível. Verifique a secção Matches para mais detalhes.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-white hover:bg-green-50 border-green-300 text-green-700"
              onClick={() => {
                // Trigger tab change to matches - this would need to be passed as a prop
                window.dispatchEvent(new CustomEvent('switchToMatchesTab'));
              }}
            >
              <Users className="mr-2 h-3 w-3" />
              Ver Matches
            </Button>
          </div>
        )}

        {request.status === 'ACTIVE' && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                À Procura de Match
              </p>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-300">
              O sistema está a procurar ativamente por permutas compatíveis.
            </p>
          </div>
        )}

        {/* Actions */}
        {showActions && request.status === 'ACTIVE' && (
          <div className="flex gap-2 pt-2 border-t">
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

        {showActions && request.status !== 'ACTIVE' && (
          <div className="flex justify-end pt-2 border-t">
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
