"use client";

import { useState } from "react";
import { Button } from "@/lib/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/lib/components/ui/card";
import { Clock, CheckCircle, XCircle, AlertTriangle, Users, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { ClientDate } from "@/components/ClientDate";
import { useRouter } from "next/navigation";

interface MatchParticipant {
  userId: string;
  fromClass: string | { id: string; name: string; year: number };
  toClass: string | { id: string; name: string; year: number };
  requestId: string;
  requestType: 'single' | 'bundle';
  satisfactionScore: number;
  status?: 'pending' | 'accepted' | 'rejected' | 'completed';
  user?: { id: string; name: string; email: string; phone?: string | null; sharePhoneOnMatch?: boolean };
}

interface Match {
  id: string;
  matchType: 'SINGLE' | 'BUNDLE';
  swapPattern: 'DIRECT' | 'THREE_WAY' | 'MULTI_WAY';
  status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'PROVISIONAL' | 'UPGRADED';
  isProvisional: boolean;
  provisionalUntil?: string | null;
  satisfactionScore: number;
  participants: MatchParticipant[];
  createdAt: string;
  subject?: { id: string; code: string; name: string; year: number; semester: number };
}

interface MatchCardProps {
  match: Match;
  currentUserId: string;
}

export function MatchCard({ match, currentUserId }: MatchCardProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const userParticipant = match.participants.find(p => p.userId === currentUserId);
  const isUserParticipant = !!userParticipant;

  // Calculate time remaining for revocation
  const provisionalUntil = match.provisionalUntil ? new Date(match.provisionalUntil) : null;
  const now = new Date();
  const canRevoke = provisionalUntil && now < provisionalUntil;
  const timeRemaining = provisionalUntil ? Math.max(0, provisionalUntil.getTime() - now.getTime()) : 0;
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  const handleMatchAction = async (action: 'accept' | 'reject' | 'complete' | 'revoke') => {
    if (!isUserParticipant) {
      toast.error("Não é participante neste match");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/matches/${match.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Falha ao atualizar match");
      }

      const result = await response.json();

      toast.success(result.message);
      router.refresh();

    } catch (error) {
      console.error('Match action error:', error);
      toast.error(error instanceof Error ? error.message : "Falha ao atualizar match");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    const statusClasses = {
      'PROPOSED': 'bg-gray-100 text-gray-800',
      'PROVISIONAL': 'bg-yellow-100 text-yellow-800',
      'ACCEPTED': 'bg-blue-100 text-blue-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'REJECTED': 'bg-red-100 text-red-800',
      'UPGRADED': 'bg-purple-100 text-purple-800'
    };

    const statusText = {
      'PROPOSED': '📋 Proposto',
      'PROVISIONAL': '⏳ Provisório',
      'ACCEPTED': '✅ Aceite',
      'COMPLETED': '🎉 Completo',
      'REJECTED': '❌ Rejeitado',
      'UPGRADED': '⬆️ Atualizado'
    };

    const className = statusClasses[match.status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800';
    const text = statusText[match.status as keyof typeof statusText] || match.status;

    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className} shrink-0`}>{text}</span>;
  };

  const getPatternIcon = () => {
    switch (match.swapPattern) {
      case 'DIRECT':
        return <ArrowRightLeft className="h-4 w-4" />;
      case 'THREE_WAY':
        return <Users className="h-4 w-4" />;
      case 'MULTI_WAY':
        return <Users className="h-4 w-4" />;
      default:
        return <ArrowRightLeft className="h-4 w-4" />;
    }
  };

  const renderParticipants = () => {
    return match.participants.map((participant, index) => {
      const isCurrentUser = participant.userId === currentUserId;

      return (
        <div
          key={index}
          className={`p-4 rounded-lg border ${isCurrentUser ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' : 'bg-muted border-border'}`}
        >
          <div className="space-y-2">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-semibold text-base text-foreground break-words">
                {participant.user?.name || `Utilizador ${participant.userId.slice(-4)}`}
              </p>
              {participant.status && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 self-start sm:self-auto">
                  {participant.status}
                </span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-2 text-sm text-muted-foreground">
              <span className="bg-background px-2 py-1 rounded border border-border w-full sm:w-auto">
                De: <span className="font-medium text-foreground">
                  {typeof participant.fromClass === 'object' ? participant.fromClass.name : participant.fromClass}
                </span>
              </span>
              <span className="hidden sm:inline text-muted-foreground">→</span>
              <span className="bg-background px-2 py-1 rounded border border-border w-full sm:w-auto">
                Para: <span className="font-medium text-foreground">
                  {typeof participant.toClass === 'object' ? participant.toClass.name : participant.toClass}
                </span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Satisfação: {Math.round(participant.satisfactionScore * 100)}%
            </p>
            {/* Contact Information */}
            {!isCurrentUser && participant.user && match.status === 'ACCEPTED' && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs font-medium text-foreground mb-1">📞 Contacto:</p>
                <div className="space-y-1 break-words">
                  <p className="text-xs text-muted-foreground">
                    📧 {participant.user.email}
                  </p>
                  {participant.user.sharePhoneOnMatch && participant.user.phone && (
                    <p className="text-xs text-muted-foreground">
                      📱 {participant.user.phone}
                    </p>
                  )}
                  {!participant.user.sharePhoneOnMatch && (
                    <p className="text-xs text-muted-foreground italic">
                      📱 Telemóvel não partilhado
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    });
  };

  const renderActionButtons = () => {
    if (!isUserParticipant) return null;

    const userStatus = userParticipant?.status || 'pending';

    switch (match.status) {
      case 'PROPOSED':
      case 'PROVISIONAL':
        if (userStatus === 'pending') {
          return (
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button
                onClick={() => handleMatchAction('accept')}
                disabled={loading}
                className="w-full sm:flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Aceitar Match
              </Button>
              <Button
                onClick={() => handleMatchAction('reject')}
                disabled={loading}
                variant="destructive"
                className="w-full sm:flex-1"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Rejeitar
              </Button>
            </div>
          );
        } else if (userStatus === 'accepted' && canRevoke) {
          return (
            <div className="space-y-2 w-full">
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <Clock className="h-4 w-4" />
                <span>
                  Pode revogar em {hoursRemaining}h {minutesRemaining}m
                </span>
              </div>
              <Button
                onClick={() => handleMatchAction('revoke')}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                Revogar Match
              </Button>
            </div>
          );
        } else if (userStatus === 'accepted') {
          return (
            <div className="text-center text-sm text-gray-600 w-full">
              ✅ Aceitou este match. A aguardar pelos outros...
            </div>
          );
        }
        break;

      case 'ACCEPTED':
        if (userStatus !== 'completed') {
          return (
            <Button
              onClick={() => handleMatchAction('complete')}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Marcar como Completo
            </Button>
          );
        } else {
          return (
            <div className="text-center text-sm text-green-600 w-full">
              ✅ Completou a sua parte. A aguardar pelos outros...
            </div>
          );
        }

      case 'COMPLETED':
        return (
          <div className="text-center text-sm text-green-600 font-medium w-full">
            🎉 Permuta concluída com sucesso!
          </div>
        );

      case 'REJECTED':
        return (
          <div className="text-center text-sm text-red-600 w-full">
            ❌ Este match foi rejeitado
          </div>
        );
    }

    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {getPatternIcon()}
            <div className="min-w-0">
              <h3 className="text-lg font-semibold break-words">
                {match.swapPattern === 'DIRECT' ? 'Permuta Direta' :
                 match.swapPattern === 'THREE_WAY' ? 'Permuta 3-Vias' :
                 match.swapPattern === 'MULTI_WAY' ? 'Permuta Múltipla' : match.swapPattern} {match.matchType === 'SINGLE' ? 'disciplina individual' : 'completa'}
              </h3>
              {match.subject && (
                <p className="text-sm text-gray-600 font-medium break-words">
                  {match.subject.code} - {match.subject.name}
                </p>
              )}
            </div>
          </div>
          {getStatusBadge()}
        </div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mt-2">
          <span className="text-sm text-gray-600">
            {match.participants.length} participantes •
            {Math.round(match.satisfactionScore * 100)}% satisfação
          </span>
          <ClientDate
            date={match.createdAt}
            format="short"
            className="text-xs text-gray-500"
          />
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {renderParticipants()}
        </div>

        {match.isProvisional && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-800 mb-2">
              <AlertTriangle className="h-4 w-4" />
              <span>
                <strong>Match Provisório:</strong> Este não é o seu match preferido.
              </span>
            </div>
            <div className="text-xs text-blue-600">
              <p className="mb-1">
                🔍 O sistema continua à procura de um match melhor durante <strong>6 horas</strong>.
              </p>
              <p>
                ✨ Se encontrarmos uma opção melhor, atualizamos automaticamente!
              </p>
              {canRevoke && (
                <p className="mt-2 font-medium">
                  ⏰ Tempo restante: {hoursRemaining}h {minutesRemaining}m
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="w-full">
        {renderActionButtons()}
      </CardFooter>
    </Card>
  );
}
