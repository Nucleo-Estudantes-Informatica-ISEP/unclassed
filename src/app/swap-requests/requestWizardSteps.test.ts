import assert from "node:assert/strict";
import { test } from "node:test";

import { getRequestWizardSteps } from "./requestWizardSteps";

test("resolves branch-specific request wizard steps", () => {
  const singleSteps = getRequestWizardSteps("single");
  const bundleSteps = getRequestWizardSteps("bundle");

  assert.deepEqual(
    singleSteps.map((step) => step.id),
    ["type", "single-details", "preferences", "match", "contact"]
  );
  assert.deepEqual(
    bundleSteps.map((step) => step.id),
    ["type", "bundle-details", "preferences", "match", "contact"]
  );
  assert.equal(singleSteps[0], bundleSteps[0]);
  assert.equal(singleSteps[2], bundleSteps[2]);
  assert.equal(singleSteps[3], bundleSteps[3]);
  assert.equal(singleSteps[4], bundleSteps[4]);
});

test("provides guidance for every wizard step and keeps branch-specific help", () => {
  const pendingSteps = getRequestWizardSteps(null);
  const singleSteps = getRequestWizardSteps("single");
  const bundleSteps = getRequestWizardSteps("bundle");

  for (const step of [...pendingSteps, ...singleSteps, ...bundleSteps]) {
    assert.ok(step.guidance.trim().length > 0, `${step.id} should have guidance`);
  }

  assert.match(singleSteps[1].guidance, /disciplina/i);
  assert.match(bundleSteps[1].guidance, /troca completa/i);
  assert.notEqual(singleSteps[1].guidance, bundleSteps[1].guidance);
});
