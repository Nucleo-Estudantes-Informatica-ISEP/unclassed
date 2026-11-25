"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle,
  CheckCircle2,
  ClipboardList,
  Clock,
  Hourglass,
  Info,
  RefreshCw,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import type { MatchDto } from "@/types/match";
import { logger } from "@/lib/clientLogger";
import { Button } from "@/lib/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/lib/components/ui/card";
import { httpClient } from "@/lib/httpClient";
import { ClientDate } from "@/components/ClientDate";
import { MatchContactInfo } from "@/components/MatchContactInfo";

interface MatchCardProps {
  match: MatchDto;
  currentUserId: string;
  showActions?: boolean;
}

export function MatchCard({
  match,
  currentUserId,
  showActions = true,
}: MatchCardProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const userParticipant = match.participants.find(
    (p) => p.userId === currentUserId
  );
  const isUserParticipant = !!userParticipant;

  // Calculate time remaining for revocation
  const provisionalUntil = match.provisionalUntil
    ? new Date(match.provisionalUntil)
    : null;
  const now = new Date();
  const canRevoke = provisionalUntil && now < provisionalUntil;
  const timeRemaining = provisionalUntil
    ? Math.max(0, provisionalUntil.getTime() - now.getTime())
    : 0;
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor(
    (timeRemaining % (1000 * 60 * 60)) / (1000 * 60)
  );

  const handleMatchAction = async (
    action: "accept" | "reject" | "complete" | "revoke"
  ) => {
    if (!isUserParticipant) {
      toast.error("Não é participante neste match");
      return;
    }

    setLoading(true);

    try {
      const result = await httpClient.patch<{ message: string }>(
        `/api/matches/${match.id}`,
        { action },
        { credentials: "include" }
      );

      toast.success(result.message);
      router.refresh();
    } catch (error) {
      logger.error("Match action error:");
      toast.error(
        error instanceof Error ? error.message : "Falha ao atualizar match"
      );
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    const statusClasses = {
      PROPOSED: "bg-muted text-muted-foreground",
      PROVISIONAL: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
      ACCEPTED: "bg-primary/10 text-primary",
      COMPLETED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      REJECTED: "bg-destructive/10 text-destructive",
      UPGRADED: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    };

    const statusContent = {
      PROPOSED: (
        <>
          <ClipboardList className="mr-1 h-3 w-3" /> Proposto
        </>
      ),
      PROVISIONAL: (
        <>
          <Hourglass className="mr-1 h-3 w-3" /> Provisório
        </>
      ),
      ACCEPTED: (
        <>
          <CheckCircle2 className="mr-1 h-3 w-3" /> Aceite
        </>
      ),
      COMPLETED: (
        <>
          <CheckCircle className="mr-1 h-3 w-3" /> Completo
        </>
      ),
      REJECTED: (
        <>
          <XCircle className="mr-1 h-3 w-3" /> Rejeitado
        </>
      ),
      UPGRADED: (
        <>
          <RefreshCw className="mr-1 h-3 w-3" /> Atualizado
        </>
      ),
    };

    const className =
      statusClasses[match.status as keyof typeof statusClasses] ||
      "bg-gray-100 text-gray-800";
    const content =
      statusContent[match.status as keyof typeof statusContent] || match.status;

    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className} shrink-0`}
      >
        {content}
      </span>
    );
  };

  const getPatternIcon = () => {
    switch (match.swapPattern) {
      case "DIRECT":
        return <ArrowRightLeft className="h-4 w-4" />;
      case "THREE_WAY":
        return <Users className="h-4 w-4" />;
      case "MULTI_WAY":
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
          className={`rounded-lg border p-4 ${isCurrentUser ? "bg-primary/10 border-primary/30" : "bg-muted border-border"}`}
        >
          <div className="space-y-2">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-foreground text-base font-semibold break-words">
                {participant.user?.name ||
                  `Utilizador ${participant.userId.slice(-4)}`}
              </p>
              {participant.status && (
                <span className="bg-muted text-muted-foreground inline-flex items-center self-start rounded-full px-2 py-1 text-xs font-medium sm:self-auto">
                  {participant.status}
                </span>
              )}
            </div>
            <div className="text-muted-foreground flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center">
              <span className="bg-background border-border w-full rounded border px-2 py-1 sm:w-auto">
                De:{" "}
                <span className="text-foreground font-medium">
                  {typeof participant.fromClass === "object"
                    ? participant.fromClass.name
                    : participant.fromClass}
                </span>
              </span>
              <span className="text-muted-foreground hidden sm:inline">→</span>
              <span className="bg-background border-border w-full rounded border px-2 py-1 sm:w-auto">
                Para:{" "}
                <span className="text-foreground font-medium">
                  {typeof participant.toClass === "object"
                    ? participant.toClass.name
                    : participant.toClass}
                </span>
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              Satisfação: {Math.round((participant.satisfactionScore ?? 0) * 100)}%
            </p>
            {/* Contact Information */}
            {!isCurrentUser &&
              participant.user &&
              match.status === "ACCEPTED" && (
                <div className="border-border mt-3 border-t pt-3">
                  <MatchContactInfo user={participant.user} />
                </div>
              )}
          </div>
        </div>
      );
    });
  };

  const renderActionButtons = () => {
    if (!isUserParticipant) return null;

    const userStatus = userParticipant?.status || "pending";

    switch (match.status) {
      case "PROPOSED":
      case "PROVISIONAL":
        if (userStatus === "pending") {
          return (
            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <Button
                onClick={() => handleMatchAction("accept")}
                disabled={loading}
                className="w-full sm:flex-1"
              >
                <CheckCircle className="mr-1 h-4 w-4" />
                Aceitar Match
              </Button>
              <Button
                onClick={() => handleMatchAction("reject")}
                disabled={loading}
                variant="destructive"
                className="w-full sm:flex-1"
              >
                <XCircle className="mr-1 h-4 w-4" />
                Rejeitar
              </Button>
            </div>
          );
        } else if (userStatus === "accepted" && canRevoke) {
          return (
            <div className="w-full space-y-2">
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <Clock className="h-4 w-4" />
                <span>
                  Pode revogar em {hoursRemaining}h {minutesRemaining}m
                </span>
              </div>
              <Button
                onClick={() => handleMatchAction("revoke")}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <AlertTriangle className="mr-1 h-4 w-4" />
                Revogar Match
              </Button>
            </div>
          );
        } else if (userStatus === "accepted") {
          return (
            <div className="text-muted-foreground flex w-full items-center justify-center gap-2 text-center text-sm">
              <Hourglass className="h-4 w-4" /> Aceitou este match. A aguardar
              pelos outros...
            </div>
          );
        }
        break;

      case "ACCEPTED":
        if (userStatus !== "completed") {
          return (
            <Button
              onClick={() => handleMatchAction("complete")}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="mr-1 h-4 w-4" />
              Marcar como Completo
            </Button>
          );
        } else {
          return (
            <div className="flex w-full items-center justify-center gap-2 text-center text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" /> Completou a sua parte. A
              aguardar pelos outros...
            </div>
          );
        }

      case "COMPLETED":
        return (
          <div className="flex w-full items-center justify-center gap-2 text-center text-sm font-medium text-green-600">
            <CheckCircle2 className="h-4 w-4" /> Permuta concluída com sucesso!
          </div>
        );

      case "REJECTED":
        return (
          <div className="flex w-full items-center justify-center gap-2 text-center text-sm text-red-600">
            <XCircle className="h-4 w-4" /> Este match foi rejeitado
          </div>
        );
    }

    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            {getPatternIcon()}
            <div className="min-w-0">
              <h3 className="text-lg font-semibold break-words">
                {match.swapPattern === "DIRECT"
                  ? "Permuta Direta"
                  : match.swapPattern === "THREE_WAY"
                    ? "Permuta 3-Vias"
                    : match.swapPattern === "MULTI_WAY"
                      ? "Permuta Múltipla"
                      : match.swapPattern}{" "}
                {match.matchType === "SINGLE"
                  ? "disciplina individual"
                  : "completa"}
              </h3>
              {match.subject && (
                <p className="text-muted-foreground text-sm font-medium break-words">
                  {match.subject.code} - {match.subject.name}
                </p>
              )}
            </div>
          </div>
          {getStatusBadge()}
        </div>
        <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-muted-foreground text-sm">
            {match.participants.length} participantes •
            {Math.round((match.satisfactionScore ?? 0) * 100)}% satisfação
          </span>
          <ClientDate
            date={match.createdAt}
            format="short"
            className="text-muted-foreground text-xs"
          />
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">{renderParticipants()}</div>

        {match.isProvisional && (
          <div className="bg-primary/10 border-primary/30 mt-4 rounded-lg border p-3">
            <div className="text-primary mb-2 flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>
                <strong>Match Provisório:</strong> Este não é o seu match
                preferido.
              </span>
            </div>
            <div className="text-primary text-xs">
              <p className="mb-1 flex gap-2">
                <Hourglass className="mt-0.5 h-4 w-4 shrink-0" />{" "}
                <span>
                  O sistema continua à procura de um match melhor durante{" "}
                  <strong>6 horas</strong>.
                </span>
              </p>
              <p className="flex gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />{" "}
                <span>
                  Se encontrarmos uma opção melhor, atualizamos automaticamente!
                </span>
              </p>
              {canRevoke && (
                <p className="mt-2 flex items-center gap-2 font-medium">
                  <Hourglass className="h-4 w-4 shrink-0" /> Tempo restante:{" "}
                  {hoursRemaining}h {minutesRemaining}m
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {showActions && (
        <CardFooter className="w-full">{renderActionButtons()}</CardFooter>
      )}
    </Card>
  );
}
