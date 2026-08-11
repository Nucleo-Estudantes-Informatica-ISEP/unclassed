"use client";

import { MatchCard } from "./MatchCard";
import type { MatchDto } from "@/types/match";

interface MatchListClientProps {
  matches: MatchDto[];
  currentUserId: string;
  title: string;
  emptyMessage: string;
  showIcon?: boolean;
  icon?: React.ReactNode;
  badgeColor?: string;
}

export function MatchListClient({
  matches,
  currentUserId,
  title,
  emptyMessage,
  showIcon = true,
  icon,
  badgeColor = "blue",
}: MatchListClientProps) {
  if (matches.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  // Get static class names based on badge color to avoid hydration issues
  const getBadgeClasses = (color: string) => {
    const colorMap = {
      blue: {
        text: 'text-primary',
        bg: 'bg-primary/10 text-primary'
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
        {showIcon && icon && <span className={`flex items-center justify-center w-6 h-6 ${badgeClasses.text}`}>{icon}</span>}
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
