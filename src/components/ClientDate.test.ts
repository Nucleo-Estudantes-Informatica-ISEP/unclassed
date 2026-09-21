import assert from "node:assert/strict";
import { test } from "vitest";

import { getDatePlaceholder } from "./ClientDate";

test("date placeholders match their hydrated format", () => {
  assert.equal(getDatePlaceholder("short"), "--/--/----");
  assert.equal(getDatePlaceholder("time"), "--/--/----, --:--");
  assert.equal(getDatePlaceholder("dateTime"), "--/--/----, --:--:--");
  assert.equal(getDatePlaceholder("timeOnly"), "--:--:--");
});
