import { expect, test, vi } from "vitest";

import { startSignIn } from "./start-sign-in";

const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }));
vi.mock("@/auth", () => ({ signIn }));
vi.mock("@/lib/zitadel", () => ({
  getIssuerUrl: () => "https://auth.example.test",
}));

test("starts AuthNEI sign-in with the validated callback flow", async () => {
  const url = "https://auth.example.test/oauth/v2/authorize?state=test";
  signIn.mockResolvedValueOnce(url);

  expect(await startSignIn("/dashboard?tab=swaps")).toBe(url);
  expect(signIn).toHaveBeenLastCalledWith("zitadel", {
    redirect: false,
    redirectTo: "/dashboard?tab=swaps",
  });
});

test("treats a local Auth.js error redirect or exception as a failed start", async () => {
  signIn.mockResolvedValueOnce(
    "https://app.example.test/login?error=Configuration"
  );
  signIn.mockRejectedValueOnce(new Error("No provider"));

  expect(await startSignIn("/dashboard")).toBeNull();
  expect(await startSignIn("/dashboard")).toBeNull();
});

test.each([
  "https://elsewhere.test",
  "//elsewhere.test",
  "/\\elsewhere.test",
  "/.//elsewhere.test",
])(
  "falls back to the dashboard for an invalid return path (%s)",
  async (callbackUrl) => {
    const url = "https://auth.example.test/oauth/v2/authorize?state=test";
    signIn.mockResolvedValueOnce(url);

    expect(await startSignIn(callbackUrl)).toBe(url);
    expect(signIn).toHaveBeenLastCalledWith("zitadel", {
      redirect: false,
      redirectTo: "/dashboard",
    });
  }
);
