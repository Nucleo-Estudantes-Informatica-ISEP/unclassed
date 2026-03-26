import prisma from "@/lib/prisma";

type MatchParticipant = {
  userId?: string;
  status?: string;
};

function coerceMatchParticipants(value: unknown): MatchParticipant[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value as MatchParticipant[];
}

export async function hasBlockingAcceptedMatch(userId: string) {
  const acceptedMatches = await prisma.match.findMany({
    where: {
      status: { in: ["PROPOSED", "ACCEPTED"] },
    },
    select: {
      participants: true,
    },
  });

  return acceptedMatches.some((match) => {
    const participants = coerceMatchParticipants(match.participants);
    return participants.some(
      (participant) =>
        participant.userId === userId && participant.status === "accepted"
    );
  });
}
