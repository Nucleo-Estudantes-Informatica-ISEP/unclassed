import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { test, vi } from "vitest";

import AdvancedMatchingDashboard, {
  loadDashboardData,
} from "./AdvancedMatchingDashboard";

const stats = { partitions: 1 };
let statsUnavailable = false;

vi.mock("server-only", () => ({}));
vi.mock("@/components/RefreshButton", () => ({ RefreshButton: () => null }));

vi.mock("@/application/matchingOrchestrator", () => ({
  MatchingOrchestrator: class {
    getAdvancedStats() {
      if (statsUnavailable)
        return Promise.reject(new Error("stats unavailable"));
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

test("unavailable matching statistics show the error card", async () => {
  statsUnavailable = true;
  const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

  try {
    assert.equal(await loadDashboardData(), null);
    const html = renderToStaticMarkup(await AdvancedMatchingDashboard());
    assert.match(html, /Falha ao carregar estatísticas de matching/);
  } finally {
    statsUnavailable = false;
    error.mockRestore();
  }
});
