export interface SignatureParticipant {
  userId?: string;
  fromClass?: string;
  toClass?: string;
}

export interface SignatureMatchInput {
  matchType: string;
  swapPattern?: string;
  singleSwapRequestIds?: string[] | null;
  bundleSwapRequestIds?: string[] | null;
  participants?: SignatureParticipant[] | null;
}

export interface RecencyComparable {
  id: string;
  createdAt: Date | string;
}

function toTimestamp(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export function buildMatchSignature(match: SignatureMatchInput): string {
  const requestIds = [
    ...(match.singleSwapRequestIds || []),
    ...(match.bundleSwapRequestIds || []),
  ]
    .filter((id): id is string => Boolean(id))
    .slice()
    .sort()
    .join("|");

  if (requestIds) {
    return `${match.matchType}:${requestIds}`;
  }

  const participantFlow = (match.participants || [])
    .map(
      (p) => `${p.userId ?? "unknown"}:${p.fromClass ?? ""}->${p.toClass ?? ""}`
    )
    .sort()
    .join("|");

  return `${match.matchType}:${match.swapPattern ?? "UNKNOWN"}:${participantFlow || "no-participants"}`;
}

export function shouldReplaceMatchByRecency<T extends RecencyComparable>(
  candidate: T,
  current?: T
): boolean {
  if (!current) return true;

  const candidateTime = toTimestamp(candidate.createdAt);
  const currentTime = toTimestamp(current.createdAt);

  return (
    candidateTime > currentTime ||
    (candidateTime === currentTime && candidate.id > current.id)
  );
}

export function compareMatchesByRecencyDesc<T extends RecencyComparable>(
  a: T,
  b: T
): number {
  const timeDiff = toTimestamp(b.createdAt) - toTimestamp(a.createdAt);
  if (timeDiff !== 0) return timeDiff;
  return b.id.localeCompare(a.id);
}
