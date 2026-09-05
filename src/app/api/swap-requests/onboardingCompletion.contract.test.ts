import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "vitest";

const requestRoutes = [
  "src/app/api/swap-requests/single/route.ts",
  "src/app/api/swap-requests/bundle/route.ts",
] as const;

for (const routePath of requestRoutes) {
  test(`${routePath} records onboarding completion idempotently`, () => {
    const source = readFileSync(path.join(process.cwd(), routePath), "utf8");

    const directPrismaUpdate = /if \(session\.onboardingCompletedAt === null\) \{[\s\S]*?await prisma\.user\s*\.updateMany\(\{[\s\S]*?where: \{ id: session\.id, onboardingCompletedAt: null \},[\s\S]*?data: \{ onboardingCompletedAt: new Date\(\) \},[\s\S]*?\}\)[\s\S]*?\.catch\(/;
    const viaService = /if \(session\.onboardingCompletedAt === null\) \{[\s\S]*?await userService\.markOnboardingComplete\(session\.id\)[\s\S]*?\.catch\(/;

    assert.ok(
      directPrismaUpdate.test(source) || viaService.test(source),
      "first-request completion must be awaited and guarded against duplicate writes"
    );
  });
}
