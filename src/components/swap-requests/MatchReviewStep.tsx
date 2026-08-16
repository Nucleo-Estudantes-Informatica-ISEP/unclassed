"use client";

import { Hourglass } from "lucide-react";

import { useMatches } from "@/hooks/useApi";
import { MatchCard } from "@/components/MatchCard";
import { WizardNavigation } from "@/components/ui/step-wizard";

const POLL_INTERVAL_MS = 10000;

interface MatchReviewStepProps {
  matchId: string;
  currentUserId: string;
  canAdvance: boolean;
  onAdvance: () => void;
}

export function MatchReviewStep({
  matchId,
  currentUserId,
  canAdvance,
  onAdvance,
}: MatchReviewStepProps) {
  const { data: matches, loading } = useMatches(
    undefined,
    undefined,
    undefined,
    POLL_INTERVAL_MS
  );

  const match = matches?.find((m) => m.id === matchId);

  if (!match) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
        <Hourglass className="size-4 animate-pulse" />
        {loading ? "A carregar o match..." : "Match não encontrado."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MatchCard match={match} currentUserId={currentUserId} showActions />

      {canAdvance && (
        <WizardNavigation
          nextLabel="Continuar"
          nextDisabled={match.status !== "ACCEPTED"}
          onNext={onAdvance}
        />
      )}
    </div>
  );
}
