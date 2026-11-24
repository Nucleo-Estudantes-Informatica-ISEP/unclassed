import { expect, test } from "vitest";

import { secretsMatch } from "./secretsMatch";

test("compares complete secrets", () => {
  expect(secretsMatch("fixture", "fixture")).toBe(true);
  expect(secretsMatch("fixture", "fixtures")).toBe(false);
  expect(secretsMatch("fixture", "fixtur")).toBe(false);
});
