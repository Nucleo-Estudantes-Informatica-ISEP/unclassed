import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "vitest";

import { MatchingStatsOverview } from "./MatchingStatsOverview";
import { PartitionTable } from "./PartitionTable";

test("renders server-side matching stats and nullable partition metrics", () => {
  const stats = {
    partitions: 2,
    activePartitions: 1,
    totalActiveRequests: 7,
    matches24h: 3,
    provisionalMatches: 1,
    averageSatisfactionScore: 0.75,
    averageProcessingTime: 125,
    partitionStats: [
      {
        partitionKey: "subject-123",
        ticketType: "SPECIFIC_CLASS" as const,
        activeRequests: 7,
        successRate: null,
        avgProcessingTime: null,
      },
    ],
  };

  const html = renderToStaticMarkup(
    <>
      <MatchingStatsOverview stats={stats} />
      <PartitionTable partitions={stats.partitionStats} />
    </>
  );

  assert.match(html, />7<\/div>/);
  assert.match(html, /75\.0%/);
  assert.match(html, /subject-123/);
  assert.match(html, /0\.0% success/);
  assert.match(html, />0ms<\/p>/);
});
