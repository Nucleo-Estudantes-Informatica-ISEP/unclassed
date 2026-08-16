export const matchActions = ["accept", "reject", "complete", "revoke"] as const;
export type MatchAction = (typeof matchActions)[number];

interface MatchActionParticipant {
  userId: string;
  status?: string;
}

interface MatchActionState {
  status: string;
  provisionalUntil: Date | string | null;
  participants: MatchActionParticipant[];
}

export class MatchActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MatchActionError";
  }
}

export function assertMatchActionAllowed(
  match: MatchActionState,
  userId: string,
  action: MatchAction,
  now = new Date()
) {
  const participant = match.participants.find((item) => item.userId === userId);
  if (!participant) {
    throw new MatchActionError("Não és participante neste match");
  }

  const participantStatus = participant.status ?? "pending";
  if (action === "complete") {
    if (match.status !== "ACCEPTED" || participantStatus !== "accepted") {
      throw new MatchActionError("Este match não pode ser concluído neste estado");
    }
    return;
  }

  if (action === "revoke") {
    const deadline = match.provisionalUntil
      ? new Date(match.provisionalUntil)
      : null;
    if (
      !["PROPOSED", "PROVISIONAL"].includes(match.status) ||
      participantStatus !== "accepted" ||
      !deadline ||
      now > deadline
    ) {
      throw new MatchActionError("Este match já não pode ser revogado");
    }
    return;
  }

  if (
    !["PROPOSED", "PROVISIONAL"].includes(match.status) ||
    participantStatus !== "pending"
  ) {
    throw new MatchActionError("Este match já não aceita esta ação");
  }
}
