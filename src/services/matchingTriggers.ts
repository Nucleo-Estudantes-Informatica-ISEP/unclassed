import { MatchingOrchestrator } from "@/application/matchingOrchestrator";

type RequestType = "single" | "bundle";

export async function triggerImmediateMatching(
  requestId: string,
  requestType: RequestType
) {
  const matchingService = new MatchingOrchestrator();

  await matchingService.updateRequestPartition(requestId, requestType);
  return matchingService.processImmediateMatches(requestId);
}
