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
  readonly status: number;

  constructor(message: string, status = 409) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class MatchActionNotFoundError extends MatchActionError {
  constructor(message = "Match não encontrado") {
    super(message, 404);
  }
}

export class MatchActionForbiddenError extends MatchActionError {
  constructor(message = "Acesso negado") {
    super(message, 403);
  }
}

export class MatchActionConflictError extends MatchActionError {
  constructor(message: string) {
    super(message, 409);
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
    throw new MatchActionForbiddenError("Não és participante neste match");
  }

  const participantStatus = participant.status ?? "pending";
  if (action === "complete") {
    if (match.status !== "ACCEPTED" || participantStatus !== "accepted") {
      throw new MatchActionConflictError("Este match não pode ser concluído neste estado");
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
      throw new MatchActionConflictError("Este match já não pode ser revogado");
    }
    return;
  }

  if (
    !["PROPOSED", "PROVISIONAL"].includes(match.status) ||
    participantStatus !== "pending"
  ) {
    throw new MatchActionConflictError("Este match já não aceita esta ação");
  }
}
