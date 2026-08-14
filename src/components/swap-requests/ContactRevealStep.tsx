"use client";

import Link from "next/link";
import { Building2, Hourglass } from "lucide-react";

import { useMatches } from "@/hooks/useApi";
import { MatchContactInfo } from "@/components/MatchContactInfo";
import { Button } from "@/lib/components/ui/button";

const POLL_INTERVAL_MS = 10000;

interface ContactRevealStepProps {
  matchId: string;
  currentUserId: string;
}

export function ContactRevealStep({
  matchId,
  currentUserId,
}: ContactRevealStepProps) {
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
        {loading ? "A carregar contactos..." : "Match não encontrado."}
      </div>
    );
  }

  const otherParticipants = match.participants.filter(
    (p) => p.userId !== currentUserId && p.user
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {otherParticipants.map((participant) => (
          <div key={participant.userId} className="rounded-lg border p-4">
            <p className="font-semibold">{participant.user?.name}</p>
            <div className="mt-2">
              {/* user is guaranteed by the filter above */}
              <MatchContactInfo user={participant.user!} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-muted/50 rounded-lg border p-5">
        <div className="flex items-start gap-2">
          <Building2 className="text-muted-foreground mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">Fala com o teu departamento</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Combina os contactos com os outros estudantes, mas a troca só
              fica oficial depois de comunicares a mudança ao contacto do teu
              departamento — é essa comunicação que atualiza o teu registo
              académico.
            </p>
          </div>
        </div>
      </div>

      <Button asChild className="h-11">
        <Link href="/matches">Ver os meus matches</Link>
      </Button>
    </div>
  );
}
