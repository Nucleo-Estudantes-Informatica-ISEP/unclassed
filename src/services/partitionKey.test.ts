import assert from "node:assert/strict";
import { test } from "vitest";

import { buildPartitionKey } from "./partitionKey";

test("builds stable subject and year partition keys", () => {
  assert.equal(
    buildPartitionKey({ ticketType: "SPECIFIC_CLASS", subjectId: "subject-id" }),
    "subject-subject-id"
  );
  assert.equal(
    buildPartitionKey({ ticketType: "ALL_CLASSES", year: 2 }),
    "year-2"
  );
});

test("rejects incomplete partition inputs", () => {
  assert.throws(
    () => buildPartitionKey({ ticketType: "SPECIFIC_CLASS", subjectId: "" }),
    /subject id/
  );
  assert.throws(
    () => buildPartitionKey({ ticketType: "ALL_CLASSES", year: 0 }),
    /positive integer year/
  );
});
