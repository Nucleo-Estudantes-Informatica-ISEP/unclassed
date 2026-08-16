import assert from "node:assert/strict";
import test from "node:test";

import { isUniqueConstraintError } from "./swapRequestConflicts";

test("recognizes Prisma unique-constraint conflicts", () => {
  assert.equal(isUniqueConstraintError({ code: "P2002" }), true);
  assert.equal(isUniqueConstraintError({ code: "P2025" }), false);
  assert.equal(isUniqueConstraintError(new Error("duplicate")), false);
});
