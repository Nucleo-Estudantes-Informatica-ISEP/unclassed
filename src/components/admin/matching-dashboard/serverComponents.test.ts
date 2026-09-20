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
