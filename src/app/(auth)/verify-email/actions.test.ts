import { expect, test, vi } from "vitest";

import { resumeEmailVerification } from "./actions";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  jar: { get: vi.fn(), set: vi.fn() },
}));
vi.mock("@/auth", () => ({ signIn: mocks.signIn }));
vi.mock("next/headers", () => ({ cookies: async () => mocks.jar }));
vi.mock("next-auth", () => ({ AuthError: class AuthError extends Error {} }));

test("starts the guarded verification journey without an identifier", async () => {
  mocks.jar.get.mockReturnValue({
    value: JSON.stringify({
      hint: "",
      destination: "/profile",
      attempted: false,
    }),
  });
  await resumeEmailVerification();
  expect(mocks.jar.set).toHaveBeenCalledWith(
    expect.any(String),
    expect.stringContaining('"attempted":true'),
    expect.any(Object)
  );
  expect(mocks.signIn).toHaveBeenCalledWith(
    "zitadel",
    { redirectTo: "/profile" },
    {}
  );
});
