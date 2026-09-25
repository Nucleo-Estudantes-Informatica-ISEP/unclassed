import assert from "node:assert/strict";
import { test } from "vitest";

import { toMatchDto } from "./matchDto";

const now = new Date("2026-08-16T00:00:00.000Z");

const participants = [
  {
    userId: "user-1",
    fromClass: "class-1",
    toClass: "class-2",
    requestId: "request-1",
    requestType: "single" as const,
    satisfactionScore: 5,
    status: "pending" as const,
    user: {
      id: "user-1",
      name: "User",
      email: "user@example.com",
      phone: null,
    },
  },
];

const subject = {
  id: "subject-1",
  code: "TEST",
  name: "Test",
  year: 1,
  semester: 1,
};

const common = {
  id: "match-1",
  matchType: "SINGLE" as const,
  swapPattern: "DIRECT" as const,
  status: "PROPOSED" as const,
  isProvisional: false,
  provisionalUntil: null,
  satisfactionScore: null,
  singleSwapRequestIds: ["request-1"],
  bundleSwapRequestIds: [],
  createdAt: now,
  updatedAt: now,
  graphPartition: "internal-partition",
  processingTime: 0,
  participants,
};

test("match DTO excludes matching internals", () => {
  const dto = toMatchDto(common, participants, subject);

  assert.equal("graphPartition" in dto, false);
  assert.deepEqual(dto.participants, participants);
  assert.deepEqual(dto.subject, subject);
});

test("match DTO maps dates to ISO strings", () => {
  const dto = toMatchDto(common, participants, undefined);

  assert.equal(dto.createdAt, "2026-08-16T00:00:00.000Z");
  assert.equal(dto.updatedAt, "2026-08-16T00:00:00.000Z");
  assert.equal(dto.provisionalUntil, null);
});

test("match DTO preserves public match fields", () => {
  const dto = toMatchDto(common, participants, undefined);

  assert.equal(dto.id, "match-1");
  assert.equal(dto.matchType, "SINGLE");
  assert.equal(dto.swapPattern, "DIRECT");
  assert.equal(dto.status, "PROPOSED");
  assert.equal(dto.isProvisional, false);
  assert.equal(dto.satisfactionScore, null);
  assert.deepEqual(dto.singleSwapRequestIds, ["request-1"]);
  assert.deepEqual(dto.bundleSwapRequestIds, []);
});
