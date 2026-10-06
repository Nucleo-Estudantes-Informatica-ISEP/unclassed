import type {
  MatchClass,
  MatchDto,
  MatchParticipant as MatchParticipantDto,
  MatchUser,
} from "@/types/match";
import type { Match } from "@/application/repositories/matchRepository";
import type { MatchParticipant } from "@/application/services/matchActionService";

function toMatchParticipantsDto(
  participants: MatchParticipant[],
  users?: MatchUser[],
  classes?: MatchClass[]
): MatchParticipantDto[] {
  return participants.map((participant) => {
    return {
      userId: participant.userId,
      fromClass:
        classes?.find((cls) => cls.id === participant.fromClass) ??
        participant.fromClass,
      toClass:
        classes?.find((cls) => cls.id === participant.toClass) ??
        participant.toClass,
      requestId: participant.requestId,
      requestType: participant.requestType,
      satisfactionScore: participant.satisfactionScore,
      status: participant.status,
      user: users?.find((user) => user.id === participant.userId),
    };
  });
}

export function toMatchDto(
  match: Match,
  participants: MatchParticipant[],
  classes?: MatchClass[],
  users?: MatchUser[],
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
    participants: toMatchParticipantsDto(participants, users, classes),
    singleSwapRequestIds: match.singleSwapRequestIds,
    bundleSwapRequestIds: match.bundleSwapRequestIds,
    createdAt: match.createdAt.toISOString(),
    updatedAt: match.updatedAt.toISOString(),
    subject: subject,
  };
}
