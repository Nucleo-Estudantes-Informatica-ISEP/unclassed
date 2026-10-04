import assert from "node:assert/strict";
import { test } from "vitest";

import type { MatchClass, MatchUser } from "@/types/match";
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

const classes: MatchClass[] = [
  {
    id: "class-1",
    name: "Computer Science",
    year: 1,
  },
  {
    id: "class-2",
    name: "Software Engineering",
    year: 2,
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

test("match DTO maps participants and class information to the public DTO shape", () => {
  const dto = toMatchDto(common, participants, classes, users, subject);

  assert.deepEqual(dto.participants, [
    {
      userId: "user-1",
      fromClass: classes[0],
      toClass: classes[1],
      requestId: "request-1",
      requestType: "single",
      satisfactionScore: 5,
      status: "pending",
      user: users[0],
    },
  ]);

  assert.deepEqual(dto.subject, subject);
});

test("match DTO preserves class IDs when class information is unavailable", () => {
  const dto = toMatchDto(common, participants);

  assert.equal(dto.participants[0].fromClass, "class-1");
  assert.equal(dto.participants[0].toClass, "class-2");
});

test("match DTO excludes internal match fields", () => {
  const dto = toMatchDto(common, participants);

  assert.strictEqual(
    (dto as { graphPartition?: unknown }).graphPartition,
    undefined
  );
  assert.strictEqual(
    (dto as { processingTime?: unknown }).processingTime,
    undefined
  );
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

  assert.strictEqual("acceptedAt" in dto.participants[0], false);
  assert.strictEqual("rejectedAt" in dto.participants[0], false);
  assert.strictEqual("completedAt" in dto.participants[0], false);
  assert.strictEqual("revokedAt" in dto.participants[0], false);
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
