"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/lib/components/ui/card";
import { Badge } from "@/lib/components/ui/badge";
import { Button } from "@/lib/components/ui/button";
import { 
  ArrowLeftRight, 
  Package2, 
  Users,
  Calendar,
  ArrowRight,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { ClientDate } from "@/components/ClientDate";

interface MatchCardProps {
  match: any;
  currentUserId?: string;
  showActions?: boolean;
}

export default function MatchCard({ match, currentUserId, showActions = true }: MatchCardProps) {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PROPOSED: { variant: "outline" as const, icon: Clock, label: "Proposto", color: "text-blue-600" },
      ACCEPTED: { variant: "default" as const, icon: CheckCircle, label: "Aceite", color: "text-green-600" },
      REJECTED: { variant: "destructive" as const, icon: XCircle, label: "Rejeitado", color: "text-red-600" },
      COMPLETED: { variant: "secondary" as const, icon: CheckCircle, label: "Completo", color: "text-gray-600" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PROPOSED;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`flex items-center gap-1 ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getPatternBadge = (pattern: string) => {
    const patternConfig = {
      DIRECT: { label: "Direto", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300", description: "Troca simples entre 2 pessoas" },
      THREE_WAY: { label: "3 Vias", color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300", description: "Ciclo de 3 pessoas" },
      MULTI_WAY: { label: "Multi-Vias", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300", description: "Ciclo complexo" },
    };

    const config = patternConfig[pattern as keyof typeof patternConfig] || patternConfig.DIRECT;
    
    return (
      <Badge className={config.color} title={config.description}>
        {config.label}
      </Badge>
    );
  };

  // Removed formatDate function - using ClientDate component instead

  const isCurrentUserInvolved = (participants: any[]) => {
    return currentUserId && participants.some((p: any) => p.userId === currentUserId);
  };

  const getCurrentUserParticipation = (participants: any[]) => {
    return participants.find((p: any) => p.userId === currentUserId);
  };

  const currentUserParticipation = getCurrentUserParticipation(match.participants);

  return (
    <Card className={`hover:shadow-md transition-shadow ${isCurrentUserInvolved(match.participants) ? 'ring-2 ring-primary/20' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${match.matchType === 'SINGLE' ? 'bg-blue-100 dark:bg-blue-900/20' : 'bg-green-100 dark:bg-green-900/20'}`}>
              {match.matchType === 'SINGLE' ? (
                <ArrowLeftRight className="h-5 w-5 text-blue-600" />
              ) : (
                <Package2 className="h-5 w-5 text-green-600" />
              )}
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Match {match.swapPattern.toLowerCase()}
                {getPatternBadge(match.swapPattern)}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Calendar className="h-3 w-3" />
                Criado em <ClientDate date={match.createdAt} format="time" />
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(match.status)}
            <Badge variant="outline" className="text-xs">
              {match.matchType === 'SINGLE' ? 'Individual' : 'Completo'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current User Involvement */}
        {isCurrentUserInvolved(match.participants) && currentUserParticipation && (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-primary">
                Está envolvido neste match
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{currentUserParticipation.fromClass?.name}</span>
              <ArrowRight className="h-3 w-3" />
              <span className="font-medium">{currentUserParticipation.toClass?.name}</span>
            </div>
          </div>
        )}

        {/* Participants */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">
              Participantes ({match.participants.length})
            </p>
          </div>
          
          <div className="space-y-2">
            {match.participants.map((participant: any, index: number) => (
              <div 
                key={index} 
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  participant.userId === currentUserId 
                    ? 'bg-primary/5 border-primary/20' 
                    : 'bg-muted/30'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {participant.user?.name}
                      {participant.userId === currentUserId && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Tu
                        </Badge>
                      )}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {participant.user?.email}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{participant.fromClass?.name}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium text-green-600">{participant.toClass?.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {participant.requestType === 'single' ? 'Individual' : 'Completo'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Match Details */}
        <div className="grid grid-cols-2 gap-4 p-3 border rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Tipo de Permuta</p>
            <p className="font-medium">
              {match.matchType === 'SINGLE' ? 'Individual' : 'Completa'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Padrão</p>
            <p className="font-medium">
              {match.swapPattern === 'DIRECT' && 'Direto'}
              {match.swapPattern === 'THREE_WAY' && '3 Vias'}
              {match.swapPattern === 'MULTI_WAY' && 'Multi-Vias'}
            </p>
          </div>
        </div>

        {/* Status Description */}
        {match.status === 'PROPOSED' && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Aguarda Confirmação
              </p>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-300">
              Este match foi proposto pelo sistema e aguarda a confirmação de todos os participantes.
            </p>
          </div>
        )}

        {match.status === 'ACCEPTED' && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Match Aceite
              </p>
            </div>
            <p className="text-xs text-green-600 dark:text-green-300">
              Todos os participantes aceitaram esta permuta. Aguarda processamento administrativo.
            </p>
          </div>
        )}

        {match.status === 'COMPLETED' && (
          <div className="p-3 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-gray-600" />
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Permuta Completa
              </p>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Esta permuta foi processada com sucesso. As mudanças de turma foram aplicadas.
            </p>
          </div>
        )}

        {match.status === 'REJECTED' && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="h-4 w-4 text-red-600" />
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                Match Rejeitado
              </p>
            </div>
            <p className="text-xs text-red-600 dark:text-red-300">
              Este match foi rejeitado por um ou mais participantes.
            </p>
          </div>
        )}

        {/* Actions */}
        {showActions && match.status === 'PROPOSED' && isCurrentUserInvolved(match.participants) && (
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="default"
              size="sm"
              className="flex-1"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Aceitar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Rejeitar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
