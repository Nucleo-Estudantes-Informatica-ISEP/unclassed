import assert from "node:assert/strict";
import test from "node:test";

import {
  assertMatchActionAllowed,
  MatchActionError,
} from "./matchActionRules";

const now = new Date("2026-08-16T10:00:00.000Z");

test("allows only participants to perform match actions", () => {
  assert.throws(
    () =>
      assertMatchActionAllowed(
        {
          status: "PROPOSED",
          provisionalUntil: null,
          participants: [{ userId: "user-1", status: "pending" }],
        },
        "admin",
        "accept",
        now
      ),
    MatchActionError
  );
});

test("rejects invalid and repeated state transitions", () => {
  const proposed = {
    status: "PROPOSED",
    provisionalUntil: "2026-08-16T11:00:00.000Z",
    participants: [{ userId: "user-1", status: "accepted" }],
  };

  assert.throws(
    () => assertMatchActionAllowed(proposed, "user-1", "accept", now),
    MatchActionError
  );
  assert.throws(
    () => assertMatchActionAllowed(proposed, "user-1", "complete", now),
    MatchActionError
  );
  assert.doesNotThrow(() =>
    assertMatchActionAllowed(proposed, "user-1", "revoke", now)
  );
});

test("requires accepted state before completion and enforces revoke deadline", () => {
  assert.doesNotThrow(() =>
    assertMatchActionAllowed(
      {
        status: "ACCEPTED",
        provisionalUntil: null,
        participants: [{ userId: "user-1", status: "accepted" }],
      },
      "user-1",
      "complete",
      now
    )
  );
  assert.throws(
    () =>
      assertMatchActionAllowed(
        {
          status: "PROPOSED",
          provisionalUntil: "2026-08-16T09:59:59.000Z",
          participants: [{ userId: "user-1", status: "accepted" }],
        },
        "user-1",
        "revoke",
        now
      ),
    MatchActionError
  );
});
