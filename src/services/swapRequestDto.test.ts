import assert from "node:assert/strict";
import test from "node:test";

import {
  toBundleSwapRequestDto,
  toSingleSwapRequestDto,
} from "./swapRequestDto";

const now = new Date("2026-08-16T00:00:00.000Z");
const common = {
  id: "request-1",
  userId: "user-1",
  currentClassId: "class-1",
  preferredClassIds: ["class-2"],
  preferenceOrderMatters: true,
  status: "ACTIVE" as const,
  priority: 1,
  satisfactionScore: null,
  provisionalMatchId: "internal-match-id",
  provisionalUntil: null,
  graphPartition: "internal-partition",
  createdAt: now,
  updatedAt: now,
  lastProcessed: now,
  user: { id: "user-1", name: "User", email: "user@example.com" },
  currentClass: { id: "class-1", name: "1DA", year: 1 },
};
const preferredClasses = [{ id: "class-2", name: "1DB", year: 1 }];

test("single request DTO excludes matching internals", () => {
  const dto = toSingleSwapRequestDto(
    {
      ...common,
      subjectId: "subject-1",
      ticketType: "SPECIFIC_CLASS",
      subject: { id: "subject-1", code: "TEST", name: "Test", year: 1 },
    },
    preferredClasses
  );

  assert.equal("graphPartition" in dto, false);
  assert.equal("provisionalMatchId" in dto, false);
  assert.equal("lastProcessed" in dto, false);
  assert.deepEqual(dto.preferredClasses, preferredClasses);
});

test("bundle request DTO excludes matching internals", () => {
  const dto = toBundleSwapRequestDto(
    { ...common, ticketType: "ALL_CLASSES" },
    preferredClasses
  );

  assert.equal("graphPartition" in dto, false);
  assert.equal("provisionalMatchId" in dto, false);
  assert.equal("lastProcessed" in dto, false);
  assert.deepEqual(dto.preferredClasses, preferredClasses);
});
