import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "vitest";

const serverComponents = [
  "AdvancedMatchingDashboard.tsx",
  "matching-dashboard/OverviewTab.tsx",
  "matching-dashboard/CronTab.tsx",
  "matching-dashboard/PartitionsTab.tsx",
  "matching-dashboard/SettingsTab.tsx",
];

const adminComponents = resolve(process.cwd(), "src/components/admin");

for (const component of serverComponents) {
  test(`${component} remains a GET-free Server Component`, async () => {
    const source = await readFile(resolve(adminComponents, component), "utf8");

    assert.doesNotMatch(source, /^\s*["']use client["'];?/m);
    assert.doesNotMatch(source, /\bfetch\s*\(/);
    assert.doesNotMatch(source, /\buseSWR/);
    assert.doesNotMatch(
      source,
      /\.toLocale(?:String|DateString|TimeString)\s*\(/
    );
  });
}

test("interactive dashboard islands remain Client Components", async () => {
  for (const component of ["./BatchTab.tsx", "./DashboardTabs.tsx"]) {
    const source = await readFile(
      resolve(adminComponents, "matching-dashboard", component),
      "utf8"
    );
    assert.match(source, /^\s*["']use client["'];?/m);
  }
});

test("dashboard streams server data and preserves automatic refresh", async () => {
  const page = await readFile(
    resolve(process.cwd(), "src/app/dashboard/page.tsx"),
    "utf8"
  );
  const dashboard = await readFile(
    resolve(adminComponents, "AdvancedMatchingDashboard.tsx"),
    "utf8"
  );

  assert.match(page, /<Suspense\s+fallback=/);
  assert.match(dashboard, /<RefreshButton[^>]*initialAutoRefresh/);
});
