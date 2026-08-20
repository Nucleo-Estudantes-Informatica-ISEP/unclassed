"use client";

import { useEffect } from "react";
import { Hourglass, PartyPopper, Info, Users } from "lucide-react";

import type { SingleSwapRequest, BundleSwapRequest } from "@/hooks/useApi";
import { useApi, useMatches } from "@/hooks/useApi";

const POLL_INTERVAL_MS = 10000;

interface RequestStatusPanelProps {
  requestId: string;
  requestType: "single" | "bundle";
  onMatchFound: (matchId: string) => void;
}

export function RequestStatusPanel({
  requestId,
  requestType,
  onMatchFound,
}: RequestStatusPanelProps) {
  const { data: requests, loading: requestsLoading } = useApi<
    (SingleSwapRequest | BundleSwapRequest)[]
  >(`/api/swap-requests/${requestType}`, POLL_INTERVAL_MS);
  const { data: matches } = useMatches(
    undefined,
    undefined,
    undefined,
    POLL_INTERVAL_MS
  );

  const request = requests?.find((r) => r.id === requestId);

  useEffect(() => {
    if (!matches) return;

    const match = matches.find((m) =>
      requestType === "single"
        ? m.singleSwapRequestIds.includes(requestId)
        : m.bundleSwapRequestIds.includes(requestId)
    );

    if (match) {
      onMatchFound(match.id);
    }
  }, [matches, requestId, requestType, onMatchFound]);

  if (requestsLoading && !request) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
        <Hourglass className="size-4 animate-pulse" /> A carregar estado do
        pedido...
      </div>
    );
  }

  if (!request) {
    return (
      <div
        className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm"
        role="alert"
      >
        Não foi possível encontrar este pedido.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-muted/50 rounded-lg border p-5">
        <div className="flex items-center gap-2">
          {request.status === "MATCHED" ? (
            <PartyPopper className="text-primary size-5" />
          ) : (
            <Hourglass className="text-muted-foreground size-5" />
          )}
          <p className="font-semibold">
            {request.status === "ACTIVE" && "A aguardar match"}
            {request.status === "MATCHED" &&
              "Match encontrado! A preparar revisão..."}
            {request.status === "CANCELLED" && "Pedido cancelado"}
            {request.status === "EXPIRED" && "Pedido expirado"}
            {request.status === "COMPLETED" && "Pedido concluído"}
          </p>
        </div>
        <p className="text-muted-foreground mt-2 text-sm">
          Podes fechar esta página a qualquer momento — o teu pedido continua
          ativo e vais poder voltar a consultar este estado mais tarde.
        </p>
      </div>

      <div className="space-y-3 text-sm">
        <p className="flex items-start gap-2 font-medium">
          <Users className="mt-0.5 size-4 shrink-0" /> Como funciona uma
          permuta em cadeia?
        </p>
        <p className="text-muted-foreground">
          Nem sempre é uma troca direta entre duas pessoas. O sistema procura
          automaticamente cadeias de trocas compatíveis entre vários
          estudantes — por exemplo, tu ficas com a turma de outro estudante,
          que fica com a turma de um terceiro, que por sua vez fica com a
          tua. Assim que encontrarmos uma cadeia válida, vais poder rever
          todos os participantes antes de decidir.
        </p>
        <p className="text-muted-foreground flex items-start gap-2">
          <Info className="mt-0.5 size-4 shrink-0" /> Esta página atualiza-se
          automaticamente — não precisas de recarregar.
        </p>
      </div>
    </div>
  );
}
