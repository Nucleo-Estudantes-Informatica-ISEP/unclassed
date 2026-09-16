import assert from "node:assert/strict";
import { test } from "vitest";

import {
  assertMatchActionAllowed,
  MatchActionError,
  MatchActionNotFoundError,
  MatchActionForbiddenError,
  MatchActionConflictError,
} from "./matchActionRules";

const now = new Date("2026-08-16T10:00:00.000Z");

test("error classes set corresponding HTTP statuses and inheritance", () => {
  const notFound = new MatchActionNotFoundError();
  assert.equal(notFound.status, 404);
  assert.equal(notFound.message, "Match não encontrado");
  assert.ok(notFound instanceof MatchActionError);

  const forbidden = new MatchActionForbiddenError();
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.message, "Acesso negado");
  assert.ok(forbidden instanceof MatchActionError);

  const conflict = new MatchActionConflictError("Conflito");
  assert.equal(conflict.status, 409);
  assert.equal(conflict.message, "Conflito");
  assert.ok(conflict instanceof MatchActionError);
});

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
    MatchActionForbiddenError
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
