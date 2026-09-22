import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";

vi.mock("@/lib/startup", () => ({
  initializeApplication: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

test("register() initialises the application once in the nodejs runtime", async () => {
  const originalRuntime = process.env.NEXT_RUNTIME;
  process.env.NEXT_RUNTIME = "nodejs";

  try {
    const { register } = await import("./instrumentation");
    const { initializeApplication } = await import("@/lib/startup");

    await register();

    assert.equal(vi.mocked(initializeApplication).mock.calls.length, 1);
  } finally {
    process.env.NEXT_RUNTIME = originalRuntime;
  }
});

test("register() does not initialise the application outside the nodejs runtime", async () => {
  const originalRuntime = process.env.NEXT_RUNTIME;
  process.env.NEXT_RUNTIME = "edge";

  try {
    const { register } = await import("./instrumentation");
    const { initializeApplication } = await import("@/lib/startup");

    await register();

    assert.equal(vi.mocked(initializeApplication).mock.calls.length, 0);
  } finally {
    process.env.NEXT_RUNTIME = originalRuntime;
  }
});
