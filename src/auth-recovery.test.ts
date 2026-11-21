import { afterEach, beforeAll, expect, test, vi } from "vitest";

type Config = {
  callbacks: {
    signIn: (input: {
      account: { provider: string; providerAccountId: string };
      profile: { sub: string; email?: string; email_verified: boolean };
    }) => Promise<unknown>;
  };
};
const mocks = vi.hoisted(() => ({
  config: { value: undefined as Config | undefined },
  jar: {
    get: vi.fn<(key: string) => { value: string } | undefined>(),
    set: vi.fn<(name: string, value: string, options: unknown) => void>(),
    has: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock("next-auth", () => ({
  default: (config: unknown) => {
    mocks.config.value = config as Config;
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
  },
}));
vi.mock("next-auth/providers/zitadel", () => ({
  default: (options: unknown) => options,
}));
vi.mock("next/headers", () => ({ cookies: async () => mocks.jar }));
vi.mock("@/lib/auth-config", () => ({
  getMissingAuthEnvVars: () => [],
  isAuthConfigured: () => true,
}));
vi.mock("@/lib/env", () => ({
  env: { AUTH_SCOPES: "openid email", NODE_ENV: "test" },
}));
vi.mock("@/lib/local-user", () => ({ syncLocalUserFromOidc: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
  safeError: vi.fn(),
}));

beforeAll(async () => {
  await import("@/auth");
});
afterEach(() => vi.clearAllMocks());

test("preserves the return path and starts recovery without preferred_username", async () => {
  mocks.jar.get.mockImplementation((key: string) =>
    key === "authjs.callback-url"
      ? { value: "/profile?tab=contact" }
      : undefined
  );
  const result = await mocks.config.value!.callbacks.signIn({
    account: { provider: "zitadel", providerAccountId: "fixture" },
    profile: {
      sub: "fixture",
      email: "student@example.test",
      email_verified: false,
    },
  });
  expect(result).toBe("/verify-email");
  const recovery = JSON.parse(mocks.jar.set.mock.calls[0][1]);
  expect(recovery).toEqual({
    hint: "student@example.test",
    destination: "/profile?tab=contact",
    attempted: false,
  });
});

test("keeps recovery and the destination when neither identifier is present", async () => {
  mocks.jar.get.mockImplementation((key: string) =>
    key === "authjs.callback-url" ? { value: "/profile" } : undefined
  );
  await mocks.config.value!.callbacks.signIn({
    account: { provider: "zitadel", providerAccountId: "fixture" },
    profile: { sub: "fixture", email_verified: false },
  });
  expect(JSON.parse(mocks.jar.set.mock.calls[0][1])).toEqual({
    hint: "",
    destination: "/profile",
    attempted: false,
  });
});
