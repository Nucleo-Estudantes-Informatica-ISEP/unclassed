import type { Match } from "@/application/repositories/matchRepository";

import { MatchDto } from "../types/match.js";

export function toMatchDto(
  match: Match,
  participants: unknown[],
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
    participants: participants as MatchDto["participants"],
    singleSwapRequestIds: match.singleSwapRequestIds,
    bundleSwapRequestIds: match.bundleSwapRequestIds,
    createdAt: match.createdAt.toISOString(),
    updatedAt: match.updatedAt.toISOString(),
    subject,
  };
}
