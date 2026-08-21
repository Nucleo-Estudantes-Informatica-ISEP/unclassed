import assert from "node:assert/strict";
import { test } from "node:test";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

import { getPageExtensions } from "../../next.config";

test("production route discovery excludes development-only route files", () => {
  assert.equal(getPageExtensions(PHASE_DEVELOPMENT_SERVER)[0], "dev.ts");
  assert.equal(
    getPageExtensions("phase-production-build").includes("dev.ts"),
    false
  );
});
