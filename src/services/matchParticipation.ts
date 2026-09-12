import * as matchRepo from "@/application/repositories/matchRepository";

export async function hasBlockingAcceptedMatch(userId: string) {
  const acceptedMatches = await matchRepo.aggregateRaw({
    pipeline: [
      {
        $match: {
          status: { $in: ["PROPOSED", "ACCEPTED"] },
          participants: {
            $elemMatch: {
              userId,
              status: "accepted",
            },
          },
        },
      },
      { $limit: 1 },
      { $project: { _id: 1 } },
    ],
  });

  return Array.isArray(acceptedMatches) && acceptedMatches.length > 0;
}
