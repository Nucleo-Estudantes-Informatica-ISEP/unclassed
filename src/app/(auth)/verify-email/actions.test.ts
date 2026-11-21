import { afterEach, expect, test, vi } from "vitest";

import { resumeEmailVerification } from "./actions";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  jar: { get: vi.fn(), set: vi.fn() },
}));
vi.mock("@/auth", () => ({ signIn: mocks.signIn }));
vi.mock("next/headers", () => ({ cookies: async () => mocks.jar }));
vi.mock("next-auth", () => ({ AuthError: class AuthError extends Error {} }));

afterEach(() => vi.clearAllMocks());

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

test.each([
  ["missing", undefined],
  [
    "already attempted",
    JSON.stringify({ hint: "", destination: "/profile", attempted: true }),
  ],
])("ignores %s verification recovery state", async (_description, value) => {
  mocks.jar.get.mockReturnValue(value === undefined ? undefined : { value });

  await resumeEmailVerification();

  expect(mocks.signIn).not.toHaveBeenCalled();
  expect(mocks.jar.set).not.toHaveBeenCalled();
});
