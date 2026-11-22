import { afterEach, expect, test, vi } from "vitest";

import { resumeEmailVerification } from "./actions";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  redirect: vi.fn(),
  jar: { get: vi.fn(), set: vi.fn() },
}));
vi.mock("@/auth", () => ({ signIn: mocks.signIn }));
vi.mock("next/headers", () => ({ cookies: async () => mocks.jar }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/zitadel", () => ({ getIssuerUrl: () => "https://auth.example.test" }));

afterEach(() => vi.clearAllMocks());

test("starts the guarded verification journey without an identifier", async () => {
  mocks.jar.get.mockReturnValue({
    value: JSON.stringify({
      subject: "fixture",
      hint: "",
      destination: "/profile",
      attempted: false,
    }),
  });
  const authorizationUrl = "https://auth.example.test/authorize";
  mocks.signIn.mockResolvedValueOnce(authorizationUrl);
  await resumeEmailVerification();
  expect(mocks.redirect).toHaveBeenCalledWith(authorizationUrl);
  expect(mocks.jar.set).toHaveBeenCalledWith(
    expect.any(String),
    expect.stringContaining('"attempted":true'),
    expect.any(Object)
  );
  expect(mocks.signIn).toHaveBeenCalledWith(
    "zitadel",
    { redirect: false, redirectTo: "/profile" },
    {}
  );
});

test.each([
  ["missing", undefined],
  [
    "already attempted",
    JSON.stringify({ subject: "fixture", hint: "", destination: "/profile", attempted: true }),
  ],
])("ignores %s verification recovery state", async (_description, value) => {
  mocks.jar.get.mockReturnValue(value === undefined ? undefined : { value });

  await resumeEmailVerification();

  expect(mocks.signIn).not.toHaveBeenCalled();
  expect(mocks.jar.set).not.toHaveBeenCalled();
});

test("keeps verification retryable when sign-in cannot start", async () => {
  mocks.jar.get.mockReturnValue({
    value: JSON.stringify({
      subject: "fixture",
      hint: "student@example.test",
      destination: "/profile",
      attempted: false,
    }),
  });
  mocks.signIn.mockRejectedValueOnce(new Error("issuer unavailable"));

  await expect(resumeEmailVerification()).resolves.toBe(true);

  expect(mocks.jar.set).not.toHaveBeenCalled();
  expect(mocks.redirect).not.toHaveBeenCalled();
});
