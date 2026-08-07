import assert from "node:assert/strict";

import { getRequestWizardSteps } from "./requestWizardSteps";

const singleSteps = getRequestWizardSteps("single");
const bundleSteps = getRequestWizardSteps("bundle");

assert.deepEqual(
  singleSteps.map((step) => step.id),
  ["type", "single-details", "preferences"]
);
assert.deepEqual(
  bundleSteps.map((step) => step.id),
  ["type", "bundle-details", "preferences"]
);
assert.equal(singleSteps[0], bundleSteps[0]);
assert.equal(singleSteps[2], bundleSteps[2]);
