import assert from "node:assert/strict";
import { test } from "vitest";

import { getAuthNeiRoles, isAdmin } from "@/lib/auth-nei-roles";

const GLOBAL_ADMIN_CLAIM =
  "urn:zitadel:iam:org:project:global-admin-project:roles";

test("reads admin only from the configured shared NEI project claim", () => {
  const roles = getAuthNeiRoles(
    {
      [GLOBAL_ADMIN_CLAIM]: {
        admin: { org: "org" },
        unknown: { org: "org" },
      },
    },
    GLOBAL_ADMIN_CLAIM
  );

  assert.deepEqual(roles, ["admin"]);
  assert.equal(isAdmin({ roles }), true);
});

test("does not fall back to generic or application project role claims", () => {
  const roles = getAuthNeiRoles(
    {
      "urn:zitadel:iam:org:project:roles": {
        admin: { org: "org" },
      },
      "urn:zitadel:iam:org:project:unclassed-project:roles": {
        admin: { org: "org" },
      },
      [GLOBAL_ADMIN_CLAIM]: {},
    },
    GLOBAL_ADMIN_CLAIM
  );

  assert.deepEqual(roles, []);
  assert.equal(isAdmin({ roles }), false);
});

test("fails closed when no shared role claim is configured", () => {
  const roles = getAuthNeiRoles(
    {
      [GLOBAL_ADMIN_CLAIM]: {
        admin: { org: "org" },
      },
    },
    ""
  );

  assert.deepEqual(roles, []);
  assert.equal(isAdmin({ roles }), false);
});
