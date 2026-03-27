import { AdvancedMatchingService } from "@/services/advancedMatchingService";

type RequestType = "single" | "bundle";

export async function triggerImmediateMatching(
  requestId: string,
  requestType: RequestType
) {
  const matchingService = new AdvancedMatchingService();

  await matchingService.updateRequestPartition(requestId, requestType);
  return matchingService.processImmediateMatches(requestId);
}
