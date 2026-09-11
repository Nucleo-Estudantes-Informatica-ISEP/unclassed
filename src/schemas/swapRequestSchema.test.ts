import assert from "node:assert/strict";
import { test } from "vitest";

import {
  MAX_PREFERRED_CLASSES,
  bundleSwapRequestSchema,
  singleSwapRequestSchema,
  updateSwapRequestSchema,
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

test("validates updateSwapRequestSchema strictly", () => {
  // Accepts valid preferredClassIds or status
  assert.equal(
    updateSwapRequestSchema.safeParse({ preferredClassIds: [validId] }).success,
    true
  );
  assert.equal(
    updateSwapRequestSchema.safeParse({ status: "CANCELLED" }).success,
    true
  );
  assert.equal(
    updateSwapRequestSchema.safeParse({
      preferredClassIds: [validId],
      status: "CANCELLED",
    }).success,
    false
  );

  // Rejects empty object
  assert.equal(updateSwapRequestSchema.safeParse({}).success, false);

  // Rejects arbitrary fields
  assert.equal(
    updateSwapRequestSchema.safeParse({
      preferredClassIds: [validId],
      userId: "arbitrary-id",
    }).success,
    false
  );
  assert.equal(
    updateSwapRequestSchema.safeParse({
      status: "CANCELLED",
      createdAt: new Date().toISOString(),
    }).success,
    false
  );
});
