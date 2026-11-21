import { describe, expect, it } from "vitest";

import {
  appReturnPath,
  readEmailVerificationRecovery,
} from "./email-verification-recovery";

describe("email verification recovery", () => {
  it("keeps the application path, query and anchor from Auth.js", () => {
    expect(
      appReturnPath("https://unclassed.test/profile?section=account#classes")
    ).toBe("/profile?section=account#classes");
  });

  it.each([
    "/login",
    "/verify-email",
    "/api/auth/callback",
    "https://example.test//other.test",
    "/\\outside.test",
  ])("falls back from an unsafe or looping destination %s", (url) =>
    expect(appReturnPath(url)).toBe("/dashboard")
  );

  it("keeps the retry guard after returning from AuthNEI", () => {
    const recovery = {
      hint: "fixture@example.test",
      destination: "/profile",
      attempted: true,
    };
    expect(readEmailVerificationRecovery(JSON.stringify(recovery))).toEqual(
      recovery
    );
    expect(
      readEmailVerificationRecovery(
        JSON.stringify({ ...recovery, attempted: 1 })
      )
    ).toBeNull();
  });

  it("retains the return path without a login hint", () => {
    const recovery = { hint: "", destination: "/profile", attempted: false };
    expect(readEmailVerificationRecovery(JSON.stringify(recovery))).toEqual(
      recovery
    );
  });
});
