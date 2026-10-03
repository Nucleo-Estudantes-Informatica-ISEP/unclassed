import assert from "node:assert/strict";
import { test } from "vitest";

import type { MatchUser } from "@/types/match";
import type { MatchParticipant } from "@/application/services/matchActionService";

import { toMatchDto } from "./matchDto";

const now = new Date("2026-08-16T00:00:00.000Z");

const participants: MatchParticipant[] = [
  {
    userId: "user-1",
    fromClass: "class-1",
    toClass: "class-2",
    requestId: "request-1",
    requestType: "single",
    satisfactionScore: 5,
    status: "pending",
  },
];

const users: MatchUser[] = [
  {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    phone: null,
    sharePhoneOnMatch: false,
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
  participants: [],
};

test("match DTO maps participants to the public DTO shape", () => {
  const dto = toMatchDto(common, participants, users, subject);

  assert.deepEqual(dto.participants, [
    {
      userId: "user-1",
      fromClass: "class-1",
      toClass: "class-2",
      requestId: "request-1",
      requestType: "single",
      satisfactionScore: 5,
      status: "pending",
      user: users[0],
    },
  ]);

  assert.deepEqual(dto.subject, subject);
});

test("match DTO excludes internal match fields", () => {
  const dto = toMatchDto(common, participants);

  assert.equal("graphPartition" in dto, false);
  assert.equal("processingTime" in dto, false);
});

test("match DTO excludes participant internal fields", () => {
  const participantsWithLifecycleFields: MatchParticipant[] = [
    {
      userId: "user-1",
      fromClass: "class-1",
      toClass: "class-2",
      requestId: "request-1",
      requestType: "single",
      satisfactionScore: 5,
      status: "accepted",
      acceptedAt: now,
      rejectedAt: null,
      completedAt: null,
      revokedAt: null,
    },
  ];

  const dto = toMatchDto(common, participantsWithLifecycleFields);

  assert.deepEqual(dto.participants, [
    {
      userId: "user-1",
      fromClass: "class-1",
      toClass: "class-2",
      requestId: "request-1",
      requestType: "single",
      satisfactionScore: 5,
      status: "accepted",
      user: undefined,
    },
  ]);

  assert.equal("acceptedAt" in dto.participants[0], false);
  assert.equal("rejectedAt" in dto.participants[0], false);
  assert.equal("completedAt" in dto.participants[0], false);
  assert.equal("revokedAt" in dto.participants[0], false);
});

test("match DTO maps dates to ISO strings", () => {
  const dto = toMatchDto(common, participants);

  assert.equal(dto.createdAt, "2026-08-16T00:00:00.000Z");
  assert.equal(dto.updatedAt, "2026-08-16T00:00:00.000Z");
  assert.equal(dto.provisionalUntil, null);
});

test("match DTO maps provisionalUntil to an ISO string", () => {
  const provisionalUntil = new Date("2026-08-20T12:30:00.000Z");

  const dto = toMatchDto(
    {
      ...common,
      isProvisional: true,
      provisionalUntil,
    },
    participants
  );

  assert.equal(dto.provisionalUntil, "2026-08-20T12:30:00.000Z");
});

test("match DTO preserves public match fields", () => {
  const dto = toMatchDto(common, participants);

  assert.equal(dto.id, "match-1");
  assert.equal(dto.matchType, "SINGLE");
  assert.equal(dto.swapPattern, "DIRECT");
  assert.equal(dto.status, "PROPOSED");
  assert.equal(dto.isProvisional, false);
  assert.equal(dto.satisfactionScore, null);

  assert.deepEqual(dto.singleSwapRequestIds, ["request-1"]);
  assert.deepEqual(dto.bundleSwapRequestIds, []);
});

test("match DTO preserves revoked participant status", () => {
  const revokedParticipants: MatchParticipant[] = [
    {
      userId: "user-1",
      fromClass: "class-1",
      toClass: "class-2",
      requestId: "request-1",
      requestType: "single",
      satisfactionScore: 5,
      status: "revoked",
      revokedAt: now,
    },
  ];

  const dto = toMatchDto(common, revokedParticipants);

  assert.equal(dto.participants[0].status, "revoked");
});
