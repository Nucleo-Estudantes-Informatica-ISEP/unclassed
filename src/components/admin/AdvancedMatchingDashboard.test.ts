import assert from "node:assert/strict";
import { test, vi } from "vitest";

import { loadDashboardData } from "./AdvancedMatchingDashboard";

const stats = { partitions: 1 };

vi.mock("@/application/matchingOrchestrator", () => ({
  MatchingOrchestrator: class {
    getAdvancedStats() {
      return Promise.resolve(stats);
    }
  },
}));

vi.mock("@/services/cronScheduler", () => ({
  getCronScheduler: () => ({
    getCronStats: () => Promise.reject(new Error("cron unavailable")),
    getExecutionHistory: () => Promise.resolve([]),
  }),
}));

test("matching statistics survive unavailable cron telemetry", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => undefined);

  const result = await loadDashboardData();

  assert.deepEqual(result?.stats, stats);
  assert.equal(result?.cronData, null);
});
