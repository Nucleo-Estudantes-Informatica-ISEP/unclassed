import assert from "node:assert/strict";
import test from "node:test";

import { getAuthNeiRoles, isAdmin } from "@/lib/auth-nei-roles";

test("normalizes Unclassed project admin and ignores unknown roles", () => {
  const roles = getAuthNeiRoles({
    "urn:zitadel:iam:org:project:roles": {
      admin: { org: "org" },
      unknown: { org: "org" },
    },
  });

  assert.deepEqual(roles, ["admin"]);
  assert.equal(isAdmin({ roles }), true);
});

test("supports an explicitly configured Unclassed role claim", () => {
  const roles = getAuthNeiRoles(
    {
      custom_roles: "admin",
    },
    "custom_roles"
  );

  assert.deepEqual(roles, ["admin"]);
});

test("does not aggregate the documented role claim from another ZITADEL project", () => {
  const roles = getAuthNeiRoles({
    "urn:zitadel:iam:org:project:roles": {},
    "urn:zitadel:iam:org:project:orbit-project:roles": {
      admin: { org: "org" },
      nei_member: { org: "org" },
    },
  });

  assert.deepEqual(roles, []);
  assert.equal(isAdmin({ roles }), false);
});
