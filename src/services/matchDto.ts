import type { Match } from "@/application/repositories/matchRepository";

import { MatchDto, MatchParticipant } from "../types/match.js";

function toMatchParticipantDto(
  participant: MatchParticipant
): MatchParticipant {
  return {
    userId: participant.userId,
    fromClass: participant.fromClass,
    toClass: participant.toClass,
    requestId: participant.requestId,
    requestType: participant.requestType,
    satisfactionScore: participant.satisfactionScore,
    status: participant.status,
    user: participant.user,
  };
}

export function toMatchDto(
  match: Match,
  participants: MatchParticipant[],
  subject?: MatchDto["subject"]
): MatchDto {
  return {
    id: match.id,
    matchType: match.matchType,
    swapPattern: match.swapPattern,
    status: match.status,
    isProvisional: match.isProvisional,
    provisionalUntil: match.provisionalUntil
      ? match.provisionalUntil.toISOString()
      : null,
    satisfactionScore: match.satisfactionScore,
    participants: participants.map(toMatchParticipantDto),
    singleSwapRequestIds: match.singleSwapRequestIds,
    bundleSwapRequestIds: match.bundleSwapRequestIds,
    createdAt: match.createdAt.toISOString(),
    updatedAt: match.updatedAt.toISOString(),
    subject,
  };
}
