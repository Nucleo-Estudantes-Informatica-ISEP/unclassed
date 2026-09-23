import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";

import * as matchNotificationDeliveryRepo from "@/application/repositories/matchNotificationDeliveryRepository";

import {
  deliverMatchNotificationOnce,
  markMatchNotificationDeliveryFailed,
  markMatchNotificationDeliverySent,
  reserveMatchNotificationDelivery,
} from "./matchNotificationDeliveryService";

afterEach(() => {
  vi.restoreAllMocks();
});

test("markMatchNotificationDeliverySent only updates a SENDING reservation", async () => {
  const updateMany = vi
    .spyOn(matchNotificationDeliveryRepo, "updateMany")
    .mockResolvedValue({ count: 1 } as never);

  await markMatchNotificationDeliverySent("match-1", "user-1");

  assert.equal(updateMany.mock.calls.length, 1);
  assert.deepEqual(updateMany.mock.calls[0][0]?.where, {
    matchId: "match-1",
    userId: "user-1",
    notificationType: "MATCH_FOUND",
    status: "SENDING",
  });
});

test("markMatchNotificationDeliverySent swallows repository errors", async () => {
  vi.spyOn(matchNotificationDeliveryRepo, "updateMany").mockRejectedValue(
    new Error("db unavailable")
  );
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

  await assert.doesNotReject(
    markMatchNotificationDeliverySent("match-1", "user-1")
  );
  assert.equal(warn.mock.calls.length, 1);
});

test("markMatchNotificationDeliveryFailed only updates a SENDING reservation and truncates lastError to 500 characters", async () => {
  const updateMany = vi
    .spyOn(matchNotificationDeliveryRepo, "updateMany")
    .mockResolvedValue({ count: 1 } as never);
  const longReason = "x".repeat(600);

  await markMatchNotificationDeliveryFailed("match-1", "user-1", longReason);

  assert.equal(updateMany.mock.calls.length, 1);
  const call = updateMany.mock.calls[0][0];
  assert.deepEqual(call?.where, {
    matchId: "match-1",
    userId: "user-1",
    notificationType: "MATCH_FOUND",
    status: "SENDING",
  });
  assert.equal((call?.data as { lastError: string }).lastError, "x".repeat(500));
});

test("markMatchNotificationDeliveryFailed swallows repository errors", async () => {
  vi.spyOn(matchNotificationDeliveryRepo, "updateMany").mockRejectedValue(
    new Error("db unavailable")
  );
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

  await assert.doesNotReject(
    markMatchNotificationDeliveryFailed("match-1", "user-1", "reason")
  );
  assert.equal(warn.mock.calls.length, 1);
});

test("reserveMatchNotificationDelivery rethrows a non-P2002 create error", async () => {
  const dbError = Object.assign(new Error("connection reset"), {
    code: "P1001",
  });
  vi.spyOn(matchNotificationDeliveryRepo, "create").mockRejectedValue(
    dbError
  );

  await assert.rejects(
    reserveMatchNotificationDelivery(
      "match-1",
      "user-1",
      "user@example.com"
    ),
    dbError
  );
});

test("deliverMatchNotificationOnce skips delivery when the reservation is not acquired", async () => {
  const p2002 = Object.assign(new Error("duplicate"), { code: "P2002" });
  vi.spyOn(matchNotificationDeliveryRepo, "create").mockRejectedValue(p2002);
  vi.spyOn(matchNotificationDeliveryRepo, "findUnique").mockResolvedValue({
    status: "SENT",
    updatedAt: new Date(),
  } as never);
  const send = vi.fn();

  const outcome = await deliverMatchNotificationOnce(
    "match-1",
    "user-1",
    "user@example.com",
    send
  );

  assert.equal(outcome, "skipped");
  assert.equal(send.mock.calls.length, 0);
});

test("deliverMatchNotificationOnce marks the reservation sent when delivery succeeds", async () => {
  vi.spyOn(matchNotificationDeliveryRepo, "create").mockResolvedValue(
    {} as never
  );
  const updateMany = vi
    .spyOn(matchNotificationDeliveryRepo, "updateMany")
    .mockResolvedValue({ count: 1 } as never);
  const send = vi.fn().mockResolvedValue(true);

  const outcome = await deliverMatchNotificationOnce(
    "match-1",
    "user-1",
    "user@example.com",
    send
  );

  assert.equal(outcome, "sent");
  assert.equal(updateMany.mock.calls[0][0]?.data?.status, "SENT");
});

test("deliverMatchNotificationOnce marks the reservation failed when delivery returns false", async () => {
  vi.spyOn(matchNotificationDeliveryRepo, "create").mockResolvedValue(
    {} as never
  );
  const updateMany = vi
    .spyOn(matchNotificationDeliveryRepo, "updateMany")
    .mockResolvedValue({ count: 1 } as never);
  const send = vi.fn().mockResolvedValue(false);

  const outcome = await deliverMatchNotificationOnce(
    "match-1",
    "user-1",
    "user@example.com",
    send
  );

  assert.equal(outcome, "failed");
  const call = updateMany.mock.calls[0][0];
  assert.equal(call?.data?.status, "FAILED");
  assert.equal(
    (call?.data as { lastError: string }).lastError,
    "Email service returned false"
  );
});

test("deliverMatchNotificationOnce marks the reservation failed with the error message when delivery throws", async () => {
  vi.spyOn(matchNotificationDeliveryRepo, "create").mockResolvedValue(
    {} as never
  );
  const updateMany = vi
    .spyOn(matchNotificationDeliveryRepo, "updateMany")
    .mockResolvedValue({ count: 1 } as never);
  const send = vi.fn().mockRejectedValue(new Error("SMTP timeout"));

  const outcome = await deliverMatchNotificationOnce(
    "match-1",
    "user-1",
    "user@example.com",
    send
  );

  assert.equal(outcome, "failed");
  const call = updateMany.mock.calls[0][0];
  assert.equal(
    (call?.data as { lastError: string }).lastError,
    "SMTP timeout"
  );
});
