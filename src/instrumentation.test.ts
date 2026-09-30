import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";

vi.mock("@/lib/startup", () => ({
  initializeApplication: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

test("register() initialises the application once in the nodejs runtime", async () => {
  vi.stubEnv("NEXT_RUNTIME", "nodejs");

  const { register } = await import("./instrumentation");
  const { initializeApplication } = await import("@/lib/startup");

  await register();

  assert.equal(vi.mocked(initializeApplication).mock.calls.length, 1);
});

test("register() does not initialise the application outside the nodejs runtime", async () => {
  vi.stubEnv("NEXT_RUNTIME", "edge");

  const { register } = await import("./instrumentation");
  const { initializeApplication } = await import("@/lib/startup");

  await register();

  assert.equal(vi.mocked(initializeApplication).mock.calls.length, 0);
});
