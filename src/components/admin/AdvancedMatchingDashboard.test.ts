import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { test, vi } from "vitest";

import AdvancedMatchingDashboard, {
  loadDashboardData,
} from "./AdvancedMatchingDashboard";

const stats = { partitions: 1 };
let statsUnavailable = false;

vi.mock("server-only", () => ({}));
vi.mock("@/components/RefreshButton", () => ({
  RefreshButton: ({ initialAutoRefresh }: { initialAutoRefresh?: boolean }) =>
    initialAutoRefresh ? "auto-refresh-on" : "auto-refresh-off",
}));

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
  const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  try {
    const result = await loadDashboardData();
    assert.deepEqual(result?.stats, stats);
    assert.equal(result?.cronData, null);
  } finally {
    warning.mockRestore();
  }
});

test("unavailable matching statistics show the error card", async () => {
  statsUnavailable = true;
  const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

  try {
    assert.equal(await loadDashboardData(), null);
    const html = renderToStaticMarkup(await AdvancedMatchingDashboard());
    assert.match(html, /Falha ao carregar estatísticas de matching/);
    assert.match(html, /auto-refresh-on/);
  } finally {
    statsUnavailable = false;
    error.mockRestore();
    warning.mockRestore();
  }
});
