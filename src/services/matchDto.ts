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
  classes?: MatchClass[],
  contactViewerId?: string
): MatchParticipantDto[] {
  return participants.map((participant) => {
    const user = users?.find((entry) => entry.id === participant.userId);
    const projectedUser = user && {
      id: user.id,
      name: user.name,
      ...(contactViewerId && {
        email: user.email,
        phone:
          user.id === contactViewerId || user.sharePhoneOnMatch
            ? user.phone
            : null,
        sharePhoneOnMatch: Boolean(user.sharePhoneOnMatch),
      }),
    };

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
      user: projectedUser,
    };
  });
}

export function toMatchDto(
  match: Match,
  participants: MatchParticipant[],
  classes?: MatchClass[],
  users?: MatchUser[],
  subject?: MatchDto["subject"],
  viewerId?: string
): MatchDto {
  const contactViewerId =
    match.status === "ACCEPTED" &&
    participants.some((participant) => participant.userId === viewerId)
      ? viewerId
      : undefined;

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
    participants: toMatchParticipantsDto(
      participants,
      users,
      classes,
      contactViewerId
    ),
    singleSwapRequestIds: match.singleSwapRequestIds,
    bundleSwapRequestIds: match.bundleSwapRequestIds,
    createdAt: match.createdAt.toISOString(),
    updatedAt: match.updatedAt.toISOString(),
    subject: subject,
  };
}
