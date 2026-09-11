import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "vitest";

const requestRoutes = [
  "src/app/api/swap-requests/single/route.ts",
  "src/app/api/swap-requests/bundle/route.ts",
] as const;

test("swapRequestService records onboarding completion idempotently", () => {
  const source = readFileSync(
    path.join(process.cwd(), "src/application/services/swapRequestService.ts"),
    "utf8"
  );

  const directPrismaUpdate =
    /if \(session\.onboardingCompletedAt === null\) \{[\s\S]*?await prisma\.user\s*\.updateMany\(\{[\s\S]*?where: \{ id: session\.id, onboardingCompletedAt: null \},[\s\S]*?data: \{ onboardingCompletedAt: new Date\(\) \},[\s\S]*?\}\)[\s\S]*?\.catch\(/;
  const viaService =
    /if \(session\.onboardingCompletedAt === null\) \{[\s\S]*?userService\.markOnboardingComplete\(session\.id\)/;

  assert.ok(
    directPrismaUpdate.test(source) || viaService.test(source),
    "first-request completion must be guarded against duplicate writes"
  );
});

for (const routePath of requestRoutes) {
  test(`${routePath} delegates creation to handleCreateSwapRequest`, () => {
    const source = readFileSync(path.join(process.cwd(), routePath), "utf8");

    assert.ok(
      source.includes("handleCreateSwapRequest"),
      "route must delegate request creation to handleCreateSwapRequest"
    );
  });
}
