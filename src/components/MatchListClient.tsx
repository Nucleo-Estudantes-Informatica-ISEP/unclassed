"use client";

import { MatchCard } from "./MatchCard";

interface MatchParticipant {
  userId: string;
  fromClass: string | { id: string; name: string; year: number };
  toClass: string | { id: string; name: string; year: number };
  requestId: string;
  requestType: 'single' | 'bundle';
  satisfactionScore: number;
  status?: 'pending' | 'accepted' | 'rejected' | 'completed';
  user?: { id: string; name: string; email: string; phone?: string | null; sharePhoneOnMatch?: boolean };
}

interface Match {
  id: string;
  matchType: 'SINGLE' | 'BUNDLE';
  swapPattern: 'DIRECT' | 'THREE_WAY' | 'MULTI_WAY';
  status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'PROVISIONAL' | 'UPGRADED';
  isProvisional: boolean;
  provisionalUntil?: string | null;
  satisfactionScore: number;
  participants: MatchParticipant[];
  createdAt: string;
  updatedAt: string;
  subject?: { id: string; code: string; name: string; year: number; semester: number };
}

interface MatchListClientProps {
  matches: Match[];
  currentUserId: string;
  title: string;
  emptyMessage: string;
  showIcon?: boolean;
  iconEmoji?: string;
  badgeColor?: string;
}

export function MatchListClient({
  matches,
  currentUserId,
  title,
  emptyMessage,
  showIcon = true,
  iconEmoji = "⚡",
  badgeColor = "blue",
}: MatchListClientProps) {
  if (matches.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600">
        {emptyMessage}
      </div>
    );
  }

  // Get static class names based on badge color to avoid hydration issues
  const getBadgeClasses = (color: string) => {
    const colorMap = {
      blue: {
        text: 'text-blue-600',
        bg: 'bg-blue-100 text-blue-800'
      },
      green: {
        text: 'text-green-600',
        bg: 'bg-green-100 text-green-800'
      },
      yellow: {
        text: 'text-yellow-600',
        bg: 'bg-yellow-100 text-yellow-800'
      },
      red: {
        text: 'text-red-600',
        bg: 'bg-red-100 text-red-800'
      }
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  const badgeClasses = getBadgeClasses(badgeColor);

  return (
    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4 flex flex-wrap items-center gap-2">
        {showIcon && <span className={badgeClasses.text}>{iconEmoji}</span>}
        <span className="min-w-0 break-words">{title}</span>
        <span className={`text-sm px-2 py-1 rounded-full ${badgeClasses.bg} shrink-0`}>
          {matches.length}
        </span>
      </h2>
      <div className="space-y-4">
        {matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </section>
  );
}
