import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_PREFERRED_CLASSES,
  bundleSwapRequestSchema,
  singleSwapRequestSchema,
} from "./swapRequestSchema";

const validId = "a".repeat(24);

test("accepts bounded single and bundle swap requests", () => {
  assert.equal(
    singleSwapRequestSchema.safeParse({
      subjectId: validId,
      currentClassId: validId,
      preferredClassIds: [validId],
      preferenceOrderMatters: true,
    }).success,
    true
  );
  assert.equal(
    bundleSwapRequestSchema.safeParse({
      currentClassId: validId,
      preferredClassIds: [validId],
      preferenceOrderMatters: false,
    }).success,
    true
  );
});

test("rejects oversized identifiers and preferred-class arrays", () => {
  assert.equal(
    singleSwapRequestSchema.safeParse({
      subjectId: "x".repeat(65),
      currentClassId: validId,
      preferredClassIds: [validId],
      preferenceOrderMatters: true,
    }).success,
    false
  );
  assert.equal(
    bundleSwapRequestSchema.safeParse({
      currentClassId: validId,
      preferredClassIds: Array.from(
        { length: MAX_PREFERRED_CLASSES + 1 },
        () => validId
      ),
      preferenceOrderMatters: true,
    }).success,
    false
  );
});
