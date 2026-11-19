import NextAuth, { type AuthError, type NextAuthConfig } from "next-auth";
import { expect, test, vi } from "vitest";

import { logger } from "@/lib/logger";

import "./auth";

vi.mock("next-auth", () => ({ default: vi.fn().mockReturnValue({}) }));
vi.mock("@/lib/local-user", () => ({ syncLocalUserFromOidc: vi.fn() }));
test("Auth.js error logging omits provider messages and causes", () => {
  const config = vi.mocked(NextAuth).mock.calls[0][0] as NextAuthConfig;
  const logError = vi.spyOn(logger, "error").mockImplementation(() => {});
  const error: AuthError = Object.assign(
    new Error("synthetic provider response"),
    {
      type: "CallbackRouteError" as const,
      cause: { err: new Error("synthetic sensitive details") },
    }
  );

  config.logger?.error?.(error);

  expect(logError).toHaveBeenCalledExactlyOnceWith(
    { errorType: "Error" },
    "Auth.js request failed"
  );
});
