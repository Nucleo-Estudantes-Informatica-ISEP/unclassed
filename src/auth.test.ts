import NextAuth, { AuthError, type NextAuthConfig } from "next-auth";
import { expect, test, vi } from "vitest";

import { logger } from "@/lib/logger";

import "./auth";

vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {},
  default: vi.fn().mockReturnValue({}),
}));
vi.mock("@/lib/local-user", () => ({ syncLocalUserFromOidc: vi.fn() }));

class CallbackFailure extends AuthError {
  static type = "CallbackRouteError";
}

test("Auth.js error logging keeps the classification and omits provider data", () => {
  const config = vi.mocked(NextAuth).mock.calls[0][0] as NextAuthConfig;
  const logError = vi.spyOn(logger, "error").mockImplementation(() => {});
  const error = new CallbackFailure("synthetic provider response");
  error.type = "CallbackRouteError";
  error.cause = { err: new Error("synthetic sensitive details") };

  try {
    config.logger?.error?.(error);
    expect(logError).toHaveBeenLastCalledWith(
      { errorType: "CallbackRouteError" },
      "Auth.js request failed"
    );

    const unexpected = Object.assign(new Error("provider response"), {
      name: "ProviderControlledName",
      type: "ProviderControlledType",
    });
    config.logger?.error?.(unexpected);
    expect(logError).toHaveBeenLastCalledWith(
      { errorType: "AuthError" },
      "Auth.js request failed"
    );
  } finally {
    logError.mockRestore();
  }
});
