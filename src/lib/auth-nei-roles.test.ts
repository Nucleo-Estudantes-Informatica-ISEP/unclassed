import assert from "node:assert/strict";
import test from "node:test";

import { getAuthNeiRoles, isAdmin, isStudent } from "@/lib/auth-nei-roles";
import { provisionStudentForNormalOnboarding } from "@/lib/authnei-provisioner";

test("normalizes shared-project ZITADEL roles and ignores unknown roles", () => {
  const roles = getAuthNeiRoles({
    "urn:zitadel:iam:org:project:roles": {
      student: { org: "org" },
      admin: { org: "org" },
      unknown: { org: "org" },
    },
  });

  assert.deepEqual(roles, ["student", "admin"]);
  assert.equal(isStudent({ roles }), true);
  assert.equal(isAdmin({ roles }), true);
});

test("accepts ZITADEL project-id and explicitly configured claim variants", () => {
  const roles = getAuthNeiRoles(
    {
      "urn:zitadel:iam:org:project:id:project-id:roles": ["employee"],
      custom_roles: "student,nei_member",
    },
    "custom_roles"
  );

  assert.deepEqual(roles, ["student", "nei_member", "employee"]);
});

test("never provisions an employee identity without student", async () => {
  await assert.rejects(
    provisionStudentForNormalOnboarding("employee-subject", ["employee"]),
    /employee but without student/
  );
});

test("preserves an identity that already has student and employee", async () => {
  assert.equal(
    await provisionStudentForNormalOnboarding("student-employee-subject", [
      "student",
      "employee",
    ]),
    "already-student"
  );
});
